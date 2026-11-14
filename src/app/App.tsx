import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import type { Connection } from '@xyflow/react';
import {
  BookOpen, BookmarkPlus, Braces, ChevronDown, ChevronUp, CircleCheck, CircleHelp, Columns2, Copy, Download, FilePlus2, FileText, Flame, Gauge, Hammer,
  Hourglass, LayoutGrid, Maximize, Pause, Play, Redo2, RotateCcw, Save, ScrollText, Search, Sparkles, Square, Timer, TriangleAlert,
  MoreHorizontal, Plus, Trash2, Undo2, Upload, Users, WandSparkles,
} from 'lucide-react';
import { duplicatePlan, edgeSchema, nodeSchema, planSchema, PRODUCT_STATEMENT, scenarioSchema, validateGraph, validatePlan, validateScenario } from '../schemas';
import type { Edge, Node, Plan, ProjectDocument, RunRequest, Scenario } from '../schemas';
import { Canvas } from '../components/Canvas';
import { Inspector } from '../components/Inspector';
import { JsonEditor, Modal, ResourcesEditor, ScenarioEditor } from '../components/Dialogs';
import { Ghost, NodeIcon, Pumpkin } from '../components/Icons';
import { EmptyResults, EventLog, Insights, Journey, ResourceUse } from '../components/Results';
import type { PlanChange } from '../components/Results';
import { addNodeFromTemplate, addPlanFromTemplate, createNode, download, emptyProject, executionReport, formatTime, halloweenProject, initialDocument, newId, NODE_TYPES, readProject, templateLibrarySchema } from '../features/project';
import type { SavedTemplate } from '../features/project';
import { errorText, issueText, localizeDocument, useI18n, zodIssueText } from '../i18n';
import type { Lang, Messages } from '../i18n';
import { inputKey, populationSize, semanticKey } from '../simulation/input';
import { playbackAt } from '../simulation/metrics';
import type { SimulationRun } from '../simulation/types';

type Mode = 'Build' | 'Rehearse' | 'Compare';
type Dialog = 'resources' | 'scenario' | 'node-json' | 'edge-json' | 'plan-json' | 'scenario-json' | 'about' | 'export' | 'stress' | 'new' | 'templates' | 'save-template' | null;
type Notice = ((t: Messages) => string) | null;
type Tab = 'insights' | 'events' | 'journey' | 'resources';
const STORAGE_KEY = 'ghost-rehearsal.project.v1';
const TEMPLATES_KEY = 'ghost-rehearsal.templates.v1';
const MODES: { mode: Mode; icon: typeof Hammer }[] = [{ mode: 'Build', icon: Hammer }, { mode: 'Rehearse', icon: Play }, { mode: 'Compare', icon: Columns2 }];
const TABS: { tab: Tab; icon: typeof Sparkles }[] = [{ tab: 'insights', icon: Sparkles }, { tab: 'events', icon: ScrollText }, { tab: 'journey', icon: Users }, { tab: 'resources', icon: Gauge }];
const other = (lang: Lang): Lang => lang === 'en' ? 'zh' : 'en';
const cls = (...names: (string | false | undefined | null)[]) => names.filter(Boolean).join(' ');

function loadProject(lang: Lang): { document: ProjectDocument; notice: Notice; saved: boolean } {
  const example = () => localizeDocument(initialDocument(), 'zh', lang);
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const result = readProject(saved, lang);
      if (result.document) return { document: localizeDocument(result.document, other(lang), lang), notice: t => t.notices.restored, saved: true };
      return { document: example(), notice: t => t.notices.badSave, saved: false };
    }
  } catch { return { document: example(), notice: t => t.notices.noStorage, saved: false }; }
  return { document: example(), notice: null, saved: false };
}

