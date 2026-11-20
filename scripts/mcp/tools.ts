/**
 * Read-only tools that expose the real Ghost Rehearsal engine to Kiro through MCP.
 * Development-time only: nothing under `src/**` imports this file and the browser build never reaches it.
 * The tools reuse the product's own modules; they add no second grouping rule, digest or card layout.
 */
import { createHash } from 'node:crypto';
import { readFileSync, realpathSync, statSync } from 'node:fs';
import { extname, isAbsolute, relative, resolve, sep } from 'node:path';
import { z } from 'zod';
import example from '../../examples/open-house.json';
import { comparisonContext, firstDifference, journeyOf, statisticsAt, visitorName } from '../../src/features/analysis';
import type { Difference, ResultBasis } from '../../src/features/analysis';
import { FATE_CARD_SIZE, buildFateCardSvg, fateCardFilename } from '../../src/features/fateCard';
import type { FateCardSide } from '../../src/features/fateCard';
import { createPackingExperiment, formatTime } from '../../src/features/project';
import { localizeDocument } from '../../src/i18n/example';
import { MESSAGES } from '../../src/i18n/messages';
import { deviceUnitIds, planSchema, projectDocumentSchema, validateDocument, validateGraph } from '../../src/schemas';
import type { Plan, ProjectDocument, Scenario, ValidationIssue } from '../../src/schemas';
import { simulate } from '../../src/simulation/engine';
import type { SimulationRun, Statistics } from '../../src/simulation/types';

/* ---------- Public types ---------- */

/** A failure the caller can act on (bad argument, unknown guest, missing final result, rejected path). */
export class ToolError extends Error {
  constructor(message: string) { super(message); this.name = 'ToolError'; }
}
/** The requested tool name does not exist. The protocol layer reports it as an invalid-params error. */
export class UnknownToolError extends Error {
  constructor(name: string) { super(`Unknown tool: ${name}`); this.name = 'UnknownToolError'; }
}
export interface ToolContext {
  /** Workspace root. `validate_event_project` reads files only inside it. */
  root: string;
}
export interface ToolDescriptor {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations: { readOnlyHint: true; destructiveHint: false; idempotentHint: true; openWorldHint: false };
}

/* ---------- Frozen reference ---------- */

/**
 * The six digests frozen in tests/ui-redesign-equivalence.test.ts, in the same order:
 * run mode outer (cutoff, run_to_completion), plan inner (A, B, C).
 * tests/mcp-server.test.ts reads that file and fails when these constants drift from it.
 */
export const FROZEN_DIGESTS = [
  'df372d76f1fb229fb7cf8b26bd0d957b4c6cc3bfe45ed47a7e1006c047bc6ac6',
  'e7d4e0dccb208abfe9e1760d3ab97d0df7744c56922adc215ff7bfba80fb89f1',
  'edf30f86b6bd6807e452d727877ef99f0852fcf520a08079f84f3114abc74462',
  '84ee5ea04ef52c06dee8fd56d098b163e058008979c81799e988d91e750ebb51',
  'e7be210f89f9c6824efaa39387704507bcc3172ca306c9ef88f7c6322457d9fe',
  '496a9b62f6790b6c9c5b3bdc40e55a0aa95f9dd2b5017a741050355170ff51f2',
] as const;
export const DEFAULT_VISITOR = 'side-stream:10';
export const MAX_PROJECT_BYTES = 5 * 1024 * 1024;

/* ---------- Baseline (the shipped example, A/B/C, memoised runs) ---------- */

type RunMode = 'cutoff' | 'run_to_completion';
const RUN_MODES: readonly RunMode[] = ['cutoff', 'run_to_completion'];
const PLAN_LABELS = ['A', 'B', 'C'] as const;
interface Baseline { document: ProjectDocument; scenario: Scenario; plans: [Plan, Plan, Plan] }
let baselineCache: Baseline | undefined;
const runCache = new Map<RunMode, [SimulationRun, SimulationRun, SimulationRun]>();

