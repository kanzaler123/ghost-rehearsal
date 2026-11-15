import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { ArrowUpRight, Crosshair, Search, Star } from 'lucide-react';
import type { Plan, Scenario } from '../schemas';
import { formatTime } from '../features/project';
import { firstDifference, journeyOf, sameStation, stationsOf, statusAt } from '../features/analysis';
import type { Journey, PickGroup, VisitorStatus } from '../features/analysis';
import { useI18n } from '../i18n';
import type { Messages } from '../i18n';
import type { SimulationRun } from '../simulation/types';
import { Ghost } from './Icons';
import { EVENT_TONES } from './Results';

const cls = (...names: (string | false | undefined | null)[]) => names.filter(Boolean).join(' ');
const nodeName = (plan: Plan, id?: string) => plan.graph.nodes.find(node => node.id === id)?.name ?? '—';

export function describeStatus(status: VisitorStatus, plan: Plan, time: number, t: Messages): string {
  const s = t.journey.status;
  switch (status.kind) {
    case 'not_arrived': return s.not_arrived();
    case 'done': return s.done(formatTime(status.time));
    case 'left': return s.left(formatTime(status.time));
    case 'queue': case 'blocked': case 'hold': return s[status.kind](nodeName(plan, status.nodeId), t.formatWait(time - status.since));
    case 'service': return s.service(nodeName(plan, status.nodeId));
    default: return s.moving(nodeName(plan, status.nodeId));
  }
}

/** Status class shared by the canvas, the lanes and the ghost avatar. */
export const statusTone = (status: VisitorStatus) =>
  status.kind === 'service' ? 'working' : status.kind === 'blocked' ? 'blocked' : status.kind === 'queue' || status.kind === 'hold' ? 'waiting' : status.kind === 'done' ? 'done' : status.kind === 'left' ? 'left' : 'idle';

export function pickValue(key: string, value: number, t: Messages): string {
  // The group title already says where the ghost finished; the time is enough here.
  if (key === 'rescued' || key === 'lost') return formatTime(value);
  if (key === 'less' || key === 'more') return `${value > 0 ? '+' : '−'}${t.formatWait(Math.abs(value))}`;
  return t.formatWait(value);
}

interface Props {
  runs: SimulationRun[]; compare: boolean; scenario: Scenario; visitorId: string; time: number; endTime: number;
  picks: PickGroup[]; featured?: string; nameOf: (id: string) => string;
  onChoose: (id: string) => void; onJump: (time: number, nodeId: string | undefined, planId: string) => void; onLocate: () => void;
}

