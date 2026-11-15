import type { Assignment, Edge, Node, Plan, Scenario, ServiceNode } from '../schemas';
import type { ChangeItem } from '../features/analysis';
import { formatTime } from '../features/project';
import type { Messages } from '../i18n';
import { resourceName } from './Results';

const names = (items: string[], t: Messages) => items.join(t.lang === 'zh' ? '、' : ', ');
const nodeName = (plan: Plan, id: string) => plan.graph.nodes.find(node => node.id === id)?.name ?? id;
const none = (t: Messages) => t.lang === 'zh' ? '无' : 'none';
const value = (before: string, after: string, t: Messages) => t.compare.value(before, after);

/** Keep the parameters that determine the distribution visible in the comparison. */
function durationText(duration: ServiceNode['duration'] | undefined, t: Messages): string {
  if (!duration) return t.formatWait(0);
  const kind = t.canvas.duration[duration.kind];
  if (duration.kind === 'fixed') return t.formatWait(duration.value);
  if (duration.kind === 'uniform') return `${kind} ${t.formatWait(duration.min)}–${t.formatWait(duration.max)}`;
  if (duration.kind === 'triangular') return `${kind} ${t.formatWait(duration.min)}–${t.formatWait(duration.max)} (${t.lang === 'zh' ? '众数' : 'mode'} ${t.formatWait(duration.mode)})`;
  const samples = duration.samples;
  if (!samples.length) return `${kind} · ${none(t)}`;
  const range = `${t.formatWait(Math.min(...samples))}–${t.formatWait(Math.max(...samples))}`;
  const mean = t.formatWait(samples.reduce((sum, sample) => sum + sample, 0) / samples.length);
  const preview = samples.slice(0, 4).map(sample => t.formatWait(sample)).join(', ');
  return t.lang === 'zh'
    ? `${kind} · ${samples.length} 个样本 [${preview}${samples.length > 4 ? ', …' : ''}]，范围 ${range}，均值 ${mean}`
    : `${kind} · ${samples.length} samples [${preview}${samples.length > 4 ? ', …' : ''}], range ${range}, mean ${mean}`;
}

function windowsText(windows: { start: number; end: number; resourceUnitId?: string }[], plan: Plan, t: Messages): string {
  return windows.length ? names(windows.map(window => `${window.resourceUnitId ? `${resourceName(plan, window.resourceUnitId)} · ` : ''}${formatTime(window.start)}–${formatTime(window.end)}`), t) : none(t);
}

function assignmentText(assignment: Assignment | undefined, plan: Plan, t: Messages): string {
  if (!assignment) return t.lang === 'zh' ? '所有符合条件的岗位' : 'all eligible stations';
  return assignment.periods.map(period => {
    const until = period.to === undefined ? (t.lang === 'zh' ? '之后' : 'onward') : formatTime(period.to);
    const posts = period.nodeIds.length ? names(period.nodeIds.map(id => nodeName(plan, id)), t) : none(t);
    const handover = period.handoverSec ? ` (${t.lang === 'zh' ? '交接' : 'handover'} ${t.formatWait(period.handoverSec)})` : '';
    return `${formatTime(period.from)}–${until}: ${posts}${handover}`;
  }).join('; ');
}

function ruleText(rule: { kind: string; targetNodeId?: string } | undefined, plan: Plan, t: Messages, fallback: string): string {
  const kind = rule?.kind ?? fallback;
  const labels: Record<string, string> = t.lang === 'zh'
    ? { block: '等待空位', reject: '拒绝进入', reroute: '改道', redirect: '转往', serve: '服务完已排队者', dismiss: '遣散已排队者' }
    : { block: 'wait for space', reject: 'turn away', reroute: 'reroute', redirect: 'redirect', serve: 'serve the existing queue', dismiss: 'dismiss the existing queue' };
  return `${labels[kind] ?? kind}${rule?.targetNodeId ? ` ${nodeName(plan, rule.targetNodeId)}` : ''}`;
}

function routingText(node: Extract<Node, { type: 'decision' }>, plan: Plan, t: Messages, scenario?: Scenario): string {
  return node.routing.branches.map(branch => {
    const edge = plan.graph.edges.find(item => item.source === node.id && item.branchKey === branch.branchKey);
    const destination = edge ? nodeName(plan, edge.target) : branch.branchKey;
    if ('weight' in branch) return `${destination} ${Number((branch.weight * 100).toFixed(3))}%`;
    if (!branch.condition) return `${destination} (${t.lang === 'zh' ? '其余参与者' : 'otherwise'})`;
    const attribute = scenario?.attributes.find(item => item.id === branch.condition?.attributeId);
    return `${attribute?.name ?? branch.condition.attributeId} = ${names(branch.condition.values, t)} → ${destination}`;
  }).join('; ');
}