function baseline(): Baseline {
  if (baselineCache) return baselineCache;
  const document = projectDocumentSchema.parse(example);
  const packing = createPackingExperiment(document.plans[1], new Set(document.plans.map(plan => plan.id)), MESSAGES.en);
  if (!packing) throw new ToolError('createPackingExperiment could not derive plan C from plan B.');
  baselineCache = { document, scenario: document.scenarios[0], plans: [document.plans[0], document.plans[1], packing] };
  return baselineCache;
}
function runsFor(mode: RunMode): [SimulationRun, SimulationRun, SimulationRun] {
  let runs = runCache.get(mode);
  if (!runs) {
    const { scenario, plans } = baseline();
    runs = plans.map(plan => simulate({ schemaVersion: 1, plan, scenario, runMode: mode })) as [SimulationRun, SimulationRun, SimulationRun];
    runCache.set(mode, runs);
  }
  return runs;
}

const round3 = (value: number) => Math.round(value * 1000) / 1000;
const roundOrNull = (value: number | null) => value === null ? null : round3(value);

/* ---------- Arguments ---------- */

const visitorIdSchema = z.string().min(1).max(128).default(DEFAULT_VISITOR);
const basisSchema = z.enum(['cutoff', 'completion']).default('cutoff');
const langSchema = z.enum(['en', 'zh']).default('en');
const noArguments = z.strictObject({});
const guestArguments = z.strictObject({ visitorId: visitorIdSchema, basis: basisSchema, lang: langSchema });
const validateArguments = z.strictObject({ filePath: z.string().min(1).max(512).optional(), projectJson: z.string().optional() });

function parseArguments<S extends z.ZodType>(schema: S, args: unknown): z.output<S> {
  const result = schema.safeParse(args ?? {});
  if (result.success) return result.data;
  const detail = result.error.issues.map(issue => `${issue.path.join('.') || '(arguments)'}: ${issue.message}`).join('; ');
  throw new ToolError(`Invalid arguments: ${detail}`);
}

/* ---------- verify_simulation_invariants ---------- */

function metricsOf(run: SimulationRun, basis: ResultBasis) {
  const stats = statisticsAt(run, basis);
  if (!stats) return null;
  const { outcomes } = stats;
  return {
    until: stats.until, arrived: stats.arrived, notArrived: outcomes.not_arrived,
    completed: outcomes.completed, unfinished: outcomes.unfinished,
    left: outcomes.rejected + outcomes.dismissed + outcomes.diverted + outcomes.loop_limit,
    avgWait: roundOrNull(stats.averageWaiting), p90Wait: roundOrNull(stats.p90Waiting),
  };
}
function digestOf(run: SimulationRun): string {
  const { request: _request, ...result } = run;
  return createHash('sha256').update(JSON.stringify(result)).digest('hex');
}

export function verifySimulationInvariants(args: unknown = {}) {
  parseArguments(noArguments, args);
  const { plans } = baseline();
  const digests = RUN_MODES.flatMap((runMode, modeIndex) => runsFor(runMode).map((run, planIndex) => {
    const expected = FROZEN_DIGESTS[modeIndex * 3 + planIndex];
    const actual = digestOf(run);
    return { plan: PLAN_LABELS[planIndex], planId: plans[planIndex].id, runMode, status: run.status, expected, actual, match: actual === expected };
  }));
  const metric = (mode: RunMode, basis: ResultBasis) => {
    const [a, b, c] = runsFor(mode).map(run => metricsOf(run, basis));
    return { A: a, B: b, C: c };
  };
  return {
    passed: digests.every(item => item.match && item.status === 'succeeded'),
    matched: digests.filter(item => item.match).length,
    total: digests.length,
    digests,
    metrics: {
      cutoff: metric('cutoff', 'cutoff'),
      run_to_completion: metric('run_to_completion', 'completion'),
    },
    notes: [
      'digest = sha256(JSON.stringify(run without request)); the expected values are the six frozen digests in tests/ui-redesign-equivalence.test.ts.',
      'cutoff metrics are statistics at the observation cutoff; run_to_completion metrics are the final statistics at each run\'s actual end.',
      'avgWait and p90Wait include every arrived guest, including unfinished and early departures. left = rejected + dismissed + diverted + loop_limit.',
    ],
  };
}

/* ---------- Shared guest comparison (A versus B) ---------- */

