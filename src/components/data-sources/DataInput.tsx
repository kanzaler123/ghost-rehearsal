import { useLayoutEffect, useRef, useState } from 'react';
import { readImportFiles } from '../../features/imports/read';
import { importFailure } from '../../features/imports/limits';
import type { TimeUnit } from '../../features/data-sources';
import { dataSourceText, type DataSourceLang } from './text';

export function DataInput({ text, unit, lang, template, onTextChange, onUnitChange, onReadingChange, submitError }: {
  text: string;
  unit: TimeUnit | '';
  lang: DataSourceLang;
  template: string;
  onTextChange: (text: string) => void;
  onUnitChange: (unit: TimeUnit | '') => void;
  onReadingChange: (reading: boolean) => void;
  submitError?: string;
}) {
  const t = dataSourceText(lang);
  const request = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const [failureDetail, setFailureDetail] = useState('');
  const [reading, setReading] = useState(false);
  const [failed, setFailed] = useState(false);
  const input = useRef<HTMLTextAreaElement>(null);
  // A failed replacement leaves the current draft valid; an active read still blocks submission.
  const error = submitError === undefined ? '' : reading ? t.loading : submitError;
  useLayoutEffect(() => { input.current?.setCustomValidity(error); }, [error]);
  useLayoutEffect(() => () => { request.current += 1; controller.current?.abort(); onReadingChange(false); }, [onReadingChange]);
  function updateReading(value: boolean) { setReading(value); onReadingChange(value); }
  return <div className="ds-input">
    <label>{t.file}<input type="file" accept=".csv,.tsv,text/csv,text/tab-separated-values,text/plain" onChange={async event => {
      const file = event.target.files?.[0];
      event.target.value = '';
      if (!file) return;
      const current = ++request.current;
      controller.current?.abort();
      const active = new AbortController(); controller.current = active;
      setFailed(false);
      updateReading(true);
      try {
        const [next] = await readImportFiles([file], active.signal);
        if (current === request.current) onTextChange(next.text);
      } catch (error) {
        if (current === request.current && !active.signal.aborted) { setFailed(true); const failure = importFailure(error); setFailureDetail(failure.code.endsWith('_limit') ? failure.message : ''); }
      } finally {
        if (current === request.current) updateReading(false);
      }
    }} /></label>
    {reading && <p role="status">{t.loading}</p>}
    {failed && <p role="alert" className="ds-error">{t.fileError} {failureDetail}</p>}
    <label>{t.text}<textarea ref={input} className="ds-csv" spellCheck={false} rows={7} value={text} onChange={event => {
      request.current += 1; controller.current?.abort();
      updateReading(false);
      setFailed(false);
      onTextChange(event.target.value);
    }} /></label>
    <label>{t.unit}<select value={unit} onChange={event => { request.current += 1; controller.current?.abort(); updateReading(false); onUnitChange(event.target.value as TimeUnit | ''); }}>
      <option value="">{t.chooseUnit}</option><option value="seconds">{t.seconds}</option><option value="minutes">{t.minutes}</option>
    </select></label>
    <p className="ds-hint">{t.unitHint}</p>
    <a className="ds-template" download="synthetic-data-template.csv" href={`data:text/csv;charset=utf-8,${encodeURIComponent(template)}`}>{t.template}</a>
    <p className="ds-hint">{t.templateHint}</p>
    {submitError && <p className="ds-hint">{submitError}</p>}
  </div>;
}
