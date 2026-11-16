const MiB = 1024 * 1024;

export const IMPORT_LIMITS = Object.freeze({
  fileBytes: 4 * MiB, batchBytes: 16 * MiB, files: 20,
  depth: 64, values: 250000, nodes: 2000, edges: 8000, plans: 50, scenarios: 50,
  templates: 50, records: 100000, samples: 100000,
  tableRows: 10000, tableCells: 200000, syntaxIssues: 10000, errors: 10000,
  issuePage: 50, maxIssuePage: 500,
});

export interface ImportFailure { code: string; message: string; file?: string; actual?: number; limit?: number }
export class ImportError extends Error {
  constructor(readonly failure: ImportFailure) { super(failure.message); }
}

export function importFailure(error: unknown, file?: string): ImportFailure {
  return error instanceof ImportError ? { ...error.failure, ...(file && !error.failure.file ? { file } : {}) }
    : { code: 'parse_failed', message: error instanceof Error ? error.message : String(error), ...(file ? { file } : {}) };
}

export function checkLimit(resource: string, actual: number, limit: number, file?: string) {
  if (!Number.isFinite(actual) || actual < 0 || actual > limit) throw new ImportError({
    code: `${resource}_limit`, message: `Import exceeds ${resource}: ${actual}; maximum ${limit}.`, actual, limit, ...(file ? { file } : {}),
  });
}

export function checkFiles(files: readonly { name: string; size: number }[]) {
  if (!files.length) throw new ImportError({ code: 'empty_selection', message: 'Choose at least one file.' });
  checkLimit('files', files.length, IMPORT_LIMITS.files);
  for (const file of files) checkLimit('file_bytes', file.size, IMPORT_LIMITS.fileBytes, file.name);
  checkLimit('batch_bytes', files.reduce((sum, file) => sum + file.size, 0), IMPORT_LIMITS.batchBytes);
}

export interface ImportText { name: string; text: string }
export function checkTexts(files: readonly ImportText[]) {
  checkLimit('files', files.length, IMPORT_LIMITS.files);
  for (const file of files) checkLimit('file_bytes', file.text.length, IMPORT_LIMITS.fileBytes, file.name);
  checkFiles(files.map(file => ({ name: file.name, size: new TextEncoder().encode(file.text).byteLength })));
}

export function checkStructures(values: readonly unknown[]) {
  const counts = { values: 0, nodes: 0, edges: 0, plans: 0, scenarios: 0, templates: 0, records: 0, samples: 0 };
  const pending = values.map(value => ({ value, depth: 0 }));
  while (pending.length) {
    const { value, depth } = pending.pop()!;
    checkLimit('depth', depth, IMPORT_LIMITS.depth);
    checkLimit('values', ++counts.values, IMPORT_LIMITS.values);
    if (!value || typeof value !== 'object') continue;
    if (Array.isArray(value)) checkLimit('values', counts.values + pending.length + value.length, IMPORT_LIMITS.values);
    for (const [key, child] of Object.entries(value)) {
      if (key !== 'values' && Object.hasOwn(counts, key) && Array.isArray(child)) {
        const resource = key as Exclude<keyof typeof counts, 'values'>;
        checkLimit(resource, counts[resource] += child.length, IMPORT_LIMITS[resource]);
      }
      if (key === 'template') checkLimit('templates', ++counts.templates, IMPORT_LIMITS.templates);
      checkLimit('values', counts.values + pending.length + 1, IMPORT_LIMITS.values);
      pending.push({ value: child, depth: depth + 1 });
    }
  }
}
