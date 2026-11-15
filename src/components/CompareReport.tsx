import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { ArrowRight, CircleMinus, CirclePlus, Coins, Crosshair, PencilLine, Route, Star, Users } from 'lucide-react';
import type { Node, Plan, Scenario } from '../schemas';
import { formatTime } from '../features/project';
import { affected, comparePicks, costOf, DELTA_BINS, stationWaits, totalWait } from '../features/analysis';
import type { ChangeItem, StationRow } from '../features/analysis';
import { useI18n } from '../i18n';
import type { Messages } from '../i18n';
import type { SimulationRun, Statistics } from '../simulation/types';
import { Ghost, NodeIcon } from './Icons';
import { pickValue } from './Journey';
import { resourceName } from './Results';

const cls = (...names: (string | false | undefined | null)[]) => names.filter(Boolean).join(' ');
const nameIn = (plans: Plan[], id: string) => plans.flatMap(plan => plan.graph.nodes).find(node => node.id === id)?.name ?? id;

function list(items: string[], t: Messages) { return items.join(t.lang === 'zh' ? '、' : ', '); }

function durationText(node: Node, t: Messages): string | undefined {
  if (node.type !== 'service') return undefined;
  return node.duration.kind === 'fixed' ? t.formatWait(node.duration.value) : t.canvas.duration[node.duration.kind] ?? node.duration.kind;
}

/** One readable line per change. IDs never appear; names and before → after values do. */
export function changeText(item: ChangeItem, a: Plan, b: Plan, t: Messages): string {
  const c = t.compare;
  const fields = (names: string[]) => list(names.map(field => c.fields[field] ?? field), t);
  if (item.kind === 'node') {
    const node = (item.after ?? item.before) as Node;
    if (item.change !== 'modified') return (item.change === 'added' ? c.added : c.removed)(t.nodeTypes[node.type].toLowerCase(), node.name);
    const before = item.before as Node, after = item.after as Node;
    const details = item.fields.map(field => {
      if (field === 'duration') { const x = durationText(before, t), y = durationText(after, t); if (x && y) return `${c.fields.duration} ${c.value(x, y)}`; }
      if (field === 'maxConcurrent' || field === 'queueCapacity') {
        const x = (before as Record<string, unknown>)[field], y = (after as Record<string, unknown>)[field];
        return `${c.fields[field]} ${c.value(String(x ?? t.common.unlimited), String(y ?? t.common.unlimited))}`;
      }
      return c.fields[field] ?? field;
    });
    return t.lang === 'zh' ? `「${after.name}」：调整${list(details, t)}` : c.modified(after.name, list(details, t));
  }
  if (item.kind === 'device' || item.kind === 'staff') {
    const entity = (item.after ?? item.before) as { name: string; quantity?: number };
    if (item.change !== 'modified') return (item.change === 'added' ? c.added : c.removed)(c.kinds[item.kind], entity.name);
    const before = item.before as { quantity?: number }, after = item.after as { quantity?: number };
    if (item.kind === 'device' && item.fields.includes('quantity')) {
      const rest = item.fields.filter(field => field !== 'quantity');
      return c.quantity(entity.name, before.quantity ?? 0, after.quantity ?? 0) + (rest.length ? ` · ${fields(rest)}` : '');
    }
    return c.modified(entity.name, fields(item.fields));
  }
  if (item.kind === 'assignment') {
    const name = resourceName(item.after ? b : a, item.id);
    const parts = [
      ...(item.gained?.length ? [c.gained(name, list(item.gained.map(id => nameIn([b, a], id)), t))] : []),
      ...(item.dropped?.length ? [c.dropped(name, list(item.dropped.map(id => nameIn([a, b], id)), t))] : []),
    ];
    return parts.length ? parts.join(t.lang === 'zh' ? '；' : '; ') : c.posts(name);
  }
  const edge = (item.after ?? item.before) as { source: string; target: string; branchKey?: string };
  const plans = item.after ? [b, a] : [a, b];
  const route = c.route(nameIn(plans, edge.source), nameIn(plans, edge.target)) + (edge.branchKey ? ` (${edge.branchKey})` : '');
  return item.change === 'added' ? c.routeAdded(route) : item.change === 'removed' ? c.routeRemoved(route) : c.routeModified(route, fields(item.fields));
}

function Step({ index, title, children, icon }: { index: number; title: string; children: ReactNode; icon: ReactNode }) {
  return <section className="report-step">
    <h3><span className="step-index">{index}</span>{icon}{title}</h3>
    {children}
  </section>;
}

