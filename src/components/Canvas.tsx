import { useEffect, useMemo, useRef, useState } from 'react';
import { Background, BackgroundVariant, ConnectionLineType, Controls, Handle, MarkerType, MiniMap, Position, ReactFlow, ReactFlowProvider, applyNodeChanges, useReactFlow, useStore } from '@xyflow/react';
import type { Connection, Edge as FlowEdge, Node as FlowNode, NodeProps, ReactFlowInstance } from '@xyflow/react';
import { Flame, Hand, MousePointer2, Plus, Search, Trash2, TriangleAlert } from 'lucide-react';
import type { Node, Plan, ValidationIssue } from '../schemas';
import { NODE_TYPES } from '../features/project';
import { useI18n } from '../i18n';
import type { Messages } from '../i18n';
import type { PlaybackState, SimulationRun } from '../simulation/types';
import { Ghost, HauntedBackdrop, NodeIcon } from './Icons';

type CardData = { node: Node; state?: PlaybackState['nodes'][string]; issues: number; selectedVisitor?: string; chooseVisitor: (id: string) => void; changed: boolean; running: boolean };
type CardNode = FlowNode<CardData>;

export const TYPE_COLORS: Record<Node['type'], string> = {
  entrance: '#7ef0c4', service: '#8cc8ff', decision: '#b99bff', waiting_area: '#ffc46b', merge: '#6fdbe0', exit: '#e9dcbf', subflow: '#8d84a8',
};

const cls = (...names: (string | false | undefined | null)[]) => names.filter(Boolean).join(' ');

function detailOf(node: Node, t: Messages): string {
  const c = t.canvas;
  switch (node.type) {
    case 'service': {
      const duration = node.duration.kind === 'fixed' ? `${node.duration.value}s` : c.duration[node.duration.kind] ?? node.duration.kind;
      const needs = node.requirements.length
        ? node.requirements.map(item => `${item.quantity} ${item.kind === 'staff' ? c.staffUnit : c.deviceUnit}`).join(' + ')
        : c.concurrent(String(node.maxConcurrent ?? t.common.unlimited));
      return `${duration} · ${needs}`;
    }
    case 'entrance': return c.streams(node.arrivalStreamIds.length);
    case 'decision': return `${c.branches(node.routing.branches.length)}${node.loopGuard ? ` · ${c.loopGuard}` : ''}`;
    case 'waiting_area': return node.release.kind === 'batch' ? c.batch(node.release.batchSize) : c.releaseAt(node.release.releaseAt);
    case 'subflow': return c.members(node.memberNodeIds.length);
    case 'exit': return node.countsAsCompleted === false ? c.leaves : c.completes;
    default: return c.merges;
  }
}

function FlowCard({ data, selected }: NodeProps<CardNode>) {
  const { t } = useI18n();
  const detail = useStore(store => store.transform[2] < 0.36 ? 'tiny' : store.transform[2] < 0.62 ? 'far' : 'near');
  const far = detail !== 'near';
  const node = data.node;
  const state = data.state;
  const serving = state?.serving ?? [];
  const waitingIds = [...(state?.queued ?? []), ...(state?.holding ?? [])];
  const blocked = state?.blocked ?? [];
  const waiting = waitingIds.length + blocked.length;
  const hot = (state?.queued.length ?? 0) + blocked.length > 4;
  const ghosts = [...serving.map(id => [id, 'working'] as const), ...waitingIds.map(id => [id, 'waiting'] as const), ...blocked.map(id => [id, 'blocked'] as const)];
  const shown = ghosts.slice(0, 8);
  return <div className={cls('flow-card', `type-${node.type}`, selected && 'selected', hot && 'hot', data.changed && 'changed', far && 'far', detail === 'tiny' && 'tiny', data.running && 'running')}>
    {node.type !== 'entrance' && node.type !== 'subflow' && <Handle type="target" position={Position.Left} />}
    <div className="card-head">
      <span className="card-icon"><NodeIcon type={node.type} size={far ? 22 : 15} /></span>
      <span className="card-type">{t.nodeTypes[node.type]}</span>
      <span className="card-flags">
        {data.issues > 0 && <span className="card-flag issue"><TriangleAlert size={11} aria-hidden="true" />{data.issues}</span>}
        {data.changed && <span className="card-flag changed" title={t.canvas.changedTitle}>{t.canvas.changed}</span>}
        {hot && <span className="card-flag hot"><Flame size={11} aria-hidden="true" />{t.canvas.crowded}</span>}
      </span>
    </div>
    <strong className="card-name">{node.name}</strong>
    <div className="card-detail">{detailOf(node, t)}</div>
    {data.running && state && <div className="card-live">
      <span className={waiting ? 'is-on' : ''}><b>{waiting}</b>{t.canvas.waiting}</span>
      <span className={serving.length ? 'is-serving' : ''}><b>{serving.length}</b>{t.canvas.serving}</span>
      <span><b>{state.completed}</b>{t.canvas.passed}</span>
    </div>}
    {shown.length > 0 && <div className="ghost-line nodrag">
      {shown.map(([id, kind], index) => <button key={id} type="button" aria-label={t.canvas.follow(id)} title={id}
        className={cls('visitor', `is-${kind}`, id === data.selectedVisitor && 'is-tracked')} style={{ animationDelay: `${(index % 5) * -0.37}s` }}
        onClick={event => { event.stopPropagation(); data.chooseVisitor(id); }}><Ghost size={15} /></button>)}
      {ghosts.length > shown.length && <span className="ghost-more">+{ghosts.length - shown.length}</span>}
    </div>}
    {far && data.running && ghosts.length > 0 && <div className="far-crowd" aria-hidden="true"><Ghost size={20} />{ghosts.length}</div>}
    {node.type === 'decision'
      ? node.routing.branches.map((branch, index) => <Handle key={branch.branchKey} id={branch.branchKey} type="source" position={Position.Right} style={{ top: `${(index + 1) * 100 / (node.routing.branches.length + 1)}%` }} title={branch.branchKey} />)
      : node.type !== 'exit' && node.type !== 'subflow' && <Handle type="source" position={Position.Right} />}
  </div>;
}
const nodeTypes = { workflow: FlowCard };

