import { describe, expect, it } from 'vitest';
import { comparisonContext, completedWaiting, firstDifference, journeyOf, waitingAt } from '../../src/features/analysis';
import { openingPreview } from '../../src/components/OpeningPage';
import { queueScale } from '../../src/components/queueScale';
import { comparisonReport, createPackingExperiment, initialDocument } from '../../src/features/project';
import { MESSAGES } from '../../src/i18n/messages';
import type { RunRequest } from '../../src/schemas';
import { simulate } from '../../src/simulation/engine';
import { playbackAt } from '../../src/simulation/playback';

const project = initialDocument();
const [a, b] = project.plans.map(plan => simulate({ schemaVersion: 1, plan, scenario: project.scenarios[0], runMode: 'run_to_completion' }));

describe('comparison context', () => {
  it('matches the opening display to recorded open-house queues, journeys and cutoff outcomes', () => {
    const runs = [a, b], preview = openingPreview;
    const journeys = runs.map(run => journeyOf(run, preview.visitor, run.statistics!.until));
    expect(firstDifference(journeys[0], journeys[1], a.request.plan, b.request.plan)?.time).toBe(preview.divergence);
    expect(journeys.map(journey => journey.segments.filter(segment => segment.end > segment.start).map(segment => [segment.kind, segment.start, segment.end, segment.nodeId]))).toEqual(preview.lanes);
    expect(runs.map(run => waitingAt(playbackAt(run.events, run.request.plan, preview.divergence), 'checkin'))).toEqual(preview.queue);
    expect(queueScale(runs.map(run => ({ ...run, completion: null })))).toBe(preview.queueScale);
    expect(runs.map(run => run.statistics!.outcomes.completed)).toEqual(preview.completed);
    const { better, worse, same, excluded } = comparisonContext(a, b, 'cutoff').counts!;
    expect([better, worse, same]).toEqual(preview.groups);
    expect(excluded).toBe(preview.excluded);
  });
  it('carries identities, rule, population and actual boundaries through the shared selectors', () => {
    const context = comparisonContext(a, b, 'cutoff');
    expect(context).toMatchObject({ status: 'ready', basis: 'cutoff', rule: 'at-least-one-minute', population: 'paired-arrived', sampleSize: 300 });
    for (const [index, run] of [a, b].entries()) expect(context.sides[index]).toMatchObject({
      planId: run.request.plan.id, name: run.request.plan.name, inputKey: run.inputKey, scenarioKey: run.scenarioKey, modelVersion: run.modelVersion,
      until: 1800, arrived: 300, notArrived: 0, unpaired: 0, runLimit: false,
    });
    expect(context.counts).toMatchObject({ better: 9, worse: 9, same: 276, excluded: 6 });
    expect(context.select('less')).toHaveLength(9);
    expect(context.picks().find(group => group.key === 'less')!.total).toBe(9);
    expect(comparisonContext(a, b, 'cutoff', 0)).toMatchObject({ rule: 'any-change', counts: { better: 63, worse: 26, same: 205, excluded: 6 } });
    const final = comparisonContext(a, b, 'completion');
    expect(final.sides.every(side => side?.until === 7200 && side.runLimit)).toBe(true);
    expect(comparisonReport(a, b, true, MESSAGES.en, 'cutoff', 60)).toContain(`Scenario SHA-256: ${a.scenarioKey}`);
  });

  it('distinguishes missing, stale and incompatible results without returning a conclusion or selection', () => {
    const cases = [
      comparisonContext(undefined, b, 'cutoff'), comparisonContext(a, b, 'cutoff', 60, false),
      comparisonContext(a, { ...b, completion: null }, 'completion'),
      ...[{ ...b, modelVersion: 'other' }, { ...b, scenarioKey: 'other' }, { ...b, status: 'aborted' as const },
        { ...b, request: { ...b.request, runMode: 'cutoff' as const } }].map(other => comparisonContext(a, other, 'cutoff')),
    ];
    expect(cases.map(context => context.status)).toEqual(['missing-run', 'stale', 'missing-final', 'incompatible', 'incompatible', 'incompatible', 'incompatible']);
    for (const context of cases) {
      expect(context.a).toBeNull(); expect(context.b).toBeNull(); expect(context.counts).toBeNull();
      expect(context.select()).toEqual([]); expect(context.picks()).toEqual([]); expect(context.selectedVisitor('side-stream:10')).toBe('');
    }
  });

  it('keeps only mutually arrived matching IDs and explicitly counts the excluded population', () => {
    const sample = a.statistics!.visitors[0];
    const left = [{ ...sample, id: 'both' }, { ...sample, id: 'only-a' }, { ...sample, id: 'unmatched-a' },
      { ...sample, id: 'only-b', outcome: 'not_arrived' as const }, { ...sample, id: 'neither', outcome: 'not_arrived' as const }];
    const right = [{ ...sample, id: 'both' }, { ...sample, id: 'only-b' }, { ...sample, id: 'unmatched-b' },
      { ...sample, id: 'only-a', outcome: 'not_arrived' as const }, { ...sample, id: 'neither', outcome: 'not_arrived' as const }];
    const context = comparisonContext({ ...a, statistics: { ...a.statistics!, arrived: 3, outcomes: { ...a.statistics!.outcomes, not_arrived: 2 }, visitors: left } },
      { ...b, statistics: { ...b.statistics!, arrived: 3, outcomes: { ...b.statistics!.outcomes, not_arrived: 2 }, visitors: right } }, 'cutoff');
    expect(context.visitors.map(visitor => visitor.id)).toEqual(['both']);
    expect(context.sides.map(side => [side!.arrived, side!.notArrived, side!.unpaired])).toEqual([[3, 2, 2], [3, 2, 2]]);
    expect(context.selectedVisitor('unmatched-a')).toBe('both');
    expect(context.selectedVisitor('both', 'less')).toBe('');
  });

  it('retains a valid selection and consistently replaces or clears it after threshold/scope changes', () => {
    const any = comparisonContext(a, b, 'cutoff', 0), minute = comparisonContext(a, b, 'cutoff', 60);
    const minor = any.select('less').find(pair => pair.delta > -60)!;
    expect(minor).toBeDefined();
    expect(minute.select('less').some(pair => pair.id === minor.id)).toBe(false);
    expect(any.selectedVisitor(minor.id, 'less')).toBe(minor.id);
    expect(minute.selectedVisitor(minor.id, 'less')).toBe(minute.select('less')[0].id);
    expect(comparisonContext(a, a, 'cutoff').selectedVisitor('main-stream:20', 'less')).toBe('');
    expect(comparisonContext(a, b, 'completion').selectedVisitor('not-a-guest')).not.toBe('not-a-guest');
  });
});

