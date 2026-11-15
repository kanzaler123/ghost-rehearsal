import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactElement } from 'react';
import example from '../examples/open-house.json';
import { projectDocumentSchema } from '../src/schemas';
import type { Plan, RunRequest } from '../src/schemas';
import { simulate } from '../src/simulation/engine';
import type { SimulationRun } from '../src/simulation/types';
import { affectedVisitors } from '../src/features/analysis';
import { MESSAGES } from '../src/i18n/messages';
import { issueText } from '../src/i18n/issues';

/** Real App handlers, effects, validation, and simulation; only React's host hooks
 * and the Worker transport are replaced. Assertions follow the public component
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
  useState: hooks.useState, useRef: hooks.useRef, useMemo: hooks.useMemo, useEffect: hooks.useEffect,
  useCallback: (callback: unknown, deps?: readonly unknown[]) => hooks.useMemo(() => callback, deps),
  useContext: () => hooks.context,
}));

import { App } from '../src/app/App';
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

beforeEach(() => {
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
  // Canonical loading sorts plans and normalizes/localizes their graphs.
  selectPlan(planA.id);
  originalGraphA = structuredClone(canvas().plan.graph);
});
afterEach(() => { hooks.unmount(); vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('editing the selected plan', () => {
  it('clears a B selection when the global resources entry returns to editing A', () => {
    compare(); selectNode(planB.id, 'checkin');
    expect(component(Inspector).props.plan.id).toBe(planB.id);
    click(t.navigator.plans); click(t.sidebar.resources, true);
    expect(component(ResourcesEditor).props.plan.id).toBe(planA.id);
    component(ResourcesEditor).props.onClose(); render();
    expect(canvas().plan.id).toBe(planA.id);
    expect(component(Inspector).props.plan.id).toBe(planA.id);
    expect(component(Inspector).props.node).toBeUndefined();
    expect(canvas().plan.graph.nodes.some((node: { id: string }) => node.id === 'checkin')).toBe(true);
  });

  it.each(['checkin', 'checkin-extra'])('deletes %s only from B after editing through its inspector', nodeId => {
    compare(); selectNode(planB.id, nodeId);
    component(Inspector).props.onResources(); render();
    expect(component(ResourcesEditor).props.plan.id).toBe(planB.id);
    component(ResourcesEditor).props.onClose(); render();
    expect(canvas().plan.id).toBe(planB.id);
    selectNode(planB.id, nodeId);
    expect(component(Inspector).props.editable).toBe(true);
    component(Inspector).props.onDelete(); render();
    expect(canvas().plan.graph.nodes.some((node: { id: string }) => node.id === nodeId)).toBe(false);
    selectPlan(planA.id);
    expect(canvas().plan.graph).toEqual(originalGraphA);
  });
});

describe('failed comparison checks', () => {
  it.each(['issue', 'edit plan'])('shows B failures and opens B from the %s action', entry => {
    selectPlan(planB.id);
    const route = canvas().plan.graph.edges.find((edge: { source: string }) => edge.source === 'checkin-extra');
    canvas().onDelete([], [route.id]); render();
    selectPlan(planA.id); click(t.modes.Compare);
    expect(lastRuns.map(run => run.status)).toEqual(['succeeded', 'failed']);
    const failed = lastRuns[1];
    const error = failed.issues.find(issue => issue.severity === 'error' && issue.entityIds.includes('checkin-extra'))!;
    expect(error).toBeDefined();
    const drawer = tree.find(item => item.props.role === 'region' && item.props['aria-label'] === t.stage.checksTitle)!;
    expect(text(drawer)).toContain(t.workspace.checkingPlan(failed.request.plan.name));
    expect(text(drawer)).toContain(issueText(error, 'en'));
    expect(canvas().plan.id).toBe(planA.id);
    if (entry === 'issue') {
      flatten(drawer).find(item => item.type === 'button' && text(item).includes(issueText(error, 'en')))!.props.onClick(); render();
      expect(component(Inspector).props.node.id).toBe('checkin-extra');
      expect(component(Inspector).props.editable).toBe(true);
    } else click(t.workspace.editPlan);
    expect(canvas().plan.id).toBe(planB.id);
    expect(component(Inspector).props.plan.id).toBe(planB.id);
    const activeMode = tree.find(item => item.props.role === 'tab' && item.props['aria-selected'] && text(item) === t.modes.Build);
    expect(activeMode).toBeDefined();
  });
});

describe('comparison overview and visitor focus', () => {
  it('keeps the copied plan paired with its source after entering Build', () => {
    tree.find(item => item.type === 'button' && item.props['aria-label'] === t.sidebar.duplicate)!.props.onClick(); render();
    const copied = canvas().plan;
    expect(copied.id).not.toBe(planA.id);
    expect(copied.sourcePlanId).toBe(planA.id);
    click(t.modes.Compare);
    expect(component(CompareReport).props.ready).toBe(true);
    expect(component(CompareReport).props.planA.id).toBe(copied.id);
    expect(component(CompareReport).props.planB.id).toBe(planA.id);
  });

  it('passes the final statistics basis through the report, journey and resource views', () => {
    tree.find(item => item.type === 'select' && item.props['aria-label'] === t.run.scope)!.props.onChange({ target: { value: 'run_to_completion' } }); render();
    compare();
    tree.find(item => item.type === 'select' && item.props['aria-label'] === t.review.basis)!.props.onChange({ target: { value: 'completion' } }); render();
    expect(component(CompareReport).props.basis).toBe('completion');
    expect(text(renderReport())).toContain(t.review.completion);
    component(CompareReport).props.onChoose(lastRuns[0].population[0].id); render();
    expect(component(GhostJourney).props.basis).toBe('completion');
    expect(text(renderJourney())).toContain(t.review.completion);
    click(t.dock.tabs.resources);
    expect(component(ResourceUse).props.basis).toBe('completion');
    expect(component(ResourceUse).props.second.completion).toBeTruthy();
  });

  it('opens an affected group, follows a member, and returns to the full overview', () => {
    compare();
    const report = component(CompareReport).props;
    expect(report.compact).toBe(false);
    expect(component(GhostJourney)).toBeUndefined();
    browseMore();
    expect(component(CompareReport).props.compact).toBe(true);
    expect(component(GhostJourney).props.group).toBe('more');
    expect(moreIds().has(component(GhostJourney).props.visitorId)).toBe(true);
    const member = renderJourney().find(item => item.type === 'button' && item.props['aria-pressed'] === false && moreIds().has(String(item.key)))!;
    expect(member).toBeDefined();
    const id = member.key;
    member.props.onClick(); render(); renderJourney();
    expect(component(GhostJourney).props.visitorId).toBe(id);
    expect(component(GhostJourney).props.group).toBe('more');
    component(GhostJourney).props.onOverview(); render();
    expect(component(CompareReport).props.compact).toBe(false);
    expect(component(GhostJourney)).toBeUndefined();
  });

  it.each(['Canvas', 'report story'])('clears a group for an outside person selected from %s without snapping back', source => {
    compare(); browseMore(); renderJourney();
    expect(component(GhostJourney).props.group).toBe('more');
    let id: string;
    if (source === 'Canvas') {
      id = lastRuns[0].population.find(person => !moreIds().has(person.id))!.id;
      canvas(planA.id).chooseVisitor(id);
    } else {
      const story = renderReport().find(item => item.type === 'button' && typeof item.key === 'string'
        && lastRuns[0].population.some(person => person.id === item.key) && !moreIds().has(item.key))!;
      expect(story).toBeDefined();
      id = String(story.key);
      story.props.onClick();
    }
    render();
    expect(component(GhostJourney).props.group).toBeUndefined();
    expect(component(GhostJourney).props.visitorId).toBe(id);
    // Exercise the actual Journey filter effect that used to replace this choice.
    renderJourney();
    expect(component(GhostJourney).props.group).toBeUndefined();
    expect(component(GhostJourney).props.visitorId).toBe(id);
  });

  it('opens a report visitor directly and can return without losing the comparison', () => {
    compare();
    const id = component(CompareReport).props.featured;
    expect(id).toBeTruthy();
    component(CompareReport).props.onChoose(id); render();
    expect(component(GhostJourney).props.visitorId).toBe(id);
    expect(component(GhostJourney).props.compare).toBe(true);
    component(GhostJourney).props.onOverview(); render();
    expect(component(CompareReport).props.ready).toBe(true);
    expect(component(CompareReport).props.compact).toBe(false);
    expect(tree.filter(item => item.type === Canvas)).toHaveLength(2);
  });
});
