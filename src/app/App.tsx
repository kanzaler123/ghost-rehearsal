import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import type { CSSProperties, ReactNode } from 'react';
import type { Connection } from '@xyflow/react';
import {
  BookOpen, BookmarkPlus, Boxes, Braces, ChevronDown, ChevronUp, CircleCheck, CircleHelp, Columns2, Copy, Download, FileText, Flame, FlaskConical, Gauge, Hammer,
  Hourglass, LayoutGrid, LocateFixed, Maximize, Pause, Play, Redo2, RotateCcw, Save, ScrollText, Search, Sparkles, Square, Timer, TriangleAlert,
  MoreHorizontal, PanelLeftClose, PanelLeftOpen, Plus, Radio, Settings2, Trash2, Undo2, Upload, Users, WandSparkles, Workflow,
} from 'lucide-react';
import { duplicatePlan, edgeSchema, nodeSchema, planSchema, PRODUCT_STATEMENT, scenarioSchema, serializeDocument, validateGraph, validatePlan, validateScenario } from '../schemas';
import type { Edge, Node, Plan, ProjectDocument, RunRequest, Scenario, ValidationIssue } from '../schemas';
import { Canvas } from '../components/Canvas';
import type { ViewRequest, ViewTarget } from '../components/Canvas';
import { CompareReport } from '../components/CompareReport';
import { LazyRobustnessPanel } from '../experiments/robustness/LazyRobustnessPanel';
import { labels as robustnessLabels } from '../experiments/robustness/labels';
import { ComparisonPlanPicker } from '../components/ComparisonPlanPicker';
import { GuidedDemo } from '../components/GuidedDemo';
import type { DemoProgress } from '../components/GuidedDemo';
import { ImportDiagnostics } from '../components/ImportDiagnostics';
import { Inspector } from '../components/Inspector';
import { EventCreator, JsonEditor, Modal, ResourcesEditor, ScenarioEditor } from '../components/Dialogs';
import { Ghost, HauntedBackdrop, NodeIcon, Pumpkin } from '../components/Icons';
import { describeStatus, GhostJourney } from '../components/Journey';
import { FlowNavigator, keyEventText, NowPanel } from '../components/Rehearse';
import { EmptyResults, EventLog, Insights, ResourceUse } from '../components/Results';
import { comparisonContext, compatibleRuns, firstDifference, journeyOf, keyEvents, liveSummary, planChanges, rehearsePicks, statusAt, THRESHOLD, visitorName } from '../features/analysis';
import type { AffectedFilter, WaitThreshold } from '../features/analysis';
import { arrangeLayout, stageIndex } from '../features/stages';
import { addEvent, addNodeFromTemplate, addPlanFromTemplate, comparisonReport, createNode, createPackingExperiment, download, emptyProject, executionReport, experimentProject, formatTime, halloweenProject, initialDocument, newId, NODE_TYPES, readProject, serializeTemplate, serializeTemplates, subflowDependencies, templateLibrarySchema } from '../features/project';
import type { SavedTemplate, TemplateBindings, TemplateDependency } from '../features/project';
import { statisticsAt } from '../features/analysis';
import type { ResultBasis } from '../features/analysis';
import { issueText, localizeDocument, useI18n, zodIssueText } from '../i18n';
import type { Lang, Messages } from '../i18n';
import { MESSAGES } from '../i18n/messages';
import { inputKey, populationSize } from '../simulation/input';
import { usePlayback } from './usePlayback';
import { useProjectPersistence } from './useProjectPersistence';
import { ImportClient } from '../features/imports/client';
import type { ImportState } from '../features/imports/client';
import { appendImportedTemplates } from '../features/imports/parser';
import { SimulationClient } from '../simulation/client';
import { createRunResults, updateRunResults, removeRunResults, mapRunResults } from '../features/run-results';
import type { RunResults } from '../features/run-results';
import type { SimulationRun } from '../simulation/types';

import { TopBar } from '../components/shell/TopBar';
import { PlanNavigator } from '../components/shell/PlanNavigator';
import { ModeActions } from '../components/shell/ModeActions';
import { ArrangementControl } from '../components/shell/ArrangementControl';
import { effectiveArrangement } from '../components/shell/arrangement';
import { RunStateCard } from '../components/shell/RunStateCard';
import { deriveRunState } from '../components/shell/runState';
import type { LastRunOutcome } from '../components/shell/runState';
import { LiveAnnouncer } from '../components/shell/LiveAnnouncer';
import { LiveStatusStrip } from '../components/shell/LiveStatusStrip';
import { SummaryStrip } from '../components/shell/SummaryStrip';
import { StatusMarker } from '../components/shell/StatusMarker';
import { longestQueues } from '../components/shell/navigation';
import { autoplayAfterRun } from '../features/motion';
import { loadArrangement, saveArrangement } from './preferences';
import { useNarrowScreen, usePrefersReducedMotion } from './useMedia';

type Mode = 'Build' | 'Rehearse' | 'Compare';
type Dialog = 'comparison-plans' | 'resources' | 'scenario' | 'node-json' | 'edge-json' | 'plan-json' | 'scenario-json' | 'about' | 'export' | 'stress' | 'robustness' | 'welcome' | 'new' | 'templates' | 'template-bindings' | 'save-template' | 'rename-plan' | null;
type Notice = ((t: Messages) => string) | null;
type Tab = 'now' | 'insights' | 'events' | 'journey' | 'resources';
const MODES: { mode: Mode; icon: typeof Hammer }[] = [{ mode: 'Build', icon: Hammer }, { mode: 'Rehearse', icon: Play }, { mode: 'Compare', icon: Columns2 }];
const TABS: Record<'Rehearse' | 'Compare', { tab: Tab; icon: typeof Sparkles }[]> = {
  Rehearse: [{ tab: 'now', icon: Radio }, { tab: 'journey', icon: Users }, { tab: 'insights', icon: Sparkles }, { tab: 'resources', icon: Gauge }, { tab: 'events', icon: ScrollText }],
  Compare: [{ tab: 'journey', icon: Users }, { tab: 'insights', icon: Sparkles }, { tab: 'resources', icon: Gauge }, { tab: 'events', icon: ScrollText }],
};
const LEGEND = ['moving', 'serving', 'waiting', 'blocked', 'done', 'left', 'tracked'] as const;
const other = (lang: Lang): Lang => lang === 'en' ? 'zh' : 'en';
const cls = (...names: (string | false | undefined | null)[]) => names.filter(Boolean).join(' ');

