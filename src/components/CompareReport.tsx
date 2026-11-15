import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { ArrowRight, CircleMinus, CirclePlus, Coins, Crosshair, PencilLine, Route, Star, Users } from 'lucide-react';
import type { Node, Plan, Scenario } from '../schemas';
import { formatTime } from '../features/project';
import { affected, affectedVisitors, comparePicks, costOf, stationWaits, statisticsAt, totalWait, THRESHOLD } from '../features/analysis';
import type { ResultBasis, AffectedFilter, ChangeItem, StationRow, WaitThreshold } from '../features/analysis';
import { useI18n } from '../i18n';
import type { Messages } from '../i18n';
import type { SimulationRun, Statistics } from '../simulation/types';
import { Ghost, NodeIcon } from './Icons';
import { groupPicks, pickValue } from './Journey';
import { resourceName } from './Results';
import { changeText } from './comparisonText';
import { StatisticsScope } from './StatisticsScope';

export { changeText } from './comparisonText';

const cls = (...names: (string | false | undefined | null)[]) => names.filter(Boolean).join(' ');
const nameIn = (plans: Plan[], id: string) => plans.flatMap(plan => plan.graph.nodes).find(node => node.id === id)?.name ?? id;

function list(items: string[], t: Messages) { return items.join(t.lang === 'zh' ? '、' : ', '); }

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
}

export function CompareReport({ planA, planB, runA, runB, scenario, ready, changes, visitorId, featured, nameOf, onFocus, onChoose, compact = false, guided = false, basis = 'cutoff', threshold = THRESHOLD, onBrowsePeople, onInspect, onMoment }: Props) {
  const { t } = useI18n();
  const c = t.compare;
  const groups = threshold ? t.evidence.groups : t.evidence.anyGroups;
  const bins = threshold ? t.evidence.bins : t.evidence.anyBins;
  const a = ready ? statisticsAt(runA, basis) : null;
  const b = ready ? statisticsAt(runB, basis) : null;
  const routes = changes.filter(item => item.kind === 'edge');
  const main = changes.filter(item => item.kind !== 'edge');
  const data = useMemo(() => a && b ? {
    stations: stationWaits(planA, a, planB, b, runA?.events ?? [], runB?.events ?? []), people: affected(a, b, threshold), cost: costOf(planA, planB, scenario, a, b, basis), picks: groupPicks(comparePicks(a, b, 1, threshold)),
  } : null, [a, b, planA, planB, scenario, runA?.events, runB?.events, basis, threshold]);
  const stationName = (row: StationRow) => list([...new Set([...row.a.map(id => nameIn([planA], id)), ...row.b.map(id => nameIn([planB], id))])], t);
  const signed = (value: number, format: (value: number) => string) => `${value > 0 ? '+' : value < 0 ? '−' : '±'}${format(Math.abs(value))}`;
  const cutoff = formatTime(scenario.observationCutoff);
  const text = t.lang === 'zh' ? {
    where: '等待变化集中在哪里', moment: '查看关键时刻', inspect: '查看规则', browse: '查看完整名单',
    waitNote: '等待需要结合完成和离开人数一起判断；提前离开也可能让等待变短。',
  } : {
    where: 'Where waiting changed', moment: 'View key moment', inspect: 'Inspect rules', browse: 'Browse everyone',
    waitNote: 'Read waiting alongside completions and departures; leaving early can also shorten a wait.',
  };
  function browse(filter: AffectedFilter) {
    if (!a || !b) return;
    const people = affectedVisitors(a, b, filter, threshold);
    if (people.length && !people.some(person => person.id === visitorId)) onChoose(people[0].id);
    // Choosing a person may clear an earlier group; the requested group is the final state.
    onBrowsePeople?.(filter);
  }
  return <div className={cls('compare-report', compact && 'is-compact')}>
    <header className="report-head">
      <span className="eyebrow">{t.modes.Compare}</span>
      <h2>{c.title}</h2>
      <div className="report-plans"><span className="ab-badge">A</span><b>{planA.name}</b><ArrowRight size={13} aria-hidden="true" /><span className="ab-badge alt">B</span><b>{planB.name}</b></div>
      <p className="report-basis">{basis === 'cutoff' ? c.basis(cutoff) : t.review.completion}</p>
    </header>
    {ready && runA && runB && <StatisticsScope runs={[runA, runB]} basis={basis} />}
    {data && a && b && <ComparisonSnapshot a={a} b={b} cost={data.cost} />}
    {data && a && b && !compact && <Verdict a={a} b={b} data={data} stationName={stationName} />}
    {!ready && <p className="report-stale">{c.stale}</p>}

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
        <p className="report-note">{t.evidence.rule}</p>
        <div className="histogram" role="img" aria-label={`${c.histogram}: ${data.people.bins.map((count, index) => `${bins[index]} ${count}`).join(', ')}`}>
          {data.people.bins.map((count, index) => {
            const peak = Math.max(1, ...data.people.bins);
            const side = index < 3 ? 'good' : index === 3 ? 'same' : 'bad';
            return <div key={index} className={cls('bin', side)}><span className="bin-count">{count}</span><i style={{ height: `${Math.max(count ? 6 : 0, count / peak * 100)}%` }} /><small>{bins[index]}</small></div>;
          })}
        </div>
        <small className="histogram-caption">{c.histogram}</small>
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
              : up ? (t.lang === 'zh' ? `等待增加最多的是${stationName(up)}。` : `Waiting grew most at ${stationName(up)}.`)
              : (t.lang === 'zh' ? '各站点累计等待未改变。' : 'Total waiting at each station is unchanged.');
          })()}</p>
          <div className="why-title"><span>{c.whyTitle}</span><span className="why-legend"><i className="a" />A<i className="b" />B</span></div>
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
              {onInspect && row.a.length > 0 && <button type="button" className="text-btn" onClick={() => onInspect(row.a, planA.id)}>A · {text.inspect}</button>}
              {onInspect && row.b.length > 0 && <button type="button" className="text-btn" onClick={() => onInspect(row.b, planB.id)}>B · {text.inspect}</button>}
            </div></div>;
          })}
        </> : <p className="subtle">{c.whyNone}</p>}
      </Step>

      <Step key={`cost-${compact}`} index={5} title={c.steps.cost} initiallyOpen={guided} icon={<Coins size={15} aria-hidden="true" />}>
        <dl className="cost-list">
          {data.cost.devices.filter(item => item.a !== item.b).map(item => <div key={item.id} className="cost-row changed"><dt>{item.name}</dt><dd>{c.value(String(item.a), String(item.b))}<b className="cost-delta">{signed(item.b - item.a, String)}</b></dd></div>)}
          <div className={cls('cost-row', data.cost.staff[0] !== data.cost.staff[1] && 'changed')}><dt>{c.costStaff}</dt><dd>{c.value(String(data.cost.staff[0]), String(data.cost.staff[1]))}</dd></div>
          <div className="cost-row"><dt>{c.costStaffHours}</dt><dd>{c.value(t.formatHours(data.cost.staffHours[0]), t.formatHours(data.cost.staffHours[1]))}</dd></div>
          <div className="cost-row"><dt>{c.costDeviceHours}</dt><dd>{c.value(t.formatHours(data.cost.deviceHours[0]), t.formatHours(data.cost.deviceHours[1]))}</dd></div>
          {(data.cost.overtime[0] > 0 || data.cost.overtime[1] > 0) && <div className="cost-row"><dt>{c.costOvertime}</dt><dd>{c.value(t.formatWait(data.cost.overtime[0]), t.formatWait(data.cost.overtime[1]))}</dd></div>}
        </dl>
        <div className="why-title"><span>{c.costUtilization}</span></div>
        <dl className="cost-list util">{data.cost.utilization.map(item => <div key={item.id} className={cls('cost-row', item.a === null && 'changed')}>
          <dt>{resourceName(item.b !== null ? planB : planA, item.id)}</dt>
          <dd>{c.value(item.a === null ? '—' : `${Math.round(item.a * 100)}%`, item.b === null ? '—' : `${Math.round(item.b * 100)}%`)}</dd>
        </div>)}</dl>
        <small className="report-note">{c.costNote}</small>
      </Step>
    </>}
  </div>;
}

