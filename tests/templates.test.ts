import { describe, expect, it } from 'vitest';
import { addEvent, addNodeFromTemplate, addPlanFromTemplate, emptyProject, halloweenProject, importTemplate, initialDocument, serializeTemplate, serializeTemplates, templateLibrarySchema } from '../src/features/project';
import type { SavedTemplate } from '../src/features/project';
import { MESSAGES } from '../src/i18n/messages';
import { planSchema, projectDocumentSchema, validateGraph } from '../src/schemas';
import { simulate } from '../src/simulation/engine';

it('copies nested subflow members and routes independently and runs the resulting plan', () => {
  const document = halloweenProject('haunted', MESSAGES.en), source = document.plans[0], target = emptyProject();
  const members = source.graph.nodes.map(node => node.id);
  source.graph.nodes.push({ id: 'inner', type: 'subflow', name: 'Inner', layout: { x: 0, y: 0 }, memberNodeIds: members.slice(1) },
    { id: 'outer', type: 'subflow', name: 'Outer', layout: { x: 0, y: 0 }, memberNodeIds: [members[0], 'inner'] });
  const before = JSON.stringify(document);
  const added = addNodeFromTemplate(target.plans[0], target.scenarios[0], { id: 'group', name: 'Copy', nodeId: 'outer', document });
  expect(added.plan.graph.nodes).toHaveLength(source.graph.nodes.length);
  expect(added.plan.graph.edges).toHaveLength(source.graph.edges.length);
  expect(validateGraph(target.scenarios[0], added.plan).filter(issue => issue.severity === 'error')).toEqual([]);
  expect(simulate({ schemaVersion: 1, scenario: target.scenarios[0], plan: added.plan, runMode: 'run_to_completion' }).status).toBe('succeeded');
  expect(JSON.stringify(document)).toBe(before);
  expect(target.plans[0].graph.nodes).toEqual([]);
});

it.each(['share', 'copy'] as const)('inserts a second runnable Open House verification on the chosen route (%s)', mode => {
  const document = initialDocument(), plan = document.plans[0], scenario = document.scenarios[0], before = JSON.stringify(plan);
  const template = { id: 'group', name: 'Verification copy', nodeId: 'verification', document };
  const incoming = { 'regular-checkin': 'regular-checkin' };
  expect(() => addNodeFromTemplate(plan, scenario, template, mode)).toThrow();
  expect(() => addNodeFromTemplate(plan, scenario, template, mode, { incoming, outgoing: { 'review-holding': 'exit-no-such' } })).toThrow();
  expect(() => addNodeFromTemplate(plan, scenario, template, mode, { incoming, outgoing: { 'review-holding': 'holding' } })).toThrow();
  const added = addNodeFromTemplate(plan, scenario, template, mode, { incoming, outgoing: { 'review-holding': 'checkin' } });
  const members = added.node.type === 'subflow' ? added.node.memberNodeIds : [];
  expect(members).toHaveLength(4);
  expect(members.every(id => !plan.graph.nodes.some(node => node.id === id))).toBe(true);
  expect(added.plan.graph.edges.filter(edge => members.includes(edge.source) && members.includes(edge.target))).toHaveLength(4);
  expect(added.plan.graph.edges.find(edge => edge.id === 'vip-checked')).toEqual(plan.graph.edges.find(edge => edge.id === 'vip-checked'));
  expect(simulate({ schemaVersion: 1, scenario, plan: added.plan, runMode: 'cutoff' }).status).toBe('succeeded');
  expect(JSON.stringify(plan)).toBe(before);
});

