import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { CalendarDays, Plus, X } from 'lucide-react';
import { deviceUnitIds, validatePlan, validateScenario } from '../schemas';
import type { Plan, ProjectDocument, Scenario } from '../schemas';
import { emptyProject, halloweenProject, newId } from '../features/project';
import { issueText, useI18n } from '../i18n';
import { Field, NumberInput } from './Inspector';

export function Modal({ title, children, onClose, wide = false, icon }: { title: string; children: ReactNode; onClose: () => void; wide?: boolean; icon?: ReactNode }) {
  const { t } = useI18n();
  const ref = useRef<HTMLDivElement>(null);
  const close = useRef(onClose); close.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const controls = 'button:not(:disabled), input:not(:disabled), textarea, select';
    (ref.current?.querySelector<HTMLElement>(`.modal-body :is(${controls})`) ?? ref.current?.querySelector<HTMLElement>(controls))?.focus();
    const listener = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.stopPropagation(); close.current(); }
      if (event.key === 'Tab') {
        const controls = [...(ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [tabindex="0"]') ?? [])];
        if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); controls.at(-1)?.focus(); }
        else if (!event.shiftKey && document.activeElement === controls.at(-1)) { event.preventDefault(); controls[0]?.focus(); }
      }
    };
    document.addEventListener('keydown', listener);
    return () => { document.removeEventListener('keydown', listener); if (previous?.isConnected) previous.focus(); };
  }, []);
  return <div className="modal-backdrop">
    <div ref={ref} role="dialog" aria-modal="true" aria-label={title} className={`modal ${wide ? 'wide' : ''}`}>
      <div className="modal-header">{icon && <span className="modal-icon">{icon}</span>}<h2>{title}</h2><button type="button" className="icon-btn" aria-label={t.common.closeDialog} onClick={onClose}><X size={18} /></button></div>
      {children}
    </div>
  </div>;
}

export function JsonEditor({ title, value, onApply, onClose, readOnly = false }: { title: string; value: unknown; onApply: (value: unknown) => string | undefined; onClose: () => void; readOnly?: boolean }) {
  const { t } = useI18n();
  const [text, setText] = useState(JSON.stringify(value, null, 2));
  const [error, setError] = useState('');
  return <Modal title={title} onClose={onClose} wide>
    <p className="dialog-description">{t.dialogs.jsonDescription}</p>
    <textarea aria-label={t.dialogs.jsonLabel} className="json-editor" spellCheck={false} value={text} readOnly={readOnly} onChange={event => setText(event.target.value)} />
    <p role="alert" className="form-error">{error}</p>
    <div className="modal-footer"><button type="button" className="btn ghost" onClick={onClose}>{t.common.close}</button>{!readOnly && <button type="button" className="btn primary" onClick={() => { try { const message = onApply(JSON.parse(text)); if (message) setError(message); else onClose(); } catch { setError(t.dialogs.jsonMalformed); } }}>{t.dialogs.checkApply}</button>}</div>
  </Modal>;
}

export function EventCreator({ onCreate, onExample, onImport, onClose }: { onCreate: (document: ProjectDocument) => void; onExample: () => void; onImport: () => void; onClose: () => void }) {
  const { t, lang } = useI18n();
  const [name, setName] = useState('');
  const [guests, setGuests] = useState(100);
  const [duration, setDuration] = useState(30);
  const [arrivalWindow, setArrivalWindow] = useState(10);
  const [preset, setPreset] = useState<'blank' | 'haunted' | 'candy'>('blank');
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
      <div className="modal-body event-setup">
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
        <div className="event-start-options"><button type="button" className="text-btn" onClick={onExample}>{t.eventSetup.demo}</button><button type="button" className="text-btn" onClick={onImport}>{t.eventSetup.import}</button></div>
      </div>
      <div className="modal-footer"><button type="button" className="btn ghost" onClick={onClose}>{t.common.cancel}</button><button type="submit" className="btn primary" disabled={!name.trim()}>{t.eventSetup.create}</button></div>
    </form>
  </Modal>;
}

