import { simulate } from '../../simulation/engine';
import { transformScenario } from './conditions';
import { emptySummary, summarizeRun } from './summarize';
import type { Job, JobSummary, PreparedBatch } from './types';

export function runJob(batch: PreparedBatch, job: Job): JobSummary {
  try {
    const scenario = transformScenario(batch.project.scenarios.find(item => item.id === batch.scenarioId)!, job.seed,
      batch.config.conditions.find(item => item.id === job.conditionId)!);
    const run = simulate({ schemaVersion: batch.project.schemaVersion, scenario,
      plan: batch.project.plans.find(item => item.id === job.planId)!, runMode: 'cutoff', maxEvents: batch.config.maxEvents });
    return summarizeRun(batch, job, run);
  } catch (error) {
    return emptySummary(batch, job, 'failed', [{ code: 'job_exception', severity: 'error',
      message: error instanceof Error ? error.message : String(error), entityIds: [job.planId], path: [] }]);
  }
}

export function runBatch(batch: PreparedBatch, onStarted: (job: Job) => void, onSummary: (row: JobSummary) => void): void {
  for (const job of batch.jobs) {
    onStarted(job);
    onSummary(runJob(batch, job));
  }
}
