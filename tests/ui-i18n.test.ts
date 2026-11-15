import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { MESSAGES } from '../src/i18n/messages';

describe('comparison language parity', () => {
  it.each(['CompareReport.tsx', 'Journey.tsx', 'comparisonText.ts'])('%s uses the message catalogue', file => {
    const source = readFileSync(new URL(`../src/components/${file}`, import.meta.url), 'utf8');
    expect(source).not.toMatch(/lang\s*===/);
    expect(source).not.toMatch(/[\u4e00-\u9fff]/);
  });
  it('joins lists without adding punctuation to a single item', () => {
    expect(MESSAGES.en.list.join(['A', 'B'])).toBe('A, B');
    expect(MESSAGES.zh.list.join(['A', 'B'])).toBe('A、B');
    for (const t of Object.values(MESSAGES)) {
      expect(t.list.join(['A'])).toBe('A'); expect(t.list.join([])).toBe('');
    }
  });
  it.each([0, 0.1, 59.9, 60, 123.456, 7200])('keeps the same displayed digits for %s', value => {
    for (const format of ['formatWait', 'formatPersonTime', 'formatHours'] as const) {
      const numbers = (text: string) => text.replaceAll(',', '').match(/-?\d+(?:\.\d+)?/g);
      expect(numbers(MESSAGES.en[format](value))).toEqual(numbers(MESSAGES.zh[format](value)));
    }
  });
  it('keeps matching report and parameter-copy keys in both languages', () => {
    for (const group of ['reportUi', 'changeUi', 'list'] as const) expect(Object.keys(MESSAGES.en[group])).toEqual(Object.keys(MESSAGES.zh[group]));
  });
});
