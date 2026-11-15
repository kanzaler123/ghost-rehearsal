import { useEffect, useMemo, useRef, useState } from 'react';
import { Background, BackgroundVariant, ConnectionLineType, Controls, Handle, MarkerType, MiniMap, Position, ReactFlow, ReactFlowProvider, applyNodeChanges, useReactFlow, useStore } from '@xyflow/react';
import type { Connection, Edge as FlowEdge, Node as FlowNode, NodeProps, ReactFlowInstance } from '@xyflow/react';
import { ArrowDownRight, ArrowUpRight, Boxes, ChevronRight, ChevronsDownUp, Flame, Hand, MousePointer2, Plus, Search, Trash2, TriangleAlert } from 'lucide-react';
import type { Node, Plan, ValidationIssue } from '../schemas';
import { NODE_TYPES } from '../features/project';
import { liveSummary, waitingAt } from '../features/analysis';
import { NODE_SIZE, boxOf, displayBounds, displayLayout, stageIndex, unionBox } from '../features/stages';
import type { Box, Display } from '../features/stages';
import { useI18n } from '../i18n';
import type { Messages } from '../i18n';
import type { PlaybackState, SimulationRun } from '../simulation/types';
import { Ghost, HauntedBackdrop, NodeIcon } from './Icons';

type NodeState = PlaybackState['nodes'][string];
type GhostKind = 'working' | 'waiting' | 'blocked';
type Tracked = { id: string; name: string };
type Shared = { running: boolean; tracked?: Tracked; chooseVisitor: (id: string) => void; visitorName: (id: string) => string };
type CardData = Shared & { node: Node; state?: NodeState; trend: number; issues: number; changed: boolean; exits: number };
type StageData = Shared & {
  id: string; name: string; steps: number; types: Node['type'][]; issues: number; changed: boolean;
  waiting: number; serving: number; blocked: number; trend: number; exits: number; hasExit: boolean;
  busiest?: { name: string; waiting: number }; ghosts: [string, GhostKind][]; onOpen: () => void;
};
type FrameData = { id: string; name: string; steps: number; depth: number; waiting: number; running: boolean; changed: boolean; selected: boolean; onCollapse?: () => void; onSelect?: () => void };
type CardNode = FlowNode<CardData, 'workflow'>;
type StageNode = FlowNode<StageData, 'stage'>;
type FrameNode = FlowNode<FrameData, 'frame'>;
type AnyNode = CardNode | StageNode | FrameNode;

export const TYPE_COLORS: Record<Node['type'], string> = {
  entrance: '#7ef0c4', service: '#8cc8ff', decision: '#b99bff', waiting_area: '#ffc46b', merge: '#6fdbe0', exit: '#e9dcbf', subflow: '#8d84a8',
};

/** Below this zoom the default view stops shrinking and starts from the beginning of the flow instead. */
const READABLE_ZOOM = 0.6;
/** Build keeps service times and resource needs legible by default. */
const EDIT_ZOOM = 0.76;
const cls = (...names: (string | false | undefined | null)[]) => names.filter(Boolean).join(' ');
type Detail = 'near' | 'mid' | 'far';
const detailAt = (zoom: number): Detail => zoom >= 0.72 ? 'near' : zoom >= 0.4 ? 'mid' : 'far';

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

const ghostsOf = (state?: NodeState): [string, GhostKind][] => state ? [
  ...state.serving.map(id => [id, 'working'] as [string, GhostKind]),
  ...[...state.queued, ...state.holding].map(id => [id, 'waiting'] as [string, GhostKind]),
  ...state.blocked.map(id => [id, 'blocked'] as [string, GhostKind]),
] : [];

