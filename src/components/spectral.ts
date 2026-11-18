/** Pure helpers for the decorative stage atmosphere. Nothing here reads or changes simulation data. */

/** Particle drift multiplier: gentle breathing while paused, faster (but sub-linear) at higher replay speeds. */
export function tempoOf(playing: boolean, speed: number): number {
  if (!playing) return 0.35;
  const safe = Number.isFinite(speed) && speed > 0 ? speed : 1;
  return Math.min(3, 0.55 + 0.45 * Math.pow(safe, 0.75));
}

/** Particle budget scales with area and stays small enough for 60fps on modest laptops. */
export function particleBudget(width: number, height: number, quiet = false): { embers: number; wisps: number; mist: number } {
  const area = Math.max(0, width) * Math.max(0, height);
  if (!area) return { embers: 0, wisps: 0, mist: 0 };
  const factor = quiet ? 0.55 : 1;
  return {
    embers: Math.round(Math.min(72, Math.max(14, area / 16000)) * factor),
    wisps: Math.round(Math.min(14, Math.max(4, area / 90000)) * factor),
    mist: 6,
  };
}

/**
 * Minimum milliseconds between atmosphere frames for a smoothed per-frame draw cost.
 * Drifting mist needs no more than 30 fps; expensive draws drop to 15 fps.
 */
export function frameInterval(drawCostMs: number): number {
  return drawCostMs >= 6 ? 1000 / 15 : 1000 / 30;
}

/** Deterministic pseudo-random sequence so the reduced-motion still frame is stable between renders. */
export function seeded(seed: number): () => number {
  let state = seed >>> 0 || 1;
  return () => {
    state ^= state << 13; state >>>= 0;
    state ^= state >>> 17;
    state ^= state << 5; state >>>= 0;
    return state / 4294967296;
  };
}

/** Parses `#rgb`, `#rrggbb` or `#rrggbbaa` design tokens into channels; falls back when a token is missing. */
export function parseHex(value: string, fallback: [number, number, number]): [number, number, number] {
  const hex = value.trim().replace(/^#/, '');
  const full = hex.length === 3 ? hex.split('').map(char => char + char).join('') : hex.slice(0, 6);
  if (!/^[\da-f]{6}$/i.test(full)) return fallback;
  return [0, 2, 4].map(index => parseInt(full.slice(index, index + 2), 16)) as [number, number, number];
}
