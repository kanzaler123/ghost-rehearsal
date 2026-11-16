import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactElement } from 'react';
import example from '../examples/open-house.json';
import { projectDocumentSchema } from '../src/schemas';
import type { Plan, RunRequest } from '../src/schemas';
import { simulate } from '../src/simulation/engine';
import type { SimulationRun } from '../src/simulation/types';
import { affectedVisitors } from '../src/features/analysis';
import { readProject } from '../src/features/project';
import { MESSAGES } from '../src/i18n/messages';
import { issueText } from '../src/i18n/issues';

/** Real App handlers, effects, validation, and simulation; only React's host hooks
 * and storage/Worker transports are replaced. Assertions follow the public component
 * props/actions rather than App's state-slot indexes or CSS layout. */
const hooks = vi.hoisted(() => {
  type Slot = { value?: unknown; deps?: readonly unknown[]; cleanup?: void | (() => void) };
  type Frame = { slots: Slot[]; cursor: number; pending: boolean; effects: (() => void)[] };
  const fresh = (): Frame => ({ slots: [], cursor: 0, pending: false, effects: [] });
  let frames = new Map<string, Frame>();
  let active = fresh();
  const same = (a?: readonly unknown[], b?: readonly unknown[]) => a && b && a.length === b.length && a.every((value, index) => Object.is(value, b[index]));
  return {
    context: {} as unknown,
    useState<T>(initial: T | (() => T)): [T, (next: T | ((previous: T) => T)) => void] {
      const frame = active, { slots } = frame, index = frame.cursor++;
      if (!slots[index]) slots[index] = { value: typeof initial === 'function' ? (initial as () => T)() : initial };
      return [slots[index].value as T, next => {
        const value = typeof next === 'function' ? (next as (previous: T) => T)(slots[index].value as T) : next;
        if (!Object.is(slots[index].value, value)) { slots[index].value = value; frame.pending = true; }
      }];
    },
    useRef<T>(initial: T) {
      const { slots } = active, index = active.cursor++;
      if (!slots[index]) slots[index] = { value: { current: initial } };
      return slots[index].value as { current: T };
    },
    useMemo<T>(compute: () => T, deps?: readonly unknown[]) {
      const { slots } = active, index = active.cursor++;
      if (!slots[index] || !same(slots[index].deps, deps)) slots[index] = { value: compute(), deps };
      return slots[index].value as T;
    },
    useEffect(effect: () => void | (() => void), deps?: readonly unknown[]) {
      const { slots, effects } = active, index = active.cursor++;
      if (!slots[index] || !same(slots[index].deps, deps)) effects.push(() => {
        slots[index]?.cleanup?.(); slots[index] = { deps, cleanup: effect() };
      });
    },
    render<T>(component: () => T, key = 'app') {
      const previous = active;
      const frame = frames.get(key) ?? fresh();
      frames.set(key, frame); active = frame;
      let tree: T, rounds = 0;
      try {
        do {
          frame.cursor = 0; frame.pending = false; frame.effects = [];
          tree = component(); frame.effects.forEach(effect => effect());
          if (++rounds > 20) throw new Error('Unexpected workbench render loop');
        } while (frame.pending);
        return tree;
      } finally { active = previous; }
    },
    reset() { frames = new Map(); active = fresh(); },
    unmount() { frames.forEach(frame => frame.slots.forEach(slot => slot.cleanup?.())); },
  };
});

vi.mock('react', async importOriginal => ({
  ...await importOriginal<typeof import('react')>(),
  useState: hooks.useState, useRef: hooks.useRef, useMemo: hooks.useMemo, useEffect: hooks.useEffect, useLayoutEffect: hooks.useEffect,
  useCallback: (callback: unknown, deps?: readonly unknown[]) => hooks.useMemo(() => callback, deps),
  useContext: () => hooks.context,
}));

