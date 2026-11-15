import example from '../../examples/open-house.json';
import { z } from 'zod';
import { DOCUMENT_FORMAT, PRODUCT_STATEMENT, duplicatePlan, idSchema, parseDocument, projectDocumentSchema } from '../schemas';
import type { Edge, Node, Plan, ProjectDocument, Scenario, ValidationIssue } from '../schemas';
import type { SimulationRun } from '../simulation/types';
import { issueText } from '../i18n/issues';
import { MESSAGES } from '../i18n/messages';
import type { Lang, Messages } from '../i18n/messages';
import { comparisonContext, completedWaiting, costOf, statisticsAt } from './analysis';
import type { ResultBasis, WaitThreshold } from './analysis';

export const NODE_TYPES: Node['type'][] = ['entrance', 'service', 'decision', 'waiting_area', 'merge', 'exit', 'subflow'];

export function initialDocument(): ProjectDocument {
  return projectDocumentSchema.parse(example);
}

export function readProject(text: string, lang: Lang = 'zh'): { document?: ProjectDocument; error?: string; issues: ValidationIssue[] } {
  const result = parseDocument(text);
  if (!result.document) return { issues: result.issues, error: result.issues.map(issue => `${issue.path.join('.') || '$'}: ${issueText(issue, lang)}`).join('\n') };
  return { document: result.document, issues: result.issues };
}

export function newId(prefix: string, used: string[]) {
  let index = 1;
  while (used.includes(`${prefix}-${index}`)) index++;
  return `${prefix}-${index}`;
}

export function createPackingExperiment(source: Plan, usedIds: Set<string>, t: Messages): Plan | null {
  const original = source.staff.find(item => item.id === 'pack-staff');
  if (!original || !source.graph.nodes.some(node => node.id === 'packing' && node.type === 'service')) return null;
  const result = duplicatePlan(source, usedIds);
  if (!result.ok) return null;
  const target = result.plan;
  target.name = t.review.demoName;
  const staff = structuredClone(original);
  staff.id = newId('packing-support', target.staff.map(item => item.id)); staff.name = t.review.demoStaff;
  target.staff.push(staff);
  target.assignments.push({ resourceUnitId: staff.id, periods: [{ from: 0, nodeIds: ['packing'] }] });
  return target;
}

export function createNode(type: Node['type'], plan: Plan, scenario: Scenario, position: { x: number; y: number }, label: string = MESSAGES.zh.nodeTypes[type]): Node {
  const id = newId(type.replace('_', '-'), plan.graph.nodes.map(node => node.id));
  const base = { id, name: `${label} ${id.split('-').at(-1)}`, layout: position };
  if (type === 'entrance') return { ...base, type, arrivalStreamIds: scenario.arrivalStreams.length ? [scenario.arrivalStreams[0].id] : ['arrival-1'] };
  if (type === 'service') return { ...base, type, stageKey: id, duration: { kind: 'fixed', value: 30, provenance: { kind: 'user_estimate' } }, requirements: [], openWindows: [], maxConcurrent: 1 };
  if (type === 'decision') return { ...base, type, decisionKey: id, routing: { kind: 'probability', branches: [{ branchKey: 'first', weight: 0.5 }, { branchKey: 'second', weight: 0.5 }] } };
  if (type === 'waiting_area') return { ...base, type, release: { kind: 'until_time', releaseAt: 300 } };
  if (type === 'merge') return { ...base, type, incomingPriority: ['connect-an-edge'] };
  if (type === 'subflow') return { ...base, type, memberNodeIds: [] };
  return { ...base, type, countsAsCompleted: true };
}