interface GuestSide { plan: Plan; localPlan: Plan; run: SimulationRun; stats: Statistics; journey: ReturnType<typeof journeyOf>; outcome?: Statistics['visitors'][number] }
function compareGuest(args: z.output<typeof guestArguments>) {
  const { visitorId, basis, lang } = args;
  const { document, scenario, plans } = baseline();
  const mode: RunMode = basis === 'completion' ? 'run_to_completion' : 'cutoff';
  const runs = runsFor(mode);
  const [runA, runB] = runs;
  const context = comparisonContext(runA, runB, basis);
  if (context.status !== 'ready') {
    const reason = context.status === 'missing-final' ? 'a final (run-to-completion) result is missing; the cutoff is not substituted'
      : context.status === 'missing-run' ? 'a run did not succeed' : `the comparison is not ready (${context.status})`;
    throw new ToolError(`Cannot compare plans A and B on basis "${basis}": ${reason}.`);
  }
  if (!runs.slice(0, 2).every(run => run.population.some(person => person.id === visitorId))) {
    const sample = runA.population.slice(0, 3).map(person => person.id).join(', ');
    throw new ToolError(`Unknown guest "${visitorId}". Guest IDs look like ${sample}.`);
  }
  const localized = localizeDocument(document, 'zh', lang);
  const localScenario = localized.scenarios[0];
  const sides = [0, 1].map((index): GuestSide => {
    const run = runs[index];
    const stats = statisticsAt(run, basis)!;
    return { plan: plans[index], localPlan: localized.plans[index], run, stats, journey: journeyOf(run, visitorId, stats.until), outcome: stats.visitors.find(item => item.id === visitorId) };
  }) as [GuestSide, GuestSide];
  const difference = firstDifference(sides[0].journey, sides[1].journey, sides[0].plan, sides[1].plan);
  const cutoff = basis === 'completion' ? Math.max(...sides.map(side => side.stats.until)) : sides[0].stats.until;
  return { visitorId, basis, lang, context, scenario, localScenario, sides, difference, cutoff, t: MESSAGES[lang] };
}

/* ---------- inspect_guest_divergence ---------- */

function describeState(segment: Difference['a'], plan: Plan) {
  if (!segment) return null;
  return { state: segment.kind, nodeId: segment.nodeId ?? null, nodeName: plan.graph.nodes.find(node => node.id === segment.nodeId)?.name ?? null, since: round3(segment.start) };
}

