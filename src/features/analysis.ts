import type { Node, Plan, Scenario } from '../schemas';
import type { PlaybackState, SimulationEvent, SimulationRun, Statistics, VisitorMetrics } from '../simulation/types';
import { semanticKey } from '../simulation/input';

/* ---------- Visitors ---------- */

/** Readable name for a participant ID such as `main-stream:20` → `Main entrance #20`. */
export function visitorName(id: string, plan: Plan, scenario: Scenario): string {
  const split = id.lastIndexOf(':');
  if (split < 0) return id;
  const streamId = id.slice(0, split);
  const entrance = plan.graph.nodes.find(node => node.type === 'entrance' && node.arrivalStreamIds.includes(streamId));
  const stream = scenario.arrivalStreams.find(item => item.id === streamId);
  return `${entrance?.name ?? stream?.name ?? streamId} #${id.slice(split + 1)}`;
}

export type SegmentKind = 'queue' | 'blocked' | 'hold' | 'service' | 'move';
export interface Segment { kind: SegmentKind; start: number; end: number; nodeId?: string; open: boolean }
export interface Journey {
  id: string;
  arrival?: number;
  entranceId?: string;
  segments: Segment[];
  end?: { time: number; kind: 'complete' | 'leave'; nodeId?: string; outcome?: string };
  events: SimulationEvent[];
  until: number;
}

const SEGMENT_OF: Partial<Record<SimulationEvent['type'], SegmentKind>> = {
  QUEUE_ENTER: 'queue', QUEUE_BLOCKED: 'blocked', HOLD_ENTER: 'hold', SERVICE_START: 'service', ROUTE_TRANSITION: 'move',
};

export function journeyOf(run: SimulationRun, id: string): Journey {
  const events = run.events.filter(event => event.participantId === id && event.type !== 'RUN_WARNING');
  const until = run.coveredUntil;
  const segments: Segment[] = [];
  events.forEach((event, index) => {
    const kind = SEGMENT_OF[event.type];
    if (!kind) return;
    const next = events[index + 1];
    const end = next?.time ?? until;
    if (kind === 'move' && end - event.time < 1e-6) return;
    segments.push({ kind, start: event.time, end, nodeId: event.nodeId, open: !next });
  });
  const arrival = events.find(event => event.type === 'VISITOR_ARRIVAL');
  const ending = events.find(event => event.type === 'VISITOR_COMPLETE' || event.type === 'VISITOR_LEAVE');
  return {
    id, arrival: arrival?.time, entranceId: arrival?.nodeId, segments, events, until,
    end: ending ? { time: ending.time, kind: ending.type === 'VISITOR_COMPLETE' ? 'complete' : 'leave', nodeId: ending.nodeId, outcome: ending.details?.outcome as string | undefined } : undefined,
  };
}

export type VisitorStatus =
  | { kind: 'not_arrived' }
  | { kind: 'done' | 'left'; nodeId?: string; time: number }
  | { kind: SegmentKind; nodeId?: string; since: number }
  | { kind: 'moving'; nodeId?: string; since: number };

export function statusAt(journey: Journey, time: number): VisitorStatus {
  if (journey.arrival === undefined || time < journey.arrival) return { kind: 'not_arrived' };
  if (journey.end && time >= journey.end.time) return { kind: journey.end.kind === 'complete' ? 'done' : 'left', nodeId: journey.end.nodeId, time: journey.end.time };
  const segment = journey.segments.find(item => item.start <= time && (time < item.end || (item.open && time <= item.end)));
  if (segment) return { kind: segment.kind, nodeId: segment.nodeId, since: segment.start };
  const last = [...journey.events].reverse().find(event => event.time <= time);
  return { kind: 'moving', nodeId: last?.nodeId, since: last?.time ?? time };
}

export interface Station { nodeId: string; first: number; queue: number; service: number }

