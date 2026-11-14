import { describe, expect, it } from 'vitest';
import { performance } from 'node:perf_hooks';
import example from '../examples/open-house.json';
import {
  deviceUnitIds, duplicatePlan, flattenSubflows, nodeSchema, planSchema, projectDocumentSchema,
  validateDocument, validateGraph, validatePlan, validateRunRequest, validateScenario,
} from '../src/schemas';
import type { Node, Plan, Scenario, ServiceNode } from '../src/schemas';

function fixture() {
  const document = projectDocumentSchema.parse(structuredClone(example));
  return { document, scenario: document.scenarios[0], plan: document.plans[0] };
}

function service(plan: Plan, id = 'checkin'): ServiceNode {
  return plan.graph.nodes.find(node => node.id === id) as ServiceNode;
}

function codes(scenario: Scenario, plan: Plan) {
  return validateGraph(scenario, plan).map(issue => issue.code);
}

function deepFreeze(value: unknown) {
  if (value && typeof value === 'object') {
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
  }
}

describe('结构校验与输入契约', () => {
  it('在无 DOM 的 Node 环境执行', () => {
    expect('window' in globalThis).toBe(false);
    expect('document' in globalThis).toBe(false);
  });

  it('示例文档及两个方案同时通过结构和图校验', () => {
    const { document, scenario } = fixture();
    expect(validateDocument(document)).toEqual([]);
    for (const plan of document.plans) {
      expect(validateGraph(scenario, plan)).toEqual([]);
      expect(validateRunRequest({ schemaVersion: 1, scenario, plan, runMode: 'cutoff' })).toEqual([]);
    }
  });

  it('未知字段逐项报告且保留完整下标', () => {
    const { document } = fixture();
    Object.assign(document.plans[0].graph.nodes[0], { selected: true, dragging: false });
    const issues = validateDocument(document);
    expect(issues.map(issue => issue.path)).toEqual([
      ['plans', 0, 'graph', 'nodes', 0, 'selected'], ['plans', 0, 'graph', 'nodes', 0, 'dragging'],
    ]);
    expect(issues.every(issue => issue.code === 'unknown_field' && issue.entityIds.includes('main') && /[\u4e00-\u9fff]/.test(issue.message))).toBe(true);
  });

  it.each([null, 7, {}, { type: 'Service' }, { type: 'unknown', id: 'bad', duration: -1 }])('非法节点只报告类型问题：%j', value => {
    const result = nodeSchema.safeParse(value);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues).toHaveLength(1);
  });

  it.each([-1, NaN, Infinity, -Infinity])('拒绝非法时间 %s', time => {
    const { scenario } = fixture();
    scenario.observationCutoff = time;
    expect(validateScenario(scenario).some(issue => issue.path[0] === 'observationCutoff')).toBe(true);
  });

  it.each(['Upper', 'a.b', '1first', 'a'.repeat(65), ''])('拒绝非法 ID %s', id => {
    const { plan } = fixture();
    plan.id = id;
    expect(validatePlan(plan).some(issue => issue.path.join('.') === 'id')).toBe(true);
  });

  it('名称按 Unicode 码点计数且保留缺省字段', () => {
    const { plan } = fixture();
    plan.name = '👻'.repeat(100);
    expect(validatePlan(plan)).toEqual([]);
    expect(planSchema.parse(plan)).toEqual(plan);
    plan.name += '👻';
    expect(validatePlan(plan).some(issue => issue.path.join('.') === 'name')).toBe(true);
    plan.name = '  ';
    expect(validatePlan(plan)).not.toEqual([]);
  });

  it('文档内 ID 去重，跨方案内部 ID 可以复用', () => {
    const { document } = fixture();
    expect(validateDocument(document)).toEqual([]);
    document.plans[1].id = document.plans[0].id;
    document.plans[0].graph.nodes.push(structuredClone(document.plans[0].graph.nodes[0]));
    const issues = validateDocument(document).filter(issue => issue.code === 'duplicate_id');
    expect(issues.map(issue => issue.path)).toContainEqual(['plans', 1, 'id']);
    expect(issues.map(issue => issue.path)).toContainEqual(['plans', 0, 'graph', 'nodes', 15, 'id']);
  });

  it('Scenario 引用检查不把来源 ID 当作有效性约束', () => {
    const { document } = fixture();
    document.plans[0].sourcePlanId = 'missing-origin';
    document.scenarios[0].sourceScenarioId = 'missing-origin';
    expect(validateDocument(document)).toEqual([]);
    document.plans[0].scenarioId = 'missing';
    expect(validateDocument(document)).toContainEqual(expect.objectContaining({ code: 'unknown_scenario', entityIds: ['baseline', 'missing'], path: ['plans', 0, 'scenarioId'] }));
  });

  it('拒绝场景和方案条件混放', () => {
    const { plan, scenario } = fixture();
    expect(validatePlan({ ...plan, seed: 42 }).map(issue => issue.code)).toContain('unknown_field');
    expect(validateScenario({ ...scenario, staff: [] }).map(issue => issue.code)).toContain('unknown_field');
  });

  it('检查设备派生 ID、设备数量减少后的悬空引用', () => {
    const { plan } = fixture();
    expect(deviceUnitIds({ id: 'scanner', quantity: 2 })).toEqual(['scanner:1', 'scanner:2']);
    expect(deviceUnitIds({ id: 'scanner', quantity: 0 })).toEqual([]);
    plan.deviceTypes[0].unavailability.push({ resourceUnitId: 'scanner:2', start: 10, end: 20 });
    expect(validatePlan(plan).map(issue => issue.code)).toContain('unknown_device_unit');
  });

  it('区间相邻有效，重叠或倒序无效，不可用区间可以重叠', () => {
    const { plan } = fixture();
    plan.staff[0].shifts = [{ start: 0, end: 10 }, { start: 10, end: 20 }];
    plan.staff[0].unavailability = [{ start: 2, end: 12 }, { start: 5, end: 15 }];
    expect(validatePlan(plan)).toEqual([]);
    plan.staff[0].shifts[1].start = 9;
    expect(validatePlan(plan).map(issue => issue.code)).toContain('window_order');
    plan.assignments[0].periods.push({ from: 20, nodeIds: [] });
    expect(validatePlan(plan).map(issue => issue.code)).toContain('assignment_overlap');
  });

  it('检查概率、默认分支和循环出口', () => {
    const { plan } = fixture();
    const decision = plan.graph.nodes.find(node => node.id === 'review');
    if (decision?.type !== 'decision' || decision.routing.kind !== 'probability') throw Error('fixture');
    decision.routing.branches[0].weight = 0.5;
    decision.loopGuard!.exitBranchKey = 'missing';
    expect(validatePlan(plan).map(issue => issue.code)).toEqual(expect.arrayContaining(['invalid_probability_sum', 'unknown_guard_branch']));
    decision.routing = { kind: 'attribute', branches: [{ branchKey: 'a' }, { branchKey: 'b' }] };
    expect(validatePlan(plan).map(issue => issue.code)).toContain('invalid_default_branch');
  });

  it('检查候场批次上限；无超时只警告', () => {
    const { plan } = fixture();
    const node = plan.graph.nodes.find(node => node.id === 'holding');
    if (node?.type !== 'waiting_area') throw Error('fixture');
    node.release = { kind: 'batch', batchSize: 2 };
    expect(validatePlan(plan)).toContainEqual(expect.objectContaining({ severity: 'warning', code: 'batch_without_timeout' }));
    node.queueCapacity = 1;
    expect(validatePlan(plan).map(issue => issue.code)).toContain('batch_exceeds_capacity');
  });

  it('校验分布约束及显式分布的来源标签', () => {
    const { plan } = fixture();
    service(plan).duration = { kind: 'triangular', min: 10, mode: 5, max: 20, provenance: { kind: 'synthetic' } };
    expect(validatePlan(plan).map(issue => issue.code)).toContain('invalid_distribution');
    const invalid = structuredClone(plan) as unknown as { graph: { nodes: Record<string, unknown>[] } };
    invalid.graph.nodes[4].duration = { kind: 'fixed', value: 1 };
    expect(validatePlan(invalid).some(issue => issue.path.at(-1) === 'provenance')).toBe(true);
    expect(validatePlan({ ...plan, graph: { ...plan.graph, edges: [{ id: 'edge', source: 'main', target: 'intake', transferDuration: { kind: 'empirical', samples: [1], provenance: { kind: 'synthetic' } } }] } })).not.toEqual([]);
  });

  it('records 检查重复 ID、属性缺失、多余属性和非法取值', () => {
    const { scenario } = fixture();
    scenario.arrivalStreams = [{ id: 'records', kind: 'records', provenance: { kind: 'historical' }, records: [
      { id: 'one', arrivalTime: 0, attributes: { ticket: 'regular', visit: 'full' } },
      { id: 'one', arrivalTime: 1, attributes: { ticket: 'invalid', extra: 'value' } },
    ] }];
    expect(validateScenario(scenario).map(issue => issue.code)).toEqual(expect.arrayContaining(['duplicate_id', 'missing_attribute', 'unknown_attribute', 'invalid_attribute_value']));
  });

  it('概率分布、到达范围、桶重叠和峰值均受校验', () => {
    const { scenario } = fixture();
    const stream = scenario.arrivalStreams[0];
    if (stream.kind !== 'total_in_window') throw Error('fixture');
    stream.attributeDistributions.ticket.values[0].probability = 2;
    expect(validateScenario(scenario).map(issue => issue.code)).toContain('invalid_probability_sum');
    scenario.arrivalStreams = [{ id: 'bucket', kind: 'bucketed', provenance: { kind: 'synthetic' }, attributeDistributions: stream.attributeDistributions,
      buckets: [{ start: 0, end: 10, count: 1 }, { start: 5, end: 15, count: 1 }] }];
    expect(validateScenario(scenario).map(issue => issue.code)).toContain('bucket_overlap');
    scenario.arrivalStreams = [{ id: 'profile', kind: 'preset_profile', provenance: { kind: 'synthetic' }, attributeDistributions: stream.attributeDistributions,
      count: 1, start: 0, end: 10, profile: { kind: 'peak_at', peakAt: 10 } }];
    expect(validateScenario(scenario).map(issue => issue.code)).toContain('peak_outside_window');
  });

  it('拒绝重复系数和非法运行请求，不预设 Run_Mode', () => {
    const { scenario, plan } = fixture();
    scenario.assumptionOverrides = [{ kind: 'service_multiplier', factor: 2 }, { kind: 'service_multiplier', factor: 3 }];
    expect(validateScenario(scenario).map(issue => issue.code)).toContain('duplicate_multiplier');
    const issues = validateRunRequest({ schemaVersion: 2, scenario, plan, maxSteps: 0, maxEvents: 10000001 });
    expect(issues.map(issue => issue.path[0])).toEqual(expect.arrayContaining(['schemaVersion', 'runMode', 'maxSteps', 'maxEvents']));
  });
});