it.each(['share', 'copy'] as const)('reuses only staff posted to the recheck template with %s resources', mode => {
  const document = initialDocument(); document.plans = [document.plans[0]];
  const plan = document.plans[0], before = JSON.stringify(plan);
  const result = addNodeFromTemplate(plan, document.scenarios[0], { id: 'recheck-template', name: 'Recheck copy', nodeId: 'recheck', document }, mode);
  expect(JSON.stringify(plan)).toBe(before);
  expect(result.plan.staff).toHaveLength(mode === 'share' ? 3 : 4);
  expect(result.plan.assignments.filter(item => item.periods.some(period => period.nodeIds.includes(result.node.id))).map(item => item.resourceUnitId)).toEqual([mode === 'share' ? 'floater' : 'staff-1']);
  expect(result.plan.assignments.find(item => item.resourceUnitId === 'check-staff')).toEqual(plan.assignments.find(item => item.resourceUnitId === 'check-staff'));
  expect(validateGraph(document.scenarios[0], result.plan).filter(issue => issue.code === 'insufficient_resources')).toEqual([]);
  if (mode === 'share') expect(result.plan.staff).toEqual(plan.staff);
  else expect(result.plan.assignments.filter(item => item.resourceUnitId === 'staff-1').every(item => item.periods.some(period => period.nodeIds.length > 0))).toBe(true);
});

it('copies a device pool once when multiple requirements reference it', () => {
  const document = initialDocument(); document.plans = [document.plans[0]];
  const plan = document.plans[0], node = plan.graph.nodes.find(item => item.id === 'checkin')!;
  if (node.type !== 'service') throw new Error('fixture');
  plan.deviceTypes[0].quantity = 2;
  node.requirements.push({ kind: 'device', deviceTypeId: 'scanner', quantity: 1 });
  const result = addNodeFromTemplate(plan, document.scenarios[0], { id: 'template', name: 'Copy', nodeId: node.id, document }, 'copy');
  expect(result.plan.deviceTypes).toHaveLength(2);
  if (result.node.type !== 'service') throw new Error('fixture');
  expect(new Set(result.node.requirements.flatMap(item => item.kind === 'device' ? [item.deviceTypeId] : [])).size).toBe(1);
  expect(result.plan.deviceTypes.at(-1)!.quantity).toBe(2);
});

it.each(['share', 'copy'] as const)('reapplies a service template with %s resources and complete posts', mode => {
  const document = initialDocument(); document.plans = [document.plans[0]];
  const plan = document.plans[0], scenario = document.scenarios[0];
  plan.assignments.push({ resourceUnitId: 'scanner:1', periods: [{ from: 0, nodeIds: ['checkin'] }] });
  const template: SavedTemplate = { id: 'check-template', name: 'Check copy', nodeId: 'checkin', document };
  const before = JSON.stringify(document);
  const result = addNodeFromTemplate(plan, scenario, template, mode);
  const insufficient = validateGraph(scenario, result.plan).filter(issue => ['insufficient_resources', 'unknown_assignment_resource', 'invalid_assignment_node'].includes(issue.code));
  expect(insufficient).toEqual([]);
  expect(JSON.stringify(document)).toBe(before);
  if (mode === 'share') {
    expect(result.plan.staff).toHaveLength(plan.staff.length);
    expect(result.plan.deviceTypes).toHaveLength(plan.deviceTypes.length);
    expect(result.plan.assignments.find(item => item.resourceUnitId === 'check-staff')!.periods[0].nodeIds).toEqual(['checkin', result.node.id]);
    expect(result.plan.assignments.find(item => item.resourceUnitId === 'scanner:1')!.periods[0].nodeIds).toEqual(['checkin', result.node.id]);
    expect(result.plan.assignments.find(item => item.resourceUnitId === 'floater')!.periods[0].nodeIds).not.toContain(result.node.id);
    expect(result.plan.assignments.find(item => item.resourceUnitId === 'floater')!.periods[1].nodeIds).toContain(result.node.id);
  } else {
    expect(result.plan.staff.length).toBeGreaterThan(plan.staff.length);
    expect(result.plan.deviceTypes).toHaveLength(plan.deviceTypes.length + 1);
    expect(result.plan.assignments.slice(0, plan.assignments.length)).toEqual(plan.assignments);
    expect(result.plan.assignments.slice(plan.assignments.length).some(item => item.periods.some(period => period.nodeIds.includes(result.node.id)))).toBe(true);
  }
});

