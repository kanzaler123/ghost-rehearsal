import { useEffect, useState } from 'react';
import type { ImportClient, ImportState } from '../features/imports/client';
import { download } from '../features/project';
import { MESSAGES } from '../i18n/messages';
import type { Lang } from '../i18n';
import { dataSourceText } from './data-sources/text';

export function ImportDiagnostics({ client, state, lang }: { client: ImportClient | null; state: ImportState | null; lang: Lang }) {
  const [page, setPage] = useState(0);
  useEffect(() => setPage(0), [state?.requestId]);
  if (!state || !client || !['ready', 'invalid', 'failed'].includes(state.status)) return null;
  const t = MESSAGES[lang], issues = client.getIssues(page * 50);
  return <div className="ds-table-scroll" role={state.status === 'ready' ? 'status' : 'alert'} tabIndex={0}>
    {state.failure && <p>{t.imports.failed} {state.failure.message}</p>}
    {!state.validationComplete && <p>{t.imports.incomplete}</p>}
    {issues.total > 0 && <>
      <p>{t.imports.diagnostics(issues.total, page * 50 + 1, Math.min(issues.total, page * 50 + 50))}</p>
      <table className="ds-errors"><caption>{dataSourceText(lang).errors}</caption><tbody>{issues.items.map((issue, index) => <tr key={index}>
        <td>{issue.file}</td><td>{issue.row ?? issue.path?.join('.')}</td><td>{issue.column}{issue.field ? ` (${issue.field})` : ''}</td><td>{issue.message}</td>
      </tr>)}</tbody></table>
      <button type="button" disabled={!page} onClick={() => setPage(value => value - 1)}>{t.imports.previous}</button>
      <button type="button" disabled={(page + 1) * 50 >= issues.total} onClick={() => setPage(value => value + 1)}>{t.imports.next}</button>
      <button type="button" onClick={() => download('import-diagnostics.json', JSON.stringify(client.getAllIssues(), null, 2), 'application/json')}>{t.imports.download}</button>
    </>}
  </div>;
}
