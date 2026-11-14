import { z } from 'zod';

export const DOCUMENT_FORMAT = 'ghost-rehearsal';
export const SCHEMA_VERSION = 1;
export const PRODUCT_STATEMENT = {
  zh: '本产品用于运营流程的情景比较，不提供建筑疏散、踩踏风险、物理人群碰撞或现场安全认证。',
  en: 'This product compares operational process scenarios. It does not provide building evacuation analysis, crowd crush risk assessment, physical crowd collision modeling, or on-site safety certification.',
} as const;

export type FieldPath = (string | number)[];
export interface ValidationIssue {
  code: string;
  severity: 'error' | 'warning';
  message: string;
  entityIds: string[];
  path: FieldPath;
}

function issue(ctx: z.RefinementCtx, code: string, message: string, path: FieldPath = [], entityIds?: string[]) {
  ctx.addIssue({ code: 'custom', message, path, params: { rule: code, entityIds } });
}

function unique(values: string[], ctx: z.RefinementCtx, path: FieldPath, field?: string) {
  const seen = new Set<string>();
  values.forEach((value, index) => {
    if (seen.has(value)) {
      issue(ctx, 'duplicate_id', '同一范围内的标识不能重复', [...path, index, ...(field ? [field] : [])], [value]);
    }
    seen.add(value);
  });
}

function orderedWindows(windows: { start: number; end: number }[], ctx: z.RefinementCtx, path: FieldPath) {
  windows.forEach((window, index) => {
    if (index > 0 && (windows[index - 1].start >= window.start || windows[index - 1].end > window.start)) {
      issue(ctx, 'window_order', '时段必须按开始时刻升序排列且不得重叠', [...path, index]);
    }
  });
}

export const idSchema = z.string().regex(/^[a-z][a-z0-9_-]{0,63}$/);
export const resourceUnitIdSchema = z.string().regex(/^[a-z][a-z0-9_-]{0,63}(?::[1-9][0-9]*)?$/);
const nameSchema = z.string().refine(value => value.trim().length > 0 && [...value].length <= 100, '名称须包含非空白字符且不超过 100 个 Unicode 码点');
const descriptionSchema = z.string().refine(value => [...value].length <= 1000, '文本不得超过 1000 个 Unicode 码点');
const timeSchema = z.number().nonnegative();
const countSchema = z.number().int().nonnegative();
const quantitySchema = z.number().int().min(1);

export const provenanceSchema = z.strictObject({
  kind: z.enum(['synthetic', 'user_estimate', 'measured', 'historical']),
  source: descriptionSchema.optional(),
  notes: descriptionSchema.optional(),
});

export const windowSchema = z.strictObject({ start: timeSchema, end: timeSchema })
  .superRefine((value, ctx) => {
    if (value.end <= value.start) issue(ctx, 'invalid_window', '结束时刻必须大于开始时刻');
  });

const durationVariants = [
  z.strictObject({ kind: z.literal('fixed'), value: timeSchema, provenance: provenanceSchema }),
  z.strictObject({ kind: z.literal('uniform'), min: timeSchema, max: timeSchema, provenance: provenanceSchema })
    .superRefine((value, ctx) => {
      if (value.min > value.max) issue(ctx, 'invalid_distribution', '均匀分布须满足 min ≤ max');
    }),
  z.strictObject({ kind: z.literal('triangular'), min: timeSchema, mode: timeSchema, max: timeSchema, provenance: provenanceSchema })
    .superRefine((value, ctx) => {
      if (value.min > value.mode || value.mode > value.max) issue(ctx, 'invalid_distribution', '三角分布须满足 min ≤ mode ≤ max');
    }),
] as const;

export const transferDurationSchema = z.discriminatedUnion('kind', durationVariants);
export const serviceDurationSchema = z.discriminatedUnion('kind', [
  ...durationVariants,
  z.strictObject({ kind: z.literal('empirical'), samples: z.array(timeSchema).min(1).max(10000), provenance: provenanceSchema }),
]);