/** Ghost row. The followed ghost is always pinned first, whatever the limit. */
function GhostRow({ ghosts, limit, data }: { ghosts: [string, GhostKind][]; limit: number; data: Shared }) {
  const { t } = useI18n();
  if (!ghosts.length) return <div className="ghost-line empty" aria-hidden="true" />;
  const pinned = data.tracked ? ghosts.find(([id]) => id === data.tracked!.id) : undefined;
  const others = ghosts.filter(([id]) => id !== pinned?.[0]);
  const shown = others.slice(0, Math.max(0, limit - (pinned ? 1 : 0)));
  const rest = others.length - shown.length;
  return <div className="ghost-line nodrag">
    {pinned && <button type="button" className={cls('visitor', `is-${pinned[1]}`, 'is-tracked')} aria-label={t.canvas.follow(data.tracked!.name)} title={data.tracked!.name}
      onClick={event => { event.stopPropagation(); data.chooseVisitor(pinned[0]); }}><Ghost size={22} /><span className="tracked-tag">{data.tracked!.name}</span></button>}
    {shown.map(([id, kind], index) => <button key={id} type="button" aria-label={t.canvas.follow(data.visitorName(id))} title={data.visitorName(id)}
      className={cls('visitor', `is-${kind}`)} style={{ animationDelay: `${(index % 5) * -0.37}s` }}
      onClick={event => { event.stopPropagation(); data.chooseVisitor(id); }}><Ghost size={17} /></button>)}
    {rest > 0 && <span className="ghost-more">{t.canvas.more(rest)}</span>}
  </div>;
}

function Trend({ value }: { value: number }) {
  const { t } = useI18n();
  if (!value) return null;
  return <span className={cls('trend', value > 0 ? 'up' : 'down')} title={t.canvas.trendTitle}>{value > 0 ? <ArrowUpRight size={12} aria-hidden="true" /> : <ArrowDownRight size={12} aria-hidden="true" />}{t.canvas.trend(value)}</span>;
}

function stateClass(waiting: number, serving: number, blocked: number, trend: number) {
  return cls(serving > 0 && 'st-serving', waiting > 0 && 'st-waiting', waiting > 10 && 'st-crowded', trend > 0 && waiting > 0 && 'st-growing', blocked > 0 && 'st-blocked');
}

function FlowCard({ data, selected }: NodeProps<CardNode>) {
  const { t } = useI18n();
  const detail = useStore(store => detailAt(store.transform[2]));
  const { node, state } = data;
  const serving = state?.serving.length ?? 0;
  const blocked = state?.blocked.length ?? 0;
  const waiting = (state?.queued.length ?? 0) + (state?.holding.length ?? 0) + blocked;
  const ghosts = ghostsOf(state);
  const trackedHere = !!data.tracked && ghosts.some(([id]) => id === data.tracked!.id);
  const live = data.running && !!state;
  const isExit = node.type === 'exit';
  return <div className={cls('flow-card', `type-${node.type}`, `lod-${detail}`, selected && 'selected', data.changed && 'changed', live && 'running',
    live && stateClass(waiting, serving, blocked, data.trend), live && isExit && data.exits > 0 && 'st-done', trackedHere && 'has-tracked')}>
    {node.type !== 'entrance' && node.type !== 'subflow' && <Handle type="target" position={Position.Left} />}
    <div className="card-head">
      <span className="card-icon"><NodeIcon type={node.type} size={detail === 'near' ? 15 : 22} /></span>
      <span className="card-type">{t.nodeTypes[node.type]}</span>
      <span className="card-flags">
        {data.issues > 0 && <span className="card-flag issue"><TriangleAlert size={11} aria-hidden="true" />{data.issues}</span>}
        {data.changed && <span className="card-flag changed" title={t.canvas.changedTitle}>{t.canvas.changed}</span>}
        {live && waiting > 10 && <span className="card-flag hot"><Flame size={11} aria-hidden="true" />{t.canvas.crowded}</span>}
      </span>
    </div>
    <strong className="card-name">{node.name}</strong>
    <div className="card-detail">{detailOf(node, t)}</div>
    {live && (isExit
      ? <div className="card-live"><span className="is-done"><b>{data.exits}</b><small>{node.countsAsCompleted === false ? t.canvas.left : t.canvas.finished}</small></span></div>
      : <div className="card-live">
        <span className={cls('is-wait', waiting > 0 && 'is-on')}><b>{waiting}</b><Trend value={data.trend} /><small>{t.canvas.waiting}</small></span>
        <span className={cls('is-serve', serving > 0 && 'is-on')}><b>{serving}</b><small>{t.canvas.serving}</small></span>
        {blocked > 0 ? <span className="is-block is-on"><b>{blocked}</b><small>{t.canvas.blocked}</small></span>
          : <span className="is-pass"><b>{state.completed}</b><small>{t.canvas.passed}</small></span>}
      </div>)}
    {live && !isExit && <GhostRow ghosts={ghosts} limit={detail === 'near' ? 8 : detail === 'mid' ? 5 : 1} data={data} />}
    {live && detail === 'far' && <div className="far-crowd" aria-hidden="true"><Ghost size={20} />{isExit ? data.exits : waiting + serving}</div>}
    {node.type === 'decision'
      ? node.routing.branches.map((branch, index) => <Handle key={branch.branchKey} id={branch.branchKey} type="source" position={Position.Right} style={{ top: `${(index + 1) * 100 / (node.routing.branches.length + 1)}%` }} title={branch.branchKey} />)
      : node.type !== 'exit' && node.type !== 'subflow' && <Handle type="source" position={Position.Right} />}
  </div>;
}

