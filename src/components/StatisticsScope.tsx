import { affectedVisitors, completedWaiting, statisticsAt } from '../features/analysis';
import type { ResultBasis } from '../features/analysis';
import { formatTime } from '../features/project';
import { useI18n } from '../i18n';
import type { SimulationRun } from '../simulation/types';

export function StatisticsScope({ runs, basis }: { runs: SimulationRun[]; basis: ResultBasis }) {
  const { t } = useI18n();
  const stats = runs.map(run => statisticsAt(run, basis));
  if (!stats.length || stats.some(item => !item)) return <p className="report-note" role="status">{t.evidence.missing}</p>;
  const paired = stats.length === 2 ? affectedVisitors(stats[0]!, stats[1]!).length : undefined;
  return <div className="statistics-scope">
    <p>{t.evidence.population}</p>
    {paired !== undefined && <p>{t.evidence.paired(paired)}</p>}
    {stats.map((item, index) => <p key={index}><b>{stats.length === 2 ? index ? 'B' : 'A' : runs[index].request.plan.name}</b> · {t.evidence.side(formatTime(item!.until), item!.arrived, item!.outcomes.not_arrived, paired === undefined ? 0 : item!.arrived - paired)}
      {basis === 'completion' && item!.until >= runs[index].request.scenario.horizon && item!.outcomes.unfinished + item!.outcomes.not_arrived > 0 && <strong className="bad"> {t.evidence.limit}</strong>}
    </p>)}
    <details><summary>{t.evidence.completed}</summary>
      <p>{t.evidence.subgroupNote}</p>
      {stats.map((item, index) => { const completed = completedWaiting(item!); return <p key={index}>
        <b>{stats.length === 2 ? index ? 'B' : 'A' : runs[index].request.plan.name}</b> · {t.evidence.sample}={completed.n} · {t.compare.rows.average}: {t.formatWait(completed.average)} · {t.compare.rows.p90}: {t.formatWait(completed.p90)}
      </p>; })}
    </details>
  </div>;
}
