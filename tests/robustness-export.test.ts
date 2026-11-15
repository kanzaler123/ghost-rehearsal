import { expect, it } from 'vitest';
import example from '../examples/open-house.json';
import { parseDocument, projectDocumentSchema, validateGraph } from '../src/schemas';
import { simulate } from '../src/simulation/engine';
import { defaultConfig, prepareBatch } from '../src/experiments/robustness/conditions';
import { exportGroup } from '../src/experiments/robustness/export';
import { runJob } from '../src/experiments/robustness/runner';
import { summarizeRun } from '../src/experiments/robustness/summarize';

it('reproduces a nondefault seed and compounded service condition as a legal three-plan workbench project', () => {
  const project = projectDocumentSchema.parse(example);
  const candidate = structuredClone(project.plans[1]);
  candidate.id = 'plan-c'; candidate.name = 'C';
  const staff = structuredClone(candidate.staff.find(item => item.id === 'pack-staff')!);
  staff.id = 'packing-support-1'; candidate.staff.push(staff);
  candidate.assignments.push({ resourceUnitId: staff.id, periods: [{ from: 0, nodeIds: ['packing'] }] });
  project.plans.push(candidate);
  project.scenarios[0].assumptionOverrides = [
    { kind: 'service_multiplier', factor: 1.2 },
    { kind: 'service_multiplier', stageKey: 'packing', factor: 1.1 },
    { kind: 'resource_interruption', resource: { kind: 'staff', id: 'pack-staff' }, window: { start: 300, end: 360 } },
  ];
  const batch = prepareBatch(project, { ...defaultConfig(project), candidatePlanIds: project.plans.slice(1).map(plan => plan.id),
    seeds: [20261121], conditions: [{ id: 'service-125', label: 'Additional ×1.25', multiplier: 1.25 }] }, 'compound');
  const before = structuredClone(batch), original = structuredClone(project);
  const parsed = parseDocument(exportGroup(batch, 20261121, 'service-125'));
  expect(parsed.document).toBeDefined();
  const exported = parsed.document!;
  expect(exported.scenarios).toHaveLength(1); expect(exported.plans).toHaveLength(3);
  const scenario = exported.scenarios[0];
  expect(scenario.seed).toBe(20261121);
  expect(scenario.assumptionOverrides).toEqual([{ kind: 'service_multiplier', factor: 1.5 }, ...project.scenarios[0].assumptionOverrides.slice(1)]);
  for (const job of batch.jobs) {
    const plan = exported.plans.find(item => item.id === job.planId)!;
    expect(plan.scenarioId).toBe(scenario.id);
    expect(validateGraph(scenario, plan).filter(issue => issue.severity === 'error')).toEqual([]);
    const originalRow = runJob(batch, job);
    const replayRun = simulate({ schemaVersion: exported.schemaVersion, scenario, plan, runMode: 'cutoff' });
    const replayRow = summarizeRun(batch, job, replayRun);
    expect(originalRow.status).toBe('succeeded');
    expect(replayRow).toEqual(originalRow);
  }
  expect(batch).toEqual(before); expect(project).toEqual(original);
});
