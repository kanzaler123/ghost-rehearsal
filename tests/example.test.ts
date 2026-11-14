import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import example from '../examples/open-house.json';
import { deviceUnitIds, flattenSubflows, PRODUCT_STATEMENT, projectDocumentSchema } from '../src/schemas';
import type { Node, Plan, ResourceRequirement } from '../src/schemas';

const document = projectDocumentSchema.parse(example);
const scenario = document.scenarios[0];
const [planA, planB] = document.plans;

function units(plan: Plan) {
  return [
    ...plan.staff.map(staff => ({ id: staff.id, skillIds: staff.skillIds, deviceTypeId: '' })),
    ...plan.deviceTypes.flatMap(device => deviceUnitIds(device).map(id => ({ id, skillIds: [] as string[], deviceTypeId: device.id }))),
  ];
}

function canServe(unit: ReturnType<typeof units>[number], requirement: ResourceRequirement) {
  return requirement.kind === 'staff' ? unit.skillIds.includes(requirement.skillId) : unit.deviceTypeId === requirement.deviceTypeId;
}

function guardedServiceLoop(node: Extract<Node, { type: 'decision' }>, plan: Plan) {
  if (!node.loopGuard || node.loopGuard.maxVisits < 2) return false;
  return plan.graph.edges.filter(edge => edge.source === node.id && edge.branchKey !== node.loopGuard!.exitBranchKey).some(edge => {
    if (node.routing.kind === 'probability' && !node.routing.branches.some(branch => branch.branchKey === edge.branchKey && branch.weight > 0)) return false;
    const pending: [string, boolean][] = [[edge.target, false]];
    const visited = new Set<string>();
    while (pending.length) {
      const [id, served] = pending.pop()!;
      if (id === node.id && served) return true;
      const seenService = served || plan.graph.nodes.some(candidate => candidate.id === id && candidate.type === 'service');
      const key = `${id}:${seenService}`;
      if (visited.has(key)) continue;
      visited.add(key);
      plan.graph.edges.filter(next => next.source === id).forEach(next => pending.push([next.target, seenService]));
    }
    return false;
  });
}

it('44.1 / 44.12：一个共享场景、两个方案和明确的复制来源', () => {
  expect(document.scenarios).toHaveLength(1);
  expect(document.plans).toHaveLength(2);
  expect(document.schemaVersion).toBe(1);
  expect(document.plans.every(plan => plan.scenarioId === scenario.id)).toBe(true);
  expect(Object.hasOwn(planA, 'sourcePlanId')).toBe(false);
  expect(planB.sourcePlanId).toBe(planA.id);
});

describe.each(document.plans)('示例覆盖：$id', plan => {
  const { nodes, edges } = flattenSubflows(plan).graph;
  const services = nodes.filter(node => node.type === 'service');
  const decisions = nodes.filter(node => node.type === 'decision');

  it('44.2(a)：多个入口绑定互不重叠的到达流', () => {
    const entrances = nodes.filter(node => node.type === 'entrance');
    expect(entrances.length).toBeGreaterThanOrEqual(2);
    const streams = entrances.flatMap(node => node.arrivalStreamIds);
    expect(new Set(streams).size).toBe(streams.length);
  });
  it('44.2(b,c)：属性分流和至少两个正权重的概率分流', () => {
    expect(decisions.some(node => node.routing.kind === 'attribute' && node.routing.branches.some(branch => branch.condition))).toBe(true);
    expect(decisions.some(node => node.routing.kind === 'probability' && node.routing.branches.filter(branch => branch.weight > 0).length >= 2)).toBe(true);
  });
  it('44.2(d,e,f)：三个工序、候场区、多入边汇合', () => {
    expect(new Set(services.map(node => node.stageKey)).size).toBeGreaterThanOrEqual(3);
    expect(nodes.some(node => node.type === 'waiting_area')).toBe(true);
    expect(nodes.some(node => node.type === 'merge' && edges.filter(edge => edge.target === node.id).length >= 2)).toBe(true);
  });
  it('44.2(g,h)：经过服务的受保护循环、正常与中途离开出口', () => {
    expect(decisions.some(node => guardedServiceLoop(node, plan))).toBe(true);
    expect(nodes.some(node => node.type === 'exit' && node.countsAsCompleted !== false)).toBe(true);
    expect(nodes.some(node => node.type === 'exit' && node.countsAsCompleted === false)).toBe(true);
  });
  it('44.3(a)：同一资源可服务多个节点，排岗允许共享', () => {
    expect(units(plan).some(unit => {
      const eligible = services.filter(node => node.requirements.some(requirement => canServe(unit, requirement))).map(node => node.id);
      const assignment = plan.assignments.find(item => item.resourceUnitId === unit.id);
      return eligible.length >= 2 && (!assignment || assignment.periods.some(period => eligible.filter(id => period.nodeIds.includes(id)).length >= 2));
    })).toBe(true);
  });
  it('44.3(b,c)：人员设备组合需求、实际引用的多技能人员', () => {
    expect(services.some(node => node.requirements.some(item => item.kind === 'staff') && node.requirements.some(item => item.kind === 'device'))).toBe(true);
    expect(plan.staff.some(staff => new Set(staff.skillIds.filter(skill => services.some(node => node.requirements.some(item => item.kind === 'staff' && item.skillId === skill)))).size >= 2)).toBe(true);
  });
  it('44.3(d,e)：提前关闭并显式处理、有限容量和满员改道或拒绝', () => {
    expect(services.some(node => node.openWindows.length && node.openWindows.at(-1)!.closeAt < scenario.observationCutoff && Object.hasOwn(node, 'closePolicy'))).toBe(true);
    expect(nodes.some(node => (node.type === 'service' || node.type === 'waiting_area') && Number.isInteger(node.queueCapacity)
      && ['reroute', 'reject'].includes(node.fullPolicy?.kind ?? 'block'))).toBe(true);
  });
  it('44.10(a)：观察窗口内真实调岗、交接时长及不同岗位集合', () => {
    expect(plan.staff.some(staff => plan.assignments.find(item => item.resourceUnitId === staff.id)?.periods.some((period, index, periods) => index > 0
      && (period.handoverSec ?? 0) > 0 && period.from < scenario.observationCutoff
      && staff.shifts.some(shift => shift.start <= period.from && period.from < shift.end)
      && period.nodeIds.length > 0 && JSON.stringify([...new Set(period.nodeIds)].sort()) !== JSON.stringify([...new Set(periods[index - 1].nodeIds)].sort())))).toBe(true);
  });
  it('44.10(b)：不可用时段与班次在观察窗口内相交', () => {
    expect([...plan.staff, ...plan.deviceTypes].some(resource => resource.unavailability.some(window => window.start < scenario.observationCutoff
      && resource.shifts.some(shift => Math.min(window.end, shift.end) > Math.max(window.start, shift.start))))).toBe(true);
  });
});

