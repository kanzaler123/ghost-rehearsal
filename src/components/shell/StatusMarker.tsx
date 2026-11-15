import { useI18n } from '../../i18n';
import { MARKERS } from './markers';
import type { MarkerId } from './markers';

export interface StatusMarkerProps { id: MarkerId; label?: string; compact?: boolean; title?: string }
export function StatusMarker({ id, label, compact, title }: StatusMarkerProps) {
  const { t } = useI18n();
  const marker = MARKERS[id], Icon = marker.icon;
  const text = label ?? (id === 'neutral' ? t.delta.none : id === 'gain' || id === 'regression' || id === 'cost' ? t.delta[id] : t.markers[id]);
  return <span className={`status-marker marker-${marker.shape} tone-${id}${compact ? ' is-compact' : ''}`} style={{ color: `var(${marker.tone})` }} title={title ?? text} aria-label={compact ? text : undefined}>
    <span className="marker-symbol" aria-hidden="true"><Icon size={14} /></span>{!compact && <span>{text}</span>}
  </span>;
}
