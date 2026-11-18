import type { Node, Plan } from '../schemas';

/**
 * Stage view: top-level subflows act as stages. Read-only modes can collapse a stage
 * into one card and lay the stages out compactly; Build keeps the stored layout and
 * draws each subflow as a frame around its members.
 */

export interface Point { x: number; y: number }
export interface Size { w: number; h: number }
export interface Box extends Point, Size {}

/** Layout estimates. Card CSS keeps real sizes close to these values. */
export const NODE_SIZE = { build: { w: 200, h: 118 }, run: { w: 232, h: 220 } } as const;
export const STAGE_SIZE: Size = { w: 248, h: 220 };
export const FRAME_PAD = { side: 24, top: 52, bottom: 24 } as const;
const GAP_X = 64;
const GAP_Y = 30;

type Subflow = Extract<Node, { type: 'subflow' }>;

export interface StageIndex {
  subflows: Map<string, Subflow>;
  /** Direct parent subflow. The first claim wins so invalid drafts still render. */
  parent: Map<string, string>;
  /** Direct children (nodes and subflows) of each subflow. */
  children: Map<string, string[]>;
  /** Top-level stage of each regular node, when it has one. */
  top: Map<string, string>;
  /** Regular descendants of each subflow. */
  members: Map<string, string[]>;
  /** Top-level subflows that contain regular nodes, in document order. */
  stages: string[];
}

export function stageIndex(plan: Plan): StageIndex {
  const ids = new Set(plan.graph.nodes.map(node => node.id));
  const subflows = new Map(plan.graph.nodes.filter((node): node is Subflow => node.type === 'subflow').map(node => [node.id, node]));
  const parent = new Map<string, string>();
  for (const subflow of subflows.values()) for (const id of subflow.memberNodeIds) if (ids.has(id) && id !== subflow.id && !parent.has(id)) parent.set(id, subflow.id);
  const ancestors = (id: string): string[] | null => {
    const chain: string[] = []; const seen = new Set([id]);
    for (let current = parent.get(id); current; current = parent.get(current)) {
      if (seen.has(current)) return null;
      seen.add(current); chain.push(current);
    }
    return chain;
  };
  const children = new Map<string, string[]>();
  const top = new Map<string, string>();
  const members = new Map<string, string[]>([...subflows.keys()].map(id => [id, []]));
  for (const node of plan.graph.nodes) {
    const chain = ancestors(node.id);
    if (!chain) continue;
    if (chain.length) children.set(chain[0], [...(children.get(chain[0]) ?? []), node.id]);
    if (node.type === 'subflow') continue;
    chain.forEach(id => members.get(id)!.push(node.id));
    if (chain.length) top.set(node.id, chain.at(-1)!);
  }
  const stages = [...subflows.keys()].filter(id => !parent.has(id) && ancestors(id) && members.get(id)!.length > 0);
  return { subflows, parent, children, top, members, stages };
}

/** Frames of every acyclic subflow around the given regular node positions. */
export function frameBoxes(index: StageIndex, positions: Map<string, Point>, size: Size): Map<string, Box & { depth: number }> {
  const result = new Map<string, Box & { depth: number }>();
  const visiting = new Set<string>();
  const compute = (id: string, depth: number): Box | undefined => {
    if (result.has(id)) return result.get(id);
    if (visiting.has(id)) return undefined;
    visiting.add(id);
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const child of index.children.get(id) ?? []) {
      const box = index.subflows.has(child) ? compute(child, depth + 1) : positions.has(child) ? { ...positions.get(child)!, ...size } : undefined;
      if (!box) continue;
      minX = Math.min(minX, box.x); minY = Math.min(minY, box.y); maxX = Math.max(maxX, box.x + box.w); maxY = Math.max(maxY, box.y + box.h);
    }
    if (!Number.isFinite(minX)) return undefined;
    const box = { x: minX - FRAME_PAD.side, y: minY - FRAME_PAD.top, w: maxX - minX + 2 * FRAME_PAD.side, h: maxY - minY + FRAME_PAD.top + FRAME_PAD.bottom, depth };
    result.set(id, box);
    return box;
  };
  for (const id of index.subflows.keys()) if (!index.parent.has(id)) compute(id, 0);
  return result;
}

