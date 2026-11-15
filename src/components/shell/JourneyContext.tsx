import { ArrowLeft } from 'lucide-react';
import type { SimulationRun } from '../../simulation/types';
import type { ResultBasis, WaitThreshold } from '../../features/analysis';
import { formatTime } from '../../features/project';
import { useI18n } from '../../i18n';
import { StatisticsScope } from '../StatisticsScope';

export function JourneyContext({ runs, basis, threshold, cutoff, time, onOverview, onEvidence }: {
  runs: SimulationRun[]; basis: ResultBasis; threshold: WaitThreshold; cutoff: number; time: number; onOverview?: () => void; onEvidence: () => void;
}) {
  const { t } = useI18n();
  return <header className="journey-header journey-context">
    <div>{onOverview && <button type="button" className="text-btn" onClick={onOverview}><ArrowLeft size={14} aria-hidden="true" />{t.reportUi.back}</button>}<h3>{t.reportUi.title}</h3></div>
    <button type="button" className="text-btn" onClick={onEvidence}>{t.review.evidence}</button>
    <p className="journey-basis">{t.review[basis]} · {basis === 'completion' ? t.reportUi.finalBasis : t.reportUi.cutoffBasis(formatTime(cutoff))} · {threshold ? t.evidence.minute : t.evidence.any}</p>
    <details><summary>{t.evidence.comparison}</summary><StatisticsScope runs={runs} basis={basis} threshold={threshold} /></details>
    {basis === 'cutoff' && time > cutoff && <p className="journey-basis">{t.reportUi.afterCutoff}</p>}
  </header>;
}
