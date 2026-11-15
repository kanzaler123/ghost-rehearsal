import { useI18n } from '../../i18n';
import { classifyDelta } from './deltaTone';
import type { MetricKey } from './deltaTone';
import { StatusMarker } from './StatusMarker';

export interface DeltaBadgeProps { metric: MetricKey; a: number | null | undefined; b: number | null | undefined; format: (value: number) => string; label?: string }
export function DeltaBadge({ metric, a, b, format, label }: DeltaBadgeProps) {
  const { t } = useI18n();
  const result = classifyDelta(metric, a, b, format);
  if (result.cls === 'unavailable') return <span className="delta-badge is-unavailable"><span>—</span><small>{t.delta.unavailable}</small></span>;
  return <span className={`delta-badge delta-${result.cls}`} aria-label={label}>
    <b>{result.sign}{format(Math.abs(result.delta!))}</b><StatusMarker id={result.cls === 'none' ? 'neutral' : result.cls} />
    {result.belowPrecision && <small>{t.delta.belowPrecision}</small>}
  </span>;
}
