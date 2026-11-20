import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { PassThrough } from 'node:stream';
import { describe, expect, it } from 'vitest';
import example from '../examples/open-house.json';
import { firstDifference, journeyOf, statisticsAt } from '../src/features/analysis';
import { buildFateCardSvg } from '../src/features/fateCard';
import { MESSAGES } from '../src/i18n/messages';
import { projectDocumentSchema } from '../src/schemas';
import { simulate } from '../src/simulation/engine';
import { FrameReader, encodeFrame, handleMessage, handlePayload, runStdioServer } from '../scripts/mcp/server';
import {
  FROZEN_DIGESTS, MAX_PROJECT_BYTES, TOOLS, ToolError, callTool, hasScriptOrExternalRef, inspectGuestDivergence,
  renderFateCardSvg, validateEventProject, verifySimulationInvariants,
} from '../scripts/mcp/tools';

const root = process.cwd();
const rpc = (method: string, params?: unknown, id: number | string = 1) => JSON.stringify({ jsonrpc: '2.0', id, method, params });
const reply = (text: string): any => JSON.parse(handlePayload(text)!);
const clone = () => structuredClone(example) as any;

/** Minimal well-formedness check, the same rules as tests/fate-card.test.ts. */
function assertWellFormed(svg: string) {
  expect(svg).not.toMatch(/&(?!(?:amp|lt|gt|quot|apos);)/);
  const stack: string[] = [];
  for (const match of svg.matchAll(/<(\/?)([A-Za-z][\w:-]*)((?:\s+[\w:-]+="[^"<]*")*)\s*(\/?)>/g)) {
    if (match[4]) continue;
    if (match[1]) expect(stack.pop()).toBe(match[2]); else stack.push(match[2]);
  }
  expect(stack).toEqual([]);
  expect(svg.replace(/<[^>]*>/g, '')).not.toMatch(/</);
}

describe('verify_simulation_invariants', () => {
  const result = verifySimulationInvariants();
  it('matches all six frozen SHA-256 digests with real runs', () => {
    expect(result.passed).toBe(true);
    expect(result.matched).toBe(6);
    expect(result.digests).toHaveLength(6);
    expect(result.digests.map(item => `${item.runMode}:${item.plan}`)).toEqual([
      'cutoff:A', 'cutoff:B', 'cutoff:C', 'run_to_completion:A', 'run_to_completion:B', 'run_to_completion:C',
    ]);
    result.digests.forEach((item, index) => {
      expect(item.status).toBe('succeeded');
      expect(item.match).toBe(true);
      expect(item.actual).toBe(item.expected);
      expect(item.expected).toBe(FROZEN_DIGESTS[index]);
    });
  });
  it('keeps the digest constants identical to the frozen snapshot in the equivalence test', () => {
    const source = readFileSync(resolve('tests/ui-redesign-equivalence.test.ts'), 'utf8');
    const frozen = [...source.matchAll(/"([0-9a-f]{64})"/g)].map(match => match[1]);
    expect(frozen).toHaveLength(6);
    expect([...FROZEN_DIGESTS]).toEqual(frozen);
  });
  it('reports core metrics for A, B and C in both scopes', () => {
    for (const scope of ['cutoff', 'run_to_completion'] as const) {
      for (const plan of ['A', 'B', 'C'] as const) {
        const metrics = result.metrics[scope][plan]!;
        expect(metrics, `${scope}/${plan}`).not.toBeNull();
        expect(metrics.completed + metrics.unfinished + metrics.left).toBe(metrics.arrived);
        expect(metrics.avgWait).toEqual(expect.any(Number));
        expect(metrics.p90Wait).toEqual(expect.any(Number));
        expect(metrics.p90Wait!).toBeGreaterThanOrEqual(0);
      }
    }
    expect(result.metrics.cutoff.A!.until).toBe(1800);
    expect(result.metrics.run_to_completion.A!.until).toBeGreaterThanOrEqual(1800);
  });
  it('rejects arguments it does not define', () => {
    expect(() => verifySimulationInvariants({ extra: 1 })).toThrow(ToolError);
  });
});

describe('inspect_guest_divergence', () => {
  it('finds side-stream:10 diverging at 03:30 with defaults', () => {
    const result = inspectGuestDivergence();
    expect(result).toMatchObject({ visitorId: 'side-stream:10', basis: 'cutoff', lang: 'en' });
    expect(result.firstDivergence).toMatchObject({ seconds: 210, time: '03:30' });
    expect(result.names).toEqual({ a: 'Side entrance #10', b: 'Side entrance #10' });
    expect(result.a.planId).toBe('baseline');
    expect(result.b.planId).toBe('alternative');
    expect(result.a.until).toBe(1800);
    expect(result.b.until).toBe(1800);
    expect(result.a.waitingSeconds).toEqual(expect.any(Number));
    expect(result.waitingDeltaSeconds).toBe(Math.round((result.b.waitingSeconds! - result.a.waitingSeconds!) * 1000) / 1000);
    expect(result.summary).toContain('03:30');
    expect(result.evidence).toMatchObject({ population: 'paired-arrived', pairedArrivedSample: 300, guestInPairedSample: true });
    expect(result.evidence.sides.map(side => side?.until)).toEqual([1800, 1800]);
  });
  it('agrees with the engine and analysis modules called directly', () => {
    const document = projectDocumentSchema.parse(example);
    const [a, b] = document.plans.map(plan => simulate({ schemaVersion: 1, plan, scenario: document.scenarios[0], runMode: 'cutoff' }));
    const until = statisticsAt(a, 'cutoff')!.until;
    const difference = firstDifference(journeyOf(a, 'side-stream:10', until), journeyOf(b, 'side-stream:10', until), document.plans[0], document.plans[1]);
    expect(difference?.time).toBe(210);
    const result = inspectGuestDivergence({ visitorId: 'side-stream:10' });
    const outcome = (run: typeof a) => statisticsAt(run, 'cutoff')!.visitors.find(item => item.id === 'side-stream:10')!;
    expect(result.a.outcome).toBe(outcome(a).outcome);
    expect(result.b.outcome).toBe(outcome(b).outcome);
    expect(result.a.waitingSeconds).toBeCloseTo(outcome(a).waiting, 3);
    expect(result.b.waitingSeconds).toBeCloseTo(outcome(b).waiting, 3);
  });
  it('answers in Chinese with Chinese names', () => {
    const result = inspectGuestDivergence({ lang: 'zh' });
    expect(result.names.a).toBe('侧入口 #10');
    expect(result.firstDivergence?.time).toBe('03:30');
    expect(result.a.planName).toBe('方案 A · 基线');
    expect(result.summary).toContain('首次分叉');
    expect(result.summary).toContain(MESSAGES.zh.outcomes[result.a.outcome as 'completed']);
  });
  it('uses final statistics for basis completion and labels them', () => {
    const document = projectDocumentSchema.parse(example);
    const runs = document.plans.map(plan => simulate({ schemaVersion: 1, plan, scenario: document.scenarios[0], runMode: 'run_to_completion' }));
    const ends = runs.map(run => statisticsAt(run, 'completion')!.until);
    const result = inspectGuestDivergence({ basis: 'completion', visitorId: 'main-stream:20' });
    expect(result.basis).toBe('completion');
    expect(result.evidence.sides.map(side => side?.until)).toEqual(ends);
    expect(result.evidence.basisLabel).toBe(MESSAGES.en.encore.fateCard.basisFinal);
    expect(result.summary).toContain(MESSAGES.en.encore.fateCard.basisFinal);
  });
  it('fails clearly for unknown guests and bad arguments', () => {
    expect(() => inspectGuestDivergence({ visitorId: 'nobody:1' })).toThrow(/Unknown guest "nobody:1"/);
    expect(() => inspectGuestDivergence({ basis: 'final' })).toThrow(/basis/);
    expect(() => inspectGuestDivergence({ lang: 'fr' })).toThrow(/lang/);
    expect(() => inspectGuestDivergence({ visitorId: '' })).toThrow(/visitorId/);
    expect(() => inspectGuestDivergence({ colour: 'red' })).toThrow(ToolError);
    expect(() => inspectGuestDivergence('side-stream:10')).toThrow(ToolError);
  });
});

describe('validate_event_project', () => {
  it('accepts the shipped example by default and counts nodes and resources per plan', () => {
    const result = validateEventProject({}, { root });
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.source).toEqual({ kind: 'file', path: 'examples/open-house.json' });
    expect(result.scenarios.map(item => item.id)).toEqual(['open-house']);
    expect(result.plans.map(plan => plan.id)).toEqual(['baseline', 'alternative']);
    const [a, b] = result.plans as any[];
    expect(a).toMatchObject({ schemaValid: true, nodes: { total: 17 }, edges: 15, resources: { staff: 3, deviceUnits: 1 } });
    expect(b).toMatchObject({ schemaValid: true, nodes: { total: 19 }, edges: 18, resources: { staff: 3, deviceUnits: 2 } });
    expect(a.nodes.byType.service).toBeGreaterThan(0);
    expect(Object.values<number>(a.nodes.byType).reduce((sum, count) => sum + count, 0)).toBe(17);
  });
  it('reports invalid JSON without throwing and without echoing the text', () => {
    const result = validateEventProject({ projectJson: '{ secret-token, not json' });
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatchObject({ code: 'invalid_json', severity: 'error' });
    expect(result.errors[0].message).not.toContain('secret-token');
    expect(result.plans).toEqual([]);
  });
  it('reports schema errors for a structurally wrong document', () => {
    const result = validateEventProject({ projectJson: JSON.stringify({ format: 'ghost-rehearsal', schemaVersion: 1, scenarios: [], plans: [] }) });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.source).toEqual({ kind: 'inline' });
  });
  it('runs validateGraph per plan and reports the plan ID', () => {
    const project = clone();
    project.plans[0].graph.edges[0].target = 'nowhere';
    const result = validateEventProject({ projectJson: JSON.stringify(project) });
    expect(result.valid).toBe(false);
    const graphIssues = result.errors.filter(issue => issue.planId === 'baseline');
    expect(graphIssues.length).toBeGreaterThan(0);
    expect(result.errors.every(issue => issue.planId !== 'alternative')).toBe(true);
  });
  it('returns warnings without failing validation', () => {
    const project = clone();
    delete project.plans[0].graph.nodes.find((node: any) => node.id === 'holding').release.maxHoldSec;
    const result = validateEventProject({ projectJson: JSON.stringify(project) });
    expect(result.valid).toBe(true);
    expect(result.warnings.map(issue => issue.code)).toContain('batch_without_timeout');
  });
  it('lets projectJson take precedence over filePath and tolerates a BOM', () => {
    const result = validateEventProject({ filePath: '../outside.json', projectJson: `\uFEFF${JSON.stringify(example)}` }, { root });
    expect(result.valid).toBe(true);
    expect(result.source).toEqual({ kind: 'inline' });
  });
  it('confines file reads to the workspace root', () => {
    expect(() => validateEventProject({ filePath: '../package.json' }, { root })).toThrow(/outside the workspace root/);
    expect(() => validateEventProject({ filePath: 'examples/../../package.json' }, { root })).toThrow(/outside the workspace root/);
    expect(() => validateEventProject({ filePath: join(tmpdir(), 'anything.json') }, { root })).toThrow(/outside the workspace root/);
    expect(() => validateEventProject({ filePath: 'README.md' }, { root })).toThrow(/\.json/);
    expect(() => validateEventProject({ filePath: 'examples/missing.json' }, { root })).toThrow(/File not found/);
    expect(() => validateEventProject({ filePath: 'examples' + '\0' + '.json' }, { root })).toThrow(/NUL/);
    expect(() => validateEventProject({ filePath: 'examples.json/' }, { root })).toThrow(ToolError);
  });
  it('does not follow a link that leaves the workspace root', () => {
    const base = mkdtempSync(join(tmpdir(), 'ghost-mcp-'));
    try {
      const inside = join(base, 'workspace'), outside = join(base, 'outside');
      mkdirSync(inside); mkdirSync(outside);
      writeFileSync(join(outside, 'secret.json'), '{"token":"do-not-leak"}');
      writeFileSync(join(inside, 'ok.json'), JSON.stringify(example));
      expect(validateEventProject({ filePath: 'ok.json' }, { root: inside }).valid).toBe(true);
      try { symlinkSync(outside, join(inside, 'link'), process.platform === 'win32' ? 'junction' : 'dir'); } catch { return; }
      let message = '';
      try { validateEventProject({ filePath: 'link/secret.json' }, { root: inside }); } catch (error) { message = (error as Error).message; }
      expect(message).toMatch(/outside the workspace root/);
      expect(message).not.toContain('do-not-leak');
    } finally { rmSync(base, { recursive: true, force: true }); }
  });
  it('rejects oversized inline projects and non-string input', () => {
    expect(() => validateEventProject({ projectJson: ' '.repeat(MAX_PROJECT_BYTES + 1) })).toThrow(/larger than/);
    expect(() => validateEventProject({ projectJson: 5 })).toThrow(/projectJson/);
  });
});

