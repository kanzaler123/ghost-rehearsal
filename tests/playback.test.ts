import { describe, expect, it } from 'vitest';
import type { SimulationEvent } from '../src/simulation/types';
import { simulate } from '../src/simulation/engine';
import { playbackAt } from '../src/simulation/metrics';
import { createPlaybackReader } from '../src/simulation/playback';
import { playbackFixture } from './fixtures/playback';
import { referencePlaybackAt } from './playback-reference';

const request = playbackFixture();
const run = simulate(request);
const times = [...new Set([-1, 0, ...run.events.flatMap(event => [event.time - 0.001, event.time, event.time + 0.001]), 600])];
const options = { checkpointInterval: 13, checkpointBudgetBytes: 8192, maxCheckpoints: 12 };

describe('incremental playback', () => {
  it('matches the original reconstruction at millisecond boundaries, forwards, backwards and after replay', () => {
    expect(run.status).toBe('succeeded');
    const reader = createPlaybackReader(run.events, request.plan, options);
    const ordered = [...times].sort((a, b) => a - b);
    for (const time of [...ordered, ...[...ordered].reverse(), ...ordered]) {
      const expected = referencePlaybackAt(run.events, request.plan, time);
      expect(reader.at(time)).toEqual(expected);
      expect(playbackAt(run.events, request.plan, time)).toEqual(expected);
    }
    expect(reader.diagnostics().checkpointRestores).toBeGreaterThan(0);
  });

  it('applies only new events during forward playback and none during repeated queries', () => {
    const reader = createPlaybackReader(run.events, request.plan, options);
    for (const time of [0, 1, 3, 8, 17.123, 30, 600]) {
      reader.at(time);
      const expected = run.events.filter(event => event.time <= time).length;
      expect(reader.diagnostics().appliedEvents).toBe(expected);
      reader.at(time);
      expect(reader.diagnostics().appliedEvents).toBe(expected);
    }
  });

  it('restores retained checkpoints for backward and forward seeks without replaying the entire prefix', () => {
    const reader = createPlaybackReader(run.events, request.plan, { checkpointInterval: 7, maxCheckpoints: 1000 });
    reader.at(600);
    for (const time of [20, 31, 10, 38, 600]) {
      const before = reader.diagnostics();
      expect(reader.at(time)).toEqual(referencePlaybackAt(run.events, request.plan, time));
      expect(reader.diagnostics().appliedEvents - before.appliedEvents).toBeLessThan(7);
      expect(reader.diagnostics().checkpointRestores).toBeGreaterThan(before.checkpointRestores);
    }
  });

  it('keeps A/B current and trend cursors independent under interleaved random seeks', () => {
    const other = playbackFixture(5, 15); other.plan.id = 'B';
    const second = simulate(other);
    const a = createPlaybackReader(run.events, request.plan, options);
    const b = createPlaybackReader(second.events, other.plan, options);
    let seed = 7321;
    for (let i = 0; i < 100; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const time = seed % 150000 / 1000;
      expect(a.at(time)).toEqual(referencePlaybackAt(run.events, request.plan, time));
      expect(b.at(time - 60, 'trend')).toEqual(referencePlaybackAt(second.events, other.plan, time - 60));
      expect(a.at(time - 60, 'trend')).toEqual(referencePlaybackAt(run.events, request.plan, time - 60));
      expect(b.at(time)).toEqual(referencePlaybackAt(second.events, other.plan, time));
    }
    expect(a.diagnostics().cursorCount).toBe(2);
    const forward = createPlaybackReader(run.events, request.plan, { checkpointBudgetBytes: 0 });
    for (const time of [0, 10, 25, 61, 75]) { forward.at(time); forward.at(time - 60, 'trend'); }
    expect(forward.diagnostics().appliedEvents).toBe(run.events.filter(event => event.time <= 75).length + run.events.filter(event => event.time <= 15).length);
  });

  it('preserves same-time array order, every occupancy state, completions and partial timestamp groups', () => {
    const plan = playbackFixture(1).plan;
    plan.graph.nodes.push({ id: 'hold', type: 'waiting_area', name: 'Hold', layout: { x: 0, y: 1 }, release: { kind: 'until_time', releaseAt: 5 } });
    const events: SimulationEvent[] = [
      { seq: 90, time: 0.001, type: 'HOLD_ENTER', participantId: 'a', nodeId: 'hold' },
      { seq: 80, time: 0.001, type: 'QUEUE_BLOCKED', participantId: 'b', nodeId: 'service-0' },
      { seq: 70, time: 0.001, type: 'QUEUE_ENTER', participantId: 'c', nodeId: 'service-0' },
      { seq: 60, time: 0.001, type: 'QUEUE_ENTER', participantId: 'd', nodeId: 'service-0' },
      { seq: 50, time: 0.001, type: 'SERVICE_START', participantId: 'c', nodeId: 'service-0', resourceUnitIds: ['worker'], details: { members: ['c'] } },
      { seq: 40, time: 0.001, type: 'QUEUE_ENTER', participantId: 'b', nodeId: 'service-0' },
      { seq: 30, time: 0.002, type: 'SERVICE_COMPLETE', participantId: 'c', nodeId: 'service-0' },
      { seq: 20, time: 0.002, type: 'VISITOR_COMPLETE', participantId: 'c', nodeId: 'exit' },
      { seq: 10, time: 0.002, type: 'HOLD_RELEASE', participantId: 'a', nodeId: 'hold' },
      { seq: 9, time: 0.002, type: 'VISITOR_LEAVE', participantId: 'a', nodeId: 'exit' },
      { seq: 8, time: 0.002, type: 'RUN_WARNING', participantId: 'b', nodeId: 'service-0' },
      { seq: 7, time: 0.002, type: 'RESOURCE_CHANGE', resourceUnitIds: ['worker'] },
    ];
    const reader = createPlaybackReader(events, plan, { checkpointInterval: 2 });
    for (const time of [0, 0.001, 0.0015, 0.002, 0.001, 0.002]) expect(reader.at(time)).toEqual(referencePlaybackAt(events, plan, time));
    expect(reader.at(0.001).nodes['service-0']).toEqual({ queued: ['d', 'b'], blocked: [], holding: [], serving: ['c'], completed: 0 });
    expect(reader.at(0.002).nodes.exit.completed).toBe(2);
    for (let length = 0; length <= events.length; length++) {
      reader.update(events.slice(0, length), plan);
      expect(reader.at(1)).toEqual(referencePlaybackAt(events.slice(0, length), plan, 1));
    }
  });

  it('does not mutate returned states or share mutable arrays, events or details with other reads or checkpoints', () => {
    const events: SimulationEvent[] = [
      { seq: 0, time: 0, type: 'SERVICE_START', participantId: 'a', nodeId: 'service-0', resourceUnitIds: ['worker'], details: { members: ['a'], duration: 1 } },
      { seq: 1, time: 1, type: 'SERVICE_COMPLETE', participantId: 'a', nodeId: 'service-0' },
    ];
    const original = structuredClone(events), plan = playbackFixture(1).plan;
    const a = createPlaybackReader(events, plan, { checkpointInterval: 1 });
    const b = createPlaybackReader(events, plan, { checkpointInterval: 1 });
    const first = a.at(0), saved = structuredClone(first);
    a.at(1); a.at(0); a.at(1, 'trend'); b.at(1);
    expect(first).toEqual(saved);
    first.nodes['service-0'].serving.push('pollution');
    first.nodes['service-0'].completed = 100;
    first.visitors.a.time = 999;
    first.visitors.a.resourceUnitIds!.push('pollution');
    (first.visitors.a.details!.members as string[]).push('pollution');
    for (const reader of [a, b]) for (const lane of ['current', 'trend'] as const) expect(reader.at(0, lane)).toEqual(saved);
    expect(events).toEqual(original);
  });

  it('matches real holding, blocking, service and exit events after checkpoint restores with a reordered plan', () => {
    const held = playbackFixture(1, 18);
    const service = held.plan.graph.nodes[1];
    if (service.type !== 'service' || service.duration.kind !== 'fixed') throw new Error('fixture');
    service.duration.value = 10; service.maxConcurrent = 1; service.queueCapacity = 1;
    held.plan.graph.nodes.push({ id: 'hold', type: 'waiting_area', name: 'Hold', layout: { x: 0, y: 1 }, release: { kind: 'until_time', releaseAt: 10 } });
    held.plan.graph.edges[0].target = 'hold';
    held.plan.graph.edges.push({ id: 'release', source: 'hold', target: 'service-0' });
    const result = simulate(held);
    expect(result.status).toBe('succeeded');
    for (const type of ['HOLD_ENTER', 'HOLD_RELEASE', 'QUEUE_BLOCKED', 'QUEUE_ENTER', 'SERVICE_START', 'SERVICE_COMPLETE', 'VISITOR_COMPLETE']) expect(result.events.some(event => event.type === type)).toBe(true);
    const reordered = structuredClone(held.plan); reordered.graph.nodes.reverse();
    const reader = createPlaybackReader(result.events, reordered, { checkpointInterval: 5 });
    const points = [...new Set(result.events.map(event => event.time))];
    for (const time of [...points, ...points.reverse()]) expect(reader.at(time)).toEqual(referencePlaybackAt(result.events, held.plan, time));
    expect(reader.diagnostics().checkpointRestores).toBeGreaterThan(0);
  });

  it.each([0, 1, 200, 4096])('respects a %i-byte checkpoint buffer budget and still reconstructs evicted history', budget => {
    const reader = createPlaybackReader(run.events, request.plan, { checkpointInterval: 1, checkpointBudgetBytes: budget, maxCheckpoints: 3 });
    for (const time of [600, 30, 0, 40, 2, 600]) {
      expect(reader.at(time)).toEqual(referencePlaybackAt(run.events, request.plan, time));
      expect(reader.diagnostics().checkpointBytes).toBeLessThanOrEqual(budget);
      expect(reader.diagnostics().checkpointCount).toBeLessThanOrEqual(3);
    }
    if (budget < request.plan.graph.nodes.length * 8) expect(reader.diagnostics().checkpointCount).toBe(0);
  });

  it('invalidates both lanes and checkpoints on update even for the same array and plan identities', () => {
    const events = structuredClone(run.events), plan = structuredClone(request.plan);
    const reader = createPlaybackReader(events, plan, options);
    reader.at(600); reader.at(500, 'trend');
    events.splice(20); plan.graph.nodes.reverse();
    reader.update(events, plan);
    expect(reader.diagnostics()).toMatchObject({ appliedEvents: 0, checkpointBytes: 0, checkpointCount: 0, cursorCount: 0 });
    expect(reader.at(600)).toEqual(referencePlaybackAt(events, plan, 600));
    const different = playbackFixture(1, 3), result = simulate(different);
    reader.update(result.events, different.plan);
    expect(reader.at(600, 'trend')).toEqual(referencePlaybackAt(result.events, different.plan, 600));
    expect(reader.at(600).nodes['service-2']).toBeUndefined();
  });

  it('handles empty logs, non-finite query times and real engine budget-aborted partial logs', () => {
    const aborted = simulate({ ...request, maxEvents: 37 });
    expect(aborted.status).toBe('aborted'); expect(aborted.events).toHaveLength(37);
    for (const events of [[], aborted.events]) {
      const reader = createPlaybackReader(events, request.plan, options);
      for (const time of [-Infinity, -1, 0, 0.001, 30, 600, Infinity, NaN, 0, 600]) expect(reader.at(time)).toEqual(referencePlaybackAt(events, request.plan, time));
    }
  });

  it('releases retained state on disposal and rejects use after disposal', () => {
    const reader = createPlaybackReader(run.events, request.plan, options);
    const retained = reader.at(20), copy = structuredClone(retained);
    reader.at(600, 'trend'); reader.dispose(); reader.dispose();
    expect(reader.diagnostics()).toEqual({ disposed: true, appliedEvents: 0, checkpointRestores: 0, checkpointBytes: 0, checkpointCount: 0, cursorCount: 0 });
    expect(() => reader.at(1)).toThrow('disposed');
    expect(() => reader.update([], request.plan)).toThrow('disposed');
    expect(retained).toEqual(copy);
  });

  it.each([{ checkpointInterval: 0 }, { checkpointInterval: 0.5 }, { checkpointBudgetBytes: -1 }, { checkpointBudgetBytes: Infinity }, { maxCheckpoints: NaN }])('rejects invalid memory/interval options %j', invalid => {
    expect(() => createPlaybackReader(run.events, request.plan, invalid)).toThrow(RangeError);
  });
});