function StageCard({ data, selected }: NodeProps<StageNode>) {
  const { t } = useI18n();
  const detail = useStore(store => detailAt(store.transform[2]));
  const trackedHere = !!data.tracked && data.ghosts.some(([id]) => id === data.tracked!.id);
  return <div className={cls('stage-card', `lod-${detail}`, selected && 'selected', data.changed && 'changed', data.running && 'running',
    data.running && stateClass(data.waiting, data.serving, data.blocked, data.trend), trackedHere && 'has-tracked')}>
    <Handle type="target" position={Position.Left} />
    <div className="card-head">
      <span className="card-icon"><Boxes size={detail === 'near' ? 15 : 22} aria-hidden="true" /></span>
      <span className="card-type">{t.canvas.stage} · {t.canvas.steps(data.steps)}</span>
      <span className="card-flags">
        {data.issues > 0 && <span className="card-flag issue"><TriangleAlert size={11} aria-hidden="true" />{data.issues}</span>}
        {data.changed && <span className="card-flag changed" title={t.canvas.changedTitle}>{t.canvas.changed}</span>}
      </span>
    </div>
    <strong className="card-name">{data.name}</strong>
    {!data.running && <div className="stage-types" aria-hidden="true">{data.types.map((type, index) => <span key={index} className={`type-${type}`}><NodeIcon type={type} size={13} /></span>)}</div>}
    {data.running && <div className="card-live">
      <span className={cls('is-wait', data.waiting > 0 && 'is-on')}><b>{data.waiting}</b><Trend value={data.trend} /><small>{t.canvas.waiting}</small></span>
      <span className={cls('is-serve', data.serving > 0 && 'is-on')}><b>{data.serving}</b><small>{t.canvas.serving}</small></span>
      {data.hasExit && <span className="is-done"><b>{data.exits}</b><small>{t.canvas.finished}</small></span>}
    </div>}
    {data.running && data.busiest && data.busiest.waiting > 0 && <div className="stage-busiest">{t.canvas.busiest(data.busiest.name, data.busiest.waiting)}</div>}
    {data.running && <GhostRow ghosts={data.ghosts} limit={detail === 'near' ? 7 : detail === 'mid' ? 4 : 1} data={data} />}
    {data.running && detail === 'far' && <div className="far-crowd" aria-hidden="true"><Ghost size={20} />{data.waiting + data.serving}</div>}
    <button type="button" className="stage-open nodrag" aria-label={t.canvas.openStage(data.name)} title={t.canvas.openStage(data.name)} onClick={event => { event.stopPropagation(); data.onOpen(); }}><ChevronRight size={16} /></button>
    <Handle type="source" position={Position.Right} />
  </div>;
}

