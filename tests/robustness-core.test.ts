import { describe, expect, it, vi } from 'vitest';
import example from '../examples/open-house.json';
import { projectDocumentSchema } from '../src/schemas';
import type { ProjectDocument } from '../src/schemas';
import * as engine from '../src/simulation/engine';
import { aggregateBatch } from '../src/experiments/robustness/aggregate';
import { defaultConfig, DEFAULT_CONDITIONS, prepareBatch, transformScenario } from '../src/experiments/robustness/conditions';
import { runBatch, runJob } from '../src/experiments/robustness/runner';
import { emptySummary } from '../src/experiments/robustness/summarize';
import type { ExperimentConfig, JobSummary, PreparedBatch } from '../src/experiments/robustness/types';

const project = () => projectDocumentSchema.parse(example);
function prepare(document = project(), config: Partial<ExperimentConfig> = {}, id = 'batch') {
  return prepareBatch(document, { ...defaultConfig(document), seeds: [20261114], conditions: [DEFAULT_CONDITIONS[0]], ...config }, id);
}
function run(batch: PreparedBatch) {
  const rows: JobSummary[] = [];
  runBatch(batch, () => {}, row => rows.push(row));
  return rows;
}
function withC() {
  const document = project();
  const candidate = structuredClone(document.plans[1]);
  candidate.id = 'plan-c'; candidate.name = 'C';
  const staff = structuredClone(candidate.staff.find(item => item.id === 'pack-staff')!);
  staff.id = 'packing-support-1'; candidate.staff.push(staff);
  candidate.assignments.push({ resourceUnitId: staff.id, periods: [{ from: 0, nodeIds: ['packing'] }] });
  document.plans.push(candidate);
  return document;
}
function deterministic(): ProjectDocument {
  return { format: 'ghost-rehearsal', schemaVersion: 1,
    scenarios: [{ id: 'scenario', seed: 1, observationCutoff: 30, horizon: 60, attributes: [], assumptionOverrides: [],
      arrivalStreams: [{ id: 'guests', kind: 'records', provenance: { kind: 'synthetic' }, records: [
        { id: 'one', arrivalTime: 0, attributes: {} }, { id: 'two', arrivalTime: 0, attributes: {} },
      ] }] }],
    plans: ['a', 'b'].map(id => ({ id, name: id, scenarioId: 'scenario', skills: [], staff: [], deviceTypes: [], assignments: [], graph: {
      nodes: [{ id: 'in', type: 'entrance', name: 'In', layout: { x: 0, y: 0 }, arrivalStreamIds: ['guests'] },
        { id: 'service', type: 'service', name: 'Service', stageKey: 'service', layout: { x: 100, y: 0 }, maxConcurrent: 1, requirements: [], openWindows: [],
          duration: { kind: 'fixed', value: 10, provenance: { kind: 'synthetic' } } },
        { id: 'out', type: 'exit', name: 'Out', layout: { x: 200, y: 0 } }],
      edges: [{ id: 'in-service', source: 'in', target: 'service' }, { id: 'service-out', source: 'service', target: 'out' }],
    } })),
  };
}

