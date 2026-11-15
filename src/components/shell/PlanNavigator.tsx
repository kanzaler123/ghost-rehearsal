import { BookOpen, BookmarkPlus, Copy, PanelLeftClose, PanelLeftOpen, Plus, Search, Settings2, Users } from 'lucide-react';
import type { Node, Plan, ProjectDocument, Scenario } from '../../schemas';
import { populationSize } from '../../simulation/input';
import { useI18n } from '../../i18n';
import { Ghost, NodeIcon } from '../Icons';
import { ContextMenu } from './ContextMenu';
import { StatusMarker } from './StatusMarker';
import { filterNodes } from './navigation';

export interface PlanNavigatorProps {
  project: ProjectDocument; scenario: Scenario; plan: Plan; second?: Plan; busy: boolean; editing: boolean; collapsed: boolean; selection: { id: string; owner: string }; search: string;
  onCollapse: () => void; onScenario: (id: string) => void; onPlan: (id: string) => void; onSetB: (id: string) => void; onNew: () => void; onSettings: () => void; onGuests: () => void; onResources: () => void; onRename: () => void; onDuplicate: () => void; onDelete: () => void; onTemplate: () => void; onAddNode: () => void; onSearch: (value: string) => void; onNode: (id: string) => void; onGuide: () => void; onLibrary: () => void;
}
export function PlanNavigator(props: PlanNavigatorProps) {
  const { t } = useI18n();
  const { project, scenario, plan, second, busy, collapsed } = props;
  const nodes = filterNodes(plan.graph.nodes, props.search, type => t.nodeTypes[type]);
  const plans = project.plans.filter(item => item.scenarioId === scenario.id);
  return <aside className={`sidebar plan-navigator${collapsed ? ' is-collapsed is-rail' : ''}`} aria-label={t.navigator.plans}>
    <button type="button" className="side-collapse" aria-label={collapsed ? t.studioUi.expandPlans : t.studioUi.collapsePlans} aria-expanded={!collapsed} onClick={props.onCollapse}>{collapsed ? <PanelLeftOpen size={15} aria-hidden="true" /> : <PanelLeftClose size={15} aria-hidden="true" />}{!collapsed && t.sidebar.collapse}</button>
    {collapsed ? <div className="plan-rail-badges"><button type="button" className="plan-badge is-a" title={plan.name} aria-label={`A · ${plan.name}`} onClick={props.onCollapse}>A</button>{second && <button type="button" className="plan-badge is-b" title={second.name} aria-label={`B · ${second.name}`} onClick={props.onCollapse}>B</button>}</div> : <>
      <section className="side-section event-card"><span className="eyebrow">{t.sidebar.event}</span><div className="event-picker"><select className="event-title" aria-label={t.eventSetup.active} value={scenario.id} disabled={busy} onChange={event => props.onScenario(event.target.value)}>{project.scenarios.filter(item => project.plans.some(target => target.scenarioId === item.id)).map(item => <option key={item.id} value={item.id}>{item.name ?? t.header.untitled}</option>)}</select>
        <ContextMenu label={t.eventSetup.settings}><button type="button" className="side-action" disabled={busy} onClick={props.onSettings}><Settings2 size={15} aria-hidden="true" />{t.eventSetup.settings}</button><button type="button" className="side-action" disabled={busy} onClick={props.onNew}><Plus size={15} aria-hidden="true" />{t.eventSetup.new}</button></ContextMenu></div>
        <button type="button" className="side-link" onClick={props.onGuests}><Ghost size={15} /><span>{t.sidebar.guests}</span><b>{populationSize(scenario)}</b></button><button type="button" className="side-link" onClick={props.onResources}><Users size={15} aria-hidden="true" /><span>{t.sidebar.resources}</span><b>{plan.staff.length + plan.deviceTypes.reduce((sum, item) => sum + item.quantity, 0)}</b></button>
      </section>
      <section className="side-section"><div className="section-heading"><h2>{t.sidebar.plans}</h2><ContextMenu label={t.topbar.contextActions}>
        <button type="button" className="side-action" disabled={busy} onClick={props.onRename}>{t.review.rename}</button>
        <button type="button" className="side-action" aria-label={t.sidebar.duplicate} disabled={busy} onClick={props.onDuplicate}><Copy size={15} aria-hidden="true" />{t.sidebar.duplicate}</button>
        <button type="button" className="side-action" disabled={busy} onClick={props.onTemplate}><BookmarkPlus size={15} aria-hidden="true" />{t.templates.savePlan}</button>
        <button type="button" className="side-action danger" disabled={busy || project.plans.length < 2} onClick={props.onDelete}>{t.review.removePlan}</button>
      </ContextMenu></div>
        <ul className="plan-list">{plans.map(item => { const isA = item.id === plan.id, isB = item.id === second?.id; return <li key={item.id} className={`plan-card${isA ? ' is-a' : isB ? ' is-b' : ''}`}><button type="button" className="plan-main" aria-pressed={isA} title={item.name} aria-label={item.name} onClick={() => props.onPlan(item.id)}><span className="plan-badge">{isA ? t.sidebar.currentBadge : isB ? t.sidebar.secondBadge : ''}</span><span className="plan-text"><b>{item.name}</b><small>{scenario.name ?? scenario.id}</small>{isA && props.editing && <StatusMarker id="selected" />}</span></button>{!isA && !isB && <ContextMenu label={`${t.topbar.contextActions}: ${item.name}`}><button type="button" className="side-action" aria-label={`${t.sidebar.setB}: ${item.name}`} onClick={() => props.onSetB(item.id)}>{t.sidebar.setB}</button></ContextMenu>}</li>; })}</ul>
        {!second && <p className="empty-b"><span className="plan-badge is-b">B</span>{t.studioUi.noSecond}</p>}
      </section>
      <section className="side-section palette-section"><div className="section-heading"><h2>{t.sidebar.nodes}<span className="node-count">{plan.graph.nodes.length}</span></h2><button type="button" className="icon-btn add-node" disabled={!props.editing} aria-label={t.sidebar.addNode} title={t.sidebar.addNode} onClick={props.onAddNode}><Plus size={17} /></button></div>
        <label className="search-box"><Search size={14} aria-hidden="true" /><input aria-label={t.sidebar.searchLabel} placeholder={t.sidebar.search} value={props.search} onChange={event => props.onSearch(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') event.preventDefault(); }} /></label>
        <div className="plan-nodes">{nodes.map((node: Node) => <button type="button" key={node.id} className={`plan-node type-${node.type}${props.selection.id === node.id && props.selection.owner === plan.id ? ' active' : ''}`} title={node.name} aria-label={node.name} onClick={() => props.onNode(node.id)}><NodeIcon type={node.type} size={15} /><span>{node.name}</span></button>)}{!nodes.length && <p className="subtle">{plan.graph.nodes.length ? t.sidebar.noMatch : t.sidebar.emptyNodes}</p>}</div>
      </section>
      <section className="side-section side-footer"><button type="button" className="side-action" disabled={busy} onClick={props.onGuide}><Ghost size={17} />{t.guide.start}</button><button type="button" className="side-action template-launch" disabled={busy} onClick={props.onLibrary}><BookOpen size={17} aria-hidden="true" />{t.templates.browse}<span aria-hidden="true">↗</span></button></section>
    </>}
  </aside>;
}