/**
 * Layered left-to-right layout. Back edges are ignored, nodes that only loop back are
 * tucked under their predecessor, and each layer is centred on one horizontal line.
 */
export function layered(ids: string[], size: (id: string) => Size, links: [string, string][], rank: (id: string) => number): Map<string, Point> {
  const out = new Map(ids.map(id => [id, [] as string[]]));
  const incoming = new Map(ids.map(id => [id, [] as string[]]));
  for (const [source, target] of links) {
    if (source === target || !out.has(source) || !out.has(target) || out.get(source)!.includes(target)) continue;
    out.get(source)!.push(target); incoming.get(target)!.push(source);
  }
  const order = [...ids].sort((a, b) => Number(incoming.get(a)!.length > 0) - Number(incoming.get(b)!.length > 0) || rank(a) - rank(b));
  const state = new Map<string, number>();
  const back = new Set<string>();
  const visit = (id: string) => {
    state.set(id, 1);
    for (const target of out.get(id)!) {
      const seen = state.get(target) ?? 0;
      if (seen === 1) back.add(`${id}>${target}`);
      else if (!seen) visit(target);
    }
    state.set(id, 2);
  };
  order.forEach(id => { if (!state.get(id)) visit(id); });
  const forward = (id: string) => out.get(id)!.filter(target => !back.has(`${id}>${target}`));
  const before = (id: string) => incoming.get(id)!.filter(source => !back.has(`${source}>${id}`));
  const layer = new Map<string, number>();
  const pending = new Map(ids.map(id => [id, before(id).length]));
  const queue = order.filter(id => !pending.get(id));
  queue.forEach(id => layer.set(id, 0));
  while (queue.length) {
    const id = queue.shift()!;
    for (const target of forward(id)) {
      layer.set(target, Math.max(layer.get(target) ?? 0, layer.get(id)! + 1));
      pending.set(target, pending.get(target)! - 1);
      if (!pending.get(target)) queue.push(target);
    }
  }
  const tucked = new Map<string, string>();
  for (const id of ids) {
    const sources = before(id);
    if (!forward(id).length && out.get(id)!.length && sources.length === 1) { tucked.set(id, sources[0]); layer.set(id, layer.get(sources[0]) ?? 0); }
  }
  const columns: string[][] = [];
  ids.forEach(id => { const index = layer.get(id) ?? 0; (columns[index] ??= []).push(id); });
  const slot = new Map<string, number>();
  columns.forEach(column => {
    const weights = new Map<string, number>();
    for (const id of column) {
      if (tucked.has(id)) continue;
      const placed = before(id).filter(source => slot.has(source));
      // Siblings keep the order of their source's outgoing links, so branches read top to bottom.
      weights.set(id, placed.length ? placed.reduce((sum, source) => sum + slot.get(source)! + out.get(source)!.indexOf(id) * 1e-3, 0) / placed.length : column.length + rank(id) / 1e9);
    }
    for (const id of column) if (tucked.has(id)) weights.set(id, (weights.get(tucked.get(id)!) ?? column.length) + 0.5);
    column.sort((a, b) => weights.get(a)! - weights.get(b)! || rank(a) - rank(b));
    column.forEach((id, index) => slot.set(id, index));
  });
  const positions = new Map<string, Point>();
  let x = 0;
  for (const column of columns) {
    if (!column) continue;
    const width = Math.max(...column.map(id => size(id).w));
    // Centre the main path; loop-back steps hang below it.
    const main = column.filter(id => !tucked.has(id));
    const total = main.reduce((sum, id) => sum + size(id).h, 0) + GAP_Y * (main.length - 1);
    let y = -total / 2;
    for (const id of [...main, ...column.filter(id => tucked.has(id))]) {
      const item = size(id);
      positions.set(id, { x: Math.round(x + (width - item.w) / 2), y: Math.round(y) });
      y += item.h + GAP_Y;
    }
    x += width + GAP_X;
  }
  return positions;
}