export const fullPolicySchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('block') }),
  z.strictObject({ kind: z.literal('reject') }),
  z.strictObject({ kind: z.literal('reroute'), targetNodeId: idSchema }),
]);
const redirectSchema = z.strictObject({ kind: z.literal('redirect'), targetNodeId: idSchema });
export const closePolicySchema = z.strictObject({
  queued: z.discriminatedUnion('kind', [
    z.strictObject({ kind: z.literal('serve') }),
    z.strictObject({ kind: z.literal('dismiss') }),
    redirectSchema,
  ]).optional(),
  late: z.discriminatedUnion('kind', [z.strictObject({ kind: z.literal('reject') }), redirectSchema]).optional(),
});
export const resourceRequirementSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('staff'), skillId: idSchema, quantity: quantitySchema }),
  z.strictObject({ kind: z.literal('device'), deviceTypeId: idSchema, quantity: quantitySchema }),
]);
const openWindowSchema = z.strictObject({ openAt: timeSchema, closeAt: timeSchema, provenance: provenanceSchema })
  .superRefine((value, ctx) => {
    if (value.closeAt <= value.openAt) issue(ctx, 'invalid_window', '关闭时刻必须大于开放时刻');
  });
const uniqueIdsSchema = z.array(idSchema).superRefine((value, ctx) => unique(value, ctx, []));
const nodeBase = {
  id: idSchema,
  name: nameSchema,
  description: descriptionSchema.optional(),
  layout: z.strictObject({
    x: z.number(), y: z.number(),
    width: z.number().positive().optional(), height: z.number().positive().optional(),
    collapsed: z.boolean().optional(),
  }),
};
const queueFields = {
  queueCapacity: quantitySchema.nullable().optional(),
  fullPolicy: fullPolicySchema.optional(),
};
const loopGuardSchema = z.strictObject({ maxVisits: z.number().int().min(1).max(100000), exitBranchKey: idSchema });
const conditionSchema = z.strictObject({ attributeId: idSchema, values: z.array(z.string()).min(1) });
const decisionRoutingSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('probability'),
    branches: z.array(z.strictObject({ branchKey: idSchema, weight: z.number().nonnegative() })).min(1).max(50),
  }).superRefine((value, ctx) => {
    if (value.branches.every(branch => Number.isFinite(branch.weight) && branch.weight >= 0)
      && Math.abs(value.branches.reduce((sum, branch) => sum + branch.weight, 0) - 1) > 1e-9) {
      issue(ctx, 'invalid_probability_sum', '分支权重之和必须为 1（容差 1e-9）', ['branches']);
    }
  }),
  z.strictObject({
    kind: z.literal('attribute'),
    branches: z.array(z.strictObject({ branchKey: idSchema, condition: conditionSchema.optional() })).min(1).max(50),
  }).superRefine((value, ctx) => {
    if (value.branches.filter(branch => !branch.condition).length !== 1) {
      issue(ctx, 'invalid_default_branch', '属性路由必须恰好包含一个默认分支', ['branches']);
    }
  }),
]);

export const nodeSchema = z.discriminatedUnion('type', [
  z.strictObject({ ...nodeBase, type: z.literal('entrance'), arrivalStreamIds: z.array(idSchema).min(1) })
    .superRefine((value, ctx) => unique(value.arrivalStreamIds, ctx, ['arrivalStreamIds'])),
  z.strictObject({
    ...nodeBase, ...queueFields, type: z.literal('service'), stageKey: idSchema,
    duration: serviceDurationSchema, requirements: z.array(resourceRequirementSchema),
    queueDiscipline: z.literal('fifo').optional(), openWindows: z.array(openWindowSchema),
    closePolicy: closePolicySchema.optional(), priority: z.number().int().optional(),
    maxConcurrent: quantitySchema.optional(),
  }).superRefine((value, ctx) => {
    orderedWindows(value.openWindows.map(window => ({ start: window.openAt, end: window.closeAt })), ctx, ['openWindows']);
  }),
  z.strictObject({
    ...nodeBase, type: z.literal('decision'), decisionKey: idSchema,
    routing: decisionRoutingSchema, loopGuard: loopGuardSchema.optional(),
  }).superRefine((value, ctx) => {
    unique(value.routing.branches.map(branch => branch.branchKey), ctx, ['routing', 'branches'], 'branchKey');
    if (value.loopGuard && !value.routing.branches.some(branch => branch.branchKey === value.loopGuard?.exitBranchKey)) {
      issue(ctx, 'unknown_guard_branch', '循环出口必须引用已有分支', ['loopGuard', 'exitBranchKey']);
    }
  }),
  z.strictObject({
    ...nodeBase, ...queueFields, type: z.literal('waiting_area'),
    release: z.discriminatedUnion('kind', [
      z.strictObject({ kind: z.literal('until_time'), releaseAt: timeSchema }),
      z.strictObject({ kind: z.literal('batch'), batchSize: quantitySchema, maxHoldSec: z.number().positive().optional() }),
    ]),
  }).superRefine((value, ctx) => {
    if (value.release.kind === 'batch' && value.queueCapacity != null && value.release.batchSize > value.queueCapacity) {
      issue(ctx, 'batch_exceeds_capacity', '批次人数不得大于候场容量', ['release', 'batchSize']);
    }
  }),
  z.strictObject({ ...nodeBase, type: z.literal('merge'), incomingPriority: z.array(idSchema).min(1) })
    .superRefine((value, ctx) => unique(value.incomingPriority, ctx, ['incomingPriority'])),
  z.strictObject({ ...nodeBase, type: z.literal('exit'), countsAsCompleted: z.boolean().optional() }),
  z.strictObject({ ...nodeBase, type: z.literal('subflow'), memberNodeIds: uniqueIdsSchema }),
]);