/** Time spent at each node, in order of first visit. Queue includes blocked and holding time. */
export function stationsOf(journey: Journey): Station[] {
  const result: Station[] = [];
  for (const segment of journey.segments) {
    if (!segment.nodeId || segment.kind === 'move') continue;
    let station = result.find(item => item.nodeId === segment.nodeId);
    if (!station) { station = { nodeId: segment.nodeId, first: segment.start, queue: 0, service: 0 }; result.push(station); }
    if (segment.kind === 'service') station.service += segment.end - segment.start;
    else station.queue += segment.end - segment.start;
  }
  return result;
}

/** Service nodes correspond across plans when they share a stage key; other nodes when they share an ID. */
export function sameStation(a: Plan, aId: string | undefined, b: Plan, bId: string | undefined): boolean {
  if (aId === bId) return true;
  const left = a.graph.nodes.find(node => node.id === aId), right = b.graph.nodes.find(node => node.id === bId);
  return left?.type === 'service' && right?.type === 'service' && left.stageKey === right.stageKey;
}

export interface Difference { time: number; a?: Segment; b?: Segment }

export function firstDifference(a: Journey, b: Journey, planA: Plan, planB: Plan): Difference | null {
  const left = a.segments.filter(item => item.kind !== 'move'), right = b.segments.filter(item => item.kind !== 'move');
  for (let index = 0; index < Math.max(left.length, right.length); index++) {
    const x = left[index], y = right[index];
    if (!x || !y || x.kind !== y.kind || !sameStation(planA, x.nodeId, planB, y.nodeId) || Math.abs(x.start - y.start) > 0.5 || Math.abs(x.end - y.end) > 0.5) {
      return { time: Math.min(x?.start ?? Infinity, y?.start ?? Infinity), a: x, b: y };
    }
  }
  if ((a.end?.kind ?? '') !== (b.end?.kind ?? '') || Math.abs((a.end?.time ?? 0) - (b.end?.time ?? 0)) > 0.5) return { time: Math.min(a.end?.time ?? Infinity, b.end?.time ?? Infinity) };
  return null;
}

/* ---------- Story picks ---------- */

export interface Pick { id: string; value: number }
export interface PickGroup { key: string; total: number; items: Pick[] }

const arrived = (stats: Statistics) => stats.visitors.filter(visitor => visitor.outcome !== 'not_arrived');

/** Ghosts worth following in a single rehearsal. */
export function rehearsePicks(run: SimulationRun, view: PlaybackState, time: number, size = 3): PickGroup[] {
  const stats = run.statistics;
  const groups: PickGroup[] = [];
  const queued = Object.values(view.nodes).flatMap(node => [...node.queued, ...node.blocked, ...node.holding])
    .map(id => ({ id, value: time - (view.visitors[id]?.time ?? time) })).sort((a, b) => b.value - a.value);
  groups.push({ key: 'queuedNow', total: queued.length, items: queued.slice(0, size) });
  if (stats) {
    const people = arrived(stats);
    const longest = [...people].sort((a, b) => b.waiting - a.waiting);
    groups.push({ key: 'longest', total: people.length, items: longest.slice(0, size).map(item => ({ id: item.id, value: item.waiting })) });
    const unfinished = longest.filter(item => item.outcome === 'unfinished');
    groups.push({ key: 'unfinished', total: unfinished.length, items: unfinished.slice(0, size).map(item => ({ id: item.id, value: item.waiting })) });
    const left = longest.filter(item => item.outcome !== 'unfinished' && item.outcome !== 'completed');
    groups.push({ key: 'left', total: left.length, items: left.slice(0, size).map(item => ({ id: item.id, value: item.waiting })) });
  }
  return groups.filter(group => group.total > 0);
}

interface Pair { id: string; a: VisitorMetrics; b: VisitorMetrics; delta: number }
function pairs(a: Statistics, b: Statistics): Pair[] {
  const right = new Map(b.visitors.map(visitor => [visitor.id, visitor]));
  return a.visitors.flatMap(visitor => {
    const other = right.get(visitor.id);
    if (!other || (visitor.outcome === 'not_arrived' && other.outcome === 'not_arrived')) return [];
    return [{ id: visitor.id, a: visitor, b: other, delta: other.waiting - visitor.waiting }];
  });
}

