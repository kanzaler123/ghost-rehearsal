import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactElement } from 'react';
import type { Viewport } from '@xyflow/react';
import example from '../examples/open-house.json';
import { projectDocumentSchema } from '../src/schemas';
import { playbackAt } from '../src/simulation/metrics';
import type { SimulationRun } from '../src/simulation/types';
import { MESSAGES } from '../src/i18n/messages';

/**
 * Exercise the real Canvas component and event handlers without a browser. The
 * hook runner supplies React Flow's measured canvas size, as ResizeObserver does,
 * and fake timers reproduce a panel changing size during pending placement.
 * Layout, focus resolution, viewport calculations, and effect wiring are real.
 */
const hooks = vi.hoisted(() => {
  type Slot = { value?: unknown; deps?: readonly unknown[]; cleanup?: void | (() => void) };
  let slots: Slot[] = [];
  let cursor = 0;
  let pending = false;
  let effects: (() => void)[] = [];
  const same = (a?: readonly unknown[], b?: readonly unknown[]) => a && b && a.length === b.length && a.every((value, index) => Object.is(value, b[index]));
  return {
    dimensions: { width: 1050, height: 750, transform: [0, 0, 1] },
    context: {} as unknown,
    store: { getState: () => ({ setNodes: (_nodes: unknown[]) => {} }) },
    api: {} as Record<string, unknown>,
    useState<T>(initial: T | (() => T)): [T, (next: T | ((previous: T) => T)) => void] {
      const index = cursor++;
      if (!slots[index]) slots[index] = { value: typeof initial === 'function' ? (initial as () => T)() : initial };
      return [slots[index].value as T, next => {
        const value = typeof next === 'function' ? (next as (previous: T) => T)(slots[index].value as T) : next;
        if (!Object.is(slots[index].value, value)) { slots[index].value = value; pending = true; }
      }];
    },
    useRef<T>(initial: T) {
      const index = cursor++;
      if (!slots[index]) slots[index] = { value: { current: initial } };
      return slots[index].value as { current: T };
    },
    useMemo<T>(compute: () => T, deps?: readonly unknown[]) {
      const index = cursor++;
      if (!slots[index] || !same(slots[index].deps, deps)) slots[index] = { value: compute(), deps };
      return slots[index].value as T;
    },
    useEffect(effect: () => void | (() => void), deps?: readonly unknown[]) {
      const index = cursor++;
      if (!slots[index] || !same(slots[index].deps, deps)) effects.push(() => {
        slots[index]?.cleanup?.();
        slots[index] = { deps, cleanup: effect() };
      });
    },
    render<T>(component: () => T) {
      let tree: T;
      let rounds = 0;
      do {
        cursor = 0; pending = false; effects = [];
        tree = component();
        effects.forEach(effect => effect());
        if (++rounds > 15) throw new Error('Unexpected Canvas render loop');
      } while (pending);
      return tree;
    },
    reset() { slots = []; cursor = 0; pending = false; effects = []; },
    unmount() { slots.forEach(slot => slot.cleanup?.()); },
  };
});

vi.mock('react', async importOriginal => ({
  ...await importOriginal<typeof import('react')>(),
  useCallback: (callback: (...args: any[]) => unknown, deps: readonly unknown[]) => hooks.useMemo(() => callback, deps),
  useState: hooks.useState, useRef: hooks.useRef, useMemo: hooks.useMemo, useEffect: hooks.useEffect, useLayoutEffect: hooks.useEffect,
  useContext: () => hooks.context,
}));
vi.mock('@xyflow/react', async importOriginal => ({
  ...await importOriginal<typeof import('@xyflow/react')>(),
  useReactFlow: () => hooks.api,
  useStoreApi: () => hooks.store,
  useStore: (selector: (store: typeof hooks.dimensions) => unknown) => selector(hooks.dimensions),
}));

import { Controls, ReactFlow } from '@xyflow/react';
import { Canvas } from '../src/components/Canvas';

type Props = Parameters<typeof Canvas>[0];
type Element = ReactElement<Record<string, any>>;
const document = projectDocumentSchema.parse(example);
const [planA, planB] = document.plans;
const noop = () => {};
const setViewport = vi.fn<(viewport: Viewport, options: { duration: number }) => Promise<boolean>>();
let props: Props;
let tree: Element[];

function flatten(value: unknown, output: Element[] = []): Element[] {
  if (Array.isArray(value)) { value.forEach(item => flatten(item, output)); return output; }
  if (value && typeof value === 'object' && 'props' in value) {
    output.push(value as Element);
    flatten((value as Element).props.children, output);
  }
  return output;
}
function render() {
  const child = (Canvas(props).props.children as ReactElement<Props>);
  tree = flatten(hooks.render(() => (child.type as (props: Props) => ReactElement)(props)));
  tree[0].props.ref.current = { get clientWidth() { return hooks.dimensions.width; }, get clientHeight() { return hooks.dimensions.height; } };
}
function flow() { return tree.find(item => item.type === ReactFlow)!.props; }
function viewport() { return setViewport.mock.calls.at(-1)![0]; }
function mount() { render(); flow().onInit(hooks.api); render(); }
function rehearse(plan = planA) {
  props = { ...props, plan, view: playbackAt([], plan, 0), editable: false, stageView: true,
    run: { request: { plan } } as SimulationRun, request: { token: props.request.token + 1, target: 'default' } };
  render();
}