export function ScenarioEditor({ scenario, planNames, onApply, onClose }: { scenario: Scenario; planNames: string[]; onApply: (scenario: Scenario) => void; onClose: () => void }) {
  const { t, lang } = useI18n();
  const d = t.dialogs;
  const [draft, setDraft] = useState<Scenario>(() => structuredClone(scenario));
  const [error, setError] = useState('');
  const joined = planNames.join(lang === 'zh' ? '、' : ', ');
  return <Modal title={d.scenarioTitle} onClose={onClose} wide><div className="modal-body">
    <div className="notice">{d.sharedBy(joined)}</div>
    <div className="form-row"><Field label={d.eventName}><input value={draft.name ?? ''} onChange={event => setDraft({ ...draft, name: event.target.value })} /></Field><Field label={d.seed}><NumberInput label={d.seed} value={draft.seed} max={4294967295} onChange={seed => setDraft({ ...draft, seed })} /></Field></div>
    <div className="form-row"><Field label={d.cutoff}><NumberInput label={d.cutoff} value={draft.observationCutoff} min={1} onChange={observationCutoff => setDraft({ ...draft, observationCutoff })} /></Field><Field label={d.horizon}><NumberInput value={draft.horizon} min={1} onChange={horizon => setDraft({ ...draft, horizon })} /></Field></div>
    <h3 className="section-title">{d.streams}</h3>
    {draft.arrivalStreams.map((stream, index) => <div className="config-card" key={stream.id}><h4>{stream.name ?? stream.id}<span>{stream.kind}</span></h4>{stream.kind === 'total_in_window' || stream.kind === 'preset_profile' ? <div className="form-row"><Field label={d.count}><NumberInput value={stream.count} onChange={count => setDraft({ ...draft, arrivalStreams: draft.arrivalStreams.map((item, i) => i === index ? { ...stream, count, provenance: { kind: 'user_estimate' } } : item) })} /></Field><Field label={d.start}><NumberInput value={stream.start} onChange={start => setDraft({ ...draft, arrivalStreams: draft.arrivalStreams.map((item, i) => i === index ? { ...stream, start, provenance: { kind: 'user_estimate' } } : item) })} /></Field><Field label={d.end}><NumberInput value={stream.end} onChange={end => setDraft({ ...draft, arrivalStreams: draft.arrivalStreams.map((item, i) => i === index ? { ...stream, end, provenance: { kind: 'user_estimate' } } : item) })} /></Field></div>
      : stream.kind === 'bucketed' ? stream.buckets.map((bucket, bucketIndex) => <div className="form-row" key={bucketIndex}><span className="bucket-label">{d.bucket(bucket.start, bucket.end)}</span><Field label={d.count}><NumberInput value={bucket.count} onChange={count => setDraft({ ...draft, arrivalStreams: draft.arrivalStreams.map((item, i) => i === index ? { ...stream, buckets: stream.buckets.map((b, j) => j === bucketIndex ? { ...b, count } : b), provenance: { kind: 'user_estimate' } } : item) })} /></Field></div>) : <p className="subtle">{d.records(stream.records.length)}</p>}</div>)}
    <p className="subtle">{d.scenarioMore}</p><p className="form-error" role="alert">{error}</p>
  </div><div className="modal-footer"><button type="button" className="btn ghost" onClick={onClose}>{t.common.cancel}</button><button type="button" className="btn primary" onClick={() => { const errors = validateScenario(draft).filter(issue => issue.severity === 'error'); if (errors.length) setError(errors.map(issue => `${issue.path.join('.')}: ${issueText(issue, lang)}`).join('\n')); else { onApply(draft); onClose(); } }}>{d.applyShared(planNames.length)}</button></div></Modal>;
}