type ReportData = { stations: StationRow[]; cost: ReturnType<typeof costOf> };

function resourceChanges(cost: ReportData['cost'], t: Messages): string[] {
  const signedHours = (hours: number) => `${hours > 0 ? '+' : '−'}${t.formatHours(Math.abs(hours))}`;
  return [
    ...cost.devices.filter(item => item.a !== item.b).map(item => t.compare.costDevicePart(item.b - item.a, item.name)),
    ...(cost.staff[1] !== cost.staff[0] ? [t.compare.costSummaryStaff(cost.staff[1] - cost.staff[0])] : []),
    ...(Math.abs(cost.staffHours[1] - cost.staffHours[0]) > 1e-9 ? [`${t.lang === 'zh' ? '人员工时' : 'staffed time'} ${signedHours(cost.staffHours[1] - cost.staffHours[0])}`] : []),
    ...(Math.abs(cost.deviceHours[1] - cost.deviceHours[0]) > 1e-9 ? [`${t.lang === 'zh' ? '设备时长' : 'device time'} ${signedHours(cost.deviceHours[1] - cost.deviceHours[0])}`] : []),
    ...(Math.abs(cost.overtime[1] - cost.overtime[0]) > 1e-9 ? [`${t.compare.costOvertime} ${cost.overtime[1] > cost.overtime[0] ? '+' : '−'}${t.formatWait(Math.abs(cost.overtime[1] - cost.overtime[0]))}`] : []),
  ];
}

