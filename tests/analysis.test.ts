import { comparisonReport, createPackingExperiment, executionReport, halloweenProject, initialDocument } from '../src/features/project';
import { MESSAGES } from '../src/i18n/messages';
import { describe, expect, it } from 'vitest';
import example from '../examples/open-house.json';
import { projectDocumentSchema } from '../src/schemas';
import type { RunRequest } from '../src/schemas';
import { simulate } from '../src/simulation/engine';
import { playbackAt } from '../src/simulation/metrics';
import type { SimulationEvent, Statistics, VisitorMetrics } from '../src/simulation/types';
import {
  completedWaiting, nodeEvidence, pairedVisitors, statisticsAt, affected, affectedVisitors, comparePicks, costOf, featuredGhost, firstDifference, journeyOf, keyEvents, liveSummary, planChanges, rehearsePicks, stationWaits, stationsOf, statusAt, totalWait, visitorName,
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

  it('distinguishes two existing desks but matches a newly introduced desk of the same stage', () => {
    const request = serviceFixture(), { nodes, edges } = request.plan.graph;
    const desk = nodes.find(node => node.type === 'service')!;
    nodes.push({ ...desk, id: 'second' }, { id: 'choice', name: 'Choice', layout: desk.layout, type: 'decision', decisionKey: 'choice',
      routing: { kind: 'probability', branches: [{ branchKey: 'first', weight: 1 }, { branchKey: 'other', weight: 0 }] } });
    edges[0].target = 'choice';
    edges.push({ id: 'first', source: 'choice', target: desk.id, branchKey: 'first' },
      { id: 'other', source: 'choice', target: 'second', branchKey: 'other' }, { id: 'second-out', source: 'second', target: 'exit' });
    const alternate = structuredClone(request);
    for (const edge of alternate.plan.graph.edges.filter(edge => edge.source === 'choice')) edge.target = edge.target === desk.id ? 'second' : desk.id;
    const left = simulate(request), right = simulate(alternate);
    expect([left.status, right.status]).toEqual(['succeeded', 'succeeded']);
    const first = journeyOf(left, 'guests:p0'), second = journeyOf(right, 'guests:p0');
    expect(firstDifference(first, second, request.plan, alternate.plan)).toMatchObject({ time: 0, a: { nodeId: desk.id }, b: { nodeId: 'second' } });
    const original = serviceFixture();
    const single = journeyOf(simulate(original), 'guests:p0');
    expect(firstDifference(single, second, original.plan, alternate.plan)).toBeNull();
    expect(firstDifference(second, single, alternate.plan, original.plan)).toBeNull();
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
  it('uses the chosen historical boundary while keeping current queues at the replay time', () => {
    const request = serviceFixture(3, 1);
    request.runMode = 'run_to_completion'; request.scenario.observationCutoff = 15;
    const run = simulate(request), view = playbackAt(run.events, request.plan, 5);
    expect(run.coveredUntil).toBe(30);
    expect(run.statistics!.visitors.map(visitor => visitor.waiting)).toEqual([0, 10, 15]);
    expect(run.completion!.visitors.map(visitor => visitor.waiting)).toEqual([0, 10, 20]);
    const cutoff = rehearsePicks(run, view, 5, 3, statisticsAt(run, 'cutoff'));
    const final = rehearsePicks(run, view, 5, 3, statisticsAt(run, 'completion'));
    expect(cutoff.find(group => group.key === 'longest')!.items).toEqual([
      { id: 'guests:p2', value: 15 }, { id: 'guests:p1', value: 10 }, { id: 'guests:p0', value: 0 },
    ]);
    expect(final.find(group => group.key === 'longest')!.items).toEqual([
      { id: 'guests:p2', value: 20 }, { id: 'guests:p1', value: 10 }, { id: 'guests:p0', value: 0 },
    ]);
    expect(cutoff.find(group => group.key === 'unfinished')).toMatchObject({ total: 2, items: [{ id: 'guests:p2', value: 15 }, { id: 'guests:p1', value: 10 }] });
    expect(final.find(group => group.key === 'unfinished')).toBeUndefined();
    const queued = { key: 'queuedNow', total: 2, items: [{ id: 'guests:p1', value: 5 }, { id: 'guests:p2', value: 5 }] };
    expect(cutoff.find(group => group.key === 'queuedNow')).toEqual(queued);
    expect(final.find(group => group.key === 'queuedNow')).toEqual(queued);
    expect(rehearsePicks(run, view, 5)).toEqual(cutoff);
    expect(rehearsePicks(run, view, 5, 1)).toEqual(cutoff.map(group => ({ ...group, items: group.items.slice(0, 1) })));
    expect(rehearsePicks(run, view, 5, 1, run.completion)).toEqual(final.map(group => ({ ...group, items: group.items.slice(0, 1) })));
    expect(rehearsePicks(run, playbackAt(run.events, request.plan, 25), 25, 3, run.statistics)).toEqual(cutoff.filter(group => group.key !== 'queuedNow'));
  });

  it('does not substitute cutoff stories for explicitly unavailable statistics', () => {
    const request = serviceFixture(3, 1), run = simulate(request);
    const view = playbackAt(run.events, request.plan, 5);
    const queued = rehearsePicks(run, view, 5).filter(group => group.key === 'queuedNow');
    expect(statisticsAt(run, 'completion')).toBeNull();
    expect(rehearsePicks(run, view, 5, 3, statisticsAt(run, 'completion'))).toEqual(queued);
    for (const status of ['failed', 'aborted'] as const) {
      expect(rehearsePicks(run, view, 5, 3, statisticsAt({ ...run, status }, 'cutoff'))).toEqual(queued);
    }
    expect(rehearsePicks(run, playbackAt(run.events, request.plan, -1), -1, 3, null)).toEqual([]);
  });

  it('keeps unfinished stories at a final run limit and excludes guests who have not arrived', () => {
    const request = serviceFixture(4, 1);
    request.runMode = 'run_to_completion'; request.scenario.observationCutoff = 15; request.scenario.horizon = 25;
    const stream = request.scenario.arrivalStreams[0];
    if (stream.kind === 'records') stream.records[3].arrivalTime = 50;
    const run = simulate(request);
    expect(run.status).toBe('succeeded');
    const picks = rehearsePicks(run, playbackAt(run.events, request.plan, 25), 25, 3, run.completion);
    expect(picks.find(group => group.key === 'longest')).toMatchObject({ total: 3 });
    expect(picks.find(group => group.key === 'unfinished')).toEqual({ key: 'unfinished', total: 1, items: [{ id: 'guests:p2', value: 20 }] });
    expect(picks.flatMap(group => group.items).some(item => item.id === 'guests:p3')).toBe(false);
  });

  it('uses the chosen boundary for departures as well as waiting', () => {
    const request = serviceFixture(3, 1);
    request.runMode = 'run_to_completion'; request.scenario.observationCutoff = 5;
    const node = request.plan.graph.nodes[1];
    if (node.type === 'service') { node.openWindows = [{ openAt: 0, closeAt: 15, provenance: { kind: 'synthetic' } }]; node.closePolicy = { queued: { kind: 'dismiss' } }; }
    const run = simulate(request), view = playbackAt(run.events, request.plan, 5);
    expect(run.status).toBe('succeeded');
    expect(rehearsePicks(run, view, 5, 3, run.statistics).find(group => group.key === 'left')).toBeUndefined();
    expect(rehearsePicks(run, view, 5, 3, run.completion).find(group => group.key === 'left')).toEqual({ key: 'left', total: 1, items: [{ id: 'guests:p2', value: 15 }] });
  });

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
  it.each([0, 60] as const)('uses one partition for all views at threshold %s, including millisecond boundaries', threshold => {
    const deltas = [-600, -300, -60, -59.999, -0.001, 0, 0.001, 59.999, 60, 300, 600];
    const visitor = statsA.visitors[0];
    const a = { ...statsA, visitors: deltas.map((_, index) => ({ ...visitor, id: String(index), waiting: 1000 })) };
    const b = { ...statsB, visitors: deltas.map((delta, index) => ({ ...visitor, id: String(index), waiting: 1000 + delta })) };
    const summary = affected(a, b, threshold);
    expect([summary.better, summary.same, summary.worse]).toEqual(threshold ? [3, 5, 3] : [5, 1, 5]);
    expect(summary.bins).toEqual(threshold ? [1, 1, 1, 5, 1, 1, 1] : [1, 1, 3, 1, 3, 1, 1]);
    for (const [filter, count] of [['less', summary.better], ['more', summary.worse], ['same', summary.same]] as const) {
      expect(affectedVisitors(a, b, filter, threshold)).toHaveLength(count);
      if (filter !== 'same') expect(comparePicks(a, b, 20, threshold).find(group => group.key === filter)?.total).toBe(count);
    }
  });

  it('excludes one-sided arrival and unmatched IDs from paired waits without changing primary samples', () => {
    const base = statsA.visitors[0];
    const a = { ...statsA, visitors: [{ ...base, id: 'both' }, { ...base, id: 'late', outcome: 'not_arrived' as const }, { ...base, id: 'absent' }, { ...base, id: 'missing' }] };
    const b = { ...statsB, visitors: [{ ...base, id: 'both' }, { ...base, id: 'late' }, { ...base, id: 'absent', outcome: 'not_arrived' as const }] };
    expect(affectedVisitors(a, b).map(pair => pair.id)).toEqual(['both']);
    expect(pairedVisitors({ ...runA, statistics: a }, { ...runB, statistics: b }, 'cutoff').map(pair => pair.id)).toEqual(['both']);
    expect(affected(a, b).total).toBe(1);
    expect(a.visitors).toHaveLength(4);
  });

  it('keeps all arrived primary waits and an independently calculated completed-only sample', () => {
    const request = serviceFixture(3, 1);
    request.runMode = 'run_to_completion'; request.scenario.observationCutoff = 15; request.scenario.horizon = 25;
    const run = simulate(request);
    expect(run.statistics).toMatchObject({ arrived: 3, averageWaiting: 25 / 3, p90Waiting: 15 });
    expect(completedWaiting(run.statistics!)).toEqual({ n: 1, average: 0, p90: 0 });
    expect(run.completion).toMatchObject({ until: 25, arrived: 3, outcomes: { completed: 2, unfinished: 1 }, averageWaiting: 10, p90Waiting: 20 });
    expect(completedWaiting(run.completion!)).toEqual({ n: 2, average: 5, p90: 10 });
    expect(completedWaiting({ ...run.statistics!, visitors: [] })).toEqual({ n: 0, average: null, p90: null });
  });

  it('keeps different final windows and clips scheduled resource costs to each actual end', () => {
    const request = serviceFixture(3, 1); request.runMode = 'run_to_completion'; request.scenario.observationCutoff = 15;
    const a = simulate(request), changed = structuredClone(request);
    const node = changed.plan.graph.nodes[1]; if (node.type === 'service') node.duration = { kind: 'fixed', value: 20, provenance: { kind: 'synthetic' } };
    const b = simulate(changed);
    expect([a.completion!.until, b.completion!.until]).toEqual([30, 60]);
    const staff = { id: 's', name: 'S', skillIds: [], shifts: [{ start: 0, end: 100 }], unavailability: [], provenance: { kind: 'synthetic' as const } };
    const costs = costOf({ ...request.plan, staff: [staff] }, { ...changed.plan, staff: [staff] }, request.scenario, a.completion!, b.completion!, 'completion');
    expect(costs.staffHours).toEqual([30 / 3600, 60 / 3600]);
    const exported = comparisonReport(a, b, true, MESSAGES.en, 'completion', 60);
    expect(exported).toContain('Actual end 00:30'); expect(exported).toContain('Actual end 01:00');
  });

  it.each(['en', 'zh'] as const)('exports groups and secondary samples in %s and refuses missing/stale/incompatible evidence', lang => {
    const t = MESSAGES[lang];
    for (const threshold of [0, 60] as const) {
      const summary = affected(statsA, statsB, threshold), labels = threshold ? t.evidence.groups : t.evidence.anyGroups;
      const text = comparisonReport(runA, runB, true, t, 'cutoff', threshold);
      expect(text).toContain(`${labels.less}: ${summary.better}`);
      expect(text).toContain(`${labels.more}: ${summary.worse}`);
      expect(text).toContain(`${labels.same}: ${summary.same}`);
      expect(text).toContain(t.evidence.paired(300));
      expect(text).toContain(`${t.evidence.completed}: n=43`);
      expect(text).toContain(`${t.evidence.completed}: n=41`);
      expect(text).toContain(t.review.caveat);
    }
    expect(comparisonReport(runA, runB, false, t, 'cutoff', 60)).toBe(t.report.noRun);
    expect(comparisonReport(runA, runB, true, t, 'completion', 60)).toBe(t.report.noRun);
    for (const b of [undefined, { ...runB, status: 'aborted' as const }, { ...runB, modelVersion: 'other' }, { ...runB, scenarioKey: 'other' }]) {
      expect(comparisonReport(runA, b, true, t, 'cutoff', 60)).toBe(t.report.noRun);
    }
  });

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
    expect(people.better + people.worse + people.same + people.excluded).toBe(people.total);
    expect(people.bins.reduce((sum, count) => sum + count, 0)).toBe(people.total - people.excluded);
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

  it.each(['rejected', 'dismissed', 'diverted', 'loop_limit'] as const)('keeps waits truncated by %s out of all waiting bins in either direction', outcome => {
    const completed = { ...statsA.visitors[0], id: 'guest', outcome: 'completed' as const, waiting: 180 };
    const departed = { ...completed, outcome, waiting: 0, completedAt: null };
    for (const threshold of [0, 60] as const) for (const reverse of [false, true]) {
      const a = { ...statsA, visitors: [reverse ? departed : completed] };
      const b = { ...statsB, visitors: [reverse ? completed : departed] };
      expect(affected(a, b, threshold)).toEqual({ total: 1, better: 0, worse: 0, same: 0, excluded: 1,
        rescued: Number(reverse), lost: Number(!reverse), bins: [0, 0, 0, 0, 0, 0, 0] });
      for (const filter of ['less', 'more', 'same'] as const) expect(affectedVisitors(a, b, filter, threshold)).toEqual([]);
      expect(comparePicks(a, b, 3, threshold).map(group => group.key)).toEqual([reverse ? 'rescued' : 'lost']);
      expect(affectedVisitors(a, b, reverse ? 'rescued' : 'lost', threshold)[0].id).toBe('guest');
    }
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

describe('rehearsal evidence and execution reports', () => {
  const document = initialDocument();
  const [a, b] = document.plans.map(plan => simulate({ schemaVersion: 1, plan, scenario: document.scenarios[0], runMode: 'run_to_completion' }));

  describe('Open House evidence', () => {
    it('preserves the default result and pairs the same people without equating shorter waits with better outcomes', () => {
      expect([a.statistics!.outcomes.completed, b.statistics!.outcomes.completed]).toEqual([43, 41]);
      const pairs = pairedVisitors(a, b, 'cutoff');
      expect([pairs.filter(pair => pair.delta < 0).length, pairs.filter(pair => pair.delta > 0).length, pairs.filter(pair => pair.delta === 0).length]).toEqual([66, 26, 208]);
      expect(pairs.filter(pair => pair.a.outcome === 'unfinished' && pair.b.outcome === 'completed')).toHaveLength(7);
      expect(pairs.filter(pair => pair.a.outcome === 'completed' && pair.b.outcome === 'unfinished')).toHaveLength(9);
      expect(pairs.filter(pair => pair.delta < 0 && pair.a.outcome === 'unfinished' && pair.b.outcome === 'diverted')).toHaveLength(2);
      expect(pairs.filter(pair => pair.delta < 0 && pair.b.outcome === 'diverted')).toHaveLength(3);
      expect(a.statistics!.averageWaiting! - b.statistics!.averageWaiting!).toBeCloseTo(2.3833333333);
    });
    it('counts completed passages through entrances, merges, decisions and holding areas', () => {
      const view = playbackAt(a.events, a.request.plan, 1800);
      expect(view.nodes.main.completed).toBe(180);
      expect(view.nodes.intake.completed).toBe(300);
      expect(view.nodes.tickets.completed).toBe(300);
      expect(view.nodes.holding.completed).toBe(a.events.filter(event => event.time <= 1800 && event.type === 'HOLD_RELEASE' && event.nodeId === 'holding').length);
      expect(a.statistics!.nodes.find(node => node.id === 'orientation')!.maxQueue).toBe(0);
    });
    it('provides a positive-duration backlog with resource and post evidence from the owning plan', () => {
      const evidence = nodeEvidence(b, 'checkin-extra', 'cutoff')!;
      expect(evidence.node.id).toBe('checkin-extra');
      expect(evidence.to).toBeGreaterThan(evidence.from);
      expect(evidence.queued).toBeGreaterThan(0);
      expect(evidence.resources.find(item => item.id === 'check-staff')!.posted).toBe(false);
      expect(evidence.visitors.length).toBe(evidence.queued + evidence.blocked + evidence.holding);
      expect(nodeEvidence(a, 'orientation', 'cutoff')).toBeNull();
    });
    it('separates final statistics and declines incompatible pairing', () => {
      expect(statisticsAt(a, 'completion')!.until).toBe(a.coveredUntil);
      expect(statisticsAt(a, 'completion')!.outcomes).not.toEqual(statisticsAt(a, 'cutoff')!.outcomes);
      expect(pairedVisitors(a, { ...b, scenarioKey: 'changed' }, 'cutoff')).toEqual([]);
      expect(pairedVisitors(a, { ...b, completion: null }, 'completion')).toEqual([]);
      expect(pairedVisitors(a, { ...b, status: 'aborted' }, 'cutoff')).toEqual([]);
    });
    it('tests additional packing capacity with its explicit extra staffing cost', () => {
      const plan = createPackingExperiment(document.plans[1], new Set(document.plans.map(item => item.id)), MESSAGES.en)!;
      const run = simulate({ schemaVersion: 1, plan, scenario: document.scenarios[0], runMode: 'cutoff' });
      expect(plan.staff).toHaveLength(4);
      expect(run.statistics!.outcomes).toMatchObject({ completed: 72, unfinished: 218, diverted: 10 });
      expect(run.statistics!.averageWaiting).toBeCloseTo(954.0833333333);
      expect(run.statistics!.p90Waiting).toBe(1444.286);
      for (const t of [MESSAGES.en, MESSAGES.zh]) {
        const report = executionReport(plan, document.scenarios[0], run, false, t);
        expect(report).toContain(`${t.outcomes.completed}: 72`);
        expect(report).toContain(`${t.outcomes.unfinished}: 218`);
        expect(report).toContain(`${t.outcomes.diverted}: 10`);
      }
    });
    it('constructs C once from the same reusable builder without mutating B or changing the experiment', () => {
      const original = structuredClone(document.plans[1]);
      const c = createPackingExperiment(original, new Set(document.plans.map(plan => plan.id)), MESSAGES.en)!;
      expect(original).toEqual(document.plans[1]);
      expect(c.graph).toEqual(original.graph);
      expect(c.graph).not.toBe(original.graph);
      expect(c.deviceTypes).toEqual(original.deviceTypes);
      expect(c.staff.slice(0, -1)).toEqual(original.staff);
      expect(c.assignments.slice(0, -1)).toEqual(original.assignments);
      const worker = c.staff.at(-1)!;
      expect(worker).toEqual({ ...original.staff.find(item => item.id === 'pack-staff'), id: 'packing-support-1', name: MESSAGES.en.review.demoStaff });
      expect(c.assignments.at(-1)).toEqual({ resourceUnitId: worker.id, periods: [{ from: 0, nodeIds: ['packing'] }] });
      expect(c.scenarioId).toBe(original.scenarioId);
      expect(c.sourcePlanId).toBe(original.id);
      expect(createPackingExperiment(original, new Set([...document.plans.map(plan => plan.id), c.id]), MESSAGES.zh)!.id).not.toBe(c.id);
      expect(createPackingExperiment({ ...original, staff: [] }, new Set(), MESSAGES.en)).toBeNull();
    });
  });

  it.each(['en', 'zh'] as const)('exports the chosen statistics basis and all outcomes in %s', lang => {
    const t = MESSAGES[lang];
    for (const run of [a, b]) {
      const cutoff = executionReport(run.request.plan, run.request.scenario, run, false, t);
      const final = executionReport(run.request.plan, run.request.scenario, run, false, t, undefined, 'completion');
      expect(cutoff).toContain(`${t.review.cutoff} (30:00)`);
      expect(cutoff).toContain(`${t.outcomes.completed}: ${run === a ? 43 : 41}`);
      expect(final).toContain(`${t.review.completion} (120:00)`);
      expect(final).toContain(`${t.outcomes.completed}: 149`);
      expect(final).toContain(`${t.outcomes.unfinished}: 133`);
      for (const [outcome, count] of Object.entries(run.completion!.outcomes)) expect(final).toContain(`${t.outcomes[outcome]}: ${count}`);
      expect(executionReport(run.request.plan, run.request.scenario, { ...run, completion: null }, false, t, undefined, 'completion')).toContain(t.report.noRun);
      expect(executionReport(run.request.plan, run.request.scenario, run, true, t, undefined, 'completion')).not.toContain(t.report.record);
    }
  });

  it.each(['en', 'zh'] as const)('preserves provenance kinds, sources and notes in %s reports', lang => {
    const t = MESSAGES[lang], project = initialDocument(), plan = project.plans[0], scenario = project.scenarios[0];
    const node = plan.graph.nodes.find(item => item.id === 'checkin')!;
    if (node.type !== 'service' || scenario.arrivalStreams[0].kind === 'records') throw new Error('fixture');
    node.openWindows = [{ openAt: 0, closeAt: 1800, provenance: { kind: 'measured' } }];
    const entries = [node.duration, node.openWindows[0], plan.staff[0], plan.deviceTypes[0], scenario.arrivalStreams[0], Object.values(scenario.arrivalStreams[0].attributeDistributions)[0]];
    entries.forEach((item, index) => { item.provenance = { kind: 'measured', source: `measurement-${index}`, notes: `observation-${index}` }; });
    const report = executionReport(plan, scenario, undefined, false, t);
    entries.forEach((_, index) => expect(report).toContain(`${t.review.sources.measured} · measurement-${index} · observation-${index}`));
    node.duration.provenance = { kind: 'user_estimate', source: ' ', notes: ' ' };
    expect(executionReport(plan, scenario, undefined, false, t)).toContain(`[${t.review.sources.user_estimate}]`);
  });

  it.each(['en', 'zh'] as const)('exports actionable rules and sources in %s without serialized model JSON', lang => {
    const t = MESSAGES[lang], haunted = halloweenProject('haunted', t);
    const report = executionReport(haunted.plans[0], haunted.scenarios[0], undefined, false, t);
    expect(report).toContain(lang === 'en' ? 'Release 6 guests per batch' : '每批放行 6 人');
    expect(report).toContain(lang === 'en' ? 'hold at most 1.0 min' : '最长等待 1.0 分');
    expect(report).toContain(t.review.sources.synthetic);
    expect(report).not.toContain('```json');
    const openHouse = executionReport(document.plans[1], document.scenarios[0], b, false, t, document.plans[0]);
    expect(openHouse).toContain('ticket ∈ vip');
    expect(openHouse).toContain('10:00');
    expect(openHouse).toContain(`${t.review.devices}: 1 → 2`);
    expect(openHouse).toContain(t.inspector.fullReroute);
  });
});
