import { useId, useLayoutEffect, useRef, useState } from 'react';
import { useI18n } from '../../i18n';
import { formMessages } from './messages';
import { numberDraft } from './numberDraft';
import './forms.css';

export function NumericInput({ value, onChange, min = 0, max, step = 1, label, optional = false, placeholder, 'aria-describedby': description }: {
  value: number | null | undefined; onChange: (value: number | undefined) => void;
  min?: number; max?: number; step?: number; label?: string; optional?: boolean; placeholder?: string; 'aria-describedby'?: string;
}) {
  const { lang } = useI18n();
  const [state, setState] = useState({ external: value, raw: value == null ? '' : String(value) });
  if (!Object.is(state.external, value)) setState({ external: value, raw: value == null ? '' : String(value) });
  const ref = useRef<HTMLInputElement>(null);
  const errorId = useId();
  const parsed = numberDraft(state.raw, min, max, step, optional);
  const messages = formMessages[lang];
  const error = parsed.error === 'min' ? messages.min(min) : parsed.error === 'max' ? messages.max(max!) : parsed.error === 'step' ? messages.step(step) : parsed.error ? messages[parsed.error] : '';
  useLayoutEffect(() => { ref.current?.setCustomValidity(error); }, [error]);
  const commit = () => {
    if (parsed.error) return;
    if (parsed.value !== (value ?? undefined)) onChange(parsed.value);
    setState({ external: parsed.value, raw: parsed.value === undefined ? '' : String(parsed.value) });
  };
  return <span className="forms-number">
    <input ref={ref} aria-label={label} type="text" inputMode={step === 1 ? 'numeric' : 'decimal'} value={state.raw} placeholder={placeholder}
      aria-invalid={!!error} aria-describedby={[description, error ? errorId : undefined].filter(Boolean).join(' ') || undefined}
      onChange={event => setState({ external: value, raw: event.target.value })} onBlur={commit}
      onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); commit(); } }} />
    {error && <small id={errorId} className="forms-number-error" role="alert">{error}</small>}
  </span>;
}
