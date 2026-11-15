import { idSchema, projectDocumentSchema, scenarioSchema, validateGraph, validateRunRequest } from '../../schemas';
import type { ProjectDocument, Scenario } from '../../schemas';
import type { Condition, ExperimentConfig, PreparedBatch } from './types';

export const MAX_JOBS = 200;
export const DEFAULT_SEEDS = Array.from({ length: 10 }, (_, index) => 20261114 + index);
export const DEFAULT_CONDITIONS: Condition[] = [
  { id: 'original', label: '原始 / Original', multiplier: 1 },
  { id: 'service-125', label: '服务时长 / Service ×1.25', multiplier: 1.25 },
  { id: 'service-150', label: '服务时长 / Service ×1.5', multiplier: 1.5 },
];

export function defaultConfig(project: ProjectDocument): ExperimentConfig {
  const baseline = project.plans[0];
  return {
    baselinePlanId: baseline?.id ?? '',
    candidatePlanIds: project.plans.filter(plan => plan.id !== baseline?.id && plan.scenarioId === baseline?.scenarioId).slice(0, 1).map(plan => plan.id),
    seeds: [...DEFAULT_SEEDS], conditions: structuredClone(DEFAULT_CONDITIONS), maxEvents: 1000000,
  };
}

export function transformScenario(scenario: Scenario, seed: number, condition: Condition): Scenario {
  if (!Number.isFinite(condition.multiplier) || condition.multiplier <= 0 || condition.multiplier > 100) {
    throw new Error('服务倍率须 > 0 且 ≤ 100 / Service multiplier must be > 0 and ≤ 100.');
  }
  const next = structuredClone(scenario);
  next.seed = seed;
  if (condition.multiplier !== 1) {
    const global = next.assumptionOverrides.find(override => override.kind === 'service_multiplier' && override.stageKey === undefined);
    if (global?.kind === 'service_multiplier') global.factor *= condition.multiplier;
    else next.assumptionOverrides.push({ kind: 'service_multiplier', factor: condition.multiplier });
  }
  if (!scenarioSchema.safeParse(next).success) {
    throw new Error('变换后的场景超出 Schema 范围（种子或合成倍率等）/ Transformed scenario exceeds Schema limits (seed or combined multiplier).');
  }
  return next;
}

export function prepareBatch(project: ProjectDocument, config: ExperimentConfig, batchId: string): PreparedBatch {
  const parsed = projectDocumentSchema.safeParse(project);
  if (!parsed.success) throw new Error('项目未通过 Schema 校验 / Invalid project document.');
  if (!batchId.trim()) throw new Error('批次 ID 不能为空 / Batch ID is required.');
  if (config.candidatePlanIds.length < 1 || config.candidatePlanIds.length > 2) throw new Error('请选择 1–2 个候选 / Select one or two candidates.');
  const planIds = [config.baselinePlanId, ...config.candidatePlanIds];
  if (new Set(planIds).size !== planIds.length) throw new Error('方案不能重复 / Duplicate plans are not allowed.');
  const plans = planIds.map(id => parsed.data.plans.find(plan => plan.id === id));
  if (plans.some(plan => !plan)) throw new Error('方案不存在 / Unknown plan.');
  const scenarioId = plans[0]!.scenarioId;
  if (plans.some(plan => plan!.scenarioId !== scenarioId)) throw new Error('所有方案须共享同一场景 / Plans must share one scenario.');
  if (!config.seeds.length || config.seeds.some(seed => !Number.isInteger(seed) || seed < 0 || seed > 4294967295)) {
    throw new Error('种子须为 0–4294967295 的整数，且列表不能为空 / Seeds must be integers from 0 to 4294967295; the list cannot be empty.');
  }
  if (new Set(config.seeds).size !== config.seeds.length) throw new Error('种子重复，不能计为独立试验 / Duplicate seeds are not independent trials.');
  if (!config.conditions.length || config.conditions.some(condition => !idSchema.safeParse(condition.id).success || !condition.label.trim())) {
    throw new Error('请提供有效条件 ID 和名称 / Conditions need valid IDs and names.');
  }
  if (new Set(config.conditions.map(condition => condition.id)).size !== config.conditions.length) throw new Error('条件 ID 不能重复 / Duplicate condition IDs.');
  if (config.seeds.length * config.conditions.length * plans.length > MAX_JOBS) {
    throw new Error('最多 200 次运行（资源保护上限）/ At most 200 jobs (resource protection limit).');
  }
  const snapshot = structuredClone(parsed.data);
  const settings = structuredClone(config);
  settings.maxEvents ??= 1000000;
  const scenario = snapshot.scenarios.find(item => item.id === scenarioId)!;
  for (const condition of settings.conditions) {
    const transformed = transformScenario(scenario, settings.seeds[0], condition);
    for (const plan of plans) {
      const errors = [...validateRunRequest({ schemaVersion: snapshot.schemaVersion, scenario: transformed, plan: plan!, runMode: 'cutoff', maxEvents: settings.maxEvents }), ...validateGraph(transformed, plan!)]
        .filter(issue => issue.severity === 'error');
      if (errors.length) throw new Error(`无效图或运行配置 / Invalid graph or run configuration: ${plan!.id}: ${errors.map(issue => `${issue.code}: ${issue.message}`).join('; ')}`);
    }
  }
  return {
    batchId, project: snapshot, config: settings, scenarioId,
    jobs: settings.conditions.flatMap(condition => settings.seeds.flatMap(seed => planIds.map(planId => ({
      id: `${condition.id}:${seed}:${planId}`, seed, conditionId: condition.id, planId,
    })))),
  };
}