describe('图语义、资源与终止检查', () => {
  it('不修改输入，深度相等输入返回相同顺序和内容', () => {
    const { scenario, plan } = fixture();
    plan.graph.edges[0].source = 'missing';
    const before = structuredClone({ scenario, plan });
    deepFreeze(scenario); deepFreeze(plan);
    const issues = validateGraph(scenario, plan);
    expect(issues).toEqual(validateGraph(before.scenario, before.plan));
    expect({ scenario, plan }).toEqual(before);
    expect(issues.every(issue => issue.code && /[\u4e00-\u9fff]/.test(issue.message) && ['scenario', 'plan'].includes(String(issue.path[0])))).toBe(true);
  });

  it.each([undefined, null, 7, [], {}, { graph: { nodes: [null], edges: [] } }])('非法结构不会令图校验抛异常：%j', input => {
    const { scenario, plan } = fixture();
    expect(() => validateGraph(scenario, input)).not.toThrow();
    expect(() => validateGraph(input, plan)).not.toThrow();
  });

  it('空图报告缺入口与缺出口；无正常出口只警告', () => {
    const { scenario, plan } = fixture();
    const empty = { ...plan, graph: { nodes: [], edges: [] }, assignments: [] };
    expect(codes(scenario, empty)).toEqual(expect.arrayContaining(['missing_entrance', 'missing_exit']));
    plan.graph.nodes.forEach(node => { if (node.type === 'exit') node.countsAsCompleted = false; });
    expect(validateGraph(scenario, plan)).toContainEqual(expect.objectContaining({ code: 'no_completion_exit', severity: 'warning' }));
  });

  it('保留原始下标，并且子流程端点不重复报不存在', () => {
    const { scenario, plan } = fixture();
    plan.graph.nodes.unshift(plan.graph.nodes.pop()!);
    plan.graph.edges[0].source = 'verification';
    const issues = validateGraph(scenario, plan);
    expect(issues.filter(issue => issue.entityIds.includes('main-intake'))).toEqual([
      expect.objectContaining({ code: 'subflow_endpoint', path: ['plan', 'graph', 'edges', 0, 'source'] }),
      expect.objectContaining({ code: 'unknown_merge_priority' }),
    ]);
    expect(issues).toContainEqual(expect.objectContaining({ code: 'outgoing_count', path: ['plan', 'graph', 'nodes', 1] }));
  });

  it('子流程重复成员归属、包含环和不存在成员分别报告', () => {
    const { scenario, plan } = fixture();
    const original = plan.graph.nodes.find(node => node.type === 'subflow')!;
    if (original.type !== 'subflow') throw Error('fixture');
    original.memberNodeIds.push('nested', 'missing');
    plan.graph.nodes.push({ id: 'nested', type: 'subflow', name: '嵌套', layout: { x: 0, y: 0 }, memberNodeIds: ['verification', 'checkin'] });
    const issues = validateGraph(scenario, plan);
    expect(issues.map(issue => issue.code)).toEqual(expect.arrayContaining(['multiple_subflow_parents', 'subflow_cycle', 'unknown_subflow_member']));
    expect(issues.find(issue => issue.code === 'subflow_cycle')?.entityIds).toEqual(['nested', 'verification']);
  });

  it('有保护的复检环通过，移除保护后报告整个强连通分量', () => {
    const { scenario, plan } = fixture();
    expect(codes(scenario, plan)).not.toContain('unterminated_loop');
    const node = plan.graph.nodes.find(node => node.id === 'review');
    if (node?.type !== 'decision') throw Error('fixture');
    delete node.loopGuard;
    expect(validateGraph(scenario, plan)).toContainEqual(expect.objectContaining({ code: 'unterminated_loop', entityIds: ['recheck', 'review'] }));
  });

  it('满员与关闭转送参与终止检查，入口不可达的环仍报告', () => {
    const { scenario, plan } = fixture();
    service(plan).fullPolicy = { kind: 'reroute', targetNodeId: 'packing' };
    service(plan, 'packing').closePolicy = { late: { kind: 'redirect', targetNodeId: 'checkin' } };
    expect(codes(scenario, plan)).toContain('unterminated_loop');
    plan.graph.nodes.push({ id: 'orphan-a', type: 'waiting_area', name: '甲', layout: { x: 0, y: 0 }, release: { kind: 'until_time', releaseAt: 0 } },
      { id: 'orphan-b', type: 'waiting_area', name: '乙', layout: { x: 0, y: 0 }, release: { kind: 'until_time', releaseAt: 0 } });
    plan.graph.edges.push({ id: 'ab', source: 'orphan-a', target: 'orphan-b' }, { id: 'ba', source: 'orphan-b', target: 'orphan-a' });
    expect(validateGraph(scenario, plan)).toContainEqual(expect.objectContaining({ code: 'unterminated_loop', entityIds: ['orphan-a', 'orphan-b'] }));
    expect(codes(scenario, plan)).toContain('unreachable_node');
  });

  it('无出口路径不能通过，转送边也计入可达性', () => {
    const { scenario, plan } = fixture();
    plan.graph.edges = plan.graph.edges.filter(edge => edge.id !== 'orientation-finish');
    expect(codes(scenario, plan)).toContain('no_exit_path');
    service(plan, 'orientation').fullPolicy = { kind: 'reroute', targetNodeId: 'finish' };
    expect(codes(scenario, plan)).not.toContain('no_exit_path');
  });

  it('到达流必须恰好绑定一次，即使人数为零', () => {
    const { scenario, plan } = fixture();
    const stream = scenario.arrivalStreams[0];
    if (stream.kind === 'total_in_window') stream.count = 0;
    const side = plan.graph.nodes.find(node => node.id === 'side');
    if (side?.type !== 'entrance') throw Error('fixture');
    side.arrivalStreamIds.push('main-stream', 'missing');
    expect(codes(scenario, plan)).toEqual(expect.arrayContaining(['arrival_binding_count', 'unknown_arrival_stream']));
  });

  it('检查分支边、属性条件、汇合入边以及非法转送', () => {
    const { scenario, plan } = fixture();
    const node = plan.graph.nodes.find(node => node.id === 'tickets');
    if (node?.type !== 'decision' || node.routing.kind !== 'attribute') throw Error('fixture');
    node.routing.branches[0].condition = { attributeId: 'missing', values: ['x'] };
    plan.graph.edges.find(edge => edge.id === 'vip-checked')!.branchKey = 'missing';
    service(plan).closePolicy = { queued: { kind: 'redirect', targetNodeId: 'main' }, late: { kind: 'redirect', targetNodeId: 'checkin' } };
    expect(codes(scenario, plan)).toEqual(expect.arrayContaining(['unknown_route_attribute', 'branch_edge_count', 'unknown_edge_branch', 'redirect_to_entrance', 'redirect_to_self']));
  });

  it('资源不足检查考虑资格，开放重叠警告考虑不可用和排岗', () => {
    const { scenario, plan } = fixture();
    service(plan).requirements[0].quantity = 3;
    expect(codes(scenario, plan)).toContain('insufficient_resources');
    service(plan).requirements[0].quantity = 1;
    plan.deviceTypes[0].shifts = [{ start: 2000, end: 7200 }];
    expect(validateGraph(scenario, plan)).toContainEqual(expect.objectContaining({ code: 'no_resource_overlap', severity: 'warning', entityIds: ['checkin'] }));
  });

  it('多技能资源不会被重复计数，但可重配时不会误报', () => {
    const { scenario, plan } = fixture();
    service(plan, 'packing').requirements = [{ kind: 'staff', skillId: 'check', quantity: 1 }, { kind: 'staff', skillId: 'pack', quantity: 1 }];
    plan.staff = [plan.staff.find(staff => staff.id === 'floater')!];
    plan.assignments = [];
    expect(validateGraph(scenario, plan)).toContainEqual(expect.objectContaining({ code: 'joint_resource_shortage', entityIds: ['packing'] }));
    plan.staff.push({ id: 'pack-only', name: '发放人员', skillIds: ['pack'], shifts: [{ start: 0, end: 7200 }], unavailability: [], provenance: { kind: 'synthetic' } });
    expect(validateGraph(scenario, plan).filter(issue => issue.code === 'joint_resource_shortage' && issue.entityIds.includes('packing'))).toEqual([]);
  });

  it('资源引用与无效排岗、部分资源中断分别定位', () => {
    const { scenario, plan } = fixture();
    plan.staff[0].skillIds.push('missing-skill');
    plan.assignments[0].periods[0].nodeIds.push('packing', 'verification', 'finish');
    scenario.assumptionOverrides.push({ kind: 'resource_interruption', resource: { kind: 'device_type', id: 'scanner', quantity: 2 }, window: { start: 1, end: 2 } });
    expect(codes(scenario, plan)).toEqual(expect.arrayContaining(['unknown_staff_skill', 'assignment_skill_mismatch', 'subflow_reference', 'invalid_assignment_node', 'interruption_quantity_exceeded']));
  });

  it('200 节点、400 边、100 资源的后十次校验中位数不超过 200 ms', () => {
    const { scenario, plan } = fixture();
    plan.graph.nodes = Array.from({ length: 200 }, (_, index): Node => index === 0
      ? { id: 'n-0', type: 'entrance', name: '入口', layout: { x: 0, y: 0 }, arrivalStreamIds: scenario.arrivalStreams.map(stream => stream.id) }
      : index === 199 ? { id: 'n-199', type: 'exit', name: '出口', layout: { x: 0, y: 0 } }
        : { id: `n-${index}`, type: 'service', name: '服务', layout: { x: index, y: 0 }, stageKey: 'stage', duration: { kind: 'fixed', value: 1, provenance: { kind: 'synthetic' } }, requirements: [{ kind: 'staff', skillId: 'check', quantity: 1 }], openWindows: [] });
    plan.graph.edges = Array.from({ length: 400 }, (_, index) => ({ id: `e-${index}`, source: `n-${index % 199}`, target: `n-${index % 199 + 1}` }));
    plan.staff = Array.from({ length: 100 }, (_, index) => ({ id: `staff-${index}`, name: '人员', skillIds: ['check'], shifts: [{ start: 0, end: 7200 }], unavailability: [], provenance: { kind: 'synthetic' as const } }));
    plan.deviceTypes = []; plan.assignments = [];
    expect(validatePlan(plan)).toEqual([]);
    const times = Array.from({ length: 11 }, () => { const start = performance.now(); validateGraph(scenario, plan); return performance.now() - start; });
    const measured = times.slice(1).sort((a, b) => a - b);
    const median = (measured[4] + measured[5]) / 2;
    console.info(`Graph_Validator: 200 nodes / 400 edges / 100 resources, median ${median.toFixed(2)} ms`);
    expect(median).toBeLessThanOrEqual(200);
  });
});

