import { useEffect, useId, useRef } from 'react';
import { useI18n } from '../i18n';

export interface DemoProgress { step: number; a: string; b: string; c?: string; visitor?: string; exported?: boolean }

export function GuidedDemo({ progress, showPlanMapping, ready, busy, onNext, onReset, onRerun, onExit, onPacking, onResources, onExportProject }: {
  progress: DemoProgress; showPlanMapping: boolean; ready: boolean; busy: boolean; onNext: () => void; onReset: () => void; onRerun: () => void; onExit: () => void;
  onPacking: () => void; onResources: () => void; onExportProject: () => void;
}) {
  const { t } = useI18n();
  const g = t.guide;
  const exportHint = useId();
  const region = useRef<HTMLElement>(null);
  useEffect(() => { region.current?.focus(); }, []);
  return <section ref={region} tabIndex={-1} className="guided-demo" aria-label={g.title}>
    <div className="guide-heading"><strong>{progress.step + 1}/{g.steps.length} · {g.steps[progress.step]}</strong><p>{g.brief[progress.step]}</p></div>
    <div className="guide-actions">
      <button type="button" className="btn accent small" disabled={busy || !ready} onClick={onNext}>{g.actions[progress.step]}</button>
      {progress.step === 5 && <button type="button" className="btn small" disabled={busy || !ready} aria-describedby={exportHint} onClick={onExportProject}>{g.exportProject}</button>}
      <details className="guide-options" onKeyDown={event => { if (event.key === 'Escape') { event.currentTarget.open = false; event.currentTarget.querySelector('summary')?.focus(); } }}><summary>{t.header.more}</summary><div className="guide-options-body" onClick={event => { if ((event.target as HTMLElement).closest('button')) { const details = event.currentTarget.closest('details')!; details.open = false; details.querySelector('summary')?.focus(); } }}>
        <p>{g.hints[progress.step]}</p>
        {progress.step === 3 && <button type="button" className="btn small" disabled={!ready || busy} onClick={onPacking}>{g.packing}</button>}
        {progress.step >= 4 && <button type="button" className="btn small" disabled={!ready || busy} onClick={onResources}>{g.resources}</button>}
        <button type="button" className="text-btn" disabled={busy} onClick={onRerun}>{g.rerun}</button>
        <button type="button" className="text-btn" disabled={busy} onClick={onReset}>{g.reset}</button>
      </div></details>
      <button type="button" className="text-btn" disabled={busy} onClick={onExit}>{g.exit}</button>
    </div>
    {progress.step >= 4 && showPlanMapping && <p className="guide-plan-mapping" role="note">{g.mapping}</p>}
    {progress.step === 5 && <p id={exportHint}>{g.exportProjectHint}</p>}
    {progress.exported && <p role="status">{g.exported}</p>}
    {!ready && !busy && <p role="status">{g.needRun}</p>}
  </section>;
}