export function emptyProject(names: { event: string; plan: string } = MESSAGES.zh.defaults): ProjectDocument {
  return { format: DOCUMENT_FORMAT, schemaVersion: 1,
    scenarios: [{ id: 'scenario-1', name: names.event, seed: 42, observationCutoff: 1800, horizon: 7200, attributes: [], assumptionOverrides: [], arrivalStreams: [
      { id: 'arrival-1', kind: 'total_in_window', count: 100, start: 0, end: 600, spacing: 'even', attributeDistributions: {}, provenance: { kind: 'user_estimate' } },
    ] }],
    plans: [{ id: 'plan-1', name: names.plan, scenarioId: 'scenario-1', graph: { nodes: [], edges: [] }, skills: [], staff: [], deviceTypes: [], assignments: [] }],
  };
}

export const templateLibrarySchema = z.array(z.strictObject({
  id: idSchema, name: z.string().trim().min(1).max(100), nodeId: idSchema.optional(), document: projectDocumentSchema,
}).refine(item => item.document.plans.length === 1 && item.document.scenarios.length === 1
  && (!item.nodeId || item.document.plans[0].graph.nodes.some(node => node.id === item.nodeId))));
export type SavedTemplate = z.infer<typeof templateLibrarySchema>[number];

const templateFileSchema = z.strictObject({
  format: z.literal('ghost-rehearsal-template'), schemaVersion: z.literal(1), template: templateLibrarySchema.element,
});
const templateBundleSchema = z.strictObject({
  format: z.literal('ghost-rehearsal-template-library'), schemaVersion: z.literal(1), templates: templateLibrarySchema.min(1),
});
const templateImportSchema = z.discriminatedUnion('format', [templateFileSchema, templateBundleSchema]);

export function serializeTemplate(template: SavedTemplate): string {
  return JSON.stringify(templateFileSchema.parse({ format: 'ghost-rehearsal-template', schemaVersion: 1, template }), null, 2);
}

export function serializeTemplates(templates: SavedTemplate[]): string {
  return JSON.stringify(templateBundleSchema.parse({ format: 'ghost-rehearsal-template-library', schemaVersion: 1, templates }), null, 2);
}

export function importTemplate(text: string | string[], existing: SavedTemplate[]): SavedTemplate[] {
  const imported = (Array.isArray(text) ? text : [text]).flatMap(file => {
    const data = templateImportSchema.parse(JSON.parse(file));
    return data.format === 'ghost-rehearsal-template' ? [data.template] : data.templates;
  });
  const next = [...existing];
  for (const template of imported) next.push({ ...template, id: newId('template', next.map(item => item.id)) });
  return next;
}

export function halloweenProject(kind: 'haunted' | 'candy', t: Messages): ProjectDocument {
  const names = t.templates[kind];
  const document = emptyProject({ event: names.name, plan: names.name });
  const scenario = document.scenarios[0];
  scenario.arrivalStreams[0] = { id: 'arrival-1', kind: 'total_in_window', count: 60, start: 0, end: 600, spacing: 'even', attributeDistributions: {}, provenance: { kind: 'synthetic' } };
  const plan = document.plans[0];
  const types: Node['type'][] = kind === 'haunted' ? ['entrance', 'waiting_area', 'service', 'exit'] : ['entrance', 'service', 'decision', 'service', 'exit'];
  plan.graph.nodes = types.map((type, index) => {
    const node = createNode(type, plan, scenario, { x: index * 300, y: index % 2 ? 230 : 100 }, names.nodes[index]);
    node.id = `stop-${index + 1}`; node.name = names.nodes[index];
    if (node.type === 'service') { node.stageKey = node.id; node.maxConcurrent = 3; node.duration = { kind: 'fixed', value: kind === 'haunted' ? 90 : 20, provenance: { kind: 'synthetic' } }; }
    if (node.type === 'waiting_area') node.release = { kind: 'batch', batchSize: 6, maxHoldSec: 60 };
    return node;
  });
  plan.graph.edges = plan.graph.nodes.slice(0, -1).map((node, index) => ({ id: `route-${index + 1}`, source: node.id, target: plan.graph.nodes[index + 1].id, ...(node.type === 'decision' ? { branchKey: 'first' } : {}) }));
  if (kind === 'candy') plan.graph.edges.push({ id: 'route-5', source: 'stop-3', target: 'stop-5', branchKey: 'second' });
  return document;
}

