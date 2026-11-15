import { playbackAt } from '../simulation/metrics';
import { milliseconds, resourceUnits } from '../simulation/input';
import type { SimulationEvent, SimulationRun, Statistics, VisitorMetrics } from '../simulation/types';

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