export function GhostJourney({ runs, compare, scenario, visitorId, time, endTime, picks, featured, nameOf, onChoose, onJump, onLocate }: Props) {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const population = runs[0].population;
  const names = useMemo(() => population.map(person => ({ id: person.id, name: nameOf(person.id) })), [population, nameOf]);
  const journeys = useMemo(() => visitorId ? runs.map(run => journeyOf(run, visitorId)) : [], [runs, visitorId]);
  const person = population.find(item => item.id === visitorId);
  const plans = runs.map(run => run.request.plan);
  const span = Math.max(1, endTime);
  const pct = (value: number) => `${Math.max(0, Math.min(100, value / span * 100))}%`;
  const difference = compare && journeys.length === 2 ? firstDifference(journeys[0], journeys[1], plans[0], plans[1]) : null;
  function find(text: string) {
    const value = text.trim().toLowerCase();
    if (!value) return undefined;
    const number = value.match(/^#?(\d+)$/)?.[1];
    return names.find(item => item.id.toLowerCase() === value || item.name.toLowerCase() === value)
      ?? (number ? names.find(item => item.id.endsWith(`:${number}`)) : undefined)
      ?? names.find(item => item.name.toLowerCase().includes(value) || item.id.toLowerCase().includes(value));
  }
  const ticks = Array.from({ length: Math.floor(span / 300) + 1 }, (_, index) => index * 300).filter(value => value <= span);
  return <div className="ghost-journey">
    <aside className="ghost-stories">
      <label className="search-box"><Search size={14} aria-hidden="true" />
        <input aria-label={t.journey.pick} placeholder={t.journey.placeholder} list="ghost-names" value={query}
          onChange={event => { setQuery(event.target.value); const exact = names.find(item => item.name === event.target.value || item.id === event.target.value); if (exact) { onChoose(exact.id); setQuery(''); } }}
          onKeyDown={event => { if (event.key === 'Enter') { const match = find(query); if (match) { onChoose(match.id); setQuery(''); } } }} />
      </label>
      <datalist id="ghost-names">{names.map(item => <option key={item.id} value={item.name} />)}</datalist>
      <span className="eyebrow">{t.journey.stories}</span>
      {picks.map(group => <div className="story-group" key={group.key}>
        <h4>{t.journey.picks[group.key]}<span>{t.journey.count(group.total)}</span></h4>
        {group.items.map(item => <button type="button" key={item.id} className={cls('story-pick', item.id === visitorId && 'active')} onClick={() => onChoose(item.id)}>
          <Ghost size={14} /><span>{nameOf(item.id)}</span>{item.id === featured && <em title={t.journey.featured} aria-label={t.journey.featured}><Star size={10} aria-hidden="true" /></em>}<b>{pickValue(group.key, item.value, t)}</b>
        </button>)}
      </div>)}
    </aside>
    {!visitorId || !person ? <p className="journey-hint"><Ghost size={18} />{t.journey.hint}</p> : <section className="ghost-detail">
      <div className="ghost-card">
        <span className={cls('ghost-avatar', `tone-${statusTone(statusAt(journeys[0], time))}`)}><Ghost size={30} /></span>
        <div className="ghost-id">
          <b>{nameOf(visitorId)}</b><code>{visitorId}</code>
          <p>{t.journey.arrived(nodeName(plans[0], journeys[0].entranceId), formatTime(person.arrivalTime))}</p>
          {scenario.attributes.length > 0 && <div className="ghost-attrs">{scenario.attributes.map(attribute => <span key={attribute.id}>{attribute.name}<b>{person.attributes[attribute.id] ?? '—'}</b></span>)}</div>}
        </div>
        <button type="button" className="btn small ghost locate" onClick={onLocate}><Crosshair size={14} aria-hidden="true" />{t.journey.locate}</button>
      </div>

      <div className="lanes" style={{ '--now': Math.max(0, Math.min(1, time / span)) } as CSSProperties} aria-label={t.journey.lanes}>
        <div className="lane-axis" aria-hidden="true"><span className="lane-label" />{<div className="lane-ticks">{ticks.map(tick => <i key={tick} style={{ left: pct(tick) }}>{formatTime(tick)}</i>)}</div>}</div>
        {journeys.map((journey, column) => {
          const status = statusAt(journey, time);
          const at = journey.arrival === undefined || time < journey.arrival ? undefined : Math.min(time, journey.end?.time ?? journey.until);
          return <div className="lane" key={column}>
            <span className={cls('lane-label', compare && (column ? 'is-b' : 'is-a'))}>{compare ? (column ? 'B' : 'A') : ''}</span>
            <div className="lane-track">
              {journey.segments.map((segment, index) => <button type="button" key={index} className={cls('seg', `seg-${segment.kind}`, segment.open && 'open')}
                style={{ left: pct(segment.start), width: pct(segment.end - segment.start) }}
                title={`${t.journey.segments[segment.kind]} · ${nodeName(plans[column], segment.nodeId)} · ${formatTime(segment.start)}–${formatTime(segment.end)}`}
                onClick={() => onJump(segment.start, segment.nodeId, plans[column].id)}><span>{nodeName(plans[column], segment.nodeId)}</span></button>)}
              {journey.end && <i className={cls('lane-end', journey.end.kind)} style={{ left: pct(journey.end.time) }} />}
              {at !== undefined && <span className={cls('lane-ghost', `tone-${statusTone(status)}`)} style={{ left: pct(at) }}><Ghost size={18} /></span>}
            </div>
          </div>;
        })}
        {difference && Number.isFinite(difference.time) && <i className="lane-diff" style={{ left: `calc(var(--lane-label) + (100% - var(--lane-label)) * ${Math.min(1, difference.time / span)})` }} />}
        <div className="lane-legend">{(['queue', 'hold', 'blocked', 'service'] as const).map(kind => <span key={kind}><i className={`seg-${kind}`} />{t.journey.segments[kind]}</span>)}</div>
      </div>

      <div className="ghost-futures">{journeys.map((journey, column) => {
        const outcome = runs[column].statistics?.visitors.find(item => item.id === visitorId);
        return <div className="future-row" key={column}>
          {compare ? <span className={cls('ab-badge', column === 1 && 'alt')}>{column ? 'B' : 'A'}</span> : <span />}
          <span><small>{t.journey.now}</small>{describeStatus(statusAt(journey, time), plans[column], time, t)}</span>
          <span><small>{t.journey.cutoff}</small>{outcome ? t.journey.outcome(t.outcomes[outcome.outcome], t.formatWait(outcome.waiting)) : '—'}</span>
        </div>;
      })}</div>

      {compare && journeys.length === 2 && <div className="diff-note">
        {difference ? <>
          <b>{t.journey.firstDiff}</b>
          <span>{t.journey.diffAt(difference.a ? nodeName(plans[0], difference.a.nodeId) : nodeName(plans[1], difference.b?.nodeId), formatTime(difference.time))}</span>
          <span>{difference.a && difference.b && sameStation(plans[0], difference.a.nodeId, plans[1], difference.b.nodeId)
            ? `A · ${t.journey.segments[difference.a.kind]} ${t.formatWait(difference.a.end - difference.a.start)} / B · ${t.journey.segments[difference.b.kind]} ${t.formatWait(difference.b.end - difference.b.start)}`
            : t.journey.diffRoute(nodeName(plans[0], difference.a?.nodeId), nodeName(plans[1], difference.b?.nodeId))}</span>
          <button type="button" className="btn small accent" onClick={() => onJump(difference.time, difference.a?.nodeId ?? difference.b?.nodeId, plans[difference.a ? 0 : 1].id)}>{t.journey.jump}<ArrowUpRight size={14} aria-hidden="true" /></button>
        </> : <span>{t.journey.noDiff}</span>}
      </div>}

      <StationTable journeys={journeys} plans={plans} compare={compare} />

      <details className="evidence">
        <summary>{t.journey.evidence(journeys.reduce((sum, journey) => sum + journey.events.length, 0))}</summary>
        <div className={cls('journey-columns', compare && 'two')}>{journeys.map((journey, column) => <div key={column} className="journey-column">
          <div className="journey-heading">{compare && <span className={cls('ab-badge', column === 1 && 'alt')}>{column ? 'B' : 'A'}</span>}<b>{plans[column].name}</b></div>
          <ol className="journey-events">{journey.events.map(event => <li key={event.seq}><button type="button" onClick={() => onJump(event.time, event.nodeId, plans[column].id)}>
            <time>{formatTime(event.time)}</time><i className={`dot t-${EVENT_TONES[event.type] ?? 'system'}`} /><span>{t.eventTypes[event.type] ?? event.type}</span><small>{nodeName(plans[column], event.nodeId)}</small>
          </button></li>)}</ol>
        </div>)}</div>
      </details>
    </section>}
  </div>;
}

function StationTable({ journeys, plans, compare }: { journeys: Journey[]; plans: Plan[]; compare: boolean }) {
  const { t } = useI18n();
  const a = stationsOf(journeys[0]);
  const b = journeys[1] ? stationsOf(journeys[1]) : [];
  const rows: { name: string; a?: (typeof a)[number]; b?: (typeof b)[number] }[] = a.map(station => {
    const match = b.find(other => sameStation(plans[0], station.nodeId, plans[1] ?? plans[0], other.nodeId));
    return { name: nodeName(plans[0], station.nodeId), a: station, b: match };
  });
  b.filter(station => !rows.some(row => row.b === station)).forEach(station => rows.push({ name: nodeName(plans[1], station.nodeId), b: station }));
  if (!rows.length) return null;
  const cell = (value?: number) => value === undefined ? <span className="muted">{t.journey.notVisited}</span> : t.formatWait(value);
  return <table className="station-table">
    <thead><tr><th>{t.journey.station}</th>{compare ? <><th>A · {t.journey.wait}</th><th>B · {t.journey.wait}</th><th>{t.journey.delta}</th><th>A · {t.journey.service}</th><th>B · {t.journey.service}</th></> : <><th>{t.journey.wait}</th><th>{t.journey.service}</th></>}</tr></thead>
    <tbody>{rows.map((row, index) => {
      const delta = row.a && row.b ? row.b.queue - row.a.queue : undefined;
      return <tr key={index} className={cls(delta !== undefined && Math.abs(delta) > 0.5 && 'differs', (!row.a || !row.b) && compare && 'differs')}>
        <td>{row.name}</td>
        {compare ? <>
          <td>{cell(row.a?.queue)}</td><td>{cell(row.b?.queue)}</td>
          <td className={cls(delta !== undefined && delta < -0.5 && 'good', delta !== undefined && delta > 0.5 && 'bad')}>{delta === undefined ? '—' : Math.abs(delta) <= 0.5 ? '0' : `${delta > 0 ? '+' : '−'}${t.formatWait(Math.abs(delta))}`}</td>
          <td>{cell(row.a?.service)}</td><td>{cell(row.b?.service)}</td>
        </> : <><td>{cell(row.a?.queue)}</td><td>{cell(row.a?.service)}</td></>}
      </tr>;
    })}</tbody>
  </table>;
}