vi.mock('../src/features/persistence', async importOriginal => ({
  ...await importOriginal<typeof import('../src/features/persistence')>(),
  openPersistence: async () => {
    const value = readProject(localStorage.getItem('ghost-rehearsal.project.v1')!).document!;
    const revision = { version: 1, id: 'saved', projectId: 'project', kind: 'saved', tabId: 'test', parents: [], createdAt: 0, raw: JSON.stringify(value), status: 'ready', value };
    return { ok: true, value: {
      readWorkspace: async () => ({ ok: true, value: { savedRevisionId: 'saved', projects: [{ projectId: 'project', status: 'ready', current: revision, heads: [revision], history: [revision] }], templates: { status: 'empty', heads: [], history: [] } } }),
      writeProject: async (_id: string, document: unknown) => ({ ok: true, value: { revision: { ...revision, value: document }, status: 'draft-saved', snapshot: { heads: [revision] } } }),
      subscribe: () => () => {}, close() {},
    } };
  },
}));

import { App } from '../src/app/App';
import { LiveStatusStrip, SummaryStrip, RunStateCard, PlanNavigator } from '../src/components/shell';
import { playbackAt } from '../src/simulation/metrics';
import { liveSummary } from '../src/features/analysis';
import { SHELL_COMPONENTS } from '../src/components/shell';
import { Canvas } from '../src/components/Canvas';
import { CompareReport } from '../src/components/CompareReport';
import { Inspector } from '../src/components/Inspector';
import { ResourcesEditor } from '../src/components/Dialogs';
import { GhostJourney } from '../src/components/Journey';
import { ResourceUse } from '../src/components/Results';

type Element = ReactElement<Record<string, any>>;
const document = projectDocumentSchema.parse(example);
const [planA, planB] = document.plans;
const t = MESSAGES.en;
let tree: Element[];
let lastRuns: SimulationRun[];
let originalGraphA: Plan['graph'];

function flatten(value: unknown, output: Element[] = []): Element[] {
  if (Array.isArray(value)) { value.forEach(item => flatten(item, output)); return output; }
  if (value && typeof value === 'object' && 'props' in value) {
    const element = value as Element;
    output.push(element);
    if (typeof element.type === 'function' && SHELL_COMPONENTS.has(element.type)) flatten((element.type as (props: Record<string, unknown>) => unknown)(element.props), output);
    else flatten(element.props.children, output);
  }
  return output;
}
function text(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (Array.isArray(value)) return value.map(text).join('');
  return value && typeof value === 'object' && 'props' in value ? text((value as Element).props.children) : '';
}
function render() { tree = flatten(hooks.render(App)); }
function component(type: unknown) { return tree.find(item => item.type === type)!; }
function canvas(planId?: string) { return tree.find(item => item.type === Canvas && (!planId || item.props.plan.id === planId))!.props; }
function button(label: string, startsWith = false) {
  const found = tree.find(item => item.type === 'button' && (startsWith ? text(item).startsWith(label) : text(item) === label));
  if (!found) throw new Error(`Missing button: ${label}`);
  return found;
}
function click(label: string, startsWith = false) { button(label, startsWith).props.onClick(); render(); }
function selectPlan(id: string) {
  const row = tree.find(item => item.type === 'li' && item.key === id)!;
  flatten(row).find(item => item.type === 'button')!.props.onClick(); render();
}
function deferSimulation() {
  let deliver!: () => void;
  vi.stubGlobal('Worker', class {
    onmessage?: (event: { data: { runs: SimulationRun[] } }) => void;
    terminate() {}
    postMessage(data: { requests: RunRequest[] }) {
      lastRuns = data.requests.map(simulate);
      const response = { runs: lastRuns };
      deliver = () => this.onmessage?.({ data: response });
    }
  });
  return () => { deliver(); render(); };
}
function compare() {
  click(t.modes.Compare);
  expect(lastRuns.every(run => run.status === 'succeeded')).toBe(true);
  expect(component(CompareReport).props.ready).toBe(true);
  expect(component(CompareReport).props.planA.id).toBe(planA.id);
  expect(component(CompareReport).props.planB.id).toBe(planB.id);
}
function selectNode(planId: string, nodeId: string) { canvas(planId).onSelect(nodeId, 'node'); render(); }
function renderReport() {
  return flatten(hooks.render(() => CompareReport(component(CompareReport).props as Parameters<typeof CompareReport>[0]), 'report'));
}
function renderJourney() {
  const child = hooks.render(() => GhostJourney(component(GhostJourney).props as Parameters<typeof GhostJourney>[0]), 'journey');
  // A Journey effect may update App's selected person. Flush that parent update.
  render();
  return flatten(child);
}
function browseMore() {
  const browse = renderReport().find(item => item.type === 'button' && text(item).endsWith(t.evidence.groups.more))!;
  expect(browse.props.disabled).toBe(false);
  browse.props.onClick(); render();
}
function moreIds() { return new Set(affectedVisitors(lastRuns[0].statistics!, lastRuns[1].statistics!, 'more').map(item => item.id)); }

