import { expect, it } from 'vitest';
import { layoutGhosts } from '../src/components/ghostRow';
// Feature: rehearsal-studio-ui, Property 7
it('accounts for every present guest and pins a tracked guest even at a zero display limit', () => {
  for (const length of [0, 1, 5, 20]) for (const limit of [0, 1, 3, 8]) for (const tracked of [undefined, 'guest-0', 'guest-4', 'absent']) {
    const guests: [string, string][] = Array.from({ length }, (_, index) => [`guest-${index}`, 'waiting']);
    const result = layoutGhosts(guests, limit, tracked);
    const drawn = [...(result.pinned ? [result.pinned] : []), ...result.shown];
    expect(drawn.length + result.undrawn).toBe(length);
    expect(new Set(drawn.map(([id]) => id)).size).toBe(drawn.length);
    expect(drawn.length).toBeLessThanOrEqual(Math.max(limit, result.pinned ? 1 : 0));
    if (guests.some(([id]) => id === tracked)) expect(drawn[0][0]).toBe(tracked);
  }
});
