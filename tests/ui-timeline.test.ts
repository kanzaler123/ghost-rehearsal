import { describe, expect, it } from 'vitest';
import { labelFits, segmentExtent } from '../src/components/timelineGeometry';

describe('journey timeline geometry', () => {
  it.each([
    [0, 10, 100, 0, 10], [25, 75, 100, 25, 50], [-10, 20, 100, 0, 20],
    [90, 120, 100, 90, 10], [50, 50, 100, 50, 0], [120, 140, 100, 100, 0],
    [50, 20, 100, 50, 0], [0, 10, 0, 0, 0],
  ])('draws %s–%s over %s without adding time', (start, end, span, left, width) => {
    expect(segmentExtent(start, end, span)).toEqual({ left, width });
  });
  it('keeps label fit monotonic for narrow tracks and both languages', () => {
    for (const label of ['Check in', '登记入口']) {
      const values = [0, 8, 20, 50, 100, 200].map(width => labelFits(label, width));
      expect(values[0]).toBe(false); expect(values.at(-1)).toBe(true);
      expect(values.slice(values.indexOf(true)).every(Boolean)).toBe(true);
    }
    expect(labelFits('Check in', NaN)).toBe(false);
  });
});