function StageFrame({ data }: NodeProps<FrameNode>) {
  const { t } = useI18n();
  return <div className={cls('stage-frame', `depth-${Math.min(data.depth, 2)}`, data.selected && 'selected', data.changed && 'changed')}>
    <div className="stage-frame-head">
      <button type="button" className="frame-title nodrag" disabled={!data.onSelect} onClick={event => { event.stopPropagation(); data.onSelect?.(); }}>
        <Boxes size={15} aria-hidden="true" /><b>{data.name}</b><span>{t.canvas.steps(data.steps)}</span>
      </button>
      {data.running && data.waiting > 0 && <span className="frame-wait"><b>{data.waiting}</b>{t.canvas.waiting}</span>}
      {data.onCollapse && <button type="button" className="icon-btn frame-fold nodrag" aria-label={t.canvas.collapseStage(data.name)} title={t.canvas.collapseStage(data.name)} onClick={event => { event.stopPropagation(); data.onCollapse!(); }}><ChevronsDownUp size={15} /></button>}
    </div>
  </div>;
}

const nodeTypes = { workflow: FlowCard, stage: StageCard, frame: StageFrame };
/** Frames get their own React Flow ID so a stage switching between frame and card never reuses stale handle data. */
const frameId = (id: string) => `frame:${id}`;

/** `byPlan` overrides `ids` and `stageKeys` for a specific plan, for example when one ghost stands at different nodes in A and B. */
export type ViewTarget = 'default' | 'all' | { ids: string[]; stageKeys?: string[]; stages?: string[]; byPlan?: Record<string, string[]> };
export interface ViewRequest { token: number; target: ViewTarget }

interface Props {
  plan: Plan; selected: string; onSelect: (id: string, kind: 'node' | 'edge') => void; onMove: (positions: { id: string; x: number; y: number }[]) => void;
  onConnect: (connection: Connection) => void; onDelete: (ids: string[], edgeIds: string[]) => void;
  onAdd: (type: Node['type'], position: { x: number; y: number }) => void;
  editable: boolean; issues: ValidationIssue[]; view: PlaybackState; previous?: PlaybackState; run?: SimulationRun; stale: boolean;
  tracked?: Tracked; chooseVisitor: (id: string) => void; visitorName: (id: string) => string; changed?: Set<string>;
  request: ViewRequest; stageView: boolean; expanded: Set<string> | 'all'; onStage: (id: string, open: boolean) => void;
  label?: { badge: string; name: string; note?: string; status?: string };
  compact?: boolean;
}

const PADDING = { left: 40, right: 40, top: 64, bottom: 28 };
const PADDING_LABELLED = { left: 36, right: 64, top: 48, bottom: 10 };