export function inspectGuestDivergence(args: unknown = {}) {
  const parsed = parseArguments(guestArguments, args);
  const { visitorId, basis, lang, context, localScenario, sides, difference, cutoff, t } = compareGuest(parsed);
  const card = t.encore.fateCard;
  const [a, b] = sides;
  const names = sides.map(side => visitorName(visitorId, side.localPlan, localScenario));
  const sideResult = (side: GuestSide) => {
    const arrived = !!side.outcome && side.outcome.outcome !== 'not_arrived';
    return {
      planId: side.plan.id, planName: side.localPlan.name, until: round3(side.stats.until),
      outcome: side.outcome?.outcome ?? null,
      outcomeLabel: side.outcome ? t.outcomes[side.outcome.outcome] : null,
      waitingSeconds: arrived ? round3(side.outcome!.waiting) : null,
      waitingLabel: arrived ? t.formatWait(side.outcome!.waiting) : null,
    };
  };
  const resultA = sideResult(a), resultB = sideResult(b);
  const waitingDelta = resultA.waitingSeconds !== null && resultB.waitingSeconds !== null ? round3(resultB.waitingSeconds - resultA.waitingSeconds) : null;
  const basisLabel = basis === 'completion' ? card.basisFinal : card.basisCutoff(formatTime(cutoff));
  const text = lang === 'zh'
    ? { differ: (time: string) => `两种未来在 ${time} 首次分叉。`, same: '在可比较的时间范围内两种未来没有分叉。', side: (label: string, plan: string, side: ReturnType<typeof sideResult>) => `${label}（${plan}）：${side.outcomeLabel === null || side.waitingLabel === null ? '该口径下没有记录' : `${side.outcomeLabel}，总等待 ${side.waitingLabel}`}。`,
      delta: (value: string) => `等待差（B 减 A）：${value}。`, noDelta: '等待差：无数据。' }
    : { differ: (time: string) => `The two futures first differ at ${time}.`, same: 'The two futures do not differ within the compared span.', side: (label: string, plan: string, side: ReturnType<typeof sideResult>) => `${label} (${plan}): ${side.outcomeLabel === null || side.waitingLabel === null ? 'no record on this basis' : `${side.outcomeLabel}, total wait ${side.waitingLabel}`}.`,
      delta: (value: string) => `Waiting difference (B minus A): ${value}.`, noDelta: 'Waiting difference: no data.' };
  const deltaText = waitingDelta === null ? text.noDelta
    : text.delta(waitingDelta === 0 ? '0' : `${waitingDelta > 0 ? '+' : '\u2212'}${t.formatWait(Math.abs(waitingDelta))}`);
  const summary = [`${basisLabel}.`, `${names[0]} (${visitorId}).`, difference ? text.differ(formatTime(difference.time)) : text.same,
    text.side(card.planA, a.localPlan.name, resultA), text.side(card.planB, b.localPlan.name, resultB), deltaText].join(' ');
  return {
    visitorId, basis, lang,
    names: { a: names[0], b: names[1] },
    firstDivergence: difference ? {
      seconds: round3(difference.time), time: formatTime(difference.time),
      a: describeState(difference.a, a.localPlan), b: describeState(difference.b, b.localPlan),
    } : null,
    a: resultA,
    b: resultB,
    waitingDeltaSeconds: waitingDelta,
    waitingDeltaRule: 'B minus A, rounded to a millisecond',
    evidence: {
      basisLabel, statisticsEnd: basis === 'completion' ? 'final (each run\'s actual end)' : 'observation cutoff',
      population: context.population, pairedArrivedSample: context.sampleSize,
      guestInPairedSample: context.visitors.some(item => item.id === visitorId),
      sides: context.sides.map((side, index) => side && ({
        planId: side.planId, until: side.until, arrived: side.arrived, notArrived: side.notArrived,
        excludedUnpaired: side.unpaired, reachedHorizonWithUnfinished: side.runLimit, planName: sides[index].localPlan.name,
      })),
    },
    summary,
  };
}

/* ---------- render_fate_card_svg ---------- */

/** Text between tags is removed first, so a guest's name can never make the check fire or hide a problem. */
const UNSAFE_MARKUP = /<\s*(?:script|foreignObject|image|iframe|style)\b|\shref\s*=|:href\s*=|\son[a-z]+\s*=|url\(\s*(?!['"]?#)|https?:\/\/(?!www\.w3\.org\/2000\/svg["'\s>\/])|javascript:/i;
export function hasScriptOrExternalRef(svg: string): boolean {
  return UNSAFE_MARKUP.test(svg.replace(/>[^<]*</g, '><')) || /@import/i.test(svg);
}

export function renderFateCardSvg(args: unknown = {}) {
  const parsed = parseArguments(guestArguments, args);
  const { visitorId, basis, localScenario, scenario, sides, difference, cutoff, t } = compareGuest(parsed);
  const cardSides = sides.map((side): FateCardSide => ({ planName: side.localPlan.name, journey: side.journey, until: side.stats.until, outcome: side.outcome })) as [FateCardSide, FateCardSide];
  const svg = buildFateCardSvg({
    t, visitorId, visitorName: visitorName(visitorId, sides[0].localPlan, localScenario),
    eventName: localScenario.name ?? scenario.id, basis, cutoff, sides: cardSides, difference,
  });
  return {
    filename: fateCardFilename(visitorId),
    width: FATE_CARD_SIZE.width, height: FATE_CARD_SIZE.height,
    byteLength: Buffer.byteLength(svg, 'utf8'),
    hasScriptOrExternalRef: hasScriptOrExternalRef(svg),
    basis, lang: parsed.lang,
    svg,
  };
}

/* ---------- validate_event_project ---------- */

const insideRoot = (base: string, target: string) => {
  const local = relative(base, target);
  return local === '' || (local !== '..' && !local.startsWith(`..${sep}`) && !isAbsolute(local));
};
/** Reads a `.json` file that stays inside `root` after symbolic links are resolved. */
function readProjectFile(filePath: string, root: string): { text: string; path: string } {
  if (filePath.includes('\0')) throw new ToolError('filePath contains a NUL character.');
  if (extname(filePath).toLowerCase() !== '.json') throw new ToolError(`filePath must end in .json: ${filePath}`);
  let realRoot: string;
  try { realRoot = realpathSync(root); } catch { throw new ToolError('The workspace root is not readable.'); }
  const target = resolve(realRoot, filePath);
  const outside = new ToolError(`filePath is outside the workspace root: ${filePath}`);
  if (!insideRoot(realRoot, target)) throw outside;
  let real: string;
  try { real = realpathSync(target); } catch { throw new ToolError(`File not found: ${filePath}`); }
  if (!insideRoot(realRoot, real)) throw outside;
  const info = statSync(real);
  if (!info.isFile()) throw new ToolError(`Not a file: ${filePath}`);
  if (info.size > MAX_PROJECT_BYTES) throw new ToolError(`File is larger than ${MAX_PROJECT_BYTES} bytes: ${filePath}`);
  return { text: readFileSync(real, 'utf8'), path: relative(realRoot, real).split(sep).join('/') };
}

type ProjectIssue = ValidationIssue & { planId?: string };
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);

