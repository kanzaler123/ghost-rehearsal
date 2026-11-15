import { ArrowDownRight, ArrowUpRight, Boxes, ChevronRight, PanelLeftOpen } from 'lucide-react';
import type { Plan } from '../schemas';
import { formatTime } from '../features/project';
import { waitingAt } from '../features/analysis';
import type { KeyEvent, PickGroup } from '../features/analysis';
import type { StageIndex } from '../features/stages';
import { useI18n } from '../i18n';
import type { Messages } from '../i18n';
import type { PlaybackState } from '../simulation/types';
import { Ghost, NodeIcon } from './Icons';
import { pickValue } from './Journey';
import { resourceName } from './Results';

const cls = (...names: (string | false | undefined | null)[]) => names.filter(Boolean).join(' ');

export function keyEventText(event: KeyEvent, plan: Plan, nameOf: (id: string) => string, t: Messages): string {
  const k = t.keyEvent;
  const node = plan.graph.nodes.find(item => item.id === event.nodeId)?.name ?? '—';
  switch (event.kind) {
    case 'queue': return k.queue(node, event.value ?? 0);
    case 'blocked': return k.blocked(node);
    case 'close': return k.close(node);
    case 'open': return k.open(node);
    case 'resource': return k.resource(resourceName(plan, event.resourceId ?? ''), t.resourceStates[event.to ?? ''] ?? event.to ?? '');
    case 'leave': return k.leave(event.participantId ? nameOf(event.participantId) : '—');
    case 'first-done': return k['first-done'](event.participantId ? nameOf(event.participantId) : '—');
    default: return k.peak(event.value ?? 0);
  }
}

interface NowProps {
  plan: Plan; view: PlaybackState; previous?: PlaybackState; time: number; moments: KeyEvent[];
  tracked?: { id: string; name: string; status: string }; picks: PickGroup[]; nameOf: (id: string) => string;
  onFocus: (nodeId: string) => void; onJump: (time: number, nodeId?: string) => void; onChoose: (id: string) => void; onOpenJourney: () => void;
}

/** Rehearse: what is happening at the replay moment. */
export function NowPanel({ plan, view, previous, time, moments, tracked, picks, nameOf, onFocus, onJump, onChoose, onOpenJourney }: NowProps) {
  const { t } = useI18n();
  const queues = plan.graph.nodes.filter(node => node.type === 'service' || node.type === 'waiting_area')
    .map(node => ({ node, waiting: waitingAt(view, node.id), serving: view.nodes[node.id]?.serving.length ?? 0, trend: previous ? waitingAt(view, node.id) - waitingAt(previous, node.id) : 0 }))
    .filter(item => item.waiting > 0).sort((a, b) => b.waiting - a.waiting).slice(0, 4);
  const peak = Math.max(1, ...queues.map(item => item.waiting));
  const past = moments.filter(item => item.time <= time).reverse().slice(0, 6);
  return <div className="now-panel">
    <section className="now-col">
      <h4>{t.now.bottleneck}<small>{t.now.bottleneckHint}</small></h4>
      {queues.length ? queues.map((item, index) => <button type="button" key={item.node.id} className={cls('queue-row', index === 0 && 'is-top')} onClick={() => onFocus(item.node.id)}>
        <NodeIcon type={item.node.type} size={14} /><span className="queue-name">{item.node.name}</span>
        <span className="queue-bar"><i style={{ width: `${item.waiting / peak * 100}%` }} /></span>
        <b>{item.waiting}</b>
        <span className={cls('queue-trend', item.trend > 0 && 'up', item.trend < 0 && 'down')} title={t.canvas.trendTitle}>{item.trend > 0 ? <ArrowUpRight size={12} /> : item.trend < 0 ? <ArrowDownRight size={12} /> : null}{item.trend ? t.canvas.trend(item.trend) : ''}</span>
        <small>{t.now.servingCount(item.serving)}</small>
      </button>) : <p className="subtle">{t.now.none}</p>}
    </section>
    <section className="now-col">
      <h4>{t.now.moments}</h4>
      {past.length ? <ol className="moment-list">{past.map((item, index) => <li key={index}><button type="button" className={`moment k-${item.kind}`} onClick={() => onJump(item.time, item.nodeId)}>
        <time>{formatTime(item.time)}</time><i /><span>{keyEventText(item, plan, nameOf, t)}</span>
      </button></li>)}</ol> : <p className="subtle">{t.now.momentsEmpty}</p>}
    </section>
    <section className="now-col">
      <h4>{t.now.follow}</h4>
      {tracked ? <div className="now-follow">
        <span className="ghost-avatar small"><Ghost size={22} /></span>
        <div><b>{tracked.name}</b><p>{tracked.status}</p></div>
        <button type="button" className="btn small accent" onClick={onOpenJourney}>{t.now.open}<ChevronRight size={14} aria-hidden="true" /></button>
      </div> : <>
        <p className="subtle">{t.now.followEmpty}</p>
        <div className="report-picks">{picks.slice(0, 3).map(group => group.items.slice(0, 1).map(item => <button type="button" key={`${group.key}-${item.id}`} className="story-pick" onClick={() => onChoose(item.id)}>
          <Ghost size={14} /><span><small>{t.journey.picks[group.key]}</small>{nameOf(item.id)}</span><b>{pickValue(group.key, item.value, t)}</b>
        </button>))}</div>
      </>}
    </section>
  </div>;
}

