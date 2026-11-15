import type { Participant, Plan, Scenario } from '../schemas';
import { compareIds, milliseconds, resourceUnits } from './input';
import type { NodeMetrics, Outcome, PlaybackState, SimulationEvent, Statistics, VisitorMetrics } from './types';

const waitingTypes = new Set(['QUEUE_ENTER', 'QUEUE_BLOCKED', 'HOLD_ENTER']);
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

export function playbackAt(events: SimulationEvent[], plan: Plan, time: number): PlaybackState {
  const view: PlaybackState = { visitors: {}, nodes: Object.fromEntries(plan.graph.nodes.map(node => [node.id, { queued: [], blocked: [], holding: [], serving: [], completed: 0 }])) };
  for (const event of events) {
    if (event.time > time) break;
    applyEvent(view, event, plan);
  }
  return view;
}

export function calculateStatistics(population: Participant[], events: SimulationEvent[], plan: Plan, scenario: Scenario, until: number): Statistics {
  const included = events.filter(event => event.time <= until);
  const byPerson = new Map<string, SimulationEvent[]>();
  included.forEach(event => {
    if (!event.participantId || event.type === 'RUN_WARNING') return;
    const list = byPerson.get(event.participantId) ?? [];
    list.push(event); byPerson.set(event.participantId, list);
  });
  const visitors: VisitorMetrics[] = [...population].sort((a, b) => compareIds(a.id, b.id)).map(person => {
    const list = byPerson.get(person.id) ?? [];
    const ending = list.find(event => event.type === 'VISITOR_COMPLETE' || event.type === 'VISITOR_LEAVE');
    const outcome: Outcome = ending?.type === 'VISITOR_COMPLETE' ? 'completed' : ending?.details?.outcome as Outcome ?? (list.length ? 'unfinished' : 'not_arrived');
    const result: VisitorMetrics = { id: person.id, outcome, completedAt: ending?.type === 'VISITOR_COMPLETE' ? ending.time : null,
      waiting: 0, queueWaiting: 0, blockedWaiting: 0, holdWaiting: 0, nodeWaiting: {} };
    list.forEach((event, index) => {
      if (!waitingTypes.has(event.type)) return;
      const duration = Math.max(0, (list[index + 1]?.time ?? until) - event.time);
      result.waiting += duration;
      result.nodeWaiting[event.nodeId!] = (result.nodeWaiting[event.nodeId!] ?? 0) + duration;
      if (event.type === 'QUEUE_ENTER') result.queueWaiting += duration;
      if (event.type === 'QUEUE_BLOCKED') result.blockedWaiting += duration;
      if (event.type === 'HOLD_ENTER') result.holdWaiting += duration;
    });
    return result;
  });
  const metrics = new Map(plan.graph.nodes.filter(node => node.type !== 'subflow').map(node => [node.id, {
    id: node.id, visitors: 0, completedServices: 0, waiting: 0, averageWaiting: null, maxQueue: 0, queueSeconds: 0, bottleneckSeconds: 0,
  } as NodeMetrics]));
  const nodeVisitors = new Map([...metrics.keys()].map(id => [id, new Set<string>()]));
  const view = playbackAt([], plan, 0);
  let previousTime = 0;
  const integrate = (time: number) => {
    const duration = time - previousTime;
    for (const node of plan.graph.nodes) {
      if (node.type !== 'service' && node.type !== 'waiting_area') continue;
      const state = view.nodes[node.id];
      const current = metrics.get(node.id)!;
      current.queueSeconds += (state.queued.length + state.holding.length) * duration;
      if (node.type === 'service') {
        const open = !node.openWindows.length || node.openWindows.some(window => milliseconds(window.openAt) / 1000 <= previousTime && previousTime < milliseconds(window.closeAt) / 1000)
          || ((node.closePolicy?.queued?.kind ?? 'serve') === 'serve' && previousTime >= milliseconds(node.openWindows.at(-1)!.closeAt) / 1000 && state.queued.length + state.blocked.length > 0);
        if (open && state.queued.length + state.blocked.length >= (scenario.statistics?.bottleneckThreshold ?? 1)) current.bottleneckSeconds += duration;
      }
    }
    previousTime = time;
  };
  for (const [index, event] of included.entries()) {
    integrate(event.time);
    if (event.nodeId && event.participantId && event.type !== 'RUN_WARNING') nodeVisitors.get(event.nodeId)?.add(event.participantId);
    if (event.type === 'SERVICE_COMPLETE') metrics.get(event.nodeId!)!.completedServices++;
    applyEvent(view, event, plan);
    if (included[index + 1]?.time !== event.time) {
      for (const metric of metrics.values()) {
        const current = view.nodes[metric.id];
        metric.maxQueue = Math.max(metric.maxQueue, current.queued.length + current.holding.length);
      }
    }
  }
  integrate(until);
  for (const metric of metrics.values()) {
    metric.visitors = nodeVisitors.get(metric.id)!.size;
    metric.waiting = visitors.reduce((sum, visitor) => sum + (visitor.nodeWaiting[metric.id] ?? 0), 0);
    metric.averageWaiting = metric.visitors ? metric.waiting / metric.visitors : null;
  }
  const resources = resourceUnits(plan, scenario).map(unit => {
    const unitEvents = included.filter(event => event.resourceUnitIds?.includes(unit.id));
    const boundaries = new Set([0, until, ...unitEvents.map(event => event.time)]);
    unit.shifts.forEach(window => { boundaries.add(milliseconds(window.start) / 1000); boundaries.add(milliseconds(window.end) / 1000); });
    unit.assignment?.periods.forEach(period => { boundaries.add(milliseconds(period.from) / 1000); if (period.to !== undefined) boundaries.add(milliseconds(period.to) / 1000); });
    const points = [...boundaries].filter(time => time >= 0 && time <= until).sort((a, b) => a - b);
    const result = { id: unit.id, busy: 0, idle: 0, unavailable: 0, handover: 0, offShift: 0, unassigned: 0, overtime: 0, utilization: null as number | null };
    let busy = false;
    let state = unit.shifts.some(window => window.start <= 0 && 0 < window.end) ? 'available' : 'off_shift';
    let index = 0;
    for (let p = 0; p < points.length - 1; p++) {
      const time = points[p];
      while (index < unitEvents.length && unitEvents[index].time <= time) {
        const event = unitEvents[index++];
        if (event.type === 'SERVICE_START') busy = true;
        if (event.type === 'SERVICE_COMPLETE') busy = false;
        if (event.type === 'RESOURCE_CHANGE') state = String(event.details!.to);
      }
      const duration = points[p + 1] - time;
      const inShift = unit.shifts.some(window => milliseconds(window.start) / 1000 <= time && time < milliseconds(window.end) / 1000);
      if (busy) { result.busy += duration; if (!inShift) result.overtime += duration; }
      else if (state === 'off_shift') result.offShift += duration;
      else if (state === 'unavailable') result.unavailable += duration;
      else if (state === 'handover') result.handover += duration;
      else if (unit.assignment && !unit.assignment.periods.some(period => milliseconds(period.from) / 1000 <= time && (period.to === undefined || time < milliseconds(period.to) / 1000) && period.nodeIds.length > 0)) result.unassigned += duration;
      else result.idle += duration;
    }
    result.utilization = result.busy + result.idle ? result.busy / (result.busy + result.idle) : null;
    return result;
  });
  const outcomes: Record<Outcome, number> = { completed: 0, rejected: 0, dismissed: 0, diverted: 0, loop_limit: 0, unfinished: 0, not_arrived: 0 };
  visitors.forEach(visitor => outcomes[visitor.outcome]++);
  const waits = visitors.filter(visitor => visitor.outcome !== 'not_arrived').map(visitor => visitor.waiting).sort((a, b) => a - b);
  return { until, arrived: waits.length, outcomes, averageWaiting: waits.length ? waits.reduce((sum, wait) => sum + wait, 0) / waits.length : null,
    p90Waiting: waits.length ? waits[Math.ceil(waits.length * 0.9) - 1] : null, visitors, nodes: [...metrics.values()], resources };
}
