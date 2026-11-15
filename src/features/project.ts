import example from '../../examples/open-house.json';
import { z } from 'zod';
import { DOCUMENT_FORMAT, PRODUCT_STATEMENT, idSchema, projectDocumentSchema, validateDocument } from '../schemas';
import type { Node, Plan, ProjectDocument, Scenario } from '../schemas';
import type { SimulationRun } from '../simulation/types';
import { issueText } from '../i18n/issues';
import { MESSAGES } from '../i18n/messages';
import type { Lang, Messages } from '../i18n/messages';

export const NODE_TYPES: Node['type'][] = ['entrance', 'service', 'decision', 'waiting_area', 'merge', 'exit', 'subflow'];

export function initialDocument(): ProjectDocument {
  return projectDocumentSchema.parse(example);
}

export function readProject(text: string, lang: Lang = 'zh'): { document?: ProjectDocument; error?: string } {
  let value: unknown;
  try { value = JSON.parse(text); } catch { return { error: MESSAGES[lang].notices.invalidJson }; }
  const issues = validateDocument(value);
  const errors = issues.filter(issue => issue.severity === 'error');
  if (errors.length) return { error: errors.slice(0, 5).map(issue => `${issue.path.join('.')}: ${issueText(issue, lang)}`).join('\n') };
  return { document: projectDocumentSchema.parse(value) };
}

export function newId(prefix: string, used: string[]) {
  let index = 1;
  while (used.includes(`${prefix}-${index}`)) index++;
  return `${prefix}-${index}`;
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

export function serializeTemplate(template: SavedTemplate): string {
  return JSON.stringify(templateFileSchema.parse({ format: 'ghost-rehearsal-template', schemaVersion: 1, template }), null, 2);
}

export function importTemplate(text: string, existing: SavedTemplate[]): SavedTemplate[] {
  const { template } = templateFileSchema.parse(JSON.parse(text));
  return [...existing, { ...template, id: newId('template', existing.map(item => item.id)) }];
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

export function addNodeFromTemplate(plan: Plan, scenario: Scenario, template: SavedTemplate): { plan: Plan; node: Node } {
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
    node.stageKey = newId('stage', next.graph.nodes.flatMap(item => item.type === 'service' ? [item.stageKey] : []));
    const skillIds = new Map<string, string>();
    for (const requirement of node.requirements) {
      if (requirement.kind === 'staff') {
        const skill = source.skills.find(item => item.id === requirement.skillId);
        if (!skill) continue;
        let match = next.skills.find(item => item.id === (skillIds.get(skill.id) ?? skill.id) && item.name === skill.name);
        if (!match) { match = { ...skill, id: newId('skill', next.skills.map(item => item.id)) }; next.skills.push(match); }
        skillIds.set(skill.id, match.id); requirement.skillId = match.id;
      } else {
        const device = source.deviceTypes.find(item => item.id === requirement.deviceTypeId);
        if (!device) continue;
        let match = next.deviceTypes.find(item => JSON.stringify(item) === JSON.stringify(device));
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
        }
        requirement.deviceTypeId = match.id;
      }
    }
    for (const staff of source.staff.filter(item => item.skillIds.some(id => skillIds.has(id)))) {
      const skills = staff.skillIds.flatMap(id => skillIds.has(id) ? [skillIds.get(id)!] : []);
      if (next.staff.some(item => JSON.stringify(item) === JSON.stringify(staff) && skills.every(id => item.skillIds.includes(id)))) continue;
      const copy = structuredClone(staff); copy.id = newId('staff', next.staff.map(item => item.id));
      copy.skillIds = skills;
      next.staff.push(copy);
      const assignment = source.assignments.find(item => item.resourceUnitId === staff.id);
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

export function executionReport(plan: Plan, scenario: Scenario, run?: SimulationRun, stale = false, t: Messages = MESSAGES.zh): string {
  const r = t.report;
  const sep = t.lang === 'zh' ? '；' : '; ';
  const lines = [r.title(plan.name), '', r.scenario(scenario.name ?? scenario.id, scenario.id), r.seed(scenario.seed), r.window(scenario.observationCutoff, scenario.horizon), '', r.flow, '',
    ...plan.graph.nodes.filter(node => node.type !== 'subflow').map(node => `- ${node.name} (${node.id} / ${t.nodeTypes[node.type]})${node.type === 'service' ? `${sep}${r.stage} ${node.stageKey}${sep}${r.duration} ${JSON.stringify(node.duration)}${sep}${r.requirements} ${JSON.stringify(node.requirements)}${sep}${r.windows} ${JSON.stringify(node.openWindows)}${sep}${r.closePolicy} ${JSON.stringify(node.closePolicy ?? { queued: { kind: 'serve' }, late: { kind: 'reject' } })}` : ''}`),
    '', r.routes, '', ...plan.graph.edges.map(edge => `- ${edge.source} → ${edge.target}${edge.branchKey ? ` (${r.branch} ${edge.branchKey})` : ''}${sep}${r.transfer} ${JSON.stringify(edge.transferDuration ?? { kind: 'fixed', value: 0 })}`),
    '', r.resources, '', ...plan.staff.map(staff => `- ${staff.name} (${staff.id})${sep}${r.skills} ${staff.skillIds.join(', ')}${sep}${r.shifts} ${JSON.stringify(staff.shifts)}${sep}${r.unavailable} ${JSON.stringify(staff.unavailability)}${sep}${r.source} ${staff.provenance.kind}`),
    ...plan.deviceTypes.map(device => `- ${device.name} (${device.id}): ${device.quantity} ${r.units}${sep}${r.shifts} ${JSON.stringify(device.shifts)}${sep}${r.unavailable} ${JSON.stringify(device.unavailability)}${sep}${r.source} ${device.provenance.kind}`),
    '', r.posts, '', ...plan.assignments.map(assignment => `- ${assignment.resourceUnitId}: ${assignment.periods.map(period => `${period.from}–${period.to ?? r.end} s → ${period.nodeIds.join(', ') || r.unposted}, ${r.handover} ${period.handoverSec ?? 0} s`).join(sep)}`),
    '', r.assumptions, '', '```json', JSON.stringify({ arrivalStreams: scenario.arrivalStreams, assumptionOverrides: scenario.assumptionOverrides }, null, 2), '```', '',
  ];
  if (run?.status === 'succeeded' && run.statistics && !stale) lines.push(r.record, '', r.under, r.model(run.modelVersion, scenario.id),
    r.counts(run.statistics.arrived, run.statistics.outcomes.completed, run.statistics.outcomes.unfinished), r.waits(t.formatWait(run.statistics.averageWaiting), t.formatWait(run.statistics.p90Waiting)), '', r.synthetic, '');
  else lines.push(r.noRun, '');
  lines.push(r.scope, '', t.lang === 'zh' ? PRODUCT_STATEMENT.zh : PRODUCT_STATEMENT.en, '', t.lang === 'zh' ? PRODUCT_STATEMENT.en : PRODUCT_STATEMENT.zh, '');
  return lines.join('\n');
}
