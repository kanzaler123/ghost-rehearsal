import { useRef, useState } from 'react';
import type { ServiceNode } from '../../schemas';
import { buildServiceDuration, createServiceTemplate, parseServiceData, updateProvenance } from '../../features/data-sources';
import type { TimeUnit } from '../../features/data-sources';
import { DataInput } from './DataInput';
import { ProvenanceFields } from './ProvenanceFields';
import { dataSourceText, type DataSourceLang } from './text';
import './data-sources.css';

interface ServiceDataEditorProps {
  duration: ServiceNode['duration'];
  targetName?: string;
  lang: DataSourceLang;
  onChange: (duration: ServiceNode['duration']) => void;
}

export function ServiceDataEditor(props: ServiceDataEditorProps) {
  return <ServiceDraft key={JSON.stringify([props.duration, props.targetName])} {...props} />;
}

function ServiceDraft({ duration, targetName, lang, onChange }: ServiceDataEditorProps) {
  const t = dataSourceText(lang);
  const [text, setText] = useState('');
  const [unit, setUnit] = useState<TimeUnit | ''>('');
  const [provenance, setProvenance] = useState(duration.provenance);
  const [preview, setPreview] = useState<ReturnType<typeof parseServiceData> | null>(null);
  const [notice, setNotice] = useState<'applied' | 'cancelled' | 'chooseUnitError' | 'invalidModel' | null>(null);
  const [inputKey, setInputKey] = useState(0);
  const applied = useRef(false);
  const candidate = preview ? buildServiceDuration(preview, provenance) : null;
  const invalidate = () => {
    setPreview(null);
    setNotice(null);
    setProvenance(current => updateProvenance(current, { valueChanged: true }));
    applied.current = false;
  };
  const reset = () => {
    setText('');
    setUnit('');
    setPreview(null);
    setProvenance(duration.provenance);
    setInputKey(current => current + 1);
  };
  return <section className="ds-editor" aria-label={t.service}>
    <h2>{t.service}</h2>
    <p><b>{t.target}:</b> {targetName ?? t.service}</p>
    <p className="ds-hint">{t.serviceHint}</p>
    <DataInput key={inputKey} text={text} unit={unit} lang={lang} template={createServiceTemplate()}
      onTextChange={value => { setText(value); invalidate(); }}
      onUnitChange={value => { setUnit(value); invalidate(); }} />
    <p className="ds-hint">{t.estimateHint}</p>
    <button type="button" onClick={() => {
      if (!unit) { setNotice('chooseUnitError'); return; }
      setPreview(parseServiceData(text, unit));
      setNotice(null);
      applied.current = false;
    }}>{t.preview}</button>
    {preview && <div className="ds-preview" aria-label={t.summary}>
      <h3>{t.summary}</h3>
      <dl className="ds-summary">
        <div><dt>{t.totalRows}</dt><dd>{preview.totalRows}</dd></div>
        <div><dt>{t.validRows}</dt><dd>{preview.validRows}</dd></div>
        <div><dt>{t.unit}</dt><dd>{t[preview.unit]}</dd></div>
        <div><dt>{t.count}</dt><dd>{preview.summary.count}</dd></div>
        <div><dt>{t.min}</dt><dd>{preview.summary.min ?? '—'}</dd></div>
        <div><dt>{t.max}</dt><dd>{preview.summary.max ?? '—'}</dd></div>
        <div><dt>{t.mean}</dt><dd>{preview.summary.mean ?? '—'}</dd></div>
      </dl>
      {preview.errors.length > 0 && <div className="ds-table-scroll" role="alert" tabIndex={0}><table className="ds-errors">
        <caption>{t.errors}</caption><thead><tr><th>{t.row}</th><th>{t.column}</th><th>{t.errors}</th></tr></thead>
        <tbody>{preview.errors.map((error, index) => <tr key={index}><td>{error.row}</td><td>{error.column}{error.field ? ` (${error.field})` : ''}</td><td>{error.message}</td></tr>)}</tbody>
      </table><p className="ds-error">{t.atomicHint}</p></div>}
      {preview.samples.length > 0 && <div className="ds-table-scroll" tabIndex={0} aria-label={t.converted}><table>
        <caption>{t.converted}</caption><thead><tr><th>duration</th></tr></thead>
        <tbody>{preview.samples.slice(0, 20).map((sample, index) => <tr key={index}><td>{sample}</td></tr>)}</tbody>
      </table>{preview.samples.length > 20 && <p className="ds-hint">{t.samplePreview}</p>}</div>}
    </div>}
    <ProvenanceFields value={provenance} lang={lang} onChange={setProvenance} kindDisabled={!preview || preview.errors.length > 0} />
    <div className="ds-actions">
      <button type="button" disabled={!candidate} onClick={() => {
        if (applied.current) return;
        if (!candidate) { setNotice('invalidModel'); return; }
        applied.current = true;
        reset();
        setNotice('applied');
        onChange(candidate);
      }}>{t.apply}</button>
      <button type="button" onClick={() => { reset(); setNotice('cancelled'); }}>{t.cancel}</button>
    </div>
    {notice && <p role={notice === 'chooseUnitError' || notice === 'invalidModel' ? 'alert' : 'status'}>{t[notice]}</p>}
  </section>;
}
