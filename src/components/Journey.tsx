import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { ArrowLeft, ArrowUpRight, Crosshair, Search, Star } from 'lucide-react';
import type { Plan, Scenario } from '../schemas';
import { formatTime } from '../features/project';
import { affected, affectedVisitors, firstDifference, journeyOf, sameStation, stationsOf, statisticsAt, statusAt, THRESHOLD } from '../features/analysis';
import type { ResultBasis, AffectedFilter, Journey, PickGroup, VisitorStatus, WaitThreshold } from '../features/analysis';
import { useI18n } from '../i18n';
import type { Messages } from '../i18n';
import type { SimulationRun } from '../simulation/types';
import { Ghost } from './Icons';
import { EVENT_TONES } from './Results';
import { StatisticsScope } from './StatisticsScope';

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

/** A visitor can exemplify several effects; show one card with all those labels. */
export function groupPicks(picks: PickGroup[]): { id: string; tags: { key: string; value: number }[] }[] {
  const people = new Map<string, { id: string; tags: { key: string; value: number }[] }>();
  for (const group of picks) for (const item of group.items) {
    const person = people.get(item.id) ?? { id: item.id, tags: [] };
    if (!person.tags.some(tag => tag.key === group.key)) person.tags.push({ key: group.key, value: item.value });
    people.set(item.id, person);
  }
  return [...people.values()];
}

interface Props {
  runs: SimulationRun[]; compare: boolean; scenario: Scenario; visitorId: string; time: number; endTime: number;
  picks: PickGroup[]; featured?: string; nameOf: (id: string) => string;
  onChoose: (id: string) => void; onJump: (time: number, nodeId: string | undefined, planId: string) => void; onLocate: () => void;
  group?: AffectedFilter; basis?: ResultBasis; threshold?: WaitThreshold;
  onGroupChange?: (filter: AffectedFilter | undefined) => void;
  onOverview?: () => void;
}

const PAGE_SIZE = 20;
const FILTERS: AffectedFilter[] = ['less', 'more', 'same', 'rescued', 'lost'];