describe('robustness configuration and transformation', () => {
  it('lists ten distinct seeds, three relative conditions and sixty jobs by default', () => {
    const document = project(), config = defaultConfig(document), batch = prepareBatch(document, config, 'default');
    expect(config.seeds).toEqual(Array.from({ length: 10 }, (_, index) => 20261114 + index));
    expect(config.conditions.map(condition => condition.multiplier)).toEqual([1, 1.25, 1.5]);
    expect(batch.jobs).toHaveLength(60);
    expect(new Set(batch.jobs.map(job => job.id)).size).toBe(60);
    expect(batch.config.maxEvents).toBe(1000000);
  });
  it('combines only the global multiplier and preserves every other input without mutation', () => {
    const document = project(), scenario = document.scenarios[0];
    scenario.assumptionOverrides = [{ kind: 'service_multiplier', factor: 1.2 },
      { kind: 'service_multiplier', stageKey: 'packing', factor: 1.7 },
      { kind: 'resource_interruption', resource: { kind: 'staff', id: 'pack-staff' }, window: { start: 20, end: 40 } }];
    const before = structuredClone(document);
    const original = transformScenario(scenario, 20261114, DEFAULT_CONDITIONS[0]);
    expect(original).toEqual(scenario);
    const changed = transformScenario(scenario, 20261115, DEFAULT_CONDITIONS[1]);
    expect(changed.assumptionOverrides).toEqual([{ kind: 'service_multiplier', factor: 1.5 }, ...scenario.assumptionOverrides.slice(1)]);
    expect({ ...changed, seed: scenario.seed, assumptionOverrides: scenario.assumptionOverrides }).toEqual(scenario);
    expect(document).toEqual(before);
    scenario.assumptionOverrides[0] = { kind: 'service_multiplier', factor: 90 };
    expect(() => transformScenario(scenario, 1, DEFAULT_CONDITIONS[1])).toThrow(/Schema/);
    for (const multiplier of [0, -1, 101, NaN, Infinity]) expect(() => transformScenario(scenario, 1, { id: 'bad', label: 'Bad', multiplier })).toThrow();
  });
  it('rejects duplicate, out-of-range and empty seeds, invalid candidates and over-budget jobs', () => {
    const document = project(), config = defaultConfig(document);
    for (const seeds of [[], [1, 1], [-1], [1.2], [4294967296], [NaN]]) expect(() => prepare(document, { seeds })).toThrow();
    for (const candidatePlanIds of [[], [config.baselinePlanId], ['missing'], [config.candidatePlanIds[0], config.candidatePlanIds[0]], ['a', 'b', 'c']]) {
      expect(() => prepare(document, { candidatePlanIds })).toThrow();
    }
    expect(() => prepare(document, { seeds: Array.from({ length: 34 }, (_, i) => i), conditions: DEFAULT_CONDITIONS })).toThrow(/200/);
    expect(() => prepare(document, { conditions: [] })).toThrow();
    expect(() => prepare(document, { conditions: [DEFAULT_CONDITIONS[0], DEFAULT_CONDITIONS[0]] })).toThrow();
    expect(() => prepare(document, { maxEvents: 0 })).toThrow();
    expect(() => prepare(document, { seeds: [0, 4294967295] })).not.toThrow();
  });
  it('rejects cross-scenario plans and invalid graphs before starting any job', () => {
    const document = project(), scenario = structuredClone(document.scenarios[0]);
    scenario.id = 'other'; document.scenarios.push(scenario); document.plans[1].scenarioId = 'other';
    expect(() => prepare(document, { candidatePlanIds: [document.plans[1].id] })).toThrow(/scenario/);
    const invalid = project(); invalid.plans[1].graph.edges[0].target = 'missing';
    expect(() => prepare(invalid)).toThrow(/graph/);
  });
  it('keeps a complete detached snapshot of inputs and config', () => {
    const document = project(), config = defaultConfig(document), batch = prepareBatch(document, config, 'snapshot');
    document.plans[0].name = 'changed'; document.scenarios[0].seed = 0; config.seeds[0] = 0;
    expect(batch.project.plans[0].name).not.toBe('changed');
    expect(batch.project.scenarios[0].seed).toBe(20261114); expect(batch.config.seeds[0]).toBe(20261114);
  });
});

