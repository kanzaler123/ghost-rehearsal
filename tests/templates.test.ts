import { describe, expect, it } from 'vitest';
import { addNodeFromTemplate, addPlanFromTemplate, emptyProject, halloweenProject, initialDocument, templateLibrarySchema } from '../src/features/project';
import type { SavedTemplate } from '../src/features/project';
import { MESSAGES } from '../src/i18n/messages';
import { planSchema, projectDocumentSchema, validateGraph } from '../src/schemas';
import { simulate } from '../src/simulation/engine';

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
