import { describe, expect, it } from 'vitest';
import example from '../examples/open-house.json';
import { projectDocumentSchema } from '../src/schemas';
import type { RunRequest, ServiceNode } from '../src/schemas';
import { simulate } from '../src/simulation/engine';
import { generatePopulation, inputKey, keyedDraw, scenarioKey } from '../src/simulation/input';
import { playbackAt } from '../src/simulation/metrics';

function fixture(): RunRequest {
  return {
    schemaVersion: 1, runMode: 'cutoff',
    scenario: { id: 'scenario', seed: 42, observationCutoff: 15, horizon: 200, attributes: [], assumptionOverrides: [],
      arrivalStreams: [{ id: 'guests', kind: 'records', provenance: { kind: 'synthetic' }, records: ['a', 'b', 'c'].map(id => ({ id, arrivalTime: 0, attributes: {} })) }] },
    plan: { id: 'plan', name: '手算单窗口', scenarioId: 'scenario', skills: [{ id: 'skill', name: '服务' }], deviceTypes: [], assignments: [],
      staff: [{ id: 'worker', name: '人员', skillIds: ['skill'], shifts: [{ start: 0, end: 200 }], unavailability: [], provenance: { kind: 'synthetic' } }],
      graph: { nodes: [
        { id: 'entrance', type: 'entrance', name: '入口', layout: { x: 0, y: 0 }, arrivalStreamIds: ['guests'] },
        { id: 'service', type: 'service', name: '窗口', layout: { x: 300, y: 0 }, stageKey: 'stage', requirements: [{ kind: 'staff', skillId: 'skill', quantity: 1 }], duration: { kind: 'fixed', value: 10, provenance: { kind: 'synthetic' } }, openWindows: [] },
        { id: 'exit', type: 'exit', name: '出口', layout: { x: 600, y: 0 } },
      ], edges: [{ id: 'in-service', source: 'entrance', target: 'service' }, { id: 'service-out', source: 'service', target: 'exit' }] } },
  };
}
const service = (request: RunRequest) => request.plan.graph.nodes[1] as ServiceNode;