interface Props {
  plan: Plan; selected: string; onSelect: (id: string, kind: 'node' | 'edge') => void; onMove: (positions: { id: string; x: number; y: number }[]) => void;
  onConnect: (connection: Connection) => void; onDelete: (ids: string[], edgeIds: string[]) => void;
  onAdd: (type: Node['type'], position: { x: number; y: number }) => void;
  editable: boolean; issues: ValidationIssue[]; view: PlaybackState; run?: SimulationRun; stale: boolean;
  selectedVisitor: string; chooseVisitor: (id: string) => void; changed?: Set<string>; fitToken: number;
  label?: { badge: string; name: string; note?: string };
  compact?: boolean;
}

const FIT = { padding: { top: '64px', bottom: '24px', left: '44px', right: '44px' }, maxZoom: 1 } as const;
const FIT_LABELLED = { padding: { top: '48px', bottom: '14px', left: '40px', right: '40px' }, maxZoom: 1 } as const;

function CanvasInner(props: Props) {
  const { plan, view } = props;
  const { t } = useI18n();
  const api = useReactFlow<CardNode>();
  const shell = useRef<HTMLDivElement>(null);
  const selection = useRef({ planId: plan.id, id: props.selected });
  const fitOnMount = useRef(plan.graph.nodes.length > 0);
  const zoom = useStore(store => store.transform[2]);
  const fitSize = useStore(store => props.editable ? '' : `${store.width}:${store.height}`);
  const [panMode, setPanMode] = useState(false);
  const [menu, setMenu] = useState<{ left: number; top: number; position: { x: number; y: number }; nodeId?: string } | null>(null);
  const [query, setQuery] = useState('');
  const [instance, setInstance] = useState<ReactFlowInstance<CardNode> | null>(null);
  const running = !!props.run;
  const mapped = useMemo<CardNode[]>(() => plan.graph.nodes.map(node => ({ id: node.id, type: 'workflow', position: { x: node.layout.x, y: node.layout.y },
    selected: props.selected === node.id, data: { node, state: view.nodes[node.id], issues: props.issues.filter(issue => issue.entityIds.includes(node.id)).length,
      selectedVisitor: props.selectedVisitor, chooseVisitor: props.chooseVisitor, changed: props.changed?.has(node.id) ?? false, running },
  })), [plan, view, props.selected, props.issues, props.selectedVisitor, props.chooseVisitor, props.changed, running]);
  const [flowNodes, setFlowNodes] = useState(mapped);
  useEffect(() => {
    const changed = selection.current.planId !== plan.id || selection.current.id !== props.selected;
    selection.current = { planId: plan.id, id: props.selected };
    setFlowNodes(previous => mapped.map(node => {
      const current = previous.find(item => item.id === node.id);
      return { ...current, ...node, selected: changed ? node.selected : current?.selected ?? node.selected, position: current?.dragging ? current.position : node.position };
    }));
  }, [mapped, plan.id, props.selected]);
  useEffect(() => { setMenu(null); }, [plan.id, props.editable]);
  function openMenu(x: number, y: number, nodeId?: string) {
    const bounds = shell.current!.getBoundingClientRect();
    setQuery('');
    setMenu({ left: Math.max(8, Math.min(x - bounds.left, bounds.width - 276)), top: Math.max(8, Math.min(y - bounds.top, bounds.height - 380)), position: api.screenToFlowPosition({ x, y }), nodeId });
  }
  const choices = NODE_TYPES.filter(type => `${t.nodeTypes[type]} ${t.nodeHints[type]} ${type}`.toLowerCase().includes(query.toLowerCase()));
  function chooseNode(type: Node['type']) {
    if (menu && props.editable) { props.onAdd(type, menu.position); setMenu(null); }
  }
  const fit = props.label ? FIT_LABELLED : FIT;
  useEffect(() => {
    if (!instance || !plan.graph.nodes.length) return;
    const timer = setTimeout(() => { void instance.fitView({ ...fit, duration: 350 }); }, 60);
    return () => clearTimeout(timer);
  }, [instance, plan.id, props.fitToken, fit, fitSize]);
  const edges = useMemo<FlowEdge[]>(() => plan.graph.edges.map(edge => {
    const target = view.nodes[edge.target];
    const active = running && !!target && target.queued.length + target.serving.length + target.holding.length + target.blocked.length > 0;
    const isSelected = props.selected === edge.id;
    const changed = props.changed?.has(edge.id) ?? false;
    const color = isSelected ? '#8ef5d0' : changed ? '#ff9a4d' : active ? '#8cc8ff' : '#84709b';
    return { ...edge, sourceHandle: edge.branchKey, type: 'default', pathOptions: { curvature: 0.4 }, label: edge.branchKey, animated: active,
      selected: isSelected, className: cls(active && 'is-active', changed && 'is-changed'),
      markerEnd: { type: MarkerType.ArrowClosed, color, width: 16, height: 16 },
      style: { stroke: color, strokeWidth: isSelected ? 2.4 : active ? 2 : 1.6 },
      labelStyle: { fill: '#d9d1ee', fontSize: 11, fontWeight: 600 }, labelBgStyle: { fill: '#1d1833', stroke: '#3d3460' }, labelBgPadding: [7, 4] as [number, number], labelBgBorderRadius: 7,
    };
  }), [plan.graph.edges, view, running, props.selected, props.changed]);
  return <div ref={shell} className={cls('canvas-shell', props.compact && 'compact-canvas')} onDoubleClick={event => {
    if (props.editable && (event.target as HTMLElement).classList.contains('react-flow__pane')) openMenu(event.clientX, event.clientY);
  }} onDragOver={event => { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; }} onDrop={event => {
    event.preventDefault(); const type = event.dataTransfer.getData('application/ghost-node') as Node['type'];
    if (props.editable && NODE_TYPES.includes(type)) props.onAdd(type, api.screenToFlowPosition({ x: event.clientX, y: event.clientY }));
  }}>
    <HauntedBackdrop />
    <ReactFlow<CardNode> nodes={flowNodes} edges={edges} nodeTypes={nodeTypes} colorMode="dark" onInit={setInstance}
      onNodesChange={changes => {
        setFlowNodes(nodes => applyNodeChanges(changes, nodes));
        const positions = changes.flatMap(change => change.type === 'position' && change.position && !change.dragging ? [{ id: change.id, ...change.position }] : []);
        if (positions.length) props.onMove(positions);
      }}
      onNodeClick={(event, node) => { setMenu(null); if (!panMode && !event.shiftKey && !event.ctrlKey && !event.metaKey) props.onSelect(node.id, 'node'); }} onEdgeClick={(_, edge) => { setMenu(null); props.onSelect(edge.id, 'edge'); }}
      onPaneClick={() => { setMenu(null); props.onSelect('', 'node'); }} onConnect={props.onConnect} connectionLineType={ConnectionLineType.Bezier}
      onPaneContextMenu={event => { event.preventDefault(); if (props.editable) openMenu(event.clientX, event.clientY); }}
      onNodeContextMenu={(event, node) => { event.preventDefault(); openMenu(event.clientX, event.clientY, node.id); }}
      onMoveStart={() => setMenu(null)}
      onDelete={({ nodes, edges }) => props.onDelete(nodes.map(node => node.id), edges.map(edge => edge.id))}
      nodesDraggable={!panMode} nodesConnectable={props.editable && !panMode} elementsSelectable={!panMode} edgesReconnectable={false} deleteKeyCode={props.editable && !panMode ? ['Backspace', 'Delete'] : null}
      minZoom={0.1} maxZoom={2.5} fitView={fitOnMount.current} fitViewOptions={fit} zoomOnDoubleClick={false}
      panOnDrag={panMode ? [0, 1] : [1]} panActivationKeyCode={props.editable ? 'Space' : null}
      selectionOnDrag={!panMode} selectionKeyCode={panMode ? null : 'Shift'} multiSelectionKeyCode={['Control', 'Meta', 'Shift']}>
      <Background variant={BackgroundVariant.Dots} gap={22} size={1.3} color="rgba(185, 155, 255, 0.16)" />
      <Controls showInteractive={false} position={props.compact ? 'bottom-right' : 'bottom-left'} orientation={props.compact ? 'horizontal' : 'vertical'} />
      {!props.compact && <MiniMap position="bottom-right" pannable zoomable nodeBorderRadius={6} nodeColor={node => `${TYPE_COLORS[(node.data as CardData).node.type]}66`}
        nodeStrokeColor={node => TYPE_COLORS[(node.data as CardData).node.type]} nodeStrokeWidth={2} maskColor="rgba(8, 6, 16, 0.72)" />}
    </ReactFlow>
    {!props.compact && <div className="canvas-tools" role="toolbar" aria-label={t.canvas.tools} title={t.canvas.navigation}>
      <button type="button" className={cls('icon-btn', !panMode && 'active')} aria-label={t.canvas.select} title={t.canvas.select} aria-pressed={!panMode} onClick={() => { setPanMode(false); setMenu(null); }}><MousePointer2 size={16} /></button>
      <button type="button" className={cls('icon-btn', panMode && 'active')} aria-label={t.canvas.pan} title={t.canvas.pan} aria-pressed={panMode} onClick={() => { setPanMode(true); setMenu(null); }}><Hand size={16} /></button>
      <button type="button" className="canvas-zoom" aria-label={t.canvas.resetZoom} title={t.canvas.resetZoom} onClick={() => void api.zoomTo(1)}>{Math.round(zoom * 100)}%</button>
      {props.editable && <button type="button" className="icon-btn" aria-label={t.sidebar.addNode} title={t.sidebar.addNode} onClick={() => { const bounds = shell.current!.getBoundingClientRect(); setPanMode(false); openMenu(bounds.left + bounds.width / 2, bounds.top + bounds.height / 2); }}><Plus size={17} /></button>}
    </div>}
    {menu && <div className="canvas-menu nodrag nopan" role="dialog" aria-label={menu.nodeId ? t.canvas.nodeMenu : t.sidebar.addNode} style={{ left: menu.left, top: menu.top }} onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); setMenu(null); } }}>
      {menu.nodeId ? <>
        <b className="canvas-menu-title">{plan.graph.nodes.find(node => node.id === menu.nodeId)?.name}</b>
        <button type="button" autoFocus onClick={() => { props.onSelect(menu.nodeId!, 'node'); setMenu(null); }}>{t.canvas.inspect}</button>
        {props.editable && <><button type="button" onClick={() => setMenu({ ...menu, nodeId: undefined })}><Plus size={15} />{t.sidebar.addNode}</button>
          <button type="button" className="danger" onClick={() => { props.onDelete([menu.nodeId!], []); setMenu(null); }}><Trash2 size={15} />{t.canvas.deleteNode}</button></>}
      </> : <>
        <label className="search-box"><Search size={14} /><input autoFocus aria-label={t.canvas.search} placeholder={t.sidebar.search} value={query} onChange={event => setQuery(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && choices[0]) { event.preventDefault(); chooseNode(choices[0]); } }} /></label>
        <div className="canvas-node-choices">{choices.map(type => <button type="button" key={type} onClick={() => chooseNode(type)}><NodeIcon type={type} size={17} /><span><b>{t.nodeTypes[type]}</b><small>{t.nodeHints[type]}</small></span></button>)}
          {!choices.length && <p className="subtle">{t.sidebar.noMatch}</p>}</div>
      </>}
      <button type="button" className="canvas-menu-fit" onClick={() => { void api.fitView({ ...fit, duration: 250 }); setMenu(null); }}>{t.stage.fit}</button>
    </div>}
    {props.label && <div className={cls('pane-label', props.label.badge === 'B' && 'alt')}><span>{props.label.badge}</span><b>{props.label.name}</b>{props.label.note && <em>{props.label.note}</em>}</div>}
    {props.stale && <div className="canvas-stale" role="status"><TriangleAlert size={14} aria-hidden="true" />{t.canvas.stale}</div>}
    {!plan.graph.nodes.length && <div className="canvas-empty">
      <div className="empty-ghost"><Ghost size={64} /></div>
      <h2>{t.canvas.emptyTitle}</h2><p>{t.canvas.emptyText}</p>
      <button type="button" className="btn primary" onClick={() => props.onAdd('entrance', { x: 100, y: 180 })}><Plus size={15} aria-hidden="true" />{t.canvas.addEntrance}</button>
    </div>}
  </div>;
}
export function Canvas(props: Props) { return <ReactFlowProvider><CanvasInner {...props} /></ReactFlowProvider>; }