/** Ghosts whose two futures differ most. */
export function comparePicks(a: Statistics, b: Statistics, size = 3): PickGroup[] {
  const all = pairs(a, b);
  const less = all.filter(item => item.delta < -THRESHOLD).sort((x, y) => x.delta - y.delta);
  const more = all.filter(item => item.delta > THRESHOLD).sort((x, y) => y.delta - x.delta);
  const rescued = all.filter(item => item.a.outcome !== 'completed' && item.b.outcome === 'completed').sort((x, y) => x.delta - y.delta);
  const lost = all.filter(item => item.a.outcome === 'completed' && item.b.outcome !== 'completed').sort((x, y) => y.delta - x.delta);
  const group = (key: string, items: Pair[], value: (item: Pair) => number) => ({ key, total: items.length, items: items.slice(0, size).map(item => ({ id: item.id, value: value(item) })) });
  return [
    group('rescued', rescued, item => item.b.completedAt ?? 0), group('less', less, item => item.delta),
    group('more', more, item => item.delta), group('lost', lost, item => item.a.completedAt ?? 0),
  ].filter(item => item.total > 0);
}

/** The ghost to show first in Two Futures: finished only in B with the largest saving, else the largest change. */
export function featuredGhost(a: Statistics, b: Statistics): string | undefined {
  const all = pairs(a, b);
  const rescued = all.filter(item => item.a.outcome !== 'completed' && item.b.outcome === 'completed').sort((x, y) => x.delta - y.delta);
  return rescued[0]?.id ?? [...all].sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta))[0]?.id;
}

/* ---------- Live playback ---------- */

export interface LiveSummary { inFlow: number; waiting: number; serving: number; completed: number; left: number; exits: Record<string, number> }

export function liveSummary(view: PlaybackState): LiveSummary {
  const summary: LiveSummary = { inFlow: 0, waiting: 0, serving: 0, completed: 0, left: 0, exits: {} };
  for (const event of Object.values(view.visitors)) {
    if (event.type === 'VISITOR_COMPLETE') summary.completed++;
    else if (event.type === 'VISITOR_LEAVE') summary.left++;
    else { summary.inFlow++; continue; }
    if (event.nodeId) summary.exits[event.nodeId] = (summary.exits[event.nodeId] ?? 0) + 1;
  }
  for (const node of Object.values(view.nodes)) { summary.waiting += node.queued.length + node.holding.length + node.blocked.length; summary.serving += node.serving.length; }
  return summary;
}

export const waitingAt = (view: PlaybackState, id: string) => { const node = view.nodes[id]; return node ? node.queued.length + node.holding.length + node.blocked.length : 0; };

export interface KeyEvent { time: number; kind: 'queue' | 'blocked' | 'close' | 'open' | 'resource' | 'leave' | 'first-done' | 'peak'; nodeId?: string; resourceId?: string; value?: number; to?: string; participantId?: string }

const WAITING = new Set(['QUEUE_ENTER', 'QUEUE_BLOCKED', 'HOLD_ENTER']);
const QUEUE_STEPS = [10, 50];

