import { describe, expect, it } from 'vitest';
import { addEvent, createPackingExperiment, experimentProject, initialDocument, readProject } from '../src/features/project';
import { MESSAGES } from '../src/i18n/messages';
import { serializeDocument } from '../src/schemas';
import { simulate } from '../src/simulation/engine';

function fixture() {
  const original = initialDocument();
  const project = addEvent(original, initialDocument());
  const [a, b] = project.plans.slice(-2);
  const c = createPackingExperiment(b, new Set(project.plans.map(plan => plan.id)), MESSAGES.en)!;
  project.plans.push(c);
  return { original, project, ids: [a.id, b.id, c.id] };
}

describe('guide experiment export', () => {
  it('excludes unrelated events and round-trips all three plans without changing the workbench', () => {
    const { original, project, ids } = fixture();
    const before = serializeDocument(project);
    const canonical = readProject(before).document!;
    const exported = experimentProject(project, ids)!;
    expect(exported.plans.map(plan => plan.id).sort()).toEqual([...ids].sort());
    expect(exported.scenarios).toHaveLength(1);
    expect(exported.scenarios[0].id).not.toBe(original.scenarios[0].id);
    expect(exported.plans.find(plan => plan.id === ids[2])!.sourcePlanId).toBe(ids[1]);
    const roundTrip = readProject(serializeDocument(exported)).document!;
    expect(roundTrip).toEqual(exported);
    for (const plan of roundTrip.plans) {
      const originalPlan = canonical.plans.find(item => item.id === plan.id)!;
      expect(plan).toEqual(originalPlan);
      const scenario = canonical.scenarios.find(item => item.id === plan.scenarioId)!;
      expect(roundTrip.scenarios.find(item => item.id === scenario.id)).toEqual(scenario);
      const beforeRun = simulate({ schemaVersion: 1, plan: originalPlan, scenario, runMode: 'run_to_completion' });
      const afterRun = simulate({ schemaVersion: 1, plan, scenario: roundTrip.scenarios[0], runMode: 'run_to_completion' });
      expect(afterRun.statistics).toEqual(beforeRun.statistics);
      expect(afterRun.completion).toEqual(beforeRun.completion);
    }
    expect(serializeDocument(project)).toBe(before);
  });

  it('rejects incomplete selections instead of exporting a misleading partial experiment', () => {
    const { project, ids } = fixture();
    expect(experimentProject(project, [])).toBeUndefined();
    expect(experimentProject(project, [...ids, 'missing'])).toBeUndefined();
    expect(experimentProject(project, [ids[0], ids[0]])).toBeUndefined();
    expect(experimentProject({ ...project, scenarios: [] }, ids)).toBeUndefined();
  });
});
