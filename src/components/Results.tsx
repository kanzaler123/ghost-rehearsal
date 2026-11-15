import { ArrowUpRight, Sparkles } from 'lucide-react';
import type { Plan } from '../schemas';
import { formatTime } from '../features/project';
import { useI18n } from '../i18n';
import type { SimulationEvent, SimulationRun } from '../simulation/types';
import { Ghost } from './Icons';

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

/** Rehearse: where waiting accumulated by the observation cutoff. */
export function Insights({ run, scenarioId, overrides, onSelectNode }: { run: SimulationRun; scenarioId: string; overrides: number; onSelectNode: (id: string) => void }) {
  const { t } = useI18n();
  const i = t.insights;
  const stats = run.statistics;
  const nameOf = (id: string) => run.request.plan.graph.nodes.find(node => node.id === id)?.name ?? id;
  const rows = (stats?.nodes ?? []).filter(item => item.waiting > 0).sort((a, b) => b.waiting - a.waiting).slice(0, 5);
  const peak = Math.max(1, ...rows.map(item => item.waiting));
  return <div className="insights">
    <div className="bottleneck-chart">
      <div className="insight-title"><span>{i.title}</span><small>{i.basis}</small></div>
      {rows.length ? rows.map((item, index) => <button type="button" key={item.id} className={cls('bar-row', index === 0 && 'is-top')} onClick={() => onSelectNode(item.id)}>
        <span className="bar-name">{nameOf(item.id)}</span>
        <span className="bar-tracks"><span className="bar-track"><i style={{ width: `${item.waiting / peak * 100}%` }} /></span></span>
        <span className="bar-values"><b>{t.formatPersonTime(item.waiting)}</b><small>{t.inspector.peakQueue} {t.inspector.people(item.maxQueue)}</small></span>
      </button>) : <p className="subtle">{stats ? i.none : i.incomplete}</p>}
    </div>
    <div className="insight-note">
      <span className="eyebrow"><Sparkles size={12} aria-hidden="true" />{i.eyebrow}</span>
      <h3>{i.rehearseTitle}</h3><p>{i.rehearseText1}</p><p>{i.rehearseText2}</p>
      <small>{i.footnote(scenarioId, overrides)}</small>
    </div>
  </div>;
}

export function EventLog({ events, plan, nameOf, onPick }: { events: SimulationEvent[]; plan: Plan; nameOf: (id: string) => string; onPick: (event: SimulationEvent) => void }) {
  const { t } = useI18n();
  return <div className="event-table" role="table">
    <div className="table-header" role="row"><span>{t.events.time}</span><span>{t.events.event}</span><span>{t.events.subject}</span><span>{t.events.place}</span></div>
    {events.length ? events.map(event => <button type="button" role="row" key={event.seq} onClick={() => onPick(event)}>
      <time>{formatTime(event.time)}</time>
      <span><em className={`tone t-${EVENT_TONES[event.type] ?? 'system'}`}>{t.eventTypes[event.type] ?? event.type}</em></span>
      <span className="event-subject" title={event.participantId ?? event.resourceUnitIds?.join(', ')}>{event.participantId ? nameOf(event.participantId) : event.resourceUnitIds?.map(id => resourceName(plan, id)).join(', ') ?? '—'}</span>
      <span>{plan.graph.nodes.find(node => node.id === event.nodeId)?.name ?? '—'}</span>
    </button>) : <p className="subtle">{t.events.empty}</p>}
  </div>;
}

export function ResourceUse({ run }: { run: SimulationRun }) {
  const { t } = useI18n();
  const stats = run.statistics;
  if (!stats) return <p className="subtle">{t.resources.incomplete}</p>;
  return <div className="resource-results">{stats.resources.map(resource => {
    const value = resource.utilization ?? 0;
    return <div key={resource.id} className={cls('resource-card', value > 0.85 && 'hot')}>
      <div className="resource-top"><span title={resource.id}>{resourceName(run.request.plan, resource.id)}</span><b>{resource.utilization === null ? t.resources.none : `${(value * 100).toFixed(1)}%`}</b></div>
      <div className="util-bar"><i style={{ width: `${value * 100}%` }} /></div>
      <small>{t.resources.detail(t.formatWait(resource.busy), t.formatWait(resource.handover), t.formatWait(resource.overtime))}</small>
    </div>;
  })}</div>;
}