describe('render_fate_card_svg', () => {
  it('renders a valid 1200x630 SVG for side-stream:10', () => {
    const result = renderFateCardSvg();
    expect(result).toMatchObject({ filename: 'ghost-fate-card-side-stream-10.svg', width: 1200, height: 630, hasScriptOrExternalRef: false, basis: 'cutoff' });
    expect(result.byteLength).toBe(Buffer.byteLength(result.svg, 'utf8'));
    expect(result.svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true);
    expect(result.svg).toContain('width="1200" height="630" viewBox="0 0 1200 630"');
    expect(result.svg.endsWith('</svg>')).toBe(true);
    assertWellFormed(result.svg);
    expect(result.svg).toContain('Side entrance #10');
    expect(result.svg).toContain(MESSAGES.en.encore.fateCard.riftAt('03:30'));
  });
  it('is the product builder output for the same input and is deterministic', () => {
    expect(renderFateCardSvg().svg).toBe(renderFateCardSvg().svg);
    const document = projectDocumentSchema.parse(example);
    const runs = document.plans.map(plan => simulate({ schemaVersion: 1, plan, scenario: document.scenarios[0], runMode: 'cutoff' }));
    const sides = runs.map((run, index) => {
      const stats = statisticsAt(run, 'cutoff')!;
      return { planName: ['Plan A · Baseline', 'Plan B · Two check-in lanes'][index], journey: journeyOf(run, 'side-stream:10', stats.until), until: stats.until, outcome: stats.visitors.find(item => item.id === 'side-stream:10') };
    }) as any;
    const expected = buildFateCardSvg({
      t: MESSAGES.en, visitorId: 'side-stream:10', visitorName: 'Side entrance #10', eventName: 'Two-Entrance Open House', basis: 'cutoff', cutoff: 1800, sides,
      difference: firstDifference(sides[0].journey, sides[1].journey, document.plans[0], document.plans[1]),
    });
    expect(renderFateCardSvg().svg).toBe(expected);
  });
  it('renders the Chinese and final-basis variants', () => {
    const zh = renderFateCardSvg({ lang: 'zh' });
    expect(zh.svg).toContain('lang="zh"');
    expect(zh.svg).toContain('侧入口 #10');
    assertWellFormed(zh.svg);
    const final = renderFateCardSvg({ basis: 'completion' });
    expect(final.basis).toBe('completion');
    expect(final.svg).toContain(MESSAGES.en.encore.fateCard.basisFinal);
    expect(final.hasScriptOrExternalRef).toBe(false);
    assertWellFormed(final.svg);
  });
  it('names a safe file for other guests and rejects unknown guests', () => {
    expect(renderFateCardSvg({ visitorId: 'main-stream:20' }).filename).toBe('ghost-fate-card-main-stream-20.svg');
    expect(() => renderFateCardSvg({ visitorId: 'nobody:1' })).toThrow(/Unknown guest/);
  });
  it('detects script and external references in markup but ignores text content', () => {
    const wrap = (inner: string) => `<svg xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;
    expect(hasScriptOrExternalRef(wrap('<text>plain</text>'))).toBe(false);
    expect(hasScriptOrExternalRef(wrap('<text>href= https://example.com @ on x=1</text>'))).toBe(false);
    expect(hasScriptOrExternalRef(wrap('<rect fill="url(#grad)"/>'))).toBe(false);
    for (const inner of ['<script>alert(1)</script>', '<foreignObject/>', '<image/>', '<a href="x"/>', '<use xlink:href="#a"/>', '<rect onclick="x()"/>',
      '<rect fill="url(https://e.com/a.png)"/>', '<rect fill="url(http://e.com/a.png)"/>', '<a fill="https://e.com"/>', '<style>@import "x";</style>']) {
      expect(hasScriptOrExternalRef(wrap(inner)), inner).toBe(true);
    }
  });
});

describe('tool registry', () => {
  it('lists exactly the four read-only tools with object input schemas', () => {
    expect(TOOLS.map(tool => tool.name)).toEqual(['verify_simulation_invariants', 'inspect_guest_divergence', 'validate_event_project', 'render_fate_card_svg']);
    for (const tool of TOOLS) {
      expect(tool.annotations.readOnlyHint).toBe(true);
      expect(tool.inputSchema).toMatchObject({ type: 'object', additionalProperties: false });
      expect(tool.description.length).toBeGreaterThan(40);
    }
  });
  it('dispatches by name and rejects unknown names', () => {
    expect((callTool('verify_simulation_invariants', {}) as any).passed).toBe(true);
    expect(() => callTool('delete_everything', {})).toThrow(/Unknown tool/);
  });
  it('registers the tools in the workspace MCP configuration when that file exists', () => {
    const path = resolve('.kiro/settings/mcp.json');
    if (!existsSync(path)) return;
    const server = JSON.parse(readFileSync(path, 'utf8')).mcpServers['ghost-rehearsal-engine'];
    expect(server.command).toBe('node');
    expect(server.args).toEqual(['scripts/ghost-rehearsal-mcp.mjs']);
    expect([...server.autoApprove].sort()).toEqual(TOOLS.map(tool => tool.name).sort());
  });
});

describe('protocol layer', () => {
  it('negotiates the protocol version and advertises tools', () => {
    const modern = reply(rpc('initialize', { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'x', version: '1' } }, 'init-1'));
    expect(modern).toMatchObject({ jsonrpc: '2.0', id: 'init-1', result: { protocolVersion: '2025-03-26', serverInfo: { name: 'ghost-rehearsal-engine' } } });
    expect(modern.result.capabilities.tools).toBeDefined();
    expect(reply(rpc('initialize', { protocolVersion: '1999-01-01' })).result.protocolVersion).toBe('2025-06-18');
    expect(reply(rpc('initialize')).result.protocolVersion).toBe('2025-06-18');
  });
  it('answers ping and lists tools', () => {
    expect(reply(rpc('ping'))).toEqual({ jsonrpc: '2.0', id: 1, result: {} });
    expect(reply(rpc('tools/list')).result.tools.map((tool: any) => tool.name)).toEqual(TOOLS.map(tool => tool.name));
  });
  it('sends no response to notifications or stray responses', () => {
    expect(handlePayload(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }))).toBeNull();
    expect(handlePayload(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/unknown', params: {} }))).toBeNull();
    expect(handlePayload(JSON.stringify({ jsonrpc: '2.0', method: 'tools/list' }))).toBeNull();
    expect(handlePayload(JSON.stringify({ jsonrpc: '2.0', id: 9, result: {} }))).toBeNull();
  });
  it('returns text and structured content for a tool call', () => {
    const response = reply(rpc('tools/call', { name: 'inspect_guest_divergence', arguments: { lang: 'zh' } }, 7));
    expect(response.id).toBe(7);
    expect(response.result.isError).toBe(false);
    expect(response.result.structuredContent.firstDivergence.time).toBe('03:30');
    expect(response.result.content[0].type).toBe('text');
    expect(JSON.parse(response.result.content[0].text)).toEqual(response.result.structuredContent);
  });
  it('reports tool failures as isError results and unknown tools as invalid params', () => {
    const failed = reply(rpc('tools/call', { name: 'inspect_guest_divergence', arguments: { visitorId: 'nobody:1' } }));
    expect(failed.error).toBeUndefined();
    expect(failed.result.isError).toBe(true);
    expect(failed.result.content[0].text).toMatch(/Unknown guest/);
    expect(reply(rpc('tools/call', { name: 'nope' })).error).toMatchObject({ code: -32602 });
    expect(reply(rpc('tools/call', {})).error).toMatchObject({ code: -32602 });
    expect(reply(rpc('tools/call')).error).toMatchObject({ code: -32602 });
  });
  it('uses standard JSON-RPC errors', () => {
    expect(reply('{ not json')).toEqual({ jsonrpc: '2.0', id: null, error: { code: -32700, message: expect.stringContaining('Parse error') } });
    expect(reply('42').error.code).toBe(-32600);
    expect(reply(JSON.stringify({ id: 1, method: 'ping' })).error.code).toBe(-32600);
    expect(reply(JSON.stringify({ jsonrpc: '2.0', id: 1 })).error).toMatchObject({ code: -32600 });
    expect(reply(JSON.stringify({ jsonrpc: '2.0', id: null, method: 'ping' })).error.code).toBe(-32600);
    expect(reply(rpc('resources/list', undefined, 3))).toMatchObject({ id: 3, error: { code: -32601 } });
    expect(reply('[]').error.code).toBe(-32600);
  });
  it('answers batches with an array and skips notifications inside them', () => {
    const batch = JSON.parse(handlePayload(JSON.stringify([
      { jsonrpc: '2.0', id: 1, method: 'ping' },
      { jsonrpc: '2.0', method: 'notifications/initialized' },
      { jsonrpc: '2.0', id: 2, method: 'nope' },
    ]))!);
    expect(batch.map((item: any) => item.id)).toEqual([1, 2]);
    expect(batch[1].error.code).toBe(-32601);
    expect(handlePayload(JSON.stringify([{ jsonrpc: '2.0', method: 'notifications/initialized' }]))).toBeNull();
  });
  it('turns an unexpected exception into an internal error and logs it to the diagnostic sink', () => {
    const logs: string[] = [];
    const hostile = { get name(): string { throw new Error('boom'); } };
    const response = handleMessage({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: hostile }, { log: message => logs.push(message) });
    expect(response?.error?.code).toBe(-32603);
    expect(logs.join('')).toContain('boom');
  });
});

describe('framing', () => {
  it('reads newline-delimited JSON split across chunks and with CRLF', () => {
    const reader = new FrameReader();
    expect(reader.push('{"a":1}\r\n{"b"')).toEqual([{ text: '{"a":1}', framing: 'line' }]);
    expect(reader.push(':2}\n\n\n')).toEqual([{ text: '{"b":2}', framing: 'line' }]);
    expect(reader.push('{"c":3}')).toEqual([]);
    expect(reader.end()).toEqual([{ text: '{"c":3}', framing: 'line' }]);
  });
  it('reads Content-Length frames with multi-byte text split inside a character', () => {
    const body = JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'ping', params: { note: '侧入口 👻' } });
    const bytes = encodeFrame(body, 'header');
    expect(bytes.toString('ascii', 0, 16)).toBe('Content-Length: ');
    expect(bytes.toString('latin1')).toContain(`Content-Length: ${Buffer.byteLength(body)}\r\n\r\n`);
    const reader = new FrameReader();
    const cut = bytes.indexOf(Buffer.from('侧')) + 1;
    expect(reader.push(bytes.subarray(0, cut))).toEqual([]);
    expect(reader.push(bytes.subarray(cut))).toEqual([{ text: body, framing: 'header' }]);
    const oneByte = new FrameReader();
    const frames = [...bytes].flatMap(byte => oneByte.push(Buffer.from([byte])));
    expect(frames).toEqual([{ text: body, framing: 'header' }]);
  });
  it('accepts mixed framing, lower-case header names and bare LF header separators', () => {
    const reader = new FrameReader();
    const frames = reader.push(Buffer.concat([
      Buffer.from('{"line":1}\n'),
      Buffer.from('content-length: 9\n\n{"hdr":2}'),
      Buffer.from('{"line":3}\n'),
    ]));
    expect(frames.map(frame => [frame.framing, frame.text])).toEqual([['line', '{"line":1}'], ['header', '{"hdr":2}'], ['line', '{"line":3}']]);
  });
  it('reports malformed or truncated headers as errors and recovers afterwards', () => {
    const reader = new FrameReader();
    expect(reader.push('Content-Length: abc\r\n\r\n')[0].error).toMatch(/Invalid Content-Length/);
    expect(reader.push('{"ok":true}\n')).toEqual([{ text: '{"ok":true}', framing: 'line' }]);
    const truncated = new FrameReader();
    expect(truncated.push('Content-Length: 50\r\n\r\n{"a":1}')).toEqual([]);
    expect(truncated.end()[0].error).toMatch(/Truncated/);
  });
});

describe('stdio runner', () => {
  it('answers each frame in its own framing, writes nothing else to stdout and resolves when input closes', async () => {
    const stdin = new PassThrough(), stdout = new PassThrough();
    const diagnostics: string[] = [];
    const done = runStdioServer({ stdin, stdout, log: message => diagnostics.push(message), redirectConsole: false });
    const chunks: Buffer[] = [];
    stdout.on('data', chunk => chunks.push(chunk));
    stdin.write(`${rpc('ping', undefined, 1)}\n`);
    stdin.write(encodeFrame(rpc('ping', undefined, 2), 'header'));
    stdin.write('garbage\n');
    stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' })}\n`);
    stdin.end();
    await done;
    const frames = new FrameReader().push(Buffer.concat(chunks));
    expect(frames.map(frame => frame.framing)).toEqual(['line', 'header', 'line']);
    expect(frames.map(frame => JSON.parse(frame.text).id ?? null)).toEqual([1, 2, null]);
    expect(JSON.parse(frames[2].text).error.code).toBe(-32700);
    expect(diagnostics.join('\n')).toContain('ready');
  });
});

