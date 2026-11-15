import { ArrowUpRight } from 'lucide-react';
import type { Plan } from '../../schemas';
import { firstDifference, statusAt } from '../../features/analysis';
import type { Journey } from '../../features/analysis';
import { formatTime } from '../../features/project';
import { useI18n } from '../../i18n';
import { describeStatus } from '../Journey';
import { StatusMarker } from './StatusMarker';

export function DivergenceCard({ journeys, plans, onJump, onInspect, onEvidence }: {
  journeys: Journey[]; plans: Plan[]; onJump: (time: number, nodeA?: string, nodeB?: string) => void;
  onInspect?: (nodeIds: string[], planId: string) => void; onEvidence: () => void;
}) {
  const { t } = useI18n();
  const difference = firstDifference(journeys[0], journeys[1], plans[0], plans[1]);
  const states = difference ? journeys.map((journey, index) => {
    const state = statusAt(journey, difference.time);
    const nodeId = 'nodeId' in state && !['done', 'left'].includes(state.kind) ? state.nodeId : undefined;
    return { state, nodeId, name: plans[index].graph.nodes.find(node => node.id === nodeId)?.name };
  }) : [];
  return <section className="diff-note" aria-label={t.journey.firstDiff}>
    <b>{t.journey.firstDiff}</b>
    {difference ? <>
      <time>{formatTime(difference.time)}</time>
      <div className="divergence-states">{states.map((side, index) => <div key={plans[index].id}>
        <span className={`ab-badge${index ? ' alt' : ''}`}>{index ? 'B' : 'A'}</span>
        {side.nodeId && onInspect ? <button type="button" className="text-btn" onClick={() => onInspect([side.nodeId!], plans[index].id)}>{side.name ?? side.nodeId}</button> : <span>{side.name ?? t.reportUi.notInSystem}</span>}
        <p>{describeStatus(side.state, plans[index], difference.time, t)}</p>
        <time>{formatTime('since' in side.state ? side.state.since : 'time' in side.state ? side.state.time : difference.time)}</time>
      </div>)}</div>
    </> : <><StatusMarker id="diff" label={t.reportUi.noDivergence} /><p>{t.reportUi.identical}</p></>}
    <button type="button" className="btn small accent" disabled={!difference} onClick={() => { if (difference) onJump(difference.time, states[0].nodeId, states[1].nodeId); }}>{t.journey.jump}<ArrowUpRight size={14} aria-hidden="true" /></button>
    <button type="button" className={difference ? 'text-btn' : 'btn primary small'} onClick={onEvidence}>{t.review.evidence}</button>
  </section>;
}
