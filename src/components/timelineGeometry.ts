export function segmentExtent(start: number, end: number, span: number): { left: number; width: number } {
  if (!Number.isFinite(start) || !Number.isFinite(end) || !Number.isFinite(span) || span <= 0) return { left: 0, width: 0 };
  const left = Math.max(0, Math.min(100, start / span * 100));
  const right = Math.max(left, Math.min(100, end / span * 100));
  return { left, width: right - left };
}

export function labelFits(label: string, widthPx: number): boolean {
  return Number.isFinite(widthPx) && widthPx >= [...label].reduce((sum, char) => sum + (char.codePointAt(0)! > 255 ? 14 : 9), 16);
}
