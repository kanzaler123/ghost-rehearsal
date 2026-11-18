/** Branch labels sit this far right of the source handle: inside the gap between cards, clear of both handles. */
export const LABEL_OFFSET = 36;

const cubic = (t: number, a: number, b: number, c: number, d: number) => (1 - t) ** 3 * a + 3 * (1 - t) ** 2 * t * b + 3 * (1 - t) * t * t * c + t ** 3 * d;

/**
 * Anchor for a branch label on a React Flow bezier path (`M sx,sy C c1 c2 tx,ty`).
 * Forward edges get a point just after the source, so a long edge passing behind other cards keeps its label in the
 * open gap next to its decision. Short or backward edges keep the curve midpoint.
 */
export function labelAnchor(path: string, midpoint: [number, number]): [number, number] {
  const values = path.match(/-?\d+(?:\.\d+)?(?:e-?\d+)?/gi)?.map(Number);
  if (!values || values.length < 8) return midpoint;
  const [sx, sy, c1x, c1y, c2x, c2y, tx, ty] = values;
  if (tx - sx < LABEL_OFFSET * 2) return midpoint;
  for (let t = 0.02; t <= 0.5; t += 0.02) {
    const x = cubic(t, sx, c1x, c2x, tx);
    if (x >= sx + LABEL_OFFSET) return [x, cubic(t, sy, c1y, c2y, ty)];
  }
  return midpoint;
}