export function App() {
  const { t, lang, setLang } = useI18n();
  const reducedMotion = usePrefersReducedMotion();
  const narrowScreen = useNarrowScreen();
  const reducedRef = useRef(reducedMotion); reducedRef.current = reducedMotion;
  const [arrangement, setArrangement] = useState(loadArrangement);
  const [lastRun, setLastRun] = useState<LastRunOutcome | null>(null);
  const runningPlans = useRef<string[]>([]);
  const [viewMark, setViewMark] = useState<'default' | 'all' | null>('default');
  const [navigatorCollapsed, setNavigatorCollapsed] = useState(() => window.matchMedia?.('(min-width: 981px) and (max-width: 1366px)')?.matches ?? false);
  const [reportCollapsed, setReportCollapsed] = useState(false);
  const [project, setProject] = useState(() => localizeDocument(emptyProject(), 'zh', lang));
  const [past, setPast] = useState<ProjectDocument[]>([]);
  const [future, setFuture] = useState<ProjectDocument[]>([]);
  const [planId, setPlanId] = useState(project.plans[0].id);
  const [secondId, setSecondId] = useState(project.plans[1]?.id ?? '');
  const [mode, setMode] = useState<Mode>('Build');
  const [runMode, setRunMode] = useState<RunRequest['runMode']>('cutoff');
  const [basis, setBasis] = useState<ResultBasis>('cutoff');
  const [threshold, setThreshold] = useState<WaitThreshold>(THRESHOLD);
  const [guide, setGuide] = useState<DemoProgress | null>(null);
  const [evidenceReveal, setEvidenceReveal] = useState(0);
  const [evidenceTarget, setEvidenceTarget] = useState<{ id: string; owner: string }>();
  const [planName, setPlanName] = useState('');
  const [resourceLimits, setResourceLimits] = useState({ staff: '', devices: '' });
  const [runs, setRuns] = useState<RunResults>(() => createRunResults());
  const [selection, setSelection] = useState({ id: '', kind: 'node' as 'node' | 'edge', owner: planId });
  const [visitorId, setVisitorId] = useState('');
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [bottomTab, setBottomTab] = useState<Tab>('now');
  const [canvasView, setCanvasView] = useState<'stages' | 'full'>('stages');
  const [expanded, setExpanded] = useState<string[]>([]);
  const [railExpanded, setRailExpanded] = useState(false);
  const [compareFocus, setCompareFocus] = useState<'overview' | 'person'>('overview');
  const [liveExpanded, setLiveExpanded] = useState(false);
  const [peopleGroup, setPeopleGroup] = useState<AffectedFilter>();
  const [mobilePanel, setMobilePanel] = useState<'report' | 'canvas' | 'person' | 'evidence'>('report');
  const [viewRequest, setViewRequest] = useState<ViewRequest>({ token: 0, target: 'default' });
  const [dockOpen, setDockOpen] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [libraryTab, setLibraryTab] = useState<'nodes' | 'plans'>('plans');
  const [templateDraft, setTemplateDraft] = useState<SavedTemplate | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [templateError, setTemplateError] = useState('');
  const [templateNotice, setTemplateNotice] = useState('');
  const [connections, setConnections] = useState<{ template: SavedTemplate; dependencies: TemplateDependency[]; values: TemplateBindings } | null>(null);
  const [templateResources, setTemplateResources] = useState<'share' | 'copy'>('share');
  const [notice, setNoticeState] = useState<Record<Lang, string> | null>(null);
  const [showIssues, setShowIssues] = useState(false);
  const [checksPlanId, setChecksPlanId] = useState<string>();
  const [documentIssues, setDocumentIssues] = useState<ValidationIssue[]>([]);
  const [stressFactor, setStressFactor] = useState(1.25);
  const fileInput = useRef<HTMLInputElement>(null);
  const projectRead = useRef(0);
  const projectImporter = useRef<ImportClient | null>(null);
  const templateImporter = useRef<ImportClient | null>(null);
  const [projectImportState, setProjectImportState] = useState<ImportState | null>(null);
  const [templateImportState, setTemplateImportState] = useState<ImportState | null>(null);
  const [issuePage, setIssuePage] = useState(0);
  const [projectReadFailed, setProjectReadFailed] = useState(false);
  const currentProject = useRef(project);
  currentProject.current = project;
  const thresholdInput = useRef<HTMLSelectElement>(null);
  const checksTrigger = useRef<HTMLButtonElement>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const comparisonSettingsRef = useRef<HTMLDivElement>(null);
  const templateInput = useRef<HTMLInputElement>(null);
  const worker = useRef<SimulationClient | null>(null);
  const launchContext = useRef<{ requestId: number; destination: Mode; scope: RunRequest['runMode']; planIds: string[]; presentResult: boolean } | null>(null);
  const say = (next: Notice) => setNoticeState(next ? { en: next(MESSAGES.en), zh: next(MESSAGES.zh) } : null);
  const persistence = useProjectPersistence(project, dialog !== 'welcome', document => {
    if (!document) { setDialog('welcome'); return; }
    projectRead.current += 1; projectImporter.current?.cancel();
    worker.current?.reset(); setBusy(false); setLastRun(null);
    setProject(document); setPast([]); setFuture([]); setRuns(createRunResults());
    setPlanId(document.plans[0].id); setSecondId(document.plans[1]?.id ?? '');
    setSelection({ id: '', kind: 'node', owner: document.plans[0].id });
    setPlaying(false); setTime(0); setMode('Build'); setDialog(null);
    say(tr => tr.review.draftRestored);
  });
  const { templates, unsaved, draftSaved } = persistence;
  const currentTemplates = useRef(templates); currentTemplates.current = templates;
  const projectImportBusy = projectImportState?.status === 'reading' || projectImportState?.status === 'parsing';
  const plan = project.plans.find(item => item.id === planId) ?? project.plans[0];
  const scenario = project.scenarios.find(item => item.id === plan.scenarioId)!;
  const second = project.plans.find(item => item.id === secondId && item.id !== plan.id);
  const owner = project.plans.find(item => item.id === selection.owner) ?? plan;
  const selectedNode = selection.kind === 'node' ? owner.graph.nodes.find(node => node.id === selection.id) : undefined;
  const selectedEdge = selection.kind === 'edge' ? owner.graph.edges.find(edge => edge.id === selection.id) : undefined;
  const run = runs.get(plan.id);
  const secondRun = second ? runs.get(second.id) : undefined;
  const requestFor = (target: Plan, document = project): RunRequest => ({ schemaVersion: 1, scenario: document.scenarios.find(item => item.id === target.scenarioId)!, plan: target, runMode });
  const stale = useMemo(() => !!run && run.inputKey !== inputKey(requestFor(plan)), [run, plan, scenario, runMode]);
  const secondStale = useMemo(() => !!secondRun && !!second && secondRun.inputKey !== inputKey(requestFor(second)), [secondRun, second, project.scenarios, runMode]);
  const ownerScenario = project.scenarios.find(item => item.id === owner.scenarioId)!;
  const ownerRun = runs.get(owner.id);
  // Replay ticks and inspector toggles do not change the simulation inputs.
  const ownerStale = useMemo(() => owner === plan ? stale : owner === second ? secondStale
    : !!ownerRun && ownerRun.inputKey !== inputKey({ schemaVersion: 1, scenario: ownerScenario, plan: owner, runMode }),
  [owner, plan, second, stale, secondStale, ownerRun, ownerScenario, runMode]);
  const interrupted = !!lastRun && lastRun.planIds.some(id => id === plan.id || id === second?.id);
  const comparisonReady = !busy && !interrupted && !!second && !!run && !!secondRun && compatibleRuns(run, secondRun) && !stale && !secondStale;
  const comparison = useMemo(() => comparisonContext(run, secondRun, basis, threshold, !busy && !stale && !secondStale && !interrupted), [run, secondRun, basis, threshold, stale, secondStale, interrupted, busy]);
  const endTime = Math.max(run?.coveredUntil ?? scenario.observationCutoff, mode === 'Compare' ? secondRun?.coveredUntil ?? 0 : 0);
  const issues = useMemo(() => [...validateScenario(scenario), ...validatePlan(plan), ...validateGraph(scenario, plan)], [scenario, plan]);
  const runPlanChecks = useMemo(() => (busy ? project.plans.filter(target => runningPlans.current.includes(target.id)) : mode === 'Compare' && second ? [plan, second] : [plan]).map(target => {
    const checks = target === plan ? issues : [...validateScenario(scenario), ...validatePlan(target), ...validateGraph(scenario, target)];
    return t.redesign.planChecks(target.name, checks.filter(issue => issue.severity === 'error').length, checks.filter(issue => issue.severity !== 'error').length);
  }), [busy, project.plans, mode, second, plan, issues, scenario, t]);
  const ownerIssues = useMemo(() => owner.id === plan.id ? issues : [...validatePlan(owner), ...validateGraph(ownerScenario, owner)], [owner, plan.id, issues, ownerScenario]);
  const errorCount = issues.filter(issue => issue.severity === 'error').length;
  const checksPlan = project.plans.find(item => item.id === checksPlanId) ?? plan;
  const checksScenario = project.scenarios.find(item => item.id === checksPlan.scenarioId)!;
  const checksIssues = useMemo(() => checksPlan.id === plan.id ? issues : [...validateScenario(checksScenario), ...validatePlan(checksPlan), ...validateGraph(checksScenario, checksPlan)], [checksPlan, plan.id, issues, checksScenario]);
  const secondIssues = useMemo(() => second ? validateGraph(project.scenarios.find(item => item.id === second.scenarioId)!, second) : [], [second, project.scenarios]);
  const { view, previous: previousView } = usePlayback(run, plan, scenario, runMode, time, mode !== 'Build');
  const { view: secondView, previous: secondPrevious } = usePlayback(mode === 'Compare' ? secondRun : undefined, second ?? plan, project.scenarios.find(item => item.id === second?.scenarioId) ?? scenario, runMode, time, mode === 'Compare');
  const reportChanges = useMemo(() => second ? planChanges(plan, second) : [], [plan, second]);
  /** Changed nodes and routes are highlighted on both canvases; stage cards light up when a member changed. */
  const changedIds = useMemo(() => new Set(reportChanges.flatMap(change => change.kind === 'node' || change.kind === 'edge' ? [change.id] : [])), [reportChanges]);
  const comparing = mode === 'Compare' && !!second;
  const indexA = useMemo(() => stageIndex(plan), [plan]);
  const indexB = useMemo(() => second ? stageIndex(second) : undefined, [second]);
  const hasStages = indexA.stages.length > 0 || (comparing && !!indexB?.stages.length);
  const stageView = mode !== 'Build' && canvasView === 'stages' && hasStages;
  const expandedSet = useMemo<Set<string> | 'all'>(() => canvasView === 'full' ? 'all' : new Set(expanded), [canvasView, expanded]);
  const nameOf = useCallback((id: string) => visitorName(id, run?.request.plan ?? plan, scenario), [run, plan, scenario]);
  const tracked = useMemo(() => visitorId ? { id: visitorId, name: nameOf(visitorId) } : undefined, [visitorId, nameOf]);
  const trackedJourneys = useMemo(() => [run, comparing ? secondRun : undefined].map(target => target && visitorId ? journeyOf(target, visitorId) : undefined), [run, secondRun, comparing, visitorId]);
  const trackedStatus = trackedJourneys.map((journey, index) => {
    if (!journey) return t.reportUi.notInSystem;
    const status = statusAt(journey, time);
    return status.kind === 'not_arrived' || status.kind === 'done' || status.kind === 'left' ? t.reportUi.notInSystem : describeStatus(status, (index ? secondRun : run)!.request.plan, time, t);
  });
  const moments = useMemo(() => run ? keyEvents(run) : [], [run]);
  const selectedStats = statisticsAt(run, basis), selectedSecondStats = statisticsAt(secondRun, basis);
  const featured = comparison.featured;
  const needsPicks = mode !== 'Build' && (dockOpen ? bottomTab === 'now' || bottomTab === 'journey' : !comparing && bottomTab === 'journey');
  const picks = useMemo(() => !run || !needsPicks ? [] : comparing ? comparison.picks()
    : rehearsePicks(run, view, time, 3, selectedStats), [run, comparing, comparison, view, time, selectedStats, needsPicks]);

  function commit(next: ProjectDocument, previous = project) {
    if (JSON.stringify(next) === JSON.stringify(previous)) return;
    setPast(items => [...items, previous].slice(-100)); setFuture([]); setProject(next);
  }
  async function importProject(file: File) {
    const request = ++projectRead.current;
    const importDialog = dialog;
    setProjectReadFailed(false);
    setIssuePage(0);
    const client = projectImporter.current!;
    const state = await client.startFiles([file], { kind: 'project' });
    if (request !== projectRead.current || state.requestId !== client.getState().requestId || state.status === 'disposed' || state.status === 'canceled') return;
    setDocumentIssues(client.getAllIssues().map(issue => ({ ...issue, path: issue.path ?? [], entityIds: issue.entityIds ?? [] })));
    const value = client.getValue(state.requestId);
    if (!value || value.kind !== 'project') {
      if (state.status === 'failed') { setProjectReadFailed(true); say(tr => tr.notices.fileReadFailed); }
      else say(tr => tr.notices.importFailed(state.failure?.message ?? state.issues[0]?.message ?? tr.notices.noResult));
      return;
    }
    const result = { document: value.document };
    {
      // Reading can outlive an edit; Undo must restore the latest project.
      worker.current?.reset(); setBusy(false);
      setLastRun(null);
      persistence.replace();
      commit(result.document, currentProject.current);
      setPlanId(result.document.plans[0].id);
      setSelection({ id: '', kind: 'node', owner: result.document.plans[0].id });
      setSecondId(result.document.plans[1]?.id ?? ''); setRuns(createRunResults()); setMode('Build');
      setPlaying(false); setTime(0);
      // Editors hold drafts of the replaced document, even when its IDs match.
      // Keep only dialogs independent of that document; an owned entry still closes.
      setDialog(current => current === 'export' || current === 'about'
        || ((current === 'welcome' || current === 'new') && current !== importDialog) ? current : null);
      say(tr => tr.notices.imported);
    }
  }
  function changePlan(next: Plan) { commit({ ...project, plans: project.plans.map(item => item.id === next.id ? next : item) }); }
  function undo() { if (!past.length) return; setProject(past.at(-1)!); setPast(past.slice(0, -1)); setFuture([project, ...future]); setPlaying(false); }
  function redo() { if (!future.length) return; setProject(future[0]); setFuture(future.slice(1)); setPast([...past, project]); setPlaying(false); }
  function selectPlan(id: string, plans = project.plans) {
    // Keep the computation and its per-plan cache, but navigation owns the view now.
    if (id !== plan.id && launchContext.current) launchContext.current.presentResult = false;
    const target = plans.find(item => item.id === id);
    if (!plans.some(item => item.id === secondId && item.id !== id && item.scenarioId === target?.scenarioId)) setSecondId(plans.find(item => item.id !== id && item.scenarioId === target?.scenarioId)?.id ?? '');
    setPlanId(id); setSelection({ id: '', kind: 'node', owner: id }); setSearch(''); setInspectorOpen(false); setPlaying(false); setTime(0); setShowIssues(false); setChecksPlanId(undefined); if (mode === 'Compare') setMode('Build');
  }
  /** All editing entry points reset the selection to the plan being edited. */
  function enterBuild(targetId = plan.id, setup?: 'scenario' | 'resources') {
    setGuide(null); selectPlan(targetId); setMode('Build'); setDialog(setup ?? null);
  }
  function showOverview() {
    setCompareFocus('overview'); setMobilePanel('report'); setDockOpen(false); setInspectorOpen(false); setRailExpanded(false);
  }
  function showJourney(group?: AffectedFilter) {
    setCompareFocus('person'); setMobilePanel('person'); setPeopleGroup(group); setBottomTab('journey'); setDockOpen(true); setInspectorOpen(false); setRailExpanded(false); setPlaying(false);
  }
  async function save() {
    const result = readProject(JSON.stringify(project), lang);
    if (result.error) { const error = result.error; say(tr => tr.notices.fixBeforeSave(error)); return; }
    say(await persistence.write('saved') ? tr => tr.notices.saved : tr => tr.notices.saveFailed);
  }
  function openLibrary(tab: 'nodes' | 'plans') { setLibraryTab(tab); setTemplateError(''); setTemplateNotice(''); setDialog('templates'); }
  function prepareTemplate(node?: Node) {
    const target = node ? owner : plan;
    const draft: SavedTemplate = { id: newId('template', templates.map(item => item.id)), name: node?.name ?? target.name,
      ...(node ? { nodeId: node.id } : {}), document: structuredClone({ ...project, plans: [target], scenarios: project.scenarios.filter(item => item.id === target.scenarioId) }) };
    if (!templateLibrarySchema.safeParse([draft]).success) { say(tr => tr.templates.invalid); return; }
    setTemplateDraft(draft); setTemplateName(draft.name); setTemplateError(''); setDialog('save-template');
  }
  async function persistTemplates(next: SavedTemplate[]) {
    const saved = await persistence.saveTemplates(next);
    if (!saved) setTemplateError(t.templates.saveFailed);
    return saved;
  }
  function usePlanTemplate(document: ProjectDocument, name: string) {
    const next = addPlanFromTemplate(project, document, name);
    const added = next.plans.at(-1)!;
    commit(next); setPlanId(added.id); setSecondId(''); setMode('Build'); setPlaying(false); setTime(0); setSearch(''); setInspectorOpen(false); setDockOpen(false);
    setSelection({ id: '', kind: 'node', owner: added.id }); setDialog(null); say(tr => tr.templates.added);
  }
  function useNodeTemplate(template: SavedTemplate, bindings?: TemplateBindings) {
    if (mode !== 'Build') return;
    try {
      if (!bindings && template.document.plans[0].graph.nodes.find(node => node.id === template.nodeId)?.type === 'subflow') {
        const dependencies = subflowDependencies(plan, scenario, template);
        if (dependencies.length) {
          const values: TemplateBindings = {};
          for (const item of dependencies) if (item.kind !== 'incoming' && item.kind !== 'outgoing' && item.options.some(option => option.id === item.id)) {
            values[item.kind] = { ...values[item.kind], [item.id]: item.id };
          }
          setConnections({ template, dependencies, values }); setTemplateError(''); setDialog('template-bindings'); return;
        }
      }
      const added = addNodeFromTemplate(plan, scenario, template, templateResources, bindings);
      changePlan(added.plan); setSelection({ id: added.node.id, kind: 'node', owner: plan.id }); requestView('default'); setDialog(null); say(tr => tr.templates.added);
    } catch (error) { setTemplateError(error instanceof Error && error.cause ? issueText(error.cause as ValidationIssue, lang) : t.templates.bindingError); }
  }
  function switchLanguage(next: Lang) {
    if (next === lang) return;
    const relabel = (document: ProjectDocument) => localizeDocument(document, lang, next);
    setProject(relabel(project)); setPast(past.map(relabel)); setFuture(future.map(relabel));
    setRuns(previous => mapRunResults(previous, result => {
      const names = localizeDocument({ scenarios: [result.request.scenario], plans: [result.request.plan] }, lang, next);
      return { ...result, request: { ...result.request, scenario: names.scenarios[0], plan: names.plans[0] } };
    }));
    setLang(next);
  }
  function requestView(target: ViewTarget) { setViewMark(target === 'default' || target === 'all' ? target : null); setViewRequest(previous => ({ token: previous.token + 1, target })); }
  /** Zooms both canvases to the given nodes. Stages that contain them are opened first; service nodes match across plans by stage key. */
  function focusNodes(ids: string[], byPlan?: Record<string, string[]>) {
    const plans = [plan, ...(comparing && second ? [second] : [])];
    const indexes = [indexA, ...(comparing && indexB ? [indexB] : [])];
    const stageKeys = [...new Set(ids.flatMap(id => plans.flatMap(target => { const node = target.graph.nodes.find(item => item.id === id); return node?.type === 'service' ? [node.stageKey] : []; })))];
    const stages = [...new Set(ids.flatMap(id => indexes.flatMap(index => { const top = index.top.get(id); return top ? [top] : index.stages.includes(id) ? [id] : []; })))];
    if (canvasView === 'stages') setExpanded(stages);
    requestView({ ids, stageKeys, stages, byPlan });
  }
  function toggleStage(id: string, open: boolean) {
    if (open) { setExpanded([id]); requestView({ ids: [id], stages: [id] }); }
    else { setExpanded(list => list.filter(item => item !== id)); requestView('default'); }
  }
  /** Locates a ghost at the replay moment, separately in each future. */
  function locateVisitor(id: string) {
    const where = (target?: SimulationRun) => {
      if (!target) return undefined;
      const journey = journeyOf(target, id); const status = statusAt(journey, time);
      return ('nodeId' in status ? status.nodeId : undefined) ?? journey.entranceId;
    };
    const a = where(run), b = comparing ? where(secondRun) : undefined;
    const ids = [...new Set([a, b].filter((item): item is string => !!item))];
    if (ids.length) focusNodes(ids, { [plan.id]: a ? [a] : [], ...(comparing && second ? { [second.id]: b ? [b] : [] } : {}) });
  }
  function chooseVisitor(id: string, keepGroup = false) {
    if (!keepGroup) setPeopleGroup(undefined);
    setVisitorId(id); setBottomTab('journey'); setDockOpen(true); setPlaying(false);
    if (comparing) { setCompareFocus('person'); setMobilePanel('person'); setRailExpanded(false); setInspectorOpen(false); }
    locateVisitor(id);
  }
  function inspectNodes(ids: string[], ownerId: string) {
    const target = project.plans.find(item => item.id === ownerId);
    const id = ids.find(id => target?.graph.nodes.some(node => node.id === id));
    if (!target || !id) return;
    if (comparing) showOverview();
    setSelection({ id, kind: 'node', owner: target.id }); setPlaying(false); setInspectorOpen(true); setMobilePanel('canvas'); focusNodes(ids);
  }
  function inspectMoment(ids: string[]) {
    if (comparing) showOverview();
    const candidates = [comparing && comparisonReady ? secondRun : undefined, run].flatMap(result => result
      ? keyEvents(result).filter(event => !!event.nodeId && ids.includes(event.nodeId) && event.time <= (statisticsAt(result, basis)?.until ?? scenario.observationCutoff)).map(event => ({ event, result })) : []);
    const chosen = candidates.filter(item => item.event.kind === 'queue' || item.event.kind === 'blocked')
      .sort((a, b) => (b.event.value ?? 0) - (a.event.value ?? 0) || b.event.time - a.event.time)[0] ?? candidates[0];
    if (chosen) jumpTo(chosen.event.time, chosen.event.nodeId, chosen.result.request.plan.id);
    else { setTime(0); setPlaying(false); focusNodes(ids); }
    setMobilePanel('canvas'); setInspectorOpen(false);
  }
  function jumpTo(at: number, nodeId?: string, ownerId = plan.id) {
    setTime(Math.min(at, endTime)); setPlaying(false);
    if (nodeId) { setSelection({ id: nodeId, kind: 'node', owner: ownerId }); focusNodes([nodeId]); }
  }
  function launch(targets: Plan[], destination: Mode, document = project, scope = runMode) {
    if (dialog === 'robustness') return;
    if (targets.length === 2 && targets[0].scenarioId !== targets[1].scenarioId) { say(tr => tr.notices.sameScenario); return; }
    runningPlans.current = targets.map(target => target.id); setLastRun(null);
    setBusy(true); setPlaying(false); say(tr => tr.notices.computing);
    const client = worker.current!;
    launchContext.current = { requestId: client.getState().requestId + 1, destination, scope, planIds: runningPlans.current, presentResult: true };
    client.start(targets.map(target => ({ ...requestFor(target, document), runMode: scope })));
  }
  function stopRun() { worker.current?.cancel(); }
  function rerun() { launch(mode === 'Compare' && second ? [plan, second] : [plan], mode === 'Compare' ? 'Compare' : 'Rehearse'); }
  function switchMode(next: Mode) {
    setPlaying(false);
    if ((next === 'Compare' ? comparisonReady : next === 'Rehearse' && run && !stale && run.status !== 'failed') && selection.owner === plan.id && selection.id && selection.kind === 'node') focusNodes([selection.id]);
    if (next === 'Build') { enterBuild(); return; }
    if (next === 'Compare') {
      if (!second) { say(tr => tr.notices.needSecond); return; }
      if (!comparisonReady) launch([plan, second], next);
      else { setMode(next); setTime(0); setPlaying(autoplayAfterRun(reducedRef.current)); }
    } else if (!run || stale || run.status === 'failed') launch([plan], next);
    else { if (!run.completion) setBasis('cutoff'); setMode(next); setTime(0); setPlaying(autoplayAfterRun(reducedRef.current)); }
  }
  function comparePlans(leftId: string, rightId: string, scope: RunRequest['runMode']) {
    const left = project.plans.find(item => item.id === leftId && item.scenarioId === scenario.id);
    const right = project.plans.find(item => item.id === rightId && item.scenarioId === scenario.id);
    if (busy || !left || !right || left.id === right.id) return;
    setDialog(null); setGuide(null); setPlanId(left.id); setSecondId(right.id); setRunMode(scope);
    setVisitorId(''); setEvidenceTarget(undefined); setSearch(''); showOverview();
    launch([left, right], 'Compare', project, scope);
  }
  function copyPlan() {
    const result = duplicatePlan(plan, new Set(project.plans.map(item => item.id)));
    if (!result.ok) { say(tr => tr.notices.copyFormat); return; }
    if (lang === 'zh') result.plan.name = result.plan.name.replace(/ \(copy\)$/, t.defaults.copySuffix);
    commit({ ...project, plans: [...project.plans, result.plan] });
    selectPlan(result.plan.id); setSecondId(plan.id);
    setMode('Build'); say(tr => tr.notices.copied);
  }
  function packingExperiment() {
    if (!second) return;
    const existing = guide?.c ? project.plans.find(item => item.id === guide.c) : undefined;
    const target = existing ?? createPackingExperiment(second, new Set(project.plans.map(item => item.id)), t);
    if (!target) return;
    const next = existing ? project : { ...project, plans: [...project.plans, target] };
    commit(next); setPlanId(second.id); setSecondId(target.id);
    if (guide) setGuide({ ...guide, step: 4, c: target.id, exported: false });
    launch([second, target], 'Compare', next);
  }
  function startGuide() {
    projectRead.current += 1; projectImporter.current?.cancel();
    setProjectReadFailed(false); setDocumentIssues([]);
    const next = addEvent(project, localizeDocument(initialDocument(), 'zh', lang));
    const [a, b] = next.plans.slice(-2);
    commit(next); setPlanId(a.id); setSecondId(b.id); setGuide({ step: 0, a: a.id, b: b.id });
    setBasis('cutoff'); setThreshold(THRESHOLD); setRunMode('run_to_completion'); setDialog(null); setVisitorId('');
    setEvidenceTarget(undefined); showOverview(); launch([a, b], 'Compare', next, 'run_to_completion');
  }
  function showGuideEvidence(id: string) {
    if (!guide) return;
    setEvidenceTarget({ id, owner: guide.b }); setBottomTab('insights'); setDockOpen(true); setPlaying(false);
    setCompareFocus('overview'); setMobilePanel('evidence'); setInspectorOpen(false); focusNodes([id]);
  }
  function advanceGuide() {
    if (!guide || !comparisonReady || !run || !secondRun || !selectedStats || !selectedSecondStats) return;
    if (guide.step === 0) {
      if (!featured) { say(tr => tr.journey.noDiff); return; }
      chooseVisitor(featured); setGuide({ ...guide, step: 1, visitor: featured });
    } else if (guide.step === 1) {
      const id = visitorId;
      if (!comparison.visitors.some(person => person.id === id)) { say(tr => tr.journey.noDiff); return; }
      const difference = firstDifference(journeyOf(run, id, selectedStats.until), journeyOf(secondRun, id, selectedSecondStats.until), run.request.plan, secondRun.request.plan);
      if (!difference) { say(tr => tr.journey.noDiff); return; }
      chooseVisitor(id); jumpTo(difference.time, difference.a?.nodeId ?? difference.b?.nodeId, difference.a ? plan.id : second!.id);
      setGuide({ ...guide, step: 2, visitor: id });
    } else if (guide.step === 2) { setGuide({ ...guide, step: 3 }); showGuideEvidence('checkin-extra'); }
    else if (guide.step === 3) packingExperiment();
    else if (guide.step === 4) { setGuide({ ...guide, step: 5 }); showOverview(); }
    else {
      const c = project.plans.find(item => item.id === guide.c)!, b = project.plans.find(item => item.id === guide.b)!;
      download(`${c.id}-execution.md`, executionReport(c, scenario, runs.get(c.id), false, t, b, basis) + '\n' + comparisonReport(runs.get(b.id), runs.get(c.id), comparisonReady, t, basis, threshold), 'text/markdown;charset=utf-8');
      setGuide({ ...guide, exported: true });
    }
  }
  function exportGuideProject() {
    if (!guide?.c) return;
    const experiment = experimentProject(project, [guide.a, guide.b, guide.c]);
    if (!experiment) { say(tr => tr.guide.projectUnavailable); return; }
    download('ghost-rehearsal-abc.json', serializeDocument(experiment), 'application/json');
    say(tr => tr.guide.projectDownloaded);
  }
  function resetGuide(rerun: boolean) {
    if (!guide) return;
    const isBC = rerun && guide.step >= 4 && !!guide.c;
    const a = project.plans.find(item => item.id === (isBC ? guide.b : guide.a));
    const b = project.plans.find(item => item.id === (isBC ? guide.c : guide.b));
    if (!a || !b) { setGuide(null); return; }
    setPlanId(a.id); setSecondId(b.id); setMode('Compare'); setVisitorId(''); setTime(0); setPlaying(false);
    setGuide({ ...guide, step: isBC ? 4 : 0, exported: false }); setEvidenceTarget(undefined); showOverview();
    if (rerun) launch([a, b], 'Compare');
  }
  function addNode(type: Node['type'], position?: { x: number; y: number }) {
    if (mode !== 'Build') return;
    const node = createNode(type, plan, scenario, position ?? { x: 350 + (plan.graph.nodes.length % 3) * 240, y: 180 + Math.floor(plan.graph.nodes.length / 3) * 150 }, t.nodeTypes[type]);
    changePlan({ ...plan, graph: { ...plan.graph, nodes: [...plan.graph.nodes, node] } }); setSelection({ id: node.id, kind: 'node', owner: plan.id });
    if (!position) requestView('default');
  }
  function connect(connection: Connection) {
    if (mode !== 'Build') return;
    const source = plan.graph.nodes.find(node => node.id === connection.source);
    const id = newId('route', plan.graph.edges.map(edge => edge.id));
    const edge: Edge = { id, source: connection.source, target: connection.target, ...(source?.type === 'decision' ? { branchKey: connection.sourceHandle ?? source.routing.branches[0].branchKey } : {}) };
    changePlan({ ...plan, graph: { nodes: plan.graph.nodes.map(node => node.id === edge.target && node.type === 'merge' ? { ...node, incomingPriority: [...node.incomingPriority.filter(key => plan.graph.edges.some(item => item.id === key)), id] } : node), edges: [...plan.graph.edges, edge] } });
  }
  function deleteElements(nodeIds: string[], edgeIds: string[], ownerId = plan.id) {
    if (mode !== 'Build' || ownerId !== plan.id || (!nodeIds.length && !edgeIds.length)) return;
    const target = project.plans.find(item => item.id === ownerId);
    if (!target) return;
    const edges = target.graph.edges.filter(edge => !edgeIds.includes(edge.id) && !nodeIds.includes(edge.source) && !nodeIds.includes(edge.target));
    changePlan({ ...target, graph: { edges, nodes: target.graph.nodes.filter(node => !nodeIds.includes(node.id)).map(node => node.type === 'subflow' ? { ...node, memberNodeIds: node.memberNodeIds.filter(id => !nodeIds.includes(id)) }
      : node.type === 'merge' ? { ...node, incomingPriority: node.incomingPriority.filter(id => edges.some(edge => edge.id === id)).length ? node.incomingPriority.filter(id => edges.some(edge => edge.id === id)) : ['connect-an-edge'] } : node) },
      assignments: target.assignments.map(assignment => ({ ...assignment, periods: assignment.periods.map(period => ({ ...period, nodeIds: period.nodeIds.filter(id => !nodeIds.includes(id)) })) })) });
    setSelection({ id: '', kind: 'node', owner: target.id });
  }
  /** Lays each stage out on its own, then places stages left to right. Loop-back steps sit under their decision. */
  function arrange() {
    const positions = arrangeLayout(plan);
    changePlan({ ...plan, graph: { ...plan.graph, nodes: plan.graph.nodes.map(node => { const point = positions.get(node.id); return point ? { ...node, layout: { ...node.layout, x: point.x, y: point.y } } : node; }) } });
    requestView('default');
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
  function startNew(event: ProjectDocument) {
    projectRead.current += 1; projectImporter.current?.cancel();
    worker.current?.cancel();
    const next = dialog === 'welcome' ? event : addEvent(project, event);
    const first = next.plans[dialog === 'welcome' ? 0 : project.plans.length];
    commit(next); setPlanId(first.id); setSecondId(next.plans.find(item => item.id !== first.id && item.scenarioId === first.scenarioId)?.id ?? ''); setMode('Build'); setPlaying(false); setTime(0); setVisitorId(''); setSearch(''); setInspectorOpen(false); setDockOpen(false);
    setSelection({ id: '', kind: 'node', owner: first.id }); setDialog(null);
  }
  useEffect(() => {
    if (!playing) return;
    let previous = performance.now();
    const timer = setInterval(() => { const current = performance.now(); const delta = (current - previous) / 1000 * 30 * speed; previous = current; setTime(value => Math.min(endTime, value + delta)); }, 100);
    return () => clearInterval(timer);
  }, [playing, speed, endTime]);
  useEffect(() => { if (time >= endTime) setPlaying(false); }, [time, endTime]);
  // Each mode gets its own layout: Build edits, Rehearse watches the queues, Two Futures compares.
  useEffect(() => {
    setExpanded([]); setRailExpanded(false); setBottomTab(mode === 'Compare' ? 'journey' : 'now');
    setCompareFocus('overview'); setPeopleGroup(undefined); setMobilePanel('report');
    if (mode === 'Compare') setDockOpen(false);
    else setReportCollapsed(false);
    if (mode === 'Build') { setGuide(null); setEvidenceTarget(undefined); }
    if (mode !== 'Build') setInspectorOpen(false);
    requestView('default');
  }, [mode]);
  useEffect(() => {
    const header = comparisonSettingsRef.current, workspace = workspaceRef.current;
    if (!header || !workspace) return;
    const update = () => workspace.style.setProperty('--comparison-header-height', `${header.getBoundingClientRect().height}px`);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(header);
    return () => { observer.disconnect(); workspace.style.removeProperty('--comparison-header-height'); };
  }, [comparing]);
  useEffect(() => {
    if (!window.matchMedia?.('(max-width: 980px)')?.matches) return;
    // View changes can wrap the sticky controls before ResizeObserver runs.
    // Measure synchronously so this navigation uses the current header height.
    workspaceRef.current?.style.setProperty('--comparison-header-height', `${comparisonSettingsRef.current?.getBoundingClientRect().height ?? 0}px`);
    workspaceRef.current?.scrollTo({ top: 0, left: 0, behavior: reducedMotion ? 'auto' : undefined });
    if (guide && (mobilePanel === 'person' || mobilePanel === 'report')) workspaceRef.current?.querySelector(mobilePanel === 'person' ? '.journey-header' : '.report-head')?.scrollIntoView({ block: 'start', behavior: reducedMotion ? 'auto' : 'smooth' });
  }, [mobilePanel, guide?.step, comparisonReady]);
  useEffect(() => { if (compareFocus === 'person') setLiveExpanded(false); }, [compareFocus]);
  useEffect(() => { requestView('default'); }, [plan.id, canvasView]);
  // Two Futures opens on a ghost whose futures differ, so the story is visible without searching.
  useEffect(() => { if (mode === 'Compare' && !busy && !interrupted) setVisitorId(id => comparison.selectedVisitor(id, peopleGroup)); }, [mode, comparison, peopleGroup, busy, interrupted]);
  useEffect(() => { if (selection.id && mode === 'Build') setInspectorOpen(true); }, [selection.id, selection.kind, selection.owner]);
  useEffect(() => {
    const client = new SimulationClient(state => flushSync(() => {
      const context = launchContext.current;
      if (!context || state.requestId !== context.requestId) return;
      const { destination, scope, planIds, presentResult } = context;
      const notify = (message: (tr: Messages) => string) => say(tr => presentResult ? message(tr)
        : `${state.requests.map(request => request.plan.name).join(' / ')}: ${message(tr)}`);
      setBusy(state.status === 'running');
      if (state.status === 'running') return;
      if (state.status === 'canceled') { if (presentResult) setPlaying(false); setLastRun({ kind: 'stopped', planIds }); notify(tr => tr.notices.cancelled); return; }
      const results = state.runs;
      const partial = state.failure?.code === 'simulation_aborted' && destination !== 'Compare';
      if (state.status === 'failed' && !partial) {
        if (presentResult) setPlaying(false);
        setLastRun({ kind: 'failed', planIds });
        const failed = results?.find(result => result.status !== 'succeeded');
        if (failed) {
          const failures = failed.issues.filter(issue => issue.severity === 'error').slice(0, 3);
          say(tr => `${failed.request.plan.name}: ${failures.map(issue => issueText(issue, tr.lang)).join(tr.lang === 'zh' ? '；' : '; ')}`);
          if (presentResult) { setChecksPlanId(failed.request.plan.id); setShowIssues(true); setMobilePanel('canvas'); }
        } else notify(tr => tr.notices.workerFailed);
        return;
      }
      if (!results) return;
      if (partial) setLastRun({ kind: 'failed', planIds });
      setRuns(previous => updateRunResults(previous, results));
      if (presentResult) {
        if (scope === 'cutoff') setBasis('cutoff');
        setMode(destination); setTime(0); setSpeed(1); setPlaying(!partial && autoplayAfterRun(reducedRef.current)); setDockOpen(destination !== 'Compare'); setShowIssues(false); setChecksPlanId(undefined); setSelection({ id: '', kind: 'node', owner: planIds[0] });
        if (destination === 'Compare') { setCompareFocus('overview'); setMobilePanel('report'); setPeopleGroup(undefined); }
      }
      const people = results[0].population.length; const total = results.reduce((sum, result) => sum + result.events.length, 0);
      notify(partial ? tr => tr.notices.aborted : tr => tr.notices.done(people, total.toLocaleString(tr.lang === 'zh' ? 'zh-CN' : 'en-US')));
    }));
    worker.current = client;
    return () => { client.dispose(); projectRead.current += 1; };
  }, []);
  useEffect(() => {
    const projects = new ImportClient(setProjectImportState), library = new ImportClient(setTemplateImportState);
    projectImporter.current = projects; templateImporter.current = library;
    return () => { projects.dispose(); library.dispose(); };
  }, []);
  useEffect(() => {
    if (dialog !== 'templates') templateImporter.current?.cancel();
    setProjectReadFailed(false);
  }, [dialog]);
  useEffect(() => {
    const handle = (event: KeyboardEvent) => {
      if (dialog || event.defaultPrevented) return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') { event.preventDefault(); save(); return; }
      if (event.target instanceof HTMLElement && event.target.closest('input, textarea, select, [contenteditable="true"]')) return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); event.shiftKey ? redo() : undo(); }
      // Focused controls keep their native Space activation.
      if (event.code === 'Space' && run && mode !== 'Build' && !(event.target instanceof HTMLElement && event.target.closest('button, a, summary'))) { event.preventDefault(); setPlaying(value => !value); }
    };
    window.addEventListener('keydown', handle); return () => window.removeEventListener('keydown', handle);
  });

  const stats = statisticsAt(run, basis);
  const planNodes = plan.graph.nodes.filter(node => `${node.name} ${t.nodeTypes[node.type]}`.toLowerCase().includes(search.toLowerCase()));
  const activeEvents = useMemo(() => mode !== 'Build' && (dockOpen || !comparing) && bottomTab === 'events' ? (run?.events ?? []).filter(event => event.time <= time).slice(-80).reverse() : [], [run, time, bottomTab, mode, dockOpen, comparing]);
  const readOnly = mode !== 'Build';
  const staffCount = plan.staff.length;
  const deviceCount = plan.deviceTypes.reduce((sum, item) => sum + item.quantity, 0);
  const progress = endTime ? Math.min(100, time / endTime * 100) : 0;
  const bounds = plan.graph.nodes.reduce((box, node) => ({ minX: Math.min(box.minX, node.layout.x), maxX: Math.max(box.maxX, node.layout.x), minY: Math.min(box.minY, node.layout.y), maxY: Math.max(box.maxY, node.layout.y) }), { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity });
  const splitRows = stageView || !plan.graph.nodes.length || (bounds.maxX - bounds.minX + 240) >= (bounds.maxY - bounds.minY + 140);
  const scenarioNameOf = (target: Plan) => project.scenarios.find(item => item.id === target.scenarioId)?.name ?? target.scenarioId;
  const live = liveSummary(view);
  const runState = deriveRunState({ busy, hasRun: !!run, runFailed: run?.status === 'failed', stale: stale || (mode === 'Compare' && secondStale), lastRun, planId: plan.id });
  const fullSidebar = mode === 'Build' || railExpanded || (mode === 'Compare' && !second);
  const cutoffLabel = formatTime(stats?.until ?? scenario.observationCutoff);

  type Metric = { key: string; label: string; icon: ReactNode; value: string; hint?: string };
  /** Rehearse shows two clocks side by side: the replay moment and the final results at cutoff. */
  const liveMetrics: Metric[] = [
    { key: 'flow', label: t.live.inFlow, icon: <Ghost size={14} />, value: String(live.inFlow) },
    { key: 'wait', label: t.live.waiting, icon: <Hourglass size={14} aria-hidden="true" />, value: String(live.waiting) },
    { key: 'serve', label: t.live.serving, icon: <Users size={14} aria-hidden="true" />, value: String(live.serving) },
    { key: 'done', label: t.live.finished, icon: <CircleCheck size={14} aria-hidden="true" />, value: String(live.completed) },
  ];
  const finalMetrics: Metric[] = [
    { key: 'completed', label: t.metrics.completed, icon: <CircleCheck size={14} aria-hidden="true" />, value: stats ? String(stats.outcomes.completed) : '—', hint: stats ? `${t.review[basis]} · ${stats.arrived} ${t.metrics.guests}` : '' },
    { key: 'average', label: t.metrics.average, icon: <Hourglass size={14} aria-hidden="true" />, value: t.formatWait(stats?.averageWaiting), hint: t.review[basis] },
    { key: 'p90', label: t.metrics.p90, icon: <Timer size={14} aria-hidden="true" />, value: t.formatWait(stats?.p90Waiting), hint: t.metrics.p90Hint },
    { key: 'unfinished', label: t.metrics.unfinished, icon: <Ghost size={14} />, value: stats ? String(stats.outcomes.unfinished) : '—', hint: stats ? t.metrics.unfinishedHint(stats.outcomes.rejected + stats.outcomes.dismissed + stats.outcomes.diverted + stats.outcomes.loop_limit) : '' },
  ];

  function canvasProps(target: Plan, targetRun: SimulationRun | undefined, targetView: typeof view, targetPrevious: typeof view | undefined, outdated: boolean) {
    let selected = selection.id;
    if (selectedNode && !target.graph.nodes.some(node => node.id === selected) && selectedNode.type === 'service') selected = target.graph.nodes.find(node => node.type === 'service' && node.stageKey === selectedNode.stageKey)?.id ?? '';
    return { plan: target, selected, onSelect: (id: string, kind: 'node' | 'edge') => { setSelection({ id, kind, owner: target.id }); if (id) setInspectorOpen(true); },
      onMove: (positions: { id: string; x: number; y: number }[]) => { if (!readOnly) changePlan({ ...target, graph: { ...target.graph, nodes: target.graph.nodes.map(node => { const position = positions.find(item => item.id === node.id); return position ? { ...node, layout: { ...node.layout, x: position.x, y: position.y } } : node; }) } }); },
      onConnect: connect, onDelete: (nodes: string[], edges: string[]) => deleteElements(nodes, edges, target.id), onAdd: addNode, editable: !readOnly, issues: target.id === plan.id ? issues : secondIssues, view: targetView,
      previous: mode === 'Build' ? undefined : targetPrevious, run: mode === 'Build' ? undefined : targetRun, time, stale: outdated, tracked: mode === 'Build' ? undefined : tracked,
      chooseVisitor, visitorName: nameOf, changed: comparing ? changedIds : undefined,
      request: viewRequest, stageView, expanded: expandedSet, onStage: toggleStage, reducedMotion, onManual: () => setViewMark(null) };
  }

  const stageTitle = mode === 'Build' ? plan.name : mode === 'Compare' ? t.stage.compare : t.stage.rehearse;
  const stageSub = mode === 'Build' ? t.stage.counts(plan.graph.nodes.length, plan.graph.edges.length) : `${t.live.clock(formatTime(time))} / ${formatTime(endTime)}`;
  const exampleCounts = useMemo(() => { const example = initialDocument().plans[0]; return t.stage.counts(example.graph.nodes.length, example.graph.edges.length); }, [t]);

  if (!persistence.ready) return <p role="status">{t.persistence.loading}</p>;
  return <div className={cls('app', `mode-${mode.toLowerCase()}`, comparing && `focus-${compareFocus}`, comparing && `mobile-${mobilePanel}`, reportCollapsed && 'report-collapsed', (dialog === 'welcome' || dialog === 'new' || dialog === 'templates') && 'is-entry')}>
    {(dialog === 'welcome' || dialog === 'new' || dialog === 'templates') && <div className="entry-atmosphere"><HauntedBackdrop /></div>}
    <TopBar mode={mode} busy={busy} canUndo={!!past.length} canRedo={!!future.length} unsaved={unsaved} draftSaved={draftSaved} activityName={scenario.name ?? t.header.untitled} planName={plan.name} planChecks={runPlanChecks}
      compareUnavailable={!second ? t.topbar.compareUnavailable : undefined} runMode={runMode} lang={lang} onMode={switchMode} onUndo={undo} onRedo={redo} onRun={rerun} onStop={stopRun} onSave={save}
      onImport={() => fileInput.current?.click()} onExport={() => setDialog('export')} onPlanJson={() => setDialog('plan-json')} onScenarioJson={() => setDialog('scenario-json')} onAbout={() => setDialog('about')}
      onRunMode={value => { setPlaying(false); setRunMode(value); }} onLang={switchLanguage} />

    {guide && <GuidedDemo progress={guide} showPlanMapping={comparing && plan.id === guide.b && second?.id === guide.c} ready={comparisonReady && !!selectedStats && !!selectedSecondStats && plan.id === (guide.step >= 4 ? guide.b : guide.a) && second?.id === (guide.step >= 4 ? guide.c : guide.b)} busy={busy}
      onExportProject={exportGuideProject} onNext={advanceGuide} onReset={() => resetGuide(false)} onRerun={() => resetGuide(true)} onExit={() => { setGuide(null); setEvidenceTarget(undefined); }} onPacking={() => showGuideEvidence('packing')}
      onResources={() => { setBottomTab('resources'); setDockOpen(true); setCompareFocus('overview'); setMobilePanel('evidence'); setInspectorOpen(false); setPlaying(false); }} />}
    {comparing && <div className="comparison-settings" ref={comparisonSettingsRef}>
      <div className="comparison-identities"><span>A · {plan.name}</span><span>B · {second?.name}</span></div>
      <button type="button" className="btn small" disabled={busy} onClick={() => setDialog('comparison-plans')}>{t.comparePicker.title}</button>
      <details className="comparison-options" onKeyDown={event => { if (event.key === 'Escape') { event.currentTarget.open = false; event.currentTarget.querySelector('summary')?.focus(); } }}><summary>{t.review[basis]} · A {selectedStats ? formatTime(selectedStats.until) : '—'} / B {selectedSecondStats ? formatTime(selectedSecondStats.until) : '—'}</summary><div className="comparison-options-body">
      <label>{t.review.basis}<select aria-label={t.review.basis} value={basis} onChange={event => setBasis(event.target.value as ResultBasis)}><option value="cutoff">{t.review.cutoff}</option><option value="completion" disabled={!run?.completion || !secondRun?.completion}>{t.review.completion}</option></select></label>
      <label>{t.evidence.threshold}<select ref={thresholdInput} aria-label={t.evidence.threshold} value={threshold} onChange={event => setThreshold(Number(event.target.value) as WaitThreshold)}><option value={60}>{t.evidence.minute}</option><option value={0}>{t.evidence.any}</option></select></label>
      <small>{t.review.completionHint}</small>
      </div></details>
      <button type="button" className="text-btn" aria-expanded={liveExpanded} aria-controls="comparison-live" onClick={() => setLiveExpanded(value => !value)}>{t.live.title} · {formatTime(time)}<ChevronDown size={14} aria-hidden="true" /></button>
    </div>}
    {comparing && <div id="comparison-live" hidden={!liveExpanded} className="metrics-strip two-clocks comparison-live">
          <LiveStatusStrip time={formatTime(time)} metrics={liveMetrics} available={!!run} planName={`A · ${plan.name}`}
            queues={longestQueues(run?.request.plan ?? plan, view, previousView).map(item => ({ id: item.node.id, name: item.node.name, waiting: item.waiting }))} onQueue={id => { setSelection({ id, kind: 'node', owner: plan.id }); focusNodes([id]); }} />
          <LiveStatusStrip time={formatTime(time)} metrics={liveMetrics.map(item => ({ ...item, value: String(liveSummary(secondView)[item.key === 'flow' ? 'inFlow' : item.key === 'wait' ? 'waiting' : item.key === 'serve' ? 'serving' : 'completed']) }))} available={!!secondRun} planName={`B · ${second?.name ?? ''}`}
            queues={longestQueues(secondRun?.request.plan ?? second ?? plan, secondView, secondPrevious).map(item => ({ id: item.node.id, name: item.node.name, waiting: item.waiting }))} onQueue={id => { setSelection({ id, kind: 'node', owner: second!.id }); focusNodes([id]); }} />
        </div>}
    {comparing && <nav className="mobile-compare-nav" aria-label={t.workspace.focus}>
      <button type="button" aria-pressed={mobilePanel === 'report'} onClick={showOverview}>{t.workspace.report}</button>
      <button type="button" aria-pressed={mobilePanel === 'canvas'} onClick={() => { showOverview(); setMobilePanel('canvas'); }}>{t.workspace.canvas}</button>
      <button type="button" aria-pressed={mobilePanel === 'person'} onClick={() => showJourney(peopleGroup)}>{t.workspace.person}</button>
      <button type="button" aria-pressed={mobilePanel === 'evidence'} onClick={() => { setCompareFocus('overview'); setMobilePanel('evidence'); setBottomTab('insights'); setDockOpen(true); }}>{t.review.evidence}</button>
    </nav>}
    <div className="workspace" ref={workspaceRef}>
      {!fullSidebar && mode === 'Rehearse' && <aside className="sidebar is-rail" aria-label={t.navigator.title}>
        <div className="plan-rail-badges"><button type="button" className="plan-badge is-a" title={plan.name} aria-label={`A · ${plan.name} · ${t.studioUi.currentPlan}`} onClick={() => setRailExpanded(true)}>A<StatusMarker id="selected" label={t.studioUi.currentPlan} compact /></button>{second && <button type="button" className="plan-badge is-b" title={second.name} aria-label={`B · ${second.name}`} onClick={() => setRailExpanded(true)}>B</button>}</div>
        <FlowNavigator plan={plan} index={indexA} view={view} previous={previousView} expanded={expandedSet} selected={selection.id} time={time}
          onStage={id => toggleStage(id, !(expandedSet === 'all' || expandedSet.has(id)) || canvasView === 'full')} onNode={id => { setSelection({ id, kind: 'node', owner: plan.id }); focusNodes([id]); }} onExpandSidebar={() => setRailExpanded(true)} />
      </aside>}
      {!fullSidebar && comparing && second && <aside className={cls("sidebar is-report", reportCollapsed && "is-collapsed")} aria-label={t.compare.title}>
        <div className="report-toolbar"><button type="button" className="text-btn report-collapse" aria-expanded={!reportCollapsed} onClick={() => setReportCollapsed(value => !value)}>{reportCollapsed ? t.studioUi.expandReport : t.studioUi.collapseReport}</button>{compareFocus === 'person' && <button type="button" className="text-btn" onClick={showOverview}>{t.workspace.overview}</button>}<button type="button" className="text-btn" title={plan.name} aria-label={t.navigator.plans} onClick={() => setRailExpanded(true)}><PanelLeftOpen size={15} aria-hidden="true" /><span className="current-plan-name">A · {plan.name}</span><StatusMarker id="selected" label={t.studioUi.currentPlan} compact /></button>{!guide && <button type="button" className="text-btn" disabled={busy} onClick={startGuide}>{t.guide.start}</button>}<button type="button" className="text-btn robustness-trigger" aria-label={robustnessLabels[lang].title} title={robustnessLabels[lang].title} disabled={busy} onClick={event => { event.currentTarget.focus(); setPlaying(false); setDialog('robustness'); }}><FlaskConical size={15} aria-hidden="true" /></button></div>
        <CompareReport onChooseRule={() => { const details = thresholdInput.current?.closest('details'); if (details) details.open = true; thresholdInput.current?.focus(); }} onEvidence={() => { setCompareFocus('person'); setMobilePanel('person'); setBottomTab('journey'); setDockOpen(true); setPlaying(false); setEvidenceReveal(value => value + 1); }} onRerun={rerun} runState={interrupted ? lastRun?.kind : undefined} basis={basis} threshold={threshold} guided={!!guide} planA={run?.request.plan ?? plan} planB={secondRun?.request.plan ?? second} runA={run} runB={secondRun} scenario={scenario} ready={comparisonReady} changes={reportChanges}
          visitorId={visitorId} featured={featured} nameOf={nameOf} onFocus={ids => { showOverview(); setMobilePanel('canvas'); focusNodes(ids); }} onChoose={chooseVisitor}
          compact={compareFocus === 'person'} onBrowsePeople={showJourney} onInspect={inspectNodes} onMoment={inspectMoment} />
      </aside>}
      {fullSidebar && <PlanNavigator project={project} scenario={scenario} plan={plan} second={second} busy={busy} editing={!readOnly} collapsed={mode === 'Build' && navigatorCollapsed} selection={selection} search={search}
        onCollapse={() => mode === 'Build' ? setNavigatorCollapsed(value => !value) : setRailExpanded(false)}
        onScenario={id => { const target = project.plans.find(item => item.scenarioId === id); if (target) selectPlan(target.id); }} onPlan={selectPlan} onSetB={id => { if (id !== secondId && launchContext.current?.destination === 'Compare') launchContext.current.presentResult = false; setSecondId(id); setPlaying(false); }}
        onNew={() => setDialog('new')} onSettings={() => enterBuild(plan.id, 'scenario')} onGuests={() => enterBuild(plan.id, 'scenario')} onResources={() => enterBuild(plan.id, 'resources')}
        onRename={() => { setPlanName(plan.name); setDialog('rename-plan'); }} onDuplicate={copyPlan} onDelete={() => { const remaining = project.plans.filter(item => item.id !== plan.id); setRuns(previous => removeRunResults(previous, [plan.id])); commit({ ...project, plans: remaining }); selectPlan(remaining[0].id, remaining); }}
        onTemplate={() => prepareTemplate()} onAddNode={() => openLibrary('nodes')} onSearch={setSearch} onNode={id => { setSelection({ id, kind: 'node', owner: plan.id }); focusNodes([id]); }} onGuide={startGuide} onLibrary={() => openLibrary('plans')} />}

      <main className="stage">
        <div className="stage-head">
          <div className="stage-title"><span className={cls('live-dot', mode !== 'Build' && 'on')} /><h1>{stageTitle}</h1><small>{stageSub}</small>{comparing && comparison.status === 'ready' && runState.kind === 'complete' && <span className="run-state-card is-compact" data-state="complete"><StatusMarker id="finished" label={t.runState.complete.label} /></span>}</div>
          <ModeActions unavailable={busy ? t.runState.computing.description : !second ? t.topbar.compareUnavailable : undefined}>
            {mode !== 'Build' && !comparing && run && <label className="select-pill small" title={t.review.completionHint}><span>{t.review.basis}</span><select aria-label={t.review.basis} value={basis} onChange={event => setBasis(event.target.value as ResultBasis)}><option value="cutoff">{t.review.cutoff}</option><option value="completion" disabled={!run.completion || (mode === 'Compare' && !secondRun?.completion)}>{t.review.completion}</option></select></label>}
            {comparing && compareFocus === 'overview' && <ArrangementControl value={arrangement} narrow={narrowScreen} onChange={value => { setArrangement(value); saveArrangement(value); }} />}
            {comparing && <div className="comparison-focus" role="group" aria-label={t.workspace.focus}>
              <button type="button" aria-pressed={compareFocus === 'overview'} onClick={showOverview}>{t.workspace.overview}</button>
              <button type="button" aria-pressed={compareFocus === 'person'} onClick={() => showJourney(peopleGroup)}><Ghost size={14} />{t.workspace.person}</button>
            </div>}
            {(mode === 'Build' || errorCount > 0) && <button ref={checksTrigger} type="button" className={cls('check-chip', errorCount ? 'bad' : issues.length ? 'warn' : 'ok')} aria-expanded={showIssues} onClick={() => { setChecksPlanId(plan.id); setShowIssues(value => !value); }}>
              {errorCount ? <TriangleAlert size={14} aria-hidden="true" /> : <CircleCheck size={14} aria-hidden="true" />}{errorCount ? t.stage.toFix(errorCount) : issues.length ? t.stage.notices(issues.length) : t.stage.passed}
            </button>}
            {mode !== 'Build' && hasStages && <div className="view-switch" role="group" aria-label={t.stage.views.label} title={t.stage.viewsHint}>
              <button type="button" aria-label={t.stage.views.stages} title={t.stage.views.stages} aria-pressed={canvasView === 'stages'} className={cls(canvasView === 'stages' && 'active')} onClick={() => { setCanvasView('stages'); setExpanded([]); }}><Boxes size={14} aria-hidden="true" /><span className="btn-label">{t.stage.views.stages}</span></button>
              <button type="button" aria-label={t.stage.views.full} title={t.stage.views.full} aria-pressed={canvasView === 'full'} className={cls(canvasView === 'full' && 'active')} onClick={() => setCanvasView('full')}><Workflow size={14} aria-hidden="true" /><span className="btn-label">{t.stage.views.full}</span></button>
            </div>}
            {mode === 'Build' && <button type="button" className="btn ghost small" title={t.stage.arrange} onClick={arrange} disabled={busy}><WandSparkles size={14} aria-hidden="true" /><span className="btn-label">{t.stage.arrange}</span></button>}
            <button type="button" className="btn ghost small" title={t.stage.fit} aria-pressed={viewMark === 'default'} onClick={() => requestView('default')}><LocateFixed size={14} aria-hidden="true" /><span className="btn-label">{t.stage.fit}</span></button>
            <button type="button" className="btn ghost small" title={t.stage.overview} aria-pressed={viewMark === 'all'} onClick={() => requestView('all')}><Maximize size={14} aria-hidden="true" /><span className="btn-label">{t.stage.overview}</span></button>
          </ModeActions>
        </div>
        {(busy || runState.kind === 'failed' || runState.kind === 'stopped' || stale || mode !== 'Build') && !(comparing && runState.kind === 'complete') && <RunStateCard kind={runState.kind} action={runState.action} onAction={runState.action === 'stop' ? stopRun : runState.action === 'play' ? () => { if (time >= endTime) setTime(0); setPlaying(true); } : rerun} />}
        {mode === 'Rehearse' && <div className="metrics-strip two-clocks">
          <LiveStatusStrip time={formatTime(time)} metrics={liveMetrics} available={!!run} />
          <SummaryStrip title={t.review[basis]} time={cutoffLabel} metrics={finalMetrics} stale={stale} />
        </div>}

        <div className={cls('canvas-area', comparing && `split ${effectiveArrangement(arrangement, narrowScreen, splitRows)}`)}>
        {showIssues && <div className="checks-drawer" role="region" aria-label={t.stage.checksTitle} onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); event.preventDefault(); setShowIssues(false); checksTrigger.current?.focus(); } }}>
          <div className="section-heading"><b>{t.stage.checksTitle}</b><button type="button" autoFocus className="icon-btn" aria-label={t.stage.closeChecks} onClick={() => { setShowIssues(false); checksTrigger.current?.focus(); }}>×</button></div>
          <p className="checks-plan">{t.workspace.checkingPlan(checksPlan.name)}</p>
          {checksPlan.id !== plan.id && <button type="button" className="btn small" onClick={() => { enterBuild(checksPlan.id); setChecksPlanId(checksPlan.id); setShowIssues(true); }}>{t.workspace.editPlan}</button>}
          {!checksIssues.length ? <p className="checks-ok"><CircleCheck size={15} aria-hidden="true" />{t.stage.noIssues}</p> : checksIssues.map((issue, index) => <button type="button" key={index} className={`check-item ${issue.severity}`} onClick={() => { const id = issue.entityIds.find(entity => checksPlan.graph.nodes.some(node => node.id === entity)); enterBuild(checksPlan.id); setChecksPlanId(checksPlan.id); setShowIssues(true); if (id) { setSelection({ id, kind: 'node', owner: checksPlan.id }); setInspectorOpen(true); } }}>
            <b>{issue.severity === 'error' ? t.stage.fix : t.stage.notice}</b><span>{issueText(issue, lang)}</span><small>{issue.path.join('.')}</small>
          </button>)}
        </div>}
          <div className="canvas-pane"><Canvas {...canvasProps(plan, run, view, previousView, stale)} label={comparing ? { badge: 'A', name: plan.name, status: tracked && trackedStatus[0] ? `${tracked.name} · ${trackedStatus[0]}` : undefined } : undefined} compact={comparing} /></div>
          {comparing && second && <div className="canvas-pane"><Canvas {...canvasProps(second, secondRun, secondView, secondPrevious, secondStale)} label={{ badge: 'B', name: second.name, note: t.canvas.changes(reportChanges.length), status: tracked && trackedStatus[1] ? `${tracked.name} · ${trackedStatus[1]}` : undefined }} compact /></div>}
        </div>
        {mode !== 'Build' && <section className={cls('dock', dockOpen && 'open', `tab-${bottomTab}`)}>
          <div className="timeline">
            <button type="button" className="play-btn" aria-label={playing ? t.dock.pause : t.dock.play} disabled={!run} onClick={() => { if (time >= endTime) setTime(0); setPlaying(value => !value); }}>{playing ? <Pause size={16} /> : <Play size={16} />}</button>
            <button type="button" className="icon-btn" aria-label={t.dock.reset} disabled={!run} onClick={() => { setTime(0); setPlaying(false); }}><RotateCcw size={16} /></button>
            <time className="clock-now"><small>{t.live.replay}</small>{formatTime(time)}</time>
            <div className="scrubber-wrap">
              <input className="scrubber" style={{ '--p': `${progress}%` } as CSSProperties} aria-label={t.dock.timeline} aria-valuetext={t.studioUi.timeline(formatTime(time), formatTime(endTime))} type="range" min={0} max={endTime || 1} step={0.1} value={Math.min(time, endTime)} disabled={!run} onChange={event => { setTime(Number(event.target.value)); setPlaying(false); }} />
              {mode === 'Rehearse' && run && endTime > 0 && <div className="markers" aria-label={t.dock.markers}>{moments.map((item, index) => <button type="button" key={index} className={`marker k-${item.kind}`} style={{ left: `${Math.min(100, item.time / endTime * 100)}%` }}
                title={`${formatTime(item.time)} · ${keyEventText(item, run.request.plan, nameOf, t)}`} aria-label={`${formatTime(item.time)} · ${keyEventText(item, run.request.plan, nameOf, t)}`} onClick={() => jumpTo(item.time, item.nodeId)}><StatusMarker id={item.kind === 'blocked' ? 'blocked' : item.kind === 'queue' ? 'queue' : 'diff'} compact /></button>)}</div>}
            </div>
            <time className="clock-end">{formatTime(endTime)}</time>
            <label className="select-pill small" title={t.dock.speedHint}><select aria-label={t.dock.speed} disabled={!run} value={speed} onChange={event => setSpeed(Number(event.target.value))}>{[0.5, 1, 2, 4, 8].map(value => <option key={value} value={value}>{value}×</option>)}</select><ChevronDown size={12} aria-hidden="true" /></label>
            <span className="clock-label">{t.dock.clock}</span>
          </div>
          <div className="dock-tabs" role="tablist">
            {TABS[mode === 'Compare' ? 'Compare' : 'Rehearse'].map(({ tab, icon: Icon }) => <button type="button" role="tab" aria-selected={dockOpen && bottomTab === tab} key={tab} className={cls(dockOpen && bottomTab === tab && 'active', tab === 'journey' && comparing && 'is-hero')} onClick={() => { if (tab === 'journey' && comparing) showJourney(peopleGroup); else { if (comparing) setCompareFocus('overview'); setBottomTab(tab); setDockOpen(true); } }}>
              {tab === 'journey' ? <Ghost size={14} /> : <Icon size={14} aria-hidden="true" />}{tab === 'journey' && comparing ? t.dock.tabs.futures : t.dock.tabs[tab]}
            </button>)}
            <span className="dock-spacer" />
            {run && <details className="legend"><summary>{t.legend.label}</summary><div role="note">{LEGEND.map(key => <span key={key} className={`lg-${key}`}><i aria-hidden="true" />{t.legend[key]}</span>)}</div></details>}
            {(stale || (mode === 'Compare' && secondStale)) && <span role="status">{t.metrics.stale}{mode === 'Compare' ? ` · ${[stale && 'A', secondStale && 'B'].filter(Boolean).join(', ')}` : ''}</span>}
            {mode === 'Compare' && <button type="button" className="btn small accent" onClick={() => { setPlaying(false); setDialog('stress'); }}><Flame size={14} aria-hidden="true" />{t.dock.stress}</button>}
            <button type="button" className="icon-btn" aria-label={dockOpen ? t.dock.collapse : t.dock.expand} aria-expanded={dockOpen} title={dockOpen ? t.dock.collapse : t.dock.expand} onClick={() => { if (comparing && compareFocus === 'person' && dockOpen) showOverview(); else setDockOpen(value => !value); }}>{dockOpen ? <ChevronDown size={16} /> : <ChevronUp size={16} />}</button>
          </div>
          {!comparing && !dockOpen && run && <p className="dock-summary">{t.studioUi.dockSummary(bottomTab === 'events' ? activeEvents.length : bottomTab === 'journey' ? picks.reduce((sum, group) => sum + group.items.length, 0) : moments.filter(item => item.time <= time).length, tracked ? `${tracked.name} · ${trackedStatus[0]}` : moments.filter(item => item.time <= time).at(-1) ? keyEventText(moments.filter(item => item.time <= time).at(-1)!, run.request.plan, nameOf, t) : '')}</p>}
          {dockOpen && <div className="dock-body">
            {!run && <EmptyResults onRun={() => launch([plan], 'Rehearse')} />}
            {run && bottomTab === 'insights' && (comparing && !comparisonReady ? <p className="report-stale">{t.evidence.unavailable[comparison.status]}</p> : <Insights onRerun={rerun} initialEvidence={evidenceTarget} threshold={threshold} key={`${run.inputKey}-${secondRun?.inputKey}-${basis}-${evidenceTarget?.owner}-${evidenceTarget?.id}`} basis={basis} onChoose={chooseVisitor} onJump={jumpTo} onExperiment={second?.id === 'alternative' && second.staff.some(item => item.id === 'pack-staff') && second.graph.nodes.some(item => item.id === 'packing') ? packingExperiment : undefined} run={run} second={secondRun} compare={mode === 'Compare'} comparisonReady={comparisonReady} changes={reportChanges.map(item => ({ id: item.id, kind: item.kind, label: item.change }))} scenarioId={scenario.id} overrides={scenario.assumptionOverrides.length} onSelectNode={(id, owner) => { setSelection({ id, kind: 'node', owner }); setInspectorOpen(true); focusNodes([id]); }} />)}
            {run && bottomTab === 'now' && <NowPanel plan={run.request.plan} view={view} previous={previousView} time={time} moments={moments} picks={picks} nameOf={nameOf}
              tracked={tracked ? { ...tracked, status: trackedStatus[0] } : undefined} onFocus={id => { setSelection({ id, kind: 'node', owner: plan.id }); focusNodes([id]); }}
              onJump={jumpTo} onChoose={chooseVisitor} onOpenJourney={() => setBottomTab('journey')} />}
            {run && bottomTab === 'events' && <EventLog events={activeEvents} plan={run.request.plan} nameOf={nameOf} onPick={event => { if (event.participantId) chooseVisitor(event.participantId); else if (event.nodeId) jumpTo(event.time, event.nodeId); }} />}
            {run && bottomTab === 'journey' && (comparing && !comparisonReady ? <div className="comparison-unavailable" role="status"><p>{t.evidence.unavailable[comparison.status]}</p><button type="button" className="btn primary" disabled={busy} onClick={() => second && launch([plan, second], 'Compare')}>{t.run.start}</button></div> : <GhostJourney onEditGuests={() => enterBuild(plan.id, 'scenario')} revealEvidence={evidenceReveal} reducedMotion={reducedMotion} onInspect={(ids, ownerId) => { const id = ids[0]; if (id) { setSelection({ id, kind: 'node', owner: ownerId }); setInspectorOpen(true); focusNodes(ids); } }} onDivergence={(at, nodeA, nodeB) => { jumpTo(at, nodeA ?? nodeB, nodeA ? plan.id : second?.id); focusNodes([nodeA, nodeB].filter((id): id is string => !!id), { [plan.id]: nodeA ? [nodeA] : [], ...(second ? { [second.id]: nodeB ? [nodeB] : [] } : {}) }); }} basis={basis} threshold={threshold} runs={comparing && secondRun ? [run, secondRun] : [run]} compare={comparing && !!secondRun} scenario={scenario} visitorId={visitorId} time={time} endTime={endTime}
              picks={picks} featured={featured} nameOf={nameOf} onChoose={id => chooseVisitor(id, true)} onLocate={() => { if (comparing) { showOverview(); setMobilePanel('canvas'); } locateVisitor(visitorId); }} onJump={(at, nodeId, ownerId) => jumpTo(at, nodeId, ownerId)}
              group={peopleGroup} onGroupChange={setPeopleGroup} onOverview={comparing ? showOverview : undefined} />)}
            {run && bottomTab === 'resources' && (comparing && !comparisonReady ? <p className="report-stale">{t.evidence.unavailable[comparison.status]}</p> : <ResourceUse run={run} second={mode === 'Compare' && comparisonReady ? secondRun : undefined} basis={basis} limits={resourceLimits} onLimits={setResourceLimits} />)}
          </div>}
        </section>}
      </main>

      <Inspector plan={owner} scenario={ownerScenario} node={selectedNode} edge={selectedEdge} editable={!readOnly && owner.id === plan.id} issues={ownerIssues} run={ownerRun} basis={basis} stale={ownerStale} onRerun={() => launch(mode === 'Compare' && second ? [plan, second] : [plan], mode === 'Build' ? 'Rehearse' : mode)} onNode={node => changePlan({ ...owner, graph: { ...owner.graph, nodes: owner.graph.nodes.map(item => item.id === selection.id ? node : item) } })} onEdge={edge => changePlan({ ...owner, graph: { ...owner.graph, edges: owner.graph.edges.map(item => item.id === selection.id ? edge : item) } })} onAdvanced={() => setDialog(selectedNode ? 'node-json' : 'edge-json')} onDelete={() => deleteElements(selectedNode ? [selectedNode.id] : [], selectedEdge ? [selectedEdge.id] : [], owner.id)} onResources={() => enterBuild(owner.id, 'resources')} onSaveTemplate={() => prepareTemplate(selectedNode)} collapsed={!inspectorOpen} onToggle={() => setInspectorOpen(value => !value)} />
    </div>

    <LiveAnnouncer message={busy ? t.runState.computing.description : stale ? t.runState.stale.description : notice?.[lang]} error={runState.kind === 'failed' ? notice?.[lang] ?? t.runState.failed.description : undefined} />
    <footer className="status-bar">
      <span className="status-state"><i className={busy ? 'pending' : ''} />{busy ? t.status.computing : t.status.local}</span>
      <span className="status-notice" role="status">{notice ? notice[lang] : t.status.hint}</span>
      <span className="status-scope">{t.status.scope}<button type="button" onClick={() => setDialog('about')}>{t.status.scopeLink}</button></span>
    </footer>

    {(persistence.error || persistence.conflict) && <div className="notice" role="alert">
      {persistence.conflict ? t.persistence.conflict : t.persistence.failed}
      <button type="button" onClick={() => persistence.setChooseRecovery(true)}>{t.persistence.recover}</button>
      <button type="button" onClick={persistence.retry}>{t.persistence.retry}</button>
      <button type="button" onClick={() => download('recovery.json', JSON.stringify({ project, recovery: persistence.error?.recovery }, null, 2), 'application/json')}>{t.persistence.raw}</button>
    </div>}
    {persistence.chooseRecovery && <Modal title={t.persistence.recover} onClose={() => persistence.setChooseRecovery(false)} wide>
      <div className="modal-body"><p>{t.persistence.recoveryHint}</p>
        {persistence.recovery.map(item => <div className="check-item" key={item.id}>
          <span>{item.status === 'ready' ? item.value.scenarios.map(scenario => scenario.name ?? scenario.id).join(', ') : item.status} · {new Date(item.createdAt).toLocaleString(lang)} · {item.tabId}</span>
          <button type="button" onClick={() => download(`recovery-${item.id.replaceAll(':', '-')}.json`, item.raw, 'application/json')}>{t.persistence.raw}</button>
          <button type="button" disabled={item.status !== 'ready'} onClick={() => { projectRead.current += 1; projectImporter.current?.cancel(); void persistence.recover(item); }}>{t.persistence.restore}</button>
          {persistence.recoveryHeads.filter(head => head.projectId === item.projectId).length > 1 && <button type="button" disabled={item.status !== 'ready'} onClick={() => { projectRead.current += 1; projectImporter.current?.cancel(); void persistence.recover(item, true); }}>{t.persistence.resolve}</button>}
        </div>)}
      </div>
    </Modal>}
    {projectImportBusy && dialog !== 'welcome' && dialog !== 'new' && <div role="status">{t.imports.busy}<button type="button" onClick={() => { projectRead.current += 1; projectImporter.current?.cancel(); }}>{t.common.cancel}</button></div>}
    <input ref={fileInput} type="file" accept=".json,application/json" hidden onChange={event => {
      const file = event.target.files?.[0];
      // Clear before awaiting so a failed read can retry the same file.
      event.target.value = '';
      if (file) void importProject(file);
    }} />
    {!!documentIssues.length && <Modal title={t.stage.checksTitle} onClose={() => { projectImporter.current?.cancel(); setDocumentIssues([]); setIssuePage(0); }} wide>
      <div className="modal-body">{documentIssues.slice(issuePage * 50, issuePage * 50 + 50).map((issue, index) => <div key={index} className={`check-item ${issue.severity}`}>
        <b>{issue.severity}</b><span>{issueText(issue, lang)}</span><small>{issue.path.join('.') || '$'}</small>
      </div>)}{documentIssues.length > 50 && <><p>{t.imports.diagnostics(documentIssues.length, issuePage * 50 + 1, Math.min(documentIssues.length, issuePage * 50 + 50))}</p><button type="button" disabled={!issuePage} onClick={() => setIssuePage(page => page - 1)}>{t.imports.previous}</button><button type="button" disabled={(issuePage + 1) * 50 >= documentIssues.length} onClick={() => setIssuePage(page => page + 1)}>{t.imports.next}</button><button type="button" onClick={() => download('import-diagnostics.json', JSON.stringify(documentIssues, null, 2), 'application/json')}>{t.imports.download}</button></>}</div>
    </Modal>}
    {dialog === 'robustness' && second && <Modal title={robustnessLabels[lang].title} onClose={() => setDialog(null)} wide><div className="modal-body robustness-body"><LazyRobustnessPanel project={project} baselinePlanId={plan.id} candidatePlanId={second.id} lang={lang} embedded /></div></Modal>}
    {dialog === 'resources' && <ResourcesEditor plan={plan} horizon={scenario.horizon} onApply={changePlan} onClose={() => setDialog(null)} />}
    {dialog === 'scenario' && <ScenarioEditor scenario={scenario} planNames={project.plans.filter(item => item.scenarioId === scenario.id).map(item => item.name)} onApply={next => commit({ ...project, scenarios: project.scenarios.map(item => item.id === next.id ? next : item), plans: project.plans.map(item => item.scenarioId !== next.id ? item : { ...item, graph: { ...item.graph, nodes: item.graph.nodes.map(node => node.type === 'entrance' ? { ...node, arrivalStreamIds: node.arrivalStreamIds.filter(id => next.arrivalStreams.some(stream => stream.id === id)) } : node) } }) })} onClose={() => setDialog(null)} />}
    {dialog?.endsWith('-json') && <JsonEditor key={`${dialog}-${selection.id}`} title={dialog === 'node-json' ? t.dialogs.nodeJson : dialog === 'edge-json' ? t.dialogs.edgeJson : dialog === 'scenario-json' ? t.dialogs.scenarioJson(project.plans.filter(item => item.scenarioId === scenario.id).map(item => item.name).join(lang === 'zh' ? '、' : ', ')) : t.dialogs.planJson} value={dialog === 'node-json' ? selectedNode : dialog === 'edge-json' ? selectedEdge : dialog === 'scenario-json' ? scenario : plan} readOnly={readOnly} onClose={() => setDialog(null)} onApply={value => {
      const schema = dialog === 'node-json' ? nodeSchema : dialog === 'edge-json' ? edgeSchema : dialog === 'scenario-json' ? scenarioSchema : planSchema;
      const result = schema.safeParse(value); if (!result.success) return result.error.issues.slice(0, 5).map(issue => `${issue.path.join('.')}: ${zodIssueText(issue as { code: string; message: string; params?: Record<string, unknown> }, lang)}`).join('\n');
      if (dialog === 'node-json') { const next = result.data as Node; if (next.id !== selection.id) return t.dialogs.keepNodeId; changePlan({ ...owner, graph: { ...owner.graph, nodes: owner.graph.nodes.map(item => item.id === selection.id ? next : item) } }); }
      if (dialog === 'edge-json') { const next = result.data as Edge; if (next.id !== selection.id) return t.dialogs.keepEdgeId; changePlan({ ...owner, graph: { ...owner.graph, edges: owner.graph.edges.map(item => item.id === selection.id ? next : item) } }); }
      if (dialog === 'plan-json') { const next = result.data as Plan; if (next.id !== plan.id || !project.scenarios.some(item => item.id === next.scenarioId)) return t.dialogs.keepPlanId; changePlan(next); }
      if (dialog === 'scenario-json') { const next = result.data as Scenario; if (next.id !== scenario.id) return t.dialogs.keepScenarioId; commit({ ...project, scenarios: project.scenarios.map(item => item.id === next.id ? next : item) }); }
    }} />}
    <input ref={templateInput} type="file" accept=".json,application/json" multiple hidden onChange={async event => {
      const files = Array.from(event.currentTarget.files ?? []); event.currentTarget.value = ''; if (!files.length) return;
      setTemplateError(''); setTemplateNotice('');
      try {
        const client = templateImporter.current!;
        const state = await client.startFiles(files, { kind: 'templates' });
        if (state.requestId !== client.getState().requestId || state.status === 'canceled' || state.status === 'disposed') return;
        const value = client.getValue(state.requestId);
        if (!value || value.kind !== 'templates') { setTemplateError(t.templates.importFailed); return; }
        const previousCount = currentTemplates.current.length;
        const next = appendImportedTemplates(currentTemplates.current, value.templates);
        if (await persistTemplates(next)) {
          setLibraryTab(next.slice(previousCount).some(item => !item.nodeId) ? 'plans' : 'nodes');
          setTemplateNotice(t.templates.imported(next.length - previousCount));
          say(tr => tr.templates.imported(next.length - previousCount));
        }
      } catch { setTemplateError(t.templates.importFailed); }
    }} />
    {dialog === 'templates' && <Modal title={t.templates.title} icon={<BookOpen size={18} />} onClose={() => setDialog(null)} wide>
      <div className="spellbook-intro"><div><span className="eyebrow">KIROWEEN / GHOST REHEARSAL</span><p>{t.templates.subtitle}</p></div><Pumpkin size={64} /></div>
      <div className="dialog-tabs" role="tablist">{(['plans', 'nodes'] as const).map(tab => <button type="button" role="tab" aria-selected={libraryTab === tab} className={libraryTab === tab ? 'active' : ''} key={tab} onClick={() => setLibraryTab(tab)}>{t.templates[tab]}</button>)}</div>
      <div className="modal-body template-library">
        {persistence.templateState.status !== 'ready' && persistence.templateState.status !== 'empty' && <div role="alert">
          <p>{t.persistence.libraryFailed}</p>
          {persistence.templateState.heads.map(item => <div key={item.id}>
            <button type="button" onClick={() => download('template-recovery.json', item.raw, 'application/json')}>{t.persistence.raw}</button>
            {item.status === 'ready' && <button type="button" disabled={persistence.templateBusy} onClick={() => void persistence.saveTemplates(item.value, true)}>{t.persistence.resolve}</button>}
          </div>)}
          <button type="button" disabled={persistence.templateBusy} onClick={() => void persistence.saveTemplates([], true)}>{t.persistence.resetLibrary}</button>
        </div>}
        <div className="template-transfer">
          <button type="button" className="btn secondary" onClick={() => { setTemplateError(''); setTemplateNotice(''); templateInput.current?.click(); }}><Upload size={15} />{t.templates.import}</button>
          <button type="button" className="btn ghost" disabled={!templates.length} onClick={() => download('ghost-rehearsal-templates.json', serializeTemplates(templates), 'application/json')}><Download size={15} />{t.templates.exportAll(templates.length)}</button>
        </div>
        {(templateImportState?.status === 'reading' || templateImportState?.status === 'parsing') && <p role="status">{t.imports.busy}<button type="button" onClick={() => templateImporter.current?.cancel()}>{t.common.cancel}</button></p>}
        <ImportDiagnostics client={templateImporter.current} state={templateImportState} lang={lang} />
        {templateNotice && <p className="template-notice" role="status">{templateNotice}</p>}
        <p className="subtle">{libraryTab === 'plans' ? t.templates.planHint : readOnly ? t.sidebar.readOnlyHint : t.templates.nodeHint}</p>
        {libraryTab === 'nodes' && <label className="field"><span>{t.review.resourcesMode}</span><select value={templateResources} onChange={event => setTemplateResources(event.target.value as 'share' | 'copy')}><option value="share">{t.review.share}</option><option value="copy">{t.review.copy}</option></select><small>{t.review.shareHint}</small></label>}
        <h3 className="eyebrow">{t.templates.presets}</h3>
        {libraryTab === 'nodes' ? <div className="palette">{NODE_TYPES.map(type => <button type="button" key={type} disabled={readOnly} className={`palette-node type-${type}`} onClick={() => { addNode(type); setDialog(null); }}>
          <span className="palette-icon"><NodeIcon type={type} size={19} /></span><span className="palette-text"><b>{t.nodeTypes[type]}</b><small>{t.nodeHints[type]}</small></span>
        </button>)}</div> : <div className="template-grid">
          {(['haunted', 'candy'] as const).map(kind => <button type="button" key={kind} className={`template-card ${kind}`} onClick={() => usePlanTemplate(halloweenProject(kind, t), t.templates[kind].name)}>
            <div className="template-art">{kind === 'haunted' ? <Ghost size={42} /> : <Pumpkin size={50} />}<span>0{kind === 'haunted' ? 1 : 2}</span></div><b>{t.templates[kind].name}</b><small>{t.templates[kind].hint}</small>
          </button>)}
          <button type="button" className="template-card" onClick={() => { const document = localizeDocument(initialDocument(), 'zh', lang); usePlanTemplate(document, document.plans[0].name); }}><div className="template-art"><LayoutGrid size={38} /><span>03</span></div><b>{t.dialogs.example}</b><small>{exampleCounts}</small></button>
          <button type="button" className="template-card blank" onClick={() => usePlanTemplate(emptyProject(t.defaults), t.defaults.plan)}><Plus size={28} /><b>{t.templates.blank}</b><small>{t.templates.blankHint}</small></button>
        </div>}
        <div className="section-heading"><h3 className="eyebrow">{t.templates.saved}</h3><div className="section-actions">
          {libraryTab === 'plans' && <button type="button" className="icon-btn" aria-label={t.templates.savePlan} title={t.templates.savePlan} onClick={() => prepareTemplate()}><BookmarkPlus size={15} /></button>}
        </div></div>
        <div className="saved-templates">{templates.filter(item => libraryTab === 'nodes' ? !!item.nodeId : !item.nodeId).map(item => <div className="saved-template" key={item.id}>
          <button type="button" className="side-action" disabled={!!item.nodeId && readOnly} onClick={() => item.nodeId ? useNodeTemplate(item) : usePlanTemplate(item.document, item.name)}>{item.nodeId ? <NodeIcon type={item.document.plans[0].graph.nodes.find(node => node.id === item.nodeId)!.type} size={18} /> : <BookOpen size={18} />}<span>{item.name}</span><Plus size={15} /></button>
          <button type="button" className="icon-btn" aria-label={`${t.templates.export}: ${item.name}`} title={t.templates.export} onClick={() => download(`ghost-rehearsal-${item.nodeId ? 'node' : 'plan'}-${item.id}.json`, serializeTemplate(item), 'application/json')}><Download size={14} /></button>
          <button type="button" className="icon-btn danger" aria-label={`${t.templates.remove}: ${item.name}`} title={t.templates.remove} onClick={async () => { if (await persistTemplates(templates.filter(saved => saved.id !== item.id))) say(tr => tr.templates.removed); }}><Trash2 size={14} /></button>
        </div>)}</div>
        {!templates.some(item => libraryTab === 'nodes' ? !!item.nodeId : !item.nodeId) && <p className="template-empty">{t.templates.empty}</p>}
        <p className="form-error" role="alert">{templateError}</p><p className="subtle template-local">{t.templates.local}</p>
      </div>
    </Modal>}
    {dialog === 'template-bindings' && connections && <Modal title={t.templates.connectTitle} onClose={() => openLibrary('nodes')}>
      <form onSubmit={event => { event.preventDefault(); useNodeTemplate(connections.template, connections.values); }}>
        <div className="modal-body"><p>{t.templates.connectHint}</p>{connections.dependencies.map(item => <label className="field" key={`${item.kind}:${item.id}`}><span>{t.templates.bindingKinds[item.kind]} · {item.name}</span>
          <select required value={connections.values[item.kind]?.[item.id] ?? ''} onChange={event => {
            const value = event.target.value, values = { ...connections.values, [item.kind]: { ...connections.values[item.kind], [item.id]: value } };
            const exits = connections.dependencies.filter(port => port.kind === 'outgoing');
            if (item.kind === 'incoming' && connections.dependencies.filter(port => port.kind === 'incoming').length === 1 && exits.length === 1) {
              values.outgoing = { [exits[0].id]: plan.graph.edges.find(edge => edge.id === value)?.target ?? '' };
            }
            setConnections({ ...connections, values }); setTemplateError('');
          }}><option value="">{t.templates.chooseConnection}</option>{item.options.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}</select>
          {!item.options.length && <small>{t.templates.bindingError}</small>}</label>)}<p className="form-error" role="alert">{templateError}</p></div>
        <div className="modal-footer"><button type="button" className="btn ghost" onClick={() => openLibrary('nodes')}>{t.common.cancel}</button><button type="submit" className="btn primary" disabled={connections.dependencies.some(item => !connections.values[item.kind]?.[item.id])}>{t.dialogs.checkApply}</button></div>
      </form>
    </Modal>}
    {dialog === 'save-template' && templateDraft && <Modal title={t.templates.saveTitle} icon={<BookmarkPlus size={18} />} onClose={() => setDialog(null)}>
      <form onSubmit={async event => { event.preventDefault(); const next = { ...templateDraft, name: templateName.trim() }; if (!templateLibrarySchema.safeParse([next]).success) { setTemplateError(t.templates.invalid); return; } if (await persistTemplates([...currentTemplates.current, next])) { setDialog(null); say(tr => tr.templates.stored); } }}>
        <div className="modal-body"><label className="field"><span>{t.templates.name}</span><input aria-label={t.templates.name} value={templateName} maxLength={100} required onChange={event => setTemplateName(event.target.value)} /></label><p className="subtle">{templateDraft.nodeId ? t.templates.nodeHint : t.templates.local}</p><p className="form-error" role="alert">{templateError || (!['ready', 'empty'].includes(persistence.templateState.status) ? t.persistence.libraryFailed : '')}</p></div>
        <div className="modal-footer"><button type="button" className="btn ghost" onClick={() => setDialog(null)}>{t.common.cancel}</button><button type="submit" className="btn primary" disabled={!templateName.trim() || persistence.templateBusy || !['ready', 'empty'].includes(persistence.templateState.status)}><BookmarkPlus size={15} />{t.templates.save}</button></div>
      </form>
    </Modal>}
    {dialog === 'rename-plan' && <Modal title={t.review.rename} onClose={() => setDialog(null)}><form onSubmit={event => { event.preventDefault(); changePlan({ ...plan, name: planName.trim() }); setDialog(null); }}><div className="modal-body"><label className="field"><span>{t.review.planName}</span><input value={planName} maxLength={100} required onChange={event => setPlanName(event.target.value)} /></label></div><div className="modal-footer"><button type="submit" className="btn primary" disabled={!planName.trim()}>{t.header.save}</button></div></form></Modal>}
    {dialog === 'about' && <Modal title={t.dialogs.aboutTitle} onClose={() => setDialog(null)}><div className="modal-body about">
      <div className="about-brand"><div className="about-ghost"><Ghost size={52} /></div><h2>{t.brand.motto}</h2><span>{t.brand.name} · {t.brand.tagline}</span></div>
      <p>{t.dialogs.about1}</p><p>{t.dialogs.about2}</p>
      <p className="scope-note">{lang === 'zh' ? PRODUCT_STATEMENT.zh : PRODUCT_STATEMENT.en}</p>
      <p className="subtle">{lang === 'zh' ? PRODUCT_STATEMENT.en : PRODUCT_STATEMENT.zh}</p>
      <p>{t.dialogs.about3}</p>
    </div></Modal>}
    {dialog === 'comparison-plans' && <ComparisonPlanPicker plans={project.plans.filter(item => item.scenarioId === scenario.id)} left={plan.id} right={second?.id ?? ''} scope={runMode} guided={!!guide} onClose={() => setDialog(null)} onCompare={comparePlans} />}
    {dialog === 'export' && <Modal title={t.dialogs.exportTitle} icon={<Download size={18} />} onClose={() => setDialog(null)}><div className="modal-body">
      <button type="button" className="option-card" onClick={() => { const result = readProject(JSON.stringify(project), lang); if (result.document) download('ghost-rehearsal.json', serializeDocument(project), 'application/json'); else setDocumentIssues(result.issues); setDialog(null); }}><span className="option-icon"><Braces size={20} /></span><span><b>{t.dialogs.exportProject}</b><small>{t.dialogs.exportProjectHint}</small></span></button>
      <button type="button" className="option-card" onClick={() => { download(`${plan.id}-execution.md`, executionReport(plan, scenario, run, stale, t, project.plans.find(item => item.id === plan.sourcePlanId), basis), 'text/markdown;charset=utf-8'); setDialog(null); }}><span className="option-icon"><FileText size={20} /></span><span><b>{t.dialogs.exportPlan}</b><small>{t.dialogs.exportPlanHint}</small></span></button>
      {comparing && <button type="button" className="option-card" disabled={!comparisonReady || !selectedStats || !selectedSecondStats} onClick={() => { download('comparison-evidence.md', comparisonReport(run, secondRun, comparisonReady, t, basis, threshold), 'text/markdown;charset=utf-8'); setDialog(null); }}><span className="option-icon"><FileText size={20} /></span><span><b>{t.evidence.comparison}</b><small>{t.review[basis]} · {threshold ? t.evidence.minute : t.evidence.any}</small></span></button>}
      <p className="notice">{t.dialogs.exportNotice}</p>
    </div></Modal>}
    {dialog === 'stress' && <Modal title={t.dialogs.stressTitle} icon={<Flame size={18} />} onClose={() => setDialog(null)}><div className="modal-body"><p>{t.dialogs.stressText}</p><label className="field"><span>{t.dialogs.stressFactor}</span><input aria-label={t.dialogs.stressFactor} type="number" min={0.01} max={100} step={0.05} value={stressFactor} onChange={event => setStressFactor(Number(event.target.value))} /></label></div><div className="modal-footer"><button type="button" className="btn ghost" onClick={() => setDialog(null)}>{t.common.cancel}</button><button type="button" className="btn primary" disabled={!Number.isFinite(stressFactor) || stressFactor <= 0 || stressFactor > 100 || busy} onClick={stress}>{t.dialogs.stressApply}</button></div></Modal>}
    {!persistence.chooseRecovery && (dialog === 'welcome' || dialog === 'new') && <EventCreator importError={projectReadFailed ? `${t.notices.fileReadFailed}${projectImportState?.failure?.code.endsWith('_limit') ? ` ${projectImportState.failure.message}` : ''}` : undefined} onCancelImport={projectImportBusy ? () => { projectRead.current += 1; projectImporter.current?.cancel(); } : undefined} onClose={() => { projectRead.current += 1; projectImporter.current?.cancel(); setDialog(null); }} onCreate={startNew} onExample={() => { startNew(localizeDocument(initialDocument(), 'zh', lang)); say(tr => tr.studioUi.exampleLoaded); }} onGuide={dialog === 'welcome' ? startGuide : undefined} onImport={() => fileInput.current?.click()} onLang={switchLanguage} />}
  </div>;
}
