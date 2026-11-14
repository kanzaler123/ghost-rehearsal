import type { Plan, ValidationIssue } from './model';
import { validatePlan } from './validation';

function copy<T>(value: T): T {
  if (Array.isArray(value)) return value.map(item => copy(item)) as T;
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, copy(item)])) as T;
  }
  return value;
}

export function flattenSubflows(plan: Plan): Plan {
  const flattened = copy(plan);
  flattened.graph.nodes = flattened.graph.nodes.filter(node => node.type !== 'subflow');
  return flattened;
}

export function duplicatePlan(input: unknown, existingPlanIds: ReadonlySet<string>):
  { ok: true; plan: Plan } | { ok: false; issues: ValidationIssue[] } {
  const issues = validatePlan(input);
  if (issues.some(issue => issue.severity === 'error')) return { ok: false, issues };
  const original = input as Plan;
  const duplicate = copy(original);
  let counter = 1;
  let id: string;
  do {
    const suffix = `-copy-${counter++}`;
    id = original.id.slice(0, 64 - suffix.length) + suffix;
  } while (id === original.id || existingPlanIds.has(id));
  const nameSuffix = ' (copy)';
  duplicate.id = id;
  duplicate.sourcePlanId = original.id;
  duplicate.name = [...original.name].slice(0, 100 - [...nameSuffix].length).join('') + nameSuffix;
  return { ok: true, plan: duplicate };
}