function ComparisonSnapshot({ a, b, cost }: { a: Statistics; b: Statistics; cost: ReportData['cost'] }) {
  const { t } = useI18n();
  const completion = b.outcomes.completed - a.outcomes.completed;
  const wait = a.averageWaiting != null && b.averageWaiting != null ? b.averageWaiting - a.averageWaiting : null;
  const signed = (number: number, format: (number: number) => string) => `${number > 0 ? '+' : number < 0 ? '−' : ''}${format(Math.abs(number))}`;
  const parts = resourceChanges(cost, t);
  const sameResources = t.lang === 'zh' ? '资源与排班用时不变' : 'Resources and scheduled time unchanged';
  return <div className="report-snapshot" aria-label={t.lang === 'zh' ? 'B 相对 A 的三项摘要' : 'Three changes from A to B'}>
    <div className={cls('snapshot-item', completion > 0 && 'good', completion < 0 && 'bad')}>
      <span>{t.compare.rows.completed}</span><strong>{signed(completion, String)}</strong>
      <small>A {a.outcomes.completed} → B {b.outcomes.completed}</small>
    </div>
    <div className="snapshot-item">
      <span>{t.compare.rows.average}</span><strong>{wait === null ? '—' : signed(wait, t.formatWait)}</strong>
      <small>A {t.formatWait(a.averageWaiting)} → B {t.formatWait(b.averageWaiting)}</small>
    </div>
    <div className="snapshot-item resource-summary">
      <span>{t.lang === 'zh' ? '资源代价' : 'Resource cost'}</span>
      <strong>{parts.length ? list(parts, t) : sameResources}</strong>
      <small>{t.lang === 'zh' ? '所选统计范围内的数量、排班与加班' : 'Counts, schedules and overtime in the selected statistics window'}</small>
    </div>
  </div>;
}

function Verdict({ a, b, data, stationName }: { a: Statistics; b: Statistics; data: ReportData; stationName: (row: StationRow) => string }) {
  const { t } = useI18n();
  const c = t.compare;
  const completed = b.outcomes.completed - a.outcomes.completed;
  const average = a.averageWaiting != null && b.averageWaiting != null ? b.averageWaiting - a.averageWaiting : null;
  const down = data.stations.filter(row => row.waitB < row.waitA).sort((x, y) => (x.waitB - x.waitA) - (y.waitB - y.waitA))[0];
  const up = data.stations.filter(row => row.waitB > row.waitA).sort((x, y) => (y.waitB - y.waitA) - (x.waitB - x.waitA))[0];
  const costParts = resourceChanges(data.cost, t);
  const signed = (value: number) => `${value > 0 ? '+' : value < 0 ? '−' : '±'}${t.formatPersonTime(Math.abs(value))}`;
  return <div className={cls('verdict', completed > 0 ? 'good' : completed < 0 ? 'bad' : 'same')}>
    <span className="eyebrow">{c.verdictTitle}</span>
    <p>{c.verdict({
      completed: completed > 0 ? c.completedMore(completed) : completed < 0 ? c.completedLess(-completed) : c.completedSame,
      average: average === null ? t.insights.noData : `${average > 0 ? '+' : average < 0 ? '−' : '±'}${t.formatWait(Math.abs(average))}`,
      relief: down ? `${stationName(down)} (${signed(down.waitB - down.waitA)})` : undefined,
      pressure: up ? `${stationName(up)} (${signed(up.waitB - up.waitA)})` : undefined,
      cost: costParts.length ? list(costParts, t) : c.costNone,
    })}</p>
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
    <thead><tr><th>{c.metric}</th><th><span className="ab-badge">A</span></th><th><span className="ab-badge alt">B</span></th><th>{c.delta}</th></tr></thead>
    <tbody>{rows.map(row => {
      const delta = row.a != null && row.b != null ? row.b - row.a : null;
      const isWaiting = row.key === 'average' || row.key === 'p90' || row.key === 'total';
      const tone = isWaiting || delta === null || Math.abs(delta) < 1e-9 ? '' : (delta > 0) === row.higherIsBetter ? 'good' : 'bad';
      return <tr key={row.key}>
        <th scope="row">{c.rows[row.key]}</th>
        <td>{row.a == null ? '—' : row.format(row.a)}</td><td>{row.b == null ? '—' : row.format(row.b)}</td>
        <td className={tone}>{delta === null ? '—' : Math.abs(delta) < 1e-9 ? '0' : `${delta > 0 ? '+' : '−'}${row.format(Math.abs(delta))}`}{delta !== null && Math.abs(delta) > 1e-9 && <small>{t.lang === 'zh' ? (delta > 0 ? '增加' : '减少') : (delta > 0 ? 'increased' : 'decreased')}</small>}</td>
      </tr>;
    })}</tbody>
  </table>;
}