beforeEach(async () => {
  vi.useFakeTimers(); hooks.reset(); lastRuns = [];
  hooks.context = { t, lang: 'en', setLang() {} };
  vi.stubGlobal('window', { addEventListener: vi.fn(), removeEventListener: vi.fn() });
  vi.stubGlobal('localStorage', { getItem: (key: string) => key === 'ghost-rehearsal.project.v1' ? JSON.stringify(document) : null, setItem: vi.fn(), removeItem: vi.fn() });
  vi.stubGlobal('Worker', class {
    onmessage?: (event: { data: { runs: SimulationRun[] } }) => void;
    terminate() {}
    postMessage(data: { requests: RunRequest[] }) {
      lastRuns = data.requests.map(simulate);
      this.onmessage?.({ data: { runs: lastRuns } });
    }
  });
  render();
  await vi.waitFor(() => { render(); expect(component(Canvas)).toBeDefined(); });
  // Canonical loading sorts plans and normalizes/localizes their graphs.
  selectPlan(planA.id);
  originalGraphA = structuredClone(canvas().plan.graph);
});
afterEach(() => { hooks.unmount(); vi.unstubAllGlobals(); vi.useRealTimers(); });


// Feature: rehearsal-studio-ui, Properties 4, 5, 6, 8, 10, 11
async function useMedia(reduced: boolean) {
  hooks.unmount(); hooks.reset();
  vi.stubGlobal('window', { addEventListener: vi.fn(), removeEventListener: vi.fn(), matchMedia: (query: string) => ({ matches: query.includes('reduced-motion') && reduced, addEventListener: vi.fn(), removeEventListener: vi.fn() }) });
  render(); await vi.waitFor(() => { render(); expect(component(Canvas)).toBeDefined(); }); selectPlan(planA.id);
}
function scrub(at: number) {
  tree.find(item => item.type === 'input' && item.props['aria-label'] === t.dock.timeline)!.props.onChange({ target: { value: String(at) } }); render();
}
describe('pending runs respect subsequent plan navigation', () => {
  function expectBuild(id: string) {
    expect(canvas().plan.id).toBe(id);
    expect(tree.find(item => item.props.role === 'tab' && text(item) === t.modes.Build)!.props['aria-selected']).toBe(true);
  }
  it('keeps the chosen node and Build view after navigating away and back', () => {
    const deliver = deferSimulation(); click(t.run.start);
    selectPlan(planB.id); selectPlan(planA.id);
    selectNode(planA.id, 'checkin');
    deliver();
    expectBuild(planA.id);
    expect(component(Inspector).props.node.id).toBe('checkin');
    expect(component(Inspector).props.collapsed).toBe(false);
    expect(text(tree.find(item => item.props.className === 'status-notice'))).toContain(lastRuns[0].request.plan.name);
    const results = lastRuns;
    click(t.modes.Rehearse);
    expect(canvas().run).toBe(results[0]); expect(lastRuns).toBe(results);
  });
  it.each(['cancel', 'failure'] as const)('keeps B and its selection on background %s', outcome => {
    if (outcome === 'failure') {
      const route = canvas().plan.graph.edges[0];
      canvas().onDelete([], [route.id]); render();
    }
    const deliver = deferSimulation(); click(t.run.start);
    expect(lastRuns[0].status).toBe(outcome === 'failure' ? 'failed' : 'succeeded');
    selectPlan(planB.id); selectNode(planB.id, 'checkin-extra');
    if (outcome === 'cancel') click(t.run.stop);
    deliver();
    expectBuild(planB.id);
    expect(component(Inspector).props.plan.id).toBe(planB.id);
    expect(component(Inspector).props.node.id).toBe('checkin-extra');
    expect(tree.some(item => item.props.className === 'checks-drawer')).toBe(false);
    expect(text(tree.find(item => item.props.className === 'status-notice'))).toContain(lastRuns[0].request.plan.name);
    if (outcome === 'cancel') expect(text(tree.find(item => item.props.className === 'status-notice'))).toContain(t.notices.cancelled);
  });
  it('preserves B completion statistics and normalizes a cached cutoff-only A on explicit replay', () => {
    selectPlan(planB.id);
    tree.find(item => item.type === 'select' && item.props['aria-label'] === t.run.scope)!.props.onChange({ target: { value: 'run_to_completion' } }); render();
    click(t.modes.Rehearse);
    const resultB = lastRuns[0];
    tree.find(item => item.type === 'select' && item.props['aria-label'] === t.review.basis)!.props.onChange({ target: { value: 'completion' } }); render();
    click(t.modes.Build); selectPlan(planA.id);
    tree.find(item => item.type === 'select' && item.props['aria-label'] === t.run.scope)!.props.onChange({ target: { value: 'cutoff' } }); render();
    const deliver = deferSimulation(); click(t.run.start);
    const resultA = lastRuns[0];
    selectPlan(planB.id); deliver();
    expectBuild(planB.id);
    expect(component(Inspector).props.basis).toBe('completion');
    tree.find(item => item.type === 'select' && item.props['aria-label'] === t.run.scope)!.props.onChange({ target: { value: 'run_to_completion' } }); render();
    click(t.modes.Rehearse);
    expect(canvas().run).toBe(resultB);
    expect(tree.find(item => item.type === 'select' && item.props['aria-label'] === t.review.basis)!.props.value).toBe('completion');
    click(t.modes.Build); selectPlan(planA.id);
    tree.find(item => item.type === 'select' && item.props['aria-label'] === t.run.scope)!.props.onChange({ target: { value: 'cutoff' } }); render();
    click(t.modes.Rehearse);
    expect(canvas().run).toBe(resultA);
    expect(tree.find(item => item.type === 'select' && item.props['aria-label'] === t.review.basis)!.props.value).toBe('cutoff');
  });
  it('does not present an obsolete comparison after changing the right-hand plan', () => {
    component(PlanNavigator).props.onDuplicate(); render();
    const copiedId = canvas().plan.id;
    selectPlan(planA.id);
    const deliver = deferSimulation(); click(t.modes.Compare);
    expect(lastRuns.map(run => run.request.plan.id)).toEqual([planA.id, planB.id]);
    component(PlanNavigator).props.onSetB(copiedId); render();
    deliver();
    expectBuild(planA.id);
    expect(component(PlanNavigator).props.second.id).toBe(copiedId);
    expect(component(CompareReport)).toBeUndefined();
    expect(text(tree.find(item => item.props.className === 'status-notice'))).toContain(lastRuns.map(run => run.request.plan.name).join(' / '));
  });
});

