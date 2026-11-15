import { DOCUMENT_FORMAT, SCHEMA_VERSION, projectDocumentSchema } from './model';
import type { Node, Plan, ProjectDocument, Scenario, ValidationIssue } from './model';
import { validateDocument } from './validation';

const compare = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
const byId = <T extends { id: string }>(items: T[]) => [...items].sort((a, b) => compare(a.id, b.id));

export function normalizeNode(node: Node): Node {
  if (node.type === 'entrance') return { ...node, arrivalStreamIds: [...node.arrivalStreamIds].sort(compare) };
  if (node.type === 'subflow') return { ...node, memberNodeIds: [...node.memberNodeIds].sort(compare) };
  if (node.type === 'exit') return { ...node, countsAsCompleted: node.countsAsCompleted ?? true };
  if (node.type === 'waiting_area') return { ...node, queueCapacity: node.queueCapacity ?? null, fullPolicy: node.fullPolicy ?? { kind: 'block' } };
  if (node.type === 'service') return {
    ...node, queueCapacity: node.queueCapacity ?? null, fullPolicy: node.fullPolicy ?? { kind: 'block' },
    queueDiscipline: node.queueDiscipline ?? 'fifo', priority: node.priority ?? 0,
    closePolicy: { queued: node.closePolicy?.queued ?? { kind: 'serve' }, late: node.closePolicy?.late ?? { kind: 'reject' } },
  };
  if (node.type === 'decision' && node.routing.kind === 'attribute') return {
    ...node, routing: { ...node.routing, branches: node.routing.branches.map(branch => branch.condition
      ? { ...branch, condition: { ...branch.condition, values: [...branch.condition.values].sort(compare) } } : branch) },
  };
  return { ...node };
}

export function normalizePlan(plan: Plan): Plan {
  return {
    ...plan, graph: { nodes: byId(plan.graph.nodes).map(normalizeNode), edges: byId(plan.graph.edges) },
    skills: byId(plan.skills), staff: byId(plan.staff).map(staff => ({ ...staff, skillIds: [...staff.skillIds].sort(compare) })),
    deviceTypes: byId(plan.deviceTypes), assignments: [...plan.assignments].sort((a, b) => compare(a.resourceUnitId, b.resourceUnitId))
      .map(assignment => ({ ...assignment, periods: assignment.periods.map(period => ({ ...period, nodeIds: [...period.nodeIds].sort(compare), handoverSec: period.handoverSec ?? 0 })) })),
  };
}

export function normalizeScenario(scenario: Scenario): Scenario {
  return {
    ...scenario, attributes: byId(scenario.attributes), arrivalStreams: byId(scenario.arrivalStreams),
    statistics: { bucketSec: scenario.statistics?.bucketSec ?? 900, bottleneckThreshold: scenario.statistics?.bottleneckThreshold ?? 1 },
  };
}

export function canonicalText(value: unknown): string {
  const write = (item: unknown, depth: number): string => {
    if (item === null || typeof item !== 'object') return JSON.stringify(item);
    const indent = '  '.repeat(depth + 1);
    const entries = Array.isArray(item) ? item.map(value => write(value, depth + 1))
      : Object.keys(item).sort(compare).filter(key => (item as Record<string, unknown>)[key] !== undefined)
        .map(key => `${JSON.stringify(key)}: ${write((item as Record<string, unknown>)[key], depth + 1)}`);
    const [open, close] = Array.isArray(item) ? ['[', ']'] : ['{', '}'];
    return entries.length ? `${open}\n${indent}${entries.join(`,\n${indent}`)}\n${'  '.repeat(depth)}${close}` : open + close;
  };
  return write(value, 0) + '\n';
}

export function serializeDocument(document: ProjectDocument): string {
  const valid = projectDocumentSchema.parse(document);
  return canonicalText({ ...valid, scenarios: byId(valid.scenarios).map(normalizeScenario), plans: byId(valid.plans).map(normalizePlan) });
}

export type DocumentParseResult = { document: ProjectDocument; issues: ValidationIssue[]; migrations: { from: number; to: number }[] }
  | { document?: never; issues: ValidationIssue[]; migrations?: never };

export function parseDocument(text: string): DocumentParseResult {
  const error = (code: string, message: string, path: ValidationIssue['path']): ValidationIssue => ({ code, message, path, severity: 'error', entityIds: [] });
  let value: unknown;
  try { value = JSON.parse(text); }
  catch { return { issues: [error('invalid_json', '项目文件不是有效的 JSON 文本', [])] }; }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { issues: [error('invalid_document', '项目文件的顶层必须是对象', [])] };
  const header = value as Record<string, unknown>;
  const issues: ValidationIssue[] = [];
  if (header.format !== DOCUMENT_FORMAT) issues.push(error('invalid_document_format', `项目格式标识必须为 ${DOCUMENT_FORMAT}`, ['format']));
  if (typeof header.schemaVersion !== 'number' || !Number.isInteger(header.schemaVersion) || header.schemaVersion <= 0) {
    issues.push(error('invalid_schema_version', '项目版本必须为正整数', ['schemaVersion']));
  } else if (header.schemaVersion > SCHEMA_VERSION) {
    issues.push(error('unsupported_schema_version', `项目版本为 ${header.schemaVersion}，当前支持版本为 ${SCHEMA_VERSION}，请更新 Ghost Rehearsal`, ['schemaVersion']));
  }
  if (issues.length) return { issues };
  const validation = validateDocument(value);
  if (validation.some(issue => issue.severity === 'error')) return { issues: validation };
  const document = JSON.parse(serializeDocument(value as ProjectDocument)) as ProjectDocument;
  return { document, issues: validateDocument(document), migrations: [] };
}
