import { ArrowUpRight, Ghost as GhostIcon, Sparkles } from 'lucide-react';
import type { Plan } from '../schemas';
import { formatTime } from '../features/project';
import { useI18n } from '../i18n';
import type { SimulationEvent, SimulationRun } from '../simulation/types';
import { Ghost } from './Icons';

export interface PlanChange { id: string; kind: 'node' | 'edge' | 'staff' | 'device' | 'assignment'; label: 'added' | 'removed' | 'modified' }

const cls = (...names: (string | false | undefined | null)[]) => names.filter(Boolean).join(' ');

const EVENT_TONES: Record<string, string> = {
  VISITOR_ARRIVAL: 'arrive', ROUTE_TRANSITION: 'move', QUEUE_ENTER: 'queue', QUEUE_BLOCKED: 'block', QUEUE_REROUTED: 'block',
  HOLD_ENTER: 'queue', HOLD_RELEASE: 'move', SERVICE_START: 'serve', SERVICE_COMPLETE: 'serve', VISITOR_COMPLETE: 'done',
  VISITOR_LEAVE: 'leave', RESOURCE_CHANGE: 'system', NODE_SCHEDULE_CHANGE: 'system', RUN_WARNING: 'block',
};

export function EmptyResults({ onRun }: { onRun: () => void }) {
  const { t } = useI18n();
  return <div className="empty-results">
    <div className="empty-ghost small"><Ghost size={38} /></div>
    <div><strong>{t.dock.emptyTitle}</strong><p>{t.dock.emptyText}</p></div>
    <button type="button" className="btn primary" onClick={onRun}>{t.dock.emptyCta}<ArrowUpRight size={15} aria-hidden="true" /></button>
  </div>;
}

interface InsightsProps {
  run: SimulationRun; second?: SimulationRun; compare: boolean; comparisonReady: boolean; changes: PlanChange[];
  scenarioId: string; overrides: number; onSelectNode: (id: string) => void;
}

export function Insights({ run, second, compare, comparisonReady, changes, scenarioId, overrides, onSelectNode }: InsightsProps) {
  const { t } = useI18n();
  const i = t.insights;
  const stats = run.statistics;
  const secondStats = compare && comparisonReady ? second?.statistics ?? null : null;
  const nameOf = (id: string) => run.request.plan.graph.nodes.find(node => node.id === id)?.name ?? second?.request.plan.graph.nodes.find(node => node.id === id)?.name ?? id;
  const waits = new Map<string, { a: number; b: number }>();
  stats?.nodes.forEach(item => waits.set(item.id, { a: item.waiting, b: 0 }));
  secondStats?.nodes.forEach(item => waits.set(item.id, { a: waits.get(item.id)?.a ?? 0, b: item.waiting }));
  const rows = [...waits.entries()].filter(([, value]) => value.a > 0 || value.b > 0).sort((x, y) => Math.max(y[1].a, y[1].b) - Math.max(x[1].a, x[1].b)).slice(0, 5);
  const peak = Math.max(1, ...rows.map(([, value]) => Math.max(value.a, value.b)));
  const completedDelta = stats && secondStats ? secondStats.outcomes.completed - stats.outcomes.completed : 0;
  const waitDelta = stats?.averageWaiting != null && secondStats?.averageWaiting != null ? secondStats.averageWaiting - stats.averageWaiting : null;
  return <div className="insights">
    <div className="bottleneck-chart">
      <div className="insight-title"><span>{i.title}</span><small>{i.basis}</small></div>
      {rows.length ? rows.map(([id, value], index) => <button type="button" key={id} className={cls('bar-row', index === 0 && 'is-top')} onClick={() => onSelectNode(id)}>
        <span className="bar-name">{nameOf(id)}</span>
        <span className="bar-tracks">
          <span className="bar-track"><i style={{ width: `${value.a / peak * 100}%` }} /></span>
          {secondStats && <span className="bar-track alt"><i style={{ width: `${value.b / peak * 100}%` }} /></span>}
        </span>
        <span className="bar-values"><b>{t.formatWait(value.a)}</b>{secondStats && <b className="alt">{t.formatWait(value.b)}</b>}</span>
      </button>) : <p className="subtle">{stats ? i.none : i.incomplete}</p>}
      {secondStats && rows.length > 0 && <div className="bar-legend"><span><i />A</span><span className="alt"><i />B</span></div>}
    </div>
    <div className="insight-note">
      <span className="eyebrow"><Sparkles size={12} aria-hidden="true" />{i.eyebrow}</span>
      {compare ? <>
        <h3>{comparisonReady ? i.compareTitle : i.staleTitle}</h3>
        <p>{comparisonReady && stats && secondStats ? i.compareSummary(`${completedDelta >= 0 ? '+' : ''}${completedDelta}`, waitDelta === null ? i.noData : `${waitDelta > 0 ? '+' : ''}${t.formatWait(waitDelta)}`) : i.needFresh}</p>
        {changes.length > 0 && <div className="change-chips">{changes.slice(0, 6).map(change => <span key={`${change.kind}-${change.id}`} className={`chip ${change.label}`}>{i.kinds[change.kind]} <code>{change.id}</code> {i.changeLabels[change.label]}</span>)}{changes.length > 6 && <span className="chip">+{changes.length - 6}</span>}</div>}
      </> : <>
        <h3>{i.rehearseTitle}</h3><p>{i.rehearseText1}</p><p>{i.rehearseText2}</p>
      </>}
      <small>{i.footnote(scenarioId, overrides)}</small>
    </div>
  </div>;
}