describe.each(['en', 'zh'] as const)('Halloween presets (%s)', lang => {
  it.each(['haunted', 'candy'] as const)('%s has a runnable flow', kind => {
    const document = halloweenProject(kind, MESSAGES[lang]);
    expect(projectDocumentSchema.safeParse(document).success).toBe(true);
    const run = simulate({ schemaVersion: 1, scenario: document.scenarios[0], plan: document.plans[0], runMode: 'run_to_completion' });
    expect(run.issues.filter(issue => issue.severity === 'error')).toEqual([]);
    expect(run.status).toBe('succeeded');
    expect(run.population).toHaveLength(60);
    expect(run.completion?.outcomes.completed).toBe(60);
  });
});

it('reusing a plan twice keeps source templates and all plans independent', () => {
  const original = initialDocument();
  const template = { ...original, plans: [original.plans[0]] };
  const before = JSON.stringify(original);
  const once = addPlanFromTemplate(original, template, 'Saved plan');
  const twice = addPlanFromTemplate(once, template, 'Another copy');
  expect(projectDocumentSchema.safeParse(twice).success).toBe(true);
  const added = twice.plans.at(-1)!;
  const scenario = twice.scenarios.find(item => item.id === added.scenarioId)!;
  expect(validateGraph(scenario, added).filter(issue => issue.severity === 'error')).toEqual([]);
  added.graph.nodes[0].name = 'Edited copy';
  scenario.arrivalStreams.length = 0;
  expect(JSON.stringify(original)).toBe(before);
  expect(once.plans.at(-1)!.graph.nodes[0].name).not.toBe('Edited copy');
  expect(once.scenarios.at(-1)!.arrivalStreams.length).toBeGreaterThan(0);
});

it('node templates copy service settings and dependencies without overwriting conflicting resources', () => {
  const document = initialDocument();
  const source = document.plans[0];
  const service = source.graph.nodes.find(node => node.type === 'service' && node.requirements.some(item => item.kind === 'device'))!;
  const template: SavedTemplate = { id: 'template-1', name: 'Saved service', nodeId: service.id, document: { ...document, plans: [source] } };
  const target = structuredClone(source);
  target.graph = { nodes: [], edges: [] };
  target.assignments = [];
  target.skills = target.skills.map(skill => ({ ...skill, name: 'Different skill' }));
  target.staff = [];
  target.deviceTypes = target.deviceTypes.map(device => ({ ...device, quantity: 999 }));
  const before = JSON.stringify({ template, target });
  const result = addNodeFromTemplate(target, document.scenarios[0], template);
  expect(planSchema.safeParse(result.plan).success).toBe(true);
  expect(result.node.name).toBe('Saved service');
  expect(result.node.type).toBe('service');
  if (result.node.type !== 'service' || service.type !== 'service') throw new Error('Expected service');
  expect(result.node.duration).toEqual(service.duration);
  expect(result.plan.deviceTypes.filter(device => device.quantity === 999)).toHaveLength(target.deviceTypes.length);
  expect(validateGraph(document.scenarios[0], result.plan).filter(issue => ['unknown_requirement_resource', 'insufficient_resources', 'unknown_staff_skill', 'unknown_assignment_resource', 'invalid_assignment_node'].includes(issue.code))).toEqual([]);
  expect(JSON.stringify({ template, target })).toBe(before);
});

it('reusing a node generates distinct IDs and independent editable settings', () => {
  const document = halloweenProject('candy', MESSAGES.en);
  const plan = document.plans[0];
  const template: SavedTemplate = { id: 'template-1', name: 'My candy station', nodeId: 'stop-2', document };
  const first = addNodeFromTemplate(plan, document.scenarios[0], template);
  const second = addNodeFromTemplate(first.plan, document.scenarios[0], template);
  expect(first.node.id).not.toBe(second.node.id);
  second.node.name = 'Renamed';
  expect(first.node.name).toBe('My candy station');
  expect(plan.graph.nodes.find(node => node.id === 'stop-2')!.name).toBe('Candy counter');
});

