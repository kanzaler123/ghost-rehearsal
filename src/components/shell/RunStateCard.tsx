import { useI18n } from '../../i18n';
import { StatusMarker } from './StatusMarker';
import type { MarkerId } from './markers';
import type { EmptyStateKind, RunStateKind, StateAction } from './runState';

export interface RunStateCardProps { kind: RunStateKind | EmptyStateKind; action: StateAction; busy?: boolean; detail?: string; detailClassName?: string; onAction: () => void; secondary?: { label: string; onClick: () => void } }
const icons: Record<RunStateKind | EmptyStateKind, MarkerId> = { 'not-run': 'neutral', computing: 'running', complete: 'finished', stopped: 'left', failed: 'failed', stale: 'stale', 'empty-roster': 'neutral', 'no-difference': 'diff', 'no-evidence': 'error' };
export function RunStateCard({ kind, action, detail, detailClassName, onAction, secondary }: RunStateCardProps) {
  const { t } = useI18n();
  return <section className={`run-state-card state-${kind}`} data-state={kind} aria-label={t.runState[kind].label}>
    <div className="run-state-copy"><StatusMarker id={icons[kind]} label={t.runState[kind].label} /><p>{t.runState[kind].description}</p>{detail && <p className={detailClassName}>{detail}</p>}</div>
    <div className="run-state-actions"><button type="button" className="btn primary small" onClick={onAction}>{t.runStateActions[action]}</button>{secondary && <button type="button" className="text-btn" onClick={secondary.onClick}>{secondary.label}</button>}</div>
  </section>;
}
