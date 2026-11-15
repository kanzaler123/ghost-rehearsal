import { useId } from 'react';
import { provenanceSchema } from '../../schemas';
import type { ServiceNode } from '../../schemas';
import { updateProvenance } from '../../features/data-sources';
import { dataSourceText, type DataSourceLang } from './text';
import './data-sources.css';

type Provenance = ServiceNode['duration']['provenance'];

export function ProvenanceFields({ value, lang, onChange, kindDisabled = false }: {
  value: Provenance;
  lang: DataSourceLang;
  onChange: (value: Provenance) => void;
  kindDisabled?: boolean;
}) {
  const t = dataSourceText(lang);
  const errorId = useId();
  const explanationId = useId();
  const kinds = ['synthetic', 'user_estimate', 'measured', 'historical'] as const;
  const invalid = !provenanceSchema.safeParse(value).success;
  return <fieldset className="ds-provenance">
    <legend>{t.sourceKind}</legend>
    <label>{t.sourceKind}<select value={value.kind} disabled={kindDisabled} aria-describedby={explanationId} onChange={event => onChange(updateProvenance(value, { kind: event.target.value as Provenance['kind'] }))}>
      {kinds.map(kind => <option key={kind} value={kind}>{t[kind]}</option>)}
    </select></label>
    <p id={explanationId} className="ds-hint">{t[`${value.kind}Hint`]}</p>
    <label>{t.source}<input value={value.source ?? ''} aria-invalid={value.source !== undefined && [...value.source].length > 1000} aria-describedby={invalid ? errorId : undefined} onChange={event => onChange(updateProvenance(value, { source: event.target.value }))} /></label>
    <label>{t.notes}<textarea rows={3} value={value.notes ?? ''} aria-invalid={value.notes !== undefined && [...value.notes].length > 1000} aria-describedby={invalid ? errorId : undefined} onChange={event => onChange(updateProvenance(value, { notes: event.target.value }))} /></label>
    {invalid && <p id={errorId} className="ds-error" role="alert">{t.metadataError}</p>}
  </fieldset>;
}
