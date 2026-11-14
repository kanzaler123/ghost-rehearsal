import type { ReactNode } from 'react';
import { ArrowUp, BookmarkPlus, Braces, Lightbulb, PanelRightClose, PanelRightOpen, Plus, Route, Trash2, TriangleAlert, Users, X } from 'lucide-react';
import type { Edge, Node, Plan, Scenario, ValidationIssue } from '../schemas';
import { issueText, useI18n } from '../i18n';
import type { SimulationRun } from '../simulation/types';
import { Ghost, NodeIcon } from './Icons';

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return <label className="field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>;
}
export function NumberInput({ value, onChange, min = 0, max, step = 1, label }: { value: number; onChange: (value: number) => void; min?: number; max?: number; step?: number; label?: string }) {
  return <input aria-label={label} type="number" value={value} min={min} max={max} step={step} onChange={event => { const next = event.target.valueAsNumber; if (Number.isFinite(next)) onChange(next); }} />;
}

interface Props {
  plan: Plan; scenario: Scenario; node?: Node; edge?: Edge; editable: boolean; issues: ValidationIssue[]; run?: SimulationRun;
  onNode: (node: Node) => void; onEdge: (edge: Edge) => void; onAdvanced: () => void; onDelete: () => void; onResources: () => void;
  collapsed: boolean; onToggle: () => void; onSaveTemplate: () => void;
}

