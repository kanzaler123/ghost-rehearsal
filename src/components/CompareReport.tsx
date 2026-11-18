import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { ArrowRight, CircleMinus, CirclePlus, Coins, Crosshair, PencilLine, Route, Star, Users } from 'lucide-react';
import type { Node, Plan, Scenario } from '../schemas';
import { formatTime } from '../features/project';
import { comparisonContext, costOf, stationWaits, totalWait, THRESHOLD } from '../features/analysis';
import type { ResultBasis, AffectedFilter, ChangeItem, StationRow, WaitThreshold } from '../features/analysis';
import { useI18n } from '../i18n';
import type { Messages } from '../i18n';
import type { SimulationRun, Statistics } from '../simulation/types';
import { Ghost, NodeIcon } from './Icons';
import { groupPicks, pickValue } from './Journey';
import { resourceName } from './Results';
import { changeText } from './comparisonText';
import { StatisticsScope } from './StatisticsScope';
import { ComparisonSnapshot } from './shell/ComparisonSnapshot';
import { ConclusionGroups } from './shell/ConclusionGroups';
import { comparisonMetrics } from './shell/comparisonMetrics';
import { DeltaBadge } from './shell/DeltaBadge';
import { metricText } from './shell/deltaTone';
import type { MetricKey } from './shell/deltaTone';
import { RunStateCard } from './shell/RunStateCard';
import { deriveEmptyState } from './shell/runState';

export { changeText } from './comparisonText';

const cls = (...names: (string | false | undefined | null)[]) => names.filter(Boolean).join(' ');
const nameIn = (plans: Plan[], id: string) => plans.flatMap(plan => plan.graph.nodes).find(node => node.id === id)?.name ?? id;

function list(items: string[], t: Messages) { return t.list.join(items); }

function Step({ index, title, children, icon, initiallyOpen = false }: { index: number; title: string; children: ReactNode; icon: ReactNode; initiallyOpen?: boolean }) {
  const [open, setOpen] = useState(initiallyOpen);
  return <details className="report-step" open={open} onToggle={event => setOpen(event.currentTarget.open)}>
    <summary><h3><span className="step-index">{index}</span>{icon}{title}</h3></summary>
    <div className="report-step-body">{children}</div>
  </details>;
}

interface Props {
  planA: Plan; planB: Plan; runA?: SimulationRun; runB?: SimulationRun; scenario: Scenario; ready: boolean; changes: ChangeItem[];
  visitorId: string; featured?: string; nameOf: (id: string) => string;
  onFocus: (nodeIds: string[]) => void; onChoose: (id: string) => void;
  compact?: boolean; guided?: boolean; basis?: ResultBasis; threshold?: WaitThreshold;
  onBrowsePeople?: (filter: AffectedFilter) => void;
  onInspect?: (nodeIds: string[], planId: string) => void;
  onMoment?: (nodeIds: string[]) => void;
  onRerun?: () => void; runState?: 'failed' | 'stopped';
  onEvidence?: () => void;
  onChooseRule?: () => void;
}