export function addPlanFromTemplate(project: ProjectDocument, template: ProjectDocument, name: string): ProjectDocument {
  const source = structuredClone(template);
  const scenario = source.scenarios.find(item => item.id === source.plans[0].scenarioId)!;
  scenario.id = newId('scenario', project.scenarios.map(item => item.id));
  delete scenario.sourceScenarioId;
  const plan = source.plans[0];
  plan.id = newId('plan', project.plans.map(item => item.id)); plan.name = name; plan.scenarioId = scenario.id;
  delete plan.sourcePlanId;
  return { ...project, scenarios: [...project.scenarios, scenario], plans: [...project.plans, plan] };
}

export function addEvent(project: ProjectDocument, event: ProjectDocument): ProjectDocument {
  const next = addPlanFromTemplate(project, event, event.plans[0].name);
  const scenarioId = next.plans.at(-1)!.scenarioId;
  for (const original of event.plans.slice(1)) {
    const plan = structuredClone(original);
    plan.id = newId('plan', next.plans.map(item => item.id)); plan.scenarioId = scenarioId;
    delete plan.sourcePlanId;
    next.plans.push(plan);
  }
  return next;
}

export function addNodeFromTemplate(plan: Plan, scenario: Scenario, template: SavedTemplate, resources: 'share' | 'copy' = 'share'): { plan: Plan; node: Node } {
  const source = template.document.plans[0];
  const original = source.graph.nodes.find(node => node.id === template.nodeId)!;
  const next = structuredClone(plan);
  const node = structuredClone(original);
  node.id = newId(node.type.replace('_', '-'), next.graph.nodes.map(item => item.id));
  node.name = template.name;
  node.layout = { x: original.layout.x + 60, y: original.layout.y + 180 };
  if (node.type === 'entrance') {
    const bound = new Set(next.graph.nodes.flatMap(item => item.type === 'entrance' ? item.arrivalStreamIds : []));
    node.arrivalStreamIds = scenario.arrivalStreams.filter(item => !bound.has(item.id)).map(item => item.id);
    if (!node.arrivalStreamIds.length) node.arrivalStreamIds = [scenario.arrivalStreams[0]?.id ?? 'arrival-1'];
  }
  if (node.type === 'service') {
    const canShare = (id: string) => !next.assignments.some(item => item.resourceUnitId === id)
      || next.assignments.some(item => item.resourceUnitId === id && item.periods.some(period => period.nodeIds.includes(original.id)));
    const shareAssignment = (id: string) => {
      const assignment = next.assignments.find(item => item.resourceUnitId === id);
      assignment?.periods.forEach(period => {
        if (period.nodeIds.includes(original.id) && !period.nodeIds.includes(node.id)) period.nodeIds.push(node.id);
      });
    };
    node.stageKey = newId('stage', next.graph.nodes.flatMap(item => item.type === 'service' ? [item.stageKey] : []));
    const skillIds = new Map<string, string>();
    const deviceIds = new Map<string, string>();
    for (const requirement of node.requirements) {
      if (requirement.kind === 'staff') {
        const skill = source.skills.find(item => item.id === requirement.skillId);
        if (!skill) continue;
        let match = next.skills.find(item => item.id === (skillIds.get(skill.id) ?? skill.id) && item.name === skill.name);
        if (!match) { match = { ...skill, id: newId('skill', next.skills.map(item => item.id)) }; next.skills.push(match); }
        skillIds.set(skill.id, match.id); requirement.skillId = match.id;
      } else {
        const mapped = deviceIds.get(requirement.deviceTypeId);
        if (mapped) { requirement.deviceTypeId = mapped; continue; }
        const device = source.deviceTypes.find(item => item.id === requirement.deviceTypeId);
        if (!device) continue;
        let match = resources === 'share' ? next.deviceTypes.find(item => JSON.stringify(item) === JSON.stringify(device) && Array.from({ length: item.quantity }, (_, index) => canShare(`${item.id}:${index + 1}`)).every(Boolean)) : undefined;
        if (!match) {
          match = structuredClone(device); match.id = newId('device', next.deviceTypes.map(item => item.id));
          match.unavailability = match.unavailability.map(window => ({ ...window, resourceUnitId: `${match!.id}:${window.resourceUnitId.split(':').at(-1)}` }));
          next.deviceTypes.push(match);
          for (let unit = 1; unit <= match.quantity; unit++) {
            const assignment = source.assignments.find(item => item.resourceUnitId === `${device.id}:${unit}`);
            next.assignments.push({ resourceUnitId: `${match.id}:${unit}`, periods: assignment
              ? assignment.periods.map(period => ({ ...period, nodeIds: period.nodeIds.includes(original.id) ? [node.id] : [] }))
              : [{ from: 0, nodeIds: [node.id] }] });
          }
        } else for (let unit = 1; unit <= match.quantity; unit++) shareAssignment(`${match.id}:${unit}`);
        deviceIds.set(device.id, match.id); requirement.deviceTypeId = match.id;
      }
    }
    for (const staff of source.staff.filter(item => item.skillIds.some(id => skillIds.has(id)))) {
      const assignment = source.assignments.find(item => item.resourceUnitId === staff.id);
      if (assignment && !assignment.periods.some(period => period.nodeIds.includes(original.id))) continue;
      const skills = staff.skillIds.flatMap(id => skillIds.has(id) ? [skillIds.get(id)!] : []);
      if (resources === 'share' && canShare(staff.id) && next.staff.some(item => JSON.stringify(item) === JSON.stringify(staff) && skills.every(id => item.skillIds.includes(id)))) { shareAssignment(staff.id); continue; }
      const copy = structuredClone(staff); copy.id = newId('staff', next.staff.map(item => item.id));
      copy.skillIds = skills;
      next.staff.push(copy);
      next.assignments.push({ resourceUnitId: copy.id, periods: assignment
        ? assignment.periods.map(period => ({ ...period, nodeIds: period.nodeIds.includes(original.id) ? [node.id] : [] }))
        : [{ from: 0, nodeIds: [node.id] }] });
    }
  }
  if (node.type === 'decision') node.decisionKey = newId('decision', next.graph.nodes.flatMap(item => item.type === 'decision' ? [item.decisionKey] : []));
  if (node.type === 'merge') node.incomingPriority = ['connect-an-edge'];
  next.graph.nodes.push(node);
  return { plan: next, node };
}

