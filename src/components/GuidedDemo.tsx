import { useI18n } from '../i18n';

export interface DemoProgress { step: number; a: string; b: string; c?: string; visitor?: string; exported?: boolean }

export function GuidedDemo({ progress, ready, busy, onNext, onReset, onRerun, onExit, onPacking, onResources }: {
  progress: DemoProgress; ready: boolean; busy: boolean; onNext: () => void; onReset: () => void; onRerun: () => void; onExit: () => void;
  onPacking: () => void; onResources: () => void;
}) {
  const { t } = useI18n();
  const g = t.guide;
  return <section className="guided-demo" aria-label={g.title}>
    <div className="guide-heading"><strong>{progress.step + 1}/{g.steps.length} · {g.steps[progress.step]}</strong><p>{g.brief[progress.step]}</p></div>
    <div className="guide-actions">
      <button type="button" className="btn accent small" disabled={busy || !ready} onClick={onNext}>{g.actions[progress.step]}</button>
      <details className="guide-options" onKeyDown={event => { if (event.key === 'Escape') { event.currentTarget.open = false; event.currentTarget.querySelector('summary')?.focus(); } }}><summary>{t.header.more}</summary><div className="guide-options-body" onClick={event => { if ((event.target as HTMLElement).closest('button')) { const details = event.currentTarget.closest('details')!; details.open = false; details.querySelector('summary')?.focus(); } }}>
        <p>{g.hints[progress.step]}</p>
        {progress.step >= 4 && <p>{g.mapping}</p>}
        {progress.step === 3 && <button type="button" className="btn small" disabled={!ready || busy} onClick={onPacking}>{g.packing}</button>}
        {progress.step >= 4 && <button type="button" className="btn small" disabled={!ready || busy} onClick={onResources}>{g.resources}</button>}
        <button type="button" className="text-btn" disabled={busy} onClick={onRerun}>{g.rerun}</button>
        <button type="button" className="text-btn" disabled={busy} onClick={onReset}>{g.reset}</button>
      </div></details>
      <button type="button" className="text-btn" disabled={busy} onClick={onExit}>{g.exit}</button>
    </div>
    {progress.exported && <p role="status">{g.exported}</p>}
    {!ready && !busy && <p role="status">{g.needRun}</p>}
  </section>;
}
