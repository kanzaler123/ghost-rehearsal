import { useMemo, useState } from 'react';
import { ArrowUpRight, Sparkles } from 'lucide-react';
import type { Plan } from '../schemas';
import { assignmentDescription, durationDescription, formatTime, nodeInstructions } from '../features/project';
import { comparisonContext, nodeEvidence, statisticsAt, THRESHOLD, visitorName } from '../features/analysis';
import type { ResultBasis, WaitThreshold } from '../features/analysis';
import { useI18n } from '../i18n';
import type { SimulationEvent, SimulationRun } from '../simulation/types';
import { Ghost } from './Icons';
import { StatisticsScope } from './StatisticsScope';
import { RunStateCard } from './shell/RunStateCard';
import { deriveEmptyState } from './shell/runState';

const cls = (...names: (string | false | undefined | null)[]) => names.filter(Boolean).join(' ');

export const EVENT_TONES: Record<string, string> = {
  VISITOR_ARRIVAL: 'arrive', ROUTE_TRANSITION: 'move', QUEUE_ENTER: 'queue', QUEUE_BLOCKED: 'block', QUEUE_REROUTED: 'block',
  HOLD_ENTER: 'queue', HOLD_RELEASE: 'move', SERVICE_START: 'serve', SERVICE_COMPLETE: 'serve', VISITOR_COMPLETE: 'done',
  VISITOR_LEAVE: 'leave', RESOURCE_CHANGE: 'system', NODE_SCHEDULE_CHANGE: 'system', RUN_WARNING: 'block',
};

/** Display name of a resource unit such as `scanner:2`. */
export function resourceName(plan: Plan, id: string): string {
  const staff = plan.staff.find(item => item.id === id);
  if (staff) return staff.name;
  const [type, unit] = id.split(':');
  const device = plan.deviceTypes.find(item => item.id === type);
  return device ? (unit && device.quantity > 1 ? `${device.name} ${unit}` : device.name) : id;
}

export function EmptyResults({ onRun }: { onRun: () => void }) {
  const { t } = useI18n();
  return <div className="empty-results">
    <div className="empty-ghost small"><Ghost size={38} /></div>
    <div><strong>{t.dock.emptyTitle}</strong><p>{t.dock.emptyText}</p></div>
    <button type="button" className="btn primary" onClick={onRun}>{t.dock.emptyCta}<ArrowUpRight size={15} aria-hidden="true" /></button>
  </div>;
}

export interface PlanChange { id: string; kind: 'node' | 'edge' | 'staff' | 'device' | 'assignment'; label: 'added' | 'removed' | 'modified' }

interface InsightsProps {
  run: SimulationRun; second?: SimulationRun; compare: boolean; comparisonReady: boolean; changes: PlanChange[];
  scenarioId: string; overrides: number; basis: ResultBasis; onSelectNode: (id: string, owner: string) => void;
  onChoose: (id: string) => void; onJump: (time: number, nodeId: string, owner: string) => void; onExperiment?: () => void;
  threshold?: WaitThreshold; initialEvidence?: { id: string; owner: string };
  onRerun?: () => void;
}

