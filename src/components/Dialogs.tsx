import { useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';
import { CalendarDays, Plus, X } from 'lucide-react';
import { deviceUnitIds, validatePlan, validateScenario } from '../schemas';
import type { Plan, ProjectDocument, Scenario } from '../schemas';
import { emptyProject, halloweenProject, newId } from '../features/project';
import { issueText, useI18n } from '../i18n';
import type { Lang } from '../i18n';
import { Field, MinuteInput, NumberInput } from './Inspector';
import { NumericInput } from './forms/NumericInput';
import { minutesToSeconds, secondsToMinutes } from './forms/numberDraft';
import { modalControls, useModalFocus } from './forms/modalFocus';
import { updateProvenance } from '../features/data-sources';
import { ArrivalDataEditor } from './data-sources/ArrivalDataEditor';
import { ProvenanceFields } from './data-sources/ProvenanceFields';
import { dataSourceText } from './data-sources/text';
import './forms/forms.css';
import { Ghost } from './Icons';

export function Modal({ title, children, onClose, wide = false, icon }: { title: string; children: ReactNode; onClose: () => void; wide?: boolean; icon?: ReactNode }) {
  const { t } = useI18n();
  const ref = useRef<HTMLDialogElement>(null);
  useModalFocus(ref);
  return createPortal(<dialog ref={ref} aria-modal="true" aria-label={title} className={`modal forms-modal ${wide ? 'wide' : ''}`}
    onCancel={event => { if (event.target === event.currentTarget) { event.preventDefault(); onClose(); } }}
    onKeyDown={event => {
      event.stopPropagation();
      if (event.key === 'Escape') { event.preventDefault(); onClose(); }
      if (event.key === 'Tab') {
        const controls = modalControls(event.currentTarget);
        const first = controls[0], last = controls.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    }}>
      <div className="modal-header">{icon && <span className="modal-icon">{icon}</span>}<h2>{title}</h2><button type="button" className="icon-btn" aria-label={t.common.closeDialog} onClick={onClose}><X size={18} /></button></div>
      {children}
  </dialog>, document.body);
}

export function JsonEditor({ title, value, onApply, onClose, readOnly = false }: { title: string; value: unknown; onApply: (value: unknown) => string | undefined; onClose: () => void; readOnly?: boolean }) {
  const { t } = useI18n();
  const [text, setText] = useState(JSON.stringify(value, null, 2));
  const [error, setError] = useState('');
  return <Modal title={title} onClose={onClose} wide>
    <div className="modal-body json-body">
    <p className="dialog-description">{t.dialogs.jsonDescription}</p>
    <textarea aria-label={t.dialogs.jsonLabel} className="json-editor" spellCheck={false} value={text} readOnly={readOnly} onChange={event => setText(event.target.value)} />
    <p role="alert" className="form-error">{error}</p>
    </div>
    <div className="modal-footer"><button type="button" className="btn ghost" onClick={onClose}>{t.common.close}</button>{!readOnly && <button type="button" className="btn primary" onClick={() => { try { const message = onApply(JSON.parse(text)); if (message) setError(message); else onClose(); } catch { setError(t.dialogs.jsonMalformed); } }}>{t.dialogs.checkApply}</button>}</div>
  </Modal>;
}

export function EventCreator({ onCreate, onExample, onGuide, onImport, onCancelImport, onClose, importError, onLang }: { importError?: string; onCreate: (document: ProjectDocument) => void; onExample: () => void; onGuide?: () => void; onImport: () => void; onCancelImport?: () => void; onClose: () => void; onLang: (lang: Lang) => void }) {
  const { t, lang } = useI18n();
  const [name, setName] = useState('');
  const [guests, setGuests] = useState(100);
  const [duration, setDuration] = useState(30);
  const [arrivalWindow, setArrivalWindow] = useState(10);
  const [preset, setPreset] = useState<'blank' | 'haunted' | 'candy'>('blank');
  const importErrorId = useId();
  const guideHintId = useId();
  const [error, setError] = useState('');
  return <Modal title={t.eventSetup.title} icon={<CalendarDays size={19} />} onClose={onClose}>
    <form onSubmit={event => {
      event.preventDefault();
      const document = preset === 'blank' ? emptyProject(t.defaults) : halloweenProject(preset, t);
      const scenario = document.scenarios[0];
      scenario.name = name.trim(); scenario.observationCutoff = duration * 60; scenario.horizon = Math.max(duration * 60, 7200);
      scenario.arrivalStreams = [{ id: 'arrival-1', kind: 'total_in_window', count: guests, start: 0, end: arrivalWindow * 60, spacing: 'even', attributeDistributions: {}, provenance: { kind: 'user_estimate' } }];
      const errors = validateScenario(scenario).filter(issue => issue.severity === 'error');
      if (errors.length) { setError(errors.map(issue => issueText(issue, lang)).join('\n')); return; }
      onCreate(document);
    }}>
      <div className={onGuide ? 'modal-body welcome-layout' : 'modal-body'}>
        {onGuide && <section className="welcome-story">
          <span className="eyebrow">{t.redesign.eyebrow}</span>
          <h1>{t.redesign.headline}</h1><p>{t.redesign.introduction}</p>
          <button type="button" className={`btn ${name.trim() ? '' : 'primary'} welcome-start`} aria-describedby={guideHintId} onClick={onGuide}>{t.redesign.begin}<span aria-hidden="true">↗</span></button>
          <small id={guideHintId}>{t.redesign.guideHint}</small>
          <figure className="welcome-illustration"><div aria-hidden="true"><span className="welcome-ghost"><Ghost size={60} /></span><span className="welcome-path path-a">A</span><span className="welcome-path path-b">B</span></div><figcaption>{t.redesign.illustration}</figcaption></figure>
          <div className="lang-switch" role="group" aria-label={t.language.label}>{(['en', 'zh'] as const).map(item => <button type="button" key={item} aria-pressed={lang === item} className={lang === item ? 'active' : ''} onClick={() => onLang(item)} lang={item === 'zh' ? 'zh-CN' : 'en'}>{t.language[item]}</button>)}</div>
        </section>}
        <div className="event-setup">
        {onGuide && <h3>{t.redesign.create}</h3>}
        <span className="eyebrow">{t.eventSetup.steps}</span><p>{t.eventSetup.subtitle}</p>
        <Field label={t.dialogs.eventName}><input aria-label={t.dialogs.eventName} value={name} maxLength={100} required placeholder={t.eventSetup.namePlaceholder} onChange={event => setName(event.target.value)} /></Field>
        <div className="form-row">
          <Field label={t.dialogs.count}><NumberInput label={t.dialogs.count} value={guests} min={1} max={10000} onChange={setGuests} /></Field>
          <Field label={t.eventSetup.duration}><NumberInput label={t.eventSetup.duration} value={duration} min={1} onChange={setDuration} /></Field>
        </div>
        <Field label={t.eventSetup.arrivals} hint={t.eventSetup.arrivalsHint}><NumberInput label={t.eventSetup.arrivals} value={arrivalWindow} min={1} max={duration} onChange={setArrivalWindow} /></Field>
        <Field label={t.eventSetup.startingFlow}><select aria-label={t.eventSetup.startingFlow} value={preset} onChange={event => setPreset(event.target.value as typeof preset)}>
          <option value="blank">{t.templates.blank}</option><option value="haunted">{t.templates.haunted.name}</option><option value="candy">{t.templates.candy.name}</option>
        </select></Field>
        <p className="form-error" role="alert">{error}</p>
        <div className="event-start-options"><button type="button" className="text-btn" onClick={onExample}>{t.eventSetup.demo}</button><button type="button" className="text-btn" aria-describedby={importError ? importErrorId : undefined} onClick={onImport}>{t.eventSetup.import}</button></div>
        <p id={importErrorId} className="form-error" role="alert">{importError}</p>
        {onCancelImport && <p role="status">{t.imports.busy}<button type="button" onClick={onCancelImport}>{t.common.cancel}</button></p>}
        </div>
      </div>
      <div className="modal-footer"><button type="button" className="btn ghost" onClick={onClose}>{t.common.cancel}</button><button type="submit" className={`btn ${!onGuide || name.trim() ? 'primary' : ''}`} disabled={!name.trim()}>{t.eventSetup.create}</button></div>
    </form>
  </Modal>;
}

export function ScenarioEditor({ scenario, planNames, onApply, onClose }: { scenario: Scenario; planNames: string[]; onApply: (scenario: Scenario) => void; onClose: () => void }) {
  const { t, lang } = useI18n();
  const d = t.dialogs;
  const [draft, setDraft] = useState<Scenario>(() => structuredClone(scenario));
  const [bucketKeys, setBucketKeys] = useState<Record<string, number[]>>(() => Object.fromEntries(scenario.arrivalStreams.flatMap(stream => stream.kind === 'bucketed' ? [[stream.id, stream.buckets.map((_, index) => index)]] : [])));
  const [error, setError] = useState('');
  const joined = planNames.join(lang === 'zh' ? '、' : ', ');
  const dataText = dataSourceText(lang);
  return <Modal title={d.scenarioTitle} onClose={onClose} wide><form noValidate onSubmit={event => {
    event.preventDefault();
    const invalid = event.currentTarget.querySelector<HTMLInputElement | HTMLTextAreaElement>('input:invalid, select:invalid, textarea:invalid');
    if (invalid) {
      for (let details = invalid.closest('details'); details; details = details.parentElement?.closest('details') ?? null) details.open = true;
      invalid.focus(); invalid.reportValidity(); return;
    }
    const errors = validateScenario(draft).filter(issue => issue.severity === 'error'); if (errors.length) setError(errors.map(issue => `${issue.path.join('.')}: ${issueText(issue, lang)}`).join('\n')); else { onApply(draft); onClose(); }
  }}><div className="modal-body">
    <div className="notice">{d.sharedBy(joined)}</div>
    <div className="form-row"><Field label={d.eventName}><input value={draft.name ?? ''} onChange={event => setDraft({ ...draft, name: event.target.value })} /></Field><Field label={d.seed}><NumberInput label={d.seed} value={draft.seed} max={4294967295} onChange={seed => setDraft({ ...draft, seed })} /></Field></div>
    <div className="form-row"><Field label={d.cutoff}><MinuteInput label={d.cutoff} value={draft.observationCutoff} min={1} onChange={observationCutoff => setDraft({ ...draft, observationCutoff })} /></Field><Field label={d.horizon}><MinuteInput value={draft.horizon} min={1} onChange={horizon => setDraft({ ...draft, horizon })} /></Field></div>
    <h3 className="section-title">{d.streams}</h3>
    <p className="subtle">{t.review.minute} {t.review.bind}</p>
    {draft.arrivalStreams.map((stream, index) => {
      const update = (next: Scenario['arrivalStreams'][number]) => setDraft({ ...draft, arrivalStreams: draft.arrivalStreams.map((item, i) => i === index ? next : item) });
      const pattern = stream.kind === 'total_in_window' ? stream.spacing : stream.kind === 'preset_profile' ? stream.profile.kind === 'uniform' ? 'random' : stream.profile.kind : stream.kind;
      return <div className="config-card" key={stream.id}>
        <div className="section-heading"><input aria-label={d.streams} value={stream.name ?? stream.id} onChange={event => update({ ...stream, name: event.target.value })} /><button type="button" className="text-btn danger" onClick={() => setDraft({ ...draft, arrivalStreams: draft.arrivalStreams.filter((_, i) => i !== index) })}>{t.review.removeStream}</button></div>
        <Field label={t.review.pattern}><select value={pattern} onChange={event => {
          const kind = event.target.value;
          const count = stream.kind === 'records' ? stream.records.length : stream.kind === 'bucketed' ? stream.buckets.reduce((sum, item) => sum + item.count, 0) : stream.count;
          const start = 'start' in stream ? stream.start : 0, end = 'end' in stream ? stream.end : draft.observationCutoff;
          const base = { id: stream.id, name: stream.name, provenance: updateProvenance(stream.provenance, { valueChanged: true }), attributeDistributions: 'attributeDistributions' in stream ? stream.attributeDistributions : Object.fromEntries(draft.attributes.map(attribute => [attribute.id, { values: attribute.values.map(value => ({ value, probability: 1 / attribute.values.length })), provenance: { kind: 'user_estimate' as const } }])) };
          if (kind === 'bucketed') { setBucketKeys(keys => ({ ...keys, [stream.id]: [0] })); update({ ...base, kind, buckets: [{ start, end, count }] }); }
          else if (kind === 'even' || kind === 'random') update({ ...base, kind: 'total_in_window', count, start, end, spacing: kind });
          else update({ ...base, kind: 'preset_profile', count, start, end, profile: kind === 'peak_at' ? { kind, peakAt: (start + end) / 2 } : { kind: kind as 'uniform' | 'early_peak' | 'late_peak' } });
        }}><option value="even">{t.review.even}</option><option value="random">{t.review.random}</option><option value="early_peak">{t.review.early}</option><option value="late_peak">{t.review.late}</option><option value="peak_at">{t.review.peak}</option><option value="bucketed">{t.review.bucketed}</option>{stream.kind === 'records' && <option value="records">{t.review.recordsPattern}</option>}</select></Field>
        {stream.kind === 'total_in_window' || stream.kind === 'preset_profile' ? <>
          <div className="form-row"><Field label={d.count}><NumberInput value={stream.count} onChange={count => update({ ...stream, count, provenance: updateProvenance(stream.provenance, { valueChanged: true }) })} /></Field><Field label={d.start}><MinuteInput value={stream.start} onChange={start => update({ ...stream, start, provenance: updateProvenance(stream.provenance, { valueChanged: true }) })} /></Field><Field label={d.end}><MinuteInput value={stream.end} onChange={end => update({ ...stream, end, provenance: updateProvenance(stream.provenance, { valueChanged: true }) })} /></Field></div>
          {stream.kind === 'preset_profile' && stream.profile.kind === 'peak_at' && <Field label={t.review.peakAt}><MinuteInput value={stream.profile.peakAt} onChange={peakAt => update({ ...stream, profile: { kind: 'peak_at', peakAt }, provenance: updateProvenance(stream.provenance, { valueChanged: true }) })} /></Field>}
        </> : stream.kind === 'bucketed' ? <>
          {stream.buckets.map((bucket, bucketIndex) => <div className="form-row" key={bucketKeys[stream.id][bucketIndex]}><Field label={d.start}><MinuteInput value={bucket.start} onChange={start => update({ ...stream, buckets: stream.buckets.map((item, i) => i === bucketIndex ? { ...item, start } : item), provenance: updateProvenance(stream.provenance, { valueChanged: true }) })} /></Field><Field label={d.end}><MinuteInput value={bucket.end} onChange={end => update({ ...stream, buckets: stream.buckets.map((item, i) => i === bucketIndex ? { ...item, end } : item), provenance: updateProvenance(stream.provenance, { valueChanged: true }) })} /></Field><Field label={d.count}><NumberInput value={bucket.count} onChange={count => update({ ...stream, buckets: stream.buckets.map((item, i) => i === bucketIndex ? { ...item, count } : item), provenance: updateProvenance(stream.provenance, { valueChanged: true }) })} /></Field><button type="button" className="text-btn danger" onClick={() => { setBucketKeys(keys => ({ ...keys, [stream.id]: keys[stream.id].filter((_, i) => i !== bucketIndex) })); update({ ...stream, buckets: stream.buckets.filter((_, i) => i !== bucketIndex), provenance: updateProvenance(stream.provenance, { valueChanged: true }) }); }}>{t.review.remove}</button></div>)}
          <button type="button" className="text-btn" onClick={() => { const start = stream.buckets.at(-1)?.end ?? 0; setBucketKeys(keys => ({ ...keys, [stream.id]: [...keys[stream.id], (keys[stream.id].at(-1) ?? -1) + 1] })); update({ ...stream, buckets: [...stream.buckets, { start, end: start + 300, count: 10 }], provenance: updateProvenance(stream.provenance, { valueChanged: true }) }); }}>{t.review.addBucket}</button>
        </> : <p className="subtle">{d.records(stream.records.length)}</p>}
        <p className="subtle">{dataText.manualHint}</p>
        <details className="ds-details"><summary>{dataText.sourceKind}</summary><div className="ds-editor"><ProvenanceFields value={stream.provenance} lang={lang} onChange={provenance => update({ ...stream, provenance })} /></div></details>
        <details className="ds-details"><summary>{dataText.arrival}</summary><ArrivalDataEditor stream={stream} attributes={draft.attributes} observationCutoff={draft.observationCutoff} horizon={draft.horizon} lang={lang} requireApply onChange={update} /></details>
      </div>;
    })}
    <button type="button" className="btn small" onClick={() => setDraft({ ...draft, arrivalStreams: [...draft.arrivalStreams, { id: newId('arrival', draft.arrivalStreams.map(item => item.id)), kind: 'total_in_window', count: 10, start: 0, end: Math.min(600, draft.observationCutoff), spacing: 'even', provenance: { kind: 'user_estimate' }, attributeDistributions: Object.fromEntries(draft.attributes.map(attribute => [attribute.id, { values: attribute.values.map(value => ({ value, probability: 1 / attribute.values.length })), provenance: { kind: 'user_estimate' } }])) }] })}><Plus size={13} />{t.review.addStream}</button>
    <p className="subtle">{d.scenarioMore}</p><p className="form-error" role="alert">{error}</p>
  </div><div className="modal-footer"><button type="button" className="btn ghost" onClick={onClose}>{t.common.cancel}</button><button type="submit" className="btn primary">{d.applyShared(planNames.length)}</button></div></form></Modal>;
}

export function ResourcesEditor({ plan, horizon, onApply, onClose }: { plan: Plan; horizon: number; onApply: (plan: Plan) => void; onClose: () => void }) {
  const { t, lang } = useI18n();
  const d = t.dialogs;
  const [draft, setDraft] = useState<Plan>(() => structuredClone(plan));
  const [tab, setTab] = useState<'resources' | 'assignments'>('resources');
  const tabsId = useId();
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const [error, setError] = useState('');
  const units = [...draft.staff.map(staff => ({ id: staff.id, name: staff.name })), ...draft.deviceTypes.flatMap(device => deviceUnitIds(device).map(id => ({ id, name: `${device.name} · ${id.split(':')[1]}` })))];
  return <Modal title={d.resourcesTitle(plan.name)} onClose={onClose} wide><form noValidate onSubmit={event => {
    event.preventDefault();
    const invalid = event.currentTarget.querySelector<HTMLInputElement>('input:invalid, select:invalid, textarea:invalid');
    if (invalid) {
      const panel = invalid.closest('[role="tabpanel"]');
      if (panel) setTab(panel.id === `${tabsId}-resources-panel` ? 'resources' : 'assignments');
      requestAnimationFrame(() => { invalid.focus(); invalid.reportValidity(); });
      return;
    }
    const errors = validatePlan(draft).filter(issue => issue.severity === 'error'); if (errors.length) setError(errors.slice(0, 5).map(issue => `${issue.path.join('.')}: ${issueText(issue, lang)}`).join('\n')); else { onApply(draft); onClose(); }
  }}><div className="dialog-tabs" role="tablist" aria-label={d.resourcesTitle(plan.name)} onKeyDown={event => {
    const index = tab === 'resources' ? 0 : 1;
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowRight' ? 1 - index : undefined;
    if (next !== undefined) { event.preventDefault(); setTab(next === 0 ? 'resources' : 'assignments'); tabs.current[next]?.focus(); }
  }}>{(['resources', 'assignments'] as const).map((key, index) => <button key={key} ref={element => { tabs.current[index] = element; }} type="button" role="tab" id={`${tabsId}-${key}-tab`} aria-controls={`${tabsId}-${key}-panel`} aria-selected={tab === key} tabIndex={tab === key ? 0 : -1} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>{key === 'resources' ? d.tabResources : d.tabAssignments}</button>)}</div><div className="modal-body">
    <p className="subtle">{t.review.minute}</p>
    <div role="tabpanel" id={`${tabsId}-resources-panel`} aria-labelledby={`${tabsId}-resources-tab`} hidden={tab !== 'resources'}>
      <div className="section-heading"><h3>{d.skills}</h3><button type="button" className="btn small" onClick={() => { const id = newId('skill', draft.skills.map(item => item.id)); setDraft({ ...draft, skills: [...draft.skills, { id, name: d.newSkill }] }); }}><Plus size={13} aria-hidden="true" />{d.addSkill}</button></div><div className="skills-list">{draft.skills.map((skill, index) => <label key={skill.id}><code>{skill.id}</code><input aria-label={d.skillName(skill.id)} value={skill.name} onChange={event => setDraft({ ...draft, skills: draft.skills.map((item, i) => i === index ? { ...item, name: event.target.value } : item) })} /></label>)}</div>
      <div className="section-heading"><h3>{d.staff} <span>{draft.staff.length}</span></h3><button type="button" className="btn small" onClick={() => { const id = newId('staff', draft.staff.map(item => item.id)); setDraft({ ...draft, staff: [...draft.staff, { id, name: d.newStaff, skillIds: [], shifts: [{ start: 0, end: horizon }], unavailability: [], provenance: { kind: 'user_estimate' } }] }); }}><Plus size={13} aria-hidden="true" />{d.addStaff}</button></div>
      {draft.staff.map((staff, index) => <div className="config-card" key={staff.id}>
        <Field label={d.staffName}><input value={staff.name} onChange={event => setDraft({ ...draft, staff: draft.staff.map((item, i) => i === index ? { ...item, name: event.target.value } : item) })} /></Field>
        <ShiftEditor shifts={staff.shifts} onChange={shifts => setDraft({ ...draft, staff: draft.staff.map((item, i) => i === index ? { ...item, shifts, provenance: { kind: 'user_estimate' } } : item) })} />
        <div className="check-list horizontal">{draft.skills.map(skill => <label key={skill.id}><input type="checkbox" checked={staff.skillIds.includes(skill.id)} onChange={event => setDraft({ ...draft, staff: draft.staff.map((item, i) => i === index ? { ...item, skillIds: event.target.checked ? [...item.skillIds, skill.id] : item.skillIds.filter(id => id !== skill.id), provenance: { kind: 'user_estimate' } } : item) })} />{skill.name}</label>)}</div><div className="card-bottom"><code>{staff.id}</code><button type="button" className="text-btn danger" onClick={() => setDraft({ ...draft, staff: draft.staff.filter(item => item.id !== staff.id), assignments: draft.assignments.filter(item => item.resourceUnitId !== staff.id) })}>{d.removeStaff}</button></div>
      </div>)}
      <div className="section-heading"><h3>{d.devices}</h3><button type="button" className="btn small" onClick={() => { const id = newId('device', draft.deviceTypes.map(item => item.id)); setDraft({ ...draft, deviceTypes: [...draft.deviceTypes, { id, name: d.newDevice, quantity: 1, shifts: [{ start: 0, end: horizon }], unavailability: [], provenance: { kind: 'user_estimate' } }] }); }}><Plus size={13} aria-hidden="true" />{d.addDevice}</button></div>
      {draft.deviceTypes.map((device, index) => <div className="config-card" key={device.id}><div className="form-row"><Field label={d.deviceType}><input value={device.name} onChange={event => setDraft({ ...draft, deviceTypes: draft.deviceTypes.map((item, i) => i === index ? { ...item, name: event.target.value } : item) })} /></Field><Field label={d.available}><NumberInput label={d.deviceQty(device.name)} value={device.quantity} max={1000} onChange={quantity => setDraft({ ...draft, deviceTypes: draft.deviceTypes.map((item, i) => i === index ? { ...item, quantity, provenance: { kind: 'user_estimate' } } : item) })} /></Field></div>
        <ShiftEditor shifts={device.shifts} onChange={shifts => setDraft({ ...draft, deviceTypes: draft.deviceTypes.map((item, i) => i === index ? { ...item, shifts, provenance: { kind: 'user_estimate' } } : item) })} />
      </div>)}
    </div><div role="tabpanel" id={`${tabsId}-assignments-panel`} aria-labelledby={`${tabsId}-assignments-tab`} hidden={tab !== 'assignments'}><p className="dialog-description inline">{d.assignmentsHelp}</p>
      {draft.assignments.map((assignment, index) => <div className="config-card" key={assignment.resourceUnitId}><div className="section-heading"><h4>{units.find(unit => unit.id === assignment.resourceUnitId)?.name ?? assignment.resourceUnitId}</h4><button type="button" className="text-btn danger" onClick={() => setDraft({ ...draft, assignments: draft.assignments.filter((_, i) => i !== index) })}>{d.removePosts}</button></div>
        {assignment.periods.map((period, periodIndex) => <div className="assignment-period" key={periodIndex}><div className="form-row"><Field label={d.from}><MinuteInput value={period.from} onChange={from => setDraft({ ...draft, assignments: draft.assignments.map((item, i) => i === index ? { ...item, periods: item.periods.map((p, j) => j === periodIndex ? { ...p, from } : p) } : item) })} /></Field><Field label={d.to}><NumericInput optional step={0.0001} value={period.to === undefined ? undefined : secondsToMinutes(period.to)} placeholder={t.common.unlimited} onChange={minutes => setDraft({ ...draft, assignments: draft.assignments.map((item, i) => i === index ? { ...item, periods: item.periods.map((p, j) => j === periodIndex ? { ...p, to: minutes === undefined ? undefined : minutesToSeconds(minutes) } : p) } : item) })} /></Field><Field label={d.handover}><NumberInput step={0.1} value={period.handoverSec ?? 0} onChange={handoverSec => setDraft({ ...draft, assignments: draft.assignments.map((item, i) => i === index ? { ...item, periods: item.periods.map((p, j) => j === periodIndex ? { ...p, handoverSec } : p) } : item) })} /></Field></div>
          <div className="check-list horizontal">{draft.graph.nodes.filter(node => node.type === 'service').map(node => <label key={node.id}><input type="checkbox" checked={period.nodeIds.includes(node.id)} onChange={event => setDraft({ ...draft, assignments: draft.assignments.map((item, i) => i === index ? { ...item, periods: item.periods.map((p, j) => j === periodIndex ? { ...p, nodeIds: event.target.checked ? [...p.nodeIds, node.id] : p.nodeIds.filter(id => id !== node.id) } : p) } : item) })} />{node.name}</label>)}</div></div>)}
        <button type="button" className="text-btn" onClick={() => { const from = assignment.periods.at(-1)?.to ?? Math.floor(horizon / 2); const periods = assignment.periods.map((period, i) => i === assignment.periods.length - 1 ? { ...period, to: from } : period); periods.push({ from, nodeIds: [], handoverSec: 30 }); setDraft({ ...draft, assignments: draft.assignments.map((item, i) => i === index ? { ...item, periods } : item) }); }}><Plus size={13} aria-hidden="true" />{d.addPeriod}</button>
      </div>)}<Field label={d.postResource}><select value="" onChange={event => { if (event.target.value) setDraft({ ...draft, assignments: [...draft.assignments, { resourceUnitId: event.target.value, periods: [{ from: 0, nodeIds: [] }] }] }); }}><option value="">{d.chooseResource}</option>{units.filter(unit => !draft.assignments.some(item => item.resourceUnitId === unit.id)).map(unit => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</select></Field>
    </div><p role="alert" className="form-error">{error}</p></div><div className="modal-footer"><button type="button" className="btn ghost" onClick={onClose}>{t.common.cancel}</button><button type="submit" className="btn primary">{d.applyResources}</button></div></form></Modal>;
}

function ShiftEditor({ shifts, onChange }: { shifts: Plan['staff'][number]['shifts']; onChange: (shifts: Plan['staff'][number]['shifts']) => void }) {
  const { t } = useI18n();
  return <div className="shift-editor">{shifts.map((shift, index) => <div className="form-row" key={index}>
    <Field label={t.dialogs.shiftStart}><MinuteInput value={shift.start} onChange={start => onChange(shifts.map((item, i) => i === index ? { ...item, start } : item))} /></Field>
    <Field label={t.dialogs.shiftEnd}><MinuteInput value={shift.end} onChange={end => onChange(shifts.map((item, i) => i === index ? { ...item, end } : item))} /></Field>
    <button type="button" className="text-btn danger" onClick={() => onChange(shifts.filter((_, i) => i !== index))}>{t.review.removeShift}</button>
  </div>)}<button type="button" className="text-btn" onClick={() => { const start = shifts.at(-1)?.end ?? 0; onChange([...shifts, { start, end: start + 600 }]); }}><Plus size={13} />{t.review.addShift}</button></div>;
}
