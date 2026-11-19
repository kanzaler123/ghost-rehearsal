/**
 * Spectral soundscape: tiny synthesized cues for replay moments.
 * Everything is generated with the Web Audio API. There are no audio files and no network requests.
 * `planCues` is pure so Node tests need neither a DOM nor an AudioContext.
 */
export type Cue = 'rift' | 'ember' | 'bell';

/** Largest forward replay step, in scenario seconds, that still counts as playing. Bigger jumps are scrubs. */
export const MAX_STEP = 60;
/** Minimum scenario seconds between two ember pulses. */
export const EMBER_COOLDOWN = 20;
/** Same rule as the canvas: more than 10 waiting, or anyone blocked. */
export const CROWDED_WAITING = 10;

interface StationCrowd { queued: readonly unknown[]; blocked: readonly unknown[]; holding: readonly unknown[] }

/** True when any station is in the haunted (crowded or blocked) state. Waiting counts queued, holding and blocked guests like the canvas. */
export function isHaunted(nodes: Readonly<Record<string, StationCrowd>>): boolean {
  return Object.values(nodes).some(node => node.blocked.length > 0 || node.queued.length + node.holding.length + node.blocked.length > CROWDED_WAITING);
}

export interface CueInput {
  enabled: boolean;
  playing: boolean;
  from: number;
  to: number;
  /** First difference time of the tracked ghost in Two Futures, when there is one. */
  riftTime?: number | null;
  /** Times at which the tracked ghost completes the flow and leaves. */
  finishTimes?: readonly number[];
  /** Whether any station is haunted at `to`. */
  hot: boolean;
}
export interface CueState { wasHot: boolean; lastEmberAt: number }
export const INITIAL_CUE_STATE: CueState = { wasHot: false, lastEmberAt: -Infinity };

const crosses = (time: number | null | undefined, from: number, to: number) => typeof time === 'number' && Number.isFinite(time) && from < time && time <= to;

/** Decides which cues fire for a replay step. Only forward playback with sound on can fire. */
export function planCues(input: CueInput, state: CueState = INITIAL_CUE_STATE): { cues: Cue[]; state: CueState } {
  const { enabled, playing, from, to, hot } = input;
  const next: CueState = { wasHot: hot, lastEmberAt: to < from ? -Infinity : state.lastEmberAt };
  const step = to - from;
  if (!enabled || !playing || !(step > 0) || step > MAX_STEP) return { cues: [], state: next };
  const cues: Cue[] = [];
  if (crosses(input.riftTime, from, to)) cues.push('rift');
  if (hot && !state.wasHot && to - state.lastEmberAt >= EMBER_COOLDOWN) { cues.push('ember'); next.lastEmberAt = to; }
  if (input.finishTimes?.some(time => crosses(time, from, to))) cues.push('bell');
  return { cues, state: next };
}

/* ---------- Synthesis ---------- */
interface AudioParamLike { value: number; setValueAtTime(value: number, time: number): unknown; linearRampToValueAtTime(value: number, time: number): unknown; exponentialRampToValueAtTime(value: number, time: number): unknown }
interface AudioNodeLike { connect(destination: unknown): unknown; disconnect?(): unknown }
interface OscillatorLike extends AudioNodeLike { type: string; frequency: AudioParamLike; start(time?: number): void; stop(time?: number): void }
interface GainLike extends AudioNodeLike { gain: AudioParamLike }
interface FilterLike extends AudioNodeLike { type: string; frequency: AudioParamLike }
export interface AudioContextLike {
  currentTime: number; state?: string; destination: unknown;
  createOscillator(): OscillatorLike; createGain(): GainLike; createBiquadFilter(): FilterLike;
  resume?(): Promise<void>; close?(): Promise<void>;
}
type AudioContextConstructor = new () => AudioContextLike;
export interface AudioEnvironment { AudioContext?: AudioContextConstructor; webkitAudioContext?: AudioContextConstructor }

/** True when the environment exposes an AudioContext constructor. It does not prove the browser will allow audio. */
export const audioSupported = (env: AudioEnvironment = globalThis as AudioEnvironment): boolean => typeof (env.AudioContext ?? env.webkitAudioContext) === 'function';

export interface SoundEngine { readonly available: boolean; resume(): void; play(cue: Cue): void; close(): void }

const SILENT: SoundEngine = { available: false, resume() {}, play() {}, close() {} };

/** Master level is deliberately low: cues are ambience, not alerts. */
const MASTER = 0.5;

/** Creates an engine that never throws. Without a usable AudioContext it is a silent no-op. */
export function createSoundEngine(env: AudioEnvironment = globalThis as AudioEnvironment): SoundEngine {
  const Context = env.AudioContext ?? env.webkitAudioContext;
  if (typeof Context !== 'function') return SILENT;
  let context: AudioContextLike | undefined;
  let master: GainLike | undefined;
  let failed = false;
  const ready = () => {
    if (failed) return null;
    try {
      if (!context) {
        context = new Context();
        master = context.createGain();
        master.gain.value = MASTER;
        master.connect(context.destination);
      }
      return { context, master: master! };
    } catch { failed = true; return null; }
  };
  const tone = (at: AudioContext2, output: AudioNodeLike, frequency: number, start: number, length: number, peak: number, shape: 'soft' | 'ping' = 'soft') => {
    const oscillator = at.context.createOscillator(), gain = at.context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(peak, start + (shape === 'ping' ? 0.01 : length * 0.3));
    gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
    oscillator.connect(gain); gain.connect(output);
    oscillator.start(start); oscillator.stop(start + length + 0.05);
  };
  type AudioContext2 = { context: AudioContextLike; master: GainLike };
  return {
    available: true,
    resume() {
      try { void ready()?.context.resume?.()?.catch?.(() => undefined); } catch { /* sound is optional */ }
    },
    play(cue) {
      try {
        const audio = ready();
        if (!audio) return;
        const now = audio.context.currentTime;
        if (cue === 'rift') {
          // A soft tritone: two sines that do not quite resolve.
          tone(audio, audio.master, 311.13, now, 1.1, 0.18);
          tone(audio, audio.master, 440, now + 0.08, 1.1, 0.14);
        } else if (cue === 'ember') {
          const filter = audio.context.createBiquadFilter();
          filter.type = 'lowpass'; filter.frequency.setValueAtTime(180, now);
          filter.connect(audio.master);
          tone(audio, filter, 55, now, 0.45, 0.5);
          tone(audio, filter, 55, now + 0.28, 0.45, 0.35);
        } else {
          tone(audio, audio.master, 1318.51, now, 1.3, 0.16, 'ping');
          tone(audio, audio.master, 2637.02, now, 0.7, 0.06, 'ping');
        }
      } catch { /* sound is optional */ }
    },
    close() {
      try { const closing = context; context = undefined; master = undefined; void closing?.close?.()?.catch?.(() => undefined); } catch { /* ignore */ }
    },
  };
}