export function Insights({ run, second, compare, comparisonReady, changes, scenarioId, overrides, basis, onSelectNode, onChoose, onJump, onExperiment, threshold = THRESHOLD, initialEvidence, onRerun }: InsightsProps) {
  const { t } = useI18n();
  const i = t.insights;
  const context = useMemo(() => comparisonContext(run, second, basis, threshold, comparisonReady), [run, second, basis, threshold, comparisonReady]);
  const stats = compare ? context.a : statisticsAt(run, basis);
  const secondStats = compare ? context.b : null;
  const [group, setGroup] = useState<'less' | 'more' | 'same' | null>(null);
  const [selected, setSelected] = useState<{ id: string; owner: string } | null>(initialEvidence ?? null);
  const pairs = compare ? context.visitors : [];
  const groups = Object.fromEntries((['less', 'more', 'same'] as const).map(key => [key, context.select(key)]));
  const groupLabels = threshold ? t.evidence.groups : t.evidence.anyGroups;
  const transitions = new Map<string, number>();
  pairs.filter(pair => pair.a.outcome !== pair.b.outcome).forEach(pair => { const key = `${pair.a.outcome}:${pair.b.outcome}`; transitions.set(key, (transitions.get(key) ?? 0) + 1); });
  const nameOf = (id: string) => run.request.plan.graph.nodes.find(node => node.id === id)?.name ?? second?.request.plan.graph.nodes.find(node => node.id === id)?.name ?? id;
  const waits = new Map<string, { a: number; b: number }>();
  stats?.nodes.forEach(item => waits.set(item.id, { a: item.waiting, b: 0 }));
  secondStats?.nodes.forEach(item => waits.set(item.id, { a: waits.get(item.id)?.a ?? 0, b: item.waiting }));
  const rows = [...waits.entries()].filter(([, value]) => value.a > 0 || value.b > 0).sort((x, y) => Math.max(y[1].a, y[1].b) - Math.max(x[1].a, x[1].b)).slice(0, 5);
  const peak = Math.max(1, ...rows.map(([, value]) => Math.max(value.a, value.b)));
  const completedDelta = stats && secondStats ? secondStats.outcomes.completed - stats.outcomes.completed : 0;
  const waitDelta = stats?.averageWaiting != null && secondStats?.averageWaiting != null ? secondStats.averageWaiting - stats.averageWaiting : null;
  const evidenceId = selected?.id ?? rows[0]?.[0] ?? '';
  const evidenceRun = second && secondStats && (selected?.owner === second.request.plan.id || (!selected && !run.request.plan.graph.nodes.some(node => node.id === evidenceId))) ? second : run;
  const evidence = useMemo(() => nodeEvidence(evidenceRun, evidenceId, basis), [evidenceRun, evidenceId, basis]);
  const emptyEvidence = deriveEmptyState({ rosterEmpty: false, filterActive: false, noDifference: false, evidenceCount: evidence?.events.length ?? 0 });
  const pick = (id: string, owner: string) => { setSelected({ id, owner }); onSelectNode(id, owner); };
  const changeText = (plan: Plan, change: PlanChange) => {
    if (change.kind === 'node') { const node = plan.graph.nodes.find(item => item.id === change.id); return node ? nodeInstructions(node, plan, t).join(' · ') : '—'; }
    if (change.kind === 'assignment') { const assignment = plan.assignments.find(item => item.resourceUnitId === change.id); return assignment ? assignmentDescription(assignment, plan, t) : '—'; }
    if (change.kind === 'edge') { const edge = plan.graph.edges.find(item => item.id === change.id); return edge ? `${edge.source} → ${edge.target}; ${edge.branchKey ?? ''}; ${edge.transferDuration ? durationDescription(edge.transferDuration, t) : t.formatWait(0)}` : '—'; }
    const resource = change.kind === 'staff' ? plan.staff.find(item => item.id === change.id) : plan.deviceTypes.find(item => item.id === change.id);
    return resource ? `${resource.name}: ${'quantity' in resource ? resource.quantity : resource.skillIds.join(', ')}; ${resource.shifts.map(window => `${formatTime(window.start)}–${formatTime(window.end)}`).join(', ')}; ${t.report.unavailable}: ${resource.unavailability.map(window => `${formatTime(window.start)}–${formatTime(window.end)}`).join(', ') || '—'}` : '—';
  };
  if (compare && context.status !== 'ready') return <p role="status">{t.evidence.unavailable[context.status]}</p>;
  return <div className={cls('analysis-panel', !!initialEvidence && 'has-target')}>
    <StatisticsScope runs={secondStats && second ? [run, second] : [run]} basis={basis} threshold={threshold} />
    {compare && secondStats && <section className="paired-summary">
      <h3>{t.review.paired}</h3>
      <div className="pair-groups">{(['less', 'more', 'same'] as const).map(key => <button type="button" className={cls('btn', group === key && 'active')} aria-pressed={group === key} key={key} onClick={() => setGroup(group === key ? null : key)}><b>{groups[key].length}</b> {groupLabels[key]}</button>)}</div>
      <p className="subtle">{t.evidence.rule}</p>
      <p className="subtle">{t.review.caveat}</p>
      <p>{t.review.transitions}: {[...transitions].map(([key, count]) => { const [a, b] = key.split(':'); return <span className="chip" key={key}>{count} · {t.outcomes[a]} → {t.outcomes[b]}</span>; })}</p>
      {group && <div className="paired-list"><table><thead><tr><th>{t.review.guest}</th><th>A</th><th>B</th><th>{t.review.delta}</th></tr></thead><tbody>{[...groups[group]].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).map(pair => <tr key={pair.id}><td><button type="button" className="text-btn" onClick={() => onChoose(pair.id)}>{pair.id}</button></td><td>{t.formatWait(pair.a.waiting)} · {t.outcomes[pair.a.outcome]}</td><td>{t.formatWait(pair.b.waiting)} · {t.outcomes[pair.b.outcome]}</td><td>{pair.delta > 0 ? '+' : ''}{t.formatWait(pair.delta)}</td></tr>)}</tbody></table></div>}
    </section>}
    <div className="insights">
    <div className="bottleneck-chart">
      <div className="insight-title"><span>{i.title}</span><small>{t.review[basis]}</small></div>
      {rows.length ? rows.map(([id, value], index) => <div key={id} className={cls('bar-row', index === 0 && 'is-top')}>
        <span className="bar-name">{nameOf(id)}</span>
        <span className="bar-tracks">
          <button type="button" className="bar-track" disabled={!run.request.plan.graph.nodes.some(node => node.id === id)} aria-label={`A · ${nameOf(id)}`} onClick={() => pick(id, run.request.plan.id)}><i style={{ width: `${value.a / peak * 100}%` }} /></button>
          {secondStats && second && <button type="button" className="bar-track alt" disabled={!second.request.plan.graph.nodes.some(node => node.id === id)} aria-label={`B · ${nameOf(id)}`} onClick={() => pick(id, second.request.plan.id)}><i style={{ width: `${value.b / peak * 100}%` }} /></button>}
        </span>
        <span className="bar-values"><b>{t.formatPersonTime(value.a)}</b>{secondStats && <b className="alt">{t.formatPersonTime(value.b)}</b>}</span>
      </div>) : <p className="subtle">{stats ? i.none : i.incomplete}</p>}
      {secondStats && rows.length > 0 && <div className="bar-legend"><span><i />A</span><span className="alt"><i />B</span></div>}
    </div>
    <div className="insight-note">
      <span className="eyebrow"><Sparkles size={12} aria-hidden="true" />{i.eyebrow}</span>
      {compare ? <>
        <h3>{comparisonReady ? i.compareTitle : i.staleTitle}</h3>
        <p>{comparisonReady && stats && secondStats ? i.compareSummary(`${completedDelta >= 0 ? '+' : ''}${completedDelta}`, waitDelta === null ? i.noData : `${waitDelta > 0 ? '+' : ''}${t.formatWait(waitDelta)}`) : i.needFresh}</p>
        {comparisonReady && second && changes.length > 0 && <details><summary>{t.review.changes}</summary>{changes.map(change => <div className="parameter-change" key={`${change.kind}-${change.id}`}><b>{i.kinds[change.kind]} {nameOf(change.id)} · {i.changeLabels[change.label]}</b><p>A: {changeText(run.request.plan, change)}</p><p>B: {changeText(second.request.plan, change)}</p></div>)}</details>}
        {onExperiment && comparisonReady && <div className="demo-next"><p>{t.review.demoHint}</p><button type="button" className="btn accent" onClick={onExperiment}>{t.review.demo}</button></div>}
      </> : <>
        <h3>{i.rehearseTitle}</h3><p>{i.rehearseText1}</p><p>{i.rehearseText2}</p>
      </>}
      <small>{i.footnote(scenarioId, overrides)}</small>
    </div>
    </div>
    <section className="evidence-card">
      <h3>{t.review.evidence} · {evidenceRun.request.plan.name} · {evidence?.node.name ?? nameOf(evidenceId)}</h3>
      {evidence && !emptyEvidence ? <>
        <p><b>{t.review.observed}</b>: {formatTime(evidence.from)}–{formatTime(evidence.to)} · {evidence.queued} {t.review.queued}, {evidence.blocked} {t.review.blocked}, {evidence.holding} {t.review.holding}, {evidence.serving} {t.review.serving}</p>
        <button type="button" className="btn small" onClick={() => onJump(evidence.from, evidence.node.id, evidenceRun.request.plan.id)}>{t.review.jump}</button>
        <h4>{t.review.constraints}</h4>
        {nodeInstructions(evidence.node, evidenceRun.request.plan, t).map((line, index) => <p key={index}>{line}</p>)}
        <ul>{evidence.resources.map(resource => <li key={resource.id}>{resource.id}: {t.review.states[resource.state] ?? resource.state}{resource.busyAt ? ` → ${nameOf(resource.busyAt)}` : ''}{!resource.posted && resource.state !== 'unposted' ? ` · ${t.review.states.unposted}` : ''}</li>)}</ul>
        <p className="subtle">{t.review.hypothesis}</p>
        <details><summary>{t.review.affected} ({evidence.visitors.length})</summary><div className="evidence-guests">{[...evidence.visitors].sort((a, b) => Math.abs(pairs.find(pair => pair.id === b)?.delta ?? 0) - Math.abs(pairs.find(pair => pair.id === a)?.delta ?? 0)).map(id => <button type="button" className="text-btn" key={id} onClick={() => onChoose(id)}>{id}{pairs.length > 0 ? ` · Δ ${t.formatWait(pairs.find(pair => pair.id === id)?.delta)}` : ''}</button>)}</div></details>
        <details><summary>{t.review.records}</summary><EventLog nameOf={id => visitorName(id, evidenceRun.request.plan, evidenceRun.request.scenario)} plan={evidenceRun.request.plan} events={[...new Map([...evidence.resources.flatMap(unit => unit.records.slice(-3)), ...evidence.events].map(event => [event.seq, event])).values()].sort((a, b) => a.seq - b.seq)} onPick={event => { onJump(event.time, event.nodeId ?? evidence.node.id, evidenceRun.request.plan.id); if (event.participantId) onChoose(event.participantId); }} /></details>
      </> : emptyEvidence && <RunStateCard kind={emptyEvidence.kind} action={emptyEvidence.action} detail={t.review.noEvidence} onAction={() => onRerun?.()} />}
    </section>
  </div>;
}