function planStats(plan: Plan) {
  const byType: Record<string, number> = {};
  for (const node of plan.graph.nodes) byType[node.type] = (byType[node.type] ?? 0) + 1;
  return {
    nodes: { total: plan.graph.nodes.length, byType },
    edges: plan.graph.edges.length,
    resources: {
      skills: plan.skills.length, staff: plan.staff.length, deviceTypes: plan.deviceTypes.length,
      deviceUnits: plan.deviceTypes.reduce((sum, device) => sum + deviceUnitIds(device).length, 0), assignments: plan.assignments.length,
    },
  };
}

export function validateEventProject(args: unknown = {}, context: ToolContext = defaultContext()) {
  const { filePath, projectJson } = parseArguments(validateArguments, args);
  let source: { kind: 'inline' } | { kind: 'file'; path: string };
  let text: string;
  if (projectJson !== undefined) {
    if (Buffer.byteLength(projectJson, 'utf8') > MAX_PROJECT_BYTES) throw new ToolError(`projectJson is larger than ${MAX_PROJECT_BYTES} bytes.`);
    text = projectJson;
    source = { kind: 'inline' };
  } else {
    const file = readProjectFile(filePath ?? 'examples/open-house.json', context.root);
    text = file.text;
    source = { kind: 'file', path: file.path };
  }
  let parsed: unknown;
  try { parsed = JSON.parse(text.replace(/^\uFEFF/, '')); } catch (error) {
    // The engine's message can quote the input, so only the position is kept.
    const position = /position (\d+)/.exec(error instanceof Error ? error.message : '')?.[1];
    const issue: ProjectIssue = { code: 'invalid_json', severity: 'error', message: `The text is not valid JSON${position ? ` (near character ${position})` : ''}.`, entityIds: [], path: [] };
    return { valid: false, source, errors: [issue], warnings: [] as ProjectIssue[], scenarios: [], plans: [] };
  }
  const issues: ProjectIssue[] = validateDocument(parsed);
  const document = record(parsed) ? parsed : {};
  const rawScenarios = Array.isArray(document.scenarios) ? document.scenarios : [];
  const rawPlans = Array.isArray(document.plans) ? document.plans : [];
  const plans = rawPlans.filter(record).map(raw => {
    const id = typeof raw.id === 'string' ? raw.id : null;
    const name = typeof raw.name === 'string' ? raw.name : null;
    const scenarioId = typeof raw.scenarioId === 'string' ? raw.scenarioId : null;
    const scenario = rawScenarios.find(item => record(item) && item.id === scenarioId);
    if (scenario) issues.push(...validateGraph(scenario, raw).map(issue => ({ ...issue, planId: id ?? undefined })));
    const result = planSchema.safeParse(raw);
    return { id, name, scenarioId, schemaValid: result.success, ...(result.success ? planStats(result.data) : {}) };
  });
  const scenarios = rawScenarios.filter(record).map(item => ({
    id: typeof item.id === 'string' ? item.id : null, name: typeof item.name === 'string' ? item.name : null,
    arrivalStreams: Array.isArray(item.arrivalStreams) ? item.arrivalStreams.length : null,
    observationCutoff: typeof item.observationCutoff === 'number' ? item.observationCutoff : null,
    horizon: typeof item.horizon === 'number' ? item.horizon : null,
  }));
  const errors = issues.filter(issue => issue.severity === 'error');
  return { valid: errors.length === 0, source, errors, warnings: issues.filter(issue => issue.severity === 'warning'), scenarios, plans };
}

