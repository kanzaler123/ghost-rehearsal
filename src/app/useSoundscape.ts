import { useCallback, useEffect, useRef, useState } from 'react';
import { audioSupported, createSoundEngine, INITIAL_CUE_STATE, planCues } from '../features/soundscape';
import type { SoundEngine } from '../features/soundscape';

interface Options {
  playing: boolean; time: number; reducedMotion: boolean;
  riftTime?: number | null; finishTimes?: readonly number[]; hot: boolean;
}

/** Sound is off until the user turns it on, and it stays silent under reduced motion or without Web Audio. */
export function useSoundscape({ playing, time, reducedMotion, riftTime, finishTimes, hot }: Options) {
  const [on, setOn] = useState(false);
  const engine = useRef<SoundEngine | undefined>(undefined);
  const previous = useRef(time);
  const state = useRef(INITIAL_CUE_STATE);
  const available = !reducedMotion && audioSupported();
  const enabled = on && available;
  useEffect(() => {
    const result = planCues({ enabled, playing, from: previous.current, to: time, riftTime, finishTimes, hot }, state.current);
    previous.current = time; state.current = result.state;
    for (const cue of result.cues) engine.current?.play(cue);
  }, [time]);
  useEffect(() => () => engine.current?.close(), []);
  const toggle = useCallback(() => {
    if (!available) return;
    if (on) { setOn(false); engine.current?.close(); engine.current = undefined; return; }
    // Created inside the click so the browser's autoplay rules allow it.
    engine.current = createSoundEngine();
    engine.current.resume();
    setOn(true);
  }, [available, on]);
  return { on: enabled, available, toggle };
}
