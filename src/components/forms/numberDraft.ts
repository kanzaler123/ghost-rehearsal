export function numberDraft(raw: string, min: number, max: number | undefined, step: number, optional = false): { value: number | undefined; error?: never } | { error: 'required' | 'number' | 'min' | 'max' | 'step'; value?: never } {
  if (!raw.trim()) return optional ? { value: undefined } : { error: 'required' };
  if (!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(raw.trim()) || !Number.isFinite(Number(raw))) return { error: 'number' };
  const value = Number(raw);
  if (value < min) return { error: 'min' };
  if (max !== undefined && value > max) return { error: 'max' };
  const steps = value / step;
  if (Math.abs(steps - Math.round(steps)) > 1e-8) return { error: 'step' };
  return { value };
}

export const secondsToMinutes = (seconds: number) => Number((seconds / 60).toFixed(4));
export const minutesToSeconds = (minutes: number) => Math.round(minutes * 60000) / 1000;