export function formatTime(seconds: number) {
  const value = Math.max(0, Math.floor(seconds));
  return `${Math.floor(value / 60).toString().padStart(2, '0')}:${(value % 60).toString().padStart(2, '0')}`;
}

export function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = name; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function provenanceDescription(provenance: Plan['staff'][number]['provenance'], t: Messages): string {
  return [t.review.sources[provenance.kind], provenance.source?.trim(), provenance.notes?.trim()].filter(Boolean).join(' · ');
}

export function durationDescription(duration: Extract<Node, { type: 'service' }>['duration'] | NonNullable<Edge['transferDuration']>, t: Messages): string {
  const value = duration.kind === 'fixed' ? t.formatWait(duration.value) : duration.kind === 'empirical' ? `${t.inspector.distributions.empirical}: ${duration.samples.map(t.formatWait).join(', ')}`
    : `${t.inspector.distributions[duration.kind]} ${t.formatWait(duration.min)}–${t.formatWait(duration.max)}${duration.kind === 'triangular' ? ` (${t.inspector.mode}: ${t.formatWait(duration.mode)})` : ''}`;
  return `${value} [${provenanceDescription(duration.provenance, t)}]`;
}

export function nodeInstructions(node: Node, plan: Plan, t: Messages): string[] {
  const zh = t.lang === 'zh';
  const name = (id: string) => plan.graph.nodes.find(item => item.id === id)?.name ?? id;
  const lines: string[] = [];
  if (node.type === 'service') {
    lines.push(`${t.report.duration}: ${durationDescription(node.duration, t)}; ${t.inspector.maxConcurrent}: ${node.maxConcurrent ?? t.common.unlimited}`);
    lines.push(`${t.report.requirements}: ${node.requirements.map(item => `${item.quantity} × ${item.kind === 'staff' ? plan.skills.find(skill => skill.id === item.skillId)?.name ?? item.skillId : plan.deviceTypes.find(device => device.id === item.deviceTypeId)?.name ?? item.deviceTypeId}`).join(', ') || t.inspector.noRequirements}`);
    lines.push(`${t.report.windows}: ${node.openWindows.map(window => `${formatTime(window.openAt)}–${formatTime(window.closeAt)} [${provenanceDescription(window.provenance, t)}]`).join(', ') || t.inspector.alwaysOpen}`);
    const queued = node.closePolicy?.queued, late = node.closePolicy?.late;
    lines.push(zh ? `关闭时，排队者${queued?.kind === 'dismiss' ? '离开' : queued?.kind === 'redirect' ? `转往 ${name(queued.targetNodeId)}` : '继续接受服务'}；迟到者${late?.kind === 'redirect' ? `转往 ${name(late.targetNodeId)}` : '被拒绝入场'}。`
      : `At closing, queued guests ${queued?.kind === 'dismiss' ? 'leave' : queued?.kind === 'redirect' ? `go to ${name(queued.targetNodeId)}` : 'continue to be served'}; late arrivals ${late?.kind === 'redirect' ? `go to ${name(late.targetNodeId)}` : 'are turned away'}.`);
    lines.push(zh ? '人员或设备不可用时等待；服务中遇到下班或不可用时段，先完成当前服务再释放资源。' : 'Wait if staff or equipment is unavailable. Active services finish before resources go off shift or become unavailable.');
  }
  if (node.type === 'waiting_area') lines.push(node.release.kind === 'batch'
    ? zh ? `每批放行 ${node.release.batchSize} 人；${node.release.maxHoldSec === undefined ? '无最长等待，凑满才放行' : `最长等待 ${t.formatWait(node.release.maxHoldSec)}，届时不足一批也放行`}。`
      : `Release ${node.release.batchSize} guests per batch; ${node.release.maxHoldSec === undefined ? 'wait for a full batch with no time limit' : `hold at most ${t.formatWait(node.release.maxHoldSec)}, then release even a partial batch`}.`
    : `${t.inspector.releaseAt}: ${formatTime(node.release.releaseAt)}`);
  if (node.type === 'service' || node.type === 'waiting_area') {
    const policy = node.fullPolicy;
    lines.push(`${t.inspector.queueCapacity}: ${node.queueCapacity ?? t.common.unlimited}; ${t.inspector.whenFull}: ${policy?.kind === 'reroute' ? `${t.inspector.fullReroute} → ${name(policy.targetNodeId)}` : policy?.kind === 'reject' ? t.inspector.fullReject : t.inspector.fullBlock}`);
  }
  if (node.type === 'decision') {
    lines.push(zh ? '按以下分支顺序匹配条件；概率分流按列出的权重抽样。' : 'Match conditions in the listed order; probability routes sample the listed weights.');
    node.routing.branches.forEach(branch => lines.push(`${branch.branchKey}: ${'weight' in branch ? `${(branch.weight * 100).toFixed(1)}%` : branch.condition ? `${branch.condition.attributeId} ∈ ${branch.condition.values.join(', ')}` : t.inspector.defaultBranch} → ${name(plan.graph.edges.find(edge => edge.source === node.id && edge.branchKey === branch.branchKey)?.target ?? '—')}`));
    if (node.loopGuard) lines.push(`${t.inspector.maxVisits}: ${node.loopGuard.maxVisits} → ${node.loopGuard.exitBranchKey}`);
  }
  if (node.type === 'entrance') lines.push(`${t.inspector.streams}: ${node.arrivalStreamIds.join(', ')}`);
  if (node.type === 'merge') lines.push(`${t.inspector.priority}: ${node.incomingPriority.join(' → ')}`);
  if (node.type === 'exit') lines.push(node.countsAsCompleted === false ? t.canvas.leaves : t.canvas.completes);
  return lines;
}

