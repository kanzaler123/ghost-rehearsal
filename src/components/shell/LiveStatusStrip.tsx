import type { ReactNode } from 'react';
import { useI18n } from '../../i18n';
export interface StripMetric { key: string; label: string; icon: ReactNode; value: string; hint?: string }
interface LiveQueue { id: string; name: string; waiting: number }
export function LiveStatusStrip({ time, metrics, available, planName, queues, onQueue }: { time: string; metrics: StripMetric[]; available: boolean; planName?: string; queues?: LiveQueue[]; onQueue?: (id: string) => void }) {
  const { t } = useI18n();
  return <section className="metric-group is-live" aria-label={`${planName ? `${planName} · ` : ''}${t.live.title} · ${time}`}><span className="group-label"><span className="live-dot on" />{planName ? <span title={planName}>{planName}</span> : t.live.title}<time>{t.live.clock(time)}</time></span>
    {available ? <div className="group-cells">{metrics.map(item => <div className={`metric-card m-${item.key}`} key={item.key}><span className="metric-label">{item.icon}<span className="metric-name">{item.label}</span></span><strong className="metric-value">{item.value}</strong></div>)}</div> : <p>{t.studioUi.noReplay}</p>}
    {available && queues && <details className="live-queues"><summary><span>{t.now.bottleneck}</span><small>{queues.length ? `${queues[0].name} · ${queues[0].waiting} ${t.canvas.waiting}` : t.now.none}</small></summary>
      {queues.length ? <ol>{queues.map(queue => <li key={queue.id}><button type="button" className="live-queue" title={`${queue.name} · ${queue.waiting} ${t.canvas.waiting}`} aria-label={`${queue.name} · ${queue.waiting} ${t.canvas.waiting}`} onClick={() => onQueue?.(queue.id)}><span className="live-queue-name">{queue.name}</span><b>{queue.waiting}</b><small>{t.canvas.waiting}</small></button></li>)}</ol> : <p>{t.now.none}</p>}
    </details>}
  </section>;
}
