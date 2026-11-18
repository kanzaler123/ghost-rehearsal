import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Background, BackgroundVariant, BaseEdge, ConnectionLineType, Controls, EdgeLabelRenderer, Handle, MarkerType, MiniMap, Position, ReactFlow, ReactFlowProvider, applyNodeChanges, getBezierPath, useReactFlow, useStore, useUpdateNodeInternals } from '@xyflow/react';
import type { Connection, Edge as FlowEdge, EdgeProps, Node as FlowNode, NodeProps, ReactFlowInstance } from '@xyflow/react';
import { ArrowDownRight, ArrowUpRight, Boxes, ChevronRight, ChevronsDownUp, Flame, Hand, MousePointer2, Plus, Search, Trash2, TriangleAlert } from 'lucide-react';
import type { Node, Plan, ValidationIssue } from '../schemas';
import { NODE_TYPES } from '../features/project';
import { liveSummary, waitingAt } from '../features/analysis';
import { NODE_SIZE, boxOf, displayBounds, displayLayout, stageIndex, unionBox } from '../features/stages';
import type { Box, Display } from '../features/stages';
import { createViewportPlacement } from '../features/viewport';
import { motionDuration } from '../features/motion';
import { layoutGhosts } from './ghostRow';
import { QUEUE_SCALE_FLOOR, queueFill } from './queueScale';
import { LABEL_OFFSET, labelAnchor } from './routeLabel';
import { StatusMarker } from './shell/StatusMarker';
import { useI18n } from '../i18n';
import type { Messages } from '../i18n';
import type { PlaybackState, SimulationRun } from '../simulation/types';
import { Ghost, HauntedBackdrop, NodeIcon } from './Icons';

type NodeState = PlaybackState['nodes'][string];
type GhostKind = 'working' | 'waiting' | 'blocked';
type Tracked = { id: string; name: string };
type Shared = { running: boolean; queueScale: number; tracked?: Tracked; chooseVisitor: (id: string) => void; visitorName: (id: string) => string };
type CardData = Shared & { node: Node; state?: NodeState; trend: number; issues: number; changed: boolean; connected: boolean; exits: number; beacon: boolean; branchOrder?: string[] };
type StageData = Shared & {
  id: string; name: string; issues: number; changed: boolean;
  waiting: number; serving: number; blocked: number; trend: number; exits: number; hasExit: boolean; beacon: boolean;
  ghosts: [string, GhostKind][]; onOpen: () => void;
};
type FrameData = { id: string; name: string; steps: number; depth: number; waiting: number; running: boolean; changed: boolean; selected: boolean; onCollapse?: () => void; onSelect?: () => void };
type CardNode = FlowNode<CardData, 'workflow'>;
type StageNode = FlowNode<StageData, 'stage'>;
type FrameNode = FlowNode<FrameData, 'frame'>;
type AnyNode = CardNode | StageNode | FrameNode;

export const TYPE_COLORS: Record<Node['type'], string> = {
  entrance: 'var(--tone-done)', service: 'var(--tone-serve)', decision: 'var(--tone-diff)', waiting_area: 'var(--tone-wait)', merge: 'var(--tone-neutral)', exit: 'var(--tone-left)', subflow: 'var(--plan-b)',
};

/** Below this zoom the default view stops shrinking and starts from the beginning of the flow instead. */
const READABLE_ZOOM = 0.6;
/** Build keeps service times and resource needs legible by default. */
const EDIT_ZOOM = 0.92;
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
  const { pinned, shown, undrawn: rest } = layoutGhosts(ghosts, limit, data.tracked?.id);
  return <div className="ghost-line nodrag">
    {pinned && <button type="button" className={cls('visitor', `is-${pinned[1]}`, 'is-tracked')} aria-label={t.canvas.follow(data.tracked!.name)} title={data.tracked!.name}
      onClick={event => { event.stopPropagation(); data.chooseVisitor(pinned[0]); }}><Ghost size={22} /><StatusMarker id="tracked" compact /><span className="tracked-tag">{data.tracked!.name}</span></button>}
    {shown.map(([id, kind], index) => <button key={id} type="button" aria-label={t.canvas.follow(data.visitorName(id))} title={data.visitorName(id)}
      className={cls('visitor', `is-${kind}`)} style={{ animationDelay: `${(index % 5) * -0.37}s` }}
      onClick={event => { event.stopPropagation(); data.chooseVisitor(id); }}><Ghost size={18} /><StatusMarker id={kind === 'working' ? 'serve' : kind === 'waiting' ? 'queue' : 'blocked'} compact /></button>)}
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

/** Liquid queue gauge. Every card on both canvases shares one scale, exposed for inspection as `data-scale`. */
function Gauge({ waiting, scale, trend }: { waiting: number; scale: number; trend: number }) {
  return <div className="queue-gauge">
    <div className="queue-load" aria-hidden="true" data-scale={scale}><span style={{ width: `${queueFill(waiting, scale)}%` }} /></div>
    <Trend value={trend} />
  </div>;
}

