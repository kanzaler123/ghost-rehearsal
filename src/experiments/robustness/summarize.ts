import type { ValidationIssue } from '../../schemas';
import { MODEL_VERSION } from '../../simulation/input';
import type { SimulationRun } from '../../simulation/types';
import type { Job, JobStatus, JobSummary, PreparedBatch, ResourceSummary } from './types';

export function emptySummary(batch: PreparedBatch, job: Job, status: Extract<JobStatus, 'canceled' | 'not-run' | 'failed'>, issues: ValidationIssue[] = []): JobSummary {
  const plan = batch.project.plans.find(item => item.id === job.planId)!;
  return {
    ...job, batchId: batch.batchId, status, basis: 'cutoff', modelVersion: MODEL_VERSION,
    inputKey: null, scenarioKey: null, coveredUntil: null, statisticsUntil: null, outcomes: null,
    arrived: null, averageWaiting: null, p90Waiting: null, totalWaiting: null, earlyLeaving: null,
    staffCount: plan.staff.length, deviceCount: plan.deviceTypes.reduce((sum, device) => sum + device.quantity, 0),
    resource: null, issues: structuredClone(issues),
  };
}

export function summarizeRun(batch: PreparedBatch, job: Job, run: SimulationRun): JobSummary {
  const row = emptySummary(batch, job, 'failed', run.issues);
  row.status = run.status;
  row.modelVersion = run.modelVersion;
  row.inputKey = run.inputKey || null;
  row.scenarioKey = run.scenarioKey || null;
  row.coveredUntil = run.coveredUntil;
  const stats = run.status === 'succeeded' ? run.statistics : null;
  if (!stats) return row;
  row.statisticsUntil = stats.until;
  row.outcomes = { ...stats.outcomes };
  row.arrived = stats.arrived;
  row.averageWaiting = stats.averageWaiting;
  row.p90Waiting = stats.p90Waiting;
  row.totalWaiting = stats.visitors.reduce((sum, visitor) => sum + visitor.waiting, 0);
  row.earlyLeaving = stats.outcomes.rejected + stats.outcomes.dismissed + stats.outcomes.diverted + stats.outcomes.loop_limit;
  const overlap = (windows: { start: number; end: number }[]) => windows.reduce((sum, window) => sum + Math.max(0, Math.min(window.end, stats.until) - Math.max(0, window.start)), 0);
  const resource: ResourceSummary = {
    staffHours: run.request.plan.staff.reduce((sum, staff) => sum + overlap(staff.shifts), 0) / 3600,
    deviceHours: run.request.plan.deviceTypes.reduce((sum, device) => sum + device.quantity * overlap(device.shifts), 0) / 3600,
    overtimeSeconds: 0, busySeconds: 0, idleSeconds: 0, unavailableSeconds: 0, handoverSeconds: 0, offShiftSeconds: 0, unassignedSeconds: 0,
  };
  for (const item of stats.resources) {
    resource.overtimeSeconds += item.overtime;
    resource.busySeconds += item.busy;
    resource.idleSeconds += item.idle;
    resource.unavailableSeconds += item.unavailable;
    resource.handoverSeconds += item.handover;
    resource.offShiftSeconds += item.offShift;
    resource.unassignedSeconds += item.unassigned;
  }
  row.resource = resource;
  return row;
}
