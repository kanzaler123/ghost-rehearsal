import { describe, expect, it } from 'vitest';
import { audioSupported, createSoundEngine, EMBER_COOLDOWN, INITIAL_CUE_STATE, isHaunted, MAX_STEP, planCues } from '../src/features/soundscape';
import type { AudioContextLike, CueInput } from '../src/features/soundscape';

const base: CueInput = { enabled: true, playing: true, from: 100, to: 105, hot: false };
const crowd = (queued: number, blocked = 0, holding = 0) => ({ queued: Array(queued).fill('x'), blocked: Array(blocked).fill('x'), holding: Array(holding).fill('x') });

describe('isHaunted', () => {
  it('uses the canvas rule: more than 10 waiting, or anyone blocked', () => {
    expect(isHaunted({ a: crowd(10) })).toBe(false);
    expect(isHaunted({ a: crowd(11) })).toBe(true);
    expect(isHaunted({ a: crowd(6, 0, 5) })).toBe(true);
    expect(isHaunted({ a: crowd(0, 1) })).toBe(true);
    expect(isHaunted({ a: crowd(3), b: crowd(2) })).toBe(false);
    expect(isHaunted({})).toBe(false);
  });
});

describe('planCues', () => {
  it('fires the rift once when forward playback crosses the first difference', () => {
    expect(planCues({ ...base, riftTime: 102 }).cues).toEqual(['rift']);
    expect(planCues({ ...base, riftTime: 105 }).cues).toEqual(['rift']);
    expect(planCues({ ...base, riftTime: 100 }).cues).toEqual([]);
    expect(planCues({ ...base, riftTime: 106 }).cues).toEqual([]);
    expect(planCues({ ...base, riftTime: null }).cues).toEqual([]);
  });
  it('rings the bell when the tracked ghost finishes', () => {
    expect(planCues({ ...base, finishTimes: [90, 104] }).cues).toEqual(['bell']);
    expect(planCues({ ...base, finishTimes: [90, 120] }).cues).toEqual([]);
  });
  it('pulses an ember only on a new haunted state, then respects the cooldown', () => {
    const first = planCues({ ...base, hot: true });
    expect(first.cues).toEqual(['ember']);
    expect(planCues({ ...base, from: 105, to: 110, hot: true }, first.state).cues).toEqual([]);
    const cooled = planCues({ ...base, from: 110, to: 115, hot: false }, first.state);
    const early = planCues({ ...base, from: 115, to: 120, hot: true }, cooled.state);
    expect(early.cues).toEqual([]);
    const later = planCues({ ...base, from: 125, to: 125 + EMBER_COOLDOWN, hot: false }, early.state);
    expect(planCues({ ...base, from: 100 + EMBER_COOLDOWN + 6, to: 100 + EMBER_COOLDOWN + 11, hot: true }, later.state).cues).toEqual(['ember']);
  });
  it('can fire several cues in the same step', () => {
    expect(planCues({ ...base, hot: true, riftTime: 101, finishTimes: [102] }).cues).toEqual(['rift', 'ember', 'bell']);
  });
  it('stays silent when sound is off or replay is paused, but still tracks the haunted state', () => {
    for (const quiet of [{ enabled: false }, { playing: false }]) {
      const result = planCues({ ...base, ...quiet, hot: true, riftTime: 102, finishTimes: [103] });
      expect(result.cues).toEqual([]);
      expect(result.state.wasHot).toBe(true);
    }
  });
  it('stays silent for backwards, zero and scrub-sized steps, and does not burst afterwards', () => {
    expect(planCues({ ...base, from: 105, to: 100, riftTime: 102 }).cues).toEqual([]);
    expect(planCues({ ...base, from: 100, to: 100, riftTime: 100 }).cues).toEqual([]);
    expect(planCues({ ...base, from: 0, to: MAX_STEP + 1, riftTime: 10, finishTimes: [20], hot: true }).cues).toEqual([]);
    expect(planCues({ ...base, from: 0, to: MAX_STEP, riftTime: 10 }).cues).toEqual(['rift']);
    const scrub = planCues({ ...base, from: 0, to: 500, hot: true });
    expect(planCues({ ...base, from: 500, to: 505, hot: true }, scrub.state).cues).toEqual([]);
  });
  it('does not mutate the previous state', () => {
    const before = { ...INITIAL_CUE_STATE };
    planCues({ ...base, hot: true });
    expect(INITIAL_CUE_STATE).toEqual(before);
  });
});

function fakeContext() {
  const log: string[] = [];
  const param = () => ({ value: 0, setValueAtTime: () => log.push('param'), linearRampToValueAtTime: () => undefined, exponentialRampToValueAtTime: () => undefined });
  const node = () => ({ connect: () => undefined });
  class Fake implements AudioContextLike {
    currentTime = 1; state = 'suspended'; destination = {};
    createOscillator() { log.push('osc'); return { ...node(), type: '', frequency: param(), start: () => undefined, stop: () => undefined }; }
    createGain() { return { ...node(), gain: param() }; }
    createBiquadFilter() { return { ...node(), type: '', frequency: param() }; }
    resume() { log.push('resume'); return Promise.resolve(); }
    close() { log.push('close'); return Promise.resolve(); }
  }
  return { Fake, log };
}

describe('createSoundEngine', () => {
  it('is a silent no-op without Web Audio', () => {
    const engine = createSoundEngine({});
    expect(engine.available).toBe(false);
    expect(audioSupported({})).toBe(false);
    expect(() => { engine.resume(); engine.play('rift'); engine.close(); }).not.toThrow();
  });
  it('falls back to webkitAudioContext and plays every cue with oscillators only', () => {
    const { Fake, log } = fakeContext();
    const engine = createSoundEngine({ webkitAudioContext: Fake });
    expect(engine.available).toBe(true);
    expect(audioSupported({ webkitAudioContext: Fake })).toBe(true);
    engine.resume();
    for (const cue of ['rift', 'ember', 'bell'] as const) engine.play(cue);
    engine.close();
    expect(log.filter(entry => entry === 'osc')).toHaveLength(2 + 2 + 2);
    expect(log).toContain('resume'); expect(log).toContain('close');
  });
  it('never throws when the constructor, resume or playback is blocked', () => {
    class Blocked { constructor() { throw new Error('blocked'); } }
    const engine = createSoundEngine({ AudioContext: Blocked as never });
    expect(() => { engine.resume(); engine.play('bell'); engine.close(); }).not.toThrow();
    class Broken extends fakeContext().Fake { createOscillator(): never { throw new Error('nope'); } resume() { return Promise.reject(new Error('denied')); } }
    const broken = createSoundEngine({ AudioContext: Broken });
    expect(() => { broken.resume(); broken.play('ember'); }).not.toThrow();
  });
});
