import { flattenSubflows, runRequestSchema, validateGraph, validateRunRequest } from '../schemas';
import type { Edge, Node, Participant, ResourceRequirement, RunRequest, ServiceNode } from '../schemas';
import { compareIds, generatePopulation, inputKey, keyedDraw, milliseconds as ms, MODEL_VERSION, populationSize, prepareSampler, resourceUnits, sample, scenarioKey } from './input';
import { calculateStatistics } from './metrics';
import type { EventType, Outcome, SimulationEvent, SimulationRun, Unit } from './types';

interface Task { time: number; rank: number; subject: string; order: number; id: string; serial: number; run: () => void }
class EventQueue {
  items: Task[] = [];
  before(a: Task, b: Task) {
    return a.time - b.time || a.rank - b.rank || compareIds(a.subject, b.subject) || a.order - b.order || compareIds(a.id, b.id) || a.serial - b.serial;
  }
  push(task: Task) {
    const items = this.items;
    items.push(task);
    let index = items.length - 1;
    while (index > 0) {
      const parent = (index - 1) >> 1;
      if (this.before(items[parent], task) <= 0) break;
      items[index] = items[parent]; index = parent;
    }
    items[index] = task;
  }
  pop(): Task {
    const first = this.items[0];
    const last = this.items.pop()!;
    if (this.items.length) {
      let index = 0;
      while (index * 2 + 1 < this.items.length) {
        let child = index * 2 + 1;
        if (child + 1 < this.items.length && this.before(this.items[child + 1], this.items[child]) < 0) child++;
        if (this.before(last, this.items[child]) <= 0) break;
        this.items[index] = this.items[child]; index = child;
      }
      this.items[index] = last;
    }
    return first;
  }
}
interface Visitor { person: Participant; steps: number; visits: Map<string, number>; draws: Map<string, number>; done: boolean; queuedAt: number; blockedAt: number }
interface RuntimeUnit extends Unit {
  busy: boolean; released: number; handoverEnd: number; delayedHandover: boolean; lastAssignmentStart: number;
  state: string; pendingReasons: Set<string>;
}
interface NodeState { queue: string[]; blocked: string[]; active: number; draining: boolean }
const abortLimit = Symbol('event_limit');
const inWindow = (time: number, window: { start: number; end: number }) => ms(window.start) <= time && time < ms(window.end);

