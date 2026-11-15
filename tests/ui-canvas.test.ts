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
  useState: hooks.useState, useRef: hooks.useRef, useMemo: hooks.useMemo, useEffect: hooks.useEffect,
  useContext: () => hooks.context,
}));
vi.mock('@xyflow/react', async importOriginal => ({
  ...await importOriginal<typeof import('@xyflow/react')>(),
  useReactFlow: () => hooks.api,
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
afterEach(() => { hooks.unmount(); vi.unstubAllGlobals(); vi.useRealTimers(); });


describe('studio viewport controls', () => {
  it('Escape closes the add-node menu and restores its trigger focus', () => {
    mount();
    const focus = vi.fn(), stopPropagation = vi.fn(), preventDefault = vi.fn();
    vi.stubGlobal('document', { activeElement: { focus } });
    tree[0].props.ref.current.getBoundingClientRect = () => ({ left: 0, top: 0, width: 1050, height: 750 });
    tree.find(item => item.type === 'button' && item.props['aria-label'] === MESSAGES.en.sidebar.addNode)!.props.onClick(); render();
    const menu = tree.find(item => item.props.className === 'canvas-menu nodrag nopan')!;
    menu.props.onKeyDown({ key: 'Escape', stopPropagation, preventDefault }); render();
    expect(tree.some(item => item.props.className === 'canvas-menu nodrag nopan')).toBe(false);
    expect(focus).toHaveBeenCalledOnce(); expect(stopPropagation).toHaveBeenCalledOnce(); expect(preventDefault).toHaveBeenCalledOnce();
  });
  it('reports manual gestures and prevents a resize from undoing them', () => {
    props = { ...props, onManual: vi.fn() }; mount(); vi.advanceTimersByTime(1000); setViewport.mockClear();
    flow().onMoveStart({ type: 'pointerdown' }); expect(props.onManual).toHaveBeenCalledOnce();
    hooks.dimensions.width -= 200; render(); vi.advanceTimersByTime(1000); expect(setViewport).not.toHaveBeenCalled();
  });
  it('applies a reduced-motion readable view immediately and uses no viewport animation', () => {
    props = { ...props, reducedMotion: true }; mount();
    expect(setViewport).toHaveBeenCalled(); expect(setViewport.mock.calls.every(([, options]) => options.duration === 0)).toBe(true);
    vi.advanceTimersByTime(1000); expect(setViewport.mock.calls.every(([, options]) => options.duration === 0)).toBe(true);
    tree.find(item => item.type === 'button' && item.props['aria-label'] === MESSAGES.en.canvas.resetZoom)!.props.onClick();
    expect(hooks.api.zoomTo).toHaveBeenCalledWith(1, { duration: 0 });
  });
});
