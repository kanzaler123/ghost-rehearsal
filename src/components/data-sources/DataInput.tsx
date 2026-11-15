import { useLayoutEffect, useRef, useState } from 'react';
import type { TimeUnit } from '../../features/data-sources';
import { dataSourceText, type DataSourceLang } from './text';

export function DataInput({ text, unit, lang, template, onTextChange, onUnitChange, submitError }: {
  text: string;
  unit: TimeUnit | '';
  lang: DataSourceLang;
  template: string;
  onTextChange: (text: string) => void;
  onUnitChange: (unit: TimeUnit | '') => void;
  submitError?: string;
}) {
  const t = dataSourceText(lang);
  const request = useRef(0);
  const [reading, setReading] = useState(false);
  const [failed, setFailed] = useState(false);
  const input = useRef<HTMLTextAreaElement>(null);
  const error = submitError === undefined ? '' : reading ? t.loading : failed ? t.fileError : submitError;
  useLayoutEffect(() => { input.current?.setCustomValidity(error); }, [error]);
  useLayoutEffect(() => () => { request.current += 1; }, []);
  return <div className="ds-input">
    <label>{t.file}<input type="file" accept=".csv,.tsv,text/csv,text/tab-separated-values,text/plain" onChange={async event => {
      const file = event.target.files?.[0];
      event.target.value = '';
      if (!file) return;
      const current = ++request.current;
      setFailed(false);
      setReading(true);
      onTextChange('');
      try {
        const next = await file.text();
        if (current === request.current) onTextChange(next);
      } catch {
        if (current === request.current) setFailed(true);
      } finally {
        if (current === request.current) setReading(false);
      }
    }} /></label>
    {reading && <p role="status">{t.loading}</p>}
    {failed && <p role="alert" className="ds-error">{t.fileError}</p>}
    <label>{t.text}<textarea ref={input} className="ds-csv" spellCheck={false} rows={7} value={text} onChange={event => {
      request.current += 1;
      setReading(false);
      setFailed(false);
      onTextChange(event.target.value);
    }} /></label>
    <label>{t.unit}<select value={unit} onChange={event => onUnitChange(event.target.value as TimeUnit | '')}>
      <option value="">{t.chooseUnit}</option><option value="seconds">{t.seconds}</option><option value="minutes">{t.minutes}</option>
    </select></label>
    <p className="ds-hint">{t.unitHint}</p>
    <a className="ds-template" download="synthetic-data-template.csv" href={`data:text/csv;charset=utf-8,${encodeURIComponent(template)}`}>{t.template}</a>
    <p className="ds-hint">{t.templateHint}</p>
    {submitError && <p className="ds-hint">{submitError}</p>}
  </div>;
}