it('includes early departures and unfinished waiting in the primary sample, with hand-calculated secondary samples', () => {
  const request: RunRequest = { schemaVersion: 1, runMode: 'run_to_completion',
    scenario: { id: 's', seed: 42, observationCutoff: 15, horizon: 25, attributes: [], assumptionOverrides: [], arrivalStreams: [
      { id: 'guests', kind: 'records', provenance: { kind: 'synthetic' }, records: [0, 0, 0, 100].map((arrivalTime, id) => ({ id: `p${id}`, arrivalTime, attributes: {} })) },
    ] },
    plan: { id: 'p', name: 'Hand calculation', scenarioId: 's', skills: [], staff: [], deviceTypes: [], assignments: [], graph: {
      nodes: [
        { id: 'in', name: 'In', type: 'entrance', layout: { x: 0, y: 0 }, arrivalStreamIds: ['guests'] },
        { id: 'serve', name: 'Serve', type: 'service', layout: { x: 200, y: 0 }, stageKey: 'serve', maxConcurrent: 1, requirements: [],
          duration: { kind: 'fixed', value: 10, provenance: { kind: 'synthetic' } }, openWindows: [] },
        { id: 'out', name: 'Out', type: 'exit', layout: { x: 400, y: 0 } },
      ], edges: [{ id: 'enter', source: 'in', target: 'serve' }, { id: 'exit', source: 'serve', target: 'out' }],
    } },
  };
  const unfinished = simulate(request);
  expect(unfinished.statistics).toMatchObject({ arrived: 3, averageWaiting: 25 / 3, p90Waiting: 15, outcomes: { completed: 1, unfinished: 2, not_arrived: 1 } });
  expect(completedWaiting(unfinished.statistics!)).toEqual({ n: 1, average: 0, p90: 0 });
  expect(unfinished.completion).toMatchObject({ until: 25, averageWaiting: 10, p90Waiting: 20, outcomes: { completed: 2, unfinished: 1, not_arrived: 1 } });
  expect(completedWaiting(unfinished.completion!)).toEqual({ n: 2, average: 5, p90: 10 });
  const node = request.plan.graph.nodes[1];
  if (node.type !== 'service') throw new Error('fixture');
  node.openWindows = [{ openAt: 0, closeAt: 5, provenance: { kind: 'synthetic' } }];
  node.closePolicy = { queued: { kind: 'dismiss' }, late: { kind: 'reject' } };
  const departed = simulate(request);
  expect(departed.statistics).toMatchObject({ arrived: 3, averageWaiting: 10 / 3, p90Waiting: 5, outcomes: { completed: 1, dismissed: 2, not_arrived: 1 } });
  expect(completedWaiting(departed.statistics!)).toEqual({ n: 1, average: 0, p90: 0 });
  request.scenario.arrivalStreams = [{ id: 'guests', kind: 'records', provenance: { kind: 'synthetic' }, records: [{ id: 'late', arrivalTime: 100, attributes: {} }] }];
  const empty = simulate(request);
  expect(empty.statistics).toMatchObject({ arrived: 0, averageWaiting: null, p90Waiting: null });
  expect(completedWaiting(empty.statistics!)).toEqual({ n: 0, average: null, p90: null });
});

it('copies current packing skills, shifts and unavailability without changing A/B or arrivals', () => {
  const document = initialDocument(), source = document.plans[1];
  source.staff.find(staff => staff.id === 'pack-staff')!.unavailability = [{ start: 600, end: 660 }];
  const before = structuredClone(document);
  const c = createPackingExperiment(source, new Set(document.plans.map(plan => plan.id)), MESSAGES.en)!;
  expect(document).toEqual(before);
  const original = source.staff.find(staff => staff.id === 'pack-staff')!;
  expect(c.staff.at(-1)).toMatchObject({ skillIds: original.skillIds, shifts: original.shifts, unavailability: original.unavailability });
  expect(c.assignments.slice(0, -1)).toEqual(source.assignments);
  expect(c.graph).toEqual(source.graph); expect(c.deviceTypes).toEqual(source.deviceTypes);
});
