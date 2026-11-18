import { useMemo } from 'react';
import { comparisonContext, completedWaiting, statisticsAt, THRESHOLD } from '../features/analysis';
import type { ResultBasis, WaitThreshold } from '../features/analysis';
import { formatTime } from '../features/project';
import { useI18n } from '../i18n';
import type { SimulationRun } from '../simulation/types';

export function StatisticsScope({ runs, basis, threshold = THRESHOLD }: { runs: SimulationRun[]; basis: ResultBasis; threshold?: WaitThreshold }) {
  const { t } = useI18n();
  const stats = runs.map(run => statisticsAt(run, basis));
  const [left, right] = runs;
  const context = useMemo(() => right ? comparisonContext(left, right, basis, threshold) : undefined, [left, right, basis, threshold]);
  if (!stats.length || stats.some(item => !item)) return <p className="report-note" role="status">{t.evidence.missing}</p>;
  if (context && context.status !== 'ready') return <p role="status">{t.evidence.unavailable[context.status]}</p>;
  const paired = context?.sampleSize;
  return <div className="statistics-scope">
    <p>{t.evidence.population}</p>
    {paired !== undefined && <p>{t.evidence.paired(paired)}</p>}
    {stats.map((item, index) => <p key={index}><b>{runs[index].request.plan.name}</b> · {t.evidence.side(formatTime(item!.until), item!.arrived, item!.outcomes.not_arrived, paired === undefined ? 0 : context!.sides[index]!.unpaired!)}
      {basis === 'completion' && item!.until >= runs[index].request.scenario.horizon && item!.outcomes.unfinished + item!.outcomes.not_arrived > 0 && <strong className="bad"> {t.evidence.limit}</strong>}
    </p>)}
    <details><summary>{t.evidence.completed}</summary>
      <p>{t.evidence.subgroupNote}</p>
      {stats.map((item, index) => { const completed = completedWaiting(item!); return <p key={index}>
        <b>{runs[index].request.plan.name}</b> · {t.evidence.sample}={completed.n} · {t.compare.rows.average}: {t.formatWait(completed.average)} · {t.compare.rows.p90}: {t.formatWait(completed.p90)}{!completed.n && <> · {t.reportUi.noCompleted}</>}
      </p>; })}
    </details>
  </div>;
}