export function EventLog({ events, plan, onPick }: { events: SimulationEvent[]; plan: Plan; onPick: (event: SimulationEvent) => void }) {
  const { t } = useI18n();
  return <div className="event-table" role="table">
    <div className="table-header" role="row"><span>{t.events.time}</span><span>{t.events.event}</span><span>{t.events.subject}</span><span>{t.events.place}</span></div>
    {events.length ? events.map(event => <button type="button" role="row" key={event.seq} onClick={() => onPick(event)}>
      <time>{formatTime(event.time)}</time>
      <span><em className={`tone t-${EVENT_TONES[event.type] ?? 'system'}`}>{t.eventTypes[event.type] ?? event.type}</em></span>
      <code>{event.participantId ?? event.resourceUnitIds?.join(', ') ?? '—'}</code>
      <span>{plan.graph.nodes.find(node => node.id === event.nodeId)?.name ?? '—'}</span>
    </button>) : <p className="subtle">{t.events.empty}</p>}
  </div>;
}

interface JourneyProps {
  runs: (SimulationRun | undefined)[]; compare: boolean; visitorId: string; population: string[];
  onChoose: (id: string) => void; onJumpDifference: () => void; onJump: (event: SimulationEvent, planId: string) => void;
}

export function Journey({ runs, compare, visitorId, population, onChoose, onJumpDifference, onJump }: JourneyProps) {
  const { t } = useI18n();
  return <div className="journey-panel">
    <div className="journey-picker">
      <span className="picker-ghost"><Ghost size={18} /></span>
      <select aria-label={t.journey.pick} value={visitorId} onChange={event => onChoose(event.target.value)}><option value="">{t.journey.placeholder}</option>{population.map(id => <option key={id} value={id}>{id}</option>)}</select>
      {compare && <button type="button" className="btn small accent" disabled={!visitorId} onClick={onJumpDifference}>{t.journey.jump}<ArrowUpRight size={14} aria-hidden="true" /></button>}
    </div>
    {visitorId ? <div className={cls('journey-columns', compare && 'two')}>{runs.map((result, column) => result && <div key={column} className="journey-column">
      <div className="journey-heading">
        {compare && <span className={cls('ab-badge', column === 1 && 'alt')}>{column ? 'B' : 'A'}</span>}
        <b>{result.request.plan.name}</b>
        <span className="journey-outcome">{t.journey.atCutoff(t.outcomes[result.statistics?.visitors.find(person => person.id === visitorId)?.outcome ?? 'unfinished'], t.formatWait(result.statistics?.visitors.find(person => person.id === visitorId)?.waiting))}</span>
      </div>
      <ol className="journey-events">{result.events.filter(event => event.participantId === visitorId).map(event => <li key={event.seq}><button type="button" onClick={() => onJump(event, result.request.plan.id)}>
        <time>{formatTime(event.time)}</time><i className={`dot t-${EVENT_TONES[event.type] ?? 'system'}`} /><span>{t.eventTypes[event.type] ?? event.type}</span><small>{result.request.plan.graph.nodes.find(node => node.id === event.nodeId)?.name}</small>
      </button></li>)}</ol>
    </div>)}</div> : <p className="journey-hint"><GhostIcon size={16} aria-hidden="true" />{t.journey.hint}</p>}
  </div>;
}

export function ResourceUse({ run }: { run: SimulationRun }) {
  const { t } = useI18n();
  const stats = run.statistics;
  if (!stats) return <p className="subtle">{t.resources.incomplete}</p>;
  return <div className="resource-results">{stats.resources.map(resource => {
    const value = resource.utilization ?? 0;
    return <div key={resource.id} className={cls('resource-card', value > 0.85 && 'hot')}>
      <div className="resource-top"><code>{resource.id}</code><b>{resource.utilization === null ? t.resources.none : `${(value * 100).toFixed(1)}%`}</b></div>
      <div className="util-bar"><i style={{ width: `${value * 100}%` }} /></div>
      <small>{t.resources.detail(t.formatWait(resource.busy), t.formatWait(resource.handover), t.formatWait(resource.overtime))}</small>
    </div>;
  })}</div>;
}