/** Moments worth marking on the timeline, derived from recorded events only. */
export function keyEvents(run: SimulationRun): KeyEvent[] {
  const result: KeyEvent[] = [];
  const waitingAtNode = new Map<string, number>();
  const where = new Map<string, string>();
  const crossed = new Map<string, number>();
  const blocked = new Set<string>();
  let total = 0, peak = 0, peakTime = 0, firstDone = false, firstLeave = false;
  for (const event of run.events) {
    if (event.type === 'NODE_SCHEDULE_CHANGE') result.push({ time: event.time, kind: event.details?.direction === 'open' ? 'open' : 'close', nodeId: event.nodeId });
    if (event.type === 'RESOURCE_CHANGE' && event.details?.to !== 'available') result.push({ time: event.time, kind: 'resource', resourceId: event.resourceUnitIds?.[0], to: String(event.details?.to ?? '') });
    if (!event.participantId || event.type === 'RUN_WARNING') continue;
    const previous = where.get(event.participantId);
    if (previous) { waitingAtNode.set(previous, waitingAtNode.get(previous)! - 1); total--; where.delete(event.participantId); }
    if (WAITING.has(event.type) && event.nodeId) {
      const count = (waitingAtNode.get(event.nodeId) ?? 0) + 1;
      waitingAtNode.set(event.nodeId, count); where.set(event.participantId, event.nodeId); total++;
      const step = QUEUE_STEPS.filter(value => count >= value).at(-1);
      if (step && (crossed.get(event.nodeId) ?? 0) < step) { crossed.set(event.nodeId, step); result.push({ time: event.time, kind: 'queue', nodeId: event.nodeId, value: step }); }
      if (total > peak) { peak = total; peakTime = event.time; }
    }
    if (event.type === 'QUEUE_BLOCKED' && event.nodeId && !blocked.has(event.nodeId)) { blocked.add(event.nodeId); result.push({ time: event.time, kind: 'blocked', nodeId: event.nodeId }); }
    if (event.type === 'VISITOR_COMPLETE' && !firstDone) { firstDone = true; result.push({ time: event.time, kind: 'first-done', nodeId: event.nodeId, participantId: event.participantId }); }
    if (event.type === 'VISITOR_LEAVE' && !firstLeave) { firstLeave = true; result.push({ time: event.time, kind: 'leave', nodeId: event.nodeId, participantId: event.participantId }); }
  }
  if (peak > 0) result.push({ time: peakTime, kind: 'peak', value: peak });
  return result.sort((a, b) => a.time - b.time);
}

/* ---------- Comparison report ---------- */

/** Wait changes smaller than this (seconds) count as unchanged. */
export const THRESHOLD = 60;

export interface Affected { total: number; better: number; worse: number; same: number; rescued: number; lost: number; bins: number[] }
/** Upper bounds (minutes) of the wait-change bins; the last bin is open-ended. */
export const DELTA_BINS = [-10, -5, -1, 1, 5, 10];

export function affected(a: Statistics, b: Statistics): Affected {
  const all = pairs(a, b);
  const bins = Array(DELTA_BINS.length + 1).fill(0) as number[];
  for (const item of all) {
    const minutes = item.delta / 60;
    const index = DELTA_BINS.findIndex(bound => minutes < bound);
    bins[index < 0 ? DELTA_BINS.length : index]++;
  }
  const better = all.filter(item => item.delta < -THRESHOLD).length, worse = all.filter(item => item.delta > THRESHOLD).length;
  return {
    total: all.length, better, worse, same: all.length - better - worse, bins,
    rescued: all.filter(item => item.a.outcome !== 'completed' && item.b.outcome === 'completed').length,
    lost: all.filter(item => item.a.outcome === 'completed' && item.b.outcome !== 'completed').length,
  };
}

export interface StationRow { key: string; a: string[]; b: string[]; waitA: number; waitB: number; peakA: number; peakB: number }

/** Total waiting per station. Parallel service nodes with one stage key count as one station. */
export function stationWaits(planA: Plan, a: Statistics, planB: Plan, b: Statistics): StationRow[] {
  const keyOf = (plan: Plan, id: string) => { const node = plan.graph.nodes.find(item => item.id === id); return node?.type === 'service' ? `stage:${node.stageKey}` : `node:${id}`; };
  const rows = new Map<string, StationRow>();
  const add = (plan: Plan, stats: Statistics, side: 'a' | 'b') => stats.nodes.forEach(node => {
    const key = keyOf(plan, node.id);
    const row = rows.get(key) ?? { key, a: [], b: [], waitA: 0, waitB: 0, peakA: 0, peakB: 0 };
    row[side].push(node.id);
    if (side === 'a') { row.waitA += node.waiting; row.peakA = Math.max(row.peakA, node.maxQueue); }
    else { row.waitB += node.waiting; row.peakB = Math.max(row.peakB, node.maxQueue); }
    rows.set(key, row);
  });
  add(planA, a, 'a'); add(planB, b, 'b');
  return [...rows.values()].filter(row => row.waitA > 0 || row.waitB > 0).sort((x, y) => Math.abs(y.waitB - y.waitA) - Math.abs(x.waitB - x.waitA));
}

