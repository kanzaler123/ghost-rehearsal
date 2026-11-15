import { describe, expect, it } from 'vitest';
import example from '../examples/open-house.json';
import { canonicalText, parseDocument, projectDocumentSchema, serializeDocument, validateDocument, validateGraph } from '../src/schemas';
import { readProject } from '../src/features/project';
import { simulate } from '../src/simulation/engine';

const fixture = () => projectDocumentSchema.parse(structuredClone(example));

describe('Document_Codec (42)', () => {
  it('示例通过 Codec、Schema 与图校验，往返后逐字节稳定且输入不变', () => {
    const document = fixture();
    const before = structuredClone(document);
    const text = serializeDocument(document);
    const parsed = parseDocument(text);
    expect(parsed.issues).toEqual([]);
    expect(parsed.migrations).toEqual([]);
    expect(validateDocument(parsed.document)).toEqual([]);
    for (const plan of parsed.document!.plans) expect(validateGraph(parsed.document!.scenarios[0], plan)).toEqual([]);
    expect(serializeDocument(parsed.document!)).toBe(text);
    expect(document).toEqual(before);
    expect(text.endsWith('\n') && !text.endsWith('\n\n')).toBe(true);
    expect(text).not.toMatch(/[\r\uFEFF]/);
  });

  it('只补声明的默认值，保留缺省转移时间和所有真实来源', () => {
    const document = fixture();
    const plan = document.plans[0];
    const service = plan.graph.nodes.find(node => node.type === 'service')!;
    if (service.type !== 'service') throw new Error('service');
    delete service.queueCapacity; delete service.fullPolicy; delete service.queueDiscipline; delete service.priority;
    service.closePolicy = {}; delete service.maxConcurrent;
    const exit = plan.graph.nodes.find(node => node.type === 'exit')!;
    if (exit.type === 'exit') delete exit.countsAsCompleted;
    delete document.scenarios[0].statistics;
    delete plan.graph.edges[0].transferDuration;
    const period = plan.assignments[0].periods.at(-1)!;
    delete period.handoverSec; delete period.to;
    const parsed = parseDocument(JSON.stringify(document)).document!;
    const normalized = parsed.plans.find(item => item.id === plan.id)!;
    expect(normalized.graph.nodes.find(node => node.id === service.id)).toMatchObject({
      queueCapacity: null, fullPolicy: { kind: 'block' }, queueDiscipline: 'fifo', priority: 0,
      closePolicy: { queued: { kind: 'serve' }, late: { kind: 'reject' } },
    });
    expect(normalized.graph.nodes.find(node => node.id === service.id)).not.toHaveProperty('maxConcurrent');
    expect(normalized.graph.nodes.find(node => node.id === exit.id)).toHaveProperty('countsAsCompleted', true);
    expect(normalized.graph.edges.find(edge => edge.id === plan.graph.edges[0].id)).not.toHaveProperty('transferDuration');
    const normalizedPeriod = normalized.assignments.find(item => item.resourceUnitId === plan.assignments[0].resourceUnitId)!.periods.at(-1)!;
    expect(normalizedPeriod.handoverSec).toBe(0);
    expect(normalizedPeriod).not.toHaveProperty('to');
    expect(parsed.scenarios[0].statistics).toEqual({ bucketSec: 900, bottleneckThreshold: 1 });
  });

  it('无序集合的顺序不影响文本，含有序语义的列表保持原样', () => {
    const document = fixture();
    document.scenarios.push({ ...structuredClone(document.scenarios[0]), id: 'z-scenario' });
    const text = serializeDocument(document);
    document.scenarios.reverse(); document.plans.reverse();
    for (const scenario of document.scenarios) { scenario.attributes.reverse(); scenario.arrivalStreams.reverse(); }
    for (const plan of document.plans) {
      plan.graph.nodes.reverse(); plan.graph.edges.reverse(); plan.staff.reverse(); plan.deviceTypes.reverse(); plan.skills.reverse(); plan.assignments.reverse();
      plan.staff.forEach(staff => staff.skillIds.reverse());
      plan.assignments.forEach(assignment => assignment.periods.forEach(period => period.nodeIds.reverse()));
      for (const node of plan.graph.nodes) {
        if (node.type === 'entrance') node.arrivalStreamIds.reverse();
        if (node.type === 'subflow') node.memberNodeIds.reverse();
        if (node.type === 'decision' && node.routing.kind === 'attribute') node.routing.branches.forEach(branch => branch.condition?.values.reverse());
      }
    }
    expect(serializeDocument(document)).toBe(text);
    const parsed = parseDocument(text).document!;
    for (const plan of document.plans) {
      const after = parsed.plans.find(item => item.id === plan.id)!;
      for (const node of plan.graph.nodes) {
        const normalized = after.graph.nodes.find(item => item.id === node.id)!;
        if (node.type === 'merge' && normalized.type === 'merge') expect(normalized.incomingPriority).toEqual(node.incomingPriority);
        if (node.type === 'service' && normalized.type === 'service') {
          expect(normalized.requirements).toEqual(node.requirements);
          expect(normalized.openWindows).toEqual(node.openWindows);
          expect(normalized.duration).toEqual(node.duration);
        }
        if (node.type === 'decision' && normalized.type === 'decision') expect(normalized.routing.branches.map(branch => branch.branchKey)).toEqual(node.routing.branches.map(branch => branch.branchKey));
      }
      expect(after.assignments.map(item => item.periods.map(period => period.from))).toEqual([...plan.assignments].sort((a, b) => a.resourceUnitId < b.resourceUnitId ? -1 : 1).map(item => item.periods.map(period => period.from)));
    }
  });

  it('规范化使用 UTF-16 键顺序、两空格缩进和无损数值及 Unicode', () => {
    const value = { z: {}, a: [], '😀': '\ud800中文', '\uE000': 1.0000000000000002, '2': 1e-7, '10': 1e21 };
    expect(canonicalText(value)).toBe('{\n  "10": 1e+21,\n  "2": 1e-7,\n  "a": [],\n  "z": {},\n  "😀": "\\ud800中文",\n  "\uE000": 1.0000000000000002\n}\n');
    expect(JSON.parse(canonicalText(value))).toEqual(value);
  });

  it.each(['', '{', 'null', '[]', 'true', '7', '"text"'])('拒绝错误 JSON 或顶层类型：%s', text => {
    const result = parseDocument(text);
    expect(result.document).toBeUndefined();
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0]).toMatchObject({ severity: 'error', path: [] });
  });

  it.each([undefined, 0, -1, 1.5, '1', true, null])('拒绝非法版本且不继续 Schema 校验：%s', schemaVersion => {
    const result = parseDocument(JSON.stringify({ format: 'ghost-rehearsal', schemaVersion }));
    expect(result.document).toBeUndefined();
    expect(result.issues.map(issue => issue.path)).toEqual([['schemaVersion']]);
  });

  it('格式与版本同时错误时全部列出，新版本明确要求更新', () => {
    expect(parseDocument('{}').issues.map(issue => issue.path)).toEqual([['format'], ['schemaVersion']]);
    expect(parseDocument('{"format":"Ghost-Rehearsal","schemaVersion":1}').issues.map(issue => issue.path)).toEqual([['format']]);
    const result = parseDocument('{"format":"ghost-rehearsal","schemaVersion":2}');
    expect(result.document).toBeUndefined();
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].message).toMatch(/2.*1.*更新/);
    expect(readProject('{"format":"ghost-rehearsal","schemaVersion":2}', 'en').error).toMatch(/2.*1.*Update Ghost Rehearsal/);
    expect(readProject('{"format":"ghost-rehearsal","schemaVersion":1e+30}', 'en').error).toMatch(/version 1e\+30.*version 1\./);
  });

  it('全部未知字段只报告一次且保留完整路径，导入错误不截断', () => {
    const document = fixture();
    Object.assign(document.plans[0].graph.nodes[0], { a: 1, b: 2, c: 3, d: 4, e: 5, f: 6 });
    const result = readProject(JSON.stringify(document));
    expect(result.document).toBeUndefined();
    expect(result.issues.map(issue => issue.path)).toEqual(['a', 'b', 'c', 'd', 'e', 'f'].map(key => ['plans', 0, 'graph', 'nodes', 0, key]));
    expect(result.error!.split('\n')).toHaveLength(6);
  });

  it('结构合法的草稿允许导入，警告保留，解析不执行图校验', () => {
    const document = fixture();
    const plan = document.plans[0];
    const waiting = plan.graph.nodes.find(node => node.type === 'waiting_area')!;
    if (waiting.type === 'waiting_area') waiting.release = { kind: 'batch', batchSize: 2 };
    plan.graph.edges[0].target = 'missing-node';
    const parsed = parseDocument(JSON.stringify(document));
    expect(parsed.document).toBeDefined();
    expect(parsed.issues).toHaveLength(1);
    const issue = parsed.issues[0];
    expect(issue).toMatchObject({ code: 'batch_without_timeout', severity: 'warning' });
    expect(issue.path).toEqual(['plans', parsed.document!.plans.findIndex(item => item.id === plan.id), 'graph', 'nodes', parsed.document!.plans.find(item => item.id === plan.id)!.graph.nodes.findIndex(node => node.id === waiting.id), 'release']);
    expect(validateGraph(document.scenarios[0], plan).some(issue => issue.code === 'unknown_edge_target')).toBe(true);
  });

  it('示例的两个方案导入导出后事件和指纹均不变', () => {
    const document = fixture();
    const parsed = parseDocument(serializeDocument(document)).document!;
    for (const plan of document.plans) {
      const before = simulate({ schemaVersion: 1, runMode: 'cutoff', scenario: document.scenarios[0], plan });
      const after = simulate({ schemaVersion: 1, runMode: 'cutoff', scenario: parsed.scenarios[0], plan: parsed.plans.find(item => item.id === plan.id)! });
      expect(after.status).toBe('succeeded');
      expect(after.events).toEqual(before.events);
      expect(after.inputKey).toBe(before.inputKey);
      expect(after.statistics?.averageWaiting).toBe(before.statistics?.averageWaiting);
    }
  });
});
