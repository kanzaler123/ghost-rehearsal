import { describe, expect, it } from 'vitest';
import example from '../examples/open-house.json';
import { projectDocumentSchema } from '../src/schemas';
import type { RunRequest } from '../src/schemas';
import { simulate } from '../src/simulation/engine';
import { playbackAt } from '../src/simulation/metrics';
import type { SimulationEvent, Statistics, VisitorMetrics } from '../src/simulation/types';
import {
  affected, affectedVisitors, comparePicks, costOf, featuredGhost, firstDifference, journeyOf, keyEvents, liveSummary, planChanges, rehearsePicks, stationWaits, stationsOf, statusAt, totalWait, visitorName,
} from '../src/features/analysis';

const document = projectDocumentSchema.parse(example);
const scenario = document.scenarios[0];
const [planA, planB] = document.plans;
const [runA, runB] = document.plans.map(plan => simulate({ schemaVersion: 1, scenario, plan, runMode: 'cutoff' }));
const statsA = runA.statistics!, statsB = runB.statistics!;

function serviceFixture(count = 1, maxConcurrent?: number): RunRequest {
  return {
    schemaVersion: 1, runMode: 'cutoff',
    scenario: { id: 'scenario', seed: 42, observationCutoff: 25, horizon: 200, attributes: [], assumptionOverrides: [],
      arrivalStreams: [{ id: 'guests', kind: 'records', provenance: { kind: 'synthetic' }, records: Array.from({ length: count }, (_, index) => ({ id: `p${index}`, arrivalTime: 0, attributes: {} })) }] },
    plan: { id: 'plan', name: 'Immediate service', scenarioId: 'scenario', skills: [], deviceTypes: [], assignments: [], staff: [],
      graph: { nodes: [
        { id: 'entrance', type: 'entrance', name: 'Entrance', layout: { x: 0, y: 0 }, arrivalStreamIds: ['guests'] },
        { id: 'service', type: 'service', name: 'Service', layout: { x: 300, y: 0 }, stageKey: 'service', requirements: [], maxConcurrent,
          duration: { kind: 'fixed', value: 10, provenance: { kind: 'synthetic' } }, openWindows: [] },
        { id: 'exit', type: 'exit', name: 'Exit', layout: { x: 600, y: 0 } },
      ], edges: [{ id: 'in-service', source: 'entrance', target: 'service' }, { id: 'service-out', source: 'service', target: 'exit' }] } },
  };
}

