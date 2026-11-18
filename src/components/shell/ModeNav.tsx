import { Columns2, Hammer, Play } from 'lucide-react';
import { useI18n } from '../../i18n';
export type Mode = 'Build' | 'Rehearse' | 'Compare';
export const MODES = [{ mode: 'Build', icon: Hammer }, { mode: 'Rehearse', icon: Play }, { mode: 'Compare', icon: Columns2 }] as const;
export function ModeNav({ mode, busy, compareUnavailable, onMode }: { mode: Mode; busy: boolean; compareUnavailable?: string; onMode: (mode: Mode) => void }) {
  const { t } = useI18n();
  return <nav className="mode-switch" role="tablist" aria-label={t.modes.label}>
    {MODES.map(({ mode: item, icon: Icon }) => <button type="button" role="tab" aria-selected={mode === item} key={item} className={mode === item ? 'active' : ''} disabled={busy} aria-disabled={busy || (item === 'Compare' && !!compareUnavailable)} aria-describedby={busy || (item === 'Compare' && compareUnavailable) ? 'mode-unavailable' : undefined} onClick={() => onMode(item)}><Icon size={15} aria-hidden="true" /><span>{t.modes[item]}</span></button>)}
  </nav>;
}