export function assignmentDescription(assignment: Plan['assignments'][number], plan: Plan, t: Messages): string {
  return assignment.periods.map(period => `${formatTime(period.from)}–${period.to === undefined ? t.report.end : formatTime(period.to)} → ${period.nodeIds.map(id => plan.graph.nodes.find(node => node.id === id)?.name ?? id).join(', ') || t.report.unposted}; ${t.report.handover} ${t.formatWait(period.handoverSec ?? 0)}`).join('; ');
}

export function executionReport(plan: Plan, scenario: Scenario, run?: SimulationRun, stale = false, t: Messages = MESSAGES.zh, baseline?: Plan, basis: ResultBasis = 'cutoff'): string {
  const r = t.report;
  const stats = statisticsAt(run, basis);
  const sep = t.lang === 'zh' ? '；' : '; ';
  const lines = [r.title(plan.name), '', r.scenario(scenario.name ?? scenario.id, scenario.id), r.seed(scenario.seed), r.window(scenario.observationCutoff, scenario.horizon), '', r.flow, '',
    t.lang === 'zh' ? '时刻均为活动开始后的 分:秒。' : 'All clock times are minutes:seconds from the event start.', '',
    ...plan.graph.nodes.filter(node => node.type !== 'subflow').flatMap(node => [`### ${node.name} (${t.nodeTypes[node.type]})`, '', ...nodeInstructions(node, plan, t).map(line => `- ${line}`), '']),
    '', r.routes, '', ...plan.graph.edges.map(edge => `- ${plan.graph.nodes.find(node => node.id === edge.source)?.name ?? edge.source} → ${plan.graph.nodes.find(node => node.id === edge.target)?.name ?? edge.target}${edge.branchKey ? ` (${r.branch} ${edge.branchKey})` : ''}${sep}${r.transfer} ${edge.transferDuration ? durationDescription(edge.transferDuration, t) : t.formatWait(0)}`),
    '', r.resources, '', ...plan.staff.map(staff => `- ${staff.name} (${staff.id})${sep}${r.skills} ${staff.skillIds.map(id => plan.skills.find(skill => skill.id === id)?.name ?? id).join(', ')}${sep}${r.shifts} ${staff.shifts.map(window => `${formatTime(window.start)}–${formatTime(window.end)}`).join(', ') || '—'}${sep}${r.unavailable} ${staff.unavailability.map(window => `${formatTime(window.start)}–${formatTime(window.end)}`).join(', ') || '—'}${sep}${r.source} ${provenanceDescription(staff.provenance, t)}`),
    ...plan.deviceTypes.map(device => `- ${device.name} (${device.id}): ${device.quantity} ${r.units}${sep}${r.shifts} ${device.shifts.map(window => `${formatTime(window.start)}–${formatTime(window.end)}`).join(', ') || '—'}${sep}${r.unavailable} ${device.unavailability.map(window => `${window.resourceUnitId} ${formatTime(window.start)}–${formatTime(window.end)}`).join(', ') || '—'}${sep}${r.source} ${provenanceDescription(device.provenance, t)}`),
    '', r.posts, '', ...plan.assignments.map(assignment => `- ${plan.staff.find(staff => staff.id === assignment.resourceUnitId)?.name ?? assignment.resourceUnitId}: ${assignmentDescription(assignment, plan, t)}`),
    ...[...plan.staff.map(item => item.id), ...plan.deviceTypes.flatMap(item => Array.from({ length: item.quantity }, (_, i) => `${item.id}:${i + 1}`))].filter(id => !plan.assignments.some(item => item.resourceUnitId === id)).map(id => `- ${id}: ${t.lang === 'zh' ? '班次内可服务所有技能或设备类型匹配的岗位。' : 'May serve any matching skill or device post during its shifts.'}`),
    '', r.assumptions, '', ...scenario.arrivalStreams.flatMap(stream => {
      const timing = stream.kind === 'records' ? `${stream.records.length} ${t.metrics.guests}` : stream.kind === 'bucketed' ? stream.buckets.map(bucket => `${formatTime(bucket.start)}–${formatTime(bucket.end)}: ${bucket.count}`).join(sep)
        : `${stream.count} ${t.metrics.guests}, ${formatTime(stream.start)}–${formatTime(stream.end)}, ${stream.kind === 'total_in_window' ? stream.spacing === 'even' ? t.review.even : t.review.random : stream.profile.kind === 'early_peak' ? t.review.early : stream.profile.kind === 'late_peak' ? t.review.late : stream.profile.kind === 'peak_at' ? `${t.review.peak} ${formatTime(stream.profile.peakAt)}` : t.review.random}`;
      return [`- ${stream.name ?? stream.id}: ${timing} [${provenanceDescription(stream.provenance, t)}]`,
        ...('attributeDistributions' in stream ? Object.entries(stream.attributeDistributions).map(([id, distribution]) => `  - ${id}: ${distribution.values.map(item => `${item.value} ${(item.probability * 100).toFixed(1)}%`).join(', ')} [${provenanceDescription(distribution.provenance, t)}]`) : [])];
    }), ...scenario.assumptionOverrides.map(override => override.kind === 'service_multiplier' ? `- ${override.stageKey ?? t.report.duration}: ×${override.factor}` : `- ${override.resource.id}: ${t.report.unavailable} ${formatTime(override.window.start)}–${formatTime(override.window.end)}${override.resource.kind === 'device_type' ? ` (${override.resource.quantity} ${r.units})` : ''}`), '',
  ];
  if (baseline) lines.push(`## ${t.review.resourceCounts}: ${baseline.name} → ${plan.name}`, '',
    `${t.review.staff}: ${baseline.staff.length} → ${plan.staff.length}; ${t.review.devices}: ${baseline.deviceTypes.reduce((sum, item) => sum + item.quantity, 0)} → ${plan.deviceTypes.reduce((sum, item) => sum + item.quantity, 0)}`, '',
    ...plan.staff.filter(item => !baseline.staff.some(original => original.id === item.id)).map(item => `- + ${item.name}`),
    ...plan.deviceTypes.filter(item => item.quantity !== (baseline.deviceTypes.find(original => original.id === item.id)?.quantity ?? 0)).map(item => `- ${item.name}: ${baseline.deviceTypes.find(original => original.id === item.id)?.quantity ?? 0} → ${item.quantity}`), '');
  if (run?.status === 'succeeded' && stats && !stale) {
    const completed = completedWaiting(stats);
    lines.push(r.record, '', r.under, r.model(run.modelVersion, scenario.id, `${t.review[basis]} (${formatTime(stats.until)})`),
      r.counts(stats.arrived, Object.entries(stats.outcomes).map(([outcome, count]) => `${t.outcomes[outcome]}: ${count}`).join(sep)),
      `${t.evidence.population} n=${stats.arrived}`, r.waits(t.formatWait(stats.averageWaiting), t.formatWait(stats.p90Waiting)),
      `${t.evidence.completed}: n=${completed.n}`, r.waits(t.formatWait(completed.average), t.formatWait(completed.p90)),
      ...(basis === 'completion' && stats.until >= scenario.horizon && stats.outcomes.unfinished + stats.outcomes.not_arrived > 0 ? [t.evidence.limit] : []), '', r.synthetic, '');
  }
  else lines.push(r.noRun, '');
  lines.push(r.scope, '', t.lang === 'zh' ? PRODUCT_STATEMENT.zh : PRODUCT_STATEMENT.en, '', t.lang === 'zh' ? PRODUCT_STATEMENT.en : PRODUCT_STATEMENT.zh, '');
  return lines.join('\n');
}