it('44.4(a,b,c)：多属性、多到达流和不同的观察与完成窗口', () => {
  expect(scenario.attributes.length).toBeGreaterThanOrEqual(2);
  expect(scenario.attributes.every(attribute => new Set(attribute.values).size >= 2)).toBe(true);
  expect(scenario.arrivalStreams.length).toBeGreaterThanOrEqual(2);
  expect(scenario.arrivalStreams.every(stream => (stream.kind === 'records' ? stream.records.length : stream.kind === 'bucketed' ? stream.buckets.reduce((sum, bucket) => sum + bucket.count, 0) : stream.count) >= 1)).toBe(true);
  expect(scenario.observationCutoff).toBeLessThan(scenario.horizon);
});

it('44.5：同 ID 节点保留类型、工序与路由抽取标识', () => {
  for (const node of planA.graph.nodes) {
    const other = planB.graph.nodes.find(candidate => candidate.id === node.id);
    if (!other) continue;
    expect(other.type, node.id).toBe(node.type);
    if (node.type === 'service' && other.type === 'service') expect(other.stageKey, node.id).toBe(node.stageKey);
    if (node.type === 'decision' && other.type === 'decision') expect(other.decisionKey, node.id).toBe(node.decisionKey);
  }
});

it('44.7：全部数据来源为合成，必需来源标签由 Schema 强制检查', () => {
  const kinds: string[] = [];
  const visit = (value: unknown) => {
    if (!value || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
      if (key === 'provenance') kinds.push((child as { kind: string }).kind);
      else visit(child);
    }
  };
  visit(document);
  expect(kinds.length).toBeGreaterThan(0);
  expect(new Set(kinds)).toEqual(new Set(['synthetic']));
});

it('44.11：存在共同工序、各自独有工序及一个拆分为并行通道的工序', () => {
  const a = planA.graph.nodes.filter(node => node.type === 'service');
  const b = planB.graph.nodes.filter(node => node.type === 'service');
  const aKeys = new Set(a.map(node => node.stageKey));
  const bKeys = new Set(b.map(node => node.stageKey));
  expect([...aKeys].some(key => !bKeys.has(key))).toBe(true);
  expect([...bKeys].some(key => !aKeys.has(key))).toBe(true);
  expect([...aKeys].some(key => a.filter(node => node.stageKey === key).length === 1 && b.filter(node => node.stageKey === key).length >= 2
    && b.some(node => node.stageKey === key && !a.some(original => original.id === node.id)))).toBe(true);
});

it('43.5 / 44.9：说明包含两种语言的声明及全部节点与资源 ID', () => {
  const readme = readFileSync('examples/README.md', 'utf8');
  expect(readme).toContain(PRODUCT_STATEMENT.zh);
  expect(readme).toContain(PRODUCT_STATEMENT.en);
  for (const plan of document.plans) {
    expect(readme).toContain(plan.id);
    for (const entity of [...plan.graph.nodes, ...plan.staff, ...plan.deviceTypes]) expect(readme).toContain(entity.id);
  }
});