export function App() {
  const { t, lang, setLang } = useI18n();
  const [loaded] = useState(() => loadProject(lang));
  const [project, setProject] = useState(loaded.document);
  const [savedText, setSavedText] = useState(loaded.saved ? JSON.stringify(loaded.document) : '');
  const [past, setPast] = useState<ProjectDocument[]>([]);
  const [future, setFuture] = useState<ProjectDocument[]>([]);
  const [planId, setPlanId] = useState(project.plans[0].id);
  const [secondId, setSecondId] = useState(project.plans[1]?.id ?? '');
  const [mode, setMode] = useState<Mode>('Build');
  const [runMode, setRunMode] = useState<RunRequest['runMode']>('cutoff');
  const [runs, setRuns] = useState<Record<string, SimulationRun>>({});
  const [selection, setSelection] = useState({ id: '', kind: 'node' as 'node' | 'edge', owner: planId });
  const [visitorId, setVisitorId] = useState('');
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [bottomTab, setBottomTab] = useState<Tab>('insights');
  const [dockOpen, setDockOpen] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [libraryTab, setLibraryTab] = useState<'nodes' | 'plans'>('plans');
  const [templates, setTemplates] = useState<SavedTemplate[]>(() => {
    try { return templateLibrarySchema.parse(JSON.parse(localStorage.getItem(TEMPLATES_KEY) ?? '[]')); } catch { return []; }
  });
  const [templateDraft, setTemplateDraft] = useState<SavedTemplate | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [templateError, setTemplateError] = useState('');
  const [notice, setNoticeState] = useState<Notice>(() => loaded.notice);
  const [showIssues, setShowIssues] = useState(false);
  const [fitToken, setFitToken] = useState(0);
  const [stressFactor, setStressFactor] = useState(1.25);
  const fileInput = useRef<HTMLInputElement>(null);
  const worker = useRef<Worker | null>(null);
  const say = (next: Notice) => setNoticeState(() => next);
  const plan = project.plans.find(item => item.id === planId) ?? project.plans[0];
  const scenario = project.scenarios.find(item => item.id === plan.scenarioId)!;
  const second = project.plans.find(item => item.id === secondId && item.id !== plan.id);
  const owner = project.plans.find(item => item.id === selection.owner) ?? plan;
  const selectedNode = selection.kind === 'node' ? owner.graph.nodes.find(node => node.id === selection.id) : undefined;
  const selectedEdge = selection.kind === 'edge' ? owner.graph.edges.find(edge => edge.id === selection.id) : undefined;
  const run = runs[plan.id];
  const secondRun = second ? runs[second.id] : undefined;
  const requestFor = (target: Plan, document = project): RunRequest => ({ schemaVersion: 1, scenario: document.scenarios.find(item => item.id === target.scenarioId)!, plan: target, runMode });
  const stale = !!run && run.inputKey !== inputKey(requestFor(plan));
  const secondStale = !!secondRun && !!second && secondRun.inputKey !== inputKey(requestFor(second));
  const comparisonReady = !!second && !!run && !!secondRun && run.status === 'succeeded' && secondRun.status === 'succeeded'
    && run.scenarioKey === secondRun.scenarioKey && run.request.runMode === secondRun.request.runMode && !stale && !secondStale;
  const endTime = Math.max(run?.coveredUntil ?? scenario.observationCutoff, mode === 'Compare' ? secondRun?.coveredUntil ?? 0 : 0);
  const issues = useMemo(() => [...validateScenario(scenario), ...validatePlan(plan), ...validateGraph(scenario, plan)], [scenario, plan]);
  const ownerIssues = owner.id === plan.id ? issues : [...validatePlan(owner), ...validateGraph(project.scenarios.find(item => item.id === owner.scenarioId)!, owner)];
  const errorCount = issues.filter(issue => issue.severity === 'error').length;
  const view = useMemo(() => playbackAt(run?.events ?? [], run?.request.plan ?? plan, time), [run, plan, time]);
  const secondView = useMemo(() => playbackAt(secondRun?.events ?? [], secondRun?.request.plan ?? second ?? plan, time), [secondRun, second, plan, time]);
  const changes = useMemo(() => {
    if (!second) return [];
    const result: PlanChange[] = [];
    const groups = [
      ['node', plan.graph.nodes, second.graph.nodes], ['edge', plan.graph.edges, second.graph.edges],
      ['staff', plan.staff, second.staff], ['device', plan.deviceTypes, second.deviceTypes],
    ] as const;
    for (const [kind, a, b] of groups) for (const id of new Set([...a.map(item => item.id), ...b.map(item => item.id)])) {
      const left = a.find(item => item.id === id); const right = b.find(item => item.id === id);
      if (semanticKey(left) !== semanticKey(right)) result.push({ id, kind, label: !left ? 'added' : !right ? 'removed' : 'modified' });
    }
    for (const id of new Set([...plan.assignments.map(item => item.resourceUnitId), ...second.assignments.map(item => item.resourceUnitId)])) {
      if (semanticKey(plan.assignments.find(item => item.resourceUnitId === id)) !== semanticKey(second.assignments.find(item => item.resourceUnitId === id))) result.push({ id, label: 'modified', kind: 'assignment' });
    }
    return result;
  }, [plan, second]);
  const changedIds = useMemo(() => new Set(changes.map(change => change.id)), [changes]);
  const unsaved = JSON.stringify(project) !== savedText;

  function commit(next: ProjectDocument) {
    if (JSON.stringify(next) === JSON.stringify(project)) return;
    setPast(items => [...items, project].slice(-100)); setFuture([]); setProject(next);
  }
  function changePlan(next: Plan) { commit({ ...project, plans: project.plans.map(item => item.id === next.id ? next : item) }); }
  function undo() { if (!past.length) return; setProject(past.at(-1)!); setPast(past.slice(0, -1)); setFuture([project, ...future]); setPlaying(false); }
  function redo() { if (!future.length) return; setProject(future[0]); setFuture(future.slice(1)); setPast([...past, project]); setPlaying(false); }
  function selectPlan(id: string) {
    const target = project.plans.find(item => item.id === id);
    if (!project.plans.some(item => item.id === secondId && item.id !== id && item.scenarioId === target?.scenarioId)) setSecondId(project.plans.find(item => item.id !== id && item.scenarioId === target?.scenarioId)?.id ?? '');
    setPlanId(id); setSelection({ id: '', kind: 'node', owner: id }); setSearch(''); setInspectorOpen(false); setPlaying(false); setTime(0); if (mode === 'Compare') setMode('Build');
  }
  function save() {
    const result = readProject(JSON.stringify(project), lang);
    if (result.error) { const error = result.error; say(tr => tr.notices.fixBeforeSave(error)); return; }
    try { const text = JSON.stringify(project); localStorage.setItem(STORAGE_KEY, text); setSavedText(text); say(tr => tr.notices.saved); }
    catch { say(tr => tr.notices.saveFailed); }
  }
  function openLibrary(tab: 'nodes' | 'plans') { setLibraryTab(tab); setTemplateError(''); setDialog('templates'); }
  function prepareTemplate(node?: Node) {
    const target = node ? owner : plan;
    const draft: SavedTemplate = { id: newId('template', templates.map(item => item.id)), name: node?.name ?? target.name,
      ...(node ? { nodeId: node.id } : {}), document: structuredClone({ ...project, plans: [target], scenarios: project.scenarios.filter(item => item.id === target.scenarioId) }) };
    if (!templateLibrarySchema.safeParse([draft]).success) { say(tr => tr.templates.invalid); return; }
    setTemplateDraft(draft); setTemplateName(draft.name); setTemplateError(''); setDialog('save-template');
  }
  function persistTemplates(next: SavedTemplate[]) {
    try { localStorage.setItem(TEMPLATES_KEY, JSON.stringify(next)); setTemplates(next); return true; }
    catch { setTemplateError(t.templates.saveFailed); return false; }
  }
  function usePlanTemplate(document: ProjectDocument, name: string) {
    const next = addPlanFromTemplate(project, document, name);
    const added = next.plans.at(-1)!;
    commit(next); setPlanId(added.id); setSecondId(''); setMode('Build'); setPlaying(false); setTime(0); setSearch(''); setInspectorOpen(false); setDockOpen(false);
    setSelection({ id: '', kind: 'node', owner: added.id }); setDialog(null); say(tr => tr.templates.added);
  }
  function useNodeTemplate(template: SavedTemplate) {
    if (mode !== 'Build') return;
    const added = addNodeFromTemplate(plan, scenario, template);
    changePlan(added.plan); setSelection({ id: added.node.id, kind: 'node', owner: plan.id }); setFitToken(value => value + 1); setDialog(null); say(tr => tr.templates.added);
  }
  function switchLanguage(next: Lang) {
    if (next === lang) return;
    const relabel = (document: ProjectDocument) => localizeDocument(document, lang, next);
    setProject(relabel(project)); setPast(past.map(relabel)); setFuture(future.map(relabel));
    if (savedText) setSavedText(JSON.stringify(relabel(JSON.parse(savedText) as ProjectDocument)));
    setRuns(previous => Object.fromEntries(Object.entries(previous).map(([id, result]) => {
      const names = localizeDocument({ scenarios: [result.request.scenario], plans: [result.request.plan] }, lang, next);
      return [id, { ...result, request: { ...result.request, scenario: names.scenarios[0], plan: names.plans[0] } }];
    })));
    setLang(next);
  }
  function chooseVisitor(id: string) { setVisitorId(id); setBottomTab('journey'); setDockOpen(true); setPlaying(false); }
  function launch(targets: Plan[], destination: Mode, document = project) {
    if (targets.length === 2 && targets[0].scenarioId !== targets[1].scenarioId) { say(tr => tr.notices.sameScenario); return; }
    setBusy(true); setPlaying(false); say(tr => tr.notices.computing);
    worker.current?.terminate();
    const active = new Worker(new URL('../simulation/worker.ts', import.meta.url), { type: 'module' });
    worker.current = active;
    active.onmessage = (event: MessageEvent<{ runs?: SimulationRun[]; error?: string }>) => {
      setBusy(false); active.terminate(); worker.current = null;
      if (event.data.error || !event.data.runs) { const error = event.data.error; say(tr => tr.notices.runFailed(error ? errorText(error, tr.lang) : tr.notices.noResult)); return; }
      const results = event.data.runs;
      const failed = results.find(result => result.status === 'failed' || (destination === 'Compare' && result.status !== 'succeeded'));
      if (failed) { const failures = failed.issues.filter(issue => issue.severity === 'error').slice(0, 3); say(tr => failures.map(issue => issueText(issue, tr.lang)).join(tr.lang === 'zh' ? '；' : '; ')); setShowIssues(true); return; }
      setRuns(previous => ({ ...previous, ...Object.fromEntries(results.map(result => [result.request.plan.id, result])) }));
      setMode(destination); setTime(0); setSpeed(1); setPlaying(true); setDockOpen(true); setSelection({ id: '', kind: 'node', owner: targets[0].id });
      const people = results[0].population.length; const total = results.reduce((sum, result) => sum + result.events.length, 0);
      say(results.some(result => result.status === 'aborted') ? tr => tr.notices.aborted : tr => tr.notices.done(people, total.toLocaleString(tr.lang === 'zh' ? 'zh-CN' : 'en-US')));
    };
    active.onerror = () => { setBusy(false); say(tr => tr.notices.workerFailed); active.terminate(); };
    active.postMessage({ requests: targets.map(target => requestFor(target, document)) });
  }
  function switchMode(next: Mode) {
    setPlaying(false);
    if (next === 'Build') { setMode(next); setSelection({ id: '', kind: 'node', owner: plan.id }); return; }
    if (next === 'Compare') {
      if (!second) { say(tr => tr.notices.needSecond); return; }
      if (!comparisonReady) launch([plan, second], next);
      else { setMode(next); setTime(0); setPlaying(true); }
    } else if (!run || stale || run.status === 'failed') launch([plan], next);
    else { setMode(next); setTime(0); setPlaying(true); }
  }
  function copyPlan() {
    const result = duplicatePlan(plan, new Set(project.plans.map(item => item.id)));
    if (!result.ok) { say(tr => tr.notices.copyFormat); return; }
    if (lang === 'zh') result.plan.name = result.plan.name.replace(/ \(copy\)$/, t.defaults.copySuffix);
    commit({ ...project, plans: [...project.plans, result.plan] });
    selectPlan(result.plan.id); setSecondId(plan.id);
    setMode('Build'); say(tr => tr.notices.copied);
  }
  function addNode(type: Node['type'], position = { x: 350 + (plan.graph.nodes.length % 3) * 240, y: 180 + Math.floor(plan.graph.nodes.length / 3) * 150 }) {
    if (mode !== 'Build') return;
    const node = createNode(type, plan, scenario, position, t.nodeTypes[type]);
    changePlan({ ...plan, graph: { ...plan.graph, nodes: [...plan.graph.nodes, node] } }); setSelection({ id: node.id, kind: 'node', owner: plan.id }); setFitToken(value => value + 1);
  }
  function connect(connection: Connection) {
    if (mode !== 'Build') return;
    const source = plan.graph.nodes.find(node => node.id === connection.source);
    const id = newId('route', plan.graph.edges.map(edge => edge.id));
    const edge: Edge = { id, source: connection.source, target: connection.target, ...(source?.type === 'decision' ? { branchKey: connection.sourceHandle ?? source.routing.branches[0].branchKey } : {}) };
    changePlan({ ...plan, graph: { nodes: plan.graph.nodes.map(node => node.id === edge.target && node.type === 'merge' ? { ...node, incomingPriority: [...node.incomingPriority.filter(key => plan.graph.edges.some(item => item.id === key)), id] } : node), edges: [...plan.graph.edges, edge] } });
  }
  function deleteElements(nodeIds: string[], edgeIds: string[]) {
    if (mode !== 'Build' || (!nodeIds.length && !edgeIds.length)) return;
    const edges = plan.graph.edges.filter(edge => !edgeIds.includes(edge.id) && !nodeIds.includes(edge.source) && !nodeIds.includes(edge.target));
    changePlan({ ...plan, graph: { edges, nodes: plan.graph.nodes.filter(node => !nodeIds.includes(node.id)).map(node => node.type === 'subflow' ? { ...node, memberNodeIds: node.memberNodeIds.filter(id => !nodeIds.includes(id)) }
      : node.type === 'merge' ? { ...node, incomingPriority: node.incomingPriority.filter(id => edges.some(edge => edge.id === id)).length ? node.incomingPriority.filter(id => edges.some(edge => edge.id === id)) : ['connect-an-edge'] } : node) },
      assignments: plan.assignments.map(assignment => ({ ...assignment, periods: assignment.periods.map(period => ({ ...period, nodeIds: period.nodeIds.filter(id => !nodeIds.includes(id)) })) })) });
    setSelection({ id: '', kind: 'node', owner: plan.id });
  }
  function arrange() {
    const levels = new Map<string, number>();
    const pending = plan.graph.nodes.filter(node => node.type === 'entrance').map(node => ({ id: node.id, level: 0 }));
    while (pending.length) { const item = pending.shift()!; if (levels.has(item.id)) continue; levels.set(item.id, item.level); plan.graph.edges.filter(edge => edge.source === item.id).forEach(edge => pending.push({ id: edge.target, level: item.level + 1 })); }
    const rows = new Map<number, number>();
    changePlan({ ...plan, graph: { ...plan.graph, nodes: plan.graph.nodes.map(node => { const column = levels.get(node.id) ?? 0; const row = rows.get(column) ?? 0; rows.set(column, row + 1); return { ...node, layout: { ...node.layout, x: column * 260, y: row * 180 + (node.type === 'subflow' ? 600 : 80) } }; }) } });
    setFitToken(value => value + 1);
  }
  function stress() {
    if (!second) { say(tr => tr.notices.stressNeedsTwo); return; }
    const newScenario: Scenario = { ...structuredClone(scenario), id: newId('stress', project.scenarios.map(item => item.id)), name: t.dialogs.stressScenario(scenario.name ?? t.defaults.fallbackEvent).slice(0, 100), sourceScenarioId: scenario.id,
      assumptionOverrides: [...scenario.assumptionOverrides.filter(item => item.kind !== 'service_multiplier' || item.stageKey), { kind: 'service_multiplier', factor: stressFactor }] };
    const ids = new Set(project.plans.map(item => item.id));
    const copies: Plan[] = [];
    for (const original of [plan, second]) { const result = duplicatePlan(original, ids); if (!result.ok) { say(tr => tr.notices.planFormat); return; } result.plan.scenarioId = newScenario.id; result.plan.name = t.dialogs.stressPlan(original.name.slice(0, 75)); ids.add(result.plan.id); copies.push(result.plan); }
    const next = { ...project, scenarios: [...project.scenarios, newScenario], plans: [...project.plans, ...copies] };
    commit(next); setPlanId(copies[0].id); setSecondId(copies[1].id); setDialog(null); launch(copies, 'Compare', next);
  }
  function jumpDifference() {
    if (!visitorId || !run || !secondRun) return;
    const a = run.events.filter(event => event.participantId === visitorId && event.type !== 'RUN_WARNING');
    const b = secondRun.events.filter(event => event.participantId === visitorId && event.type !== 'RUN_WARNING');
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      const left = a[i], right = b[i];
      const leftNode = run.request.plan.graph.nodes.find(node => node.id === left?.nodeId);
      const rightNode = secondRun.request.plan.graph.nodes.find(node => node.id === right?.nodeId);
      const corresponding = left?.nodeId === right?.nodeId || (leftNode?.type === 'service' && rightNode?.type === 'service' && leftNode.stageKey === rightNode.stageKey);
      if (!left || !right || left.type !== right.type || left.time !== right.time || !corresponding) { setTime(Math.min(left?.time ?? Infinity, right?.time ?? Infinity)); setPlaying(false); setSelection({ id: left?.nodeId ?? '', kind: 'node', owner: plan.id }); return; }
    }
    say(tr => tr.notices.noDifference);
  }
  function startNew(next: ProjectDocument) {
    commit(next); setPlanId(next.plans[0].id); setSecondId(next.plans[1]?.id ?? ''); setRuns({}); setMode('Build'); setPlaying(false); setTime(0); setVisitorId(''); setSearch(''); setInspectorOpen(false); setDockOpen(false);
    setSelection({ id: '', kind: 'node', owner: next.plans[0].id }); setDialog(null);
  }
  useEffect(() => {
    if (!playing) return;
    let previous = performance.now();
    const timer = setInterval(() => { const current = performance.now(); const delta = (current - previous) / 1000 * 30 * speed; previous = current; setTime(value => Math.min(endTime, value + delta)); }, 100);
    return () => clearInterval(timer);
  }, [playing, speed, endTime]);
  useEffect(() => { if (time >= endTime) setPlaying(false); }, [time, endTime]);
  useEffect(() => { setFitToken(value => value + 1); }, [mode, dockOpen, inspectorOpen]);
  useEffect(() => { if (selection.id) setInspectorOpen(true); }, [selection.id, selection.kind, selection.owner]);
  useEffect(() => () => worker.current?.terminate(), []);
  useEffect(() => {
    const handle = (event: KeyboardEvent) => {
      if (dialog) return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') { event.preventDefault(); save(); return; }
      if (event.target instanceof HTMLElement && event.target.closest('input, textarea, select, [contenteditable="true"]')) return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); event.shiftKey ? redo() : undo(); }
      // A focused button or link keeps its native Space activation.
      if (event.code === 'Space' && run && mode !== 'Build' && !(event.target instanceof HTMLElement && event.target.closest('button, a'))) { event.preventDefault(); setPlaying(value => !value); }
    };
    window.addEventListener('keydown', handle); return () => window.removeEventListener('keydown', handle);
  });

  const stats = run?.statistics;
  const secondStats = mode === 'Compare' && comparisonReady ? secondRun?.statistics : undefined;
  const planNodes = plan.graph.nodes.filter(node => `${node.name} ${t.nodeTypes[node.type]}`.toLowerCase().includes(search.toLowerCase()));
  const activeEvents = (run?.events ?? []).filter(event => event.time <= time).slice(-80).reverse();
  const readOnly = mode !== 'Build';
  const staffCount = plan.staff.length;
  const deviceCount = plan.deviceTypes.reduce((sum, item) => sum + item.quantity, 0);
  const progress = endTime ? Math.min(100, time / endTime * 100) : 0;
  const bounds = plan.graph.nodes.reduce((box, node) => ({ minX: Math.min(box.minX, node.layout.x), maxX: Math.max(box.maxX, node.layout.x), minY: Math.min(box.minY, node.layout.y), maxY: Math.max(box.maxY, node.layout.y) }), { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity });
  const splitRows = !plan.graph.nodes.length || (bounds.maxX - bounds.minX + 240) >= (bounds.maxY - bounds.minY + 140);
  const scenarioNameOf = (target: Plan) => project.scenarios.find(item => item.id === target.scenarioId)?.name ?? target.scenarioId;

  type Metric = { key: string; label: string; icon: ReactNode; value: string; hint: string; b?: string; delta?: { text: string; good: boolean } | null };
  const delta = (a: number | null | undefined, b: number | null | undefined, higherIsBetter: boolean, format: (value: number) => string) => {
    if (a == null || b == null || Math.abs(b - a) < 1e-9) return null;
    return { text: `${b > a ? '+' : '−'}${format(Math.abs(b - a))}`, good: higherIsBetter ? b > a : b < a };
  };
  const metrics: Metric[] = run ? [
    { key: 'completed', label: t.metrics.completed, icon: <CircleCheck size={14} aria-hidden="true" />, value: stats ? String(stats.outcomes.completed) : '—', hint: stats ? t.metrics.completedHint(stats.arrived) : '',
      b: secondStats ? String(secondStats.outcomes.completed) : undefined, delta: secondStats && stats ? delta(stats.outcomes.completed, secondStats.outcomes.completed, true, String) : null },
    { key: 'average', label: t.metrics.average, icon: <Hourglass size={14} aria-hidden="true" />, value: t.formatWait(stats?.averageWaiting), hint: t.metrics.averageHint,
      b: secondStats ? t.formatWait(secondStats.averageWaiting) : undefined, delta: secondStats ? delta(stats?.averageWaiting, secondStats.averageWaiting, false, t.formatWait) : null },
    { key: 'p90', label: t.metrics.p90, icon: <Timer size={14} aria-hidden="true" />, value: t.formatWait(stats?.p90Waiting), hint: t.metrics.p90Hint,
      b: secondStats ? t.formatWait(secondStats.p90Waiting) : undefined, delta: secondStats ? delta(stats?.p90Waiting, secondStats.p90Waiting, false, t.formatWait) : null },
    { key: 'unfinished', label: t.metrics.unfinished, icon: <Ghost size={14} />, value: stats ? String(stats.outcomes.unfinished) : '—', hint: stats ? t.metrics.unfinishedHint(stats.outcomes.rejected + stats.outcomes.dismissed + stats.outcomes.diverted + stats.outcomes.loop_limit) : '',
      b: secondStats ? String(secondStats.outcomes.unfinished) : undefined, delta: secondStats && stats ? delta(stats.outcomes.unfinished, secondStats.outcomes.unfinished, false, String) : null },
  ] : [
    { key: 'guests', label: t.metrics.guests, icon: <Ghost size={14} />, value: String(populationSize(scenario)), hint: t.metrics.guestsHint(plan.graph.nodes.filter(node => node.type === 'entrance').length) },
    { key: 'window', label: t.metrics.window, icon: <Timer size={14} aria-hidden="true" />, value: t.metrics.minutes(Math.round(scenario.observationCutoff / 60)), hint: t.metrics.windowHint(Math.round(scenario.horizon / 60)) },
    { key: 'team', label: t.metrics.team, icon: <Users size={14} aria-hidden="true" />, value: String(staffCount + deviceCount), hint: t.metrics.teamHint(staffCount, deviceCount) },
    { key: 'flow', label: t.metrics.flow, icon: <LayoutGrid size={14} aria-hidden="true" />, value: t.metrics.nodesValue(plan.graph.nodes.filter(node => node.type !== 'subflow').length), hint: t.metrics.flowHint(plan.graph.edges.length) },
  ];

  function canvasProps(target: Plan, targetRun: SimulationRun | undefined, targetView: typeof view, outdated: boolean) {
    let selected = selection.id;
    if (selectedNode && !target.graph.nodes.some(node => node.id === selected) && selectedNode.type === 'service') selected = target.graph.nodes.find(node => node.type === 'service' && node.stageKey === selectedNode.stageKey)?.id ?? '';
    return { plan: target, selected, onSelect: (id: string, kind: 'node' | 'edge') => setSelection({ id, kind, owner: target.id }),
      onMove: (positions: { id: string; x: number; y: number }[]) => changePlan({ ...target, graph: { ...target.graph, nodes: target.graph.nodes.map(node => { const position = positions.find(item => item.id === node.id); return position ? { ...node, layout: { ...node.layout, x: position.x, y: position.y } } : node; }) } }),
      onConnect: connect, onDelete: deleteElements, onAdd: addNode, editable: !readOnly, issues: target.id === plan.id ? issues : validateGraph(scenario, target), view: targetView,
      run: mode === 'Build' ? undefined : targetRun, stale: outdated, selectedVisitor: visitorId, chooseVisitor, changed: mode === 'Compare' ? changedIds : undefined, fitToken };
  }

  const stageTitle = mode === 'Build' ? plan.name : mode === 'Compare' ? t.stage.compare : t.stage.rehearse;
  const stageSub = mode === 'Build' ? t.stage.counts(plan.graph.nodes.length, plan.graph.edges.length) : `${formatTime(time)} / ${formatTime(endTime)}`;

  return <div className={`app mode-${mode.toLowerCase()}`}>
    <header className="topbar">
      <div className="brand">
        <div className="brand-mark"><Ghost size={22} /></div>
        <div className="brand-text"><strong>{t.brand.name}</strong><small>{t.brand.tagline}</small></div>
      </div>
      <nav className="mode-switch" role="tablist" aria-label={t.modes.label}>
        {MODES.map(({ mode: item, icon: Icon }) => <button type="button" role="tab" aria-selected={mode === item} key={item} className={mode === item ? 'active' : ''} disabled={busy} onClick={() => switchMode(item)}>
          <Icon size={15} aria-hidden="true" /><span>{t.modes[item]}</span>
        </button>)}
      </nav>
      <div className="topbar-spacer" />
      <div className="command-group">
        <button type="button" className="icon-btn" title={t.header.undo} aria-label={t.header.undo} disabled={!past.length || busy} onClick={undo}><Undo2 size={17} /></button>
        <button type="button" className="icon-btn" title={t.header.redo} aria-label={t.header.redo} disabled={!future.length || busy} onClick={redo}><Redo2 size={17} /></button>
        <span className="divider" />
        {busy
          ? <button type="button" className="btn run is-busy" onClick={() => { worker.current?.terminate(); setBusy(false); say(tr => tr.notices.cancelled); }}><Square size={13} aria-hidden="true" />{t.run.stop}</button>
          : <button type="button" className="btn run" onClick={() => launch(mode === 'Compare' && second ? [plan, second] : [plan], mode === 'Compare' ? 'Compare' : 'Rehearse')}><Ghost size={16} />{t.run.start}</button>}
      </div>
      <div className="file-group">
        <button type="button" className="btn ghost" onClick={save} title={t.header.saveTitle}><Save size={15} aria-hidden="true" /><span>{t.header.save}</span></button>
        <details className="workspace-menu">
          <summary className="icon-btn" aria-label={t.header.more} title={t.header.more}><MoreHorizontal size={19} /></summary>
          <div className="workspace-menu-body" onClick={event => { if ((event.target as HTMLElement).closest('button')) event.currentTarget.parentElement?.removeAttribute('open'); }}>
            <button type="button" className="side-action" onClick={() => fileInput.current?.click()}><Upload size={15} />{t.header.import}</button>
            <button type="button" className="side-action" onClick={() => setDialog('export')}><Download size={15} />{t.header.export}</button>
            <button type="button" className="side-action" onClick={() => setDialog('plan-json')}><Braces size={15} />{t.sidebar.planJson}</button>
            <button type="button" className="side-action" onClick={() => setDialog('scenario-json')}><FileText size={15} />{t.sidebar.scenarioJson}</button>
            <label className="field"><span>{t.run.scope}</span><select aria-label={t.run.scope} value={runMode} disabled={busy} onChange={event => { setPlaying(false); setRunMode(event.target.value as RunRequest['runMode']); }}><option value="cutoff">{t.run.cutoff}</option><option value="run_to_completion">{t.run.completion}</option></select></label>
            <button type="button" className="side-action" onClick={() => setDialog('about')}><CircleHelp size={15} />{t.header.about}</button>
          </div>
        </details>
      </div>
      <div className="lang-switch" role="group" aria-label={t.language.label}>
        {(['en', 'zh'] as Lang[]).map(item => <button type="button" key={item} aria-pressed={lang === item} className={lang === item ? 'active' : ''} onClick={() => switchLanguage(item)} lang={item === 'zh' ? 'zh-CN' : 'en'}>{t.language[item]}</button>)}
      </div>
    </header>

    <div className="workspace">
      <aside className="sidebar">
        <section className="side-section event-card">
          <div className="event-eyebrow"><span className="eyebrow">{t.sidebar.event}</span><span className={cls('save-pill', unsaved && 'unsaved')}>{unsaved ? t.header.unsaved : t.header.saved}</span></div>
          <h2 className="event-title">{scenario.name ?? t.header.untitled}</h2>
          <button type="button" className="side-link" onClick={() => { setMode('Build'); setPlaying(false); setDialog('scenario'); }}><Ghost size={15} /><span>{t.sidebar.guests}</span><b>{populationSize(scenario)}</b></button>
          <button type="button" className="side-link" onClick={() => { setMode('Build'); setPlaying(false); setDialog('resources'); }}><Users size={15} aria-hidden="true" /><span>{t.sidebar.resources}</span><b>{staffCount + deviceCount}</b></button>
        </section>
        <section className="side-section">
          <div className="section-heading"><h2>{t.sidebar.plans}</h2><div className="section-actions"><button type="button" className="icon-btn" aria-label={t.templates.savePlan} title={t.templates.savePlan} disabled={busy} onClick={() => prepareTemplate()}><BookmarkPlus size={16} /></button><button type="button" className="icon-btn" aria-label={t.sidebar.duplicate} title={t.sidebar.duplicate} disabled={busy} onClick={copyPlan}><Copy size={16} /></button></div></div>
          <ul className="plan-list">{project.plans.map(item => {
            const isA = item.id === plan.id; const isB = item.id === second?.id;
            return <li key={item.id} className={cls('plan-card', isA && 'is-a', isB && 'is-b')}>
              <button type="button" className="plan-main" aria-pressed={isA} onClick={() => selectPlan(item.id)}>
                <span className="plan-badge">{isA ? t.sidebar.currentBadge : isB ? t.sidebar.secondBadge : ''}</span>
                <span className="plan-text"><b>{item.name}</b><small>{scenarioNameOf(item)}</small></span>
              </button>
              {!isA && !isB && item.scenarioId === plan.scenarioId && <button type="button" className="plan-setb" title={t.sidebar.setB} aria-label={`${t.sidebar.setB}: ${item.name}`} onClick={() => { setSecondId(item.id); setPlaying(false); }}>B</button>}
            </li>;
          })}</ul>
        </section>
        <section className="side-section palette-section">
          <div className="section-heading"><h2>{t.sidebar.nodes}<span className="node-count">{plan.graph.nodes.length}</span></h2><button type="button" className="icon-btn add-node" disabled={readOnly} aria-label={t.sidebar.addNode} title={t.sidebar.addNode} onClick={() => openLibrary('nodes')}><Plus size={17} /></button></div>
          <label className="search-box"><Search size={14} aria-hidden="true" /><input aria-label={t.sidebar.searchLabel} placeholder={t.sidebar.search} value={search} onChange={event => setSearch(event.target.value)} /></label>
          <div className="plan-nodes">{planNodes.map(node => <button type="button" key={node.id} className={cls('plan-node', `type-${node.type}`, selection.id === node.id && selection.owner === plan.id && 'active')} onClick={() => setSelection({ id: node.id, kind: 'node', owner: plan.id })}>
            <NodeIcon type={node.type} size={15} /><span>{node.name}</span>
          </button>)}{!planNodes.length && <p className="subtle">{plan.graph.nodes.length ? t.sidebar.noMatch : t.sidebar.emptyNodes}</p>}</div>
        </section>
        <section className="side-section side-footer">
          <button type="button" className="side-action template-launch" disabled={busy} onClick={() => openLibrary('plans')}><BookOpen size={17} aria-hidden="true" />{t.templates.browse}<span>↗</span></button>
          <button type="button" className="side-action" onClick={() => setDialog('new')}><FilePlus2 size={15} aria-hidden="true" />{t.sidebar.newProject}</button>
        </section>
      </aside>

      <main className="stage">
        <div className="stage-head">
          <div className="stage-title"><span className={cls('live-dot', mode !== 'Build' && 'on')} /><h1>{stageTitle}</h1><small>{stageSub}</small></div>
          <div className="stage-tools">
            <button type="button" className={cls('check-chip', errorCount ? 'bad' : issues.length ? 'warn' : 'ok')} aria-expanded={showIssues} onClick={() => setShowIssues(value => !value)}>
              {errorCount ? <TriangleAlert size={14} aria-hidden="true" /> : <CircleCheck size={14} aria-hidden="true" />}{errorCount ? t.stage.toFix(errorCount) : issues.length ? t.stage.notices(issues.length) : t.stage.passed}
            </button>
            <button type="button" className="btn ghost small" title={t.stage.arrange} onClick={arrange} disabled={busy}><WandSparkles size={14} aria-hidden="true" /><span className="btn-label">{t.stage.arrange}</span></button>
            <button type="button" className="btn ghost small" title={t.stage.fit} onClick={() => setFitToken(value => value + 1)}><Maximize size={14} aria-hidden="true" /><span className="btn-label">{t.stage.fit}</span></button>
          </div>
        </div>
        {mode !== 'Build' && <div className={cls('metrics-strip', !run && 'is-summary', secondStats && 'is-compare')}>{metrics.map(item => <div className={`metric-card m-${item.key}`} key={item.key}>
          <span className="metric-label">{item.icon}<span className="metric-name">{item.label}</span>{run && stale && <em>{t.metrics.stale}</em>}</span>
          {item.b !== undefined ? <div className="ab-stack">
            <strong className="metric-value"><span className="ab-value"><i>A</i>{item.value}</span></strong>
            <strong className="metric-value"><span className="ab-value alt"><i>B</i>{item.b}</span>{item.delta && <span className={cls('delta', item.delta.good ? 'good' : 'bad')}>{item.delta.text}</span>}</strong>
          </div> : <>
            <strong className="metric-value">{item.value}</strong>
            <small className="metric-hint">{item.hint}</small>
          </>}
        </div>)}</div>}
        <div className={cls('canvas-area', mode === 'Compare' && second && (splitRows ? 'split rows' : 'split cols'))}>
        {showIssues && <div className="checks-drawer" role="region" aria-label={t.stage.checksTitle}>
          <div className="section-heading"><b>{t.stage.checksTitle}</b><button type="button" className="icon-btn" aria-label={t.stage.closeChecks} onClick={() => setShowIssues(false)}>×</button></div>
          {!issues.length ? <p className="checks-ok"><CircleCheck size={15} aria-hidden="true" />{t.stage.noIssues}</p> : issues.map((issue, index) => <button type="button" key={index} className={`check-item ${issue.severity}`} onClick={() => { const id = issue.entityIds.find(entity => plan.graph.nodes.some(node => node.id === entity)); if (id) setSelection({ id, kind: 'node', owner: plan.id }); }}>
            <b>{issue.severity === 'error' ? t.stage.fix : t.stage.notice}</b><span>{issueText(issue, lang)}</span><small>{issue.path.join('.')}</small>
          </button>)}
        </div>}
          <div className="canvas-pane"><Canvas {...canvasProps(plan, run, view, stale)} label={mode === 'Compare' && second ? { badge: 'A', name: plan.name } : undefined} compact={mode === 'Compare' && !!second} /></div>
          {mode === 'Compare' && second && <div className="canvas-pane"><Canvas {...canvasProps(second, secondRun, secondView, secondStale)} label={{ badge: 'B', name: second.name, note: t.canvas.changes(changes.length) }} compact /></div>}
        </div>
        {mode !== 'Build' && <section className={cls('dock', dockOpen && 'open')}>
          <div className="timeline">
            <button type="button" className="play-btn" aria-label={playing ? t.dock.pause : t.dock.play} disabled={!run} onClick={() => { if (time >= endTime) setTime(0); setPlaying(value => !value); }}>{playing ? <Pause size={16} /> : <Play size={16} />}</button>
            <button type="button" className="icon-btn" aria-label={t.dock.reset} disabled={!run} onClick={() => { setTime(0); setPlaying(false); }}><RotateCcw size={16} /></button>
            <time className="clock-now">{formatTime(time)}</time>
            <input className="scrubber" style={{ '--p': `${progress}%` } as CSSProperties} aria-label={t.dock.timeline} type="range" min={0} max={endTime || 1} step={0.1} value={Math.min(time, endTime)} disabled={!run} onChange={event => { setTime(Number(event.target.value)); setPlaying(false); }} />
            <time className="clock-end">{formatTime(endTime)}</time>
            <label className="select-pill small" title={t.dock.speedHint}><select aria-label={t.dock.speed} value={speed} onChange={event => setSpeed(Number(event.target.value))}>{[0.5, 1, 2, 4, 8].map(value => <option key={value} value={value}>{value}×</option>)}</select><ChevronDown size={12} aria-hidden="true" /></label>
            <span className="clock-label">{t.dock.clock}</span>
          </div>
          <div className="dock-tabs" role="tablist">
            {TABS.map(({ tab, icon: Icon }) => <button type="button" role="tab" aria-selected={dockOpen && bottomTab === tab} key={tab} className={dockOpen && bottomTab === tab ? 'active' : ''} onClick={() => { setBottomTab(tab); setDockOpen(true); }}>
              {tab === 'journey' ? <Ghost size={14} /> : <Icon size={14} aria-hidden="true" />}{t.dock.tabs[tab]}
            </button>)}
            <span className="dock-spacer" />
            {mode === 'Compare' && <button type="button" className="btn small accent" onClick={() => { setPlaying(false); setDialog('stress'); }}><Flame size={14} aria-hidden="true" />{t.dock.stress}</button>}
            <button type="button" className="icon-btn" aria-label={dockOpen ? t.dock.collapse : t.dock.expand} aria-expanded={dockOpen} title={dockOpen ? t.dock.collapse : t.dock.expand} onClick={() => setDockOpen(value => !value)}>{dockOpen ? <ChevronDown size={16} /> : <ChevronUp size={16} />}</button>
          </div>
          {dockOpen && <div className="dock-body">
            {!run && <EmptyResults onRun={() => launch([plan], 'Rehearse')} />}
            {run && bottomTab === 'insights' && <Insights run={run} second={secondRun} compare={mode === 'Compare'} comparisonReady={comparisonReady} changes={changes} scenarioId={scenario.id} overrides={scenario.assumptionOverrides.length} onSelectNode={id => setSelection({ id, kind: 'node', owner: plan.id })} />}
            {run && bottomTab === 'events' && <EventLog events={activeEvents} plan={plan} onPick={event => { if (event.participantId) chooseVisitor(event.participantId); if (event.nodeId) setSelection({ id: event.nodeId, kind: 'node', owner: plan.id }); }} />}
            {run && bottomTab === 'journey' && <Journey runs={mode === 'Compare' ? [run, secondRun] : [run]} compare={mode === 'Compare'} visitorId={visitorId} population={run.population.map(person => person.id)} onChoose={chooseVisitor} onJumpDifference={jumpDifference} onJump={(event, ownerId) => { setTime(event.time); setPlaying(false); setSelection({ id: event.nodeId ?? '', kind: 'node', owner: ownerId }); }} />}
            {run && bottomTab === 'resources' && <ResourceUse run={run} />}
          </div>}
        </section>}
      </main>

      <Inspector plan={owner} scenario={project.scenarios.find(item => item.id === owner.scenarioId)!} node={selectedNode} edge={selectedEdge} editable={!readOnly} issues={ownerIssues} run={runs[owner.id]} onNode={node => changePlan({ ...owner, graph: { ...owner.graph, nodes: owner.graph.nodes.map(item => item.id === selection.id ? node : item) } })} onEdge={edge => changePlan({ ...owner, graph: { ...owner.graph, edges: owner.graph.edges.map(item => item.id === selection.id ? edge : item) } })} onAdvanced={() => setDialog(selectedNode ? 'node-json' : 'edge-json')} onDelete={() => deleteElements(selectedNode ? [selectedNode.id] : [], selectedEdge ? [selectedEdge.id] : [])} onResources={() => { setMode('Build'); setPlaying(false); setDialog('resources'); }} onSaveTemplate={() => prepareTemplate(selectedNode)} collapsed={!inspectorOpen} onToggle={() => setInspectorOpen(value => !value)} />
    </div>

    <footer className="status-bar">
      <span className="status-state"><i className={busy ? 'pending' : ''} />{busy ? t.status.computing : t.status.local}</span>
      <span className="status-notice" role="status">{notice ? notice(t) : t.status.hint}</span>
      <span className="status-scope">{t.status.scope}<button type="button" onClick={() => setDialog('about')}>{t.status.scopeLink}</button></span>
    </footer>

    <input ref={fileInput} type="file" accept=".json,application/json" hidden onChange={async event => { const file = event.target.files?.[0]; if (!file) return; const result = readProject(await file.text(), lang); if (result.error) { const error = result.error; say(tr => tr.notices.importFailed(error)); } else if (result.document) { commit(result.document); setPlanId(result.document.plans[0].id); setSecondId(result.document.plans[1]?.id ?? ''); setRuns({}); setMode('Build'); setPlaying(false); setTime(0); say(tr => tr.notices.imported); } event.target.value = ''; }} />
    {dialog === 'resources' && <ResourcesEditor plan={plan} horizon={scenario.horizon} onApply={changePlan} onClose={() => setDialog(null)} />}
    {dialog === 'scenario' && <ScenarioEditor scenario={scenario} planNames={project.plans.filter(item => item.scenarioId === scenario.id).map(item => item.name)} onApply={next => commit({ ...project, scenarios: project.scenarios.map(item => item.id === next.id ? next : item) })} onClose={() => setDialog(null)} />}
    {dialog?.endsWith('-json') && <JsonEditor key={`${dialog}-${selection.id}`} title={dialog === 'node-json' ? t.dialogs.nodeJson : dialog === 'edge-json' ? t.dialogs.edgeJson : dialog === 'scenario-json' ? t.dialogs.scenarioJson(project.plans.filter(item => item.scenarioId === scenario.id).map(item => item.name).join(lang === 'zh' ? '、' : ', ')) : t.dialogs.planJson} value={dialog === 'node-json' ? selectedNode : dialog === 'edge-json' ? selectedEdge : dialog === 'scenario-json' ? scenario : plan} readOnly={readOnly} onClose={() => setDialog(null)} onApply={value => {
      const schema = dialog === 'node-json' ? nodeSchema : dialog === 'edge-json' ? edgeSchema : dialog === 'scenario-json' ? scenarioSchema : planSchema;
      const result = schema.safeParse(value); if (!result.success) return result.error.issues.slice(0, 5).map(issue => `${issue.path.join('.')}: ${zodIssueText(issue as { code: string; message: string; params?: Record<string, unknown> }, lang)}`).join('\n');
      if (dialog === 'node-json') { const next = result.data as Node; if (next.id !== selection.id) return t.dialogs.keepNodeId; changePlan({ ...owner, graph: { ...owner.graph, nodes: owner.graph.nodes.map(item => item.id === selection.id ? next : item) } }); }
      if (dialog === 'edge-json') { const next = result.data as Edge; if (next.id !== selection.id) return t.dialogs.keepEdgeId; changePlan({ ...owner, graph: { ...owner.graph, edges: owner.graph.edges.map(item => item.id === selection.id ? next : item) } }); }
      if (dialog === 'plan-json') { const next = result.data as Plan; if (next.id !== plan.id || !project.scenarios.some(item => item.id === next.scenarioId)) return t.dialogs.keepPlanId; changePlan(next); }
      if (dialog === 'scenario-json') { const next = result.data as Scenario; if (next.id !== scenario.id) return t.dialogs.keepScenarioId; commit({ ...project, scenarios: project.scenarios.map(item => item.id === next.id ? next : item) }); }
    }} />}
    {dialog === 'templates' && <Modal title={t.templates.title} icon={<BookOpen size={18} />} onClose={() => setDialog(null)} wide>
      <div className="spellbook-intro"><div><span className="eyebrow">KIROWEEN / GHOST REHEARSAL</span><p>{t.templates.subtitle}</p></div><Pumpkin size={64} /></div>
      <div className="dialog-tabs" role="tablist">{(['plans', 'nodes'] as const).map(tab => <button type="button" role="tab" aria-selected={libraryTab === tab} className={libraryTab === tab ? 'active' : ''} key={tab} onClick={() => setLibraryTab(tab)}>{t.templates[tab]}</button>)}</div>
      <div className="modal-body template-library">
        <p className="subtle">{libraryTab === 'plans' ? t.templates.planHint : readOnly ? t.sidebar.readOnlyHint : t.templates.nodeHint}</p>
        <h3 className="eyebrow">{t.templates.presets}</h3>
        {libraryTab === 'nodes' ? <div className="palette">{NODE_TYPES.map(type => <button type="button" key={type} disabled={readOnly} className={`palette-node type-${type}`} onClick={() => { addNode(type); setDialog(null); }}>
          <span className="palette-icon"><NodeIcon type={type} size={19} /></span><span className="palette-text"><b>{t.nodeTypes[type]}</b><small>{t.nodeHints[type]}</small></span>
        </button>)}</div> : <div className="template-grid">
          {(['haunted', 'candy'] as const).map(kind => <button type="button" key={kind} className={`template-card ${kind}`} onClick={() => usePlanTemplate(halloweenProject(kind, t), t.templates[kind].name)}>
            <div className="template-art">{kind === 'haunted' ? <Ghost size={42} /> : <Pumpkin size={50} />}<span>0{kind === 'haunted' ? 1 : 2}</span></div><b>{t.templates[kind].name}</b><small>{t.templates[kind].hint}</small>
          </button>)}
          <button type="button" className="template-card" onClick={() => { const document = localizeDocument(initialDocument(), 'zh', lang); usePlanTemplate(document, document.plans[0].name); }}><div className="template-art"><LayoutGrid size={38} /><span>03</span></div><b>{t.dialogs.example}</b><small>{t.stage.counts(15, 15)}</small></button>
          <button type="button" className="template-card blank" onClick={() => usePlanTemplate(emptyProject(t.defaults), t.defaults.plan)}><Plus size={28} /><b>{t.templates.blank}</b><small>{t.templates.blankHint}</small></button>
        </div>}
        <div className="section-heading"><h3 className="eyebrow">{t.templates.saved}</h3>{libraryTab === 'plans' && <button type="button" className="text-btn" onClick={() => prepareTemplate()}><BookmarkPlus size={15} />{t.templates.savePlan}</button>}</div>
        <div className="saved-templates">{templates.filter(item => libraryTab === 'nodes' ? !!item.nodeId : !item.nodeId).map(item => <div className="saved-template" key={item.id}>
          <button type="button" className="side-action" disabled={!!item.nodeId && readOnly} onClick={() => item.nodeId ? useNodeTemplate(item) : usePlanTemplate(item.document, item.name)}>{item.nodeId ? <NodeIcon type={item.document.plans[0].graph.nodes.find(node => node.id === item.nodeId)!.type} size={18} /> : <BookOpen size={18} />}<span>{item.name}</span><Plus size={15} /></button>
          <button type="button" className="icon-btn danger" aria-label={`${t.templates.remove}: ${item.name}`} title={t.templates.remove} onClick={() => { if (persistTemplates(templates.filter(saved => saved.id !== item.id))) say(tr => tr.templates.removed); }}><Trash2 size={14} /></button>
        </div>)}</div>
        {!templates.some(item => libraryTab === 'nodes' ? !!item.nodeId : !item.nodeId) && <p className="template-empty">{t.templates.empty}</p>}
        <p className="form-error" role="alert">{templateError}</p><p className="subtle template-local">{t.templates.local}</p>
      </div>
    </Modal>}
    {dialog === 'save-template' && templateDraft && <Modal title={t.templates.saveTitle} icon={<BookmarkPlus size={18} />} onClose={() => setDialog(null)}>
      <form onSubmit={event => { event.preventDefault(); const next = { ...templateDraft, name: templateName.trim() }; if (!templateLibrarySchema.safeParse([next]).success) { setTemplateError(t.templates.invalid); return; } if (persistTemplates([...templates, next])) { setDialog(null); say(tr => tr.templates.stored); } }}>
        <div className="modal-body"><label className="field"><span>{t.templates.name}</span><input aria-label={t.templates.name} value={templateName} maxLength={100} required onChange={event => setTemplateName(event.target.value)} /></label><p className="subtle">{templateDraft.nodeId ? t.templates.nodeHint : t.templates.local}</p><p className="form-error" role="alert">{templateError}</p></div>
        <div className="modal-footer"><button type="button" className="btn ghost" onClick={() => setDialog(null)}>{t.common.cancel}</button><button type="submit" className="btn primary" disabled={!templateName.trim()}><BookmarkPlus size={15} />{t.templates.save}</button></div>
      </form>
    </Modal>}
    {dialog === 'about' && <Modal title={t.dialogs.aboutTitle} onClose={() => setDialog(null)}><div className="modal-body about">
      <div className="about-brand"><div className="about-ghost"><Ghost size={52} /></div><h2>{t.brand.motto}</h2><span>{t.brand.name} · {t.brand.tagline}</span></div>
      <p>{t.dialogs.about1}</p><p>{t.dialogs.about2}</p>
      <p className="scope-note">{lang === 'zh' ? PRODUCT_STATEMENT.zh : PRODUCT_STATEMENT.en}</p>
      <p className="subtle">{lang === 'zh' ? PRODUCT_STATEMENT.en : PRODUCT_STATEMENT.zh}</p>
      <p>{t.dialogs.about3}</p>
    </div></Modal>}
    {dialog === 'export' && <Modal title={t.dialogs.exportTitle} icon={<Download size={18} />} onClose={() => setDialog(null)}><div className="modal-body">
      <button type="button" className="option-card" onClick={() => { download('ghost-rehearsal.json', JSON.stringify(project, null, 2) + '\n', 'application/json'); setDialog(null); }}><span className="option-icon"><Braces size={20} /></span><span><b>{t.dialogs.exportProject}</b><small>{t.dialogs.exportProjectHint}</small></span></button>
      <button type="button" className="option-card" onClick={() => { download(`${plan.id}-execution.md`, executionReport(plan, scenario, run, stale, t), 'text/markdown;charset=utf-8'); setDialog(null); }}><span className="option-icon"><FileText size={20} /></span><span><b>{t.dialogs.exportPlan}</b><small>{t.dialogs.exportPlanHint}</small></span></button>
      <p className="notice">{t.dialogs.exportNotice}</p>
    </div></Modal>}
    {dialog === 'stress' && <Modal title={t.dialogs.stressTitle} icon={<Flame size={18} />} onClose={() => setDialog(null)}><div className="modal-body"><p>{t.dialogs.stressText}</p><label className="field"><span>{t.dialogs.stressFactor}</span><input aria-label={t.dialogs.stressFactor} type="number" min={0.01} max={100} step={0.05} value={stressFactor} onChange={event => setStressFactor(Number(event.target.value))} /></label></div><div className="modal-footer"><button type="button" className="btn ghost" onClick={() => setDialog(null)}>{t.common.cancel}</button><button type="button" className="btn primary" disabled={!Number.isFinite(stressFactor) || stressFactor <= 0 || stressFactor > 100 || busy} onClick={stress}>{t.dialogs.stressApply}</button></div></Modal>}
    {dialog === 'new' && <Modal title={t.dialogs.newTitle} icon={<FilePlus2 size={18} />} onClose={() => setDialog(null)}><div className="modal-body"><p>{t.dialogs.newText}</p>
      <button type="button" className="option-card" onClick={() => startNew(emptyProject(t.defaults))}><span className="option-icon"><FilePlus2 size={20} /></span><span><b>{t.dialogs.blank}</b><small>{t.dialogs.blankHint}</small></span></button>
      <button type="button" className="option-card" onClick={() => startNew(localizeDocument(initialDocument(), 'zh', lang))}><span className="option-icon"><Ghost size={22} /></span><span><b>{t.dialogs.example}</b><small>{t.dialogs.exampleHint}</small></span></button>
    </div></Modal>}
  </div>;
}