describe('studio presentation preserves simulation contracts', () => {
  it.each([false, true])('autoplay respects reduced motion=%s and manual play remains available', async reduced => {
    await useMedia(reduced); click(t.modes.Rehearse);
    expect(tree.some(item => item.type === 'button' && item.props['aria-label'] === (reduced ? t.dock.play : t.dock.pause))).toBe(true);
    const outcomes = structuredClone(lastRuns[0].statistics);
    if (reduced) {
      tree.find(item => item.type === 'button' && item.props['aria-label'] === t.dock.play)!.props.onClick(); render();
      expect(tree.some(item => item.props['aria-label'] === t.dock.pause)).toBe(true);
    }
    click(t.modes.Build); click(t.modes.Rehearse);
    expect(tree.some(item => item.type === 'button' && item.props['aria-label'] === (reduced ? t.dock.play : t.dock.pause))).toBe(true);
    expect(lastRuns[0].statistics).toEqual(outcomes);
    expect(lastRuns[0].request).not.toHaveProperty('reducedMotion');
  });
  it('scrubbing changes live counts but preserves the selected summary in both scopes', () => {
    tree.find(item => item.type === 'select' && item.props['aria-label'] === t.run.scope)!.props.onChange({ target: { value: 'run_to_completion' } }); render(); click(t.modes.Rehearse);
    const result = lastRuns[0];
    for (const basis of ['cutoff', 'completion']) {
      tree.find(item => item.type === 'select' && item.props['aria-label'] === t.review.basis)!.props.onChange({ target: { value: basis } }); render();
      const before = component(SummaryStrip).props;
      for (const at of [0, 25.5, 210, 450.2, 900, result.coveredUntil]) {
        scrub(at);
        expect(component(SummaryStrip).props).toEqual(before);
        const live = liveSummary(playbackAt(result.events, result.request.plan, at));
        const metrics = component(LiveStatusStrip).props.metrics;
        expect(metrics.find((metric: { key: string }) => metric.key === 'wait').value).toBe(String(live.waiting));
        expect(metrics.find((metric: { key: string }) => metric.key === 'serve').value).toBe(String(live.serving));
      }
    }
  });
  it('switching statistics basis does not rerun or change the chosen guest or replay clock', () => {
    tree.find(item => item.type === 'select' && item.props['aria-label'] === t.run.scope)!.props.onChange({ target: { value: 'run_to_completion' } }); render(); compare();
    component(CompareReport).props.onChoose(component(CompareReport).props.featured); render(); scrub(210);
    const guest = component(GhostJourney).props.visitorId, results = lastRuns;
    tree.find(item => item.type === 'select' && item.props['aria-label'] === t.review.basis)!.props.onChange({ target: { value: 'completion' } }); render();
    expect(lastRuns).toBe(results); expect(component(GhostJourney).props.visitorId).toBe(guest); expect(component(GhostJourney).props.time).toBe(210);
  });
  it('arrangement changes only the container and persists without changing results or coordinates', () => {
    compare(); scrub(210); const graph = structuredClone(canvas().plan.graph), result = canvas().run;
    click(t.arrangement.cols);
    expect(tree.some(item => item.props.className === 'canvas-area split cols')).toBe(true);
    expect(canvas().plan.graph).toEqual(graph); expect(canvas().run).toBe(result); expect(canvas().time).toBe(210);
    expect(localStorage.setItem).toHaveBeenCalledWith('ghost-rehearsal.arrangement.v1', 'cols');
    click(t.arrangement.rows); expect(tree.some(item => item.props.className === 'canvas-area split rows')).toBe(true);
  });
  it('shows each future’s current longest queues and locates one without changing replay or results', () => {
    compare();
    for (const at of [0, 210, 900]) {
      scrub(at);
      const strips = tree.filter(item => item.type === LiveStatusStrip);
      expect(strips).toHaveLength(2);
      for (const [index, id] of [planA.id, planB.id].entries()) {
        const target = canvas(id);
        const expected = target.plan.graph.nodes.filter((node: { type: string }) => node.type === 'service' || node.type === 'waiting_area')
          .map((node: { id: string; name: string }) => { const state = target.view.nodes[node.id]; return { id: node.id, name: node.name, waiting: state ? state.queued.length + state.holding.length + state.blocked.length : 0 }; })
          .filter((queue: { waiting: number }) => queue.waiting > 0).sort((a: { waiting: number }, b: { waiting: number }) => b.waiting - a.waiting).slice(0, 4);
        expect(strips[index].props.queues).toEqual(expected);
      }
    }
    const strip = tree.filter(item => item.type === LiveStatusStrip)[1], queue = strip.props.queues[0], results = lastRuns;
    expect(queue).toBeDefined(); strip.props.onQueue(queue.id); render();
    expect(canvas(planB.id).time).toBe(900); expect(lastRuns).toBe(results);
    expect(component(Inspector).props.plan.id).toBe(planB.id); expect(component(Inspector).props.node.id).toBe(queue.id);
  });
  it('stopping a rerun preserves earlier data and clears current comparison readiness', () => {
    compare(); const before = canvas().run, graph = structuredClone(canvas().plan.graph);
    vi.stubGlobal('Worker', class { terminate() {} postMessage() {} });
    click(t.run.start); expect(component(CompareReport).props.ready).toBe(false); click(t.run.stop);
    expect(component(RunStateCard).props.kind).toBe('stopped');
    expect(canvas().run).toBe(before); expect(canvas().plan.graph).toEqual(graph); expect(component(CompareReport).props.ready).toBe(false);
  });
  it('a transport failure is explicit and does not replace retained runs or inputs', () => {
    compare(); const before = canvas().run, graph = structuredClone(canvas().plan.graph);
    vi.stubGlobal('Worker', class { onmessage?: (event: { data: { error: string } }) => void; terminate() {} postMessage() { this.onmessage?.({ data: { error: 'test failure' } }); } });
    click(t.run.start);
    expect(component(RunStateCard).props.kind).toBe('failed'); expect(canvas().run).toBe(before); expect(canvas().plan.graph).toEqual(graph); expect(component(CompareReport).props.ready).toBe(false);
  });
  it('layout moves preserve freshness, but service-time edits make results stale', () => {
    click(t.modes.Rehearse); click(t.modes.Build);
    const node = canvas().plan.graph.nodes.find((node: { type: string }) => node.type === 'service');
    canvas().onMove([{ id: node.id, x: node.layout.x + 25, y: node.layout.y }]); render();
    expect(canvas().stale).toBe(false); selectNode(planA.id, node.id);
    component(Inspector).props.onNode({ ...component(Inspector).props.node, name: 'Renamed station' }); render(); expect(canvas().stale).toBe(false);
    component(Inspector).props.onNode({ ...component(Inspector).props.node, duration: { kind: 'fixed', value: 123 } }); render(); expect(canvas().stale).toBe(true);
  });
  it('manual viewport movement clears view-action selection', () => {
    expect(tree.find(item => item.type === 'button' && item.props.title === t.stage.fit)!.props['aria-pressed']).toBe(true);
    canvas().onManual(); render();
    expect(tree.find(item => item.type === 'button' && item.props.title === t.stage.fit)!.props['aria-pressed']).toBe(false);
    expect(tree.find(item => item.type === 'button' && item.props.title === t.stage.overview)!.props['aria-pressed']).toBe(false);
  });
  it('Escape closes the checks drawer and restores the checks trigger focus', () => {
    const trigger = tree.find(item => item.type === 'button' && item.props.className?.startsWith('check-chip'))!, focus = vi.fn();
    trigger.props.ref.current = { focus }; trigger.props.onClick(); render();
    const drawer = tree.find(item => item.props.className === 'checks-drawer')!, stopPropagation = vi.fn(), preventDefault = vi.fn();
    expect(tree.find(item => item.props['aria-label'] === t.stage.closeChecks)!.props.autoFocus).toBe(true);
    drawer.props.onKeyDown({ key: 'Escape', stopPropagation, preventDefault }); render();
    expect(tree.some(item => item.props.className === 'checks-drawer')).toBe(false);
    expect(focus).toHaveBeenCalledOnce(); expect(stopPropagation).toHaveBeenCalledOnce(); expect(preventDefault).toHaveBeenCalledOnce();
  });
  it('shows the current edit target in the default compact navigation in every mode', () => {
    tree.find(item => item.props.className === 'side-collapse')!.props.onClick(); render();
    const selected = () => tree.filter(item => item.props.className?.includes('tone-selected'));
    expect(selected()).toHaveLength(1); expect(selected()[0].props['aria-label']).toBe(t.studioUi.currentPlan);
    click(t.modes.Rehearse);
    expect(selected()).toHaveLength(1); expect(selected()[0].props['aria-label']).toBe(t.studioUi.currentPlan);
    compare();
    expect(selected()).toHaveLength(1); expect(selected()[0].props['aria-label']).toBe(t.studioUi.currentPlan);
    const plans = tree.find(item => item.type === 'button' && item.props['aria-label'] === t.navigator.plans)!;
    expect(text(plans)).toContain(canvas().plan.name);
    expect(canvas(planA.id).editable).toBe(false); expect(canvas(planB.id).editable).toBe(false);
  });
  it('first-divergence action pauses, tracks the same guest and focuses both recorded stations', () => {
    compare(); component(CompareReport).props.onChoose('side-stream:10'); render();
    component(GhostJourney).props.onDivergence(210, 'checkin', 'checkin-extra'); render();
    expect(component(GhostJourney).props.visitorId).toBe('side-stream:10'); expect(component(GhostJourney).props.time).toBe(210);
    expect(canvas(planA.id).tracked.id).toBe('side-stream:10'); expect(canvas(planB.id).tracked.id).toBe('side-stream:10');
    expect(canvas().request.target.byPlan).toEqual({ [planA.id]: ['checkin'], [planB.id]: ['checkin-extra'] });
    expect(tree.some(item => item.props['aria-label'] === t.dock.play)).toBe(true);
  });
});