export function CompareReport({ planA, planB, runA, runB, scenario, ready, changes, visitorId, featured, nameOf, onFocus, onChoose, compact = false, guided = false, basis = 'cutoff', threshold = THRESHOLD, onBrowsePeople, onInspect, onMoment, onRerun, runState, onEvidence, onChooseRule }: Props) {
  const { t } = useI18n();
  const c = t.compare;
  const groups = threshold ? t.evidence.groups : t.evidence.anyGroups;
  const bins = threshold ? t.evidence.bins : t.evidence.anyBins;
  const context = useMemo(() => comparisonContext(runA, runB, basis, threshold, ready), [runA, runB, basis, threshold, ready]);
  const { a, b } = context;
  const routes = changes.filter(item => item.kind === 'edge');
  const main = changes.filter(item => item.kind !== 'edge');
  const data = useMemo(() => a && b ? {
    stations: stationWaits(planA, a, planB, b, runA?.events ?? [], runB?.events ?? []), people: context.counts!, cost: costOf(planA, planB, scenario, a, b, basis), picks: groupPicks(context.picks(1)),
  } : null, [a, b, planA, planB, scenario, runA?.events, runB?.events, basis, context]);
  const stationName = (row: StationRow) => list([...new Set([...row.a.map(id => nameIn([planA], id)), ...row.b.map(id => nameIn([planB], id))])], t);
  const signed = (value: number, format: (value: number) => string) => Number.isFinite(value) ? `${value > 0 ? '+' : value < 0 ? '−' : ''}${format(Math.abs(value))}` : '—';
  const text = t.reportUi;
  const emptyState = data && data.people.total > 0 ? deriveEmptyState({ rosterEmpty: false, filterActive: false, noDifference: data.people.same > 0 && !data.people.better && !data.people.worse && context.visitors.every(pair => pair.a.outcome === pair.b.outcome), evidenceCount: (runA?.events.length ?? 0) + (runB?.events.length ?? 0) }) : null;
  const unavailable = context.status === 'missing-run' ? text.missingPlans(t.list.join([!runA ? `${c.a} · ${planA.name}` : '', !runB ? `${c.b} · ${planB.name}` : ''].filter(Boolean))) : context.status === 'stale' ? c.stale : t.evidence.unavailable[context.status];
  function browse(filter: AffectedFilter) {
    if (!a || !b) return;
    const people = context.select(filter);
    if (people.length && !people.some(person => person.id === visitorId)) onChoose(people[0].id);
    // Choosing a person may clear an earlier group; the requested group is the final state.
    onBrowsePeople?.(filter);
  }
  return <div className={cls('compare-report', compact && 'is-compact')}>
    <header className="report-head">
      <h2>{c.title}</h2>
      <p className="report-note">{text.sameGuests} · {text.direction}</p>
    </header>
    {data && a && b && <ComparisonSnapshot a={a} b={b} cost={data.cost} />}
    {data && a && b && <ConclusionGroups metrics={comparisonMetrics(a, b, data.cost, t)} onEvidence={onEvidence} />}
    {context.status === 'ready' && runA && runB && <details className="snapshot-scope"><summary>{t.evidence.sample} {context.sampleSize} · {t.review[basis]} · {c.a} {formatTime(a!.until)} / {c.b} {formatTime(b!.until)}</summary>
      <div className="report-plans"><span className="ab-badge" title={c.a}>{t.sidebar.currentBadge}</span><b tabIndex={0} title={planA.name} aria-label={planA.name}>{planA.name}</b><ArrowRight size={13} aria-hidden="true" /><span className="ab-badge alt" title={c.b}>{t.sidebar.secondBadge}</span><b tabIndex={0} title={planB.name} aria-label={planB.name}>{planB.name}</b></div>
      <StatisticsScope runs={[runA, runB]} basis={basis} threshold={threshold} />
      <p className="report-note">{t.reportUi.resourceWindow}</p>
    </details>}
    {emptyState && <RunStateCard kind={emptyState.kind} action={emptyState.action} detail={threshold ? t.evidence.minute : t.evidence.any} onAction={() => emptyState.action === 'choose-rule' ? onChooseRule?.() : onRerun?.()} />}
    {context.status !== 'ready' && (onRerun ? <RunStateCard kind={runState ?? (context.status === 'stale' ? 'stale' : 'not-run')} action="rerun" detail={unavailable} detailClassName="report-stale" onAction={onRerun} /> : <p className="report-stale">{unavailable}</p>)}

    <Step key={`changes-${compact}`} index={1} title={`${c.steps.changed} · ${changes.length}`} icon={<PencilLine size={15} aria-hidden="true" />}>
      {!changes.length && <p className="subtle">{c.noChanges}</p>}
      <ul className="change-list">{main.map(item => <li key={`${item.kind}-${item.id}`}>
        <button type="button" className={cls('change-item', item.change)} disabled={!item.nodeIds.length} onClick={() => onFocus(item.nodeIds)}>
          <span className="change-icon">{item.change === 'added' ? <CirclePlus size={14} /> : item.change === 'removed' ? <CircleMinus size={14} /> : <PencilLine size={14} />}</span>
          {item.kind === 'node' && <NodeIcon type={((item.after ?? item.before) as Node).type} size={14} />}
          {(item.kind === 'staff' || item.kind === 'assignment') && <Users size={14} aria-hidden="true" />}
          {item.kind === 'device' && <Coins size={14} aria-hidden="true" />}
          <span className="change-text">{changeText(item, planA, planB, t, scenario)}</span>
        </button>
      </li>)}</ul>
      {routes.length > 0 && <details className="route-changes"><summary><Route size={14} aria-hidden="true" />{c.routes(routes.length)}</summary>
        <ul className="change-list">{routes.map(item => <li key={item.id}><button type="button" className={cls('change-item', item.change)} onClick={() => onFocus(item.nodeIds)}>
          <span className="change-icon">{item.change === 'added' ? <CirclePlus size={14} /> : item.change === 'removed' ? <CircleMinus size={14} /> : <PencilLine size={14} />}</span>
          <span className="change-text">{changeText(item, planA, planB, t, scenario)}</span></button></li>)}</ul>
      </details>}
    </Step>

    {data && a && b && <>
      <Step key={`outcomes-${compact}`} index={2} title={c.steps.outcomes} initiallyOpen={guided} icon={<Crosshair size={15} aria-hidden="true" />}>
        <Outcomes a={a} b={b} />
        <p className="report-note">{text.waitNote}</p>
      </Step>

      <Step key={`people-${compact}`} index={3} title={c.steps.people} icon={<Ghost size={15} />} initiallyOpen={!compact}>
        <p className="report-lead">{c.of(data.people.total)}</p>
        <div className="people-stats">
          <button type="button" className="good" disabled={!data.people.better} onClick={() => browse('less')} title={text.browse}><b>{data.people.better}</b>{groups.less}</button>
          <button type="button" className="bad" disabled={!data.people.worse} onClick={() => browse('more')} title={text.browse}><b>{data.people.worse}</b>{groups.more}</button>
          <button type="button" disabled={!data.people.same} onClick={() => browse('same')} title={text.browse}><b>{data.people.same}</b>{groups.same}</button>
        </div>
        <p className="report-note">{t.evidence.rule} {t.evidence.excluded(data.people.excluded)}</p>
        <details className="report-distribution"><summary>{c.histogram}</summary>
        <div className="histogram" role="img" aria-label={`${c.histogram}: ${data.people.bins.map((count, index) => `${bins[index]} ${count}`).join(', ')}`}>
          {data.people.bins.map((count, index) => {
            const peak = Math.max(1, ...data.people.bins);
            const side = index < 3 ? 'good' : index === 3 ? 'same' : 'bad';
            return <div key={index} className={cls('bin', side)}><span className="bin-count">{count}</span><i style={{ height: `${Math.max(count ? 6 : 0, count / peak * 100)}%` }} /><small>{bins[index]}</small></div>;
          })}
        </div>
        <small className="histogram-caption">{c.histogram}</small></details>
        <div className="report-outcomes"><button type="button" className="text-btn" disabled={!data.people.rescued} onClick={() => browse('rescued')}>{c.rescued(data.people.rescued)}</button><button type="button" className="text-btn" disabled={!data.people.lost} onClick={() => browse('lost')}>{c.lost(data.people.lost)}</button></div>
        {data.picks.length > 0 && <>
          <p className="report-lead">{c.followHint}</p>
          <div className="report-picks">{data.picks.map(item => <button type="button" key={item.id} className={cls('story-pick', item.id === visitorId && 'active')} onClick={() => onChoose(item.id)}>
            <Ghost size={14} /><span>{nameOf(item.id)}{item.tags.map(tag => <small key={tag.key}>{t.journey.picks[tag.key]} · {pickValue(tag.key, tag.value, t)}</small>)}</span>{item.id === featured && <em title={t.journey.featured} aria-label={t.journey.featured}><Star size={10} aria-hidden="true" /></em>}
          </button>)}</div>
        </>}
      </Step>

      <Step key={`where-${compact}`} index={4} title={text.where} icon={<Route size={15} aria-hidden="true" />}>
        {data.stations.length ? <>
          <p className="report-lead">{(() => {
            const down = data.stations.filter(row => row.waitB < row.waitA).sort((x, y) => (x.waitB - x.waitA) - (y.waitB - y.waitA))[0];
            const up = data.stations.filter(row => row.waitB > row.waitA).sort((x, y) => (y.waitB - y.waitA) - (x.waitB - x.waitA))[0];
            return down ? c.whyLead(stationName(down), up ? stationName(up) : '')
              : up ? text.grew(stationName(up))
              : text.unchangedStations;
          })()}</p>
          <div className="why-title"><span>{c.whyTitle}</span><span className="why-legend"><i className="a" />{c.a}<i className="b" />{c.b}</span></div>
          {data.stations.slice(0, 5).map(row => {
            const peak = Math.max(1, ...data.stations.map(item => Math.max(item.waitA, item.waitB)));
            const delta = row.waitB - row.waitA;
            const ids = [...new Set([...row.a, ...row.b])];
            return <div className="station-explanation" key={row.key}><button type="button" className="why-row" onClick={() => onFocus(ids)}>
              <span className="why-name">{stationName(row)}</span>
              <span className="bar-tracks"><span className="bar-track"><i style={{ width: `${row.waitA / peak * 100}%` }} /></span><span className="bar-track alt"><i style={{ width: `${row.waitB / peak * 100}%` }} /></span></span>
              <span className="why-values"><b className={cls(delta < 0 && 'good', delta > 0 && 'bad')}>{signed(delta, t.formatPersonTime)}</b><small>{c.peak(row.peakA, row.peakB)}</small></span>
            </button><div className="station-actions">
              {onMoment && <button type="button" className="text-btn" onClick={() => onMoment(ids)}>{text.moment}</button>}
              {onInspect && row.a.length > 0 && <button type="button" className="text-btn" onClick={() => onInspect(row.a, planA.id)}>{c.a} · {text.inspect}</button>}
              {onInspect && row.b.length > 0 && <button type="button" className="text-btn" onClick={() => onInspect(row.b, planB.id)}>{c.b} · {text.inspect}</button>}
            </div></div>;
          })}
        </> : <p className="subtle">{c.whyNone}</p>}
      </Step>

      <Step key={`cost-${compact}`} index={5} title={c.steps.cost} initiallyOpen={guided} icon={<Coins size={15} aria-hidden="true" />}>
        <dl className="cost-list">{comparisonMetrics(a, b, data.cost, t).slice(6).map(item => <div key={item.id} className={cls('cost-row', item.a !== item.b && 'changed')}>
          <dt>{item.label}</dt><dd>{c.value(metricText(item.a, item.format), metricText(item.b, item.format))} <DeltaBadge metric={item.metric} a={item.a} b={item.b} format={item.format} /></dd>
        </div>)}</dl>
        <div className="why-title"><span>{c.costUtilization}</span></div>
        <dl className="cost-list util">{data.cost.utilization.map(item => <div key={item.id} className={cls('cost-row', item.a === null && 'changed')}>
          <dt>{resourceName(item.b !== null ? planB : planA, item.id)}</dt>
          <dd>{c.value(metricText(item.a, value => `${Math.round(value * 100)}%`), metricText(item.b, value => `${Math.round(value * 100)}%`))}</dd>
        </div>)}</dl>
        <small className="report-note">{c.costNote}</small>
      </Step>
    </>}
  </div>;
}

