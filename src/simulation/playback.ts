import type { Plan } from '../schemas';
import type { PlaybackState, SimulationEvent } from './types';

const stateField = (type: string): 'queued' | 'blocked' | 'holding' | 'serving' | null => ({ QUEUE_ENTER: 'queued', QUEUE_BLOCKED: 'blocked', HOLD_ENTER: 'holding', SERVICE_START: 'serving' }[type] as 'queued' | 'blocked' | 'holding' | 'serving' | undefined) ?? null;
export const nodeTypesOf = (plan: Plan) => new Map(plan.graph.nodes.map(node => [node.id, node.type]));
type NodeTypes = ReturnType<typeof nodeTypesOf>;
function emptyState(nodeTypes: NodeTypes): PlaybackState {
  const nodes: PlaybackState['nodes'] = Object.create(null);
  for (const id of nodeTypes.keys()) nodes[id] = { queued: [], blocked: [], holding: [], serving: [], completed: 0 };
  return { visitors: Object.create(null), nodes };
}

export function applyEvent(view: PlaybackState, event: SimulationEvent, nodeTypes: ReadonlyMap<string, Plan['graph']['nodes'][number]['type']>) {
  if (!event.participantId || event.type === 'RUN_WARNING') return;
  const previous = view.visitors[event.participantId];
  const previousField = previous && stateField(previous.type);
  if (previousField && previous.nodeId && view.nodes[previous.nodeId]) {
    view.nodes[previous.nodeId][previousField] = view.nodes[previous.nodeId][previousField].filter(id => id !== event.participantId);
  }
  const nextField = stateField(event.type);
  if (nextField && event.nodeId) view.nodes[event.nodeId]?.[nextField].push(event.participantId);
  if (event.nodeId) {
    const type = nodeTypes.get(event.nodeId);
    const passed = type === 'service' ? event.type === 'SERVICE_COMPLETE'
      : type === 'waiting_area' ? event.type === 'HOLD_RELEASE'
        : type === 'exit' ? event.type === 'VISITOR_COMPLETE' || event.type === 'VISITOR_LEAVE'
          : event.type === 'ROUTE_TRANSITION';
    if (passed) view.nodes[event.nodeId].completed++;
  }
  view.visitors[event.participantId] = event;
}

export function playbackAt(events: SimulationEvent[], plan: Plan, time: number): PlaybackState {
  const nodeTypes = nodeTypesOf(plan);
  const view = emptyState(nodeTypes);
  for (const event of events) {
    if (event.time > time) break;
    applyEvent(view, event, nodeTypes);
  }
  return view;
}

export interface PlaybackOptions {
  checkpointInterval?: number;
  checkpointBudgetBytes?: number;
  maxCheckpoints?: number;
}
export type PlaybackLane = 'current' | 'trend';
interface Cursor { position: number; view: PlaybackState; latest: Map<string, number> }
interface Checkpoint { latest: Uint32Array; completed: Float64Array }

function snapshot(view: PlaybackState): PlaybackState {
  const nodes: PlaybackState['nodes'] = Object.create(null), visitors: PlaybackState['visitors'] = Object.create(null);
  for (const [id, node] of Object.entries(view.nodes)) nodes[id] = {
    ...node, queued: [...node.queued], blocked: [...node.blocked], holding: [...node.holding], serving: [...node.serving],
  };
  for (const [id, event] of Object.entries(view.visitors)) visitors[id] = {
    ...event,
    ...(event.resourceUnitIds ? { resourceUnitIds: [...event.resourceUnitIds] } : {}),
    ...(event.details ? { details: Object.fromEntries(Object.entries(event.details).map(([key, value]) => [key, Array.isArray(value) ? [...value] : value])) } : {}),
  };
  return { nodes, visitors };
}

