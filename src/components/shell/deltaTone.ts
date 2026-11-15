export type MetricKey = 'completed' | 'unfinished' | 'left' | 'avgWait' | 'p90Wait' | 'totalWait' | 'staff' | 'devices' | 'staffHours' | 'deviceHours' | 'overtime';
export type DeltaClass = 'gain' | 'regression' | 'cost' | 'none' | 'unavailable';
export interface DeltaResult { cls: DeltaClass; delta: number | null; sign: '+' | '−' | ''; belowPrecision: boolean }
export const ZERO_EPS = 1e-9;
export function metricText(value: number | null | undefined, format: (value: number) => string): string {
  return value == null || !Number.isFinite(value) ? '—' : format(value);
}
export function classifyDelta(metric: MetricKey, a: number | null | undefined, b: number | null | undefined, display: (value: number) => string): DeltaResult {
  if (a == null || b == null || !Number.isFinite(a) || !Number.isFinite(b) || !Number.isFinite(b - a)) return { cls: 'unavailable', delta: null, sign: '', belowPrecision: false };
  const delta = b - a;
  if (Math.abs(delta) < ZERO_EPS) return { cls: 'none', delta: 0, sign: '', belowPrecision: false };
  const cost = ['staff', 'devices', 'staffHours', 'deviceHours', 'overtime'].includes(metric);
  const cls = metric === 'completed' ? delta > 0 ? 'gain' : 'regression' : delta < 0 ? 'gain' : cost ? 'cost' : 'regression';
  return { cls, delta, sign: delta > 0 ? '+' : '−', belowPrecision: display(a) === display(b) };
}