function CanvasInner(props: Props) {
  const { plan, view, previous } = props;
  const { t } = useI18n();
  const api = useReactFlow<AnyNode>();
  const shell = useRef<HTMLDivElement>(null);
  const selection = useRef({ planId: plan.id, id: props.selected });
  const zoom = useStore(store => store.transform[2]);
  const width = useStore(store => store.width);
  const height = useStore(store => store.height);
  const [panMode, setPanMode] = useState(false);
  const [menu, setMenu] = useState<{ left: number; top: number; position: { x: number; y: number }; nodeId?: string } | null>(null);
  const [query, setQuery] = useState('');
  const [instance, setInstance] = useState<ReactFlowInstance<AnyNode> | null>(null);
  const running = !!props.run;
  const nodeSize = running ? NODE_SIZE.run : NODE_SIZE.build;
  const index = useMemo(() => stageIndex(plan), [plan]);
  const display = useMemo<Display>(() => displayLayout(plan, index, { derived: props.stageView, expanded: props.expanded, node: nodeSize }), [plan, index, props.stageView, props.expanded, nodeSize]);
  const draggable = !display.derived && !panMode;
  const summary = useMemo(() => liveSummary(view), [view]);
  const issueCount = (id: string) => props.issues.filter(issue => issue.entityIds.includes(id)).length;
  const mapped = useMemo<AnyNode[]>(() => {
    const shared: Shared = { running, tracked: props.tracked, chooseVisitor: props.chooseVisitor, visitorName: props.visitorName };
    const trendOf = (id: string) => previous ? waitingAt(view, id) - waitingAt(previous, id) : 0;
    const frames: FrameNode[] = [...display.frames.entries()].sort((a, b) => a[1].depth - b[1].depth).map(([id, box]) => {
      const subflow = index.subflows.get(id)!;
      const members = index.members.get(id)!;
      return { id: frameId(id), type: 'frame', position: { x: box.x, y: box.y }, width: box.w, height: box.h, style: { width: box.w, height: box.h }, zIndex: -10 + box.depth,
        draggable: false, selectable: false, focusable: false, className: 'frame-node',
        data: { id, name: subflow.name, steps: members.length, depth: box.depth, running, selected: props.selected === id, changed: props.changed?.has(id) ?? false,
          waiting: members.reduce((sum, member) => sum + waitingAt(view, member), 0),
          onCollapse: display.derived && index.stages.includes(id) ? () => props.onStage(id, false) : undefined,
          onSelect: props.editable ? () => props.onSelect(id, 'node') : undefined } };
    });
    const stages: StageNode[] = [...display.collapsed.entries()].map(([id, box]) => {
      const subflow = index.subflows.get(id)!;
      const members = index.members.get(id)!.map(member => plan.graph.nodes.find(node => node.id === member)!);
      const states = members.map(member => view.nodes[member.id]);
      const busiest = members.filter(member => member.type === 'service' || member.type === 'waiting_area')
        .map(member => ({ name: member.name, waiting: waitingAt(view, member.id) })).sort((a, b) => b.waiting - a.waiting)[0];
      return { id, type: 'stage', position: { x: box.x, y: box.y }, draggable: false, selected: props.selected === id,
        data: { ...shared, id, name: subflow.name, steps: members.length, types: [...new Set(members.map(member => member.type))],
          issues: members.reduce((sum, member) => sum + issueCount(member.id), issueCount(id)),
          changed: (props.changed?.has(id) ?? false) || members.some(member => props.changed?.has(member.id)),
          waiting: members.reduce((sum, member) => sum + waitingAt(view, member.id), 0), serving: states.reduce((sum, state) => sum + (state?.serving.length ?? 0), 0),
          blocked: states.reduce((sum, state) => sum + (state?.blocked.length ?? 0), 0), trend: members.reduce((sum, member) => sum + trendOf(member.id), 0),
          exits: members.reduce((sum, member) => sum + (member.type === 'exit' ? view.nodes[member.id]?.completed ?? 0 : 0), 0), hasExit: members.some(member => member.type === 'exit'),
          busiest, ghosts: states.flatMap(state => ghostsOf(state)), onOpen: () => props.onStage(id, true) } };
    });
    const cards: CardNode[] = plan.graph.nodes.flatMap(node => {
      const position = node.type === 'subflow' ? display.placeholders.get(node.id) : display.positions.get(node.id);
      if (!position) return [];
      return [{ id: node.id, type: 'workflow' as const, position, selected: props.selected === node.id, draggable,
        data: { ...shared, node, state: view.nodes[node.id], trend: trendOf(node.id), issues: issueCount(node.id), changed: props.changed?.has(node.id) ?? false, exits: summary.exits[node.id] ?? 0 } }];
    });
    return [...frames, ...stages, ...cards];
  }, [plan, index, display, view, previous, summary, props.selected, props.issues, props.tracked, props.chooseVisitor, props.visitorName, props.changed, props.editable, running, draggable]);
  const [flowNodes, setFlowNodes] = useState(mapped);
  useEffect(() => {
    const changed = selection.current.planId !== plan.id || selection.current.id !== props.selected;
    selection.current = { planId: plan.id, id: props.selected };
    setFlowNodes(previousNodes => mapped.map(node => {
      // A stage ID can switch between frame and card; never carry a frame's size over to a card.
      const found = previousNodes.find(item => item.id === node.id);
      const current = found?.type === node.type ? found : undefined;
      return { ...current, ...node, selected: changed ? node.selected : current?.selected ?? node.selected, position: current?.dragging ? current.position : node.position } as AnyNode;
    }));
  }, [mapped, plan.id, props.selected]);
  useEffect(() => { setMenu(null); }, [plan.id, props.editable]);

  // ---------- Viewport ----------
  const padding = props.label ? PADDING_LABELLED : PADDING;
  const last = useRef<{ target: ViewTarget; applied: boolean }>({ target: 'default', applied: false });
  /** Visible elements standing for a focus target in this plan. */
  function resolve(target: Exclude<ViewTarget, 'default' | 'all'>): string[] {
    const own = target.byPlan?.[plan.id];
    const matches = plan.graph.nodes.filter(node => own ? own.includes(node.id) : target.ids.includes(node.id) || (node.type === 'service' && target.stageKeys?.includes(node.stageKey)));
    let ids = matches.map(node => node.type === 'subflow' ? node.id : display.visible(node.id)).filter(id => boxOf(display, id, nodeSize));
    if (!ids.length && target.stages) ids = target.stages.filter(id => boxOf(display, id, nodeSize));
    return [...new Set(ids)];
  }
  /** Measured bounds once React Flow has sized the nodes; layout estimates before that. */
  function boundsOf(ids: string[] | 'all'): Box | undefined {
    const list = ids === 'all' ? mapped.map(node => node.id) : ids.map(id => display.frames.has(id) ? frameId(id) : id);
    const nodes = list.map(id => instance?.getInternalNode(id));
    const ready = nodes.length > 0 && nodes.every(node => node?.measured?.width && node.measured.height);
    if (ready) return unionBox(nodes.map(node => ({ x: node!.internals.positionAbsolute.x, y: node!.internals.positionAbsolute.y, w: node!.measured.width!, h: node!.measured.height! })));
    return ids === 'all' ? displayBounds(display, nodeSize) : unionBox(ids.map(id => boxOf(display, id, nodeSize)));
  }
  function apply(target: ViewTarget, duration: number): boolean {
    if (!instance || !width || !height) return false;
    const box = boundsOf(target === 'default' || target === 'all' ? 'all' : resolve(target));
    if (!box) return true;
    const room = { w: Math.max(40, width - padding.left - padding.right), h: Math.max(40, height - padding.top - padding.bottom) };
    const fit = Math.min(room.w / box.w, room.h / box.h);
    const [min, max] = target === 'all' ? [0.1, 1] : target === 'default' ? [props.editable ? EDIT_ZOOM : READABLE_ZOOM, 1] : [0.45, 1.05];
    const level = Math.min(max, Math.max(min, fit));
    let x = padding.left + (room.w - box.w * level) / 2 - box.x * level;
    let y = padding.top + (room.h - box.h * level) / 2 - box.y * level;
    // Too long to read at once: keep the readable zoom and start where guests enter.
    if (box.w * level > room.w) x = padding.left - box.x * level;
    if (box.h * level > room.h) y = padding.top - box.y * level;
    void instance.setViewport({ x, y, zoom: level }, { duration });
    return true;
  }
  useEffect(() => {
    last.current = { target: props.request.target, applied: false };
    const first = setTimeout(() => { last.current.applied = apply(props.request.target, 360); }, 40);
    // Newly shown cards are measured a moment later; settle on their real size.
    const settle = setTimeout(() => { if (last.current.applied) apply(props.request.target, 220); }, 420);
    return () => { clearTimeout(first); clearTimeout(settle); };
  }, [props.request.token, instance]);
  useEffect(() => {
    if (!last.current.applied || !props.editable) last.current.applied = apply(last.current.target, last.current.applied ? 0 : 300);
  }, [width, height]);

  // ---------- Edges ----------
  const edges = useMemo<FlowEdge[]>(() => {
    const busy = (id: string) => {
      const ids = index.subflows.has(id) ? index.members.get(id)! : [id];
      return ids.some(member => { const state = view.nodes[member]; return !!state && state.queued.length + state.serving.length + state.holding.length + state.blocked.length > 0; });
    };
    const grouped = new Map<string, { id: string; source: string; target: string; sourceHandle?: string; label?: string; ids: string[] }>();
    for (const edge of plan.graph.edges) {
      const source = display.visible(edge.source), target = display.visible(edge.target);
      if (source === target) continue;
      const real = source === edge.source && target === edge.target;
      const sourceHandle = source === edge.source ? edge.branchKey : undefined;
      const key = real ? edge.id : `agg:${source}:${sourceHandle ?? ''}>${target}`;
      const entry = grouped.get(key) ?? { id: key, source, target, sourceHandle, label: real ? edge.branchKey : undefined, ids: [] };
      entry.ids.push(edge.id); grouped.set(key, entry);
    }
    return [...grouped.values()].map(edge => {
      const active = running && busy(edge.target);
      const isSelected = props.selected === edge.id;
      const changed = edge.ids.some(id => props.changed?.has(id));
      const color = isSelected ? '#8ef5d0' : changed ? '#ff9a4d' : active ? '#8cc8ff' : '#84709b';
      return { id: edge.id, source: edge.source, target: edge.target, sourceHandle: edge.sourceHandle, type: 'default', pathOptions: { curvature: 0.4 }, label: edge.label, animated: active,
        selected: isSelected, selectable: !edge.id.startsWith('agg:'), className: cls(active && 'is-active', changed && 'is-changed'),
        markerEnd: { type: MarkerType.ArrowClosed, color, width: 16, height: 16 },
        style: { stroke: color, strokeWidth: isSelected ? 2.4 : active ? 2 : 1.6 },
        labelStyle: { fill: '#d9d1ee', fontSize: 11, fontWeight: 600 }, labelBgStyle: { fill: '#1d1833', stroke: '#3d3460' }, labelBgPadding: [7, 4] as [number, number], labelBgBorderRadius: 7,
      };
    });
  }, [plan.graph.edges, index, display, view, running, props.selected, props.changed]);

  function openMenu(x: number, y: number, nodeId?: string) {
    const bounds = shell.current!.getBoundingClientRect();
    setQuery('');
    setMenu({ left: Math.max(8, Math.min(x - bounds.left, bounds.width - 276)), top: Math.max(8, Math.min(y - bounds.top, bounds.height - 380)), position: api.screenToFlowPosition({ x, y }), nodeId });
  }
  const choices = NODE_TYPES.filter(type => `${t.nodeTypes[type]} ${t.nodeHints[type]} ${type}`.toLowerCase().includes(query.toLowerCase()));
  function chooseNode(type: Node['type']) {
    if (menu && props.editable) { props.onAdd(type, menu.position); setMenu(null); }
  }
  const isRealNode = (id: string) => plan.graph.nodes.some(node => node.id === id);
  return <div ref={shell} className={cls('canvas-shell', props.compact && 'compact-canvas', running && 'is-running')} onDoubleClick={event => {
    if (props.editable && (event.target as HTMLElement).classList.contains('react-flow__pane')) openMenu(event.clientX, event.clientY);
  }} onDragOver={event => { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; }} onDrop={event => {
    event.preventDefault(); const type = event.dataTransfer.getData('application/ghost-node') as Node['type'];
    if (props.editable && NODE_TYPES.includes(type)) props.onAdd(type, api.screenToFlowPosition({ x: event.clientX, y: event.clientY }));
  }}>
    {!props.compact && <HauntedBackdrop />}
    <ReactFlow<AnyNode> nodes={flowNodes} edges={edges} nodeTypes={nodeTypes} colorMode="dark" onInit={setInstance} elevateNodesOnSelect={false}
      onNodesChange={changes => {
        setFlowNodes(nodes => applyNodeChanges(changes, nodes));
        const positions = changes.flatMap(change => change.type === 'position' && change.position && !change.dragging && isRealNode(change.id) ? [{ id: change.id, ...change.position }] : []);
        if (positions.length && !display.derived) props.onMove(positions);
      }}
      onNodeClick={(event, node) => {
        setMenu(null);
        if (node.type === 'stage') { props.onStage(node.id, true); return; }
        if (node.type === 'frame') return;
        if (!panMode && !event.shiftKey && !event.ctrlKey && !event.metaKey) props.onSelect(node.id, 'node');
      }}
      onEdgeClick={(_, edge) => { setMenu(null); if (!edge.id.startsWith('agg:')) props.onSelect(edge.id, 'edge'); }}
      onPaneClick={() => { setMenu(null); props.onSelect('', 'node'); }} onConnect={props.onConnect} connectionLineType={ConnectionLineType.Bezier}
      onPaneContextMenu={event => { event.preventDefault(); if (props.editable) openMenu(event.clientX, event.clientY); }}
      onNodeContextMenu={(event, node) => { event.preventDefault(); if (node.type === 'workflow') openMenu(event.clientX, event.clientY, node.id); }}
      onMoveStart={() => setMenu(null)}
      onDelete={({ nodes, edges: removed }) => props.onDelete(nodes.filter(node => node.type === 'workflow').map(node => node.id), removed.filter(edge => !edge.id.startsWith('agg:')).map(edge => edge.id))}
      nodesDraggable={draggable} nodesConnectable={props.editable && !panMode} elementsSelectable={!panMode} edgesReconnectable={false} deleteKeyCode={props.editable && !panMode ? ['Backspace', 'Delete'] : null}
      minZoom={0.1} maxZoom={2.5} zoomOnDoubleClick={false}
      panOnDrag={panMode || !props.editable ? [0, 1] : [1]} panActivationKeyCode={props.editable ? 'Space' : null}
      selectionOnDrag={!panMode && props.editable} selectionKeyCode={panMode ? null : 'Shift'} multiSelectionKeyCode={['Control', 'Meta', 'Shift']}>
      <Background variant={BackgroundVariant.Dots} gap={22} size={1.3} color="rgba(185, 155, 255, 0.14)" />
      <Controls showInteractive={false} showFitView={false} position={props.compact ? 'bottom-right' : 'bottom-left'} orientation={props.compact ? 'horizontal' : 'vertical'} />
      {!props.compact && <MiniMap position="bottom-right" pannable zoomable nodeBorderRadius={6}
        nodeColor={node => node.type === 'frame' ? 'rgba(141, 132, 168, 0.12)' : node.type === 'stage' ? '#8d84a866' : `${TYPE_COLORS[(node.data as CardData).node.type]}66`}
        nodeStrokeColor={node => node.type === 'frame' ? 'rgba(141, 132, 168, 0.5)' : node.type === 'stage' ? '#b9b0d8' : TYPE_COLORS[(node.data as CardData).node.type]} nodeStrokeWidth={2} maskColor="rgba(8, 6, 16, 0.72)" />}
    </ReactFlow>
    {!props.compact && <div className="canvas-tools" role="toolbar" aria-label={t.canvas.tools} title={t.canvas.navigation}>
      {props.editable && <>
        <button type="button" className={cls('icon-btn', !panMode && 'active')} aria-label={t.canvas.select} title={t.canvas.select} aria-pressed={!panMode} onClick={() => { setPanMode(false); setMenu(null); }}><MousePointer2 size={16} /></button>
        <button type="button" className={cls('icon-btn', panMode && 'active')} aria-label={t.canvas.pan} title={t.canvas.pan} aria-pressed={panMode} onClick={() => { setPanMode(true); setMenu(null); }}><Hand size={16} /></button>
      </>}
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
      <button type="button" className="canvas-menu-fit" onClick={() => { apply('default', 250); setMenu(null); }}>{t.stage.fit}</button>
    </div>}
    {props.label && <div className={cls('pane-label', props.label.badge === 'B' && 'alt')}><span>{props.label.badge}</span><b>{props.label.name}</b>
      {props.label.note && <em>{props.label.note}</em>}
      {props.label.status && <i className="pane-tracked"><Ghost size={13} />{props.label.status}</i>}
    </div>}
    {props.stale && <div className="canvas-stale" role="status"><TriangleAlert size={14} aria-hidden="true" />{t.canvas.stale}</div>}
    {!plan.graph.nodes.length && <div className="canvas-empty">
      <div className="empty-ghost"><Ghost size={64} /></div>
      <h2>{t.canvas.emptyTitle}</h2><p>{t.canvas.emptyText}</p>
      <button type="button" className="btn primary" onClick={() => props.onAdd('entrance', { x: 100, y: 180 })}><Plus size={15} aria-hidden="true" />{t.canvas.addEntrance}</button>
    </div>}
  </div>;
}
export function Canvas(props: Props) { return <ReactFlowProvider><CanvasInner {...props} /></ReactFlowProvider>; }
