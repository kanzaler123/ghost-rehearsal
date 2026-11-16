import { useLayoutEffect, useMemo, useState } from 'react';
import type { Plan, Scenario } from '../schemas';
import { createPlaybackReader, playbackAt } from '../simulation/playback';
import type { SimulationRun } from '../simulation/types';

export function usePlayback(run: SimulationRun | undefined, plan: Plan, scenario: Scenario, scope: string, time: number, trend: boolean) {
  const [binding, setBinding] = useState<{ reader: ReturnType<typeof createPlaybackReader>; run: SimulationRun; plan: Plan; scenario: Scenario; scope: string }>();
  useLayoutEffect(() => {
    if (!run || !trend) { setBinding(undefined); return; }
    const reader = createPlaybackReader(run.events, run.request.plan);
    setBinding({ reader, run, plan, scenario, scope });
    return () => reader.dispose();
  }, [run, plan, scenario, scope, trend]);
  const reader = trend && binding?.run === run && binding?.plan === plan && binding?.scenario === scenario && binding?.scope === scope ? binding.reader : undefined;
  return useMemo(() => ({
    view: reader ? reader.at(time) : playbackAt(trend ? run?.events ?? [] : [], run?.request.plan ?? plan, time),
    previous: trend && run ? reader ? reader.at(time - 60, 'trend') : playbackAt(run.events, run.request.plan, time - 60) : undefined,
  }), [reader, run, plan, time, trend]);
}
