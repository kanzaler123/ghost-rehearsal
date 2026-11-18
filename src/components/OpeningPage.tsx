import { useMemo, useState } from 'react';
import type { CSSProperties, PointerEvent } from 'react';
import { ArrowDown, ArrowRight, CalendarDays, Flashlight, Play } from 'lucide-react';
import { visitorName } from '../features/analysis';
import { formatTime, initialDocument } from '../features/project';
import { localizeDocument, useI18n } from '../i18n';
import type { Lang } from '../i18n';
import { populationSize } from '../simulation/input';
import { Modal } from './Dialogs';
import { Ghost, HauntedBackdrop, NodeIcon, RiftScene } from './Icons';
import { SpectralStageBackdrop } from './SpectralStageBackdrop';
import { queueFill } from './queueScale';
import { StatusMarker } from './shell/StatusMarker';

// Recorded at the open-house observation cutoff; the landing page needs no simulation worker.
export const openingPreview = {
  visitor: 'side-stream:10', divergence: 210, queue: [35, 14], queueScale: 189,
  completed: [43, 41], groups: [9, 9, 276], excluded: 6,
  lanes: [
    [['queue', 77.143, 480, 'checkin'], ['service', 480, 510, 'checkin'], ['hold', 510, 570, 'holding'], ['queue', 570, 1765, 'packing'], ['service', 1765, 1800, 'packing']],
    [['queue', 77.143, 210, 'checkin'], ['service', 210, 240, 'checkin'], ['hold', 240, 280, 'holding'], ['queue', 280, 590, 'packing'], ['service', 590, 635, 'packing'], ['service', 635, 655, 'briefing']],
  ],
} as const;

