import { describe, expect, it } from 'vitest';
import { deriveEmptyState, deriveRunState } from '../src/components/shell/runState';
import { MESSAGES } from '../src/i18n/messages';

// Feature: rehearsal-studio-ui, Property 12
describe('run and contextual state precedence', () => {
  it('always offers stop while computing, regardless of earlier outcomes', () => {
    for (const hasRun of [false, true]) for (const stale of [false, true]) for (const runFailed of [false, true]) {
      expect(deriveRunState({ busy: true, hasRun, stale, runFailed, lastRun: { kind: 'failed', planIds: ['a'] }, planId: 'a' })).toEqual({ kind: 'computing', action: 'stop' });
    }
  });
  it.each(['failed', 'stopped'] as const)('keeps %s distinct from retained results and ignores other plans', kind => {
    const input = { busy: false, hasRun: true, runFailed: false, stale: true, lastRun: { kind, planIds: ['a'] }, planId: 'a' };
    expect(deriveRunState(input)).toEqual({ kind, action: 'rerun' });
    expect(deriveRunState({ ...input, planId: 'b' })).toEqual({ kind: 'stale', action: 'rerun' });
  });
  it('distinguishes no run, a failed result, stale and completed results', () => {
    const input = { busy: false, hasRun: false, runFailed: false, stale: false, lastRun: null, planId: 'a' };
    expect(deriveRunState(input)).toEqual({ kind: 'not-run', action: 'run' });
    expect(deriveRunState({ ...input, runFailed: true })).toEqual({ kind: 'failed', action: 'rerun' });
    expect(deriveRunState({ ...input, hasRun: true, stale: true })).toEqual({ kind: 'stale', action: 'rerun' });
    expect(deriveRunState({ ...input, hasRun: true })).toEqual({ kind: 'complete', action: 'play' });
  });
  it('offers a contextual action for each empty state', () => {
    const input = { rosterEmpty: false, filterActive: false, noDifference: false, evidenceCount: 1 };
    expect(deriveEmptyState(input)).toBeNull();
    expect(deriveEmptyState({ ...input, rosterEmpty: true })).toEqual({ kind: 'empty-roster', action: 'edit-guests' });
    expect(deriveEmptyState({ ...input, rosterEmpty: true, filterActive: true })).toEqual({ kind: 'empty-roster', action: 'clear-filter' });
    expect(deriveEmptyState({ ...input, noDifference: true })).toEqual({ kind: 'no-difference', action: 'choose-rule' });
    expect(deriveEmptyState({ ...input, evidenceCount: 0 })).toEqual({ kind: 'no-evidence', action: 'rerun' });
  });
  it.each(['en', 'zh'] as const)('names all nine states uniquely in %s', lang => {
    const states = Object.values(MESSAGES[lang].runState);
    expect(states).toHaveLength(9);
    expect(new Set(states.map(state => state.label)).size).toBe(9);
    expect(new Set(states.map(state => state.description)).size).toBe(9);
  });
});
