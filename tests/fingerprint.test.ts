import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import example from '../examples/open-house.json';
import { fingerprintRunRequest, normalizePlan, normalizeScenario, projectDocumentSchema, sha256, validateRunRequest } from '../src/schemas';
import type { RunRequest } from '../src/schemas';

const nodeHash = (text: string) => createHash('sha256').update(text, 'utf8').digest('hex');
function fixture(index = 0): RunRequest {
  const document = projectDocumentSchema.parse(structuredClone(example));
  return { schemaVersion: 1, scenario: document.scenarios[0], plan: document.plans[index], runMode: 'cutoff' };
}
const fingerprint = (request: RunRequest) => fingerprintRunRequest(request, 'test-model');

describe('同步 SHA-256 与指纹 (5, 47.7)', () => {
  it.each(['', 'abc', 'a'.repeat(55), 'a'.repeat(56), 'a'.repeat(63), 'a'.repeat(64), 'a'.repeat(65), 'a'.repeat(1000000), '中文 👻 🎃 café', '\ud800\udfff\ud800'])('UTF-8 与填充边界对照：%#', text => {
    expect(sha256(text)).toBe(nodeHash(text));
  });

  it('两个示例和 100 个生成请求全部与 Node crypto 一致，输入保持不变', () => {
    const requests = [fixture(0), fixture(1), ...Array.from({ length: 100 }, (_, index) => {
      const request = fixture(index % 2);
      request.scenario.seed = index * 7919;
      request.scenario.observationCutoff += index / 1000;
      request.scenario.horizon += index;
      request.scenario.attributes[0].values.push(`幽灵👻-${index}`);
      request.runMode = index % 2 ? 'cutoff' : 'run_to_completion';
      request.maxSteps = index + 1; request.maxEvents = 1000 + index;
      return request;
    })];
    for (const [index, request] of requests.entries()) {
      expect(validateRunRequest(request).filter(issue => issue.severity === 'error')).toEqual([]);
      const before = structuredClone(request);
      const result = fingerprintRunRequest(request, `模型👻-${index % 3}`);
      expect(result).not.toBeInstanceOf(Promise);
      expect(result.inputFingerprint).toMatch(/^[0-9a-f]{64}$/);
      expect(result.scenarioFingerprint).toMatch(/^[0-9a-f]{64}$/);
      expect(result.inputFingerprint).toBe(nodeHash(result.inputText));
      expect(result.scenarioFingerprint).toBe(nodeHash(result.scenarioText));
      expect(request).toEqual(before);
    }
  });

  it('显式默认值、无序集合和对象键顺序不改变指纹', () => {
    const request = fixture();
    const before = fingerprint(request);
    request.plan = normalizePlan(request.plan); request.scenario = normalizeScenario(request.scenario);
    request.maxSteps = 1000; request.maxEvents = 1000000;
    request.plan.graph.nodes.reverse(); request.plan.graph.edges.reverse(); request.plan.staff.reverse();
    request.plan.assignments.reverse(); request.plan.skills.reverse(); request.plan.deviceTypes.reverse();
    request.plan.staff.forEach(staff => staff.skillIds.reverse());
    request.plan.assignments.forEach(assignment => assignment.periods.forEach(period => period.nodeIds.reverse()));
    request.scenario.arrivalStreams.reverse(); request.scenario.attributes.reverse();
    expect(fingerprint(request)).toEqual(before);
    const reordered = Object.fromEntries(Object.entries(request).reverse()) as RunRequest;
    expect(fingerprint(reordered)).toEqual(before);
  });

  it('名称、布局、来源说明和分组不影响指纹，来源种类仍参与', () => {
    const request = fixture();
    const before = fingerprint(request);
    request.plan.name = '新的活动'; request.plan.notes = '备注'; request.plan.sourcePlanId = 'source-plan';
    request.scenario.startClock = '23:59'; request.scenario.name = '中文 👻'; request.scenario.sourceScenarioId = 'source-scenario';
    request.plan.graph.nodes.forEach(node => { node.name = '改名'; node.layout.x += 123; node.description = '说明'; });
    request.plan.graph.nodes.push({ id: 'new-group', type: 'subflow', name: '分组', layout: { x: 0, y: 0 }, memberNodeIds: [] });
    request.plan.staff[0].provenance.source = '现场说明'; request.plan.staff[0].provenance.notes = '备注';
    expect(fingerprint(request)).toEqual(before);
    request.plan.staff[0].provenance.kind = 'measured';
    expect(fingerprint(request).inputFingerprint).not.toBe(before.inputFingerprint);
    expect(fingerprint(request).scenarioFingerprint).toBe(before.scenarioFingerprint);
  });

  it('缺省转移时间不产生来源，显式零时长仍保留其来源差异', () => {
    const request = fixture();
    delete request.plan.graph.edges[0].transferDuration;
    const before = fingerprint(request);
    const edge = JSON.parse(before.inputText).plan.graph.edges.find((edge: { id: string }) => edge.id === request.plan.graph.edges[0].id);
    expect(edge).not.toHaveProperty('transferDuration');
    request.plan.graph.edges[0].transferDuration = { kind: 'fixed', value: 0, provenance: { kind: 'synthetic' } };
    expect(fingerprint(request).inputText).not.toBe(before.inputText);
  });

  it('属性条件取值无序，参与者属性的取值及概率分布列表有序', () => {
    const request = fixture();
    const node = request.plan.graph.nodes.find(node => node.type === 'decision' && node.routing.kind === 'attribute');
    if (node?.type !== 'decision' || node.routing.kind !== 'attribute') throw new Error('attribute decision');
    const condition = node.routing.branches.find(branch => branch.condition)!.condition!;
    const attribute = request.scenario.attributes.find(item => item.id === condition.attributeId)!;
    condition.values = [...attribute.values];
    const before = fingerprint(request);
    condition.values.reverse();
    expect(fingerprint(request)).toEqual(before);
    attribute.values.reverse();
    expect(fingerprint(request).scenarioText).not.toBe(before.scenarioText);
  });

  it('有序路由、需求、样本与到达记录不会被当作无序集合', () => {
    const request = fixture();
    const node = request.plan.graph.nodes.find(node => node.type === 'decision')!;
    if (node.type !== 'decision') throw new Error('decision');
    const before = fingerprint(request);
    node.routing.branches.reverse();
    expect(fingerprint(request).inputText).not.toBe(before.inputText);
    const service = request.plan.graph.nodes.find(node => node.type === 'service')!;
    if (service.type !== 'service') throw new Error('service');
    service.duration = { kind: 'empirical', samples: [2, 1], provenance: { kind: 'synthetic' } };
    const first = fingerprint(request);
    service.duration.samples.reverse();
    expect(fingerprint(request).inputText).not.toBe(first.inputText);
    const stream = request.scenario.arrivalStreams[0];
    request.scenario.arrivalStreams[0] = { id: stream.id, kind: 'records', provenance: stream.provenance, records: [
      { id: 'a', arrivalTime: 0, attributes: {} }, { id: 'b', arrivalTime: 0, attributes: {} },
    ] };
    const second = fingerprint(request);
    request.scenario.arrivalStreams[0].records.reverse();
    expect(fingerprint(request).scenarioText).not.toBe(second.scenarioText);
  });

  it.each(['name', 'layout', 'source', 'notes', 'description', 'provenance', 'attributes', 'statistics'])('用户属性 %s 不会被当作显示字段丢弃', id => {
    const request = fixture();
    request.scenario.attributes = [{ id, name: '属性', values: ['甲', '乙'] }];
    request.scenario.arrivalStreams = [{ id: 'guests', kind: 'records', provenance: { kind: 'synthetic' }, records: [{ id: 'guest', arrivalTime: 0, attributes: { [id]: '甲' } }] }];
    expect(validateRunRequest(request).filter(issue => issue.severity === 'error')).toEqual([]);
    const before = fingerprint(request);
    const records = request.scenario.arrivalStreams[0];
    if (records.kind === 'records') records.records[0].attributes[id] = '乙';
    expect(fingerprint(request).scenarioFingerprint).not.toBe(before.scenarioFingerprint);
    request.scenario.arrivalStreams = [{ id: 'guests', kind: 'total_in_window', start: 0, end: 10, count: 2, spacing: 'even', provenance: { kind: 'synthetic' },
      attributeDistributions: { [id]: { values: [{ value: '甲', probability: 1 }], provenance: { kind: 'synthetic' } } } }];
    const generated = fingerprint(request);
    const stream = request.scenario.arrivalStreams[0];
    if (stream.kind === 'total_in_window') stream.attributeDistributions[id].values[0].value = '乙';
    expect(fingerprint(request).scenarioFingerprint).not.toBe(generated.scenarioFingerprint);
  });

  it('运行模式、限额、参数和模型版本改变输入指纹，场景指纹只随场景及模型变化', () => {
    const request = fixture();
    const before = fingerprint(request);
    for (const change of [{ runMode: 'run_to_completion' as const }, { maxSteps: 1001 }, { maxEvents: 1000001 }]) {
      const result = fingerprint({ ...request, ...change });
      expect(result.inputFingerprint).not.toBe(before.inputFingerprint);
      expect(result.scenarioFingerprint).toBe(before.scenarioFingerprint);
    }
    request.plan.graph.edges[0].source = 'changed-source';
    expect(fingerprint(request).inputFingerprint).not.toBe(before.inputFingerprint);
    request.scenario.seed++;
    expect(fingerprint(request).scenarioFingerprint).not.toBe(before.scenarioFingerprint);
    expect(fingerprintRunRequest(fixture(), 'another-model').scenarioFingerprint).not.toBe(before.scenarioFingerprint);
    const missingMode = { ...fixture(), runMode: undefined };
    expect(validateRunRequest(missingMode).some(issue => issue.path[0] === 'runMode')).toBe(true);
  });
});
