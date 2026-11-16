import type { Plan } from '../src/schemas';
import type { PlaybackState, SimulationEvent } from '../src/simulation/types';

// Unchanged reconstruction from f8371999e64d25c250699e5cd96f85eabb79bb32.
const stateField = (type: string): 'queued' | 'blocked' | 'holding' | 'serving' | null => ({ QUEUE_ENTER: 'queued', QUEUE_BLOCKED: 'blocked', HOLD_ENTER: 'holding', SERVICE_START: 'serving' }[type] as 'queued' | 'blocked' | 'holding' | 'serving' | undefined) ?? null;

function applyEvent(view: PlaybackState, event: SimulationEvent, plan: Plan) {
  if (!event.participantId || event.type === 'RUN_WARNING') return;
  const previous = view.visitors[event.participantId];
  const previousField = previous && stateField(previous.type);
  if (previousField && previous.nodeId && view.nodes[previous.nodeId]) {
    view.nodes[previous.nodeId][previousField] = view.nodes[previous.nodeId][previousField].filter(id => id !== event.participantId);
  }
  const nextField = stateField(event.type);
  if (nextField && event.nodeId) view.nodes[event.nodeId]?.[nextField].push(event.participantId);
  if (event.nodeId) {
    const type = plan.graph.nodes.find(node => node.id === event.nodeId)?.type;
    const passed = type === 'service' ? event.type === 'SERVICE_COMPLETE'
      : type === 'waiting_area' ? event.type === 'HOLD_RELEASE'
        : type === 'exit' ? event.type === 'VISITOR_COMPLETE' || event.type === 'VISITOR_LEAVE'
          : event.type === 'ROUTE_TRANSITION';
    if (passed) view.nodes[event.nodeId].completed++;
  }
  view.visitors[event.participantId] = event;
}

export function referencePlaybackAt(events: SimulationEvent[], plan: Plan, time: number): PlaybackState {
  const view: PlaybackState = { visitors: {}, nodes: Object.fromEntries(plan.graph.nodes.map(node => [node.id, { queued: [], blocked: [], holding: [], serving: [], completed: 0 }])) };
  for (const event of events) {
    if (event.time > time) break;
    applyEvent(view, event, plan);
  }
  return view;
}
