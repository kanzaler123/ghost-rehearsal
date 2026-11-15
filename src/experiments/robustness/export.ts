import { serializeDocument, validateDocument, validateGraph } from '../../schemas';
import { MODEL_VERSION } from '../../simulation/input';
import { aggregateBatch } from './aggregate';
import { transformScenario } from './conditions';
import type { BatchState } from './client';
import type { PreparedBatch } from './types';

export function exportBatch(state: BatchState): string {
  return JSON.stringify({
    format: 'ghost-rehearsal-robustness', version: 1,
    batchId: state.batch.batchId, status: state.status === 'running' ? 'partial' : state.status,
    executionStatus: state.status, startedAt: state.startedAt, finishedAt: state.finishedAt, error: state.error ?? null,
    modelVersion: MODEL_VERSION, basis: 'cutoff', project: state.batch.project, config: state.batch.config,
    scenarioId: state.batch.scenarioId, jobs: state.batch.jobs, rows: state.rows,
    runConfiguration: { runMode: 'cutoff', maxEvents: state.batch.config.maxEvents ?? 1000000, maxSteps: 1000, maxJobs: 200 },
    transformRule: 'relative-global-service-multiplier-v1: replace the existing global factor with original factor * condition.multiplier; preserve stage overrides and all other inputs; set seed',
    aggregates: aggregateBatch(state.batch, state.rows),
    units: { waiting: 'seconds', resourceTime: 'hours except *Seconds fields', counts: 'people or resource units' },
  }, null, 2) + '\n';
}

export function exportGroup(batch: PreparedBatch, seed: number, conditionId: string): string {
  if (!batch.config.seeds.includes(seed)) throw new Error('Seed is not in this batch');
  const condition = batch.config.conditions.find(item => item.id === conditionId);
  if (!condition) throw new Error('Condition is not in this batch');
  const source = batch.project.scenarios.find(item => item.id === batch.scenarioId)!;
  const scenario = transformScenario(source, seed, condition);
  const ids = [batch.config.baselinePlanId, ...batch.config.candidatePlanIds];
  const document = { ...structuredClone(batch.project), scenarios: [scenario],
    plans: structuredClone(batch.project.plans.filter(plan => ids.includes(plan.id))) };
  const issues = [...validateDocument(document), ...document.plans.flatMap(plan => validateGraph(scenario, plan))];
  if (issues.some(issue => issue.severity === 'error')) throw new Error(issues.map(issue => issue.message).join('\n'));
  return serializeDocument(document);
}
