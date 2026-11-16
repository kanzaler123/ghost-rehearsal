import { useRef, useState } from 'react';
import type { Scenario } from '../../schemas';
import { buildArrivalStream, createArrivalTemplate, parseArrivalData, updateProvenance } from '../../features/data-sources';
import type { TimeUnit } from '../../features/data-sources';
import { DataInput } from './DataInput';
import { ProvenanceFields } from './ProvenanceFields';
import { dataSourceText, type DataSourceLang } from './text';
import './data-sources.css';

type ArrivalStream = Scenario['arrivalStreams'][number];
interface ArrivalDataEditorProps {
  stream: ArrivalStream;
  attributes: Scenario['attributes'];
  observationCutoff: number;
  horizon: number;
  lang: DataSourceLang;
  onChange: (stream: ArrivalStream) => void;
  requireApply?: boolean;
}

export function ArrivalDataEditor(props: ArrivalDataEditorProps) {
  return <ArrivalDraft key={JSON.stringify([props.stream, props.attributes, props.observationCutoff, props.horizon])} {...props} />;
}

function ArrivalDraft({ stream, attributes, observationCutoff, horizon, lang, onChange, requireApply = false }: ArrivalDataEditorProps) {
  const t = dataSourceText(lang);
  const [text, setText] = useState('');
  const [reading, setReading] = useState(false);
  const [unit, setUnit] = useState<TimeUnit | ''>('');
  const [provenance, setProvenance] = useState(stream.provenance);
  const [preview, setPreview] = useState<ReturnType<typeof parseArrivalData> | null>(null);
  const [notice, setNotice] = useState<'applied' | 'cancelled' | 'chooseUnitError' | 'invalidModel' | null>(null);
  const [inputKey, setInputKey] = useState(0);
  const applied = useRef(false);
  const candidate = preview ? buildArrivalStream(stream, preview, provenance) : null;
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
    setProvenance(stream.provenance);
    setInputKey(current => current + 1);
  };
  return <section className="ds-editor" aria-label={t.arrival}>
    <h2>{t.arrival}</h2>
    <p><b>{t.target}:</b> {stream.name ?? stream.id} <code>{stream.id}</code></p>
    <p className="ds-hint">{t.arrivalHint}</p>
    <DataInput key={inputKey} text={text} unit={unit} lang={lang} template={createArrivalTemplate(attributes)}
      submitError={requireApply ? text || unit || JSON.stringify(provenance) !== JSON.stringify(stream.provenance) ? t.pendingImport : '' : undefined}
      onReadingChange={setReading}
      onTextChange={value => { setText(value); invalidate(); }}
      onUnitChange={value => { setUnit(value); invalidate(); }} />
    <p className="ds-hint">{t.estimateHint}</p>
    <button type="button" disabled={reading} onClick={() => {
      if (reading) return;
      if (!unit) { setNotice('chooseUnitError'); return; }
      setPreview(parseArrivalData(text, unit, attributes, observationCutoff, horizon));
      setNotice(null);
      applied.current = false;
    }}>{t.preview}</button>
    {preview && <div className="ds-preview" aria-label={t.summary}>
      <h3>{t.summary}</h3>
      <dl className="ds-summary">
        <div><dt>{t.totalRows}</dt><dd>{preview.totalRows}</dd></div>
        <div><dt>{t.validRows}</dt><dd>{preview.validRows}</dd></div>
        <div><dt>{t.unit}</dt><dd>{t[preview.unit]}</dd></div>
        <div><dt>{t.earliest}</dt><dd>{preview.summary.earliest ?? '—'}</dd></div>
        <div><dt>{t.latest}</dt><dd>{preview.summary.latest ?? '—'}</dd></div>
        <div><dt>{t.beforeCutoff}</dt><dd>{preview.summary.atOrBeforeCutoff}</dd></div>
        <div><dt>{t.afterCutoff}</dt><dd>{preview.summary.afterCutoff}</dd></div>
        <div><dt>{t.afterHorizon}</dt><dd>{preview.summary.afterHorizon}</dd></div>
      </dl>
      <p>{t.cutoff}: {observationCutoff} {t.seconds} · {t.horizon}: {horizon} {t.seconds}</p>
      <p className="ds-hint">{t.rangeHint}</p>
      {preview.errors.length > 0 && <div className="ds-table-scroll" role="alert" tabIndex={0}><table className="ds-errors">
        <caption>{t.errors}</caption><thead><tr><th>{t.row}</th><th>{t.column}</th><th>{t.errors}</th></tr></thead>
        <tbody>{preview.errors.map((error, index) => <tr key={index}><td>{error.row}</td><td>{error.column}{error.field ? ` (${error.field})` : ''}</td><td>{error.message}</td></tr>)}</tbody>
      </table><p className="ds-error">{t.atomicHint}</p></div>}
      {preview.records.length > 0 && <div className="ds-table-scroll" tabIndex={0} aria-label={t.converted}><table>
        <caption>{t.converted}</caption><thead><tr><th>id</th><th>arrival_time</th>{attributes.map(attribute => <th key={attribute.id}>attr:{attribute.id}</th>)}</tr></thead>
        <tbody>{preview.records.slice(0, 20).map((record, index) => <tr key={index}><td>{record.id}</td><td>{record.arrivalTime}</td>{attributes.map(attribute => <td key={attribute.id}>{record.attributes[attribute.id]}</td>)}</tr>)}</tbody>
      </table>{preview.records.length > 20 && <p className="ds-hint">{t.samplePreview}</p>}</div>}
    </div>}
    <ProvenanceFields value={provenance} lang={lang} onChange={setProvenance} kindDisabled={!preview || preview.errors.length > 0} />
    <p className="ds-hint">{t.sharedHint}</p>
    <div className="ds-actions">
      <button type="button" disabled={reading || !candidate} onClick={() => {
        if (reading || applied.current) return;
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