export function Inspector({ plan, scenario, node, edge, editable, issues, run, onNode, onEdge, onAdvanced, onDelete, onResources, collapsed, onToggle, onSaveTemplate }: Props) {
  const { t, lang } = useI18n();
  const s = t.inspector;
  if (collapsed) return <aside className="inspector collapsed" aria-label={s.eyebrow}>
    <button type="button" className="rail-toggle" aria-label={s.expand} title={s.expand} aria-expanded={false} onClick={onToggle}><PanelRightOpen size={17} /><span>{s.eyebrow}</span></button>
  </aside>;
  const selectedId = node?.id ?? edge?.id;
  const related = issues.filter(issue => issue.entityIds.includes(selectedId ?? ''));
  const metric = run?.statistics?.nodes.find(item => item.id === node?.id);
  const possibleTargets = plan.graph.nodes.filter(item => item.id !== node?.id && item.type !== 'entrance' && item.type !== 'subflow');
  const queueSettings = node && (node.type === 'service' || node.type === 'waiting_area') ? <>
    <Field label={s.queueCapacity} hint={s.queueCapacityHint}><input aria-label={s.queueCapacity} type="number" min={1} value={node.queueCapacity ?? ''} placeholder={t.common.unlimited} onChange={event => onNode({ ...node, queueCapacity: event.target.value === '' ? null : Number(event.target.value) })} /></Field>
    <Field label={s.whenFull}><select value={node.fullPolicy?.kind ?? 'block'} onChange={event => onNode({ ...node, fullPolicy: event.target.value === 'reroute' ? { kind: 'reroute', targetNodeId: possibleTargets[0]?.id ?? 'target' } : { kind: event.target.value as 'block' | 'reject' } })}><option value="block">{s.fullBlock}</option><option value="reroute">{s.fullReroute}</option><option value="reject">{s.fullReject}</option></select></Field>
    {node.fullPolicy?.kind === 'reroute' && <Field label={s.overflowTarget}><select value={node.fullPolicy.targetNodeId} onChange={event => onNode({ ...node, fullPolicy: { kind: 'reroute', targetNodeId: event.target.value } })}>{possibleTargets.map(target => <option key={target.id} value={target.id}>{target.name}</option>)}</select></Field>}
  </> : null;
  const title = node ? s.node : edge ? s.edge : s.overview;
  return <aside className="inspector" aria-label={s.eyebrow}>
    <div className="panel-head">
      <div><span className="eyebrow">{s.eyebrow}</span><h2>{title}</h2></div>
      <div className="panel-head-actions">
        <span className={`mode-chip ${editable ? 'is-edit' : ''}`}>{editable ? t.common.editable : t.common.readOnly}</span>
        <button type="button" className="icon-btn" aria-label={s.collapse} title={s.collapse} aria-expanded={true} onClick={onToggle}><PanelRightClose size={17} /></button>
      </div>
    </div>
    <div className="inspector-scroll">
      {!node && !edge && <>
        <div className="inspector-intro">
          <div className="intro-art" aria-hidden="true"><Ghost size={44} /><span className="intro-glow" /></div>
          <h3>{s.introTitle}</h3><p>{s.introText}</p>
        </div>
        <div className="stat-tiles">
          <div><b>{plan.graph.nodes.filter(item => item.type !== 'subflow').length}</b><span>{s.statNodes}</span></div>
          <div><b>{plan.staff.length}</b><span>{s.statStaff}</span></div>
          <div><b>{plan.deviceTypes.reduce((sum, item) => sum + item.quantity, 0)}</b><span>{s.statDevices}</span></div>
        </div>
        <button type="button" className="btn wide" onClick={onResources}><Users size={15} aria-hidden="true" />{s.configure}</button>
        <div className="tip-card"><b><Lightbulb size={14} aria-hidden="true" />{s.tipsTitle}</b>{plan.graph.nodes.some(item => item.id === 'checkin') ? <><p>{s.tip1}</p><p>{s.tip2}</p></> : <p>{s.tipEmpty}</p>}</div>
      </>}
      {node && <>
        <div className={`entity-badge type-${node.type}`}><span className="entity-icon"><NodeIcon type={node.type} size={16} /></span><div><b>{t.nodeTypes[node.type]}</b><code>{node.id}</code></div></div>
        <fieldset disabled={!editable} className="form-fields">
          <Field label={s.name}><input aria-label={s.name} key={`${node.id}-${node.name}`} defaultValue={node.name} onBlur={event => { if (event.target.value !== node.name) onNode({ ...node, name: event.target.value }); }} /></Field>
          {node.type === 'service' && <>
            <h3 className="form-heading">{s.serviceRules}</h3>
            <Field label={s.distribution}><select value={node.duration.kind} onChange={event => {
              const kind = event.target.value; const provenance = { kind: 'user_estimate' as const };
              onNode({ ...node, duration: kind === 'fixed' ? { kind, value: 30, provenance } : kind === 'uniform' ? { kind, min: 15, max: 45, provenance } : kind === 'triangular' ? { kind, min: 15, mode: 30, max: 45, provenance } : { kind: 'empirical', samples: [20, 30, 40], provenance } });
            }}>{(['fixed', 'uniform', 'triangular', 'empirical'] as const).map(kind => <option key={kind} value={kind}>{s.distributions[kind]}</option>)}</select></Field>
            {node.duration.kind === 'fixed' && <Field label={s.serviceTime}><NumberInput label={s.serviceTime} value={node.duration.value} step={0.1} onChange={value => onNode({ ...node, duration: { kind: 'fixed', value, provenance: { kind: 'user_estimate' } } })} /></Field>}
            {(node.duration.kind === 'uniform' || node.duration.kind === 'triangular') && <div className="form-row">{(['min', ...(node.duration.kind === 'triangular' ? ['mode'] : []), 'max'] as ('min' | 'mode' | 'max')[]).map(field => <Field key={field} label={s[field]}><NumberInput value={Number((node.duration as unknown as Record<string, number>)[field])} onChange={value => onNode({ ...node, duration: { ...node.duration, [field]: value, provenance: { kind: 'user_estimate' } } })} /></Field>)}</div>}
            {node.duration.kind === 'empirical' && <p className="subtle">{s.samples(node.duration.samples.length)}</p>}
            <Field label={s.maxConcurrent} hint={s.maxConcurrentHint}><input type="number" min={1} value={node.maxConcurrent ?? ''} placeholder={t.common.unlimited} onChange={event => onNode({ ...node, maxConcurrent: event.target.value === '' ? undefined : Number(event.target.value) })} /></Field>
            <h3 className="form-heading">{s.perService}</h3>
            {!node.requirements.length && <p className="subtle">{s.noRequirements}</p>}
            {node.requirements.map((item, index) => <div className="requirement-row" key={index}>
              <select aria-label={s.requirement(index + 1)} value={`${item.kind}:${item.kind === 'staff' ? item.skillId : item.deviceTypeId}`} onChange={event => {
                const [kind, id] = event.target.value.split(':'); const requirements = [...node.requirements];
                requirements[index] = kind === 'staff' ? { kind, skillId: id, quantity: item.quantity } : { kind: 'device', deviceTypeId: id, quantity: item.quantity }; onNode({ ...node, requirements });
              }}>{plan.skills.map(skill => <option key={`staff:${skill.id}`} value={`staff:${skill.id}`}>{s.staffOption} · {skill.name}</option>)}{plan.deviceTypes.map(device => <option key={`device:${device.id}`} value={`device:${device.id}`}>{s.deviceOption} · {device.name}</option>)}</select>
              <NumberInput label={s.requirementQty(index + 1)} value={item.quantity} min={1} onChange={quantity => onNode({ ...node, requirements: node.requirements.map((other, i) => i === index ? { ...other, quantity } : other) })} />
              <button type="button" className="icon-btn danger" aria-label={s.removeRequirement(index + 1)} onClick={() => onNode({ ...node, requirements: node.requirements.filter((_, i) => i !== index) })}><X size={14} /></button>
            </div>)}
            <button type="button" className="text-btn" disabled={!plan.skills.length && !plan.deviceTypes.length} onClick={() => onNode({ ...node, requirements: [...node.requirements, plan.skills.length ? { kind: 'staff', skillId: plan.skills[0].id, quantity: 1 } : { kind: 'device', deviceTypeId: plan.deviceTypes[0].id, quantity: 1 }] })}><Plus size={14} aria-hidden="true" />{s.addRequirement}</button>
            <h3 className="form-heading">{s.queueHours}</h3>{queueSettings}
            <div className="form-row"><Field label={s.opensAt}><NumberInput value={node.openWindows[0]?.openAt ?? 0} onChange={openAt => onNode({ ...node, openWindows: [{ openAt, closeAt: node.openWindows[0]?.closeAt ?? scenario.observationCutoff, provenance: { kind: 'user_estimate' } }, ...node.openWindows.slice(1)] })} /></Field><Field label={s.closesAt}><input type="number" min={0} placeholder={s.alwaysOpen} value={node.openWindows[0]?.closeAt ?? ''} onChange={event => onNode({ ...node, openWindows: event.target.value === '' ? [] : [{ openAt: node.openWindows[0]?.openAt ?? 0, closeAt: Number(event.target.value), provenance: { kind: 'user_estimate' } }, ...node.openWindows.slice(1)] })} /></Field></div>
          </>}
          {node.type === 'entrance' && <Field label={s.streams}><div className="check-list">{scenario.arrivalStreams.map(stream => <label key={stream.id}><input type="checkbox" checked={node.arrivalStreamIds.includes(stream.id)} onChange={event => onNode({ ...node, arrivalStreamIds: event.target.checked ? [...node.arrivalStreamIds, stream.id] : node.arrivalStreamIds.filter(id => id !== stream.id) })} />{stream.name ?? stream.id}</label>)}</div></Field>}
          {node.type === 'decision' && <><h3 className="form-heading">{node.routing.kind === 'probability' ? s.probabilities : s.attributeRouting}</h3>{node.routing.branches.map((branch, index) => <Field key={branch.branchKey} label={branch.branchKey}>{'weight' in branch && node.routing.kind === 'probability' ? <NumberInput min={0} max={1} step={0.05} value={branch.weight} onChange={weight => { if (node.routing.kind === 'probability') onNode({ ...node, routing: { ...node.routing, branches: node.routing.branches.map((other, i) => i === index ? { ...other, weight } : other) } }); }} /> : <span className="static-value">{'condition' in branch && branch.condition ? `${branch.condition.attributeId} ∈ ${branch.condition.values.join(', ')}` : s.defaultBranch}</span>}</Field>)}{node.loopGuard && <Field label={s.maxVisits}><NumberInput min={1} value={node.loopGuard.maxVisits} onChange={maxVisits => onNode({ ...node, loopGuard: { ...node.loopGuard!, maxVisits } })} /></Field>}<p className="subtle">{s.branchHint}</p></>}
          {node.type === 'waiting_area' && <><Field label={s.release}><select value={node.release.kind} onChange={event => onNode({ ...node, release: event.target.value === 'batch' ? { kind: 'batch', batchSize: 10, maxHoldSec: 60 } : { kind: 'until_time', releaseAt: 300 } })}><option value="until_time">{s.releaseTime}</option><option value="batch">{s.releaseBatch}</option></select></Field>{node.release.kind === 'until_time' ? <Field label={s.releaseAt}><NumberInput value={node.release.releaseAt} onChange={releaseAt => onNode({ ...node, release: { kind: 'until_time', releaseAt } })} /></Field> : <div className="form-row"><Field label={s.batchSize}><NumberInput min={1} value={node.release.batchSize} onChange={batchSize => { if (node.release.kind === 'batch') onNode({ ...node, release: { ...node.release, batchSize } }); }} /></Field><Field label={s.maxHold}><NumberInput min={1} value={node.release.maxHoldSec ?? 60} onChange={maxHoldSec => { if (node.release.kind === 'batch') onNode({ ...node, release: { ...node.release, maxHoldSec } }); }} /></Field></div>}{queueSettings}</>}
          {node.type === 'exit' && <label className="check-row"><input type="checkbox" checked={node.countsAsCompleted !== false} onChange={event => onNode({ ...node, countsAsCompleted: event.target.checked })} />{s.countsCompleted}</label>}
          {node.type === 'merge' && <><h3 className="form-heading">{s.priority}</h3>{node.incomingPriority.map((id, index) => <div className="priority-row" key={id}><span className="priority-rank">{index + 1}</span><code>{id}</code><button type="button" className="icon-btn" disabled={!index} aria-label={s.raise(id)} onClick={() => { const incomingPriority = [...node.incomingPriority]; [incomingPriority[index - 1], incomingPriority[index]] = [incomingPriority[index], incomingPriority[index - 1]]; onNode({ ...node, incomingPriority }); }}><ArrowUp size={14} /></button></div>)}</>}
          {node.type === 'subflow' && <Field label={s.members}><div className="check-list">{plan.graph.nodes.filter(item => item.id !== node.id).map(item => <label key={item.id}><input type="checkbox" checked={node.memberNodeIds.includes(item.id)} onChange={event => onNode({ ...node, memberNodeIds: event.target.checked ? [...node.memberNodeIds, item.id] : node.memberNodeIds.filter(id => id !== item.id) })} />{item.name}</label>)}</div></Field>}
        </fieldset>
      </>}
      {edge && <fieldset disabled={!editable} className="form-fields">
        <div className="entity-badge type-route"><span className="entity-icon"><Route size={16} aria-hidden="true" /></span><div><b>{s.route}</b><code>{edge.id}</code></div></div>
        <p className="route-path"><span>{plan.graph.nodes.find(item => item.id === edge.source)?.name}</span><i>→</i><span>{plan.graph.nodes.find(item => item.id === edge.target)?.name}</span></p>
        <Field label={s.transfer} hint={s.transferHint}><NumberInput value={edge.transferDuration?.kind === 'fixed' ? edge.transferDuration.value : 0} step={0.1} onChange={value => onEdge({ ...edge, transferDuration: { kind: 'fixed', value, provenance: { kind: 'user_estimate' } } })} /></Field>
        {edge.transferDuration && edge.transferDuration.kind !== 'fixed' && <p className="subtle">{s.transferKind(edge.transferDuration.kind)}</p>}
      </fieldset>}
      {(node || edge) && <div className="inspector-actions">
        {node && <button type="button" className="btn ghost" onClick={onSaveTemplate}><BookmarkPlus size={14} aria-hidden="true" />{t.templates.saveNode}</button>}
        <button type="button" className="btn ghost" onClick={onAdvanced}><Braces size={14} aria-hidden="true" />{editable ? s.advanced : s.viewConfig}</button>
        {editable && <button type="button" className="btn danger-ghost" onClick={onDelete}><Trash2 size={14} aria-hidden="true" />{node ? s.deleteNode : s.deleteEdge}</button>}
      </div>}
      {metric && <section className="node-results">
        <h3>{s.results}</h3>
        <div className="result-grid">
          <span><small>{s.visitors}</small><b>{metric.visitors}</b></span>
          <span><small>{s.averageWait}</small><b>{t.formatWait(metric.averageWaiting)}</b></span>
          <span><small>{s.peakQueue}</small><b>{s.people(metric.maxQueue)}</b></span>
          <span><small>{s.constrained}</small><b>{t.formatWait(metric.bottleneckSeconds)}</b></span>
        </div>
        <p>{s.constrainedNote}</p>
      </section>}
      {related.length > 0 && <div className="issue-list">{related.map((issue, index) => <div key={index} className={issue.severity}><b><TriangleAlert size={13} aria-hidden="true" />{issue.severity === 'error' ? s.mustFix : s.notice}</b><p>{issueText(issue, lang)}</p><code>{issue.path.join('.')}</code></div>)}</div>}
    </div>
  </aside>;
}