/** Decorative ghost-fire on overloaded stations; only shown when the recorded queue is crowded or blocked. */
function Flames({ blocked }: { blocked: boolean }) {
  return <span className={cls('haunt-flames', blocked && 'is-blocked')} aria-hidden="true"><i /><i /><i /></span>;
}

function FlowCard({ id, data, selected }: NodeProps<CardNode>) {
  const { t } = useI18n();
  const detail = useStore(store => detailAt(store.transform[2]));
  const { node, state } = data;
  const branchOrder = data.branchOrder;
  const branches = node.type === 'decision' ? node.routing.branches : undefined;
  const updateHandles = useUpdateNodeInternals();
  useLayoutEffect(() => { if (branches) updateHandles(id); }, [branches, branchOrder, id, updateHandles]);
  const serving = state?.serving.length ?? 0;
  const blocked = state?.blocked.length ?? 0;
  const waiting = (state?.queued.length ?? 0) + (state?.holding.length ?? 0) + blocked;
  const ghosts = ghostsOf(state);
  const trackedHere = !!data.tracked && ghosts.some(([id]) => id === data.tracked!.id);
  const live = data.running && !!state;
  const isExit = node.type === 'exit';
  const overloaded = live && !isExit && (waiting > 10 || blocked > 0);
  return <div className={cls('flow-card', `type-${node.type}`, `lod-${detail}`, selected && 'selected', data.connected && 'is-connected', data.changed && 'changed', live && 'running',
    live && stateClass(waiting, serving, blocked, data.trend), live && isExit && data.exits > 0 && 'st-done', trackedHere && 'has-tracked', live && data.beacon && 'is-beacon')}>
    {trackedHere && <span className="tracked-spotlight" aria-hidden="true" />}
    {overloaded && <Flames blocked={blocked > 0} />}
    {node.type !== 'entrance' && node.type !== 'subflow' && <Handle type="target" position={Position.Left} />}
    <div className="card-head">
      <span className="card-icon"><NodeIcon type={node.type} size={detail === 'near' ? 15 : 22} /></span>
      <span className="card-type">{t.nodeTypes[node.type]}</span>
      <span className="card-flags">
        {data.issues > 0 && <span className="card-flag issue"><StatusMarker id="error" compact />{data.issues}</span>}
        {data.changed && <span className="card-flag changed"><StatusMarker id="diff" compact title={t.canvas.changedTitle} /></span>}
        {live && waiting > 10 && <span className="card-flag hot"><Flame size={11} aria-hidden="true" />{t.canvas.crowded}</span>}
      </span>
    </div>
    <strong className="card-name" title={node.name} aria-label={node.name}>{node.name}</strong>
    <div className="card-detail">{detailOf(node, t)}</div>
    {live && (isExit
      ? <div className="card-live is-exit"><span className="live-cell is-done"><span className="live-value"><StatusMarker id={node.countsAsCompleted === false ? 'left' : 'finished'} compact label={node.countsAsCompleted === false ? t.canvas.left : t.canvas.finished} /><b>{data.exits}</b></span><small>{node.countsAsCompleted === false ? t.canvas.left : t.canvas.finished}</small></span></div>
      : <div className="card-live">
        <span className={cls('live-cell is-wait', waiting > 0 && 'is-on')}><span className="live-value"><StatusMarker id="queue" compact label={t.canvas.waiting} /><b>{waiting}</b></span><small>{t.canvas.waiting}</small></span>
        <span className={cls('live-cell is-serve', serving > 0 && 'is-on')}><span className="live-value"><StatusMarker id="serve" compact label={t.canvas.serving} /><b>{serving}</b></span><small>{t.canvas.serving}</small></span>
        {blocked > 0 ? <span className="live-cell is-block is-on"><span className="live-value"><StatusMarker id="blocked" compact label={t.canvas.blocked} /><b>{blocked}</b></span><small>{t.canvas.blocked}</small></span>
          : <span className="live-cell is-pass"><span className="live-value"><b>{state.completed}</b></span><small>{t.canvas.passed}</small></span>}
      </div>)}
    {live && !isExit && <GhostRow ghosts={ghosts} limit={detail === 'near' ? 8 : detail === 'mid' ? 5 : 1} data={data} />}
    {live && !isExit && <Gauge waiting={waiting} scale={data.queueScale} trend={data.trend} />}
    {live && detail === 'far' && <div className="far-crowd" aria-hidden="true"><Ghost size={20} />{isExit ? data.exits : waiting + serving}</div>}
    {branches
      ? (branchOrder ?? branches.map(branch => branch.branchKey)).map((key, index) => <Handle key={key} id={key} type="source" position={Position.Right} style={{ top: `${(index + 1) * 100 / (branches.length + 1)}%` }} title={key} />)
      : node.type !== 'exit' && node.type !== 'subflow' && <Handle type="source" position={Position.Right} />}
  </div>;
}

