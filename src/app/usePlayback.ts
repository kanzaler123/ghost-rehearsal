import { useMemo } from 'react';
import type { Plan, Scenario } from '../schemas';
import { createPlaybackReader } from '../simulation/playback';
import type { SimulationRun } from '../simulation/types';

export function usePlayback(run: SimulationRun | undefined, plan: Plan, scenario: Scenario, scope: string, time: number, trend: boolean) {
  const reader = useMemo(() => createPlaybackReader(run?.events ?? [], run?.request.plan ?? plan), [run, plan, scenario, scope]);
  const view = useMemo(() => reader.at(time), [reader, time]);
  const previous = useMemo(() => trend && run ? reader.at(time - 60, 'trend') : undefined, [reader, run, time, trend]);
  return { view, previous };
}