export interface Display {
  /** Display positions of visible regular nodes. */
  positions: Map<string, Point>;
  /** Collapsed stages shown as single cards. */
  collapsed: Map<string, Box>;
  /** Frames drawn around expanded subflows. */
  frames: Map<string, Box & { depth: number }>;
  /** Subflows without members, shown as small cards so they stay selectable. */
  placeholders: Map<string, Point>;
  /** Element that currently stands for a regular node: the node or its collapsed stage. */
  visible: (nodeId: string) => string;
  derived: boolean;
}

export function displayLayout(plan: Plan, index: StageIndex, options: { derived: boolean; expanded: Set<string> | 'all'; node: Size }): Display {
  const stored = new Map(plan.graph.nodes.filter(node => node.type !== 'subflow').map(node => [node.id, { x: node.layout.x, y: node.layout.y }]));
  const storedFrames = frameBoxes(index, stored, options.node);
  const placeholders = new Map<string, Point>();
  if (!options.derived || !index.stages.length) {
    for (const subflow of index.subflows.values()) if (!storedFrames.has(subflow.id)) placeholders.set(subflow.id, subflow.layout);
    return { positions: stored, collapsed: new Map(), frames: storedFrames, placeholders, visible: id => id, derived: false };
  }
  const isCollapsed = (stage: string) => options.expanded !== 'all' && !options.expanded.has(stage);
  const itemOf = (id: string) => index.top.get(id) ?? id;
  const items = [...new Set([...stored.keys()].map(itemOf))];
  const itemSize = (id: string): Size => index.subflows.has(id) ? (isCollapsed(id) ? STAGE_SIZE : storedFrames.get(id) ?? STAGE_SIZE) : options.node;
  const rankOf = new Map(plan.graph.nodes.map((node, order) => [node.id, order]));
  const rank = (id: string) => {
    const ids = index.subflows.has(id) ? index.members.get(id)! : [id];
    return Math.min(...ids.map(member => (stored.get(member)?.x ?? 0) * 1000 + (rankOf.get(member) ?? 0)));
  };
  const links = plan.graph.edges.map(edge => [itemOf(edge.source), itemOf(edge.target)] as [string, string]);
  const placed = layered(items, itemSize, links, rank);
  const positions = new Map<string, Point>();
  const collapsed = new Map<string, Box>();
  const frames = new Map<string, Box & { depth: number }>();
  for (const item of items) {
    const at = placed.get(item)!;
    if (!index.subflows.has(item)) { positions.set(item, at); continue; }
    if (isCollapsed(item)) { collapsed.set(item, { ...at, ...STAGE_SIZE }); continue; }
    const frame = storedFrames.get(item)!;
    const dx = at.x - frame.x, dy = at.y - frame.y;
    for (const member of index.members.get(item)!) { const point = stored.get(member)!; positions.set(member, { x: point.x + dx, y: point.y + dy }); }
    for (const [id, box] of storedFrames) if (id === item || isWithin(index, id, item)) frames.set(id, { ...box, x: box.x + dx, y: box.y + dy });
  }
  return { positions, collapsed, frames, placeholders, visible: id => { const stage = index.top.get(id); return stage && collapsed.has(stage) ? stage : id; }, derived: true };
}

function isWithin(index: StageIndex, id: string, ancestor: string): boolean {
  const seen = new Set<string>();
  for (let current = index.parent.get(id); current && !seen.has(current); current = index.parent.get(current)) {
    if (current === ancestor) return true;
    seen.add(current);
  }
  return false;
}

/** Box of a visible element in a display. */
export function boxOf(display: Display, id: string, node: Size): Box | undefined {
  const point = display.positions.get(id);
  if (point) return { ...point, ...node };
  return display.collapsed.get(id) ?? display.frames.get(id) ?? (display.placeholders.has(id) ? { ...display.placeholders.get(id)!, ...node } : undefined);
}