beforeEach(() => {
  vi.useFakeTimers();
  hooks.reset();
  Object.assign(hooks.dimensions, { width: 1050, height: 750, transform: [0, 0, 1] });
  hooks.context = { t: MESSAGES.en, lang: 'en', setLang: noop };
  setViewport.mockReset().mockResolvedValue(true);
  hooks.api = { getInternalNode: () => undefined, setViewport, zoomTo: vi.fn(), screenToFlowPosition: (value: unknown) => value };
  props = { plan: planA, selected: '', onSelect: vi.fn(), onMove: vi.fn(), onConnect: noop, onDelete: noop, onAdd: noop,
    editable: true, time: 0, issues: [], view: playbackAt([], planA, 0), stale: false, chooseVisitor: noop, visitorName: id => id,
    request: { token: 0, target: 'default' }, stageView: false, expanded: new Set(), onStage: noop };
});
afterEach(() => { hooks.unmount(); vi.useRealTimers(); });

describe('Canvas placement during workbench changes', () => {
  it('defers placement while the canvas is hidden even if the store retains its size', () => {
    mount(); vi.advanceTimersByTime(1000);
    rehearse();
    tree[0].props.ref.current = { clientWidth: 0, clientHeight: 0 };
    const count = setViewport.mock.calls.length;
    vi.advanceTimersByTime(1000);
    expect(setViewport).toHaveBeenCalledTimes(count);
    render(); props = { ...props, request: { token: 2, target: 'default' } }; render();
    vi.advanceTimersByTime(500);
    expect(setViewport.mock.calls.length).toBeGreaterThan(count);
  });

  it('keeps the first rehearsal centered after the results dock reduces canvas height', () => {
    mount(); vi.advanceTimersByTime(1000);
    rehearse();
    vi.advanceTimersByTime(16);
    hooks.dimensions.height = 340; render();
    const resized = viewport();
    vi.advanceTimersByTime(1000);
    // The old 420ms callback moved this exact fixture down by 205px.
    expect(viewport()).toEqual(resized);
    expect(resized.y).toBeLessThan(hooks.dimensions.height);
  });

  it.each([planA, planB])('fits Compare pane $id using its size after the story dock opens', plan => {
    mount(); vi.advanceTimersByTime(1000);
    props = { ...props, compact: true, label: { badge: plan === planA ? 'A' : 'B', name: plan.name } };
    rehearse(plan);
    vi.advanceTimersByTime(16);
    Object.assign(hooks.dimensions, { width: 760, height: 230 }); render();
    const resized = viewport();
    vi.advanceTimersByTime(1000);
    expect(viewport()).toEqual(resized);
    expect(resized.y).toBeLessThan(hooks.dimensions.height);
  });

  it('uses the latest inspector width and dock height when a focused node settles', () => {
    mount(); rehearse(); vi.advanceTimersByTime(1000);
    props = { ...props, expanded: new Set(['verification']), request: { token: 2, target: { ids: ['checkin'] } } };
    render(); vi.advanceTimersByTime(50);
    Object.assign(hooks.dimensions, { width: 720, height: 410 }); render();
    vi.advanceTimersByTime(40);
    hooks.dimensions.height = 270; render();
    const resized = viewport();
    vi.advanceTimersByTime(1000);
    expect(viewport()).toEqual(resized);
    // A fresh request for the same node must not "fix" an obsolete placement.
    props = { ...props, request: { ...props.request, token: 3 } }; render(); vi.advanceTimersByTime(500);
    expect(viewport()).toEqual(resized);
  });

  it.each(['pan', 'wheel', 'zoom control', 'minimap', 'reset zoom'])('preserves a user %s through pending placement and panel resizing', interaction => {
    mount(); rehearse(); vi.advanceTimersByTime(60);
    if (interaction === 'pan') flow().onMoveStart({ type: 'mousedown' });
    if (interaction === 'wheel') tree[0].props.onWheelCapture();
    if (interaction === 'zoom control') tree.find(item => item.type === Controls)!.props.onZoomIn();
    if (interaction === 'minimap') tree[0].props.onPointerDownCapture({ target: { closest: () => ({}) } });
    if (interaction === 'reset zoom') tree.find(item => item.props.className === 'canvas-zoom')!.props.onClick();
    const count = setViewport.mock.calls.length;
    Object.assign(hooks.dimensions, { width: 820, height: 320 }); render();
    vi.advanceTimersByTime(1000);
    expect(setViewport).toHaveBeenCalledTimes(count);
    // An explicit Reset view/focus request takes ownership again.
    props = { ...props, request: { token: 2, target: 'default' } }; render(); vi.advanceTimersByTime(500);
    expect(setViewport.mock.calls.length).toBeGreaterThan(count);
  });

  it('does not mistake a programmatic move for user navigation', () => {
    mount(); rehearse(); vi.advanceTimersByTime(60);
    flow().onMoveStart(null);
    const count = setViewport.mock.calls.length;
    hooks.dimensions.height = 340; render(); vi.advanceTimersByTime(1000);
    expect(setViewport.mock.calls.length).toBeGreaterThan(count);
  });

  it('cancels pending placement when the canvas unmounts', () => {
    mount(); rehearse(); vi.advanceTimersByTime(60);
    hooks.unmount();
    const count = setViewport.mock.calls.length;
    vi.advanceTimersByTime(1000);
    expect(setViewport).toHaveBeenCalledTimes(count);
  });
});