interface NavigatorProps {
  plan: Plan; index: StageIndex; view: PlaybackState; previous?: PlaybackState; expanded: Set<string> | 'all'; selected: string;
  onStage: (id: string) => void; onNode: (id: string) => void; onExpandSidebar: () => void;
}

/** Rehearse sidebar: the flow as a short list of stages with live queue counts. */
export function FlowNavigator({ plan, index, view, previous, expanded, selected, onStage, onNode, onExpandSidebar }: NavigatorProps) {
  const { t } = useI18n();
  const regular = plan.graph.nodes.filter(node => node.type !== 'subflow');
  const items = [...new Set(regular.map(node => index.top.get(node.id) ?? node.id))];
  const membersOf = (id: string) => index.subflows.has(id) ? index.members.get(id)! : [id];
  const rank = (id: string) => Math.min(...membersOf(id).map(member => regular.find(node => node.id === member)?.layout.x ?? 0));
  items.sort((a, b) => rank(a) - rank(b));
  const waiting = (ids: string[]) => ids.reduce((sum, id) => sum + waitingAt(view, id), 0);
  const trend = (ids: string[]) => previous ? waiting(ids) - ids.reduce((sum, id) => sum + waitingAt(previous, id), 0) : 0;
  const peak = Math.max(1, ...items.map(id => waiting(membersOf(id))));
  const row = (id: string, nested = false) => {
    const node = plan.graph.nodes.find(item => item.id === id)!;
    const ids = membersOf(id);
    const count = waiting(ids); const change = trend(ids);
    const stage = index.subflows.has(id);
    return <button type="button" key={id} className={cls('nav-item', nested && 'nested', stage && 'is-stage', selected === id && 'active', count > 10 && 'hot')} onClick={() => stage ? onStage(id) : onNode(id)}>
      {stage ? <Boxes size={14} aria-hidden="true" /> : <NodeIcon type={node.type} size={14} />}
      <span className="nav-name">{node.name}</span>
      {count > 0 && <span className="nav-trend">{change > 0 ? <ArrowUpRight size={11} aria-hidden="true" /> : change < 0 ? <ArrowDownRight size={11} aria-hidden="true" /> : null}</span>}
      <b className={cls(count > 0 && 'on')}>{count}</b>
      <i className="nav-bar" style={{ width: `${count / peak * 100}%` }} />
    </button>;
  };
  return <div className="flow-navigator">
    <div className="nav-head">
      <span className="eyebrow">{t.navigator.title}</span>
      <button type="button" className="icon-btn" aria-label={t.sidebar.expand} title={t.sidebar.expand} onClick={onExpandSidebar}><PanelLeftOpen size={16} /></button>
    </div>
    <p className="nav-plan" title={plan.name}><span className="ab-badge">A</span>{plan.name}</p>
    <div className="nav-list">{items.map(id => <div key={id} className="nav-group">
      {row(id)}
      {index.subflows.has(id) && (expanded === 'all' || expanded.has(id)) && index.members.get(id)!.map(member => row(member, true))}
    </div>)}</div>
    <p className="nav-hint">{t.navigator.hint}</p>
  </div>;
}
