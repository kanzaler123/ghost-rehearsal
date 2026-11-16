import { arrivalStreamSchema, idSchema, serviceDurationSchema, type Scenario, type ServiceNode } from '../../schemas';
import { checkLimit } from '../imports/limits';

export type TimeUnit = 'seconds' | 'minutes';
export type Provenance = ServiceNode['duration']['provenance'];
export type RecordsStream = Extract<Scenario['arrivalStreams'][number], { kind: 'records' }>;
export type EmpiricalDuration = Extract<ServiceNode['duration'], { kind: 'empirical' }>;
export interface DataIssue { row: number; column: number; code: string; message: string; field?: string }
interface Preview {
  errors: DataIssue[];
  totalRows: number;
  validRows: number;
  unit: TimeUnit;
}
export interface ArrivalPreview extends Preview {
  records: RecordsStream['records'];
  summary: { earliest: number | null; latest: number | null; atOrBeforeCutoff: number; afterCutoff: number; afterHorizon: number };
}
export interface ServicePreview extends Preview {
  samples: number[];
  summary: { count: number; min: number | null; max: number | null; mean: number | null };
}
interface Cell { value: string; row: number; column: number }
interface Row { cells: Cell[]; errors: DataIssue[] }
export interface TableLimits { rows: number; cells: number; syntaxIssues: number }

function diagnostic(cell: Pick<Cell, 'row' | 'column'>, code: string, message: string, field?: string): DataIssue {
  return { row: cell.row, column: cell.column, code, message, ...(field === undefined ? {} : { field }) };
}

function readTable(input: string, limits?: TableLimits): Row[] {
  const text = input.replace(/^\uFEFF/, '');
  let delimiter = ',';
  let inQuote = false;
  let headerStarted = false;
  for (let index = 0; index < text.length; index++) {
    if (text[index].trim() !== '') headerStarted = true;
    if (text[index] === '"') {
      if (inQuote && text[index + 1] === '"') index++;
      else inQuote = !inQuote;
    } else if (!inQuote && text[index] === '\t') { delimiter = '\t'; break; }
    else if (!inQuote && (text[index] === '\n' || text[index] === '\r') && headerStarted) break;
  }
  const rows: Row[] = [];
  let cells: Cell[] = [];
  let errors: DataIssue[] = [];
  let value = '';
  let line = 1;
  let cellLine = 1;
  let quoted = false;
  let closed = false;
  let present = false;
  let cellCount = 0;
  let syntaxIssues = 0;
  const endCell = () => {
    if (limits) checkLimit('table_cells', ++cellCount, limits.cells);
    cells.push({ value, row: cellLine, column: cells.length + 1 });
    value = ''; quoted = false; closed = false; cellLine = line;
  };
  const endRow = () => {
    endCell();
    if (present || cells.length > 1 || cells[0].value.trim() !== '') {
      rows.push({ cells, errors });
      if (limits) checkLimit('table_rows', rows.length - 1, limits.rows);
    }
    cells = []; errors = []; present = false;
  };
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (quoted) {
      if (char === '"') {
        if (text[index + 1] === '"') { value += '"'; index++; }
        else { quoted = false; closed = true; }
      } else {
        value += char;
        if (char === '\r') {
          if (text[index + 1] === '\n') { value += '\n'; index++; }
          line++;
        } else if (char === '\n') line++;
      }
    } else if (char === delimiter) {
      present = true; endCell();
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[index + 1] === '\n') index++;
      endRow(); line++; cellLine = line;
    } else if (char === '"' && value === '' && !closed) {
      quoted = true; present = true;
    } else {
      if (char === '"' || (closed && char !== ' ' && char !== '\t')) {
        if (limits) checkLimit('csv_syntax_issues', ++syntaxIssues, limits.syntaxIssues);
        errors.push(diagnostic({ row: line, column: cells.length + 1 }, 'csv_quote', 'Malformed quoted field / 引号字段格式错误'));
      }
      if (!closed) value += char;
      if (char.trim() !== '') present = true;
    }
  }
  if (quoted) errors.push(diagnostic({ row: cellLine, column: cells.length + 1 }, 'csv_quote', 'Unclosed quoted field / 引号字段未闭合'));
  if (value !== '' || cells.length || present || errors.length) endRow();
  return rows;
}

