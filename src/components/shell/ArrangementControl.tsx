import { useI18n } from '../../i18n';
import type { Arrangement } from './arrangement';
export function ArrangementControl({ value, narrow, onChange }: { value: Arrangement; narrow: boolean; onChange: (value: Arrangement) => void }) {
  const { t } = useI18n();
  return narrow ? <span className="arrangement-note">{t.arrangement.narrowNote}</span> : <div className="arrangement-control" role="group" aria-label={t.arrangement.label}>
    {(['auto', 'rows', 'cols'] as const).map(item => <button type="button" key={item} aria-pressed={value === item} onClick={() => onChange(item)}>{t.arrangement[item]}</button>)}
  </div>;
}
