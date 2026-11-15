import { describe, expect, it } from 'vitest';
import { classifyDelta, metricText } from '../src/components/shell/deltaTone';
import type { MetricKey } from '../src/components/shell/deltaTone';

// Feature: rehearsal-studio-ui, Properties 1, 2, 3
describe('unrounded changes and unavailable measurements', () => {
  const metrics: MetricKey[] = ['completed', 'unfinished', 'left', 'avgWait', 'p90Wait', 'totalWait', 'staff', 'devices', 'staffHours', 'deviceHours', 'overtime'];
  it.each(metrics)('%s keeps its direction when display rounding hides a difference', metric => {
    const cost = ['staff', 'devices', 'staffHours', 'deviceHours', 'overtime'].includes(metric);
    const up = classifyDelta(metric, 10, 10.001, value => value.toFixed(1));
    expect(up).toMatchObject({ cls: metric === 'completed' ? 'gain' : cost ? 'cost' : 'regression', sign: '+', belowPrecision: true });
    const down = classifyDelta(metric, 10.001, 10, String);
    expect(down).toMatchObject({ cls: metric === 'completed' ? 'regression' : 'gain', sign: '−', belowPrecision: false });
    expect(classifyDelta(metric, 10, 10, String)).toEqual({ cls: 'none', delta: 0, sign: '', belowPrecision: false });
    expect(classifyDelta(metric, 10, 10.001, String).cls).toBe(up.cls);
  });
  it.each([null, undefined, NaN, Infinity, -Infinity])('does not display unavailable %s as zero', value => {
    expect(metricText(value, value => `${value.toFixed(1)} min`)).toBe('—');
    expect(metricText(0, value => `${value.toFixed(1)} min`)).toBe('0.0 min');
    expect(classifyDelta('avgWait', value, 0, String)).toMatchObject({ cls: 'unavailable', delta: null });
    expect(classifyDelta('staffHours', 0, value, String)).toMatchObject({ cls: 'unavailable', delta: null });
  });
});
