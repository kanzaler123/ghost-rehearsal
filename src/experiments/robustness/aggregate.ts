import { milliseconds } from '../../simulation/input';
import type { AggregateGroup, Distribution, JobSummary, PairDelta, PreparedBatch, StatusCounts } from './types';

function distribution(values: (number | null)[]): Distribution {
  const sorted = values.filter((value): value is number => value !== null).sort((a, b) => a - b);
  const n = sorted.length;
  return { n, median: n ? (sorted[Math.floor((n - 1) / 2)] + sorted[Math.floor(n / 2)]) / 2 : null,
    min: n ? sorted[0] : null, max: n ? sorted[n - 1] : null };
}

export function aggregateBatch(batch: PreparedBatch, rows: JobSummary[]): AggregateGroup[] {
  const expected = new Map(batch.jobs.map(job => [job.id, job]));
  const results = new Map(rows.filter(row => {
    const job = expected.get(row.id);
    return row.batchId === batch.batchId && job && row.seed === job.seed && row.conditionId === job.conditionId && row.planId === job.planId;
  }).map(row => [row.id, row]));
  const until = milliseconds(batch.project.scenarios.find(item => item.id === batch.scenarioId)!.observationCutoff) / 1000;
  const complete = (row: JobSummary | undefined): row is JobSummary & { outcomes: NonNullable<JobSummary['outcomes']>; resource: NonNullable<JobSummary['resource']>; earlyLeaving: number } =>
    !!row && row.status === 'succeeded' && row.basis === 'cutoff' && row.statisticsUntil === until && row.coveredUntil !== null
    && row.coveredUntil >= until && row.outcomes !== null && row.resource !== null && row.earlyLeaving !== null;
  const counts = (): StatusCounts => ({ succeeded: 0, failed: 0, aborted: 0, canceled: 0, 'not-run': 0 });
  return [...batch.config.conditions].sort((a, b) => a.id.localeCompare(b.id)).flatMap(condition =>
    [...batch.config.candidatePlanIds].sort().map(candidatePlanId => {
      const pairs: PairDelta[] = [];
      const baselineStatusCounts = counts(), candidateStatusCounts = counts();
      for (const seed of [...batch.config.seeds].sort((a, b) => a - b)) {
        const baseline = results.get(`${condition.id}:${seed}:${batch.config.baselinePlanId}`);
        const candidate = results.get(`${condition.id}:${seed}:${candidatePlanId}`);
        baselineStatusCounts[baseline?.status ?? 'not-run']++;
        candidateStatusCounts[candidate?.status ?? 'not-run']++;
        if (!complete(baseline) || !complete(candidate) || !baseline.scenarioKey || baseline.scenarioKey !== candidate.scenarioKey
          || !baseline.modelVersion || baseline.modelVersion !== candidate.modelVersion) continue;
        pairs.push({ seed,
          completed: candidate.outcomes.completed - baseline.outcomes.completed,
          unfinished: candidate.outcomes.unfinished - baseline.outcomes.unfinished,
          earlyLeaving: candidate.earlyLeaving - baseline.earlyLeaving,
          averageWaiting: candidate.averageWaiting === null || baseline.averageWaiting === null ? null : candidate.averageWaiting - baseline.averageWaiting,
          p90Waiting: candidate.p90Waiting === null || baseline.p90Waiting === null ? null : candidate.p90Waiting - baseline.p90Waiting,
          staffCount: candidate.staffCount - baseline.staffCount, deviceCount: candidate.deviceCount - baseline.deviceCount,
          staffHours: candidate.resource.staffHours - baseline.resource.staffHours,
          deviceHours: candidate.resource.deviceHours - baseline.resource.deviceHours,
          overtimeSeconds: candidate.resource.overtimeSeconds - baseline.resource.overtimeSeconds,
        });
      }
      const deltas = {} as AggregateGroup['deltas'];
      for (const key of ['completed', 'unfinished', 'earlyLeaving', 'averageWaiting', 'p90Waiting', 'staffCount', 'deviceCount', 'staffHours', 'deviceHours', 'overtimeSeconds'] as const) {
        deltas[key] = distribution(pairs.map(pair => pair[key]));
      }
      const statusCounts = counts();
      for (const key of Object.keys(statusCounts) as (keyof StatusCounts)[]) statusCounts[key] = baselineStatusCounts[key] + candidateStatusCounts[key];
      return {
        conditionId: condition.id, baselinePlanId: batch.config.baselinePlanId, candidatePlanId, basis: 'cutoff' as const,
        statisticsUntil: until, plannedPairs: batch.config.seeds.length, validPairs: pairs.length, pairs, deltas,
        completionCounts: { more: pairs.filter(pair => pair.completed > 0).length, same: pairs.filter(pair => pair.completed === 0).length, less: pairs.filter(pair => pair.completed < 0).length },
        waitingCounts: { less: pairs.filter(pair => pair.averageWaiting !== null && pair.averageWaiting < 0).length,
          same: pairs.filter(pair => pair.averageWaiting === 0).length, more: pairs.filter(pair => pair.averageWaiting !== null && pair.averageWaiting > 0).length,
          unavailable: pairs.filter(pair => pair.averageWaiting === null).length },
        baselineStatusCounts, candidateStatusCounts, statusCounts,
      };
    }));
}
