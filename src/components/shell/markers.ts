import { Ban, Check, CircleArrowDown, CircleArrowUp, CircleCheck, CircleX, Clock, Coins, ConciergeBell, Crosshair, Equal, GitCompare, Hourglass, LogOut, Radio, TriangleAlert } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type MarkerId = 'queue' | 'serve' | 'blocked' | 'finished' | 'left' | 'selected' | 'error' | 'diff' | 'running' | 'stale' | 'tracked' | 'failed' | 'gain' | 'regression' | 'cost' | 'neutral';
export type MarkerShape = 'circle' | 'ring' | 'square' | 'diamond' | 'dashed' | 'triangle' | 'halo' | 'bars';
export interface MarkerSpec { id: MarkerId; icon: LucideIcon; shape: MarkerShape; tone: `--${string}` }
export const MARKERS: Record<MarkerId, MarkerSpec> = {
  queue: { id: 'queue', icon: Hourglass, shape: 'ring', tone: '--tone-wait' },
  serve: { id: 'serve', icon: ConciergeBell, shape: 'circle', tone: '--tone-serve' },
  blocked: { id: 'blocked', icon: Ban, shape: 'square', tone: '--tone-block' },
  finished: { id: 'finished', icon: CircleCheck, shape: 'diamond', tone: '--tone-done' },
  left: { id: 'left', icon: LogOut, shape: 'dashed', tone: '--tone-left' },
  selected: { id: 'selected', icon: Check, shape: 'ring', tone: '--text-primary' },
  error: { id: 'error', icon: TriangleAlert, shape: 'triangle', tone: '--tone-block' },
  diff: { id: 'diff', icon: GitCompare, shape: 'bars', tone: '--tone-diff' },
  running: { id: 'running', icon: Radio, shape: 'circle', tone: '--tone-serve' },
  stale: { id: 'stale', icon: Clock, shape: 'dashed', tone: '--tone-stale' },
  tracked: { id: 'tracked', icon: Crosshair, shape: 'halo', tone: '--tone-track' },
  failed: { id: 'failed', icon: CircleX, shape: 'triangle', tone: '--tone-block' },
  gain: { id: 'gain', icon: CircleArrowUp, shape: 'circle', tone: '--tone-gain' },
  regression: { id: 'regression', icon: CircleArrowDown, shape: 'triangle', tone: '--tone-regress' },
  cost: { id: 'cost', icon: Coins, shape: 'diamond', tone: '--tone-cost' },
  neutral: { id: 'neutral', icon: Equal, shape: 'square', tone: '--tone-neutral' },
};
