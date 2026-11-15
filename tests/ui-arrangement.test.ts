import { afterEach, describe, expect, it, vi } from 'vitest';
import { effectiveArrangement, parseArrangement } from '../src/components/shell/arrangement';
import { loadArrangement, saveArrangement } from '../src/app/preferences';
afterEach(() => vi.unstubAllGlobals());
// Feature: rehearsal-studio-ui, Properties 9, 10
describe('canvas arrangement preferences', () => {
  it('validates storage and never replaces a wide-screen choice when narrow', () => {
    for (const value of ['auto', 'rows', 'cols'] as const) for (const autoRows of [false, true]) {
      expect(effectiveArrangement(value, true, autoRows)).toBe('rows');
      expect(effectiveArrangement(value, false, autoRows)).toBe(value === 'auto' ? autoRows ? 'rows' : 'cols' : value);
    }
    for (const value of [undefined, null, '', 'horizontal', 'ROWS']) expect(parseArrangement(value)).toBe('auto');
  });
  it('persists the preference and treats inaccessible storage as session-only', () => {
    const data = new Map<string, string>();
    vi.stubGlobal('localStorage', { getItem: (key: string) => data.get(key), setItem: (key: string, value: string) => data.set(key, value) });
    saveArrangement('cols'); expect(loadArrangement()).toBe('cols');
    vi.stubGlobal('localStorage', { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } });
    expect(loadArrangement()).toBe('auto'); expect(() => saveArrangement('rows')).not.toThrow();
  });
});
