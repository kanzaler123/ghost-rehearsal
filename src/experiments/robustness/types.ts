import type { ProjectDocument, ValidationIssue } from '../../schemas';
import type { Outcome } from '../../simulation/types';

export interface Condition { id: string; label: string; multiplier: number }
export interface ExperimentConfig {
  baselinePlanId: string;
  candidatePlanIds: string[];
  seeds: number[];
  conditions: Condition[];
  maxEvents?: number;
}
export interface Job { id: string; seed: number; conditionId: string; planId: string }
export interface PreparedBatch {
  batchId: string;
  project: ProjectDocument;
  config: ExperimentConfig;
  scenarioId: string;
  jobs: Job[];
}
export type JobStatus = 'succeeded' | 'failed' | 'aborted' | 'canceled' | 'not-run';
export interface ResourceSummary {
  staffHours: number;
  deviceHours: number;
  overtimeSeconds: number;
  busySeconds: number;
  idleSeconds: number;
  unavailableSeconds: number;
  handoverSeconds: number;
  offShiftSeconds: number;
  unassignedSeconds: number;
}
export interface JobSummary extends Job {
  batchId: string;
  status: JobStatus;
  basis: 'cutoff';
  modelVersion: string;
  inputKey: string | null;
  scenarioKey: string | null;
  coveredUntil: number | null;
  statisticsUntil: number | null;
  outcomes: Record<Outcome, number> | null;
  arrived: number | null;
  averageWaiting: number | null;
  p90Waiting: number | null;
  totalWaiting: number | null;
  earlyLeaving: number | null;
  staffCount: number;
  deviceCount: number;
  resource: ResourceSummary | null;
  issues: ValidationIssue[];
}
export interface Distribution { n: number; median: number | null; min: number | null; max: number | null }
export interface PairDelta {
  seed: number;
  completed: number;
  unfinished: number;
  earlyLeaving: number;
  averageWaiting: number | null;
  p90Waiting: number | null;
  staffCount: number;
  deviceCount: number;
  staffHours: number;
  deviceHours: number;
  overtimeSeconds: number;
}
export type StatusCounts = Record<JobStatus, number>;
export interface AggregateGroup {
  conditionId: string;
  baselinePlanId: string;
  candidatePlanId: string;
  basis: 'cutoff';
  statisticsUntil: number;
  plannedPairs: number;
  validPairs: number;
  pairs: PairDelta[];
  deltas: Record<Exclude<keyof PairDelta, 'seed'>, Distribution>;
  completionCounts: { more: number; same: number; less: number };
  waitingCounts: { less: number; same: number; more: number; unavailable: number };
  baselineStatusCounts: StatusCounts;
  candidateStatusCounts: StatusCounts;
  statusCounts: StatusCounts;
}