function fieldText(field: string, entity: Record<string, unknown>, plan: Plan, t: Messages, scenario?: Scenario): string {
  const node = entity as Node;
  const raw = entity[field];
  if (field === 'duration' || field === 'transferDuration') return durationText(raw as ServiceNode['duration'] | undefined, t);
  if (field === 'shifts' || field === 'unavailability') return windowsText((raw ?? []) as { start: number; end: number; resourceUnitId?: string }[], plan, t);
  if (field === 'openWindows') {
    const windows = (raw ?? []) as ServiceNode['openWindows'];
    return windows.length ? names(windows.map(window => `${formatTime(window.openAt)}–${formatTime(window.closeAt)}`), t) : t.lang === 'zh' ? '全程开放' : 'always open';
  }
  if (field === 'routing' && node.type === 'decision') return routingText(node, plan, t, scenario);
  if (field === 'fullPolicy') return ruleText(raw as ServiceNode['fullPolicy'], plan, t, 'block');
  if (field === 'closePolicy') {
    const policy = raw as ServiceNode['closePolicy'];
    return `${t.lang === 'zh' ? '队中' : 'queued'}: ${ruleText(policy?.queued, plan, t, 'serve')}; ${t.lang === 'zh' ? '迟到' : 'late'}: ${ruleText(policy?.late, plan, t, 'reject')}`;
  }
  if (field === 'requirements') return names(((raw ?? []) as ServiceNode['requirements']).map(requirement => {
    const name = requirement.kind === 'staff' ? plan.skills.find(skill => skill.id === requirement.skillId)?.name ?? requirement.skillId
      : plan.deviceTypes.find(device => device.id === requirement.deviceTypeId)?.name ?? requirement.deviceTypeId;
    return `${name} × ${requirement.quantity}`;
  }), t) || none(t);
  if (field === 'skillIds') return names(((raw ?? []) as string[]).map(id => plan.skills.find(skill => skill.id === id)?.name ?? id), t) || none(t);
  if (field === 'arrivalStreamIds') return names(((raw ?? []) as string[]).map(id => scenario?.arrivalStreams.find(stream => stream.id === id)?.name ?? id), t) || none(t);
  if (field === 'source' || field === 'target') return nodeName(plan, String(raw));
  if (field === 'incomingPriority') return ((raw ?? []) as string[]).map(id => { const edge = plan.graph.edges.find(item => item.id === id); return edge ? nodeName(plan, edge.source) : id; }).join(' > ');
  if (field === 'release' && node.type === 'waiting_area') return node.release.kind === 'until_time'
    ? `${t.lang === 'zh' ? '放行于' : 'release at'} ${formatTime(node.release.releaseAt)}`
    : `${t.lang === 'zh' ? '每批' : 'batch of'} ${node.release.batchSize}${node.release.maxHoldSec === undefined ? '' : ` · ${t.lang === 'zh' ? '最多等候' : 'maximum hold'} ${t.formatWait(node.release.maxHoldSec)}`}`;
  if (field === 'loopGuard') {
    const guard = raw as Extract<Node, { type: 'decision' }>['loopGuard'];
    if (!guard) return none(t);
    const edge = plan.graph.edges.find(item => item.source === node.id && item.branchKey === guard.exitBranchKey);
    return `${guard.maxVisits} ${t.lang === 'zh' ? '次后转往' : 'visits, then'} ${edge ? nodeName(plan, edge.target) : guard.exitBranchKey}`;
  }
  if (field === 'maxConcurrent' || field === 'queueCapacity') return raw == null ? t.common.unlimited : String(raw);
  if (field === 'countsAsCompleted') return raw !== false ? (t.lang === 'zh' ? '计为完成' : 'counts as finished') : (t.lang === 'zh' ? '计为离开' : 'counts as left');
  if (raw == null) return none(t);
  return typeof raw === 'object' ? JSON.stringify(raw) : String(raw);
}

/** A readable change with the relevant before and after values, not only field names. */
export function changeText(item: ChangeItem, a: Plan, b: Plan, t: Messages, scenario?: Scenario): string {
  const c = t.compare;
  if (item.kind === 'assignment') {
    const name = resourceName(item.after ? b : a, item.id);
    return `${name}: ${value(assignmentText(item.before as Assignment | undefined, a, t), assignmentText(item.after as Assignment | undefined, b, t), t)}`;
  }
  if (item.kind === 'edge') {
    const before = item.before as Edge | undefined, after = item.after as Edge | undefined;
    const route = (edge: Edge, plan: Plan) => c.route(nodeName(plan, edge.source), nodeName(plan, edge.target));
    const details = (edge: Edge, plan: Plan) => `${route(edge, plan)}${edge.transferDuration ? ` · ${c.fields.transferDuration} ${durationText(edge.transferDuration, t)}` : ''}`;
    if (!before) return c.routeAdded(details(after!, b));
    if (!after) return c.routeRemoved(details(before, a));
    const changes = item.fields.map(field => `${c.fields[field] ?? field} ${value(fieldText(field, before as Record<string, unknown>, a, t, scenario), fieldText(field, after as Record<string, unknown>, b, t, scenario), t)}`);
    return c.routeModified(route(after, b), names(changes, t));
  }
  const entity = (item.after ?? item.before) as { name: string; type?: Node['type'] };
  if (item.change !== 'modified') return (item.change === 'added' ? c.added : c.removed)(item.kind === 'node' ? t.nodeTypes[entity.type!].toLowerCase() : c.kinds[item.kind], entity.name);
  const before = item.before as Record<string, unknown>, after = item.after as Record<string, unknown>;
  const details = item.fields.map(field => `${c.fields[field] ?? field} ${value(fieldText(field, before, a, t, scenario), fieldText(field, after, b, t, scenario), t)}`);
  return c.modified(entity.name, names(details, t));
}
