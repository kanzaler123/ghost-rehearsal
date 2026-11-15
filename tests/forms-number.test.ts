import { describe, expect, it } from 'vitest';
import { numberDraft, minutesToSeconds, secondsToMinutes } from '../src/components/forms/numberDraft';

describe('number drafts', () => {
  it.each(['', '-', '.', '1e', 'Infinity', 'NaN', '1e999', '0x10'])('rejects incomplete or non-finite %j without producing zero', raw => {
    expect(numberDraft(raw, 0, undefined, 1)).not.toHaveProperty('value');
  });
  it.each([['0.5', 0.1, 0.5], ['0.15', 0.05, 0.15], ['1.5', 0.1, 1.5], ['0.3', 0.1, 0.3]])('accepts decimal %s at step %s', (raw, step, value) => {
    expect(numberDraft(String(raw), 0, undefined, Number(step))).toEqual({ value });
  });
  it('checks inclusive bounds and integer counts', () => {
    expect(numberDraft('1', 1, 10000, 1)).toEqual({ value: 1 });
    expect(numberDraft('10000', 1, 10000, 1)).toEqual({ value: 10000 });
    expect(numberDraft('0', 1, 10000, 1)).toEqual({ error: 'min' });
    expect(numberDraft('10001', 1, 10000, 1)).toEqual({ error: 'max' });
    expect(numberDraft('1.5', 1, 10000, 1)).toEqual({ error: 'step' });
  });
  it('distinguishes optional unset values from zero', () => {
    expect(numberDraft('', 0, undefined, 1, true)).toEqual({ value: undefined });
    expect(numberDraft('0', 0, undefined, 1, true)).toEqual({ value: 0 });
    expect(numberDraft('-', 0, undefined, 1, true)).toEqual({ error: 'number' });
  });
  it('retains four decimal minute display and millisecond conversion', () => {
    expect(secondsToMinutes(90)).toBe(1.5);
    expect(minutesToSeconds(1.5)).toBe(90);
    expect(secondsToMinutes(1)).toBe(0.0167);
    expect(minutesToSeconds(0.0167)).toBe(1.002);
  });
});