export function OpeningPage({ reducedMotion, onEnter, onGuide, onLang }: { reducedMotion: boolean; onEnter: () => void; onGuide: () => void; onLang: (lang: Lang) => void }) {
  const { t, lang } = useI18n();
  const copy = t.redesign;
  const example = useMemo(() => localizeDocument(initialDocument(), 'zh', lang), [lang]);
  const scenario = example.scenarios[0], [a, b] = example.plans;
  const guest = visitorName(openingPreview.visitor, a, scenario);
  const cutoff = scenario.observationCutoff;
  const [time, setTime] = useState<number>(openingPreview.divergence);
  const current = openingPreview.lanes[1].find(([, from, to]) => from <= time && time < to);
  const station = current && b.graph.nodes.find(node => node.id === current[3]);
  const guestState = current ? t.journey.segments[current[0]] : time < openingPreview.lanes[1][0][1] ? t.reportUi.notInSystem : t.markers.finished;
  function shiftScene(event: PointerEvent<HTMLElement>) {
    if (reducedMotion || event.pointerType !== 'mouse') return;
    const rect = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty('--stage-x', `${(event.clientX - rect.left) / rect.width - 0.5}`);
    event.currentTarget.style.setProperty('--stage-y', `${(event.clientY - rect.top) / rect.height - 0.5}`);
  }
  const actCopy = [[copy.build, copy.buildText], [copy.rehearse, copy.rehearseText], [copy.compare, copy.compareText]];
  const modes = ['Build', 'Rehearse', 'Compare'] as const;
  return <div className="opening-page">
    <header className="topbar opening-topbar">
      <div className="brand"><div className="brand-mark"><Ghost size={25} /></div><div className="brand-text"><strong>{t.brand.name}</strong><small>{t.brand.tagline}</small></div></div>
      <div className="lang-switch" role="group" aria-label={t.language.label}>{(['en', 'zh'] as const).map(item => <button type="button" key={item} lang={item === 'zh' ? 'zh-CN' : 'en'} aria-pressed={lang === item} className={lang === item ? 'active' : ''} onClick={() => onLang(item)}>{t.language[item]}</button>)}</div>
      <button type="button" className="btn run" onClick={onEnter}>{copy.enter}<ArrowRight size={15} aria-hidden="true" /></button>
    </header>
    <main>
      <section className="opening-hero" onPointerMove={shiftScene} onPointerLeave={event => { event.currentTarget.style.removeProperty('--stage-x'); event.currentTarget.style.removeProperty('--stage-y'); }}>
        <SpectralStageBackdrop tempo={0.55} reducedMotion={reducedMotion} /><HauntedBackdrop />
        <div className="opening-hero-inner">
          <div className="opening-copy"><p className="eyebrow">{copy.eyebrow}</p>
            <h1>{copy.headline}<em>{copy.highlight}</em></h1><p className="opening-introduction">{copy.introduction}</p>
            <div className="opening-actions"><button type="button" className="btn run" onClick={onEnter}><Ghost size={18} />{copy.create}<ArrowRight size={16} aria-hidden="true" /></button>
              <button type="button" className="btn ghost" aria-describedby="opening-guide-hint" onClick={onGuide}><Play size={15} aria-hidden="true" />{copy.begin}</button>
              <span className="sr-only" id="opening-guide-hint">{copy.guideHint}</span>
            </div>
          </div>
          <figure className="opening-window">
            <figcaption><span className="eyebrow">{copy.example}</span><time>{formatTime(openingPreview.divergence)}</time></figcaption>
            <div className="opening-rift"><span className="opening-guest"><Ghost size={14} />{guest}</span><RiftScene /></div>
            <div className="opening-stations">{openingPreview.queue.map((count, side) => <div key={side} className="flow-card type-service st-waiting">
              <span className="haunt-flames" aria-hidden="true"><i /><i /><i /></span>
              <div className="card-head"><span className={`lane-label is-${side ? 'b' : 'a'}`}>{side ? 'B' : 'A'} · {side ? t.compare.b : t.compare.a}</span></div>
              <strong className="card-name"><NodeIcon type="service" size={15} />{a.graph.nodes.find(node => node.id === 'checkin')!.name}</strong>
              <StatusMarker id={side ? 'serve' : 'queue'} label={`${guest} · ${side ? t.markers.serve : t.markers.queue}`} />
              <div className="stage-queue"><span>{t.live.waiting}</span><b>{count}</b></div>
              <div className="queue-load" aria-hidden="true"><span style={{ width: `${queueFill(count, openingPreview.queueScale)}%` }} /></div>
            </div>)}</div>
            <div className="opening-outcome"><span>{t.review.cutoff} · {formatTime(cutoff)}</span><b>{t.metrics.completed} {openingPreview.completed.join(' → ')}</b></div>
          </figure>
        </div>
        <div className="opening-uses"><span>{copy.uses}</span><button type="button" aria-label={copy.acts} onClick={() => document.getElementById('opening-acts')?.scrollIntoView({ behavior: reducedMotion ? 'instant' : 'smooth' })}><ArrowDown size={18} aria-hidden="true" /></button></div>
      </section>
      <div id="opening-acts" className="opening-acts">{modes.map((mode, index) => <section key={mode} className="opening-act">
        <div className="act-copy"><p className="eyebrow"><span>0{index + 1}</span> / {t.modes[mode]}</p><h2>{actCopy[index][0]}</h2><p>{actCopy[index][1]}</p></div>
        {mode === 'Build' && <div className="act-preview opening-flow">
          <svg className="opening-route" viewBox="0 0 300 120" preserveAspectRatio="none" aria-hidden="true"><path className="route-flow" vectorEffect="non-scaling-stroke" d="M25 30H275Q292 30 292 46V74Q292 90 275 90H150" /></svg>
          {(['entrance', 'decision', 'service', 'waiting_area', 'exit'] as const).map(type => <div key={type} className={`flow-card type-${type}`}><span className="card-icon"><NodeIcon type={type} /></span><b>{t.nodeTypes[type]}</b></div>)}
        </div>}
        {mode === 'Rehearse' && <div className="act-preview opening-replay">
          <div className="opening-tracked"><span className="tracked-spotlight" aria-hidden="true" /><Ghost size={36} /><div><b>{guest}</b><p><span className="lane-label is-b">B</span> · {guestState}{station && ` · ${station.name}`}</p></div></div>
          <label className="timeline"><time className="clock-now">{formatTime(time)}</time><input className="scrubber" aria-label={t.dock.timeline} aria-valuetext={t.studioUi.timeline(formatTime(time), formatTime(cutoff))} type="range" min={0} max={cutoff} value={time} style={{ '--p': `${time / cutoff * 100}%` } as CSSProperties} onChange={event => setTime(Number(event.target.value))} /><time>{formatTime(cutoff)}</time></label>
        </div>}
        {mode === 'Compare' && <div className="act-preview opening-report">
          <p className="eyebrow">{copy.example} · {formatTime(cutoff)}</p><b>{t.compare.of(populationSize(scenario))}</b>
          <div className="people-stats">{(['less', 'more', 'same'] as const).map((key, i) => <div key={key} className={i === 0 ? 'good' : i === 1 ? 'bad' : ''}><b>{openingPreview.groups[i]}</b>{t.evidence.groups[key]}</div>)}</div>
          <p className="report-note">{t.evidence.excluded(openingPreview.excluded)}</p>
          <div className="opening-lanes"><b>{guest} · {t.journey.firstDiff} {formatTime(openingPreview.divergence)}</b>{openingPreview.lanes.map((lane, side) => <div className="lane" key={side}><span className={`lane-label is-${side ? 'b' : 'a'}`}>{side ? 'B' : 'A'}</span><div className="lane-track">{lane.map(([kind, from, to, id]) => <span key={from} className={`seg seg-${kind}`} style={{ left: `${from / cutoff * 100}%`, width: `${(to - from) / cutoff * 100}%` }} title={`${b.graph.nodes.find(node => node.id === id)?.name} · ${t.journey.segments[kind]} · ${formatTime(from)}–${formatTime(to)}`} />)}</div></div>)}</div>
          <div className="lane-legend">{(['queue', 'service', 'hold'] as const).map(kind => <span key={kind}><i className={`seg-${kind}`} />{t.journey.segments[kind]}</span>)}</div>
          <p className="opening-cost">{[a, b].map((plan, side) => <span key={plan.id}><b>{side ? 'B' : 'A'}</b> · {t.metrics.teamHint(plan.staff.length, plan.deviceTypes.reduce((total, device) => total + device.quantity, 0))}</span>)}</p>
        </div>}
      </section>)}</div>
    </main>
  </div>;
}

export function TutorialChoice({ currentActivity, onTour, onGuide, onSetup, onClose }: { currentActivity: boolean; onTour: () => void; onGuide: () => void; onSetup: () => void; onClose: () => void }) {
  const { t } = useI18n(), copy = t.redesign;
  return <Modal title={copy.choose} icon={<Ghost size={19} />} onClose={onClose}>
    <div className="modal-body tutorial-choices"><p>{copy.choiceHint}</p>
      {[
        { icon: <Flashlight size={20} />, title: copy.modules, hint: currentActivity ? copy.currentHint : copy.modulesHint, action: onTour },
        { icon: <Ghost size={20} />, title: copy.follow, hint: copy.guideHint, action: onGuide },
        { icon: <CalendarDays size={20} />, title: copy.setup, hint: copy.setupHint, action: onSetup },
      ].map((option, index) => <button type="button" key={option.title} className="option-card" aria-label={option.title} aria-describedby={`tutorial-hint-${index}`} onClick={option.action}><span className="option-icon" aria-hidden="true">{option.icon}</span><span><b>{option.title}</b><small id={`tutorial-hint-${index}`}>{option.hint}</small></span></button>)}
    </div>
  </Modal>;
}