describe('real simulation summaries and pairing', () => {
  it('matches the fixed A/B/C cutoff evidence, retaining the adverse B completion and early-leaving changes', () => {
    const document = withC(), batch = prepare(document, { candidatePlanIds: document.plans.slice(1).map(plan => plan.id) });
    const before = structuredClone(batch), rows = run(batch);
    expect(rows.map(row => row.status)).toEqual(['succeeded', 'succeeded', 'succeeded']);
    expect(rows.map(row => row.outcomes!.completed)).toEqual([43, 41, 72]);
    expect(rows.map(row => row.outcomes!.unfinished)).toEqual([253, 253, 218]);
    expect(rows.map(row => row.earlyLeaving)).toEqual([4, 6, 10]);
    [1057.7166666667, 1055.3333333333, 954.0833333333].forEach((value, index) => expect(rows[index].averageWaiting).toBeCloseTo(value));
    expect(rows.map(row => row.p90Waiting)).toEqual([1547.143, 1547.143, 1444.286]);
    expect(rows.map(row => row.staffCount)).toEqual([3, 3, 4]);
    expect(rows.map(row => row.statisticsUntil)).toEqual([1800, 1800, 1800]);
    expect(rows[2].resource!.staffHours - rows[0].resource!.staffHours).toBe(0.5);
    for (const row of rows) {
      expect(row.arrived).toBe(300);
      expect(row.totalWaiting).toBeCloseTo(row.averageWaiting! * row.arrived!);
      expect(row).not.toHaveProperty('events'); expect(row).not.toHaveProperty('visitors'); expect(row).not.toHaveProperty('completion');
    }
    const b = aggregateBatch(batch, rows).find(group => group.candidatePlanId === document.plans[1].id)!;
    expect(b.deltas.completed.median).toBe(-2); expect(b.deltas.earlyLeaving.median).toBe(2);
    expect(b.completionCounts).toEqual({ more: 0, same: 0, less: 1 }); expect(b.waitingCounts.less).toBe(1);
    expect(batch).toEqual(before);
  });
  it('reproduces metrics and fingerprints and is invariant to seed, condition and candidate ordering', () => {
    const document = withC();
    const config = { candidatePlanIds: document.plans.slice(1).map(plan => plan.id), seeds: [20261114, 20261115], conditions: DEFAULT_CONDITIONS.slice(0, 2) };
    const a = prepare(document, config), rows = run(a);
    expect(run(a)).toEqual(rows);
    const reordered = structuredClone(document); reordered.plans.reverse();
    const b = prepare(reordered, { baselinePlanId: a.config.baselinePlanId, candidatePlanIds: [...config.candidatePlanIds].reverse(), seeds: [...config.seeds].reverse(), conditions: [...config.conditions].reverse() });
    const other = run(b), sort = (list: JobSummary[]) => [...list].sort((left, right) => left.id.localeCompare(right.id));
    expect(sort(other)).toEqual(sort(rows)); expect(aggregateBatch(b, other)).toEqual(aggregateBatch(a, rows));
  });
  it('produces zero changes for cloned plans, including deterministic runs under different seeds', () => {
    const batch = prepare(deterministic(), { seeds: [1, 2, 3] });
    const rows = run(batch), [group] = aggregateBatch(batch, rows);
    expect(group.validPairs).toBe(3);
    for (const delta of Object.values(group.deltas)) expect(delta).toEqual({ n: 3, median: 0, min: 0, max: 0 });
    expect(rows.every(row => row.averageWaiting === 5 && row.p90Waiting === 10)).toBe(true);
  });
  it('keeps unavailable waiting null when nobody arrives, with a separate waiting denominator', () => {
    const document = deterministic();
    document.scenarios[0].arrivalStreams = [];
    for (const plan of document.plans) {
      const entrance = plan.graph.nodes.find(node => node.type === 'entrance')!;
      if (entrance.type === 'entrance') entrance.arrivalStreamIds = ['guests'];
    }
    document.scenarios[0].arrivalStreams = [{ id: 'guests', kind: 'records', records: [], provenance: { kind: 'synthetic' } }];
    const batch = prepare(document), rows = run(batch), [group] = aggregateBatch(batch, rows);
    expect(rows.every(row => row.averageWaiting === null && row.p90Waiting === null && row.arrived === 0 && row.totalWaiting === 0)).toBe(true);
    expect(group.validPairs).toBe(1); expect(group.deltas.averageWaiting).toEqual({ n: 0, median: null, min: null, max: null });
    expect(group.waitingCounts).toEqual({ less: 0, same: 0, more: 0, unavailable: 1 });
  });
  it('isolates candidate failures, keeps all failed rows and does not substitute zero for failed metrics', () => {
    const document = withC(), batch = prepare(document, { candidatePlanIds: document.plans.slice(1).map(plan => plan.id) });
    const rows = run(batch);
    rows[1] = emptySummary(batch, batch.jobs[1], 'failed', [{ code: 'failure_fixture', severity: 'error', message: 'Synthetic failure', entityIds: [], path: [] }]);
    const groups = aggregateBatch(batch, rows);
    expect(groups.find(group => group.candidatePlanId === document.plans[1].id)!.validPairs).toBe(0);
    expect(groups.find(group => group.candidatePlanId === 'plan-c')!.validPairs).toBe(1);
    expect(rows[1].outcomes).toBeNull(); expect(rows[1].averageWaiting).toBeNull(); expect(rows[1].resource).toBeNull();
    const failed = batch.jobs.map(job => emptySummary(batch, job, 'failed'));
    expect(failed).toHaveLength(3);
    for (const group of aggregateBatch(batch, failed)) {
      expect(group.validPairs).toBe(0); expect(group.statusCounts.failed).toBe(2); expect(group.deltas.completed.median).toBeNull();
    }
  });
  it('excludes event-limit abortions and retains their issues', () => {
    const batch = prepare(project(), { maxEvents: 1 }), rows = run(batch), [group] = aggregateBatch(batch, rows);
    expect(rows.map(row => row.status)).toEqual(['aborted', 'aborted']);
    expect(rows.every(row => row.outcomes === null && row.statisticsUntil === null && row.issues.some(issue => issue.code === 'max_events_exceeded'))).toBe(true);
    expect(group.validPairs).toBe(0); expect(group.statusCounts.aborted).toBe(2);
  });
  it('does not match different windows, scenario fingerprints, model versions, seeds or batches', () => {
    const batch = prepare(deterministic()), rows = run(batch);
    for (const mutation of [{ statisticsUntil: 60 }, { scenarioKey: 'different' }, { modelVersion: 'different' }, { seed: 2 }, { batchId: 'old' }, { coveredUntil: 10 }]) {
      expect(aggregateBatch(batch, [rows[0], { ...rows[1], ...mutation }])[0].validPairs).toBe(0);
    }
    expect(aggregateBatch(batch, [rows[0], rows[1], rows[1]])[0].validPairs).toBe(1);
  });
  it('reports real engine failures for every job and continues after a thrown per-job error', () => {
    const document = project(), stream = document.scenarios[0].arrivalStreams[0];
    if (stream.kind !== 'total_in_window' && stream.kind !== 'preset_profile') throw new Error('Expected generated stream');
    stream.count = 10001;
    const batch = prepare(document), failed = run(batch);
    expect(failed.every(row => row.status === 'failed' && row.arrived === null && row.issues.some(issue => issue.code === 'prototype_population_limit'))).toBe(true);
    const small = prepare(deterministic()), original = engine.simulate;
    const spy = vi.spyOn(engine, 'simulate').mockImplementation(request => {
      if (request.plan.id === 'a') throw new Error('Synthetic thrown failure');
      return original(request);
    });
    try {
      const rows = run(small);
      expect(rows.map(row => row.status)).toEqual(['failed', 'succeeded']); expect(rows[0].issues[0].code).toBe('job_exception');
    } finally { spy.mockRestore(); }
  });
  it('emits one started message and one compact summary for each ordered job', () => {
    const batch = prepare(deterministic()), progress: string[] = [];
    runBatch(batch, job => progress.push(`start:${job.id}`), row => progress.push(`row:${row.id}`));
    expect(progress).toEqual(batch.jobs.flatMap(job => [`start:${job.id}`, `row:${job.id}`]));
    expect(runJob(batch, batch.jobs[0]).status).toBe('succeeded');
  });
});