it('template storage round-trips snapshots and rejects missing nodes or multiple plans', () => {
  const document = halloweenProject('haunted', MESSAGES.en);
  const template = { id: 'template-1', name: 'My tour', nodeId: 'stop-3', document };
  expect(templateLibrarySchema.parse(JSON.parse(JSON.stringify([template])))).toEqual([template]);
  expect(templateLibrarySchema.safeParse([{ ...template, nodeId: 'missing' }]).success).toBe(false);
  expect(templateLibrarySchema.safeParse([{ ...template, document: initialDocument() }]).success).toBe(false);
  expect(templateLibrarySchema.safeParse([{ ...template, name: '   ' }]).success).toBe(false);
});

it('a plan file preserves its flow, arrivals and resources and can run on another project', () => {
  const document = initialDocument();
  document.plans = [document.plans[0]];
  const original: SavedTemplate = { id: 'template-7', name: '我的活动 👻', document };
  const [imported] = importTemplate(serializeTemplate(original), []);
  expect(imported.name).toBe(original.name);
  expect(imported.document).toEqual(original.document);
  expect(imported.nodeId).toBeUndefined();
  const target = emptyProject();
  const next = addPlanFromTemplate(target, imported.document, imported.name);
  const plan = next.plans.at(-1)!;
  const scenario = next.scenarios.at(-1)!;
  expect(target.plans).toHaveLength(1);
  expect(plan.graph).toEqual(document.plans[0].graph);
  expect(plan.assignments).toEqual(document.plans[0].assignments);
  expect(scenario.arrivalStreams).toEqual(document.scenarios[0].arrivalStreams);
  expect(simulate({ schemaVersion: 1, scenario, plan, runMode: 'cutoff' }).status).toBe('succeeded');
});

it('a node file can restore the selected service and its resource dependencies', () => {
  const document = initialDocument();
  document.plans = [document.plans[0]];
  const original: SavedTemplate = { id: 'template-1', name: 'Portable check-in', nodeId: 'checkin', document };
  const [imported] = importTemplate(serializeTemplate(original), []);
  expect(imported.nodeId).toBe('checkin');
  expect(imported.document).toEqual(original.document);
  const target = emptyProject();
  const restored = addNodeFromTemplate(target.plans[0], target.scenarios[0], imported);
  expect(restored.plan.graph.nodes).toHaveLength(1);
  expect(restored.plan.staff.length).toBeGreaterThan(0);
  expect(restored.plan.deviceTypes.length).toBeGreaterThan(0);
  expect(restored.node.name).toBe('Portable check-in');
  expect(validateGraph(target.scenarios[0], restored.plan).filter(issue => ['unknown_requirement_resource', 'insufficient_resources', 'unknown_staff_skill', 'unknown_assignment_resource', 'invalid_assignment_node'].includes(issue.code))).toEqual([]);
});

it('repeated imports keep existing templates and create independent copies with distinct IDs', () => {
  const original: SavedTemplate = { id: 'template-1', name: 'Same name', document: halloweenProject('haunted', MESSAGES.en) };
  const existing = [original];
  const before = JSON.stringify(existing);
  const file = serializeTemplate(original);
  const once = importTemplate(file, existing);
  const twice = importTemplate(file, once);
  expect(twice.map(item => item.id)).toEqual(['template-1', 'template-2', 'template-3']);
  expect(twice.map(item => item.name)).toEqual(['Same name', 'Same name', 'Same name']);
  twice[2].document.plans[0].graph.nodes[0].name = 'Edited import';
  expect(JSON.stringify(existing)).toBe(before);
  expect(once[1].document).toEqual(original.document);
});

