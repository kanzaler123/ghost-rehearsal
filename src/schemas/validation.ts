import { z } from 'zod';
import { planSchema, projectDocumentSchema, runRequestSchema, scenarioSchema } from './model';
import type { FieldPath, ValidationIssue } from './model';

function entityAt(value: unknown, path: FieldPath): string[] {
  let current = value;
  let ids: string[] = [];
  for (const segment of [...path, '']) {
    if (current === null || typeof current !== 'object') break;
    const record = current as Record<string | number, unknown>;
    if (typeof record.id === 'string') ids = [record.id];
    else if (typeof record.resourceUnitId === 'string') ids = [record.resourceUnitId];
    current = record[segment];
  }
  return ids;
}

function validate(schema: z.ZodType, input: unknown): ValidationIssue[] {
  const result = schema.safeParse(input);
  if (result.success) return [];
  return result.error.issues.flatMap(error => {
    const path = error.path.map(segment => typeof segment === 'number' ? segment : String(segment));
    const params = error.code === 'custom' ? error.params : undefined;
    const base = {
      severity: 'error' as const,
      entityIds: [...new Set([...entityAt(input, path), ...((params?.entityIds as string[] | undefined) ?? [])])],
    };
    if (error.code === 'unrecognized_keys') {
      return error.keys.map(key => ({ ...base, code: 'unknown_field', message: '此类型未定义该字段', path: [...path, key] }));
    }
    return [{
      ...base,
      code: typeof params?.rule === 'string' ? params.rule : error.code,
      message: error.code === 'custom' ? error.message : '字段缺失、类型错误或取值超出允许范围',
      path,
    }];
  });
}

function planWarnings(input: unknown, prefix: FieldPath = []): ValidationIssue[] {
  const result = planSchema.safeParse(input);
  if (!result.success) return [];
  return result.data.graph.nodes.flatMap((node, index) =>
    node.type === 'waiting_area' && node.release.kind === 'batch'
      && node.release.batchSize > 1 && node.release.maxHoldSec === undefined
      ? [{
        code: 'batch_without_timeout', severity: 'warning' as const,
        message: '不足一批的等候者可能直到运行结束都无法放行', entityIds: [node.id],
        path: [...prefix, 'graph', 'nodes', index, 'release'],
      }] : []);
}

export function validatePlan(input: unknown): ValidationIssue[] {
  return [...validate(planSchema, input), ...planWarnings(input)];
}

export function validateScenario(input: unknown): ValidationIssue[] {
  return validate(scenarioSchema, input);
}

export function validateRunRequest(input: unknown): ValidationIssue[] {
  const issues = validate(runRequestSchema, input);
  if (input && typeof input === 'object' && 'plan' in input) issues.push(...planWarnings(input.plan, ['plan']));
  return issues;
}

export function validateDocument(input: unknown): ValidationIssue[] {
  const issues = validate(projectDocumentSchema, input);
  if (input && typeof input === 'object' && 'plans' in input && Array.isArray(input.plans)) {
    input.plans.forEach((plan: unknown, index: number) => issues.push(...planWarnings(plan, ['plans', index])));
  }
  return issues;
}
