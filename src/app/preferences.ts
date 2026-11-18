import { parseArrangement } from '../components/shell/arrangement';
import type { Arrangement } from '../components/shell/arrangement';
const ARRANGEMENT_KEY = 'ghost-rehearsal.arrangement.v1';
export function loadArrangement(): Arrangement { try { return parseArrangement(localStorage.getItem(ARRANGEMENT_KEY)); } catch { return 'auto'; } }
export function saveArrangement(value: Arrangement) { try { localStorage.setItem(ARRANGEMENT_KEY, value); } catch {} }
const OPENING_SEEN_KEY = 'ghost-rehearsal.opening-seen.v1';
export function hasSeenOpening() { try { return localStorage.getItem(OPENING_SEEN_KEY) === '1'; } catch { return false; } }
export function rememberOpening() { try { localStorage.setItem(OPENING_SEEN_KEY, '1'); } catch {} }