export const edgeSchema = z.strictObject({
  id: idSchema, source: idSchema, target: idSchema,
  branchKey: idSchema.optional(), transferDuration: transferDurationSchema.optional(),
});
export const skillSchema = z.strictObject({ id: idSchema, name: nameSchema });
export const staffSchema = z.strictObject({
  id: idSchema, name: nameSchema, skillIds: z.array(idSchema),
  shifts: z.array(windowSchema), unavailability: z.array(windowSchema), provenance: provenanceSchema,
}).superRefine((value, ctx) => orderedWindows(value.shifts, ctx, ['shifts']));
export const deviceTypeSchema = z.strictObject({
  id: idSchema, name: nameSchema, quantity: countSchema.max(1000), shifts: z.array(windowSchema),
  unavailability: z.array(z.strictObject({ resourceUnitId: resourceUnitIdSchema, start: timeSchema, end: timeSchema })),
  provenance: provenanceSchema,
}).superRefine((value, ctx) => {
  orderedWindows(value.shifts, ctx, ['shifts']);
  const ids = new Set(deviceUnitIds(value));
  value.unavailability.forEach((window, index) => {
    if (!ids.has(window.resourceUnitId)) issue(ctx, 'unknown_device_unit', '不可用时段引用了不存在的设备单元', ['unavailability', index, 'resourceUnitId']);
    if (window.end <= window.start) issue(ctx, 'invalid_window', '结束时刻必须大于开始时刻', ['unavailability', index]);
  });
});
export const assignmentSchema = z.strictObject({
  resourceUnitId: resourceUnitIdSchema,
  periods: z.array(z.strictObject({
    from: timeSchema, to: timeSchema.optional(), nodeIds: z.array(idSchema), handoverSec: timeSchema.optional(),
  })).min(1),
}).superRefine((value, ctx) => {
  value.periods.forEach((period, index) => {
    if (period.to !== undefined && period.to <= period.from) issue(ctx, 'invalid_window', '结束时刻必须大于开始时刻', ['periods', index]);
    const previous = value.periods[index - 1];
    if (previous && (previous.from >= period.from || previous.to === undefined || previous.to > period.from)) {
      issue(ctx, 'assignment_overlap', '排岗时间段须升序且不得重叠，无结束时刻的时段只能放在最后', ['periods', index]);
    }
  });
});

export const planSchema = z.strictObject({
  id: idSchema, name: nameSchema, description: descriptionSchema.optional(), notes: descriptionSchema.optional(),
  scenarioId: idSchema, sourcePlanId: idSchema.optional(),
  graph: z.strictObject({ nodes: z.array(nodeSchema), edges: z.array(edgeSchema) }),
  skills: z.array(skillSchema), staff: z.array(staffSchema), deviceTypes: z.array(deviceTypeSchema),
  assignments: z.array(assignmentSchema),
  layout: z.strictObject({
    viewport: z.strictObject({ x: z.number(), y: z.number(), zoom: z.number().min(0.25).max(4) }).optional(),
    groups: z.array(z.strictObject({ id: idSchema, name: nameSchema, nodeIds: z.array(idSchema) })).optional(),
  }).optional(),
}).superRefine((value, ctx) => {
  for (const field of ['nodes', 'edges'] as const) unique(value.graph[field].map(entity => entity.id), ctx, ['graph', field], 'id');
  for (const field of ['skills', 'staff', 'deviceTypes'] as const) unique(value[field].map(entity => entity.id), ctx, [field], 'id');
  unique(value.assignments.map(entity => entity.resourceUnitId), ctx, ['assignments'], 'resourceUnitId');
});

