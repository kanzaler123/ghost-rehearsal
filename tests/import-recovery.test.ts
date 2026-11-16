import { describe, expect, it, vi } from 'vitest';
import { initialDocument, importTemplate, serializeTemplate, serializeTemplates, type SavedTemplate } from '../src/features/project';
import { parseDocument } from '../src/schemas';
import { buildServiceDuration, buildArrivalStream, parseArrivalData, parseServiceData } from '../src/features/data-sources';
import { appendImportedTemplates, parseImport } from '../src/features/imports/parser';
import { checkStructures, IMPORT_LIMITS } from '../src/features/imports/limits';
import { readImportFiles } from '../src/features/imports/read';

const provenance = { kind: 'measured' as const, source: 'Synthetic import test', notes: 'Not field observations' };
const file = (text: string, name = 'input.csv', size = new TextEncoder().encode(text).byteLength) => ({ name, size, text: vi.fn(async () => text) });
function template(): SavedTemplate {
  const document = initialDocument(); document.plans = [document.plans[0]];
  return { id: 'template-7', name: 'Saved arrangement', document };
}

describe('bounded file reading', () => {
  it.each(['file', 'batch', 'count'] as const)('checks the entire %s limit before calling any file.text()', async kind => {
    const files = kind === 'file' ? [file('valid'), file('large', 'large.json', IMPORT_LIMITS.fileBytes + 1)]
      : kind === 'batch' ? Array.from({ length: 5 }, () => file('', 'chunk.json', IMPORT_LIMITS.fileBytes))
        : Array.from({ length: IMPORT_LIMITS.files + 1 }, () => file(''));
    await expect(readImportFiles(files, new AbortController().signal)).rejects.toMatchObject({ failure: {
      code: kind === 'file' ? 'file_bytes_limit' : kind === 'batch' ? 'batch_bytes_limit' : 'files_limit',
    } });
    expect(files.every(item => item.text.mock.calls.length === 0)).toBe(true);
  });

  it('accepts exact byte boundaries and preserves text, order and Unicode names', async () => {
    const files = [file('\uFEFFduration\r\n1.5\r\n', '实测.csv', IMPORT_LIMITS.fileBytes), file('second', 'b.json')];
    expect(await readImportFiles(files, new AbortController().signal)).toEqual([
      { name: '实测.csv', text: '\uFEFFduration\r\n1.5\r\n' }, { name: 'b.json', text: 'second' },
    ]);
    expect(files.every(item => item.text.mock.calls.length === 1)).toBe(true);
  });

  it('rejects decoded content exceeding the byte budget even when metadata understates it', async () => {
    const input = file('中'.repeat(Math.floor(IMPORT_LIMITS.fileBytes / 3) + 1), 'unicode.csv', 1);
    await expect(readImportFiles([input], new AbortController().signal)).rejects.toMatchObject({ failure: { code: 'file_bytes_limit' } });
  });

  it('reports read failure and retries the same file object', async () => {
    const input = file('duration\n10'); input.text.mockRejectedValueOnce(new Error('unreadable'));
    await expect(readImportFiles([input], new AbortController().signal)).rejects.toMatchObject({ failure: { code: 'read_failed', file: input.name } });
    expect(await readImportFiles([input], new AbortController().signal)).toEqual([{ name: input.name, text: 'duration\n10' }]);
  });

  it('cancels a pending read promptly and never reads subsequent files', async () => {
    let finish!: (text: string) => void;
    const first = file(''), second = file('next');
    first.text.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    const controller = new AbortController(), reading = readImportFiles([first, second], controller.signal);
    await Promise.resolve(); controller.abort();
    await expect(reading).rejects.toMatchObject({ name: 'AbortError' });
    finish('late'); await Promise.resolve();
    expect(second.text).not.toHaveBeenCalled();
    const canceled = new AbortController(); canceled.abort();
    await expect(readImportFiles([second], canceled.signal)).rejects.toMatchObject({ name: 'AbortError' });
    expect(second.text).not.toHaveBeenCalled();
  });
});

