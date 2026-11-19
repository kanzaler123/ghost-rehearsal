import { Braces, ChevronDown, CircleHelp, Download, FileText, Redo2, Save, Square, Undo2, Upload } from 'lucide-react';
import type { RunRequest } from '../../schemas';
import { useI18n } from '../../i18n';
import type { Lang } from '../../i18n';
import { Ghost } from '../Icons';
import { ContextMenu } from './ContextMenu';
import { ModeNav } from './ModeNav';
import type { Mode } from './ModeNav';

export interface TopBarProps {
  mode: Mode; busy: boolean; canUndo: boolean; canRedo: boolean; unsaved: boolean; draftSaved: boolean; activityName: string; planName: string; compareUnavailable?: string; runMode: RunRequest['runMode']; lang: Lang;
  onMode: (mode: Mode) => void; onUndo: () => void; onRedo: () => void; onRun: () => void; onStop: () => void; onSave: () => void; onImport: () => void; onExport: () => void; onPlanJson: () => void; onScenarioJson: () => void; onAbout: () => void; onRunMode: (mode: RunRequest['runMode']) => void; onLang: (lang: Lang) => void;
  onTour?: () => void; onOpening?: () => void;
}
/** One bar for identity, modes and the run itself; the run scope sits next to the button it configures. */
export function TopBar(props: TopBarProps) {
  const { t } = useI18n();
  const context = t.topbar.context(props.activityName, props.planName);
  const brand = <><div className="brand-mark"><Ghost size={22} /></div><div className="brand-text"><strong>{t.brand.name}</strong><small>{t.brand.tagline}</small></div></>;
  return <header className="topbar">
    {props.onOpening ? <button type="button" className="brand brand-home" aria-label={t.redesign.backHome} title={t.redesign.backHome} onClick={props.onOpening}>{brand}</button> : <div className="brand">{brand}</div>}
    <span className="context-chip" tabIndex={0} title={context} aria-label={context}>{context}</span>
    <ModeNav mode={props.mode} busy={props.busy} compareUnavailable={props.compareUnavailable} onMode={props.onMode} />
    <div className="topbar-spacer" />
    <div className="command-group">
      <button type="button" className="icon-btn" title={t.header.undo} aria-label={t.header.undo} disabled={!props.canUndo || props.busy} onClick={props.onUndo}><Undo2 size={17} /></button>
      <button type="button" className="icon-btn" title={t.header.redo} aria-label={t.header.redo} disabled={!props.canRedo || props.busy} onClick={props.onRedo}><Redo2 size={17} /></button>
      <span className="divider" />
      <label className="select-pill small run-scope" title={t.run.scope}><select aria-label={t.run.scope} value={props.runMode} disabled={props.busy} onChange={event => props.onRunMode(event.target.value as RunRequest['runMode'])}><option value="cutoff">{t.run.cutoff}</option><option value="run_to_completion">{t.run.completion}</option></select><ChevronDown size={12} aria-hidden="true" /></label>
      {props.busy ? <button type="button" className="btn run is-busy" onClick={props.onStop}><Square size={13} aria-hidden="true" />{t.run.stop}</button> : <button type="button" className="btn run" onClick={props.onRun}><Ghost size={16} />{t.run.start}</button>}
    </div>
    <div className="file-group">
      <button type="button" className="btn ghost" onClick={props.onSave} title={t.header.saveTitle}><Save size={15} aria-hidden="true" /><span>{t.header.save}</span></button>
      <span className="save-state">{props.unsaved ? props.draftSaved ? t.review.draftSaved : t.header.unsaved : t.header.saved}</span>
      <ContextMenu label={t.header.more} className="workspace-menu">
        <button type="button" className="side-action" onClick={props.onImport}><Upload size={15} aria-hidden="true" />{t.header.import}</button>
        <button type="button" className="side-action" onClick={props.onExport}><Download size={15} aria-hidden="true" />{t.header.export}</button>
        <button type="button" className="side-action" onClick={props.onPlanJson}><Braces size={15} aria-hidden="true" />{t.sidebar.planJson}</button>
        <button type="button" className="side-action" onClick={props.onScenarioJson}><FileText size={15} aria-hidden="true" />{t.sidebar.scenarioJson}</button>
        {props.onTour && <button type="button" className="side-action" onClick={props.onTour}><CircleHelp size={15} aria-hidden="true" />{t.tour.title}</button>}
        <button type="button" className="side-action" onClick={props.onAbout}><CircleHelp size={15} aria-hidden="true" />{t.header.about}</button>
      </ContextMenu>
    </div>
    <div className="lang-switch" role="group" aria-label={t.language.label}>{(['en', 'zh'] as Lang[]).map(item => <button type="button" key={item} aria-pressed={props.lang === item} className={props.lang === item ? 'active' : ''} onClick={() => props.onLang(item)} lang={item === 'zh' ? 'zh-CN' : 'en'}>{t.language[item]}</button>)}</div>
  </header>;
}