function StageCard({ data, selected }: NodeProps<StageNode>) {
  const { t } = useI18n();
  const detail = useStore(store => detailAt(store.transform[2]));
  const trackedHere = !!data.tracked && data.ghosts.some(([id]) => id === data.tracked!.id);
  return <div className={cls('stage-card', `lod-${detail}`, selected && 'selected', data.changed && 'changed', data.running && 'running',
    data.running && stateClass(data.waiting, data.serving, data.blocked, data.trend), trackedHere && 'has-tracked', data.running && data.beacon && 'is-beacon')}>
    {trackedHere && <span className="tracked-spotlight" aria-hidden="true" />}
    {data.running && (data.waiting > 10 || data.blocked > 0) && <Flames blocked={data.blocked > 0} />}
    <Handle type="target" position={Position.Left} />
    <div className="card-head">
      <span className="card-icon"><Boxes size={detail === 'near' ? 15 : 22} aria-hidden="true" /></span>
      <span className="card-flags">
        {data.issues > 0 && <span className="card-flag issue"><StatusMarker id="error" compact />{data.issues}</span>}
        {data.changed && <span className="card-flag changed"><StatusMarker id="diff" compact title={t.canvas.changedTitle} /></span>}
      </span>
    </div>
    <strong className="card-name" title={data.name} aria-label={data.name}>{data.name}</strong>
    {data.running && <div className="stage-summary">
      <div className={cls('stage-queue', data.waiting > 0 && 'is-on')}><b>{data.waiting}</b><span>{t.canvas.waiting}</span></div>
      <div className="stage-secondary"><span className="is-serve"><b>{data.serving}</b> {t.canvas.serving}</span>
        {data.blocked > 0 && <span className="is-block"><b>{data.blocked}</b> {t.canvas.blocked}</span>}
        {data.hasExit && <span className="is-done"><b>{data.exits}</b> {t.canvas.finished}</span>}
      </div>
    </div>}
    {data.running && <GhostRow ghosts={data.ghosts} limit={detail === 'near' ? 5 : detail === 'mid' ? 3 : 1} data={data} />}
    {data.running && <Gauge waiting={data.waiting} scale={data.queueScale} trend={data.trend} />}
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

const sameIds = (a: string[], b: string[]) => a === b || (a.length === b.length && a.every((id, index) => id === b[index]));
function sameCard(a: NodeProps<CardNode>, b: NodeProps<CardNode>) {
  if (a.selected !== b.selected) return false;
  const x = a.data, y = b.data;
  if (x === y) return true;
  if (x.node !== y.node || x.running !== y.running || x.queueScale !== y.queueScale || x.beacon !== y.beacon || x.tracked !== y.tracked || x.chooseVisitor !== y.chooseVisitor || x.visitorName !== y.visitorName
    || x.trend !== y.trend || x.issues !== y.issues || x.changed !== y.changed || x.connected !== y.connected || x.exits !== y.exits || x.branchOrder !== y.branchOrder) return false;
  const s = x.state, t = y.state;
  return s === t || (!!s && !!t && s.completed === t.completed && sameIds(s.serving, t.serving) && sameIds(s.queued, t.queued)
    && sameIds(s.holding, t.holding) && sameIds(s.blocked, t.blocked));
}

// Playback rebuilds state arrays, including for unchanged nodes. Compare every
// value the card consumes; zoom and language still update through subscriptions.
// NodeWrapper's measurement/position changes do not affect the card content.
const nodeTypes = {
  workflow: memo(FlowCard, sameCard),
  stage: memo(StageCard, (a, b) => a.data === b.data && a.selected === b.selected),
  frame: memo(StageFrame, (a, b) => a.data === b.data),
};
/** Frames get their own React Flow ID so a stage switching between frame and card never reuses stale handle data. */
const frameId = (id: string) => `frame:${id}`;

/** `byPlan` overrides `ids` and `stageKeys` for a specific plan, for example when one ghost stands at different nodes in A and B. */
export type ViewTarget = 'default' | 'all' | { ids: string[]; stageKeys?: string[]; stages?: string[]; byPlan?: Record<string, string[]> };
export interface ViewRequest { token: number; target: ViewTarget }
type RouteData = { travelers: { id: string; progress: number; selected: boolean }[]; chooseVisitor: (id: string) => void; flowing: boolean; gradient: string; branchTargets?: Box[] };
/** Lagging trail positions are drawn behind each recorded traveller; they never move it ahead of its real progress. */
const TRAIL = [0.075, 0.05, 0.025];
function RouteEdge(props: EdgeProps<FlowEdge<RouteData>>) {
  const { t } = useI18n();
  const { data, sourceX, sourceY, targetX, targetY } = props;
  const bendX = data?.branchTargets?.reduce((x, box) => {
    const clearance = 10;
    const right = box.x + box.w + clearance;
    const bottom = box.y + box.h;
    return box.x > sourceX && right < targetX && targetY >= box.y && targetY <= bottom
      && (sourceY < box.y - clearance || sourceY > bottom + clearance) ? Math.max(x, right) : x;
  }, sourceX) ?? sourceX;
  const [curve, labelX, labelY] = getBezierPath({ ...props, sourceX: bendX, curvature: 0.4 });
  const detour = bendX > sourceX;
  const path = detour ? `M${sourceX},${sourceY} L${curve.slice(1)}` : curve;
  const along = (progress: number): CSSProperties => ({ offsetPath: `path('${path}')`, offsetDistance: `${Math.min(1, Math.max(0, progress)) * 100}%` });
  const [runeX, runeY] = props.label
    ? detour ? [Math.min(sourceX + LABEL_OFFSET, bendX), sourceY] : labelAnchor(path, [labelX, labelY])
    : [labelX, labelY];
  return <>
    {data?.flowing && <path className="route-aura" d={path} />}
    <BaseEdge id={props.id} path={path} markerEnd={props.markerEnd} style={props.style} />
    {data?.flowing && <>
      <defs><linearGradient id={data.gradient} gradientUnits="userSpaceOnUse" x1={props.sourceX} y1={props.sourceY} x2={props.targetX} y2={props.targetY}>
        <stop offset="0" style={{ stopColor: 'var(--fx-wisp-mint)' }} /><stop offset="0.55" style={{ stopColor: 'var(--fx-wisp-violet)' }} /><stop offset="1" style={{ stopColor: 'var(--fx-ember)' }} />
      </linearGradient></defs>
      <path className="route-flow" d={path} stroke={`url(#${data.gradient})`} />
    </>}
    {props.label && <EdgeLabelRenderer><span className="route-rune" style={{ transform: `translate(-50%, calc(-100% + var(--rune-label-lift))) translate(${runeX}px, ${runeY}px)` }}>{props.label}</span></EdgeLabelRenderer>}
    {data?.travelers.map(visitor => <g key={visitor.id} className={cls('route-orb', visitor.selected && 'is-tracked')}>
      {TRAIL.filter(lag => visitor.progress - lag > 0).map(lag => <circle key={lag} className="orb-trail" r={visitor.selected ? 4 : 3} style={along(visitor.progress - lag)} />)}
      <circle className="orb-halo" r={visitor.selected ? 15 : 10} style={along(visitor.progress)} />
      <circle className="orb-core" r={visitor.selected ? 7 : 5} fill={visitor.selected ? 'var(--tone-track)' : 'var(--tone-neutral)'} stroke="var(--surface-0)" strokeWidth={2}
        role="button" tabIndex={0} aria-label={t.canvas.follow(visitor.id)} style={{ ...along(visitor.progress), cursor: 'pointer' }}
        onClick={event => { event.stopPropagation(); data?.chooseVisitor(visitor.id); }} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); data?.chooseVisitor(visitor.id); } }}><title>{visitor.id}</title></circle>
    </g>)}
  </>;
}
const edgeTypes = { route: RouteEdge };