interface Props {
  planA: Plan; planB: Plan; runA?: SimulationRun; runB?: SimulationRun; scenario: Scenario; ready: boolean; changes: ChangeItem[];
  visitorId: string; featured?: string; nameOf: (id: string) => string;
  onFocus: (nodeIds: string[]) => void; onChoose: (id: string) => void;
}

export function CompareReport({ planA, planB, runA, runB, scenario, ready, changes, visitorId, featured, nameOf, onFocus, onChoose }: Props) {
  const { t } = useI18n();
  const c = t.compare;
  const a = ready ? runA?.statistics ?? null : null;
  const b = ready ? runB?.statistics ?? null : null;
  const routes = changes.filter(item => item.kind === 'edge');
  const main = changes.filter(item => item.kind !== 'edge');
  const data = useMemo(() => a && b ? {
    stations: stationWaits(planA, a, planB, b), people: affected(a, b), cost: costOf(planA, planB, scenario, a, b), picks: comparePicks(a, b, 1),
  } : null, [a, b, planA, planB, scenario]);
  const stationName = (row: StationRow) => list([...new Set([...row.a.map(id => nameIn([planA], id)), ...row.b.map(id => nameIn([planB], id))])], t);
  const signed = (value: number, format: (value: number) => string) => `${value > 0 ? '+' : value < 0 ? '−' : '±'}${format(Math.abs(value))}`;
  const cutoff = formatTime(scenario.observationCutoff);
  return <div className="compare-report">
    <header className="report-head">
      <span className="eyebrow">{t.modes.Compare}</span>
      <h2>{c.title}</h2>
      <div className="report-plans"><span className="ab-badge">A</span><b>{planA.name}</b><ArrowRight size={13} aria-hidden="true" /><span className="ab-badge alt">B</span><b>{planB.name}</b></div>
      <p className="report-basis">{c.basis(cutoff)}</p>
    </header>
    {data && a && b && <Verdict a={a} b={b} data={data} stationName={stationName} />}
    {!ready && <p className="report-stale">{c.stale}</p>}

    <Step index={1} title={c.steps.changed} icon={<PencilLine size={15} aria-hidden="true" />}>
      {!changes.length && <p className="subtle">{c.noChanges}</p>}
      <ul className="change-list">{main.map(item => <li key={`${item.kind}-${item.id}`}>
        <button type="button" className={cls('change-item', item.change)} disabled={!item.nodeIds.length} onClick={() => onFocus(item.nodeIds)}>
          <span className="change-icon">{item.change === 'added' ? <CirclePlus size={14} /> : item.change === 'removed' ? <CircleMinus size={14} /> : <PencilLine size={14} />}</span>
          {item.kind === 'node' && <NodeIcon type={((item.after ?? item.before) as Node).type} size={14} />}
          {(item.kind === 'staff' || item.kind === 'assignment') && <Users size={14} aria-hidden="true" />}
          {item.kind === 'device' && <Coins size={14} aria-hidden="true" />}
          <span className="change-text">{changeText(item, planA, planB, t)}</span>
        </button>
      </li>)}</ul>
      {routes.length > 0 && <details className="route-changes"><summary><Route size={14} aria-hidden="true" />{c.routes(routes.length)}</summary>
        <ul className="change-list">{routes.map(item => <li key={item.id}><button type="button" className={cls('change-item', item.change)} onClick={() => onFocus(item.nodeIds)}>
          <span className="change-icon">{item.change === 'added' ? <CirclePlus size={14} /> : item.change === 'removed' ? <CircleMinus size={14} /> : <PencilLine size={14} />}</span>
          <span className="change-text">{changeText(item, planA, planB, t)}</span></button></li>)}</ul>
      </details>}
    </Step>

    {data && a && b && <>
      <Step index={2} title={c.steps.outcomes} icon={<Crosshair size={15} aria-hidden="true" />}>
        <Outcomes a={a} b={b} />
      </Step>

      <Step index={3} title={c.steps.people} icon={<Ghost size={15} />}>
        <p className="report-lead">{c.of(data.people.total)}</p>
        <div className="people-stats">
          <span className="good"><b>{data.people.better}</b>{c.lessWait}</span>
          <span className="bad"><b>{data.people.worse}</b>{c.moreWait}</span>
          <span><b>{data.people.same}</b>{c.sameWait}</span>
        </div>
        <div className="histogram" role="img" aria-label={`${c.histogram}: ${data.people.bins.map((count, index) => `${c.bins[index]} ${count}`).join(', ')}`}>
          {data.people.bins.map((count, index) => {
            const peak = Math.max(1, ...data.people.bins);
            const side = index < DELTA_BINS.indexOf(-1) + 1 ? 'good' : index === DELTA_BINS.indexOf(1) ? 'same' : 'bad';
            return <div key={index} className={cls('bin', side)}><span className="bin-count">{count}</span><i style={{ height: `${Math.max(count ? 6 : 0, count / peak * 100)}%` }} /><small>{c.bins[index]}</small></div>;
          })}
        </div>
        <small className="histogram-caption">{c.histogram}</small>
        <p className="report-outcomes">{c.rescued(data.people.rescued)} · {c.lost(data.people.lost)}</p>
        {data.picks.length > 0 && <>
          <p className="report-lead">{c.followHint}</p>
          <div className="report-picks">{data.picks.map(group => group.items.map(item => <button type="button" key={`${group.key}-${item.id}`} className={cls('story-pick', item.id === visitorId && 'active')} onClick={() => onChoose(item.id)}>
            <Ghost size={14} /><span><small>{t.journey.picks[group.key]}</small>{nameOf(item.id)}</span>{item.id === featured && <em title={t.journey.featured} aria-label={t.journey.featured}><Star size={10} aria-hidden="true" /></em>}<b>{pickValue(group.key, item.value, t)}</b>
          </button>))}</div>
        </>}
      </Step>

      <Step index={4} title={c.steps.why} icon={<Route size={15} aria-hidden="true" />}>
        {data.stations.length ? <>
          <p className="report-lead">{(() => {
            const down = data.stations.filter(row => row.waitB < row.waitA).sort((x, y) => (x.waitB - x.waitA) - (y.waitB - y.waitA))[0];
            const up = data.stations.filter(row => row.waitB > row.waitA).sort((x, y) => (y.waitB - y.waitA) - (x.waitB - x.waitA))[0];
            return down ? c.whyLead(stationName(down), up ? stationName(up) : '') : up ? c.whyLead('—', stationName(up)) : c.whyNone;
          })()}</p>
          <div className="why-title"><span>{c.whyTitle}</span><span className="why-legend"><i className="a" />A<i className="b" />B</span></div>
          {data.stations.slice(0, 5).map(row => {
            const peak = Math.max(1, ...data.stations.map(item => Math.max(item.waitA, item.waitB)));
            const delta = row.waitB - row.waitA;
            return <button type="button" key={row.key} className="why-row" onClick={() => onFocus([...row.a, ...row.b])}>
              <span className="why-name">{stationName(row)}</span>
              <span className="bar-tracks"><span className="bar-track"><i style={{ width: `${row.waitA / peak * 100}%` }} /></span><span className="bar-track alt"><i style={{ width: `${row.waitB / peak * 100}%` }} /></span></span>
              <span className="why-values"><b className={cls(delta < 0 && 'good', delta > 0 && 'bad')}>{signed(delta, t.formatPersonTime)}</b><small>{c.peak(row.peakA, row.peakB)}</small></span>
            </button>;
          })}
        </> : <p className="subtle">{c.whyNone}</p>}
      </Step>

      <Step index={5} title={c.steps.cost} icon={<Coins size={15} aria-hidden="true" />}>
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

function Verdict({ a, b, data, stationName }: { a: Statistics; b: Statistics; data: ReportData; stationName: (row: StationRow) => string }) {
  const { t } = useI18n();
  const c = t.compare;
  const completed = b.outcomes.completed - a.outcomes.completed;
  const average = a.averageWaiting != null && b.averageWaiting != null ? b.averageWaiting - a.averageWaiting : null;
  const down = data.stations.filter(row => row.waitB < row.waitA).sort((x, y) => (x.waitB - x.waitA) - (y.waitB - y.waitA))[0];
  const up = data.stations.filter(row => row.waitB > row.waitA).sort((x, y) => (y.waitB - y.waitA) - (x.waitB - x.waitA))[0];
  const costParts = [
    ...data.cost.devices.filter(item => item.a !== item.b).map(item => c.costDevicePart(item.b - item.a, item.name)),
    ...(data.cost.staff[1] !== data.cost.staff[0] ? [c.costSummaryStaff(data.cost.staff[1] - data.cost.staff[0])] : []),
  ];
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
      const tone = delta === null || Math.abs(delta) < 1e-9 ? '' : (delta > 0) === row.higherIsBetter ? 'good' : 'bad';
      return <tr key={row.key}>
        <th scope="row">{c.rows[row.key]}</th>
        <td>{row.a == null ? '—' : row.format(row.a)}</td><td>{row.b == null ? '—' : row.format(row.b)}</td>
        <td className={tone}>{delta === null ? '—' : Math.abs(delta) < 1e-9 ? '0' : `${delta > 0 ? '+' : '−'}${row.format(Math.abs(delta))}`}{tone && <small>{tone === 'good' ? c.better : c.worse}</small>}</td>
      </tr>;
    })}</tbody>
  </table>;
}