function inspectTable(text: string, fields: string[], limits?: TableLimits) {
  const rows = readTable(text, limits);
  const header = rows.shift();
  const errors: DataIssue[] = header ? [...header.errors] : [diagnostic({ row: 1, column: 1 }, 'empty_file', 'No header or data / 文件中没有表头或数据')];
  const positions = new Map<string, number>();
  header?.cells.forEach((cell, index) => {
    const field = cell.value.trim();
    if (positions.has(field)) errors.push(diagnostic(cell, 'duplicate_column', 'Duplicate column / 列名重复', field));
    if (!fields.includes(field)) errors.push(diagnostic(cell, 'unknown_column', 'Unknown column; attributes require attr: / 未知列；属性列须使用 attr: 前缀', field));
    positions.set(field, index);
  });
  for (const field of fields) {
    if (!positions.has(field)) errors.push(diagnostic({ row: header?.cells[0].row ?? 1, column: (header?.cells.length ?? 0) + 1 }, 'missing_column', `Missing required column / 缺少必需列: ${field}`, field));
  }
  if (header && rows.length === 0) errors.push(diagnostic({ row: header.cells[0].row + 1, column: 1 }, 'no_data', 'No data rows / 没有数据行'));
  const headerValid = errors.length === 0;
  for (const row of rows) {
    if (row.cells.length !== header?.cells.length) {
      row.errors.push(diagnostic({ row: row.cells[0].row, column: Math.min(row.cells.length, header?.cells.length ?? 0) + 1 }, 'column_count', 'Row has missing or extra columns / 此行缺列或多列'));
    }
    errors.push(...row.errors);
  }
  return { rows, positions, errors, headerValid };
}

function seconds(cell: Cell, unit: TimeUnit, errors: DataIssue[], field: string): number | null {
  const token = cell.value.trim();
  const value = Number(token) * (unit === 'minutes' ? 60 : 1);
  const negative = token.startsWith('-') && /[1-9]/.test(token.slice(1).split(/[eE]/)[0]);
  if (!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/.test(token) || !Number.isFinite(value) || negative) {
    errors.push(diagnostic(cell, 'invalid_number', 'Use a finite nonnegative number / 请输入有限的非负数', field));
    return null;
  }
  return value;
}

export function parseArrivalData(text: string, unit: TimeUnit, attributes: Scenario['attributes'], observationCutoff: number, horizon: number, limits?: TableLimits): ArrivalPreview {
  const { rows, positions, errors, headerValid } = inspectTable(text, ['id', 'arrival_time', ...attributes.map(attribute => `attr:${attribute.id}`)], limits);
  const records: RecordsStream['records'] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    if (!headerValid || row.errors.length) continue;
    const before = errors.length;
    const id = row.cells[positions.get('id')!];
    if (!idSchema.safeParse(id.value).success) errors.push(diagnostic(id, 'invalid_id', 'Invalid ID (lowercase letter, then lowercase letters, digits, _ or -, up to 64) / ID 格式无效', 'id'));
    if (seen.has(id.value)) errors.push(diagnostic(id, 'duplicate_id', 'Duplicate arrival ID / 到达 ID 重复', 'id'));
    seen.add(id.value);
    const arrivalTime = seconds(row.cells[positions.get('arrival_time')!], unit, errors, 'arrival_time');
    const values = attributes.map(attribute => {
      const field = `attr:${attribute.id}`;
      const cell = row.cells[positions.get(field)!];
      if (!attribute.values.includes(cell.value)) errors.push(diagnostic(cell, 'invalid_attribute', `Value is not allowed for / 属性取值无效: ${attribute.id}`, field));
      return [attribute.id, cell.value];
    });
    if (errors.length === before && arrivalTime !== null) {
      records.push(Object.freeze({ id: id.value, arrivalTime, attributes: Object.freeze(Object.fromEntries(values)) }));
    }
  }
  const times = records.map(record => record.arrivalTime);
  const summary = Object.freeze({
    earliest: times.length ? times.reduce((min, time) => Math.min(min, time), Infinity) : null,
    latest: times.length ? times.reduce((max, time) => Math.max(max, time), -Infinity) : null,
    atOrBeforeCutoff: times.filter(time => time <= observationCutoff).length,
    afterCutoff: times.filter(time => time > observationCutoff).length,
    afterHorizon: times.filter(time => time > horizon).length,
  });
  errors.forEach(Object.freeze); Object.freeze(errors); Object.freeze(records);
  return Object.freeze({ records, errors, totalRows: rows.length, validRows: records.length, unit, summary });
}

