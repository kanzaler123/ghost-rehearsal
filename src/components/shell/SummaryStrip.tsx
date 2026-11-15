import { CircleCheck } from 'lucide-react';
import { useI18n } from '../../i18n';
import type { StripMetric } from './LiveStatusStrip';
export function SummaryStrip({ title, time, metrics, stale }: { title: string; time: string; metrics: StripMetric[]; stale: boolean }) {
  const { t } = useI18n();
  return <section className="metric-group is-final" aria-label={`${title} · ${time}`}><span className="group-label"><CircleCheck size={13} aria-hidden="true" />{title}<time>{time}</time>{stale && <em>{t.metrics.stale}</em>}</span>
    <div className="group-cells">{metrics.map(item => <div className={`metric-card m-${item.key}`} key={item.key} aria-label={`${item.label} · ${title}`}><span className="metric-label">{item.icon}<span className="metric-name">{item.label}</span></span><strong className="metric-value">{item.value}</strong><small className="metric-hint">{item.hint || title}</small></div>)}</div>
  </section>;
}