describe('read-only Full map', () => {
  it('allows selection and panning without persisting node positions', () => {
    props = { ...props, editable: false, expanded: 'all' }; mount();
    expect(flow().nodesDraggable).toBe(false);
    expect(flow().nodes.filter((node: any) => node.type === 'workflow').every((node: any) => !node.draggable)).toBe(true);
    expect(flow().panOnDrag).toEqual([0, 1]);
    flow().onNodesChange([{ type: 'position', id: 'checkin', position: { x: 999, y: 999 }, dragging: false }]);
    expect(props.onMove).not.toHaveBeenCalled();
    flow().onNodeClick({}, { id: 'checkin', type: 'workflow' });
    expect(props.onSelect).toHaveBeenCalledWith('checkin', 'node');
  });

  it('continues to save intentional node moves in Build', () => {
    mount();
    expect(flow().nodesDraggable).toBe(true);
    flow().onNodesChange([{ type: 'position', id: 'checkin', position: { x: 900, y: 400 }, dragging: false }]);
    expect(props.onMove).toHaveBeenCalledWith([{ id: 'checkin', x: 900, y: 400 }]);
  });
});


describe('canvas data and interaction reconciliation', () => {
  it('keeps ghost handlers stable while calling the latest committed visitor action', () => {
    const first = vi.fn(), latest = vi.fn();
    props = { ...props, chooseVisitor: first }; mount();
    const handler = flow().nodes.find((node: any) => node.type === 'workflow').data.chooseVisitor;
    handler('visitor-before');
    expect(first).toHaveBeenCalledWith('visitor-before');
    props = { ...props, chooseVisitor: latest }; render();
    expect(flow().nodes.find((node: any) => node.type === 'workflow').data.chooseVisitor).toBe(handler);
    handler('visitor-after');
    expect(latest).toHaveBeenCalledWith('visitor-after');
    expect(first).toHaveBeenCalledTimes(1);
    flow().edges[0].data.chooseVisitor('visitor-on-route');
    expect(latest).toHaveBeenCalledWith('visitor-on-route');
  });

  it('updates node content while retaining an active drag, measured size and multi-selection', () => {
    mount();
    const ids = flow().nodes.filter((node: any) => node.type === 'workflow').slice(0, 2).map((node: any) => node.id);
    flow().onNodesChange([
      { type: 'select', id: ids[0], selected: true }, { type: 'select', id: ids[1], selected: true },
      { type: 'position', id: ids[0], position: { x: 777, y: 333 }, dragging: true },
      { type: 'dimensions', id: ids[0], dimensions: { width: 210, height: 140 } },
    ]);
    render();
    const renamed = { ...planA, graph: { ...planA.graph, nodes: planA.graph.nodes.map(node => node.id === ids[0] ? { ...node, name: 'Renamed during drag' } : node) } };
    props = { ...props, plan: renamed }; render();
    const updated = flow().nodes.find((node: any) => node.id === ids[0]);
    expect(updated.data.node.name).toBe('Renamed during drag');
    expect(updated.position).toEqual({ x: 777, y: 333 });
    expect(updated.measured).toEqual({ width: 210, height: 140 });
    expect(ids.every((id: string) => flow().nodes.find((node: any) => node.id === id).selected)).toBe(true);
    expect(props.onMove).not.toHaveBeenCalled();
    flow().onNodesChange([{ type: 'position', id: ids[0], position: { x: 780, y: 340 }, dragging: false }]);
    expect(props.onMove).toHaveBeenCalledWith([{ id: ids[0], x: 780, y: 340 }]);
  });

  it('lets an external selection replace local multi-selection without stale node data', () => {
    mount();
    const ids = flow().nodes.filter((node: any) => node.type === 'workflow').slice(0, 2).map((node: any) => node.id);
    flow().onNodesChange(ids.map((id: string) => ({ type: 'select', id, selected: true }))); render();
    props = { ...props, selected: ids[1] }; render();
    expect(flow().nodes.filter((node: any) => node.selected).map((node: any) => node.id)).toEqual([ids[1]]);
    rehearse();
    expect(flow().nodes.filter((node: any) => node.type !== 'frame').every((node: any) => node.data.running)).toBe(true);
  });
});