export function EventLog({ events, plan, nameOf, onPick }: { events: SimulationEvent[]; plan: Plan; nameOf: (id: string) => string; onPick: (event: SimulationEvent) => void }) {
  const { t } = useI18n();
  return <div className="event-table" role="table">
    <div className="table-header" role="row"><span>{t.events.time}</span><span>{t.events.event}</span><span>{t.events.subject}</span><span>{t.events.place}</span></div>
    {events.length ? events.map(event => <button type="button" role="row" key={event.seq} onClick={() => onPick(event)}>
      <time>{formatTime(event.time)}</time>
      <span><em className={`tone t-${EVENT_TONES[event.type] ?? 'system'}`}>{t.eventTypes[event.type] ?? event.type}</em></span>
      <span className="event-subject" title={event.participantId ?? event.resourceUnitIds?.join(', ')}>{event.participantId ? nameOf(event.participantId) : event.resourceUnitIds?.map(id => resourceName(plan, id)).join(', ') ?? '—'}{event.participantId && !!event.resourceUnitIds?.length && <small>{event.resourceUnitIds.join(', ')}</small>}{event.type === 'RESOURCE_CHANGE' && <small>{t.review.states[String(event.details?.from)] ?? event.details?.from} → {t.review.states[String(event.details?.to)] ?? event.details?.to}</small>}</span>
      <span>{plan.graph.nodes.find(node => node.id === event.nodeId)?.name ?? '—'}</span>
    </button>) : <p className="subtle">{t.events.empty}</p>}
  </div>;
}