describe('launcher process', () => {
  const launcher = resolve('scripts/ghost-rehearsal-mcp.mjs');
  const cacheDir = resolve('node_modules/.cache');
  const bundle = join(cacheDir, 'ghost-rehearsal-mcp.mjs');
  const manifest = join(cacheDir, 'ghost-rehearsal-mcp.manifest.json');

  function session(messages: (string | Buffer)[]): Promise<{ code: number | null; stdout: Buffer; stderr: string }> {
    return new Promise((resolvePromise, reject) => {
      const child = spawn(process.execPath, [launcher], { cwd: root, stdio: ['pipe', 'pipe', 'pipe'] });
      const out: Buffer[] = [];
      let stderr = '';
      child.stdout.on('data', chunk => out.push(chunk));
      child.stderr.on('data', chunk => { stderr += chunk; });
      child.on('error', reject);
      child.on('close', code => resolvePromise({ code, stdout: Buffer.concat(out), stderr }));
      for (const message of messages) child.stdin.write(message);
      child.stdin.end();
    });
  }
  const parse = (stdout: Buffer) => {
    const frames = new FrameReader().push(stdout);
    expect(frames.every(frame => !frame.error)).toBe(true);
    return frames.map(frame => JSON.parse(frame.text));
  };

  it('compiles on a cold start, serves a full session and exits cleanly', async () => {
    rmSync(bundle, { force: true });
    rmSync(manifest, { force: true });
    const result = await session([
      `${rpc('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'vitest', version: '1' } }, 1)}\n`,
      `${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' })}\n`,
      `${rpc('tools/list', undefined, 2)}\n`,
      `${rpc('tools/call', { name: 'verify_simulation_invariants', arguments: {} }, 3)}\n`,
      `${rpc('tools/call', { name: 'inspect_guest_divergence', arguments: { visitorId: 'side-stream:10', basis: 'cutoff', lang: 'en' } }, 4)}\n`,
      encodeFrame(rpc('ping', undefined, 5), 'header'),
    ]);
    expect(result.code).toBe(0);
    expect(result.stderr).toContain('ready (4 tools)');
    const responses = parse(result.stdout);
    expect(responses.map(item => item.id)).toEqual([1, 2, 3, 4, 5]);
    expect(responses.every(item => item.jsonrpc === '2.0' && item.error === undefined)).toBe(true);
    expect(responses[0].result).toMatchObject({ protocolVersion: '2025-06-18', serverInfo: { name: 'ghost-rehearsal-engine' } });
    expect(responses[1].result.tools.map((tool: any) => tool.name)).toEqual(TOOLS.map(tool => tool.name));
    const verify = responses[2].result;
    expect(verify.isError).toBe(false);
    expect(verify.structuredContent.passed).toBe(true);
    expect(verify.structuredContent.digests.map((item: any) => item.actual)).toEqual([...FROZEN_DIGESTS]);
    const inspect = responses[3].result.structuredContent;
    expect(inspect.firstDivergence).toMatchObject({ seconds: 210, time: '03:30' });
    expect(inspect.names.a).toBe('Side entrance #10');
    expect(responses[4].result).toEqual({});
    // The ping was sent with Content-Length framing, so its answer is framed the same way.
    expect(result.stdout.toString('latin1')).toMatch(/Content-Length: \d+\r\n\r\n\{"jsonrpc":"2\.0","id":5,"result":\{\}\}$/);
  }, 90_000);

  it('reuses the cached bundle on the next start and keeps UI code out of it', async () => {
    expect(existsSync(bundle) && existsSync(manifest)).toBe(true);
    const before = statSync(bundle).mtimeMs;
    const result = await session([`${rpc('ping', undefined, 1)}\n`]);
    expect(result.code).toBe(0);
    expect(parse(result.stdout)).toEqual([{ jsonrpc: '2.0', id: 1, result: {} }]);
    expect(statSync(bundle).mtimeMs).toBe(before);
    const modules: string[] = JSON.parse(readFileSync(manifest, 'utf8')).modules.map((file: string) => file.replaceAll('\\', '/'));
    expect(modules).toContain(resolve('scripts/mcp/server.ts').replaceAll('\\', '/'));
    expect(modules.filter(file => /\/node_modules\/(?:react|react-dom|@xyflow|lucide-react)\//.test(file) || /\/src\/components\//.test(file))).toEqual([]);
  }, 60_000);

  it('rebuilds when a bundled module is newer than the cached build', async () => {
    const stale = JSON.parse(readFileSync(manifest, 'utf8'));
    stale.startedAt = 1;
    writeFileSync(manifest, JSON.stringify(stale));
    const before = statSync(bundle).mtimeMs;
    await new Promise(resolvePromise => setTimeout(resolvePromise, 20));
    const result = await session([`${rpc('ping', undefined, 1)}\n`]);
    expect(result.code).toBe(0);
    expect(statSync(bundle).mtimeMs).toBeGreaterThan(before);
    expect(JSON.parse(readFileSync(manifest, 'utf8')).startedAt).toBeGreaterThan(1);
  }, 60_000);

  it('keeps stdout free of diagnostics when the input is malformed', async () => {
    const result = await session(['not json\n', 'Content-Length: x\r\n\r\n']);
    expect(result.code).toBe(0);
    const responses = parse(result.stdout);
    expect(responses).toHaveLength(2);
    expect(responses.every(item => item.error.code === -32700 && item.id === null)).toBe(true);
    expect(result.stderr).toContain('ready');
  }, 60_000);
});

describe('isolation from the browser build', () => {
  it('has no reference to the MCP server anywhere under src/', () => {
    const files = (readdirSync(resolve('src'), { recursive: true }) as string[]).filter(name => /\.(?:tsx?|css|json)$/.test(name));
    expect(files.length).toBeGreaterThan(50);
    const offenders = files.filter(name => /scripts[\\/]mcp|ghost-rehearsal-mcp|ghost-rehearsal-engine|tools\/call/.test(readFileSync(resolve('src', name), 'utf8')));
    expect(offenders).toEqual([]);
  });
});
