import { describe, expect, it } from 'vitest';
import example from '../examples/open-house.json';
import { projectDocumentSchema } from '../src/schemas';
import { simulate } from '../src/simulation/engine';
import { playbackAt } from '../src/simulation/metrics';
import {
  affected, comparePicks, costOf, featuredGhost, firstDifference, journeyOf, keyEvents, liveSummary, planChanges, rehearsePicks, stationWaits, stationsOf, statusAt, totalWait, visitorName,
} from '../src/features/analysis';

const document = projectDocumentSchema.parse(example);
const scenario = document.scenarios[0];
const [planA, planB] = document.plans;
const [runA, runB] = document.plans.map(plan => simulate({ schemaVersion: 1, scenario, plan, runMode: 'cutoff' }));
const statsA = runA.statistics!, statsB = runB.statistics!;

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
    const difference = firstDifference(journeyOf(runA, 'main-stream:20'), b, planA, planB)!;
    expect(difference.time).toBeCloseTo(126.667, 3);
    expect(difference.a?.nodeId).toBe('checkin');
    expect(difference.a!.end - difference.a!.start).toBeGreaterThan(difference.b!.end - difference.b!.start);
    expect(firstDifference(b, b, planB, planB)).toBeNull();
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
  });

  it('merges parallel lanes of one stage into one station and keeps person-time totals', () => {
    const stations = stationWaits(planA, statsA, planB, statsB);
    const checkin = stations.find(row => row.key === 'stage:checkin')!;
    expect(checkin.b.sort()).toEqual(['checkin', 'checkin-extra']);
    expect(checkin.waitB).toBeCloseTo(statsB.nodes.filter(node => node.id.startsWith('checkin')).reduce((sum, node) => sum + node.waiting, 0), 6);
    expect(stations.reduce((sum, row) => sum + row.waitA, 0)).toBeCloseTo(totalWait(statsA), 3);
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
});