describe('离散事件仿真', () => {
  it('counts queues after all same-time events and reports passage at every node type', () => {
    const request = fixture();
    request.scenario.arrivalStreams = [{ id: 'guests', kind: 'records', provenance: { kind: 'synthetic' }, records: [{ id: 'a', arrivalTime: 0, attributes: {} }] }];
    const run = simulate(request);
    expect(run.statistics!.nodes.find(node => node.id === 'service')!.maxQueue).toBe(0);
    expect(run.statistics!.visitors[0].waiting).toBe(0);
    const view = playbackAt(run.events, request.plan, 15);
    expect(view.nodes.entrance.completed).toBe(1);
    expect(view.nodes.service.completed).toBe(1);
    expect(view.nodes.exit.completed).toBe(1);
    expect(view.nodes.service.queued).toEqual([]);
  });
  it('records transfer arrival times and leaves no transit state after arrival', () => {
    const request = fixture(); request.scenario.observationCutoff = 60;
    request.plan.graph.edges[0].transferDuration = { kind: 'fixed', value: 20, provenance: { kind: 'synthetic' } };
    const run = simulate(request);
    const moving = playbackAt(run.events, request.plan, 10).visitors['guests:a'];
    expect(moving).toMatchObject({ type: 'ROUTE_TRANSITION', edgeId: 'in-service', time: 0, details: { arrivalAt: 20 } });
    expect(playbackAt(run.events, request.plan, 20).visitors['guests:a'].type).toBe('SERVICE_START');
  });
  it.each(['name', 'description', 'notes', 'layout', 'source', 'startClock', 'sourcePlanId', 'sourceScenarioId'])('keeps the legal participant attribute %s in the simulation key', key => {
    const request = fixture();
    request.scenario.attributes = [{ id: key, name: key, values: ['a', 'b'] }];
    const stream = request.scenario.arrivalStreams[0];
    if (stream.kind !== 'records') throw new Error('fixture');
    stream.records.forEach(record => { record.attributes = { [key]: 'a' }; });
    const before = inputKey(request), beforeScenario = scenarioKey(request.scenario);
    stream.records[0].attributes[key] = 'b';
    expect(inputKey(request)).not.toBe(before);
    expect(scenarioKey(request.scenario)).not.toBe(beforeScenario);
    request.scenario.arrivalStreams = [{ id: 'guests', kind: 'total_in_window', count: 3, start: 0, end: 10, spacing: 'even', provenance: { kind: 'synthetic' }, attributeDistributions: { [key]: { values: [{ value: 'a', probability: 1 }], provenance: { kind: 'synthetic' } } } }];
    const generatedKey = inputKey(request);
    const generated = request.scenario.arrivalStreams[0];
    if (generated.kind === 'records') throw new Error('fixture');
    generated.attributeDistributions[key].provenance.notes = 'Display-only source note';
    expect(inputKey(request)).toBe(generatedKey);
    generated.attributeDistributions[key].values[0].value = 'b';
    expect(inputKey(request)).not.toBe(generatedKey);
  });
  it('手算 FIFO、未完成者等待、P90、队列积分和人员利用率', () => {
    const run = simulate(fixture());
    expect(run.status).toBe('succeeded');
    expect(run.events.filter(event => event.type === 'SERVICE_START').map(event => [event.participantId, event.time])).toEqual([['guests:a', 0], ['guests:b', 10]]);
    expect(run.statistics!.outcomes).toMatchObject({ completed: 1, unfinished: 2, not_arrived: 0 });
    expect(run.statistics!.visitors.map(visitor => visitor.waiting)).toEqual([0, 10, 15]);
    expect(run.statistics!.averageWaiting).toBeCloseTo(25 / 3);
    expect(run.statistics!.p90Waiting).toBe(15);
    expect(run.statistics!.nodes.find(node => node.id === 'service')).toMatchObject({ queueSeconds: 25, maxQueue: 2, bottleneckSeconds: 15 });
    expect(run.statistics!.resources[0]).toMatchObject({ busy: 15, idle: 0, utilization: 1 });
  });
  it('完成模式具有完全相同的 cutoff 前缀与截止统计', () => {
    const request = fixture();
    const cut = simulate(request);
    const complete = simulate({ ...request, runMode: 'run_to_completion' });
    expect(complete.coveredUntil).toBe(30);
    expect(complete.events.filter(event => event.time <= 15)).toEqual(cut.events);
    expect(complete.statistics).toEqual(cut.statistics);
    expect(complete.completion!.outcomes.completed).toBe(3);
  });
  it('运行可复现、不修改输入，布局和名称不改变结果', () => {
    const request = fixture();
    const original = structuredClone(request);
    const first = simulate(request);
    expect(simulate(request)).toEqual(first);
    expect(request).toEqual(original);
    request.plan.name = '新名称'; request.plan.graph.nodes[1].layout.x = -100;
    expect(inputKey(request)).toBe(inputKey(original));
    expect(simulate(request).events).toEqual(first.events);
    service(request).duration = { kind: 'fixed', value: 5, provenance: { kind: 'user_estimate' } };
    expect(inputKey(request)).not.toBe(inputKey(original));
    expect(scenarioKey(request.scenario)).toBe(scenarioKey(original.scenario));
    expect(simulate(request).statistics!.outcomes.completed).toBe(3);
  });
  it('无序集合重新排列不改变事件顺序', () => {
    const request = fixture();
    const first = simulate(request);
    request.plan.graph.nodes.reverse(); request.plan.graph.edges.reverse(); request.plan.staff.reverse();
    expect(simulate(request).events).toEqual(first.events);
  });
  it('满员受阻者不占资源，空位出现后按顺序入队', () => {
    const request = fixture(); service(request).queueCapacity = 1;
    const run = simulate(request);
    expect(run.events.filter(event => event.type === 'QUEUE_BLOCKED').map(event => event.participantId)).toEqual(['guests:b', 'guests:c']);
    expect(run.statistics!.visitors.map(visitor => visitor.waiting)).toEqual([0, 10, 15]);
    expect(run.statistics!.visitors[2]).toMatchObject({ blockedWaiting: 10, queueWaiting: 5 });
    const view = playbackAt(run.events, request.plan, 12);
    expect(view.nodes.service.serving).toEqual(['guests:b']);
    expect(view.nodes.service.queued).toEqual(['guests:c']);
  });
  it('非抢占服务跨班次完成，加班不被抹掉', () => {
    const request = fixture(); request.plan.staff[0].shifts[0].end = 5;
    const run = simulate(request);
    expect(run.statistics!.outcomes.completed).toBe(1);
    expect(run.statistics!.resources[0]).toMatchObject({ busy: 10, overtime: 5, offShift: 5 });
    expect(run.events.filter(event => event.type === 'RESOURCE_CHANGE').map(event => [event.time, event.details!.to])).toEqual([[10, 'off_shift']]);
  });
  it('忙碌时调岗在服务完成后交接，期间不能开始新服务', () => {
    const request = fixture();
    request.plan.assignments = [{ resourceUnitId: 'worker', periods: [{ from: 0, to: 5, nodeIds: ['service'] }, { from: 5, nodeIds: ['service'], handoverSec: 3 }] }];
    const run = simulate(request);
    expect(run.events.filter(event => event.type === 'SERVICE_START').map(event => event.time)).toEqual([0, 13]);
    expect(run.statistics!.resources[0].handover).toBe(3);
  });
  it('多技能人员按完整匹配分配，不用同一个人占两个名额', () => {
    const request = fixture();
    request.plan.skills.push({ id: 'second', name: '第二技能' });
    request.plan.staff[0].id = 'x'; request.plan.staff[0].skillIds.push('second');
    request.plan.staff.push({ ...structuredClone(request.plan.staff[0]), id: 'y', skillIds: ['skill'] });
    service(request).requirements.push({ kind: 'staff', skillId: 'second', quantity: 1 });
    const run = simulate(request);
    expect(run.events.find(event => event.type === 'SERVICE_START')!.resourceUnitIds).toEqual(['y', 'x']);
    expect(run.events.filter(event => event.type === 'SERVICE_START').map(event => event.time)).toEqual([0, 10]);
  });
  it('关闭后服务原队列，关闭时刻到达者按迟到处理', () => {
    const request = fixture();
    service(request).openWindows = [{ openAt: 0, closeAt: 5, provenance: { kind: 'synthetic' } }];
    const stream = request.scenario.arrivalStreams[0];
    if (stream.kind === 'records') stream.records[2].arrivalTime = 5;
    const run = simulate(request);
    expect(run.events.filter(event => event.type === 'SERVICE_START').map(event => event.time)).toEqual([0, 10]);
    expect(run.statistics!.outcomes).toMatchObject({ rejected: 1, completed: 1, unfinished: 1 });
  });
  it('批次不足时按最长等候放行', () => {
    const request = fixture();
    request.plan.graph.nodes[1] = { id: 'service', type: 'waiting_area', name: '候场', layout: { x: 0, y: 0 }, release: { kind: 'batch', batchSize: 2, maxHoldSec: 5 } };
    const run = simulate(request);
    expect(run.events.filter(event => event.type === 'HOLD_RELEASE').map(event => [event.participantId, event.time, event.details!.reason])).toEqual([
      ['guests:a', 0, 'batch_full'], ['guests:b', 0, 'batch_full'], ['guests:c', 5, 'max_hold'],
    ]);
    expect(run.statistics!.visitors[2].holdWaiting).toBe(5);
  });
  it('事件上限只保留真实前缀，禁止生成部分统计结论', () => {
    const request = fixture();
    const full = simulate(request);
    const partial = simulate({ ...request, maxEvents: 8 });
    expect(partial.status).toBe('aborted');
    expect(partial.events).toEqual(full.events.slice(0, 8));
    expect(partial.statistics).toBeNull();
  });
  it('零时长与毫秒取整不会挂起，步数保护可终止参与者', () => {
    const request = fixture();
    service(request).duration = { kind: 'fixed', value: 0.0625, provenance: { kind: 'synthetic' } };
    const run = simulate(request);
    expect(run.events.filter(event => event.type === 'SERVICE_COMPLETE').map(event => event.time)).toEqual([0.063, 0.126, 0.189]);
    expect(simulate({ ...request, maxSteps: 1 }).statistics!.outcomes.loop_limit).toBe(3);
  });
  it('非法图不会产生计算结果', () => {
    const request = fixture(); request.plan.graph.edges.pop();
    const run = simulate(request);
    expect(run.status).toBe('failed'); expect(run.events).toEqual([]); expect(run.statistics).toBeNull();
  });
  it('示例两个方案真实运行、共享参与者且不重复占用资源', () => {
    const document = projectDocumentSchema.parse(example);
    const runs = document.plans.map(plan => simulate({ schemaVersion: 1, scenario: document.scenarios[0], plan, runMode: 'cutoff' }));
    expect(runs.map(run => run.status)).toEqual(['succeeded', 'succeeded']);
    expect(runs[0].population).toEqual(runs[1].population);
    expect(runs[0].statistics).not.toEqual(runs[1].statistics);
    for (const run of runs) {
      expect(Object.values(run.statistics!.outcomes).reduce((a, b) => a + b, 0)).toBe(run.population.length);
      const occupied = new Set<string>();
      for (const event of run.events) {
        if (event.type === 'SERVICE_START') for (const id of event.resourceUnitIds!) { expect(occupied.has(id)).toBe(false); occupied.add(id); }
        if (event.type === 'SERVICE_COMPLETE') for (const id of event.resourceUnitIds!) { expect(occupied.has(id)).toBe(true); occupied.delete(id); }
      }
      expect(run.events.every((event, index) => event.seq === index && (!index || event.time >= run.events[index - 1].time))).toBe(true);
    }
  });
  it('到达模型使用固定属性抽样，同种子随机数与其他抽样无关', () => {
    const scenario = projectDocumentSchema.parse(example).scenarios[0];
    expect(generatePopulation(scenario)).toEqual(generatePopulation({ ...scenario, arrivalStreams: [...scenario.arrivalStreams].reverse() }));
    const value = keyedDraw(42, 'service', 'guest:1', 'stage', 1);
    keyedDraw(42, 'service', 'other', 'stage', 5);
    expect(keyedDraw(42, 'service', 'guest:1', 'stage', 1)).toBe(value);
    expect(value).toBeGreaterThanOrEqual(0); expect(value).toBeLessThan(1);
  });
});
