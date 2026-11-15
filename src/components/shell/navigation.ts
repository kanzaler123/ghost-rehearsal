import type { Plan } from '../../schemas';
import type { PlaybackState } from '../../simulation/types';
import type { KeyEvent } from '../../features/analysis';
import { waitingAt } from '../../features/analysis';

export function filterNodes<T extends { name: string; type: string }>(nodes: T[], query: string, typeName: (type: T['type']) => string): T[] {
  const needle = query.trim().toLocaleLowerCase();
  return nodes.filter(node => `${node.name} ${typeName(node.type)}`.toLocaleLowerCase().includes(needle));
}

export function longestQueues(plan: Plan, view: PlaybackState, previous?: PlaybackState, limit = 4) {
  return plan.graph.nodes.filter(node => node.type === 'service' || node.type === 'waiting_area')
    .map(node => ({ node, waiting: waitingAt(view, node.id), serving: view.nodes[node.id]?.serving.length ?? 0, trend: previous ? waitingAt(view, node.id) - waitingAt(previous, node.id) : 0 }))
    .filter(item => item.waiting > 0).sort((a, b) => b.waiting - a.waiting).slice(0, limit);
}

export function momentsSoFar(moments: KeyEvent[], time: number, limit = 6): KeyEvent[] {
  return moments.filter(item => item.time <= time).reverse().sort((a, b) => b.time - a.time).slice(0, limit);
}