export function GhostJourney({ runs, compare, scenario, visitorId, time, picks, featured, nameOf, onChoose, onJump, onLocate, group, onGroupChange, onOverview, basis = 'cutoff', threshold = THRESHOLD }: Props) {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [localGroup, setLocalGroup] = useState<AffectedFilter>();
  const detailRef = useRef<HTMLElement>(null);
  const activeGroup = onGroupChange ? group : localGroup;
  const population = runs[0]?.population ?? [];
  const a = statisticsAt(runs[0], basis), b = compare ? statisticsAt(runs[1], basis) : undefined;
  const paired = useMemo(() => a && b ? affectedVisitors(a, b, activeGroup, threshold) : null, [a, b, activeGroup, threshold]);
  const counts = useMemo(() => a && b ? affected(a, b, threshold) : null, [a, b, threshold]);
  // Keep old evidence internally consistent while the surrounding workspace marks a run stale.
  const cutoff = basis === 'completion' ? Math.max(...runs.map(run => statisticsAt(run, basis)?.until ?? 0)) : a?.until ?? runs[0]?.request.scenario.observationCutoff ?? scenario.observationCutoff;
  const replayTime = Math.min(time, cutoff);
  const journeys = useMemo(() => visitorId ? runs.map(run => journeyOf(run, visitorId, statisticsAt(run, basis)?.until ?? cutoff)) : [], [runs, visitorId, cutoff, basis]);
  const person = population.find(item => item.id === visitorId);
  const plans = runs.map(run => run.request.plan);
  const span = Math.max(1, cutoff);
  const pct = (value: number) => `${Math.max(0, Math.min(100, value / span * 100))}%`;
  const difference = compare && journeys.length === 2 ? firstDifference(journeys[0], journeys[1], plans[0], plans[1]) : null;
  const text = t.lang === 'zh' ? {
    back: '返回比较总览', title: '访客旅程', everyone: '全部', people: '参与者名单', search: '搜索本组姓名或编号',
    noResults: '没有匹配的参与者。请调整搜索或群体筛选。', clear: '清除搜索', previous: '上一页', next: '下一页',
    basis: basis === 'completion' ? '时间带、结局与逐站等待采用各方案的最终记录。' : `时间带、结局与逐站等待均截至 ${formatTime(cutoff)}`,
    afterCutoff: '回放已越过观察截止，此处保持显示截止时刻的记录。',
    cutoffStatus: '截止时刻状态', groups: { less: '少等 ≥1 分钟', more: '多等 ≥1 分钟', same: '变化不足 1 分钟', rescued: '只在 B 完成', lost: '只在 A 完成' },
  } : {
    back: 'Back to comparison', title: 'Guest journey', everyone: 'Everyone', people: 'Guest list', search: 'Search this group by name or number',
    noResults: 'No matching guests. Try another search or group.', clear: 'Clear search', previous: 'Previous', next: 'Next',
    basis: basis === 'completion' ? 'Lanes, outcomes and station waits use each plan’s final record.' : `Lanes, outcomes and station waits all end at ${formatTime(cutoff)}`,
    afterCutoff: 'Replay is beyond the cutoff. This panel stays at the observation cutoff.',
    cutoffStatus: 'Status at cutoff', groups: { less: 'Waited ≥1 min less', more: 'Waited ≥1 min more', same: 'Changed by <1 min', rescued: 'Finished only in B', lost: 'Finished only in A' },
  };
  Object.assign(text.groups, threshold ? t.evidence.groups : t.evidence.anyGroups);
  const groupCounts: Record<AffectedFilter, number> = { less: counts?.better ?? 0, more: counts?.worse ?? 0, same: counts?.same ?? 0, rescued: counts?.rescued ?? 0, lost: counts?.lost ?? 0 };
  const eligibleIds = paired ? new Set(paired.map(item => item.id)) : null;
  const names = population.filter(item => !eligibleIds || eligibleIds.has(item.id)).map(item => ({ id: item.id, name: nameOf(item.id) }));
  const needle = query.trim().toLocaleLowerCase();
  const number = needle.match(/^#?(\d+)$/)?.[1];
  const filtered = names.filter(item => !needle || (number ? item.id.endsWith(`:${number}`) : item.name.toLocaleLowerCase().includes(needle) || item.id.toLocaleLowerCase().includes(needle)));
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const visible = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
  const pairMap = new Map(paired?.map(item => [item.id, item]));
  const outcomes = new Map(a?.visitors.map(item => [item.id, item]));
  const currentInGroup = !eligibleIds || eligibleIds.has(visitorId);
  const firstInGroup = paired?.[0]?.id;
  useEffect(() => { setPage(0); setQuery(''); }, [activeGroup, threshold, basis]);
  useEffect(() => {
    if (activeGroup && firstInGroup && !currentInGroup) onChoose(firstInGroup);
  }, [activeGroup, firstInGroup, currentInGroup, onChoose]);
  function selectGroup(filter: AffectedFilter | undefined) {
    if (onGroupChange) onGroupChange(filter); else setLocalGroup(filter);
    setPage(0); setQuery('');
    if (a && b) {
      const next = affectedVisitors(a, b, filter, threshold);
      if (next.length && !next.some(item => item.id === visitorId)) onChoose(next[0].id);
    }
  }
  function chooseAndReveal(id: string) {
    onChoose(id);
    if (typeof window === 'undefined') return;
    const targetWindow = window;
    const narrow = typeof targetWindow.matchMedia === 'function'
      ? targetWindow.matchMedia('(max-width: 980px)').matches : targetWindow.innerWidth <= 980;
    if (!narrow) return;
    // Wait for the selected detail to render; repeated clicks on the same guest also reveal it.
    const reveal = () => {
      const reducedMotion = typeof targetWindow.matchMedia === 'function'
        && targetWindow.matchMedia('(prefers-reduced-motion: reduce)').matches;
      detailRef.current?.scrollIntoView?.({ block: 'start', inline: 'nearest', behavior: reducedMotion ? 'auto' : 'smooth' });
    };
    if (typeof targetWindow.requestAnimationFrame === 'function') targetWindow.requestAnimationFrame(reveal);
    else setTimeout(reveal, 0);
  }
  const tickStep = [60, 120, 300, 600, 900, 1800, 3600, 7200].find(step => span / step <= 6) ?? Math.ceil(span / 21600) * 3600;
  const ticks = [...new Set([...Array.from({ length: Math.floor(span / tickStep) + 1 }, (_, index) => index * tickStep), cutoff])];
  const stories = groupPicks(picks);
  if (!a || (compare && !b)) return <p role="status">{t.evidence.missing}</p>;
  return <div className="ghost-journey">
    <header className="journey-header">
      <div>{onOverview && <button type="button" className="text-btn" onClick={onOverview}><ArrowLeft size={14} aria-hidden="true" />{text.back}</button>}<h3>{text.title}</h3></div>
      <StatisticsScope runs={runs} basis={basis} />
      <p className="journey-basis">{t.review[basis]} · {text.basis}</p>
      {basis === 'cutoff' && time > cutoff && <p className="journey-basis">{text.afterCutoff}</p>}
    </header>
    <aside className="ghost-stories">
      {compare && counts && <label className="people-filter"><span>{text.people}</span><select aria-label={text.people} value={activeGroup ?? 'all'} onChange={event => selectGroup(event.target.value === 'all' ? undefined : event.target.value as AffectedFilter)}>
        <option value="all">{text.everyone} · {counts.total}</option>
        {FILTERS.map(filter => <option key={filter} value={filter}>{text.groups[filter]} · {groupCounts[filter]}</option>)}
      </select></label>}
      <label className="search-box"><Search size={14} aria-hidden="true" />
        <input type="search" aria-label={text.search} placeholder={text.search} value={query}
          onChange={event => { setQuery(event.target.value); setPage(0); }}
          onKeyDown={event => { if (event.key === 'Enter' && filtered[0]) chooseAndReveal(filtered[0].id); }} />
      </label>
      <p className="people-count" aria-live="polite">{t.lang === 'zh' ? `${filtered.length} 位参与者${activeGroup ? ` · ${text.groups[activeGroup]}` : ''}` : `${filtered.length} guests${activeGroup ? ` · ${text.groups[activeGroup]}` : ''}`}</p>
      <div className="people-list" aria-label={text.people}>
        {visible.map(item => {
          const pair = pairMap.get(item.id), outcome = outcomes.get(item.id);
          return <button type="button" key={item.id} className={cls('people-result', item.id === visitorId && 'active')} aria-pressed={item.id === visitorId} onClick={() => chooseAndReveal(item.id)}>
            <Ghost size={14} /><span><b>{item.name}</b>{pair ? <small>A: {t.outcomes[pair.a.outcome]} · B: {t.outcomes[pair.b.outcome]}</small> : outcome && <small>{t.outcomes[outcome.outcome]}</small>}</span>
            {pair ? <small className="people-delta">{pair.delta === 0 ? '0' : `${pair.delta > 0 ? '+' : '−'}${t.formatWait(Math.abs(pair.delta))}`}</small> : outcome && <small className="people-delta">{t.formatWait(outcome.waiting)}</small>}
          </button>;
        })}
        {!visible.length && <p className="subtle">{text.noResults}{query && <button type="button" className="text-btn" onClick={() => setQuery('')}>{text.clear}</button>}</p>}
      </div>
      {pageCount > 1 && <nav className="people-pagination" aria-label={text.people}>
        <button type="button" className="text-btn" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>{text.previous}</button>
        <span>{currentPage + 1} / {pageCount}</span>
        <button type="button" className="text-btn" disabled={currentPage + 1 >= pageCount} onClick={() => setPage(currentPage + 1)}>{text.next}</button>
      </nav>}
      {stories.length > 0 && <details className="journey-stories"><summary>{t.journey.stories}</summary>{stories.map(item => <button type="button" key={item.id} className={cls('story-pick', item.id === visitorId && 'active')} onClick={() => { if (activeGroup) selectGroup(undefined); chooseAndReveal(item.id); }}>
        <Ghost size={14} /><span>{nameOf(item.id)}{item.tags.map(tag => <small key={tag.key}>{t.journey.picks[tag.key]} · {pickValue(tag.key, tag.value, t)}</small>)}</span>{item.id === featured && <em title={t.journey.featured} aria-label={t.journey.featured}><Star size={10} aria-hidden="true" /></em>}
      </button>)}</details>}
    </aside>
    {!visitorId || !person || !currentInGroup ? <p className="journey-hint"><Ghost size={18} />{names.length ? t.journey.hint : text.noResults}</p> : <section className="ghost-detail" ref={detailRef}>
      <div className="ghost-card">
        <span className={cls('ghost-avatar', `tone-${statusTone(statusAt(journeys[0], Math.min(replayTime, journeys[0].until)))}`)}><Ghost size={30} /></span>
        <div className="ghost-id">
          <b>{nameOf(visitorId)}</b><code>{visitorId}</code>
          <p>{t.journey.arrived(nodeName(plans[0], journeys[0].entranceId), formatTime(person.arrivalTime))}</p>
          {scenario.attributes.length > 0 && <div className="ghost-attrs">{scenario.attributes.map(attribute => <span key={attribute.id}>{attribute.name}<b>{person.attributes[attribute.id] ?? '—'}</b></span>)}</div>}
        </div>
        <button type="button" className="btn small ghost locate" onClick={onLocate}><Crosshair size={14} aria-hidden="true" />{t.journey.locate}</button>
      </div>

      <div className="lanes" style={{ '--now': Math.max(0, Math.min(1, replayTime / span)) } as CSSProperties} aria-label={`${t.journey.lanes} · ${t.review[basis]} · ${text.basis}`}>
        <div className="lane-axis" aria-hidden="true"><span className="lane-label" />{<div className="lane-ticks">{ticks.map(tick => <i key={tick} style={{ left: pct(tick) }}>{formatTime(tick)}</i>)}</div>}</div>
        {journeys.map((journey, column) => {
          const status = statusAt(journey, Math.min(replayTime, journey.until));
          const at = journey.arrival === undefined || replayTime < journey.arrival ? undefined : Math.min(replayTime, journey.end?.time ?? journey.until);
          return <div className="lane" key={column}>
            <span className={cls('lane-label', compare && (column ? 'is-b' : 'is-a'))}>{compare ? (column ? 'B' : 'A') : ''}</span>
            <div className="lane-track">
              {journey.segments.map((segment, index) => <button type="button" key={index} className={cls('seg', `seg-${segment.kind}`, segment.open && 'open')}
                style={{ left: pct(segment.start), width: pct(segment.end - segment.start) }}
                title={`${t.journey.segments[segment.kind]} · ${nodeName(plans[column], segment.nodeId)} · ${formatTime(segment.start)}–${formatTime(segment.end)}`}
                onClick={() => onJump(segment.start, segment.nodeId, plans[column].id)}><span>{nodeName(plans[column], segment.nodeId)}</span></button>)}
              {journey.end && <i className={cls('lane-end', journey.end.kind)} style={{ left: pct(journey.end.time) }} />}
              <i className="lane-window-end" style={{ left: pct(journey.until) }} title={`${t.evidence.ends}: ${formatTime(journey.until)}`} />
              {at !== undefined && <span className={cls('lane-ghost', `tone-${statusTone(status)}`)} style={{ left: pct(at) }}><Ghost size={18} /></span>}
            </div>
          </div>;
        })}
        <i className="lane-cutoff" title={`${basis === 'completion' ? t.review.completion : t.journey.cutoff} · ${formatTime(cutoff)}`} aria-label={`${basis === 'completion' ? t.review.completion : t.journey.cutoff} · ${formatTime(cutoff)}`} />
        {difference && Number.isFinite(difference.time) && <i className="lane-diff" style={{ left: `calc(var(--lane-label) + (100% - var(--lane-label)) * ${Math.min(1, difference.time / span)})` }} />}
        <div className="lane-legend">{(['queue', 'hold', 'blocked', 'service'] as const).map(kind => <span key={kind}><i className={`seg-${kind}`} />{t.journey.segments[kind]}</span>)}</div>
      </div>

      <div className="ghost-futures">{journeys.map((journey, column) => {
        const outcome = statisticsAt(runs[column], basis)?.visitors.find(item => item.id === visitorId);
        return <div className="future-row" key={column}>
          {compare ? <span className={cls('ab-badge', column === 1 && 'alt')}>{column ? 'B' : 'A'}</span> : <span />}
          <span><small>{time > cutoff ? (basis === 'completion' ? t.review.completion : text.cutoffStatus) : t.journey.now}</small>{describeStatus(statusAt(journey, Math.min(replayTime, journey.until)), plans[column], Math.min(replayTime, journey.until), t)}</span>
          <span><small>{basis === 'completion' ? `${t.review.completion} · ${formatTime(journey.until)}` : t.journey.cutoff}</small>{outcome ? t.journey.outcome(t.outcomes[outcome.outcome], t.formatWait(outcome.waiting)) : '—'}</span>
        </div>;
      })}</div>

      {compare && journeys.length === 2 && <div className="diff-note">
        {difference ? <>
          <b>{t.journey.firstDiff}</b>
          <span>{formatTime(difference.time)}</span>
          <span>A · {describeStatus(statusAt(journeys[0], difference.time), plans[0], difference.time, t)} / B · {describeStatus(statusAt(journeys[1], difference.time), plans[1], difference.time, t)}</span>
          <button type="button" className="btn small accent" onClick={() => onJump(difference.time, difference.a?.nodeId ?? difference.b?.nodeId, plans[difference.a ? 0 : 1].id)}>{t.journey.jump}<ArrowUpRight size={14} aria-hidden="true" /></button>
        </> : <span>{t.journey.noDiff}</span>}
      </div>}

      <StationTable journeys={journeys} plans={plans} compare={compare} cutoff={cutoff} />

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

function StationTable({ journeys, plans, compare, cutoff }: { journeys: Journey[]; plans: Plan[]; compare: boolean; cutoff: number }) {
  const { t } = useI18n();
  type LogicalStation = { key: string; nodeIds: string[]; queue: number; service: number };
  const grouped = (journey: Journey, plan: Plan): LogicalStation[] => {
    const stations = new Map<string, LogicalStation>();
    for (const station of stationsOf(journey)) {
      const node = plan.graph.nodes.find(item => item.id === station.nodeId);
      const key = node?.type === 'service' ? `stage:${node.stageKey}` : `node:${station.nodeId}`;
      const group = stations.get(key) ?? { key, nodeIds: [], queue: 0, service: 0 };
      group.nodeIds.push(station.nodeId); group.queue += station.queue; group.service += station.service;
      stations.set(key, group);
    }
    return [...stations.values()];
  };
  const a = grouped(journeys[0], plans[0]);
  const unmatched = new Set(journeys[1] ? grouped(journeys[1], plans[1]) : []);
  const namesOf = (left?: LogicalStation, right?: LogicalStation) => [...new Set([
    ...(left?.nodeIds.map(id => nodeName(plans[0], id)) ?? []),
    ...(right?.nodeIds.map(id => nodeName(plans[1], id)) ?? []),
  ])].join(t.lang === 'zh' ? '、' : ' / ');
  const rows: { name: string; a?: LogicalStation; b?: LogicalStation }[] = a.map(station => {
    // Match a shared logical stage first, preserving the existing ID correspondence as a fallback.
    // Each B group is consumed once, so parallel/revisited nodes cannot duplicate its time.
    const match = [...unmatched].find(other => other.key === station.key)
      ?? [...unmatched].find(other => station.nodeIds.some(left => other.nodeIds.some(right => sameStation(plans[0], left, plans[1], right))));
    if (match) unmatched.delete(match);
    return { name: namesOf(station, match), a: station, b: match };
  });
  unmatched.forEach(station => rows.push({ name: namesOf(undefined, station), b: station }));
  if (!rows.length) return null;
  const cell = (value?: number) => value === undefined ? <span className="muted">{t.journey.notVisited}</span> : t.formatWait(value);
  return <div className="station-table-wrap"><table className="station-table">
    <caption>{t.lang === 'zh' ? `逐站用时 · 截至 ${formatTime(cutoff)}` : `Time by station · through ${formatTime(cutoff)}`}{compare && journeys[0].until !== journeys[1]?.until ? ` · A ${formatTime(journeys[0].until)} / B ${formatTime(journeys[1].until)}` : ''}</caption>
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
  </table></div>;
}
