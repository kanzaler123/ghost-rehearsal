import type { SimulationRun } from '../../simulation/types';

export type RunResults = ReadonlyMap<string, SimulationRun>;

export function createRunResults(results: readonly SimulationRun[] = []): RunResults {
  return new Map(results.map(result => [result.request.plan.id, result]));
}

export function updateRunResults(previous: RunResults, results: readonly SimulationRun[]): RunResults {
  const next = new Map(previous);
  for (const result of results) next.set(result.request.plan.id, result);
  return next;
}

export function removeRunResults(previous: RunResults, planIds: readonly string[]): RunResults {
  const next = new Map(previous);
  for (const id of planIds) next.delete(id);
  return next;
}

export function mapRunResults(previous: RunResults, update: (run: SimulationRun) => SimulationRun): RunResults {
  return createRunResults([...previous.values()].map(update));
}