describe('import parsing without applying', () => {
  it('returns the existing canonical project and provenance without modifying its source', () => {
    const project = initialDocument(); project.plans[0].graph.nodes[1].name = 'Custom node';
    const text = JSON.stringify(project), before = structuredClone(project);
    const result = parseImport([{ name: 'project.json', text }], { kind: 'project' });
    expect(result).toMatchObject({ failure: null, validationComplete: true, value: { kind: 'project', document: parseDocument(text).document } });
    expect(project).toEqual(before);
    expect(parseImport([{ name: 'broken.json', text: '{' }], { kind: 'project' })).toMatchObject({ value: null, failure: { code: 'invalid_json', file: 'broken.json' } });
    expect(project).toEqual(before);
  });

  it('preserves unit conversion, quoted fields, duplicate samples, zero and source notes', () => {
    const text = '\uFEFFduration\r\n0\r\n1.5\r\n"1.5"\r\n';
    const result = parseImport([{ name: 'samples.csv', text }], { kind: 'services', unit: 'minutes' });
    expect(result.value).toEqual({ kind: 'services', preview: parseServiceData(text, 'minutes') });
    if (result.value?.kind !== 'services') throw new Error('Expected service preview');
    expect(buildServiceDuration(result.value.preview, provenance)).toEqual({ kind: 'empirical', samples: [0, 90, 90], provenance });
    const attributes = [{ id: 'ticket', name: 'Ticket', values: ['a,b', 'vip'] }];
    const arrivals = 'id,arrival_time,attr:ticket\na,0,"a,b"\nb,1.5,vip';
    const options = { kind: 'arrivals' as const, unit: 'minutes' as const, attributes, observationCutoff: 60, horizon: 80 };
    const parsed = parseImport([{ name: 'arrivals.csv', text: arrivals }], options);
    expect(parsed.value).toEqual({ kind: 'arrivals', preview: parseArrivalData(arrivals, 'minutes', attributes, 60, 80) });
    if (parsed.value?.kind !== 'arrivals') throw new Error('Expected arrival preview');
    const stream = { id: 'guests', kind: 'records' as const, records: [], provenance };
    expect(buildArrivalStream(stream, parsed.value.preview, provenance)).toEqual({ ...stream,
      records: [{ id: 'a', arrivalTime: 0, attributes: { ticket: 'a,b' } }, { id: 'b', arrivalTime: 90, attributes: { ticket: 'vip' } }],
    });
  });

  it('accepts 10000 rows and rejects excess rows without returning partial applicable data', () => {
    const text = 'duration\n' + Array(10000).fill('1').join('\n');
    expect(parseImport([{ name: 'samples.csv', text }], { kind: 'services', unit: 'seconds' }).value?.kind).toBe('services');
    expect(parseImport([{ name: 'samples.csv', text: text + '\n2' }], { kind: 'services', unit: 'seconds' })).toMatchObject({
      value: null, failure: { code: 'table_rows_limit', actual: 10001 }, validationComplete: false,
    });
  });

  it('reports all errors above the presentation threshold and never makes invalid rows applicable', () => {
    const text = 'id,arrival_time\n' + Array(6000).fill('Bad-ID,-1').join('\n');
    const result = parseImport([{ name: 'bad.csv', text }], { kind: 'arrivals', unit: 'seconds', attributes: [], observationCutoff: 60, horizon: 100 });
    const original = parseArrivalData(text, 'seconds', [], 60, 100);
    expect(result.value).toBeNull();
    expect(result.validationComplete).toBe(true);
    expect(result.failure).toMatchObject({ code: 'errors_limit', actual: original.errors.length, limit: IMPORT_LIMITS.errors });
    expect(result.issues).toEqual(original.errors.map(issue => ({ ...issue, file: 'bad.csv', severity: 'error' })));
    expect(result.issues.at(-1)).toMatchObject({ row: 6001, code: 'invalid_number' });
  });

  it('stops pathological quote expansion and excessive cells with explicit incomplete-validation failures', () => {
    const text = 'duration\n"x"' + 'x'.repeat(IMPORT_LIMITS.syntaxIssues + 1);
    expect(parseImport([{ name: 'quotes.csv', text }], { kind: 'services', unit: 'seconds' })).toMatchObject({
      value: null, validationComplete: false, failure: { code: 'csv_syntax_issues_limit' },
    });
    const cells = 'duration\n' + ','.repeat(IMPORT_LIMITS.tableCells);
    expect(parseImport([{ name: 'cells.csv', text: cells }], { kind: 'services', unit: 'seconds' }).failure?.code).toBe('table_cells_limit');
  });

  it.each(['nodes', 'edges', 'plans', 'scenarios', 'records', 'samples', 'templates'] as const)('checks the parsed %s boundary across files', resource => {
    const value = { [resource]: Array(IMPORT_LIMITS[resource] + 1).fill(null) };
    expect(() => checkStructures([value])).toThrow(expect.objectContaining({ failure: expect.objectContaining({ code: `${resource}_limit` }) }));
    expect(() => checkStructures([{ [resource]: Array(IMPORT_LIMITS[resource]).fill(null) }])).not.toThrow();
  });

  it('bounds JSON depth and total values before schema validation', () => {
    let nested: unknown = null;
    for (let index = 0; index <= IMPORT_LIMITS.depth; index++) nested = [nested];
    expect(parseImport([{ name: 'deep.json', text: JSON.stringify(nested) }], { kind: 'project' }).failure?.code).toBe('depth_limit');
    expect(() => checkStructures([Array(IMPORT_LIMITS.values).fill(null)])).toThrow(expect.objectContaining({ failure: expect.objectContaining({ code: 'values_limit' }) }));
  });

  it('checks pasted text in UTF-8 bytes and rejects unsupported project formats', () => {
    expect(parseImport([{ name: 'pasted.json', text: ' '.repeat(IMPORT_LIMITS.fileBytes + 1) }], { kind: 'project' }).failure?.code).toBe('file_bytes_limit');
    const project = initialDocument();
    const result = parseImport([{ name: 'future.json', text: JSON.stringify({ ...project, schemaVersion: 99 }) }], { kind: 'project' });
    expect(result.value).toBeNull();
    expect(result.issues).toContainEqual(expect.objectContaining({ code: 'unsupported_schema_version' }));
  });

  it('keeps multi-file template imports atomic and matches existing ID allocation at explicit apply', () => {
    const saved = template(), existing = [{ ...saved, id: 'template-1' }];
    const texts = [serializeTemplate(saved), serializeTemplates([saved, { ...saved, id: 'template-8', name: 'Other' }])];
    const before = structuredClone(existing);
    const parsed = parseImport(texts.map((text, index) => ({ name: `${index}.json`, text })), { kind: 'templates' });
    expect(parsed.value).toEqual({ kind: 'templates', templates: importTemplate(texts, []) });
    expect(existing).toEqual(before);
    if (parsed.value?.kind !== 'templates') throw new Error('Expected template preview');
    existing.push({ ...saved, id: 'template-2', name: 'Created while parsing' });
    const current = structuredClone(existing);
    const applied = appendImportedTemplates(existing, parsed.value.templates);
    expect(applied).toEqual(importTemplate(texts, current));
    expect(existing).toEqual(current);
    const failed = parseImport([{ name: 'ok.json', text: texts[0] }, { name: 'bad.json', text: '{}' }], { kind: 'templates' });
    expect(failed.value).toBeNull(); expect(failed.issues.length).toBeGreaterThan(0);
    expect(existing).toEqual(current);
    expect(() => appendImportedTemplates(Array(IMPORT_LIMITS.templates).fill(saved), [saved])).toThrow();
  });
});