export function ResourceUse({ run, second, basis, limits, onLimits }: { run: SimulationRun; second?: SimulationRun; basis: ResultBasis; limits: { staff: string; devices: string }; onLimits: (limits: { staff: string; devices: string }) => void }) {
  const { t } = useI18n();
  const { staff: maxStaff, devices: maxDevices } = limits;
  const stats = statisticsAt(run, basis);
  const right = statisticsAt(second, basis);
  if (!stats) return <p className="subtle">{t.resources.incomplete}</p>;
  const totals = (result: SimulationRun, kind: 'staff' | 'devices') => {
    const plan = result.request.plan, selected = statisticsAt(result, basis)!;
    const staffIds = new Set(plan.staff.map(item => item.id));
    const resources = selected.resources.filter(item => kind === 'staff' ? staffIds.has(item.id) : !staffIds.has(item.id));
    const units = kind === 'staff' ? plan.staff.map(item => ({ ...item, quantity: 1 })) : plan.deviceTypes;
    return { count: units.reduce((sum, item) => sum + item.quantity, 0), scheduled: units.reduce((sum, item) => sum + item.quantity * item.shifts.reduce((hours, window) => hours + Math.max(0, Math.min(window.end, selected.until) - window.start) / 3600, 0), 0),
      busy: resources.reduce((sum, item) => sum + item.busy / 3600, 0), overtime: resources.reduce((sum, item) => sum + item.overtime / 3600, 0) };
  };
  const ids = [...new Set([...stats.resources, ...(right?.resources ?? [])].map(item => item.id))];
  const utilization = (value: number | null | undefined) => value == null ? '—' : `${(value * 100).toFixed(1)}%`;
  return <div className="resource-comparison">
    <h3>{t.review.resourceCounts}</h3>
    <p className="subtle">{t.review.hoursHint}</p>
    <table><thead><tr><th>{t.review.resourceCounts}</th><th>A · {formatTime(stats.until)}</th>{right && <><th>B · {formatTime(right.until)}</th><th>{t.review.delta}</th></>}</tr></thead><tbody>
      {(['staff', 'devices'] as const).flatMap(kind => { const a = totals(run, kind), b = right && second ? totals(second, kind) : null; return (['count', 'scheduled', 'busy', 'overtime'] as const).map(key => <tr key={`${kind}-${key}`}><th>{t.review[kind]} · {key === 'count' ? t.review.resourceCounts : t.review[key]}</th><td>{a[key].toFixed(key === 'count' ? 0 : 2)}</td>{b && <><td>{b[key].toFixed(key === 'count' ? 0 : 2)}</td><td>{Math.round((b[key] - a[key]) * 100) > 0 ? '+' : ''}{(Math.round((b[key] - a[key]) * 100) / 100).toFixed(key === 'count' ? 0 : 2)}</td></>}</tr>); })}
    </tbody></table>
    <div className="resource-limits"><b>{t.review.budget}</b><label>{t.review.maxStaff}<input type="number" min={0} value={maxStaff} onChange={event => onLimits({ ...limits, staff: event.target.value })} /></label><label>{t.review.maxDevices}<input type="number" min={0} value={maxDevices} onChange={event => onLimits({ ...limits, devices: event.target.value })} /></label>
      {!maxStaff && !maxDevices ? <p>{t.review.noBudget}</p> : [run, ...(right && second ? [second] : [])].map((result, index) => <p key={index}>{index ? 'B' : 'A'}: {(maxStaff !== '' && totals(result, 'staff').count > Number(maxStaff)) || (maxDevices !== '' && totals(result, 'devices').count > Number(maxDevices)) ? t.review.exceeds : t.review.within}</p>)}
    </div>
    <table><thead><tr><th>{t.review.resourceCounts}</th><th>A</th>{right && <><th>B</th><th>{t.review.delta}</th></>}</tr></thead><tbody>{ids.map(id => {
      const a = stats.resources.find(item => item.id === id), b = right?.resources.find(item => item.id === id);
      return <tr key={id}><th title={id}>{resourceName(a ? run.request.plan : second!.request.plan, id)}</th><td>{utilization(a?.utilization)}{a && <small>{t.resources.detail(t.formatWait(a.busy), t.formatWait(a.handover), t.formatWait(a.overtime))}</small>}</td>{right && <><td>{utilization(b?.utilization)}{b && <small>{t.resources.detail(t.formatWait(b.busy), t.formatWait(b.handover), t.formatWait(b.overtime))}</small>}</td><td>{a && b ? t.resources.detail(t.formatWait(b.busy - a.busy), t.formatWait(b.handover - a.handover), t.formatWait(b.overtime - a.overtime)) : '—'}</td></>}</tr>;
    })}</tbody></table>
  </div>;
}