export function unionBox(boxes: (Box | undefined)[]): Box | undefined {
  const items = boxes.filter((box): box is Box => !!box);
  if (!items.length) return undefined;
  const minX = Math.min(...items.map(box => box.x)), minY = Math.min(...items.map(box => box.y));
  return { x: minX, y: minY, w: Math.max(...items.map(box => box.x + box.w)) - minX, h: Math.max(...items.map(box => box.y + box.h)) - minY };
}

export function displayBounds(display: Display, node: Size): Box | undefined {
  return unionBox([
    ...[...display.positions.values()].map(point => ({ ...point, ...node })),
    ...display.collapsed.values(), ...display.frames.values(),
    ...[...display.placeholders.values()].map(point => ({ ...point, ...node })),
  ]);
}

/**
 * Stage-aware tidy layout for Build. Each subflow is laid out on its own, then placed as
 * a block in the parent flow. Subflow layouts are set to their frame's top-left corner.
 * Spacing uses the taller live card so the same layout also works during replay.
 */
/**
 * Pitch of the stored tidy layout (the example document uses it): 264×226 between card origins.
 * Run cards (232×220) still fit that pitch, so Arrange keeps saved layouts stable.
 */
export const ARRANGE_CELL: Size = { w: 200, h: 196 };
export function arrangeLayout(plan: Plan, node: Size = ARRANGE_CELL): Map<string, Point> {
  const index = stageIndex(plan);
  const result = new Map<string, Point>();
  const rankOf = new Map(plan.graph.nodes.map((item, order) => [item.id, item.layout.x * 1000 + order]));
  const regular = plan.graph.nodes.filter(item => item.type !== 'subflow').map(item => item.id);
  const roots = plan.graph.nodes.filter(item => !index.parent.has(item.id)).map(item => item.id);
  const childOf = (id: string, group: string | undefined): string | undefined => {
    const seen = new Set<string>();
    for (let current: string | undefined = id; current && !seen.has(current); current = index.parent.get(current)) {
      if (index.parent.get(current) === group) return current;
      seen.add(current);
    }
    return undefined;
  };
  const arrange = (group: string | undefined, childIds: string[], trail: Set<string>): { points: Map<string, Point>; size: Size } => {
    const inner = new Map<string, { points: Map<string, Point>; size: Size }>();
    for (const child of childIds) {
      if (!index.subflows.has(child) || !index.members.get(child)?.length || trail.has(child)) continue;
      inner.set(child, arrange(child, index.children.get(child) ?? [], new Set([...trail, child])));
    }
    const sizeOf = (id: string): Size => inner.has(id) ? { w: inner.get(id)!.size.w + 2 * FRAME_PAD.side, h: inner.get(id)!.size.h + FRAME_PAD.top + FRAME_PAD.bottom } : node;
    const rank = (id: string) => index.subflows.has(id) && index.members.get(id)!.length ? Math.min(...index.members.get(id)!.map(member => rankOf.get(member) ?? 0)) : rankOf.get(id) ?? 0;
    const links = plan.graph.edges.flatMap(edge => {
      const source = childOf(edge.source, group), target = childOf(edge.target, group);
      return source && target && source !== target ? [[source, target] as [string, string]] : [];
    });
    const placed = layered(childIds, sizeOf, links, rank);
    const minX = Math.min(...[...placed.values()].map(point => point.x)), minY = Math.min(...[...placed.values()].map(point => point.y));
    const points = new Map<string, Point>();
    let width = 0, height = 0;
    for (const child of childIds) {
      const at = placed.get(child)!; const x = at.x - minX, y = at.y - minY; const size = sizeOf(child);
      width = Math.max(width, x + size.w); height = Math.max(height, y + size.h);
      points.set(child, { x, y });
      const nested = inner.get(child);
      if (nested) for (const [id, point] of nested.points) points.set(id, { x: x + FRAME_PAD.side + point.x, y: y + FRAME_PAD.top + point.y });
    }
    return { points, size: { w: width, h: height } };
  };
  const { points } = arrange(undefined, roots, new Set());
  for (const id of [...regular, ...index.subflows.keys()]) if (points.has(id)) result.set(id, { x: Math.round(points.get(id)!.x), y: Math.round(points.get(id)!.y) });
  return result;
}
