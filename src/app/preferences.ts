import { parseArrangement } from '../components/shell/arrangement';
import type { Arrangement } from '../components/shell/arrangement';
const ARRANGEMENT_KEY = 'ghost-rehearsal.arrangement.v1';
export function loadArrangement(): Arrangement { try { return parseArrangement(localStorage.getItem(ARRANGEMENT_KEY)); } catch { return 'auto'; } }
export function saveArrangement(value: Arrangement) { try { localStorage.setItem(ARRANGEMENT_KEY, value); } catch {} }
const ACTIVE_PLAN_KEY = 'ghost-rehearsal.active-plan.v1.';
export function loadActivePlan(projectId: string) { try { return localStorage.getItem(ACTIVE_PLAN_KEY + projectId); } catch { return null; } }
export function saveActivePlan(projectId: string, planId: string) { try { localStorage.setItem(ACTIVE_PLAN_KEY + projectId, planId); } catch {} }
export const STUDIO_HASH = '#/studio';
export function hasBrowserLocation(): boolean { return typeof window !== 'undefined' && !!window.location; }
export function isStudioRoute(hash: string = hasBrowserLocation() ? window.location.hash ?? '' : ''): boolean {
  return hash.replace(/\/+$/, '') === STUDIO_HASH;
}
export function navigateRoute(target: 'home' | 'studio') {
  if (!hasBrowserLocation()) return;
  const wantStudio = target === 'studio';
  if (isStudioRoute(window.location.hash) === wantStudio) return;
  const base = `${window.location.pathname ?? ''}${window.location.search ?? ''}`;
  const url = wantStudio ? `${base}${STUDIO_HASH}` : base || '#/';
  try {
    if (window.history?.pushState) window.history.pushState(null, '', url);
    else window.location.hash = wantStudio ? STUDIO_HASH : '#/';
  } catch {
    try { window.location.hash = wantStudio ? STUDIO_HASH : '#/'; } catch {}
  }
}
