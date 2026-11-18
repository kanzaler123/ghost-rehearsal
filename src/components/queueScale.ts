import type { SimulationRun } from '../simulation/types';

/** A queue of this many guests already counts as crowded on a card; gauges never use a smaller scale. */
export const QUEUE_SCALE_FLOOR = 10;

/**
 * One gauge scale shared by every card of the shown runs, so A and B stay comparable.
 * Uses the largest recorded per-node queue (queued + holding) at either statistics basis.
 */
export function queueScale(runs: readonly (SimulationRun | undefined)[]): number {
  let scale = QUEUE_SCALE_FLOOR;
  for (const run of runs) for (const statistics of [run?.statistics, run?.completion]) {
    for (const node of statistics?.nodes ?? []) if (node.maxQueue > scale) scale = node.maxQueue;
  }
  return scale;
}

/** Gauge fill in percent, clamped so aggregated stage queues cannot overflow the track. */
export const queueFill = (waiting: number, scale: number): number => Math.min(100, Math.max(0, waiting / Math.max(scale, 1) * 100));
