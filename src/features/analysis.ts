import { playbackAt } from '../simulation/metrics';
import type { Node, Plan, Scenario } from '../schemas';
import type { PlaybackState, SimulationEvent, SimulationRun, Statistics, VisitorMetrics } from '../simulation/types';
import { milliseconds, resourceUnits, semanticKey } from '../simulation/input';

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

/** A journey through an explicit observation boundary; omitting it keeps the full recording. */
export function journeyOf(run: SimulationRun, id: string, until = run.coveredUntil): Journey {
  until = Math.max(0, Math.min(until, run.coveredUntil));
  const events = run.events.filter(event => event.time <= until && event.participantId === id && event.type !== 'RUN_WARNING');
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

/** First differing observable state, after all events at the same instant have settled. */
export function firstDifference(a: Journey, b: Journey, planA: Plan, planB: Plan): Difference | null {
  const kind = (event?: SimulationEvent) => !event ? 'not_arrived' : event.type === 'VISITOR_COMPLETE' ? 'done'
    : event.type === 'VISITOR_LEAVE' ? 'left' : SEGMENT_OF[event.type] ?? 'moving';
  const equal = (left?: SimulationEvent, right?: SimulationEvent) => {
    if (kind(left) !== kind(right) || !sameStation(planA, left?.nodeId, planB, right?.nodeId)) return false;
    if (left?.type === 'VISITOR_LEAVE' && right?.type === 'VISITOR_LEAVE') return left.details?.outcome === right.details?.outcome;
    if (left?.type === 'ROUTE_TRANSITION' && right?.type === 'ROUTE_TRANSITION') {
      const targetA = planA.graph.edges.find(edge => edge.id === left.edgeId)?.target;
      const targetB = planB.graph.edges.find(edge => edge.id === right.edgeId)?.target;
      return sameStation(planA, targetA, planB, targetB);
    }
    return true;
  };
  const until = Math.min(a.until, b.until);
  let ai = 0, bi = 0;
  let left: SimulationEvent | undefined, right: SimulationEvent | undefined;
  while (ai < a.events.length || bi < b.events.length) {
    const time = Math.min(a.events[ai]?.time ?? Infinity, b.events[bi]?.time ?? Infinity);
    if (time > until) break;
    while (a.events[ai]?.time === time) left = a.events[ai++];
    while (b.events[bi]?.time === time) right = b.events[bi++];
    if (!equal(left, right)) {
      const active = (journey: Journey) => journey.segments.find(segment => segment.start <= time && (time < segment.end || (segment.open && time === segment.end)));
      return { time, a: active(a), b: active(b) };
    }
  }
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

export interface VisitorPair { id: string; a: VisitorMetrics; b: VisitorMetrics; delta: number }
export type AffectedFilter = 'less' | 'more' | 'same' | 'rescued' | 'lost';

function pairs(a: Statistics, b: Statistics): VisitorPair[] {
  const right = new Map(b.visitors.map(visitor => [visitor.id, visitor]));
  return a.visitors.flatMap(visitor => {
    const other = right.get(visitor.id);
    if (!other || (visitor.outcome === 'not_arrived' && other.outcome === 'not_arrived')) return [];
    return [{ id: visitor.id, a: visitor, b: other, delta: other.waiting - visitor.waiting }];
  });
}

const waitChange = (delta: number): 'less' | 'more' | 'same' => delta <= -THRESHOLD ? 'less' : delta >= THRESHOLD ? 'more' : 'same';
const isAffected = (item: VisitorPair, filter: AffectedFilter) => filter === 'rescued'
  ? item.a.outcome !== 'completed' && item.b.outcome === 'completed'
  : filter === 'lost' ? item.a.outcome === 'completed' && item.b.outcome !== 'completed' : waitChange(item.delta) === filter;

/** All matching guests, with the same one-minute boundary used by the report and story picks. */
export function affectedVisitors(a: Statistics, b: Statistics, filter?: AffectedFilter): VisitorPair[] {
  const all = pairs(a, b);
  if (!filter) return all;
  return all.filter(item => isAffected(item, filter)).sort((x, y) => filter === 'more' || filter === 'lost' ? y.delta - x.delta
    : filter === 'same' ? Math.abs(x.delta) - Math.abs(y.delta) : x.delta - y.delta);
}

/** Ghosts whose two futures differ most. */
export function comparePicks(a: Statistics, b: Statistics, size = 3): PickGroup[] {
  const all = pairs(a, b);
  const less = all.filter(item => isAffected(item, 'less')).sort((x, y) => x.delta - y.delta);
  const more = all.filter(item => isAffected(item, 'more')).sort((x, y) => y.delta - x.delta);
  const rescued = all.filter(item => isAffected(item, 'rescued')).sort((x, y) => x.delta - y.delta);
  const lost = all.filter(item => isAffected(item, 'lost')).sort((x, y) => y.delta - x.delta);
  const group = (key: string, items: VisitorPair[], value: (item: VisitorPair) => number) => ({ key, total: items.length, items: items.slice(0, size).map(item => ({ id: item.id, value: value(item) })) });
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

/** Linear event sweep. Observe counts only after every transition at a timestamp is applied. */
function scanWaiting(events: SimulationEvent[], until: number, keyOf: (nodeId: string) => string,
  settled: (time: number, counts: ReadonlyMap<string, number>, changed: ReadonlySet<string>, total: number) => void,
  onEvent?: (event: SimulationEvent) => void) {
  const counts = new Map<string, number>();
  const where = new Map<string, string>();
  let total = 0, index = 0;
  while (index < events.length && events[index].time <= until) {
    const time = events[index].time;
    const changed = new Set<string>();
    do {
      const event = events[index++];
      onEvent?.(event);
      if (!event.participantId || event.type === 'RUN_WARNING') continue;
      const previous = where.get(event.participantId);
      if (previous !== undefined) {
        counts.set(previous, counts.get(previous)! - 1); changed.add(previous); total--; where.delete(event.participantId);
      }
      if (WAITING.has(event.type) && event.nodeId) {
        const key = keyOf(event.nodeId);
        counts.set(key, (counts.get(key) ?? 0) + 1); changed.add(key); total++; where.set(event.participantId, key);
      }
    } while (events[index]?.time === time);
    settled(time, counts, changed, total);
  }
}

/** Moments worth marking on the timeline, derived from recorded events only. */
export function keyEvents(run: SimulationRun): KeyEvent[] {
  const result: KeyEvent[] = [];
  const crossed = new Map<string, number>();
  const blocked = new Set<string>();
  let peak = 0, peakTime = 0, firstDone = false, firstLeave = false;
  scanWaiting(run.events, run.coveredUntil, id => id, (time, counts, changed, total) => {
    for (const nodeId of changed) {
      const count = counts.get(nodeId) ?? 0;
      const step = QUEUE_STEPS.filter(value => count >= value).at(-1);
      if (step && (crossed.get(nodeId) ?? 0) < step) { crossed.set(nodeId, step); result.push({ time, kind: 'queue', nodeId, value: step }); }
    }
    if (total > peak) { peak = total; peakTime = time; }
  }, event => {
    if (event.type === 'NODE_SCHEDULE_CHANGE') result.push({ time: event.time, kind: event.details?.direction === 'open' ? 'open' : 'close', nodeId: event.nodeId });
    if (event.type === 'RESOURCE_CHANGE' && event.details?.to !== 'available') result.push({ time: event.time, kind: 'resource', resourceId: event.resourceUnitIds?.[0], to: String(event.details?.to ?? '') });
    if (!event.participantId || event.type === 'RUN_WARNING') return;
    if (event.type === 'QUEUE_BLOCKED' && event.nodeId && !blocked.has(event.nodeId)) { blocked.add(event.nodeId); result.push({ time: event.time, kind: 'blocked', nodeId: event.nodeId }); }
    if (event.type === 'VISITOR_COMPLETE' && !firstDone) { firstDone = true; result.push({ time: event.time, kind: 'first-done', nodeId: event.nodeId, participantId: event.participantId }); }
    if (event.type === 'VISITOR_LEAVE' && !firstLeave) { firstLeave = true; result.push({ time: event.time, kind: 'leave', nodeId: event.nodeId, participantId: event.participantId }); }
  });
  if (peak > 0) result.push({ time: peakTime, kind: 'peak', value: peak });
  return result.sort((a, b) => a.time - b.time);
}

/* ---------- Comparison report ---------- */

/** Wait changes of at least this many seconds count as changed. */
export const THRESHOLD = 60;

export interface Affected { total: number; better: number; worse: number; same: number; rescued: number; lost: number; bins: number[] }
/** Upper bounds (minutes) of the wait-change bins; the last bin is open-ended. */
export const DELTA_BINS = [-10, -5, -1, 1, 5, 10];

export function affected(a: Statistics, b: Statistics): Affected {
  const all = pairs(a, b);
  const bins = Array(DELTA_BINS.length + 1).fill(0) as number[];
  for (const item of all) {
    const minutes = item.delta / 60;
    const index = DELTA_BINS.findIndex(bound => bound < 0 ? minutes <= bound : minutes < bound);
    bins[index < 0 ? DELTA_BINS.length : index]++;
  }
  const better = all.filter(item => isAffected(item, 'less')).length, worse = all.filter(item => isAffected(item, 'more')).length;
  return {
    total: all.length, better, worse, same: all.length - better - worse, bins,
    rescued: all.filter(item => isAffected(item, 'rescued')).length,
    lost: all.filter(item => isAffected(item, 'lost')).length,
  };
}

export interface StationRow { key: string; a: string[]; b: string[]; waitA: number; waitB: number; peakA: number; peakB: number }

/** Waiting totals and simultaneous peaks through stats.until; parallel lanes form one station. */
export function stationWaits(planA: Plan, a: Statistics, planB: Plan, b: Statistics, eventsA: SimulationEvent[], eventsB: SimulationEvent[]): StationRow[] {
  const rows = new Map<string, StationRow>();
  const add = (plan: Plan, stats: Statistics, events: SimulationEvent[], side: 'a' | 'b') => {
    const keys = new Map(plan.graph.nodes.map(node => [node.id, node.type === 'service' ? `stage:${node.stageKey}` : `node:${node.id}`]));
    const keyOf = (id: string) => keys.get(id) ?? `node:${id}`;
    stats.nodes.forEach(node => {
      const key = keyOf(node.id);
      const row = rows.get(key) ?? { key, a: [], b: [], waitA: 0, waitB: 0, peakA: 0, peakB: 0 };
      row[side].push(node.id);
      if (side === 'a') row.waitA += node.waiting;
      else row.waitB += node.waiting;
      rows.set(key, row);
    });
    scanWaiting(events, stats.until, keyOf, (_time, counts, changed) => {
      for (const key of changed) {
        const row = rows.get(key);
        if (!row) continue;
        const field = side === 'a' ? 'peakA' : 'peakB';
        row[field] = Math.max(row[field], counts.get(key) ?? 0);
      }
    });
  };
  add(planA, a, eventsA, 'a'); add(planB, b, eventsB, 'b');
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
export function costOf(planA: Plan, planB: Plan, scenario: Scenario, a: Statistics, b: Statistics, basis: ResultBasis = 'cutoff'): Cost {
  const until = (plan: Plan) => basis === 'cutoff' ? scenario.observationCutoff : plan === planA ? a.until : b.until;
  const staffHours = (plan: Plan) => plan.staff.reduce((sum, staff) => sum + overlap(staff.shifts, until(plan)), 0) / 3600;
  const deviceHours = (plan: Plan) => plan.deviceTypes.reduce((sum, device) => sum + device.quantity * overlap(device.shifts, until(plan)), 0) / 3600;
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

export type ResultBasis = 'cutoff' | 'completion';
export const statisticsAt = (run: SimulationRun | undefined, basis: ResultBasis): Statistics | null =>
  (basis === 'completion' ? run?.completion : run?.statistics) ?? null;

export interface VisitorPair { id: string; a: VisitorMetrics; b: VisitorMetrics; delta: number }
export function pairedVisitors(a: SimulationRun, b: SimulationRun, basis: ResultBasis): VisitorPair[] {
  if (a.status !== 'succeeded' || b.status !== 'succeeded' || a.scenarioKey !== b.scenarioKey || a.request.runMode !== b.request.runMode) return [];
  const left = statisticsAt(a, basis), right = statisticsAt(b, basis);
  if (!left || !right) return [];
  const visitors = new Map(right.visitors.map(visitor => [visitor.id, visitor]));
  return left.visitors.flatMap(visitor => {
    const match = visitors.get(visitor.id);
    return match ? [{ id: visitor.id, a: visitor, b: match, delta: Math.round((match.waiting - visitor.waiting) * 1000) / 1000 }] : [];
  });
}

export function nodeEvidence(run: SimulationRun, nodeId: string, basis: ResultBasis) {
  const stats = statisticsAt(run, basis);
  const node = run.request.plan.graph.nodes.find(item => item.id === nodeId);
  if (!stats || !node) return null;
  const waiting = new Map<string, SimulationEvent>();
  const boundaries = new Map<number, number>([[0, 0], [stats.until, 0]]);
  const addInterval = (start: number, end: number) => {
    boundaries.set(start, (boundaries.get(start) ?? 0) + 1);
    boundaries.set(end, (boundaries.get(end) ?? 0) - 1);
  };
  for (const event of run.events) {
    if (event.time > stats.until) break;
    if (!event.participantId || event.type === 'RUN_WARNING') continue;
    const previous = waiting.get(event.participantId);
    if (previous) { addInterval(previous.time, event.time); waiting.delete(event.participantId); }
    if (event.nodeId === nodeId && ['QUEUE_ENTER', 'QUEUE_BLOCKED', 'HOLD_ENTER'].includes(event.type)) waiting.set(event.participantId, event);
  }
  waiting.forEach(event => addInterval(event.time, stats.until));
  const points = [...boundaries].sort(([a], [b]) => a - b);
  let count = 0, peak = 0, from = 0, to = 0;
  points.forEach(([time, delta], index) => {
    count += delta;
    if (count > peak && points[index + 1]?.[0] > time) { peak = count; from = time; to = points[index + 1][0]; }
  });
  if (!peak) return null;
  const view = playbackAt(run.events, run.request.plan, from);
  const state = view.nodes[nodeId];
  const resources = resourceUnits(run.request.plan, run.request.scenario).filter(unit => node.type === 'service' && node.requirements.some(requirement =>
    requirement.kind === 'staff' ? unit.skillIds.includes(requirement.skillId) : unit.deviceTypeId === requirement.deviceTypeId)).map(unit => {
    let busyAt: string | undefined;
    let availability = unit.shifts.some(window => milliseconds(window.start) / 1000 <= from && from < milliseconds(window.end) / 1000) ? 'available' : 'off_shift';
    const records = run.events.filter(event => event.time <= from && event.resourceUnitIds?.includes(unit.id));
    records.forEach(event => {
      if (event.type === 'SERVICE_START') busyAt = event.nodeId;
      if (event.type === 'SERVICE_COMPLETE') busyAt = undefined;
      if (event.type === 'RESOURCE_CHANGE') availability = String(event.details?.to);
    });
    const period = unit.assignment?.periods.find(item => milliseconds(item.from) / 1000 <= from && (item.to === undefined || from < milliseconds(item.to) / 1000));
    const posted = !unit.assignment || !!period?.nodeIds.includes(nodeId);
    return { id: unit.id, busyAt, posted, state: busyAt ? 'busy' : availability !== 'available' ? availability : !posted ? 'unposted' : 'available', records };
  });
  return { node, from, to, queued: state.queued.length, blocked: state.blocked.length, holding: state.holding.length, serving: state.serving.length, resources,
    visitors: [...state.queued, ...state.blocked, ...state.holding],
    events: run.events.filter(event => event.time >= from && event.time <= to && (event.nodeId === nodeId || event.resourceUnitIds?.some(id => resources.some(unit => unit.id === id)))) };
}