function Outcomes({ a, b }: { a: Statistics; b: Statistics }) {
  const { t } = useI18n();
  const c = t.compare;
  const left = (stats: Statistics) => stats.outcomes.rejected + stats.outcomes.dismissed + stats.outcomes.diverted + stats.outcomes.loop_limit;
  const rows: { key: keyof typeof c.rows; a: number | null; b: number | null; format: (value: number) => string; higherIsBetter: boolean }[] = [
    { key: 'completed', a: a.outcomes.completed, b: b.outcomes.completed, format: String, higherIsBetter: true },
    { key: 'unfinished', a: a.outcomes.unfinished, b: b.outcomes.unfinished, format: String, higherIsBetter: false },
    { key: 'left', a: left(a), b: left(b), format: String, higherIsBetter: false },
    { key: 'average', a: a.averageWaiting, b: b.averageWaiting, format: value => t.formatWait(value), higherIsBetter: false },
    { key: 'p90', a: a.p90Waiting, b: b.p90Waiting, format: value => t.formatWait(value), higherIsBetter: false },
    { key: 'total', a: totalWait(a), b: totalWait(b), format: value => t.formatPersonTime(value), higherIsBetter: false },
  ];
  return <table className="outcome-table">
    <thead><tr><th>{c.metric}</th><th><span className="ab-badge" title={c.a}>{t.sidebar.currentBadge}</span></th><th><span className="ab-badge alt" title={c.b}>{t.sidebar.secondBadge}</span></th><th>{c.delta}</th></tr></thead>
    <tbody>{rows.map(row => {
      const metric: MetricKey = row.key === 'average' ? 'avgWait' : row.key === 'p90' ? 'p90Wait' : row.key === 'total' ? 'totalWait' : row.key as MetricKey;
      return <tr key={row.key}>
        <th scope="row">{c.rows[row.key]}</th>
        <td>{metricText(row.a, row.format)}</td><td>{metricText(row.b, row.format)}</td>
        <td><DeltaBadge metric={metric} a={row.a} b={row.b} format={row.format} /></td>
      </tr>;
    })}</tbody>
  </table>;
}
