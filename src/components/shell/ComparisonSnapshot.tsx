import type { Statistics } from '../../simulation/types';
import { useI18n } from '../../i18n';
import { DeltaBadge } from './DeltaBadge';
import { classifyDelta, metricText } from './deltaTone';
import { comparisonMetrics } from './comparisonMetrics';
import type { ComparisonCost } from './comparisonMetrics';

export function ComparisonSnapshot({ a, b, cost }: { a: Statistics; b: Statistics; cost: ComparisonCost }) {
  const { t } = useI18n();
  const metrics = comparisonMetrics(a, b, cost, t);
  const resources = metrics.slice(6);
  return <div className="report-snapshot" aria-label={t.reportUi.snapshot}>
    {metrics.slice(0, 6).map(item => <div className="snapshot-item" key={item.id}>
      <span>{item.label}</span><strong><DeltaBadge metric={item.metric} a={item.a} b={item.b} format={item.format} /></strong>
      <small>{t.compare.a} {metricText(item.a, item.format)} → {t.compare.b} {metricText(item.b, item.format)}</small>
    </div>)}
    <div className="snapshot-item resource-summary"><span>{t.reportUi.resourceCost}</span>
      <ul>{resources.map(item => <li key={item.id}><span>{item.label}</span><span>{t.compare.a} {metricText(item.a, item.format)} → {t.compare.b} {metricText(item.b, item.format)}{classifyDelta(item.metric, item.a, item.b, item.format).cls !== 'none' && <> <DeltaBadge metric={item.metric} a={item.a} b={item.b} format={item.format} /></>}</span></li>)}</ul>
    </div>
  </div>;
}