export function parseServiceData(text: string, unit: TimeUnit, limits?: TableLimits): ServicePreview {
  const { rows, errors, headerValid } = inspectTable(text, ['duration'], limits);
  const samples: number[] = [];
  const sampleCells: Cell[] = [];
  for (const row of rows) {
    if (!headerValid || row.errors.length) continue;
    const sample = seconds(row.cells[0], unit, errors, 'duration');
    if (sample !== null) { samples.push(sample); sampleCells.push(row.cells[0]); }
  }
  const validation = serviceDurationSchema.safeParse({ kind: 'empirical', samples, provenance: { kind: 'user_estimate' } });
  if (!validation.success) {
    for (const issue of validation.error.issues) {
      if (issue.code === 'too_big' && issue.path[0] === 'samples') {
        errors.push(diagnostic(sampleCells[Number(issue.maximum)] ?? { row: 1, column: 1 }, 'sample_limit', `Sample limit / 样本数上限: ${issue.maximum}`, 'duration'));
      }
    }
  }
  const summary = Object.freeze({
    count: samples.length,
    min: samples.length ? samples.reduce((min, value) => Math.min(min, value), Infinity) : null,
    max: samples.length ? samples.reduce((max, value) => Math.max(max, value), -Infinity) : null,
    mean: samples.length ? samples.reduce((mean, value, index) => mean + (value - mean) / (index + 1), 0) : null,
  });
  errors.forEach(Object.freeze); Object.freeze(errors); Object.freeze(samples);
  return Object.freeze({ samples, errors, totalRows: rows.length, validRows: samples.length, unit, summary });
}

export function updateProvenance(previous: Provenance, change: { valueChanged?: boolean; source?: string; notes?: string; kind?: Provenance['kind'] }): Provenance {
  const { valueChanged, kind, ...fields } = change;
  return { ...previous, ...fields, kind: kind ?? (valueChanged ? 'user_estimate' : previous.kind) };
}

export function buildArrivalStream(stream: Scenario['arrivalStreams'][number], preview: ArrivalPreview, provenance: Provenance): RecordsStream | null {
  if (preview.errors.length) return null;
  const parsed = arrivalStreamSchema.safeParse({
    id: stream.id, ...(stream.name === undefined ? {} : { name: stream.name }), kind: 'records', records: preview.records, provenance,
  });
  return parsed.success && parsed.data.kind === 'records' ? parsed.data : null;
}

export function buildServiceDuration(preview: ServicePreview, provenance: Provenance): EmpiricalDuration | null {
  if (preview.errors.length) return null;
  const parsed = serviceDurationSchema.safeParse({ kind: 'empirical', samples: preview.samples, provenance });
  return parsed.success && parsed.data.kind === 'empirical' ? parsed.data : null;
}

function csvCell(value: string): string {
  return /[,"\r\n\t]/.test(value) || value.trim() !== value ? `"${value.replace(/"/g, '""')}"` : value;
}

export function createArrivalTemplate(attributes: Scenario['attributes']): string {
  return [
    ['id', 'arrival_time', ...attributes.map(attribute => `attr:${attribute.id}`)],
    ['guest-1', '0', ...attributes.map(attribute => attribute.values[0])],
    ['guest-2', '1.5', ...attributes.map(attribute => attribute.values[1] ?? attribute.values[0])],
  ].map(row => row.map(csvCell).join(',')).join('\n') + '\n';
}

export function createServiceTemplate(): string { return 'duration\n22\n31\n18\n'; }
