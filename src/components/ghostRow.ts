export function layoutGhosts<K>(ghosts: [string, K][], limit: number, trackedId?: string): { pinned?: [string, K]; shown: [string, K][]; undrawn: number } {
  const pinned = trackedId ? ghosts.find(([id]) => id === trackedId) : undefined;
  const others = ghosts.filter(([id]) => id !== pinned?.[0]);
  const shown = others.slice(0, Math.max(0, limit - (pinned ? 1 : 0)));
  return { pinned, shown, undrawn: others.length - shown.length };
}