interface Props {
  plan: Plan; selected: string; onSelect: (id: string, kind: 'node' | 'edge') => void; onMove: (positions: { id: string; x: number; y: number }[]) => void;
  onConnect: (connection: Connection) => void; onDelete: (ids: string[], edgeIds: string[]) => void;
  onAdd: (type: Node['type'], position: { x: number; y: number }) => void;
  editable: boolean; issues: ValidationIssue[]; view: PlaybackState; previous?: PlaybackState; run?: SimulationRun; time: number; stale: boolean;
  tracked?: Tracked; chooseVisitor: (id: string) => void; visitorName: (id: string) => string; changed?: Set<string>;
  request: ViewRequest; stageView: boolean; expanded: Set<string> | 'all'; onStage: (id: string, open: boolean) => void;
  label?: { badge: 'A' | 'B'; name: string; note?: string; status?: string };
  compact?: boolean; reducedMotion?: boolean; onManual?: () => void;
  /** Shared queue gauge scale for every canvas on screen. */
  queueScale?: number;
  /** Stations to light up after a focus action (for example the first difference). */
  beacon?: string[];
  /** Short strip above the journey: tighter fit padding and no zoom controls. */
  dense?: boolean;
}

/** Fit padding keeps cards clear of the floating HUD (top) and the zoom controls (bottom). */
const PADDING = { left: 40, right: 40, top: 64, bottom: 56 };
const PADDING_LABELLED = { left: 28, right: 48, top: 20, bottom: 44 };
const PADDING_DENSE = { left: 16, right: 24, top: 14, bottom: 10 };

