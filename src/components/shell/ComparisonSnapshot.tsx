import type { Statistics } from '../../simulation/types';
import { useI18n } from '../../i18n';
import { DeltaBadge } from './DeltaBadge';
import { metricText } from './deltaTone';
import { comparisonMetrics } from './comparisonMetrics';
import type { ComparisonCost } from './comparisonMetrics';

export function ComparisonSnapshot({ a, b, cost }: { a: Statistics; b: Statistics; cost: ComparisonCost }) {
  const { t } = useI18n();
  const metrics = comparisonMetrics(a, b, cost, t);
  return <div className="report-snapshot" aria-label={t.reportUi.snapshot}>
    {metrics.slice(0, 3).map(item => <div className="snapshot-item" key={item.id}>
      <span>{item.label}</span><strong><DeltaBadge metric={item.metric} a={item.a} b={item.b} format={item.format} /></strong>
      <small>{t.compare.a} {metricText(item.a, item.format)} → {t.compare.b} {metricText(item.b, item.format)}</small>
    </div>)}
  </div>;
}