describe('ghost journeys', () => {
  it('names a ghost by its entrance instead of its raw ID', () => {
    expect(visitorName('main-stream:20', planA, scenario)).toBe('主入口 #20');
    expect(visitorName('unknown', planA, scenario)).toBe('unknown');
  });

  it('splits a journey into queue, holding and service segments that end at the cutoff when unfinished', () => {
    const journey = journeyOf(runA, 'main-stream:20');
    expect(journey.arrival).toBeCloseTo(126.667, 3);
    expect(journey.end).toBeUndefined();
    expect(journey.segments.map(segment => [segment.kind, segment.nodeId])).toEqual([['queue', 'checkin'], ['service', 'checkin'], ['hold', 'holding'], ['queue', 'packing']]);
    expect(journey.segments.at(-1)).toMatchObject({ end: runA.coveredUntil, open: true });
    const waited = stationsOf(journey).reduce((sum, station) => sum + station.queue, 0);
    expect(waited).toBeCloseTo(statsA.visitors.find(visitor => visitor.id === 'main-stream:20')!.waiting, 6);
    const status = statusAt(journey, 900);
    expect(status).toMatchObject({ kind: 'queue', nodeId: 'packing' });
    expect('since' in status && status.since).toBeCloseTo(833.333, 3);
    expect(statusAt(journey, 60)).toEqual({ kind: 'not_arrived' });
  });

  it('shows the same ghost finishing only in B and the first point where the futures differ', () => {
    const b = journeyOf(runB, 'main-stream:20');
    expect(b.end).toMatchObject({ kind: 'complete', time: 1515 });
    expect(statusAt(b, 1600)).toMatchObject({ kind: 'done', time: 1515 });
    const a = journeyOf(runA, 'main-stream:20');
    const difference = firstDifference(a, b, planA, planB)!;
    expect(difference.time).toBe(360);
    expect(difference.a).toMatchObject({ kind: 'queue', nodeId: 'checkin' });
    expect(difference.b).toMatchObject({ kind: 'service', nodeId: 'checkin' });
    expect(statusAt(a, 359.999)).toEqual(statusAt(b, 359.999));
    expect(statusAt(a, difference.time).kind).toBe('queue');
    expect(statusAt(b, difference.time).kind).toBe('service');
    expect(firstDifference(b, b, planB, planB)).toBeNull();
  });

  it('jumps the featured ghost to the first visible state difference, not the shared queue entry', () => {
    const id = featuredGhost(statsA, statsB)!;
    expect(id).toBe('side-stream:10');
    const a = journeyOf(runA, id), b = journeyOf(runB, id);
    const difference = firstDifference(a, b, planA, planB)!;
    expect(difference.time).toBe(210);
    expect(statusAt(a, 209.999)).toEqual(statusAt(b, 209.999));
    expect(statusAt(a, 210).kind).toBe('queue');
    expect(statusAt(b, 210).kind).toBe('service');
  });

  it('does not reveal future differences beyond the selected observation boundary', () => {
    const request = serviceFixture();
    request.scenario.observationCutoff = 5;
    request.runMode = 'run_to_completion';
    const a = simulate(request);
    const slower = structuredClone(request);
    const node = slower.plan.graph.nodes[1];
    if (node.type === 'service') node.duration = { kind: 'fixed', value: 15, provenance: { kind: 'synthetic' } };
    const b = simulate(slower);
    expect(a.status).toBe('succeeded');
    expect(b.status).toBe('succeeded');
    expect(firstDifference(journeyOf(a, 'guests:p0', 5), journeyOf(b, 'guests:p0', 5), request.plan, slower.plan)).toBeNull();
    expect(firstDifference(journeyOf(a, 'guests:p0'), journeyOf(b, 'guests:p0'), request.plan, slower.plan)).toMatchObject({ time: 10 });
  });

  it('treats simultaneous routing and queue entry as transitions, not lasting differences', () => {
    const request = serviceFixture();
    const a = simulate(request);
    const detour = structuredClone(request);
    detour.plan.graph.nodes.push({ id: 'merge', type: 'merge', name: 'Merge', layout: { x: 150, y: 0 }, incomingPriority: ['in-service'] });
    detour.plan.graph.edges[0].target = 'merge';
    detour.plan.graph.edges.push({ id: 'merge-service', source: 'merge', target: 'service' });
    const b = simulate(detour);
    expect(b.status).toBe('succeeded');
    expect(b.events.length).toBeGreaterThan(a.events.length);
    expect(firstDifference(journeyOf(a, 'guests:p0'), journeyOf(b, 'guests:p0'), request.plan, detour.plan)).toBeNull();
  });

  it('clips a completion recording so station totals, outcome and evidence all use the cutoff', () => {
    const complete = simulate({ ...runA.request, runMode: 'run_to_completion' });
    const id = 'main-stream:20';
    const journey = journeyOf(complete, id, scenario.observationCutoff);
    expect(journey.until).toBe(scenario.observationCutoff);
    expect(journey.end).toBeUndefined();
    expect(journey.events.every(event => event.time <= scenario.observationCutoff)).toBe(true);
    expect(journey.segments.at(-1)).toMatchObject({ end: scenario.observationCutoff, open: true });
    expect(stationsOf(journey).reduce((sum, station) => sum + station.queue, 0)).toBeCloseTo(complete.statistics!.visitors.find(visitor => visitor.id === id)!.waiting, 6);
    expect(journeyOf(complete, id).end).toMatchObject({ kind: 'complete', time: 3010 });
    expect(journeyOf(complete, id, complete.coveredUntil + 100).until).toBe(complete.coveredUntil);
    expect(journeyOf(complete, id, 100)).toMatchObject({ arrival: undefined, events: [], segments: [], end: undefined });
    expect(journeyOf(runB, id, 1515).end).toMatchObject({ kind: 'complete', time: 1515 });
  });
});