export function ResourcesEditor({ plan, horizon, onApply, onClose }: { plan: Plan; horizon: number; onApply: (plan: Plan) => void; onClose: () => void }) {
  const { t, lang } = useI18n();
  const d = t.dialogs;
  const [draft, setDraft] = useState<Plan>(() => structuredClone(plan));
  const [tab, setTab] = useState<'resources' | 'assignments'>('resources');
  const [error, setError] = useState('');
  const units = [...draft.staff.map(staff => ({ id: staff.id, name: staff.name })), ...draft.deviceTypes.flatMap(device => deviceUnitIds(device).map(id => ({ id, name: `${device.name} · ${id.split(':')[1]}` })))];
  return <Modal title={d.resourcesTitle(plan.name)} onClose={onClose} wide><div className="dialog-tabs" role="tablist"><button type="button" role="tab" aria-selected={tab === 'resources'} className={tab === 'resources' ? 'active' : ''} onClick={() => setTab('resources')}>{d.tabResources}</button><button type="button" role="tab" aria-selected={tab === 'assignments'} className={tab === 'assignments' ? 'active' : ''} onClick={() => setTab('assignments')}>{d.tabAssignments}</button></div><div className="modal-body">
    {tab === 'resources' ? <>
      <div className="section-heading"><h3>{d.skills}</h3><button type="button" className="btn small" onClick={() => { const id = newId('skill', draft.skills.map(item => item.id)); setDraft({ ...draft, skills: [...draft.skills, { id, name: d.newSkill }] }); }}><Plus size={13} aria-hidden="true" />{d.addSkill}</button></div><div className="skills-list">{draft.skills.map((skill, index) => <label key={skill.id}><code>{skill.id}</code><input aria-label={d.skillName(skill.id)} value={skill.name} onChange={event => setDraft({ ...draft, skills: draft.skills.map((item, i) => i === index ? { ...item, name: event.target.value } : item) })} /></label>)}</div>
      <div className="section-heading"><h3>{d.staff} <span>{draft.staff.length}</span></h3><button type="button" className="btn small" onClick={() => { const id = newId('staff', draft.staff.map(item => item.id)); setDraft({ ...draft, staff: [...draft.staff, { id, name: d.newStaff, skillIds: [], shifts: [{ start: 0, end: horizon }], unavailability: [], provenance: { kind: 'user_estimate' } }] }); }}><Plus size={13} aria-hidden="true" />{d.addStaff}</button></div>
      {draft.staff.map((staff, index) => <div className="config-card" key={staff.id}><div className="form-row"><Field label={d.staffName}><input value={staff.name} onChange={event => setDraft({ ...draft, staff: draft.staff.map((item, i) => i === index ? { ...item, name: event.target.value } : item) })} /></Field><Field label={d.shiftStart}><NumberInput value={staff.shifts[0]?.start ?? 0} onChange={start => setDraft({ ...draft, staff: draft.staff.map((item, i) => i === index ? { ...item, shifts: [{ start, end: item.shifts[0]?.end ?? horizon }, ...item.shifts.slice(1)], provenance: { kind: 'user_estimate' } } : item) })} /></Field><Field label={d.shiftEnd}><NumberInput value={staff.shifts[0]?.end ?? horizon} onChange={end => setDraft({ ...draft, staff: draft.staff.map((item, i) => i === index ? { ...item, shifts: [{ start: item.shifts[0]?.start ?? 0, end }, ...item.shifts.slice(1)], provenance: { kind: 'user_estimate' } } : item) })} /></Field></div><div className="check-list horizontal">{draft.skills.map(skill => <label key={skill.id}><input type="checkbox" checked={staff.skillIds.includes(skill.id)} onChange={event => setDraft({ ...draft, staff: draft.staff.map((item, i) => i === index ? { ...item, skillIds: event.target.checked ? [...item.skillIds, skill.id] : item.skillIds.filter(id => id !== skill.id), provenance: { kind: 'user_estimate' } } : item) })} />{skill.name}</label>)}</div><div className="card-bottom"><code>{staff.id}</code><button type="button" className="text-btn danger" onClick={() => setDraft({ ...draft, staff: draft.staff.filter(item => item.id !== staff.id), assignments: draft.assignments.filter(item => item.resourceUnitId !== staff.id) })}>{d.removeStaff}</button></div></div>)}
      <div className="section-heading"><h3>{d.devices}</h3><button type="button" className="btn small" onClick={() => { const id = newId('device', draft.deviceTypes.map(item => item.id)); setDraft({ ...draft, deviceTypes: [...draft.deviceTypes, { id, name: d.newDevice, quantity: 1, shifts: [{ start: 0, end: horizon }], unavailability: [], provenance: { kind: 'user_estimate' } }] }); }}><Plus size={13} aria-hidden="true" />{d.addDevice}</button></div>
      {draft.deviceTypes.map((device, index) => <div className="config-card form-row" key={device.id}><Field label={d.deviceType}><input value={device.name} onChange={event => setDraft({ ...draft, deviceTypes: draft.deviceTypes.map((item, i) => i === index ? { ...item, name: event.target.value } : item) })} /></Field><Field label={d.available}><NumberInput label={d.deviceQty(device.name)} value={device.quantity} max={1000} onChange={quantity => setDraft({ ...draft, deviceTypes: draft.deviceTypes.map((item, i) => i === index ? { ...item, quantity, provenance: { kind: 'user_estimate' } } : item) })} /></Field></div>)}
    </> : <><p className="dialog-description inline">{d.assignmentsHelp}</p>
      {draft.assignments.map((assignment, index) => <div className="config-card" key={assignment.resourceUnitId}><div className="section-heading"><h4>{units.find(unit => unit.id === assignment.resourceUnitId)?.name ?? assignment.resourceUnitId}</h4><button type="button" className="text-btn danger" onClick={() => setDraft({ ...draft, assignments: draft.assignments.filter((_, i) => i !== index) })}>{d.removePosts}</button></div>
        {assignment.periods.map((period, periodIndex) => <div className="assignment-period" key={periodIndex}><div className="form-row"><Field label={d.from}><NumberInput value={period.from} onChange={from => setDraft({ ...draft, assignments: draft.assignments.map((item, i) => i === index ? { ...item, periods: item.periods.map((p, j) => j === periodIndex ? { ...p, from } : p) } : item) })} /></Field><Field label={d.to}><input type="number" value={period.to ?? ''} placeholder={t.common.unlimited} onChange={event => setDraft({ ...draft, assignments: draft.assignments.map((item, i) => i === index ? { ...item, periods: item.periods.map((p, j) => j === periodIndex ? { ...p, to: event.target.value === '' ? undefined : Number(event.target.value) } : p) } : item) })} /></Field><Field label={d.handover}><NumberInput value={period.handoverSec ?? 0} onChange={handoverSec => setDraft({ ...draft, assignments: draft.assignments.map((item, i) => i === index ? { ...item, periods: item.periods.map((p, j) => j === periodIndex ? { ...p, handoverSec } : p) } : item) })} /></Field></div>
          <div className="check-list horizontal">{draft.graph.nodes.filter(node => node.type === 'service').map(node => <label key={node.id}><input type="checkbox" checked={period.nodeIds.includes(node.id)} onChange={event => setDraft({ ...draft, assignments: draft.assignments.map((item, i) => i === index ? { ...item, periods: item.periods.map((p, j) => j === periodIndex ? { ...p, nodeIds: event.target.checked ? [...p.nodeIds, node.id] : p.nodeIds.filter(id => id !== node.id) } : p) } : item) })} />{node.name}</label>)}</div></div>)}
        <button type="button" className="text-btn" onClick={() => { const from = assignment.periods.at(-1)?.to ?? Math.floor(horizon / 2); const periods = assignment.periods.map((period, i) => i === assignment.periods.length - 1 ? { ...period, to: from } : period); periods.push({ from, nodeIds: [], handoverSec: 30 }); setDraft({ ...draft, assignments: draft.assignments.map((item, i) => i === index ? { ...item, periods } : item) }); }}><Plus size={13} aria-hidden="true" />{d.addPeriod}</button>
      </div>)}<Field label={d.postResource}><select value="" onChange={event => { if (event.target.value) setDraft({ ...draft, assignments: [...draft.assignments, { resourceUnitId: event.target.value, periods: [{ from: 0, nodeIds: [] }] }] }); }}><option value="">{d.chooseResource}</option>{units.filter(unit => !draft.assignments.some(item => item.resourceUnitId === unit.id)).map(unit => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</select></Field>
    </>}<p role="alert" className="form-error">{error}</p></div><div className="modal-footer"><button type="button" className="btn ghost" onClick={onClose}>{t.common.cancel}</button><button type="button" className="btn primary" onClick={() => { const errors = validatePlan(draft).filter(issue => issue.severity === 'error'); if (errors.length) setError(errors.slice(0, 5).map(issue => `${issue.path.join('.')}: ${issueText(issue, lang)}`).join('\n')); else { onApply(draft); onClose(); } }}>{d.applyResources}</button></div></Modal>;
}