it.each([
  ['invalid JSON', (file: string) => file.slice(0, -1)],
  ['a project file', () => JSON.stringify(emptyProject())],
  ['an unsupported version', (file: string) => JSON.stringify({ ...JSON.parse(file), schemaVersion: 2 })],
  ['an unknown format', (file: string) => JSON.stringify({ ...JSON.parse(file), format: 'different-tool' })],
  ['a missing node', (file: string) => { const value = JSON.parse(file); value.template.nodeId = 'missing'; return JSON.stringify(value); }],
  ['invalid parameters', (file: string) => { const value = JSON.parse(file); value.template.document.plans[0].graph.nodes[2].duration.value = -1; return JSON.stringify(value); }],
  ['an empty name', (file: string) => { const value = JSON.parse(file); value.template.name = ' '; return JSON.stringify(value); }],
] as const)('rejects %s without changing the current library', (_label, corrupt) => {
  const existing: SavedTemplate[] = [{ id: 'template-1', name: 'My tour', nodeId: 'stop-3', document: halloweenProject('haunted', MESSAGES.en) }];
  const before = JSON.stringify(existing);
  expect(() => importTemplate(corrupt(serializeTemplate(existing[0])), existing)).toThrow();
  expect(JSON.stringify(existing)).toBe(before);
});

it('exports nodes and plans together and restores the whole library independently', () => {
  const document = halloweenProject('haunted', MESSAGES.en);
  const library: SavedTemplate[] = [
    { id: 'template-1', name: 'Whole event plan', document },
    { id: 'template-2', name: 'Tour station', nodeId: 'stop-3', document },
  ];
  const imported = importTemplate(serializeTemplates(library), []);
  expect(imported).toEqual(library);
  imported[1].document.plans[0].graph.nodes[2].name = 'Changed copy';
  expect(imported[0].document.plans[0].graph.nodes[2].name).toBe('Haunted tour');
  expect(library[1].document.plans[0].graph.nodes[2].name).toBe('Haunted tour');
});

it('imports multiple single files and bundles in one batch without overwriting existing templates', () => {
  const document = halloweenProject('candy', MESSAGES.en);
  const plan: SavedTemplate = { id: 'template-1', name: 'Plan', document };
  const node: SavedTemplate = { id: 'template-1', name: 'Node', nodeId: 'stop-2', document };
  const existing = [plan];
  const before = JSON.stringify(existing);
  const next = importTemplate([serializeTemplate(node), serializeTemplates([plan, node]), serializeTemplate(plan)], existing);
  expect(next.map(item => item.id)).toEqual(['template-1', 'template-2', 'template-3', 'template-4', 'template-5']);
  expect(next.map(item => item.name)).toEqual(['Plan', 'Node', 'Plan', 'Node', 'Plan']);
  expect(JSON.stringify(existing)).toBe(before);
});

it.each(['malformed', 'future-version', 'empty-bundle'] as const)('rejects an entire batch containing a %s file', kind => {
  const existing: SavedTemplate[] = [{ id: 'template-1', name: 'Keep', document: halloweenProject('haunted', MESSAGES.en) }];
  const before = JSON.stringify(existing);
  const invalid = kind === 'malformed' ? '{' : JSON.stringify({ format: 'ghost-rehearsal-template-library', schemaVersion: kind === 'future-version' ? 2 : 1, templates: kind === 'empty-bundle' ? [] : existing });
  expect(() => importTemplate([serializeTemplate(existing[0]), invalid], existing)).toThrow();
  expect(JSON.stringify(existing)).toBe(before);
});

it('adds independent events with all their plans while keeping existing events', () => {
  const project = emptyProject();
  project.scenarios[0].name = 'My existing event';
  const example = initialDocument();
  const before = JSON.stringify({ project, example });
  const once = addEvent(project, example);
  const twice = addEvent(once, example);
  expect(projectDocumentSchema.safeParse(twice).success).toBe(true);
  expect(twice.scenarios).toHaveLength(3);
  expect(twice.plans).toHaveLength(5);
  expect(twice.plans[1].scenarioId).toBe(twice.plans[2].scenarioId);
  expect(twice.plans[3].scenarioId).not.toBe(twice.plans[1].scenarioId);
  expect(twice.plans[2].graph).toEqual(example.plans[1].graph);
  twice.plans[3].graph.nodes[0].name = 'Only this event';
  expect(once.plans[1].graph.nodes[0].name).toBe(example.plans[0].graph.nodes[0].name);
  expect(JSON.stringify({ project, example })).toBe(before);
});
