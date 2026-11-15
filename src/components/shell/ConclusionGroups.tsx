import { useI18n } from '../../i18n';
import { DeltaBadge } from './DeltaBadge';
import { conclusionGroups } from './comparisonMetrics';
import type { ComparisonMetric } from './comparisonMetrics';

export function ConclusionGroups({ metrics, onEvidence }: { metrics: ComparisonMetric[]; onEvidence?: () => void }) {
  const { t } = useI18n();
  const labels = { gain: t.reportUi.gains, regression: t.reportUi.regressions, cost: t.reportUi.costs };
  return <div className="conclusion-groups">
    {onEvidence && <button type="button" className="text-btn" onClick={onEvidence}>{t.review.evidence}</button>}
    {conclusionGroups(metrics).map(group => <section key={group.kind} className={`conclusion-${group.kind}`}>
      <h4>{labels[group.kind]}</h4>
      {group.metrics.length ? <ul>{group.metrics.map(item => <li key={item.id}>{item.label} <DeltaBadge metric={item.metric} a={item.a} b={item.b} format={item.format} /></li>)}</ul> : <p>{t.reportUi.none}</p>}
    </section>)}
  </div>;
}