export const totalWait = (stats: Statistics) => arrived(stats).reduce((sum, visitor) => sum + visitor.waiting, 0);

const overlap = (windows: { start: number; end: number }[], until: number) => windows.reduce((sum, window) => sum + Math.max(0, Math.min(window.end, until) - Math.max(0, window.start)), 0);

export interface Cost {
  staff: [number, number]; staffHours: [number, number]; deviceHours: [number, number]; overtime: [number, number];
  devices: { id: string; name: string; a: number; b: number }[];
  utilization: { id: string; a: number | null; b: number | null }[];
}

/** Resource cost inside the observation window (staffed and device time from shifts). */
export function costOf(planA: Plan, planB: Plan, scenario: Scenario, a: Statistics, b: Statistics): Cost {
  const until = scenario.observationCutoff;
  const staffHours = (plan: Plan) => plan.staff.reduce((sum, staff) => sum + overlap(staff.shifts, until), 0) / 3600;
  const deviceHours = (plan: Plan) => plan.deviceTypes.reduce((sum, device) => sum + device.quantity * overlap(device.shifts, until), 0) / 3600;
  const ids = [...new Set([...planA.deviceTypes, ...planB.deviceTypes].map(device => device.id))];
  const units = [...new Set([...a.resources, ...b.resources].map(item => item.id))];
  return {
    staff: [planA.staff.length, planB.staff.length], staffHours: [staffHours(planA), staffHours(planB)], deviceHours: [deviceHours(planA), deviceHours(planB)],
    overtime: [a.resources.reduce((sum, item) => sum + item.overtime, 0), b.resources.reduce((sum, item) => sum + item.overtime, 0)],
    devices: ids.map(id => {
      const left = planA.deviceTypes.find(device => device.id === id), right = planB.deviceTypes.find(device => device.id === id);
      return { id, name: right?.name ?? left?.name ?? id, a: left?.quantity ?? 0, b: right?.quantity ?? 0 };
    }),
    utilization: units.map(id => ({ id, a: a.resources.find(item => item.id === id)?.utilization ?? null, b: b.resources.find(item => item.id === id)?.utilization ?? null })),
  };
}

export interface ChangeItem {
  kind: 'node' | 'edge' | 'staff' | 'device' | 'assignment';
  change: 'added' | 'removed' | 'modified';
  id: string;
  /** Nodes to locate on the canvases. */
  nodeIds: string[];
  /** Changed top-level fields, for modified items. */
  fields: string[];
  before?: unknown; after?: unknown;
  /** For posts: nodes the resource may serve only in B, or only in A. */
  gained?: string[]; dropped?: string[];
}

const DISPLAY_FIELDS = new Set(['id', 'name', 'layout', 'description', 'notes', 'provenance']);

function changedFields(left: object, right: object): string[] {
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
  return [...keys].filter(key => !DISPLAY_FIELDS.has(key) && semanticKey((left as Record<string, unknown>)[key]) !== semanticKey((right as Record<string, unknown>)[key]));
}

