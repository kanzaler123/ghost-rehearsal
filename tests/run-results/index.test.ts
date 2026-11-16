import { describe, expect, it } from 'vitest';
import { initialDocument } from '../../src/features/project';
import { createRunResults, mapRunResults, removeRunResults, updateRunResults } from '../../src/features/run-results';
import { duplicatePlan, parseDocument, serializeDocument } from '../../src/schemas';
import { simulate } from '../../src/simulation/engine';
import type { SimulationRun } from '../../src/simulation/types';

function fixture() {
  const document = initialDocument();
  document.plans[0].id = 'constructor';
  return document;
}

describe('result lookup for schema-accepted IDs', () => {
  it('opens and restores a constructor plan without inventing a run', () => {
    const document = parseDocument(serializeDocument(fixture())).document!;
    expect(document.plans.some(plan => plan.id === 'constructor')).toBe(true);
    const runs = createRunResults();
    expect(runs.get('constructor')).toBeUndefined();
    expect(runs.get('toString')).toBeUndefined();
    expect(runs.get('__proto__')).toBeUndefined();
    expect(runs.size).toBe(0);
  });

  it('inserts and updates actual runs without mutating earlier state', () => {
    const document = fixture();
    const run = simulate({ schemaVersion: 1, plan: document.plans[0], scenario: document.scenarios[0], runMode: 'cutoff' });
    expect(run.status).toBe('succeeded');
    const empty = createRunResults();
    const first = updateRunResults(empty, [run]);
    const other = { ...run, request: { ...run.request, plan: document.plans[1] } };
    const next = updateRunResults(first, [other, { ...run, coveredUntil: 123 }]);
    expect(empty.size).toBe(0);
    expect(first.get('constructor')).toBe(run);
    expect(next.get('constructor')?.coveredUntil).toBe(123);
    expect(next.get(document.plans[1].id)).toBe(other);
  });

  it.each(['succeeded', 'failed', 'aborted'] as const)('keeps %s results explicit through copy, relabel, delete and restoration', status => {
    const document = fixture();
    const result = simulate({ schemaVersion: 1, plan: document.plans[0], scenario: document.scenarios[0], runMode: 'cutoff' });
    const run: SimulationRun = { ...result, status };
    const runs = createRunResults([run]);
    const copiedIndex = new Map(runs);
    const relabelled = mapRunResults(copiedIndex, previous => ({ ...previous, request: { ...previous.request, plan: { ...previous.request.plan, name: 'Renamed' } } }));
    expect(relabelled.get('constructor')?.status).toBe(status);
    expect(relabelled.get('constructor')?.request.plan.name).toBe('Renamed');
    expect(runs.get('constructor')).toBe(run);
    const duplicate = duplicatePlan(document.plans[0], new Set(document.plans.map(plan => plan.id)));
    if (!duplicate.ok) throw new Error('Fixture duplication failed');
    expect(relabelled.get(duplicate.plan.id)).toBeUndefined();
    const removed = removeRunResults(relabelled, ['constructor', 'absent']);
    expect(removed.get('constructor')).toBeUndefined();
    expect(relabelled.has('constructor')).toBe(true);
    expect(createRunResults([...relabelled.values()]).get('constructor')?.status).toBe(status);
    expect(createRunResults().get('constructor')).toBeUndefined();
  });
});
