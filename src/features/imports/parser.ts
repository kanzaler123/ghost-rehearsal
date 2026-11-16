import { ZodError } from 'zod';
import { parseDocument, type ProjectDocument, type Scenario } from '../../schemas';
import { importTemplate, newId, type SavedTemplate } from '../project';
import { parseArrivalData, parseServiceData, type ArrivalPreview, type ServicePreview, type TimeUnit } from '../data-sources';
import { checkLimit, checkStructures, checkTexts, IMPORT_LIMITS, importFailure, type ImportFailure, type ImportText } from './limits';

export type ImportOptions = { kind: 'project' } | { kind: 'templates' }
  | { kind: 'arrivals'; unit: TimeUnit; attributes: Scenario['attributes']; observationCutoff: number; horizon: number }
  | { kind: 'services'; unit: TimeUnit };
export type ImportValue = { kind: 'project'; document: ProjectDocument }
  | { kind: 'templates'; templates: SavedTemplate[] }
  | { kind: 'arrivals'; preview: ArrivalPreview }
  | { kind: 'services'; preview: ServicePreview };
export interface ImportIssue {
  file: string; code: string; message: string; severity: 'error' | 'warning';
  path?: (string | number)[]; entityIds?: string[]; row?: number; column?: number; field?: string;
}
export interface ImportResult {
  value: ImportValue | null;
  issues: ImportIssue[];
  failure: ImportFailure | null;
  validationComplete: boolean;
}

/** No project or library is mutated. A result is applicable only when value is non-null. */
export function parseImport(files: readonly ImportText[], options: ImportOptions): ImportResult {
  const issues: ImportIssue[] = [];
  let value: ImportValue | null = null;
  let file: string | undefined;
  try {
    checkTexts(files);
    if (options.kind !== 'templates') checkLimit('files', files.length, 1);
    if (options.kind === 'project' || options.kind === 'templates') {
      const raw = files.map(item => { file = item.name; return JSON.parse(item.text) as unknown; });
      file = undefined;
      checkStructures(raw);
      if (options.kind === 'project') {
        file = files[0].name;
        const parsed = parseDocument(files[0].text);
        for (const issue of parsed.issues) issues.push({ ...issue, file });
        if (parsed.document) value = { kind: 'project', document: parsed.document };
      } else {
        const templates: SavedTemplate[] = [];
        for (const item of files) {
          file = item.name;
          try { templates.push(...importTemplate(item.text, [])); }
          catch (error) {
            if (!(error instanceof ZodError)) throw error;
            for (const issue of error.issues) issues.push({ file: item.name, code: issue.code, message: issue.message,
              severity: 'error', path: issue.path.map(part => typeof part === 'number' ? part : String(part)) });
          }
        }
        value = { kind: 'templates', templates: appendImportedTemplates([], templates) };
      }
    } else {
      file = files[0].name;
      const limits = { rows: IMPORT_LIMITS.tableRows, cells: IMPORT_LIMITS.tableCells, syntaxIssues: IMPORT_LIMITS.syntaxIssues };
      const preview = options.kind === 'arrivals'
        ? parseArrivalData(files[0].text, options.unit, options.attributes, options.observationCutoff, options.horizon, limits)
        : parseServiceData(files[0].text, options.unit, limits);
      for (const issue of preview.errors) issues.push({ ...issue, file, severity: 'error' });
      value = options.kind === 'arrivals' ? { kind: 'arrivals', preview: preview as ArrivalPreview }
        : { kind: 'services', preview: preview as ServicePreview };
    }
    const errorCount = issues.filter(issue => issue.severity === 'error').length;
    if (errorCount > IMPORT_LIMITS.errors) return { value: null, issues, validationComplete: true,
      failure: { code: 'errors_limit', actual: errorCount, limit: IMPORT_LIMITS.errors, message: `Import has ${errorCount} errors; maximum ${IMPORT_LIMITS.errors}. All diagnostics remain available.` } };
    return { value: errorCount ? null : value, issues, failure: null, validationComplete: true };
  } catch (error) {
    const failure = error instanceof SyntaxError ? { code: 'invalid_json', message: 'File is not valid JSON.', file } : importFailure(error, file);
    return { value: null, issues: [...issues, { ...failure, file: failure.file ?? '', severity: 'error' }], failure, validationComplete: false };
  }
}

/** Apply to the latest library only after explicit approval of a ready template preview. */
export function appendImportedTemplates(existing: SavedTemplate[], imported: SavedTemplate[]): SavedTemplate[] {
  checkLimit('templates', existing.length + imported.length, IMPORT_LIMITS.templates);
  const next = [...existing];
  for (const template of structuredClone(imported)) next.push({ ...template, id: newId('template', next.map(item => item.id)) });
  return next;
}
