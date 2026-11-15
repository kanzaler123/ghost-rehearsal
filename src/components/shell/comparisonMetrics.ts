import type { costOf } from '../../features/analysis';
import type { Statistics } from '../../simulation/types';
import type { Messages } from '../../i18n';
import { totalWait } from '../../features/analysis';
import { classifyDelta } from './deltaTone';
import type { MetricKey } from './deltaTone';

export type ComparisonCost = ReturnType<typeof costOf>;
export interface ComparisonMetric { id: string; metric: MetricKey; label: string; a: number | null; b: number | null; format: (value: number) => string }

export function comparisonMetrics(a: Statistics, b: Statistics, cost: ComparisonCost, t: Messages): ComparisonMetric[] {
  const left = (stats: Statistics) => stats.outcomes.rejected + stats.outcomes.dismissed + stats.outcomes.diverted + stats.outcomes.loop_limit;
  return [
    { id: 'completed', metric: 'completed', label: t.compare.rows.completed, a: a.outcomes.completed, b: b.outcomes.completed, format: String },
    { id: 'avgWait', metric: 'avgWait', label: t.compare.rows.average, a: a.averageWaiting, b: b.averageWaiting, format: t.formatWait },
    { id: 'left', metric: 'left', label: t.compare.rows.left, a: left(a), b: left(b), format: String },
    { id: 'unfinished', metric: 'unfinished', label: t.compare.rows.unfinished, a: a.outcomes.unfinished, b: b.outcomes.unfinished, format: String },
    { id: 'p90Wait', metric: 'p90Wait', label: t.compare.rows.p90, a: a.p90Waiting, b: b.p90Waiting, format: t.formatWait },
    { id: 'totalWait', metric: 'totalWait', label: t.compare.rows.total, a: totalWait(a), b: totalWait(b), format: t.formatPersonTime },
    { id: 'staff', metric: 'staff', label: t.compare.costStaff, a: cost.staff[0], b: cost.staff[1], format: String },
    ...cost.devices.map(item => ({ id: `devices:${item.id}`, metric: 'devices' as const, label: item.name, a: item.a, b: item.b, format: String })),
    { id: 'staffHours', metric: 'staffHours', label: t.compare.costStaffHours, a: cost.staffHours[0], b: cost.staffHours[1], format: t.formatHours },
    { id: 'deviceHours', metric: 'deviceHours', label: t.compare.costDeviceHours, a: cost.deviceHours[0], b: cost.deviceHours[1], format: t.formatHours },
    { id: 'overtime', metric: 'overtime', label: t.compare.costOvertime, a: cost.overtime[0], b: cost.overtime[1], format: t.formatWait },
  ];
}

export function conclusionGroups(metrics: ComparisonMetric[]) {
  return (['gain', 'regression', 'cost'] as const).map(kind => ({ kind, metrics: metrics.filter(item => classifyDelta(item.metric, item.a, item.b, item.format).cls === kind) }));
}
