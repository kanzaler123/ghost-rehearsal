import { parseArrangement } from '../components/shell/arrangement';
import type { Arrangement } from '../components/shell/arrangement';
const ARRANGEMENT_KEY = 'ghost-rehearsal.arrangement.v1';
export function loadArrangement(): Arrangement { try { return parseArrangement(localStorage.getItem(ARRANGEMENT_KEY)); } catch { return 'auto'; } }
export function saveArrangement(value: Arrangement) { try { localStorage.setItem(ARRANGEMENT_KEY, value); } catch {} }