describe('方案复制与子流程展开', () => {
  it('复制保持内部标识、缺省字段、列表顺序且不共享任何对象', () => {
    const { plan, scenario } = fixture();
    const before = structuredClone(plan);
    deepFreeze(plan);
    const result = duplicatePlan(plan, new Set(['baseline-copy-1']));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.plan.id).toBe('baseline-copy-2');
    expect(result.plan.sourcePlanId).toBe(plan.id);
    expect(result.plan.name).toBe(plan.name + ' (copy)');
    expect({ ...result.plan, id: plan.id, name: plan.name, sourcePlanId: undefined }).toEqual({ ...plan, sourcePlanId: undefined });
    expect(validateGraph(scenario, result.plan)).toEqual(validateGraph(scenario, plan));
    const compareRefs = (left: unknown, right: unknown) => {
      if (left && right && typeof left === 'object' && typeof right === 'object') {
        expect(left).not.toBe(right);
        for (const key of Object.keys(left)) compareRefs((left as Record<string, unknown>)[key], (right as Record<string, unknown>)[key]);
      }
    };
    compareRefs(plan, result.plan);
    result.plan.staff[0].skillIds.push('new-skill');
    expect(plan).toEqual(before);
  });

  it('最大长度 ID、Unicode 名称与重复复制均有效且确定', () => {
    const { plan } = fixture();
    plan.id = 'a'.repeat(64); plan.name = '👻'.repeat(100); plan.sourcePlanId = 'ancestor';
    const result = duplicatePlan(plan, new Set());
    expect(result).toEqual(duplicatePlan(plan, new Set()));
    if (!result.ok) throw Error('duplicate');
    expect(result.plan.id).toHaveLength(64);
    expect([...result.plan.name]).toHaveLength(100);
    expect(result.plan.sourcePlanId).toBe(plan.id);
    expect(validatePlan(result.plan)).toEqual([]);
  });

  it('结构错误拒绝复制，图错误与 warning 不妨碍复制且保留', () => {
    const { scenario, plan } = fixture();
    expect(duplicatePlan({ ...plan, id: 'BAD' }, new Set()).ok).toBe(false);
    plan.graph.edges[0].target = 'missing';
    const result = duplicatePlan(plan, new Set());
    if (!result.ok) throw Error('duplicate');
    expect(validateGraph(scenario, result.plan)).toEqual(validateGraph(scenario, plan));
  });

  it('展开只移除分组节点，幂等且不修改输入，即使成员关系错误', () => {
    const { plan } = fixture();
    const subflow = plan.graph.nodes.find(node => node.type === 'subflow')!;
    if (subflow.type !== 'subflow') throw Error('fixture');
    subflow.memberNodeIds.push(subflow.id, 'missing');
    plan.graph.edges[0].target = subflow.id;
    const before = structuredClone(plan);
    deepFreeze(plan);
    const flattened = flattenSubflows(plan);
    expect(flattened).toEqual({ ...plan, graph: { nodes: plan.graph.nodes.filter(node => node.type !== 'subflow'), edges: plan.graph.edges } });
    expect(flattenSubflows(flattened)).toEqual(flattened);
    expect(plan).toEqual(before);
  });
});
