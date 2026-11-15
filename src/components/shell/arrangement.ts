export type Arrangement = 'auto' | 'rows' | 'cols';
export function parseArrangement(raw: string | null | undefined): Arrangement { return raw === 'rows' || raw === 'cols' ? raw : 'auto'; }
export function effectiveArrangement(pref: Arrangement, narrow: boolean, autoRows: boolean): 'rows' | 'cols' { return narrow ? 'rows' : pref === 'auto' ? autoRows ? 'rows' : 'cols' : pref; }