export const attributeSchema = z.strictObject({ id: idSchema, name: nameSchema, values: z.array(z.string()).min(1) });
const attributeValuesSchema = z.record(idSchema, z.string());
const attributeDistributionSchema = z.strictObject({
  values: z.array(z.strictObject({ value: z.string(), probability: z.number().nonnegative() })),
  provenance: provenanceSchema,
}).superRefine((value, ctx) => {
  unique(value.values.map(entry => entry.value), ctx, ['values'], 'value');
  if (value.values.every(entry => Number.isFinite(entry.probability) && entry.probability >= 0)
    && Math.abs(value.values.reduce((sum, entry) => sum + entry.probability, 0) - 1) > 1e-9) {
    issue(ctx, 'invalid_probability_sum', '属性概率之和必须为 1（容差 1e-9）', ['values']);
  }
});
const generatedArrivalFields = {
  attributeDistributions: z.record(idSchema, attributeDistributionSchema),
};
const arrivalBase = { id: idSchema, name: nameSchema.optional(), provenance: provenanceSchema };
export const arrivalStreamSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    ...arrivalBase, ...generatedArrivalFields, kind: z.literal('total_in_window'),
    count: countSchema, start: timeSchema, end: timeSchema, spacing: z.enum(['even', 'random']),
  }),
  z.strictObject({
    ...arrivalBase, ...generatedArrivalFields, kind: z.literal('preset_profile'), count: countSchema,
    start: timeSchema, end: timeSchema,
    profile: z.discriminatedUnion('kind', [
      z.strictObject({ kind: z.literal('uniform') }),
      z.strictObject({ kind: z.literal('early_peak') }),
      z.strictObject({ kind: z.literal('late_peak') }),
      z.strictObject({ kind: z.literal('peak_at'), peakAt: timeSchema }),
    ]),
  }),
  z.strictObject({
    ...arrivalBase, ...generatedArrivalFields, kind: z.literal('bucketed'),
    buckets: z.array(z.strictObject({ start: timeSchema, end: timeSchema, count: countSchema })),
  }),
  z.strictObject({
    ...arrivalBase, kind: z.literal('records'),
    records: z.array(z.strictObject({ id: idSchema, arrivalTime: timeSchema, attributes: attributeValuesSchema })),
  }),
]).superRefine((value, ctx) => {
  if (value.kind === 'records') unique(value.records.map(record => record.id), ctx, ['records'], 'id');
  if (value.kind === 'total_in_window' || value.kind === 'preset_profile') {
    if (value.end <= value.start) issue(ctx, 'invalid_window', '到达范围的结束时刻必须大于开始时刻', ['end']);
    if (value.kind === 'preset_profile' && value.profile.kind === 'peak_at'
      && (value.profile.peakAt < value.start || value.profile.peakAt >= value.end)) {
      issue(ctx, 'peak_outside_window', '峰值时刻必须位于到达范围内', ['profile', 'peakAt']);
    }
  }
  if (value.kind === 'bucketed') {
    value.buckets.forEach((bucket, index) => {
      if (bucket.end <= bucket.start) issue(ctx, 'invalid_window', '到达时间段的结束时刻必须大于开始时刻', ['buckets', index, 'end']);
      value.buckets.slice(0, index).forEach(previous => {
        if (bucket.start < previous.end && previous.start < bucket.end) {
          issue(ctx, 'bucket_overlap', '到达时间段不得重叠', ['buckets', index]);
        }
      });
    });
  }
});

export const assumptionOverrideSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('service_multiplier'), factor: z.number().positive().max(100), stageKey: idSchema.optional() }),
  z.strictObject({
    kind: z.literal('resource_interruption'),
    resource: z.discriminatedUnion('kind', [
      z.strictObject({ kind: z.literal('staff'), id: idSchema }),
      z.strictObject({ kind: z.literal('device_type'), id: idSchema, quantity: z.number().int().min(1).max(1000) }),
    ]),
    window: windowSchema,
  }),
]);