function CanvasInner(props: Props) {
  const { plan, view, previous } = props;
  const { t } = useI18n();
  const api = useReactFlow<AnyNode>();
  const visitorAction = useRef(props.chooseVisitor);
  useLayoutEffect(() => { visitorAction.current = props.chooseVisitor; }, [props.chooseVisitor]);
  // Retain one event handler without retaining an obsolete playback-time closure.
  const chooseVisitor = useCallback((id: string) => visitorAction.current(id), []);
  // Parent actions change on replay controls too; keep node data stable until its
  // content changes, while forwarding clicks to the latest committed actions.
  const canvasActions = useRef({ onStage: props.onStage, onSelect: props.onSelect });
  useLayoutEffect(() => { canvasActions.current = { onStage: props.onStage, onSelect: props.onSelect }; }, [props.onStage, props.onSelect]);
  const openStage = useCallback((id: string, open: boolean) => canvasActions.current.onStage(id, open), []);
  const selectNode = useCallback((id: string) => canvasActions.current.onSelect(id, 'node'), []);
  const selection = useRef({ planId: plan.id, id: props.selected });
  const shell = useRef<HTMLDivElement>(null);
  const menuTrigger = useRef<HTMLElement | null>(null);
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
  const branchLayout = useMemo(() => {
    const destinations = new Map<string, Map<string, Box>>();
    for (const edge of plan.graph.edges) {
      if (!edge.branchKey || !display.positions.has(edge.source)) continue;
      const targetId = display.visible(edge.target);
      const target = boxOf(display, targetId, nodeSize);
      if (!target || targetId === edge.source) continue;
      const branches = destinations.get(edge.source) ?? new Map<string, Box>();
      branches.set(edge.branchKey, target);
      destinations.set(edge.source, branches);
    }
    const orders = new Map<string, string[]>();
    const targetsBySource = new Map<string, Box[]>();
    for (const node of plan.graph.nodes) {
      const targets = destinations.get(node.id), source = display.positions.get(node.id);
      if (node.type !== 'decision' || !source || !targets || targets.size < 2) continue;
      const keys = node.routing.branches.map(branch => branch.branchKey);
      const direction = (target: Box) => (target.y + target.h / 2 - source.y - nodeSize.h / 2) / Math.max(1, target.x - source.x - nodeSize.w);
      const connected = keys.filter(key => targets.has(key)).sort((a, b) => direction(targets.get(a)!) - direction(targets.get(b)!));
      let next = 0;
      const order = keys.map(key => targets.has(key) ? connected[next++] : key);
      if (order.some((key, index) => key !== keys[index])) orders.set(node.id, order);
      targetsBySource.set(node.id, connected.map(key => targets.get(key)!));
    }
    return { orders, targetsBySource };
  }, [plan.graph, display, nodeSize]);
  const draggable = props.editable && !display.derived && !panMode;
  const summary = useMemo(() => liveSummary(view), [view]);
  const issueCount = (id: string) => props.issues.filter(issue => issue.entityIds.includes(id)).length;
  const beaconKey = props.beacon?.join('\n') ?? '';
  const queueScaleValue = props.queueScale ?? QUEUE_SCALE_FLOOR;
  const mapped = useMemo<AnyNode[]>(() => {
    const beacon = new Set(beaconKey ? beaconKey.split('\n') : []);
    const shared: Shared = { running, queueScale: queueScaleValue, tracked: props.tracked, chooseVisitor, visitorName: props.visitorName };
    const trendOf = (id: string) => previous ? waitingAt(view, id) - waitingAt(previous, id) : 0;
    const frames: FrameNode[] = [...display.frames.entries()].sort((a, b) => a[1].depth - b[1].depth).map(([id, box]) => {
      const subflow = index.subflows.get(id)!;
      const members = index.members.get(id)!;
      return { id: frameId(id), type: 'frame', position: { x: box.x, y: box.y }, width: box.w, height: box.h, style: { width: box.w, height: box.h }, zIndex: -10 + box.depth,
        draggable: false, selectable: false, focusable: false, className: 'frame-node',
        data: { id, name: subflow.name, steps: members.length, depth: box.depth, running, selected: props.selected === id, changed: props.changed?.has(id) ?? false,
          waiting: members.reduce((sum, member) => sum + waitingAt(view, member), 0),
          onCollapse: display.derived && index.stages.includes(id) ? () => openStage(id, false) : undefined,
          onSelect: props.editable ? () => selectNode(id) : undefined } };
    });
    const stages: StageNode[] = [...display.collapsed.entries()].map(([id, box]) => {
      const subflow = index.subflows.get(id)!;
      const members = index.members.get(id)!.map(member => plan.graph.nodes.find(node => node.id === member)!);
      const states = members.map(member => view.nodes[member.id]);
      return { id, type: 'stage', position: { x: box.x, y: box.y }, draggable: false, selected: props.selected === id,
        data: { ...shared, id, name: subflow.name,
          issues: members.reduce((sum, member) => sum + issueCount(member.id), issueCount(id)),
          changed: (props.changed?.has(id) ?? false) || members.some(member => props.changed?.has(member.id)),
          waiting: members.reduce((sum, member) => sum + waitingAt(view, member.id), 0), serving: states.reduce((sum, state) => sum + (state?.serving.length ?? 0), 0),
          blocked: states.reduce((sum, state) => sum + (state?.blocked.length ?? 0), 0), trend: members.reduce((sum, member) => sum + trendOf(member.id), 0),
          exits: members.reduce((sum, member) => sum + (member.type === 'exit' ? view.nodes[member.id]?.completed ?? 0 : 0), 0), hasExit: members.some(member => member.type === 'exit'),
          beacon: beacon.has(id) || members.some(member => beacon.has(member.id)),
          ghosts: states.flatMap(state => ghostsOf(state)), onOpen: () => openStage(id, true) } };
    });
    const cards: CardNode[] = plan.graph.nodes.flatMap(node => {
      const position = node.type === 'subflow' ? display.placeholders.get(node.id) : display.positions.get(node.id);
      if (!position) return [];
      return [{ id: node.id, type: 'workflow' as const, position, selected: props.selected === node.id, draggable,
        data: { ...shared, node, state: view.nodes[node.id], trend: trendOf(node.id), issues: issueCount(node.id), connected: plan.graph.edges.some(edge => edge.id === props.selected && (edge.source === node.id || edge.target === node.id)), changed: props.changed?.has(node.id) ?? false, exits: summary.exits[node.id] ?? 0, beacon: beacon.has(node.id), branchOrder: branchLayout.orders.get(node.id) } }];
    });
    return [...frames, ...stages, ...cards];
  }, [plan, index, display, branchLayout, view, previous, summary, props.selected, props.issues, props.tracked, chooseVisitor, props.visitorName, props.changed, props.editable, openStage, selectNode, queueScaleValue, beaconKey, running, draggable]);
  const [flowNodes, setFlowNodes] = useState(mapped);
  const detail = detailAt(zoom);
  const measurement = useRef({ plan, detail, lang: t.lang });
  useEffect(() => {
    const changed = selection.current.planId !== plan.id || selection.current.id !== props.selected;
    selection.current = { planId: plan.id, id: props.selected };
    const changedPlan = measurement.current.plan !== plan;
    const resized = measurement.current.detail !== detail || measurement.current.lang !== t.lang;
    measurement.current = { plan, detail, lang: t.lang };
    setFlowNodes(previousNodes => {
      const byId = new Map(previousNodes.map(node => [node.id, node]));
      return mapped.map(node => {
        // A stage ID can switch between frame and card; never carry a frame's size over to a card.
        const found = byId.get(node.id);
        const current = found?.type === node.type ? found : undefined;
        return { ...current, ...node, measured: running && mapped.length > 50 && (resized || current?.data.running !== node.data.running
          || (changedPlan && (node.type !== 'workflow' || current?.type !== 'workflow' || JSON.stringify(current.data.node) !== JSON.stringify(node.data.node)))) ? undefined : current?.measured,
          selected: changed ? node.selected : current?.selected ?? node.selected, position: current?.dragging ? current.position : node.position } as AnyNode;
      });
    });
  }, [mapped, plan.id, props.selected, detail, t.lang]);
  useEffect(() => { setMenu(null); }, [plan.id, props.editable]);

  // ---------- Viewport ----------
  const padding = props.dense ? PADDING_DENSE : props.label ? PADDING_LABELLED : PADDING;
  /** Visible elements standing for a focus target in this plan. */
  function resolve(target: Exclude<ViewTarget, 'default' | 'all'>): string[] {
    const own = target.byPlan?.[plan.id];
    const matches = plan.graph.nodes.filter(node => own ? own.includes(node.id) : target.ids.includes(node.id) || (node.type === 'service' && target.stageKeys?.includes(node.stageKey)));
    let ids = matches.map(node => node.type === 'subflow' ? node.id : display.visible(node.id)).filter(id => boxOf(display, id, nodeSize));
    if (!own && !ids.length && target.stages) ids = target.stages.filter(id => boxOf(display, id, nodeSize));
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
    if (!instance || !width || !height || !shell.current?.clientWidth || !shell.current.clientHeight) return false;
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
    void instance.setViewport({ x, y, zoom: level }, { duration: motionDuration(!!props.reducedMotion, duration) });
    return true;
  }
  const latestApply = useRef(apply);
  latestApply.current = apply;
  const reducedRef = useRef(props.reducedMotion); reducedRef.current = props.reducedMotion;
  const placement = useMemo(() => createViewportPlacement<ViewTarget>((target, duration) => latestApply.current(target, duration), { reduced: () => !!reducedRef.current }), []);
  function userMove() { setMenu(null); placement.userMove(); props.onManual?.(); }
  useEffect(() => {
    placement.request(props.request.target);
    return placement.cancelPending;
  }, [props.request.token, instance]);
  useEffect(() => {
    placement.resize(!props.editable);
  }, [width, height]);

  // ---------- Edges ----------
  const edges = useMemo<FlowEdge[]>(() => {
    const grouped = new Map<string, { id: string; source: string; target: string; sourceHandle?: string; label?: string; ids: string[] }>();
    const groupForEdge = new Map<string, string>();
    for (const edge of plan.graph.edges) {
      const source = display.visible(edge.source), target = display.visible(edge.target);
      if (source === target) continue;
      const real = source === edge.source && target === edge.target;
      const sourceHandle = source === edge.source ? edge.branchKey : undefined;
      const key = real ? edge.id : `agg:${source}:${sourceHandle ?? ''}>${target}`;
      const entry = grouped.get(key) ?? { id: key, source, target, sourceHandle, label: real ? edge.branchKey : undefined, ids: [] };
      entry.ids.push(edge.id); grouped.set(key, entry); groupForEdge.set(edge.id, key);
    }
    const travelersByGroup = new Map<string, { id: string; progress: number; selected: boolean }[]>();
    if (running) for (const event of Object.values(view.visitors)) {
      const key = groupForEdge.get(event.edgeId ?? '');
      if (!key || event.type !== 'ROUTE_TRANSITION' || !(Number(event.details?.arrivalAt) > props.time)) continue;
      const travelers = travelersByGroup.get(key) ?? [];
      travelers.push({ id: event.participantId!, progress: (props.time - event.time) / (Number(event.details!.arrivalAt) - event.time), selected: event.participantId === props.tracked?.id });
      travelersByGroup.set(key, travelers);
    }
    return [...grouped.values()].map(edge => {
      const travelers = travelersByGroup.get(edge.id) ?? [];
      const active = travelers.length > 0;
      const isSelected = props.selected === edge.id || edge.source === props.selected || edge.target === props.selected;
      const changed = edge.ids.some(id => props.changed?.has(id));
      const color = isSelected ? 'var(--text-primary)' : changed ? 'var(--tone-diff)' : active ? 'var(--tone-serve)' : 'var(--text-muted)';
      return { id: edge.id, source: edge.source, target: edge.target, sourceHandle: edge.sourceHandle, type: 'route', label: edge.label,
        data: { travelers, chooseVisitor, flowing: running && active, gradient: `route-flow-${plan.id}-${edge.id}`.replace(/[^\w-]/g, '_'), branchTargets: branchLayout.targetsBySource.get(edge.source) },
        selected: props.selected === edge.id, selectable: !edge.id.startsWith('agg:'), className: cls(active && 'is-active', changed && 'is-changed'),
        markerEnd: { type: MarkerType.ArrowClosed, color, width: isSelected ? 20 : 16, height: isSelected ? 20 : 16 },
        style: { stroke: color, strokeWidth: isSelected ? 3 : active || changed ? 2 : 1.6 },
      };
    });
  }, [plan.id, plan.graph.edges, display, branchLayout, view, running, props.time, props.tracked, chooseVisitor, props.selected, props.changed]);

  function openMenu(x: number, y: number, nodeId?: string) {
    placement.userMove();
    menuTrigger.current = document.activeElement as HTMLElement | null;
    const bounds = shell.current!.getBoundingClientRect();
    setQuery('');
    setMenu({ left: Math.max(8, Math.min(x - bounds.left, bounds.width - 276)), top: Math.max(8, Math.min(y - bounds.top, bounds.height - 380)), position: api.screenToFlowPosition({ x, y }), nodeId });
  }
  const choices = NODE_TYPES.filter(type => `${t.nodeTypes[type]} ${t.nodeHints[type]} ${type}`.toLowerCase().includes(query.toLowerCase()));
  function chooseNode(type: Node['type']) {
    if (menu && props.editable) { props.onAdd(type, menu.position); setMenu(null); }
  }
  const isRealNode = (id: string) => plan.graph.nodes.some(node => node.id === id);
  return <div ref={shell} style={{ '--canvas-zoom': zoom } as CSSProperties} className={cls('canvas-shell', props.compact && 'compact-canvas', props.dense && 'dense-canvas', running && 'is-running')}
    onWheelCapture={userMove} onKeyDownCapture={event => { if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', '+', '-'].includes(event.key) && !(event.target as HTMLElement).closest('input, select, textarea')) userMove(); }}
    onPointerDownCapture={event => { if ((event.target as Element).closest('.react-flow__minimap, .react-flow__controls')) userMove(); }}
    onDoubleClick={event => {
    if (props.editable && (event.target as HTMLElement).classList.contains('react-flow__pane')) openMenu(event.clientX, event.clientY);
  }} onDragOver={event => { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; }} onDrop={event => {
    event.preventDefault(); const type = event.dataTransfer.getData('application/ghost-node') as Node['type'];
    if (props.editable && NODE_TYPES.includes(type)) props.onAdd(type, api.screenToFlowPosition({ x: event.clientX, y: event.clientY }));
  }}>
    {!props.compact && <HauntedBackdrop quiet={!!plan.graph.nodes.length} />}
    <ReactFlow<AnyNode> nodes={flowNodes} edges={edges} nodeTypes={nodeTypes} edgeTypes={edgeTypes} colorMode="dark" onInit={setInstance} elevateNodesOnSelect={false}
      onNodesChange={changes => {
        setFlowNodes(nodes => applyNodeChanges(changes, nodes));
        const positions = changes.flatMap(change => change.type === 'position' && change.position && !change.dragging && isRealNode(change.id) ? [{ id: change.id, ...change.position }] : []);
        if (positions.length && props.editable && !display.derived) props.onMove(positions);
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
      onMoveStart={event => { if (event) userMove(); }}
      onNodeDragStart={userMove}
      onDelete={({ nodes, edges: removed }) => props.onDelete(nodes.filter(node => node.type === 'workflow').map(node => node.id), removed.filter(edge => !edge.id.startsWith('agg:')).map(edge => edge.id))}
      nodesDraggable={draggable} nodesConnectable={props.editable && !panMode} elementsSelectable={!panMode} edgesReconnectable={false} deleteKeyCode={props.editable && !panMode ? ['Backspace', 'Delete'] : null}
      minZoom={0.1} maxZoom={2.5} zoomOnDoubleClick={false} onlyRenderVisibleElements={running && flowNodes.length > 50}
      panOnDrag={panMode || !props.editable ? [0, 1] : [1]} panActivationKeyCode={props.editable ? 'Space' : null}
      selectionOnDrag={!panMode && props.editable} selectionKeyCode={panMode ? null : 'Shift'} multiSelectionKeyCode={['Control', 'Meta', 'Shift']}>
      <Background variant={BackgroundVariant.Dots} gap={22} size={1.3} color="color-mix(in srgb, var(--line-2) 22%, transparent)" />
      <Controls showInteractive={false} showFitView={false} onZoomIn={userMove} onZoomOut={userMove} position={props.compact ? 'bottom-right' : 'bottom-left'} orientation="horizontal" />
      {!props.compact && plan.graph.nodes.length > 0 && <MiniMap position="bottom-right" pannable zoomable nodeBorderRadius={6}
        nodeColor={node => `color-mix(in srgb, ${node.type === 'frame' || node.type === 'stage' ? 'var(--tone-neutral)' : TYPE_COLORS[(node.data as CardData).node.type]} 25%, transparent)`}
        nodeStrokeColor={node => node.type === 'frame' || node.type === 'stage' ? 'var(--line-2)' : TYPE_COLORS[(node.data as CardData).node.type]} nodeStrokeWidth={2} maskColor="color-mix(in srgb, var(--surface-0) 72%, transparent)" />}
    </ReactFlow>
    {!props.compact && <div className="canvas-tools" role="toolbar" aria-label={t.canvas.tools} title={t.canvas.navigation}>
      {props.editable && <>
        <button type="button" className={cls('icon-btn', !panMode && 'active')} aria-label={t.canvas.select} title={t.canvas.select} aria-pressed={!panMode} onClick={() => { setPanMode(false); setMenu(null); }}><MousePointer2 size={16} /></button>
        <button type="button" className={cls('icon-btn', panMode && 'active')} aria-label={t.canvas.pan} title={t.canvas.pan} aria-pressed={panMode} onClick={() => { setPanMode(true); setMenu(null); }}><Hand size={16} /></button>
      </>}
      <button type="button" className="canvas-zoom" aria-label={t.canvas.resetZoom} title={t.canvas.resetZoom} onClick={() => { userMove(); void api.zoomTo(1, { duration: motionDuration(!!props.reducedMotion, 0) }); }}>{Math.round(zoom * 100)}%</button>
      {props.editable && <button type="button" className="icon-btn" aria-label={t.sidebar.addNode} title={t.sidebar.addNode} onClick={() => { const bounds = shell.current!.getBoundingClientRect(); setPanMode(false); openMenu(bounds.left + bounds.width / 2, bounds.top + bounds.height / 2); }}><Plus size={17} /></button>}
    </div>}
    {menu && <div className="canvas-menu nodrag nopan" role="dialog" aria-label={menu.nodeId ? t.canvas.nodeMenu : t.sidebar.addNode} style={{ left: menu.left, top: menu.top }} onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); event.preventDefault(); setMenu(null); menuTrigger.current?.focus(); } }}>
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
      <button type="button" className="canvas-menu-fit" onClick={() => { placement.request('default'); setMenu(null); }}>{t.stage.fit}</button>
    </div>}
    {props.label && <div className={cls('pane-label', props.label.badge === 'B' && 'alt')}><span title={props.label.badge === 'B' ? t.compare.b : t.compare.a}>{props.label.badge === 'B' ? t.sidebar.secondBadge : t.sidebar.currentBadge}</span><b title={props.label.name} aria-label={props.label.name} tabIndex={0}>{props.label.name}</b><small className="read-only-chip">{t.studioUi.readOnly}</small>
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