export function simulate(request: RunRequest): SimulationRun {
  const issues = validateRunRequest(request);
  const valid = runRequestSchema.safeParse(request);
  if (valid.success) issues.push(...validateGraph(request.scenario, request.plan));
  const run: SimulationRun = {
    status: 'failed', modelVersion: MODEL_VERSION, inputKey: valid.success ? inputKey(request) : '',
    scenarioKey: valid.success ? scenarioKey(request.scenario) : '', request, population: [], events: [], coveredUntil: 0,
    statistics: null, completion: null, issues,
  };
  if (!valid.success || issues.some(issue => issue.severity === 'error')) return run;
  if (populationSize(request.scenario) > 10000) {
    issues.push({ code: 'prototype_population_limit', severity: 'error', message: '当前预览版每次最多运行 10,000 位参与者，请先缩小场景。', entityIds: [request.scenario.id], path: ['scenario', 'arrivalStreams'] });
    return run;
  }
  const { scenario } = request;
  const plan = flattenSubflows(request.plan);
  const nodes = [...plan.graph.nodes].sort((a, b) => compareIds(a.id, b.id));
  const serviceSamplers = new Map(nodes.filter((node): node is ServiceNode => node.type === 'service')
    .map(node => [node.id, prepareSampler(node.duration)]));
  const nodeMap = new Map(nodes.map(node => [node.id, node]));
  const out = new Map(nodes.map(node => [node.id, plan.graph.edges.filter(edge => edge.source === node.id)]));
  const state = new Map(nodes.map(node => [node.id, { queue: [], blocked: [], active: 0, draining: false } as NodeState]));
  run.population = generatePopulation(scenario);
  const visitors = new Map(run.population.map(person => [person.id, { person, steps: 0, visits: new Map(), draws: new Map(), done: false, queuedAt: 0, blockedAt: 0 } as Visitor]));
  const units: RuntimeUnit[] = resourceUnits(plan, scenario).map(unit => ({ ...unit, busy: false, released: Infinity, handoverEnd: 0,
    delayedHandover: false, lastAssignmentStart: -1, state: unit.shifts.some(window => inWindow(0, window)) ? 'available' : 'off_shift', pendingReasons: new Set() }));
  const queue = new EventQueue();
  const scheduled = new Set<string>();
  let now = 0;
  let serial = 0;
  let finished = 0;
  const cutoff = ms(scenario.observationCutoff);
  const limit = request.runMode === 'cutoff' ? cutoff : ms(scenario.horizon);
  const schedule = (time: number, rank: number, subject: string, action: () => void, order = 0, id = '') => {
    if (time > limit) return;
    queue.push({ time, rank, subject, order, id, serial: serial++, run: action });
  };
  const emit = (type: EventType, participantId?: string, nodeId?: string, extra: Partial<SimulationEvent> = {}) => {
    if (run.events.length >= (request.maxEvents ?? 1000000)) throw abortLimit;
    const event: SimulationEvent = { seq: run.events.length, time: now / 1000, type,
      ...(participantId ? { participantId } : {}), ...(nodeId ? { nodeId } : {}), ...extra };
    run.events.push(event);
    return event.seq;
  };
  const draw = (visitor: Visitor, purpose: string, key: string) => {
    const compound = `${purpose}:${key}`;
    const visit = (visitor.draws.get(compound) ?? 0) + 1;
    visitor.draws.set(compound, visit);
    return keyedDraw(scenario.seed, purpose, visitor.person.id, key, visit);
  };
  const periodAt = (unit: RuntimeUnit) => unit.assignment?.periods.find(period => ms(period.from) <= now && (period.to === undefined || now < ms(period.to)));
  const startHandover = (unit: RuntimeUnit, seconds: number) => {
    if (ms(seconds) === 0) return;
    unit.handoverEnd = Math.max(unit.handoverEnd, now + ms(seconds));
    unit.pendingReasons.add('handover_start');
    scheduleUnit(unit, unit.handoverEnd, 'handover_end');
  };
  function scheduleUnit(unit: RuntimeUnit, time: number, reason = '') {
    const key = `resource:${unit.id}:${time}`;
    if (reason) {
      const bucket = resourceReasons.get(key) ?? new Set<string>();
      bucket.add(reason); resourceReasons.set(key, bucket);
    }
    if (scheduled.has(key)) return;
    scheduled.add(key);
    schedule(time, 2, unit.id, () => {
      scheduled.delete(key);
      for (const item of resourceReasons.get(key) ?? []) unit.pendingReasons.add(item);
      resourceReasons.delete(key);
      const period = periodAt(unit);
      if (period && ms(period.from) === now && unit.lastAssignmentStart !== now) {
        unit.lastAssignmentStart = now;
        if (unit.busy) unit.delayedHandover = true;
        else startHandover(unit, period.handoverSec ?? 0);
      }
      if (unit.busy) return;
      if (unit.delayedHandover) {
        unit.delayedHandover = false;
        if (period) startHandover(unit, period.handoverSec ?? 0);
      }
      const next = !unit.shifts.some(window => inWindow(now, window)) ? 'off_shift'
        : unit.unavailability.some(window => inWindow(now, window)) ? 'unavailable'
          : now < unit.handoverEnd ? 'handover' : 'available';
      if (next !== unit.state) {
        const reasons = ['shift_start', 'shift_end', 'unavailability_start', 'unavailability_end', 'handover_start', 'handover_end'].filter(item => unit.pendingReasons.has(item));
        emit('RESOURCE_CHANGE', undefined, undefined, { resourceUnitIds: [unit.id], details: { from: unit.state, to: next, reasons } });
        unit.state = next;
      }
      if (next === 'available' && unit.released === Infinity) unit.released = now;
      unit.pendingReasons.clear();
    });
  }
  const resourceReasons = new Map<string, Set<string>>();
  const isOpen = (node: ServiceNode) => !node.openWindows.length || node.openWindows.some(window => ms(window.openAt) <= now && now < ms(window.closeAt));
  const canStart = (node: ServiceNode) => isOpen(node) || state.get(node.id)!.draining;
  const finish = (visitor: Visitor, node: Node, outcome: Outcome, reason: string) => {
    if (outcome === 'completed') emit('VISITOR_COMPLETE', visitor.person.id, node.id);
    else emit('VISITOR_LEAVE', visitor.person.id, node.id, { details: { outcome, reason } });
    visitor.done = true; finished++;
  };
  const arriveLater = (visitor: Visitor, target: string, time: number, previousSeq: number, edge?: Edge) => {
    const node = nodeMap.get(target)!;
    const order = node.type === 'merge' ? (edge ? node.incomingPriority.indexOf(edge.id) : node.incomingPriority.length) : previousSeq;
    schedule(time, 4, target, () => arrive(visitor, node), order, node.type === 'merge' || node.type === 'entrance' ? visitor.person.id : '');
  };
  const route = (visitor: Visitor, node: Node, edge = out.get(node.id)![0], details?: SimulationEvent['details']) => {
    const u = draw(visitor, 'transfer', edge.id);
    const duration = edge.transferDuration ? ms(sample(edge.transferDuration, u)) : 0;
    const seq = emit('ROUTE_TRANSITION', visitor.person.id, node.id, { edgeId: edge.id, details: { ...details, arrivalAt: (now + duration) / 1000 } });
    arriveLater(visitor, edge.target, now + duration, seq, edge);
  };
  const redirect = (visitor: Visitor, node: Node, target: string, reason: string) => {
    const seq = emit('QUEUE_REROUTED', visitor.person.id, node.id, { details: { targetNodeId: target, reason } });
    arriveLater(visitor, target, now, seq);
  };
  const putInQueue = (visitor: Visitor, node: Node) => {
    const current = state.get(node.id)!;
    current.queue.push(visitor.person.id);
    visitor.queuedAt = now;
    emit(node.type === 'waiting_area' ? 'HOLD_ENTER' : 'QUEUE_ENTER', visitor.person.id, node.id);
    if (node.type === 'waiting_area') scheduleHold(node, node.release.kind === 'until_time' ? Math.max(now, ms(node.release.releaseAt)) : now);
  };
  const unblock = (node: Node) => {
    if (node.type !== 'service' && node.type !== 'waiting_area') return;
    const current = state.get(node.id)!;
    current.blocked.sort((a, b) => visitors.get(a)!.blockedAt - visitors.get(b)!.blockedAt || compareIds(a, b));
    while (current.blocked.length && current.queue.length < (node.queueCapacity ?? Infinity)) putInQueue(visitors.get(current.blocked.shift()!)!, node);
  };
  function scheduleHold(node: Extract<Node, { type: 'waiting_area' }>, time: number) {
    const key = `hold:${node.id}:${time}`;
    if (scheduled.has(key)) return;
    scheduled.add(key);
    schedule(time, 5, node.id, () => {
      scheduled.delete(key);
      const current = state.get(node.id)!;
      const release = (count: number, reason: string) => {
        for (let index = 0; index < count; index++) {
          const visitor = visitors.get(current.queue.shift()!)!;
          emit('HOLD_RELEASE', visitor.person.id, node.id, { details: { reason } });
          route(visitor, node); unblock(node);
        }
      };
      if (node.release.kind === 'until_time') {
        if (now >= ms(node.release.releaseAt)) while (current.queue.length) release(current.queue.length, 'until_time');
      } else {
        while (current.queue.length >= node.release.batchSize) release(node.release.batchSize, 'batch_full');
        if (current.queue.length && node.release.maxHoldSec !== undefined) {
          const due = visitors.get(current.queue[0])!.queuedAt + ms(node.release.maxHoldSec);
          if (now >= due) release(current.queue.length, 'max_hold');
          if (current.queue.length) scheduleHold(node, visitors.get(current.queue[0])!.queuedAt + ms(node.release.maxHoldSec));
        }
      }
    });
  }
  function arrive(visitor: Visitor, node: Node) {
    if (visitor.done) return;
    visitor.steps++;
    visitor.visits.set(node.id, (visitor.visits.get(node.id) ?? 0) + 1);
    if (visitor.steps > (request.maxSteps ?? 1000)) {
      finish(visitor, node, 'loop_limit', 'max_steps');
      emit('RUN_WARNING', visitor.person.id, node.id, { details: { code: 'max_steps_exceeded' } });
      issues.push({ code: 'max_steps_exceeded', severity: 'warning', message: '参与者达到最大流程步数', entityIds: [visitor.person.id, node.id], path: ['plan', 'graph', 'nodes'] });
      return;
    }
    if (node.type === 'entrance') { emit('VISITOR_ARRIVAL', visitor.person.id, node.id); route(visitor, node); return; }
    if (node.type === 'exit') { finish(visitor, node, node.countsAsCompleted === false ? 'diverted' : 'completed', 'exit_diverted'); return; }
    if (node.type === 'merge') { route(visitor, node); return; }
    if (node.type === 'decision') {
      const u = draw(visitor, 'route', node.decisionKey);
      let reason = node.routing.kind as string;
      let branchKey: string;
      if (node.loopGuard && visitor.visits.get(node.id)! >= node.loopGuard.maxVisits) {
        branchKey = node.loopGuard.exitBranchKey; reason = 'loop_guard';
      } else if (node.routing.kind === 'attribute') {
        branchKey = (node.routing.branches.find(branch => branch.condition?.values.includes(visitor.person.attributes[branch.condition.attributeId])) ?? node.routing.branches.find(branch => !branch.condition))!.branchKey;
      } else {
        let cumulative = 0;
        branchKey = (node.routing.branches.find(branch => (cumulative += branch.weight) > u) ?? node.routing.branches.filter(branch => branch.weight > 0).at(-1))!.branchKey;
      }
      route(visitor, node, out.get(node.id)!.find(edge => edge.branchKey === branchKey)!, { branchKey, reason, draw: reason === 'probability' ? u : null });
      return;
    }
    if (node.type !== 'service' && node.type !== 'waiting_area') return;
    if (node.type === 'service' && node.openWindows.length && now >= ms(node.openWindows.at(-1)!.closeAt)) {
      const late = node.closePolicy?.late;
      if (late?.kind === 'redirect') redirect(visitor, node, late.targetNodeId, 'late_redirect');
      else finish(visitor, node, 'rejected', 'late_arrival');
      return;
    }
    const current = state.get(node.id)!;
    const policy = node.fullPolicy ?? { kind: 'block' };
    if (current.queue.length >= (node.queueCapacity ?? Infinity) || (policy.kind === 'block' && current.blocked.length)) {
      if (policy.kind === 'reroute') redirect(visitor, node, policy.targetNodeId, 'queue_full');
      else if (policy.kind === 'reject') finish(visitor, node, 'rejected', 'queue_full');
      else { current.blocked.push(visitor.person.id); visitor.blockedAt = now; emit('QUEUE_BLOCKED', visitor.person.id, node.id); }
    } else putInQueue(visitor, node);
  }
  const matches = (unit: RuntimeUnit, requirement: ResourceRequirement) => requirement.kind === 'staff' ? unit.skillIds.includes(requirement.skillId) : unit.deviceTypeId === requirement.deviceTypeId;
  const matching = (slots: ResourceRequirement[], available: RuntimeUnit[]): boolean => {
    if (slots.length > available.length) return false;
    const owner = new Map<string, number>();
    const match = (index: number, seen: Set<string>): boolean => {
      for (const unit of available) {
        if (seen.has(unit.id) || !matches(unit, slots[index])) continue;
        seen.add(unit.id);
        const previous = owner.get(unit.id);
        if (previous === undefined || match(previous, seen)) { owner.set(unit.id, index); return true; }
      }
      return false;
    };
    return slots.every((_, index) => match(index, new Set()));
  };
  const acquire = (node: ServiceNode): RuntimeUnit[] | null => {
    let available = units.filter(unit => !unit.busy && unit.state === 'available' && (!unit.assignment || periodAt(unit)?.nodeIds.includes(node.id)))
      .sort((a, b) => a.released - b.released || compareIds(a.id, b.id));
    const count = node.requirements.reduce((sum, requirement) => sum + requirement.quantity, 0);
    if (count > available.length) return null;
    const slots = node.requirements.flatMap(requirement => Array.from({ length: requirement.quantity }, () => requirement));
    if (!matching(slots, available)) return null;
    const selected: RuntimeUnit[] = [];
    slots.forEach((requirement, index) => {
      const unit = available.find(candidate => matches(candidate, requirement) && matching(slots.slice(index + 1), available.filter(other => other !== candidate)))!;
      selected.push(unit); available = available.filter(other => other !== unit);
    });
    return selected;
  };
  const allocate = () => {
    while (true) {
      const candidates = nodes.filter((node): node is ServiceNode => node.type === 'service' && state.get(node.id)!.queue.length > 0 && canStart(node)
        && state.get(node.id)!.active < (node.maxConcurrent ?? Infinity)).sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0)
          || visitors.get(state.get(a.id)!.queue[0])!.queuedAt - visitors.get(state.get(b.id)!.queue[0])!.queuedAt || compareIds(a.id, b.id));
      let started = false;
      for (const node of candidates) {
        const selected = acquire(node);
        if (!selected) continue;
        const current = state.get(node.id)!;
        const visitor = visitors.get(current.queue.shift()!)!;
        const resourceUnitIds = selected.map(unit => unit.id);
        selected.forEach(unit => { unit.busy = true; }); current.active++;
        emit('SERVICE_START', visitor.person.id, node.id, { resourceUnitIds });
        unblock(node);
        if (!current.queue.length && !current.blocked.length) current.draining = false;
        const factors = scenario.assumptionOverrides.filter(override => override.kind === 'service_multiplier' && (!override.stageKey || override.stageKey === node.stageKey));
        const factor = factors.reduce((product, override) => product * (override.kind === 'service_multiplier' ? override.factor : 1), 1);
        const duration = ms(serviceSamplers.get(node.id)!(draw(visitor, 'service', node.stageKey)) * factor);
        schedule(now + duration, 1, visitor.person.id, () => {
          emit('SERVICE_COMPLETE', visitor.person.id, node.id, { resourceUnitIds });
          current.active--;
          selected.forEach(unit => { unit.busy = false; unit.released = now; scheduleUnit(unit, now); });
          route(visitor, node);
        });
        started = true; break;
      }
      if (!started) break;
    }
  };
  for (const unit of units) {
    scheduleUnit(unit, 0);
    unit.shifts.forEach(window => { scheduleUnit(unit, ms(window.start), 'shift_start'); scheduleUnit(unit, ms(window.end), 'shift_end'); });
    unit.unavailability.forEach(window => { scheduleUnit(unit, ms(window.start), 'unavailability_start'); scheduleUnit(unit, ms(window.end), 'unavailability_end'); });
    unit.assignment?.periods.forEach(period => { scheduleUnit(unit, ms(period.from)); if (period.to !== undefined) scheduleUnit(unit, ms(period.to)); });
  }
  for (const node of nodes) {
    if (node.type !== 'service' || !node.openWindows.length) continue;
    const times = new Set([0, ...node.openWindows.flatMap(window => [ms(window.openAt), ms(window.closeAt)])]);
    let previous = true;
    for (const time of [...times].sort((a, b) => a - b)) schedule(time, 3, node.id, () => {
      const open = isOpen(node);
      if (previous !== open) emit('NODE_SCHEDULE_CHANGE', undefined, node.id, { details: { direction: open ? 'open' : 'close' } });
      previous = open;
      if (now !== ms(node.openWindows.at(-1)!.closeAt)) return;
      const current = state.get(node.id)!;
      const policy = node.closePolicy?.queued ?? { kind: 'serve' };
      if (policy.kind === 'serve') current.draining = current.queue.length + current.blocked.length > 0;
      else {
        const waiting = [...current.queue, ...current.blocked.sort((a, b) => visitors.get(a)!.blockedAt - visitors.get(b)!.blockedAt || compareIds(a, b))];
        current.queue = []; current.blocked = [];
        waiting.forEach(id => {
          if (policy.kind === 'redirect') redirect(visitors.get(id)!, node, policy.targetNodeId, 'close_redirect');
          else finish(visitors.get(id)!, node, 'dismissed', 'close_dismiss');
        });
      }
    });
  }
  for (const visitor of visitors.values()) {
    const entrance = nodes.find(node => node.type === 'entrance' && node.arrivalStreamIds.includes(visitor.person.arrivalStreamId))!;
    arriveLater(visitor, entrance.id, ms(visitor.person.arrivalTime), 0);
  }
  schedule(cutoff, 7, '', () => {});
  schedule(limit, 7, '', () => {});
  try {
    while (queue.items.length) {
      now = queue.items[0].time;
      do {
        while (queue.items[0]?.time === now) queue.pop().run();
        allocate();
      } while (queue.items[0]?.time === now);
      if (request.runMode === 'run_to_completion' && now >= cutoff && finished === visitors.size) break;
    }
    run.status = 'succeeded';
    run.coveredUntil = now / 1000;
    run.statistics = calculateStatistics(run.population, run.events, plan, scenario, cutoff / 1000);
    if (request.runMode === 'run_to_completion') run.completion = calculateStatistics(run.population, run.events, plan, scenario, run.coveredUntil);
  } catch (error) {
    if (error !== abortLimit) throw error;
    run.status = 'aborted'; run.coveredUntil = run.events.at(-1)?.time ?? 0;
    issues.push({ code: 'max_events_exceeded', severity: 'error', message: '事件数达到上限；本次只有部分记录，不生成统计结论。', entityIds: [plan.id], path: ['maxEvents'] });
  }
  return run;
}
