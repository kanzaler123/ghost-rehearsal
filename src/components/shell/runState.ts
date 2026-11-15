export type RunStateKind = 'not-run' | 'computing' | 'complete' | 'stopped' | 'failed' | 'stale';
export type EmptyStateKind = 'empty-roster' | 'no-difference' | 'no-evidence';
export type StateAction = 'run' | 'stop' | 'rerun' | 'play' | 'clear-filter' | 'choose-rule' | 'edit-guests';
export interface LastRunOutcome { kind: 'stopped' | 'failed'; planIds: string[] }
export interface RunStateInput { busy: boolean; hasRun: boolean; runFailed: boolean; stale: boolean; lastRun: LastRunOutcome | null; planId: string }
export function deriveRunState(input: RunStateInput): { kind: RunStateKind; action: StateAction } {
  if (input.busy) return { kind: 'computing', action: 'stop' };
  if (input.lastRun?.planIds.includes(input.planId)) return { kind: input.lastRun.kind, action: 'rerun' };
  if (input.runFailed) return { kind: 'failed', action: 'rerun' };
  if (!input.hasRun) return { kind: 'not-run', action: 'run' };
  if (input.stale) return { kind: 'stale', action: 'rerun' };
  return { kind: 'complete', action: 'play' };
}
export function deriveEmptyState(input: { rosterEmpty: boolean; filterActive: boolean; noDifference: boolean; evidenceCount: number }): { kind: EmptyStateKind; action: StateAction } | null {
  if (input.rosterEmpty) return { kind: 'empty-roster', action: input.filterActive ? 'clear-filter' : 'edit-guests' };
  if (input.noDifference) return { kind: 'no-difference', action: 'choose-rule' };
  if (!input.evidenceCount) return { kind: 'no-evidence', action: 'rerun' };
  return null;
}
