import { afterEach, describe, expect, it, vi } from 'vitest';
import { autoplayAfterRun, motionDuration } from '../src/features/motion';
import { createViewportPlacement } from '../src/features/viewport';
afterEach(() => vi.useRealTimers());
// Feature: rehearsal-studio-ui, Property 11
describe('motion preference only controls presentation', () => {
  it.each([false, true])('uses the correct durations when reduced=%s and respects manual navigation', reduced => {
    vi.useFakeTimers();
    const apply = vi.fn(() => true);
    const placement = createViewportPlacement(apply, { reduced: () => reduced });
    expect(autoplayAfterRun(reduced)).toBe(!reduced);
    expect(motionDuration(reduced, 300)).toBe(reduced ? 0 : 300);
    placement.request('default'); vi.advanceTimersByTime(40);
    expect(apply).toHaveBeenLastCalledWith('default', reduced ? 0 : 300);
    vi.advanceTimersByTime(400); expect(apply).toHaveBeenLastCalledWith('default', 0);
    placement.resize(true); expect(apply).toHaveBeenLastCalledWith('default', 0);
    placement.userMove(); apply.mockClear(); placement.resize(true); vi.runAllTimers(); expect(apply).not.toHaveBeenCalled();
    placement.request('all'); vi.runAllTimers(); expect(apply).toHaveBeenLastCalledWith('all', 0);
  });
});