/* ---------- Registry ---------- */

function defaultContext(): ToolContext {
  return { root: process.env.GHOST_REHEARSAL_ROOT || process.cwd() };
}
const guestProperties = {
  visitorId: { type: 'string', description: `Guest ID such as "${DEFAULT_VISITOR}" (stream ID, colon, number). Default "${DEFAULT_VISITOR}".`, default: DEFAULT_VISITOR, minLength: 1, maxLength: 128 },
  basis: { type: 'string', enum: ['cutoff', 'completion'], default: 'cutoff', description: '"cutoff" uses statistics at the observation cutoff. "completion" uses the final statistics of run-to-completion runs.' },
  lang: { type: 'string', enum: ['en', 'zh'], default: 'en', description: 'Language of names, labels and the summary.' },
};
const annotations = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false } as const;

export const TOOLS: readonly ToolDescriptor[] = [
  {
    name: 'verify_simulation_invariants', title: 'Verify simulation invariants', annotations,
    description: 'Runs the real engine for plans A, B and C of the open-house example in cutoff and run-to-completion modes (six runs), compares each result digest with the six frozen SHA-256 digests of tests/ui-redesign-equivalence.test.ts and returns passed, the per-run comparison and the core metrics (completed, unfinished, left, avgWait, p90Wait).',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'inspect_guest_divergence', title: 'Inspect guest divergence', annotations,
    description: 'Compares one guest\'s journey in plan A and plan B of the open-house example: names, first divergence time, outcome and total waiting on each side, the waiting difference (B minus A) and the comparison evidence (basis, statistics ends, sample sizes, excluded guests). Fails when a final result is required but missing; it never falls back to the cutoff.',
    inputSchema: { type: 'object', properties: guestProperties, additionalProperties: false },
  },
  {
    name: 'validate_event_project', title: 'Validate event project', annotations,
    description: 'Validates a Ghost Rehearsal project document with projectDocumentSchema and validateGraph. Reads filePath (a .json file inside the workspace, default examples/open-house.json) or, when given, the projectJson text. Returns valid, errors, warnings and per-plan node and resource counts. Invalid JSON gives valid=false with an invalid_json error.',
    inputSchema: {
      type: 'object', additionalProperties: false,
      properties: {
        filePath: { type: 'string', description: 'Workspace-relative path to a .json project file. Default "examples/open-house.json". Paths outside the workspace root are rejected.', default: 'examples/open-house.json', maxLength: 512 },
        projectJson: { type: 'string', description: 'Project document as JSON text. Takes precedence over filePath. At most 5 MB.' },
      },
    },
  },
  {
    name: 'render_fate_card_svg', title: 'Render fate card SVG', annotations,
    description: 'Builds the 1200x630 fate card SVG for one guest (plan A versus plan B) with the product\'s own buildFateCardSvg. Returns filename, width, height, byteLength, hasScriptOrExternalRef (computed from the SVG text) and the SVG source. It writes no file.',
    inputSchema: { type: 'object', properties: guestProperties, additionalProperties: false },
  },
];

export function callTool(name: string, args: unknown, context: ToolContext = defaultContext()): unknown {
  switch (name) {
    case 'verify_simulation_invariants': return verifySimulationInvariants(args);
    case 'inspect_guest_divergence': return inspectGuestDivergence(args);
    case 'validate_event_project': return validateEventProject(args, context);
    case 'render_fate_card_svg': return renderFateCardSvg(args);
    default: throw new UnknownToolError(name);
  }
}