describe('story picks', () => {
  it('offers ghosts who finished only in B, sorted by the time they saved', () => {
    const picks = comparePicks(statsA, statsB);
    const rescued = picks.find(group => group.key === 'rescued')!;
    expect(rescued.total).toBe(7);
    expect(rescued.items.map(item => item.id)).toContain(featuredGhost(statsA, statsB));
    expect(picks.find(group => group.key === 'less')!.items.every(item => item.value < -60)).toBe(true);
  });

  it('lists who is queuing at the replay moment with time waited so far', () => {
    const view = playbackAt(runA.events, planA, 720);
    const queued = rehearsePicks(runA, view, 720).find(group => group.key === 'queuedNow')!;
    expect(queued.total).toBe(liveSummary(view).waiting);
    expect(queued.items[0].value).toBeGreaterThanOrEqual(queued.items.at(-1)!.value);
  });
});

describe('comparison report', () => {
  it('describes what changed without subflow noise, in process-resource-route order', () => {
    const changes = planChanges(planA, planB);
    expect(changes.some(item => item.id === 'verification' || item.id === 'activities')).toBe(false);
    expect(changes.some(item => item.id === 'checked')).toBe(false);
    expect(changes.filter(item => item.kind === 'node').map(item => `${item.change}:${item.id}`).sort()).toEqual(['added:briefing', 'added:checkin-extra', 'added:lane-choice', 'removed:orientation']);
    expect(changes.find(item => item.kind === 'device')).toMatchObject({ id: 'scanner', change: 'modified', fields: ['quantity'] });
    expect(changes.find(item => item.kind === 'assignment')).toMatchObject({ id: 'floater', gained: ['checkin-extra'], dropped: [] });
    expect(changes.findIndex(item => item.kind === 'edge')).toBeGreaterThan(changes.findIndex(item => item.kind === 'assignment'));
  });

  it('accounts for every arrived guest once in the impact summary', () => {
    const people = affected(statsA, statsB);
    expect(people.better + people.worse + people.same).toBe(people.total);
    expect(people.bins.reduce((sum, count) => sum + count, 0)).toBe(people.total);
    expect(people.rescued).toBe(7);
    expect(affectedVisitors(statsA, statsB)).toHaveLength(people.total);
    expect(affectedVisitors(statsA, statsB, 'less')).toHaveLength(people.better);
    expect(affectedVisitors(statsA, statsB, 'more')).toHaveLength(people.worse);
    expect(affectedVisitors(statsA, statsB, 'same')).toHaveLength(people.same);
    expect(affectedVisitors(statsA, statsB, 'rescued')).toHaveLength(people.rescued);
    expect(affectedVisitors(statsA, statsB, 'lost')).toHaveLength(people.lost);
  });

  it('uses the inclusive one-minute threshold consistently in filters, counts, histogram and picks', () => {
    const visitor = (id: string, waiting: number, outcome: VisitorMetrics['outcome'] = 'unfinished'): VisitorMetrics => ({
      id, waiting, outcome, completedAt: outcome === 'completed' ? 100 : null, queueWaiting: waiting, blockedWaiting: 0, holdWaiting: 0, nodeWaiting: {},
    });
    const a: Statistics = { ...statsA, visitors: [visitor('less', 60), visitor('more', 0, 'completed'), visitor('near-less', 59.999), visitor('near-more', 0), visitor('equal', 0), visitor('absent', 0, 'not_arrived'), visitor('unmatched', 0)] };
    const b: Statistics = { ...statsB, visitors: [visitor('less', 0, 'completed'), visitor('more', 60), visitor('near-less', 0), visitor('near-more', 59.999), visitor('equal', 0), visitor('absent', 0, 'not_arrived')] };
    const summary = affected(a, b);
    expect(summary).toMatchObject({ total: 5, better: 1, worse: 1, same: 3, rescued: 1, lost: 1 });
    expect(summary.bins).toEqual([0, 0, 1, 3, 1, 0, 0]);
    expect(affectedVisitors(a, b, 'less').map(item => item.id)).toEqual(['less']);
    expect(affectedVisitors(a, b, 'more').map(item => item.id)).toEqual(['more']);
    expect(affectedVisitors(a, b, 'same').map(item => item.id).sort()).toEqual(['equal', 'near-less', 'near-more']);
    expect(comparePicks(a, b).find(group => group.key === 'less')).toMatchObject({ total: 1, items: [{ id: 'less', value: -60 }] });
    expect(comparePicks(a, b).find(group => group.key === 'more')).toMatchObject({ total: 1, items: [{ id: 'more', value: 60 }] });
  });

  it('merges parallel lanes of one stage into one station and keeps person-time totals', () => {
    const stations = stationWaits(planA, statsA, planB, statsB, runA.events, runB.events);
    const checkin = stations.find(row => row.key === 'stage:checkin')!;
    expect(checkin.b.sort()).toEqual(['checkin', 'checkin-extra']);
    expect(checkin.waitB).toBeCloseTo(statsB.nodes.filter(node => node.id.startsWith('checkin')).reduce((sum, node) => sum + node.waiting, 0), 6);
    expect(checkin).toMatchObject({ peakA: 189, peakB: 171 });
    expect(stations.reduce((sum, row) => sum + row.waitA, 0)).toBeCloseTo(totalWait(statsA), 3);
  });

  it('counts simultaneous waiting, not summed lane maxima or arrivals after the reporting cutoff', () => {
    const records: Omit<SimulationEvent, 'seq'>[] = [];
    const add = (time: number, type: SimulationEvent['type'], prefix: string, count: number, nodeId: string) => {
      records.push(...Array.from({ length: count }, (_, index) => ({ time, type, participantId: `${prefix}:${index}`, nodeId })));
    };
    add(0, 'QUEUE_ENTER', 'first', 3, 'checkin');
    // New lane arrivals happen before the old queue drains within this timestamp.
    add(10, 'QUEUE_ENTER', 'second', 4, 'checkin-extra');
    add(10, 'SERVICE_START', 'first', 3, 'checkin');
    add(20, 'SERVICE_START', 'second', 4, 'checkin-extra');
    add(30, 'QUEUE_ENTER', 'late', 20, 'checkin');
    const events = records.map((event, seq) => ({ ...event, seq }));
    const stats: Statistics = { ...statsB, until: 20, nodes: statsB.nodes.filter(node => node.id.startsWith('checkin')).map(node => ({ ...node, waiting: node.id === 'checkin' ? 30 : 40, maxQueue: 999 })) };
    const station = stationWaits(planB, stats, planB, stats, events, events)[0];
    expect(station).toMatchObject({ waitA: 70, waitB: 70, peakA: 4, peakB: 4 });
  });

  it('reports the extra scanner as the cost of B', () => {
    const cost = costOf(planA, planB, scenario, statsA, statsB);
    expect(cost.devices).toEqual([{ id: 'scanner', name: '核验终端', a: 1, b: 2 }]);
    expect(cost.staff).toEqual([3, 3]);
    expect(cost.deviceHours[1]).toBeCloseTo(cost.deviceHours[0] * 2, 6);
    expect(cost.utilization.find(item => item.id === 'scanner:2')).toMatchObject({ a: null });
  });

  it('marks key moments on the timeline from recorded events only', () => {
    const moments = keyEvents(runA);
    expect(moments.every((item, index) => !index || item.time >= moments[index - 1].time)).toBe(true);
    expect(moments.find(item => item.kind === 'close')).toMatchObject({ time: 1500, nodeId: 'checkin' });
    expect(moments.filter(item => item.kind === 'queue' && item.nodeId === 'checkin').map(item => item.value)).toEqual([10, 50]);
    expect(moments.some(item => item.kind === 'resource' && item.to === 'handover')).toBe(true);
  });

  it('does not mark a queue or waiting peak when everyone starts service immediately', () => {
    const request = serviceFixture(10);
    const run = simulate(request);
    expect(run.status).toBe('succeeded');
    expect(run.statistics!.visitors.every(visitor => visitor.waiting === 0)).toBe(true);
    expect(liveSummary(playbackAt(run.events, request.plan, 0))).toMatchObject({ waiting: 0, serving: 10 });
    expect(keyEvents(run).filter(item => item.kind === 'queue' || item.kind === 'peak')).toEqual([]);
  });

  it('marks the real settled queue size at the same moment shown by replay', () => {
    const request = serviceFixture(11, 1);
    const run = simulate(request);
    const moments = keyEvents(run);
    expect(moments.find(item => item.kind === 'queue')).toMatchObject({ time: 0, nodeId: 'service', value: 10 });
    const peak = moments.find(item => item.kind === 'peak')!;
    expect(peak).toMatchObject({ time: 0, value: 10 });
    expect(liveSummary(playbackAt(run.events, request.plan, peak.time)).waiting).toBe(peak.value);
  });
});
