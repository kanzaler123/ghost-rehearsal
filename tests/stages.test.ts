import { describe, expect, it } from 'vitest';
import example from '../examples/open-house.json';
import { projectDocumentSchema } from '../src/schemas';
import type { Plan } from '../src/schemas';
import { NODE_SIZE, STAGE_SIZE, arrangeLayout, displayLayout, layered, stageIndex } from '../src/features/stages';
import type { Box } from '../src/features/stages';

const document = projectDocumentSchema.parse(example);
const [planA, planB] = document.plans;
const overlaps = (a: Box, b: Box) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const boxes = (points: Map<string, { x: number; y: number }>, size = NODE_SIZE.run) => [...points].map(([id, point]) => ({ id, ...point, ...size }));

describe('stage index', () => {
  it('uses top-level subflows as stages and maps members to them', () => {
    const index = stageIndex(planA);
    expect(index.stages).toEqual(['verification', 'arrival', 'activities']);
    expect(index.top.get('recheck')).toBe('verification');
    expect(index.top.get('holding')).toBeUndefined();
    expect(index.members.get('arrival')).toEqual(['main', 'side', 'intake', 'tickets']);
  });

  it('tolerates subflow cycles in drafts', () => {
    const plan: Plan = structuredClone(planA);
    plan.graph.nodes.push({ id: 'loop-a', type: 'subflow', name: 'a', layout: { x: 0, y: 0 }, memberNodeIds: ['loop-b'] }, { id: 'loop-b', type: 'subflow', name: 'b', layout: { x: 0, y: 0 }, memberNodeIds: ['loop-a'] });
    expect(() => displayLayout(plan, stageIndex(plan), { derived: true, expanded: 'all', node: NODE_SIZE.run })).not.toThrow();
  });
});

describe('display layout', () => {
  it('collapses every stage into one card on a single row', () => {
    const display = displayLayout(planA, stageIndex(planA), { derived: true, expanded: new Set(), node: NODE_SIZE.run });
    expect([...display.collapsed.keys()].sort()).toEqual(['activities', 'arrival', 'verification']);
    expect([...display.positions.keys()].sort()).toEqual(['holding', 'packing']);
    expect(display.visible('checkin')).toBe('verification');
    const items: Box[] = [...display.collapsed.values(), ...boxes(display.positions)];
    const order = [...items].sort((a, b) => a.x - b.x);
    order.slice(1).forEach((item, index) => expect(item.x).toBeGreaterThan(order[index].x + order[index].w));
    // Five readable items instead of fourteen nodes: the overview stays near 1,500 px wide.
    expect(Math.max(...items.map(item => item.x + item.w)) - Math.min(...items.map(item => item.x))).toBeLessThan(STAGE_SIZE.w * 3 + NODE_SIZE.run.w * 2 + 64 * 4 + 1);
  });

  it('opens one stage with its members in their stored arrangement', () => {
    const display = displayLayout(planB, stageIndex(planB), { derived: true, expanded: new Set(['verification']), node: NODE_SIZE.run });
    expect(display.frames.has('verification')).toBe(true);
    expect(display.positions.has('checkin-extra')).toBe(true);
    const dx = display.positions.get('checkin')!.x - display.positions.get('lane-choice')!.x;
    expect(dx).toBe(planB.graph.nodes.find(node => node.id === 'checkin')!.layout.x - planB.graph.nodes.find(node => node.id === 'lane-choice')!.layout.x);
    const frame = display.frames.get('verification')!;
    for (const item of [...display.collapsed.values(), ...boxes(display.positions).filter(box => !['checkin', 'checkin-extra', 'checked', 'review', 'recheck', 'lane-choice'].includes(box.id))]) expect(overlaps(item, frame)).toBe(false);
  });

  it('keeps the stored layout outside stage view', () => {
    const display = displayLayout(planA, stageIndex(planA), { derived: false, expanded: new Set(), node: NODE_SIZE.build });
    expect(display.positions.get('packing')).toEqual({ x: planA.graph.nodes.find(node => node.id === 'packing')!.layout.x, y: planA.graph.nodes.find(node => node.id === 'packing')!.layout.y });
    expect(display.frames.size).toBe(3);
  });
});

describe('tidy layout', () => {
  it.each([planA, planB])('places cards and stage frames of $id without overlap at live card size', plan => {
    const arranged: Plan = { ...plan, graph: { ...plan.graph, nodes: plan.graph.nodes.map(node => ({ ...node, layout: arrangeLayout(plan).get(node.id) ?? node.layout })) } };
    const display = displayLayout(arranged, stageIndex(arranged), { derived: false, expanded: 'all', node: NODE_SIZE.run });
    const cards = boxes(display.positions);
    cards.forEach((card, index) => cards.slice(index + 1).forEach(other => expect(overlaps(card, other), `${card.id} / ${other.id}`).toBe(false)));
    const frames = [...display.frames.values()];
    frames.forEach((frame, index) => frames.slice(index + 1).forEach(other => expect(overlaps(frame, other)).toBe(false)));
  });

  it('keeps the example in its tidy layout', () => {
    for (const plan of document.plans) {
      const arranged = arrangeLayout(plan);
      for (const node of plan.graph.nodes) expect(node.layout, node.id).toEqual(arranged.get(node.id));
    }
  });

  it('tucks a loop-back step under its decision', () => {
    const positions = layered(['a', 'b', 'c', 'd'], () => ({ w: 100, h: 50 }), [['a', 'b'], ['b', 'c'], ['c', 'b'], ['b', 'd']], () => 0);
    expect(positions.get('c')!.x).toBe(positions.get('b')!.x);
    expect(positions.get('c')!.y).toBeGreaterThan(positions.get('b')!.y);
    expect(positions.get('d')!.x).toBeGreaterThan(positions.get('b')!.x);
  });
});
