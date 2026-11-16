import { describe, expect, it, vi } from 'vitest';
import type { ServiceNode } from '../src/schemas';
import { keyedDraw, milliseconds, prepareSampler, sample } from '../src/simulation/input';

describe('prepared service sampling', () => {
  it.each([
    { name: 'singleton', samples: [7.12349] },
    { name: 'duplicates and zero', samples: [9, 0, 1.00049, 9, 1.0005, 1.00049] },
    { name: '10000 samples', samples: Array.from({ length: 10000 }, (_, index) => ((index * 7919) % 997) / 100 + 0.00049) },
  ])('keeps every empirical quantile and seeded draw unchanged: $name', ({ samples }) => {
    const duration = { kind: 'empirical' as const, samples, provenance: { kind: 'measured' as const } };
    const before = [...samples];
    const prepared = prepareSampler(duration);
    const sorted = [...samples].sort((a, b) => a - b);
    for (let index = 0; index < samples.length; index++) {
      const u = (index + 0.5) / samples.length;
      expect(prepared(u)).toBe(sorted[index]);
    }
    const draws = [0, 1 - Number.EPSILON, ...Array.from({ length: 30 }, (_, index) => keyedDraw(42, 'service', `guest:${index}`, 'stage', 1))];
    expect(draws.map(prepared)).toEqual(draws.map(u => sample(duration, u)));
    expect(draws.map(u => milliseconds(prepared(u) * 1.25))).toEqual(draws.map(u => milliseconds(sample(duration, u) * 1.25)));
    expect(samples).toEqual(before);
  });

  it('sorts once per prepared empirical snapshot, without retaining mutable sample data', () => {
    const duration = { kind: 'empirical' as const, samples: [3, 1, 2], provenance: { kind: 'measured' as const } };
    const sort = vi.spyOn(Array.prototype, 'sort');
    let prepared: (u: number) => number;
    try {
      prepared = prepareSampler(duration);
      for (let index = 0; index < 100; index++) prepared(index / 100);
      expect(sort).toHaveBeenCalledTimes(1);
    } finally { sort.mockRestore(); }
    duration.samples.fill(10);
    expect(prepared(0)).toBe(1);
    expect(prepareSampler(duration)(0)).toBe(10);
    expect(sample(duration, 0)).toBe(10);
    duration.samples = [50, 20];
    expect(prepareSampler(duration)(0)).toBe(20);
    expect(prepareSampler(duration)(0.75)).toBe(50);
  });

  it.each<ServiceNode['duration']>([
    { kind: 'fixed', value: 1.00049, provenance: { kind: 'synthetic' } },
    { kind: 'uniform', min: 0, max: 20, provenance: { kind: 'synthetic' } },
    { kind: 'triangular', min: 0, mode: 3, max: 20, provenance: { kind: 'synthetic' } },
    { kind: 'triangular', min: 2, mode: 2, max: 2, provenance: { kind: 'synthetic' } },
  ])('preserves $kind sampling', duration => {
    const prepared = prepareSampler(duration);
    for (const u of [0, 0.15, 0.5, 0.9, 1 - Number.EPSILON]) expect(prepared(u)).toBe(sample(duration, u));
  });
});