export function comparisonReport(a: SimulationRun | undefined, b: SimulationRun | undefined, ready: boolean, t: Messages, basis: ResultBasis, threshold: WaitThreshold): string {
  const context = comparisonContext(a, b, basis, threshold, ready), { a: left, b: right, counts: people } = context;
  if (!a || !b || !left || !right || !people) return t.report.noRun;
  const costs = costOf(a.request.plan, b.request.plan, a.request.scenario, left, right, basis);
  const groups = threshold ? t.evidence.groups : t.evidence.anyGroups, bins = threshold ? t.evidence.bins : t.evidence.anyBins;
  return [`## ${t.evidence.comparison}`, '', `A: ${a.request.plan.name} (${a.request.plan.id})`, `B: ${b.request.plan.name} (${b.request.plan.id})`,
    `${t.review.basis}: ${t.review[basis]}`, `${t.evidence.threshold}: ${threshold ? t.evidence.minute : t.evidence.any}`, t.evidence.rule,
    t.evidence.population, t.evidence.paired(people.total),
    ...[left, right].flatMap((stats, index) => {
      const completed = completedWaiting(stats), run = index ? b : a;
      return [`${index ? 'B' : 'A'}: ${t.evidence.side(formatTime(stats.until), stats.arrived, stats.outcomes.not_arrived, stats.arrived - people.total)}`,
        t.report.model(run.modelVersion, run.request.scenario.id, t.review[basis]), `Input SHA-256: ${run.inputKey}`, `Scenario SHA-256: ${run.scenarioKey}`,
        t.report.counts(stats.arrived, Object.entries(stats.outcomes).map(([outcome, count]) => `${t.outcomes[outcome]}: ${count}`).join('; ')),
        t.report.waits(t.formatWait(stats.averageWaiting), t.formatWait(stats.p90Waiting)),
        `${t.evidence.completed}: n=${completed.n}`, t.report.waits(t.formatWait(completed.average), t.formatWait(completed.p90)),
        ...(basis === 'completion' && stats.until >= run.request.scenario.horizon && stats.outcomes.unfinished + stats.outcomes.not_arrived > 0 ? [t.evidence.limit] : [])];
    }), t.evidence.subgroupNote, `${groups.less}: ${people.better}; ${groups.more}: ${people.worse}; ${groups.same}: ${people.same}`,
    t.compare.rescued(people.rescued), t.compare.lost(people.lost), t.review.caveat,
    `${t.compare.histogram}: ${people.bins.map((count, i) => `${bins[i]}: ${count}`).join('; ')}`,
    `${t.review.staff}: ${costs.staff[0]} → ${costs.staff[1]}`,
    ...costs.devices.map(device => `${device.name}: ${device.a} → ${device.b}`),
    `${t.compare.costStaffHours}: ${t.formatHours(costs.staffHours[0])} → ${t.formatHours(costs.staffHours[1])}`,
    `${t.compare.costDeviceHours}: ${t.formatHours(costs.deviceHours[0])} → ${t.formatHours(costs.deviceHours[1])}`,
    `${t.compare.costOvertime}: ${t.formatWait(costs.overtime[0])} → ${t.formatWait(costs.overtime[1])}`,
    t.compare.costNote, t.review.noBudget, t.report.synthetic, ''].join('\n\n');
}