export const scenarioSchema = z.strictObject({
  id: idSchema, name: nameSchema.optional(), description: descriptionSchema.optional(), notes: descriptionSchema.optional(),
  sourceScenarioId: idSchema.optional(), seed: z.number().int().min(0).max(4294967295),
  observationCutoff: z.number().positive(), horizon: timeSchema,
  startClock: z.string().regex(/^(?:[01][0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  attributes: z.array(attributeSchema), arrivalStreams: z.array(arrivalStreamSchema),
  assumptionOverrides: z.array(assumptionOverrideSchema),
  statistics: z.strictObject({ bucketSec: z.number().positive().optional(), bottleneckThreshold: quantitySchema.optional() }).optional(),
}).superRefine((value, ctx) => {
  if (value.horizon < value.observationCutoff) issue(ctx, 'horizon_before_cutoff', '运行上限不能早于观察截止时刻', ['horizon']);
  unique(value.attributes.map(attribute => attribute.id), ctx, ['attributes'], 'id');
  unique(value.arrivalStreams.map(stream => stream.id), ctx, ['arrivalStreams'], 'id');
  const attributes = new Map(value.attributes.map(attribute => [attribute.id, attribute]));
  value.arrivalStreams.forEach((stream, streamIndex) => {
    const checkValues = (mapping: Record<string, unknown>, path: FieldPath, distribution: boolean) => {
      attributes.forEach((attribute, id) => {
        if (!Object.hasOwn(mapping, id)) issue(ctx, 'missing_attribute', '缺少参与者属性或属性分布', [...path, id], [stream.id, id]);
      });
      for (const [id, item] of Object.entries(mapping)) {
        const attribute = attributes.get(id);
        if (!attribute) {
          issue(ctx, 'unknown_attribute', '属性未在场景中定义', [...path, id], [stream.id, id]);
        } else if (distribution) {
          const entries = (item as z.infer<typeof attributeDistributionSchema>).values;
          entries.forEach((entry, index) => {
            if (!attribute.values.includes(entry.value)) issue(ctx, 'invalid_attribute_value', '取值不属于属性的取值集合', [...path, id, 'values', index, 'value'], [stream.id, id]);
          });
        } else if (!attribute.values.includes(item as string)) {
          issue(ctx, 'invalid_attribute_value', '取值不属于属性的取值集合', [...path, id], [stream.id, id]);
        }
      }
    };
    const path = ['arrivalStreams', streamIndex];
    if (stream.kind === 'records') {
      stream.records.forEach((record, index) => checkValues(record.attributes, [...path, 'records', index, 'attributes'], false));
    } else {
      checkValues(stream.attributeDistributions, [...path, 'attributeDistributions'], true);
    }
  });
  const multipliers = new Set<string>();
  value.assumptionOverrides.forEach((override, index) => {
    if (override.kind !== 'service_multiplier') return;
    const key = override.stageKey ?? '';
    if (multipliers.has(key)) issue(ctx, 'duplicate_multiplier', '同一工序或全局的服务时长系数只能定义一次', ['assumptionOverrides', index], [value.id]);
    multipliers.add(key);
  });
});

export const participantSchema = z.strictObject({
  id: z.string().regex(/^[a-z][a-z0-9_-]{0,63}:(?:[1-9][0-9]*|[a-z][a-z0-9_-]{0,63})$/),
  arrivalStreamId: idSchema, arrivalTime: timeSchema, attributes: attributeValuesSchema,
});
export const runRequestSchema = z.strictObject({
  schemaVersion: z.literal(SCHEMA_VERSION), scenario: scenarioSchema, plan: planSchema,
  runMode: z.enum(['cutoff', 'run_to_completion']),
  maxSteps: z.number().int().min(1).max(100000).optional(),
  maxEvents: z.number().int().min(1).max(10000000).optional(),
});
export const projectDocumentSchema = z.strictObject({
  format: z.literal(DOCUMENT_FORMAT), schemaVersion: z.literal(SCHEMA_VERSION),
  scenarios: z.array(scenarioSchema).min(1), plans: z.array(planSchema).min(1),
}).superRefine((value, ctx) => {
  unique(value.scenarios.map(scenario => scenario.id), ctx, ['scenarios'], 'id');
  unique(value.plans.map(plan => plan.id), ctx, ['plans'], 'id');
  const scenarioIds = new Set(value.scenarios.map(scenario => scenario.id));
  value.plans.forEach((plan, index) => {
    if (!scenarioIds.has(plan.scenarioId)) issue(ctx, 'unknown_scenario', '方案引用的场景不存在', ['plans', index, 'scenarioId'], [plan.id, plan.scenarioId]);
  });
});

export type Node = z.infer<typeof nodeSchema>;
export type Edge = z.infer<typeof edgeSchema>;
export type ServiceNode = Extract<Node, { type: 'service' }>;
export type ResourceRequirement = z.infer<typeof resourceRequirementSchema>;
export type Staff = z.infer<typeof staffSchema>;
export type DeviceType = z.infer<typeof deviceTypeSchema>;
export type Assignment = z.infer<typeof assignmentSchema>;
export type Plan = z.infer<typeof planSchema>;
export type Scenario = z.infer<typeof scenarioSchema>;
export type Participant = z.infer<typeof participantSchema>;
export type RunRequest = z.infer<typeof runRequestSchema>;
export type ProjectDocument = z.infer<typeof projectDocumentSchema>;

export function deviceUnitIds(device: { id: string; quantity: number }): string[] {
  return Array.from({ length: device.quantity }, (_, index) => `${device.id}:${index + 1}`);
}