/** Arrangement differences between two plans, ordered as process, resources, posts, routes. */
export function planChanges(a: Plan, b: Plan): ChangeItem[] {
  const result: ChangeItem[] = [];
  const nodeIds = new Set([...a.graph.nodes, ...b.graph.nodes].map(node => node.id));
  const edgeIds = new Set([...a.graph.edges, ...b.graph.edges].map(edge => edge.id));
  const edgeAdded = new Set([...edgeIds].filter(id => !a.graph.edges.some(edge => edge.id === id)));
  const edgeRemoved = new Set([...edgeIds].filter(id => !b.graph.edges.some(edge => edge.id === id)));
  const nodes: ChangeItem[] = [], modified: ChangeItem[] = [];
  for (const id of nodeIds) {
    const left = a.graph.nodes.find(node => node.id === id), right = b.graph.nodes.find(node => node.id === id);
    if ((left ?? right)!.type === 'subflow') continue;
    if (!left || !right) { nodes.push({ kind: 'node', change: left ? 'removed' : 'added', id, nodeIds: [id], fields: [], before: left, after: right }); continue; }
    // Subflows only group nodes for display and are flattened before simulation.
    if (left.type === 'subflow' || right.type === 'subflow') continue;
    let fields = changedFields(left, right);
    // A merge priority edit that only follows added or removed routes is not a separate decision.
    if (left.type === 'merge' && right.type === 'merge' && fields.length === 1 && fields[0] === 'incomingPriority') {
      const kept = (list: string[]) => list.filter(edge => !edgeAdded.has(edge) && !edgeRemoved.has(edge));
      if (semanticKey(kept(left.incomingPriority)) === semanticKey(kept(right.incomingPriority))) fields = [];
    }
    if (fields.length) modified.push({ kind: 'node', change: 'modified', id, nodeIds: [id], fields, before: left, after: right });
  }
  result.push(...nodes, ...modified);
  const pairsOf = <T extends { id: string }>(kind: 'staff' | 'device', left: T[], right: T[], nodesOf: (item: T) => string[]) => {
    for (const id of new Set([...left, ...right].map(item => item.id))) {
      const x = left.find(item => item.id === id), y = right.find(item => item.id === id);
      if (!x || !y) result.push({ kind, change: x ? 'removed' : 'added', id, nodeIds: nodesOf((x ?? y)!), fields: [], before: x, after: y });
      else { const fields = changedFields(x, y); if (fields.length) result.push({ kind, change: 'modified', id, nodeIds: nodesOf(y), fields, before: x, after: y }); }
    }
  };
  const servedBy = (plan: Plan, test: (node: Extract<Node, { type: 'service' }>) => boolean) => plan.graph.nodes.flatMap(node => node.type === 'service' && test(node) ? [node.id] : []);
  pairsOf('device', a.deviceTypes, b.deviceTypes, device => servedBy(b, node => node.requirements.some(item => item.kind === 'device' && item.deviceTypeId === device.id)));
  pairsOf('staff', a.staff, b.staff, staff => servedBy(b, node => node.requirements.some(item => item.kind === 'staff' && staff.skillIds.includes(item.skillId))));
  for (const id of new Set([...a.assignments, ...b.assignments].map(item => item.resourceUnitId))) {
    const x = a.assignments.find(item => item.resourceUnitId === id), y = b.assignments.find(item => item.resourceUnitId === id);
    if (semanticKey(x) === semanticKey(y)) continue;
    const posts = (item?: Plan['assignments'][number]) => new Set(item?.periods.flatMap(period => period.nodeIds) ?? []);
    const before = posts(x), after = posts(y);
    result.push({ kind: 'assignment', change: !x ? 'added' : !y ? 'removed' : 'modified', id, fields: [], before: x, after: y,
      nodeIds: [...new Set([...before, ...after])], gained: [...after].filter(node => !before.has(node)), dropped: [...before].filter(node => !after.has(node)) });
  }
  for (const id of edgeIds) {
    const x = a.graph.edges.find(edge => edge.id === id), y = b.graph.edges.find(edge => edge.id === id);
    if (semanticKey(x) === semanticKey(y)) continue;
    const edge = (y ?? x)!;
    result.push({ kind: 'edge', change: !x ? 'added' : !y ? 'removed' : 'modified', id, nodeIds: [edge.source, edge.target], fields: x && y ? changedFields(x, y) : [], before: x, after: y });
  }
  return result;
}