/** Events are a time-ordered, immutable run log until update() replaces it. */
export function createPlaybackReader(events: SimulationEvent[], plan: Plan, options: PlaybackOptions = {}) {
  const interval = options.checkpointInterval ?? 2048;
  const budget = options.checkpointBudgetBytes ?? 4 * 1024 * 1024;
  const maxCheckpoints = options.maxCheckpoints ?? 32;
  if (!Number.isSafeInteger(interval) || interval < 1 || !Number.isSafeInteger(budget) || budget < 0
    || !Number.isSafeInteger(maxCheckpoints) || maxCheckpoints < 0) throw new RangeError('Invalid playback checkpoint options');
  let nodeTypes = nodeTypesOf(plan);
  const cursors = new Map<PlaybackLane, Cursor>();
  const checkpoints = new Map<number, Checkpoint>();
  let checkpointBytes = 0, appliedEvents = 0, checkpointRestores = 0;
  let disposed = false;
  const assertActive = () => { if (disposed) throw new Error('Playback reader is disposed'); };
  const fresh = (): Cursor => ({ position: 0, view: emptyState(nodeTypes), latest: new Map() });
  const reset = () => {
    cursors.clear(); checkpoints.clear(); checkpointBytes = 0; appliedEvents = 0; checkpointRestores = 0;
  };
  const save = (cursor: Cursor) => {
    if (!maxCheckpoints || checkpoints.has(cursor.position)) return;
    const bytes = cursor.latest.size * Uint32Array.BYTES_PER_ELEMENT + nodeTypes.size * Float64Array.BYTES_PER_ELEMENT;
    if (bytes > budget || !bytes) return;
    while (checkpointBytes + bytes > budget || checkpoints.size >= maxCheckpoints) {
      const [position, oldest] = checkpoints.entries().next().value!;
      checkpointBytes -= oldest.latest.byteLength + oldest.completed.byteLength;
      checkpoints.delete(position);
    }
    checkpoints.set(cursor.position, {
      latest: Uint32Array.from(cursor.latest.values()),
      completed: Float64Array.from(nodeTypes.keys(), id => cursor.view.nodes[id].completed),
    });
    checkpointBytes += bytes;
  };
  const restore = (position: number, checkpoint: Checkpoint): Cursor => {
    const cursor = fresh(); cursor.position = position;
    let nodeIndex = 0;
    for (const id of nodeTypes.keys()) cursor.view.nodes[id].completed = checkpoint.completed[nodeIndex++];
    for (const offset of checkpoint.latest) {
      const event = events[offset];
      cursor.latest.set(event.participantId!, offset);
      cursor.view.visitors[event.participantId!] = event;
    }
    // Queue order follows log position, including all events sharing a timestamp.
    for (const offset of checkpoint.latest.slice().sort()) {
      const event = events[offset], field = stateField(event.type);
      if (field && event.nodeId) cursor.view.nodes[event.nodeId]?.[field].push(event.participantId!);
    }
    checkpoints.delete(position); checkpoints.set(position, checkpoint);
    checkpointRestores++;
    return cursor;
  };
  return {
    at(time: number, lane: PlaybackLane = 'current'): PlaybackState {
      assertActive();
      let low = 0, high = events.length;
      while (low < high) {
        const middle = Math.floor((low + high) / 2);
        if (events[middle].time > time) high = middle; else low = middle + 1;
      }
      const target = low;
      let cursor = cursors.get(lane) ?? fresh();
      let best = cursor.position <= target ? cursor.position : 0;
      let saved: Checkpoint | undefined;
      for (const [position, checkpoint] of checkpoints) {
        if (position > best && position <= target) { best = position; saved = checkpoint; }
      }
      if (saved) cursor = restore(best, saved);
      else if (cursor.position > target) cursor = fresh();
      while (cursor.position < target) {
        const event = events[cursor.position];
        applyEvent(cursor.view, event, nodeTypes);
        if (event.participantId && event.type !== 'RUN_WARNING') cursor.latest.set(event.participantId, cursor.position);
        cursor.position++; appliedEvents++;
        if (cursor.position % interval === 0) save(cursor);
      }
      cursors.set(lane, cursor);
      return snapshot(cursor.view);
    },
    update(nextEvents: SimulationEvent[], nextPlan: Plan) {
      assertActive();
      reset(); events = nextEvents; nodeTypes = nodeTypesOf(nextPlan);
    },
    dispose() {
      reset(); events = []; nodeTypes.clear(); disposed = true;
    },
    diagnostics() {
      return { appliedEvents, checkpointRestores, checkpointBytes, checkpointCount: checkpoints.size, cursorCount: cursors.size, disposed };
    },
  };
}
