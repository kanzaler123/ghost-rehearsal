import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import example from '../examples/open-house.json';
import { parseDocument, projectDocumentSchema, scenarioSchema, serializeDocument, type Scenario } from '../src/schemas';
import { simulate } from '../src/simulation/engine';
import {
  buildArrivalStream, buildServiceDuration, createArrivalTemplate, createServiceTemplate,
  parseArrivalData, parseServiceData, updateProvenance, type Provenance,
} from '../src/features/data-sources';

const attributes: Scenario['attributes'] = [
  { id: 'ticket', name: 'Ticket', values: ['regular', 'vip'] },
  { id: 'visit', name: 'Visit', values: ['full', 'quick'] },
];
const provenance: Provenance = { kind: 'measured', source: 'Synthetic test source', notes: 'Invented fixture, not actual measurements' };
const stream: Scenario['arrivalStreams'][number] = {
  kind: 'records', id: 'main-stream', name: 'Existing stream', records: [], provenance,
};
const fixture = (name: string) => readFileSync(new URL(`./fixtures/data-sources/${name}`, import.meta.url), 'utf8');
const arrivals = (text: string) => parseArrivalData(text, 'seconds', [], 60, 120);

describe('measured input parsing', () => {
  it('converts explicit minutes to seconds without removing records after cutoff or horizon', () => {
    const preview = parseArrivalData(fixture('arrivals-minutes.csv'), 'minutes', attributes, 60, 120);
    expect(preview.errors).toEqual([]);
    expect(preview.totalRows).toBe(3);
    expect(preview.validRows).toBe(3);
    expect(preview.records.map(record => record.arrivalTime)).toEqual([0, 90, 180]);
    expect(preview.summary).toEqual({ earliest: 0, latest: 180, atOrBeforeCutoff: 1, afterCutoff: 2, afterHorizon: 1 });
    const seconds = parseArrivalData(fixture('arrivals-minutes.csv').replace('1.5', '90').replace('guest-3,3', 'guest-3,180'), 'seconds', attributes, 60, 120);
    expect(seconds.records).toEqual(preview.records);
  });

  it('uses inclusive cutoff and horizon boundaries', () => {
    const preview = arrivals('id,arrival_time\na,60\nb,120\nc,121');
    expect(preview.summary).toEqual({ earliest: 60, latest: 121, atOrBeforeCutoff: 1, afterCutoff: 2, afterHorizon: 1 });
    expect(buildArrivalStream(stream, preview, provenance)?.records).toHaveLength(3);
  });

  it('supports BOM, CRLF, blank lines, quoted cells and escaped quotes', () => {
    const attrs = [{ id: 'label', name: 'Label', values: ['comma, quote "inside"', 'second\r\nline'] }];
    const preview = parseArrivalData('\uFEFF\r\nid,arrival_time,attr:label\r\na,0,"comma, quote ""inside"""\r\n\r\nb,1,"second\r\nline"\r\n', 'seconds', attrs, 60, 120);
    expect(preview.errors).toEqual([]);
    expect(preview.totalRows).toBe(2);
    expect(preview.records.map(record => record.attributes.label)).toEqual(attrs[0].values);
  });

  it('uses the same parser for pasted tabular data, including leading blank lines', () => {
    expect(arrivals('\n \nid\tarrival_time\na\t1.5').records).toEqual(arrivals('id,arrival_time\na,1.5').records);
    expect(parseServiceData('duration\r\n"1.5"\r\n', 'minutes').samples).toEqual([90]);
  });

  it('keeps empty or whitespace attribute values when explicitly allowed by the Scenario', () => {
    const attrs = [{ id: 'value', name: 'Value', values: ['', '  '] }];
    const preview = parseArrivalData('id,arrival_time,attr:value\na,0,\nb,1,"  "', 'seconds', attrs, 60, 120);
    expect(preview.errors).toEqual([]);
    expect(preview.records.map(record => record.attributes.value)).toEqual(['', '  ']);
  });

  it('maps business keys through attr: without confusing reserved fields or metadata', () => {
    const attrs = ['id', 'arrival_time', 'source', 'notes', 'constructor'].map(id => ({ id, name: id, values: ['one', 'two'] }));
    const template = createArrivalTemplate(attrs);
    const preview = parseArrivalData(template, 'seconds', attrs, 60, 120);
    expect(template.split('\n')[0]).toBe('id,arrival_time,attr:id,attr:arrival_time,attr:source,attr:notes,attr:constructor');
    expect(preview.errors).toEqual([]);
    expect(preview.records[0].attributes).toEqual(Object.fromEntries(attrs.map(attribute => [attribute.id, 'one'])));
    expect(buildArrivalStream(stream, preview, provenance)?.records).toEqual(preview.records);
  });

  it('generates templates using actual allowed values and correct escaping', () => {
    const attrs = [{ id: 'unusual', name: 'Unusual', values: ['"x",y', '\tnew\r\nline'] }];
    const preview = parseArrivalData(createArrivalTemplate(attrs), 'minutes', attrs, 60, 120);
    expect(preview.errors).toEqual([]);
    expect(preview.records.map(record => record.attributes.unusual)).toEqual(attrs[0].values);
    expect(parseServiceData(createServiceTemplate(), 'seconds').samples).toEqual([22, 31, 18]);
  });

  it('preserves repeated service samples and zero; computes input statistics', () => {
    const preview = parseServiceData(fixture('services-seconds.csv'), 'seconds');
    expect(preview.errors).toEqual([]);
    expect(preview.samples).toEqual([0, 22, 31, 22]);
    expect(preview.summary).toEqual({ count: 4, min: 0, max: 31, mean: 18.75 });
    expect(buildServiceDuration(preview, provenance)?.samples).toEqual([0, 22, 31, 22]);
    expect(parseServiceData('duration\n1.5\n1.5', 'minutes').samples).toEqual([90, 90]);
  });

  it('does not overflow the mean of finite large samples', () => {
    const preview = parseServiceData(`duration\n${Number.MAX_VALUE}\n${Number.MAX_VALUE}`, 'seconds');
    expect(preview.errors).toEqual([]);
    expect(preview.summary.mean).toBe(Number.MAX_VALUE);
  });

  it('reuses the empirical schema sample maximum and points at the first excess row', () => {
    const atLimit = parseServiceData('duration\n' + Array(10000).fill('1').join('\n'), 'seconds');
    expect(atLimit.errors).toEqual([]);
    expect(buildServiceDuration(atLimit, provenance)?.samples).toHaveLength(10000);
    const excessive = parseServiceData('duration\n' + Array(10001).fill('1').join('\n'), 'seconds');
    expect(excessive.errors).toEqual([expect.objectContaining({ row: 10002, column: 1, code: 'sample_limit' })]);
    expect(buildServiceDuration(excessive, provenance)).toBeNull();
  });
});

describe('whole-import rejection and error locations', () => {
  it.each(['', '\uFEFF\r\n  \r\n'])('rejects empty input %j', text => {
    expect(arrivals(text).errors).toContainEqual(expect.objectContaining({ row: 1, column: 1, code: 'empty_file' }));
    expect(parseServiceData(text, 'seconds').validRows).toBe(0);
  });

  it.each([
    ['id,arrival_time', 'no_data', 2, 1],
    ['id\na', 'missing_column', 1, 2],
    ['id,arrival_time,extra\na,0,x', 'unknown_column', 1, 3],
    ['id,id,arrival_time\na,a,0', 'duplicate_column', 1, 2],
    ['id,arrival_time\na', 'column_count', 2, 2],
    ['id,arrival_time\na,0,x', 'column_count', 2, 3],
    ['id,arrival_time\n"a,0', 'csv_quote', 2, 1],
    ['id,arrival_time\n"a"x,0', 'csv_quote', 2, 1],
    ['id,arrival_time\na"x,0', 'csv_quote', 2, 1],
    ['id,arrival_time\nBad-ID,0', 'invalid_id', 2, 1],
    ['id,arrival_time\na,0\na,1', 'duplicate_id', 3, 1],
  ])('locates %s', (text, code, row, column) => {
    const preview = arrivals(text);
    expect(preview.errors).toContainEqual(expect.objectContaining({ code, row, column }));
    expect(buildArrivalStream(stream, preview, provenance)).toBeNull();
  });

  it.each(['-1', '-1e-999', 'NaN', 'Infinity', '1e309', '', '0x20', '12 seconds'])('rejects invalid time %j in both formats', value => {
    const arrival = arrivals(`id,arrival_time\na,${value}`);
    expect(arrival.errors).toContainEqual(expect.objectContaining({ code: 'invalid_number', row: 2, column: 2 }));
    const service = parseServiceData(`duration\n"${value}"`, 'seconds');
    expect(service.errors).toContainEqual(expect.objectContaining({ code: 'invalid_number', row: 2, column: 1 }));
    expect(buildArrivalStream(stream, arrival, provenance)).toBeNull();
    expect(buildServiceDuration(service, provenance)).toBeNull();
  });

  it('rejects overflow during minute conversion', () => {
    expect(parseServiceData('duration\n1e308', 'minutes').errors[0].code).toBe('invalid_number');
  });

  it('reports a missing required attribute column and does not invent attributes', () => {
    const preview = parseArrivalData('id,arrival_time,ticket\na,0,regular', 'seconds', attributes, 60, 120);
    expect(preview.errors).toContainEqual(expect.objectContaining({ code: 'unknown_column', row: 1, column: 3, field: 'ticket' }));
    expect(preview.errors).toContainEqual(expect.objectContaining({ code: 'missing_column', field: 'attr:ticket' }));
    expect(preview.validRows).toBe(0);
    expect(buildArrivalStream(stream, preview, provenance)).toBeNull();
  });

  it('reports every duplicate-ID, number and attribute issue on the same row', () => {
    const preview = parseArrivalData(fixture('invalid-arrivals.csv'), 'seconds', attributes, 60, 120);
    expect(preview.errors.map(({ row, column, code }) => ({ row, column, code }))).toEqual([
      { row: 3, column: 1, code: 'duplicate_id' },
      { row: 3, column: 2, code: 'invalid_number' },
      { row: 3, column: 3, code: 'invalid_attribute' },
    ]);
    expect(preview.validRows).toBe(1);
    expect(preview.totalRows).toBe(2);
    expect(buildArrivalStream(stream, preview, provenance)).toBeNull();
  });

  it('counts malformed and wrong-width rows as invalid and retains physical line locations', () => {
    const preview = parseServiceData('\r\nduration\r\n\r\n1,2\r\n3\r\n"4"x\r\n', 'seconds');
    expect(preview.totalRows).toBe(3);
    expect(preview.validRows).toBe(1);
    expect(preview.errors).toContainEqual(expect.objectContaining({ row: 4, column: 2, code: 'column_count' }));
    expect(preview.errors).toContainEqual(expect.objectContaining({ row: 6, column: 1, code: 'csv_quote' }));
    expect(buildServiceDuration(preview, provenance)).toBeNull();
  });

  it('freezes validated snapshot data so a preview cannot change beneath Apply', () => {
    const preview = parseArrivalData(createArrivalTemplate(attributes), 'seconds', attributes, 60, 120);
    expect(() => { preview.records[0].arrivalTime = -1; }).toThrow();
    expect(() => { preview.records[0].attributes.ticket = 'unknown'; }).toThrow();
    expect(() => { preview.records.pop(); }).toThrow();
    const services = parseServiceData('duration\n1', 'seconds');
    expect(() => { services.samples[0] = -1; }).toThrow();
    expect(buildArrivalStream(stream, preview, provenance)?.records[0].arrivalTime).toBe(0);
  });
});

describe('controlled model and provenance updates', () => {
  it.each(['measured', 'historical', 'synthetic'] as const)('defaults changed values from %s to estimates while retaining explanations', kind => {
    const previous = { ...provenance, kind };
    expect(updateProvenance(previous, { valueChanged: true })).toEqual({ ...previous, kind: 'user_estimate' });
    expect(previous.kind).toBe(kind);
  });

  it('preserves provenance kind for metadata-only updates and supports explicit reselection', () => {
    expect(updateProvenance(provenance, { source: 'Updated description' })).toEqual({ ...provenance, source: 'Updated description' });
    expect(updateProvenance(provenance, { notes: 'Updated notes' })).toEqual({ ...provenance, notes: 'Updated notes' });
    expect(updateProvenance(provenance, {})).toEqual(provenance);
    expect(updateProvenance(provenance, { valueChanged: true, kind: undefined })).toEqual({ ...provenance, kind: 'user_estimate' });
    expect(updateProvenance(provenance, { valueChanged: true, kind: 'historical' })).toEqual({ ...provenance, kind: 'historical' });
  });

  it('validates provenance limits in Unicode code points and preserves all three fields', () => {
    const preview = parseServiceData('duration\n1', 'seconds');
    const valid = { kind: 'historical' as const, source: '😀'.repeat(1000), notes: 'Notes' };
    expect(buildServiceDuration(preview, valid)?.provenance).toEqual(valid);
    expect(buildServiceDuration(preview, { ...valid, notes: '😀'.repeat(1001) })).toBeNull();
    expect(buildArrivalStream(stream, arrivals('id,arrival_time\na,0'), { ...valid, source: 'x'.repeat(1001) })).toBeNull();
  });

  it('replaces only stream values, retaining ID/name and input references without mutation', () => {
    const original = projectDocumentSchema.parse(structuredClone(example));
    const originalText = serializeDocument(original);
    const scenario = original.scenarios[0];
    const previous = scenario.arrivalStreams[0];
    const preview = parseArrivalData(createArrivalTemplate(scenario.attributes), 'minutes', scenario.attributes, scenario.observationCutoff, scenario.horizon);
    const nextStream = buildArrivalStream(previous, preview, updateProvenance(previous.provenance, { valueChanged: true }))!;
    expect(nextStream.id).toBe(previous.id);
    expect(nextStream.name).toBe(previous.name);
    expect(nextStream.provenance.kind).toBe('user_estimate');
    const nextScenario = { ...scenario, arrivalStreams: scenario.arrivalStreams.map(item => item.id === nextStream.id ? nextStream : item) };
    expect(scenarioSchema.safeParse(nextScenario).success).toBe(true);
    expect(nextScenario.arrivalStreams[1]).toBe(scenario.arrivalStreams[1]);
    expect(nextScenario.attributes).toBe(scenario.attributes);
    const nextProject = { ...original, scenarios: [nextScenario, ...original.scenarios.slice(1)] };
    expect(nextProject.plans).toBe(original.plans);
    const roundTrip = parseDocument(serializeDocument(nextProject));
    expect(roundTrip.issues).toEqual([]);
    expect(roundTrip.document!.scenarios[0].arrivalStreams.find(item => item.id === previous.id)).toEqual(nextStream);
    expect(serializeDocument(original)).toBe(originalText);
    nextStream.records[0].arrivalTime = 999;
    expect(preview.records[0].arrivalTime).toBe(0);
  });

  it('never changes original model/provenance on failed construction', () => {
    const before = structuredClone(stream);
    expect(buildArrivalStream(stream, arrivals('id,arrival_time\na,-1'), provenance)).toBeNull();
    expect(stream).toEqual(before);
    expect(buildArrivalStream({ ...stream, name: '' }, arrivals('id,arrival_time\na,0'), provenance)).toBeNull();
    expect(stream).toEqual(before);
  });

  it('runs imported records and empirical samples reproducibly after a legal project round trip', () => {
    const original = projectDocumentSchema.parse(structuredClone(example));
    const scenario = original.scenarios[0];
    const plan = original.plans[0];
    const service = plan.graph.nodes.find(node => node.type === 'service')!;
    if (service.type !== 'service') throw new Error('service fixture');
    const input = createArrivalTemplate(scenario.attributes).replace('guest-2,1.5', `guest-2,${scenario.observationCutoff + 1}`)
      + `late,${scenario.horizon + 1},regular,full\n`;
    const arrivalPreview = parseArrivalData(input, 'seconds', scenario.attributes, scenario.observationCutoff, scenario.horizon);
    const nextStream = buildArrivalStream(scenario.arrivalStreams[0], arrivalPreview, provenance)!;
    const duration = buildServiceDuration(parseServiceData(fixture('services-seconds.csv'), 'seconds'), { ...provenance, kind: 'historical' })!;
    const nextScenario = { ...scenario, arrivalStreams: [nextStream, ...scenario.arrivalStreams.slice(1)] };
    const nextPlan = { ...plan, graph: { ...plan.graph, nodes: plan.graph.nodes.map(node => node.id === service.id ? { ...service, duration } : node) } };
    expect(nextPlan.graph.edges).toBe(plan.graph.edges);
    expect(nextPlan.graph.nodes.filter(node => node.id !== service.id)).toEqual(plan.graph.nodes.filter(node => node.id !== service.id));
    const updated = { ...original, scenarios: [nextScenario], plans: [nextPlan, ...original.plans.slice(1)] };
    const restored = parseDocument(serializeDocument(updated)).document!;
    const restoredPlan = restored.plans.find(item => item.id === plan.id)!;
    expect(restoredPlan.graph.nodes.find(node => node.id === service.id)).toMatchObject({ duration });
    const request = { schemaVersion: 1 as const, scenario: nextScenario, plan: nextPlan, runMode: 'run_to_completion' as const };
    const run = simulate(request);
    expect(run.status).toBe('succeeded');
    expect(run.population.find(person => person.id === `${nextStream.id}:late`)?.arrivalTime).toBe(scenario.horizon + 1);
    expect(run.statistics!.visitors.find(visitor => visitor.id === `${nextStream.id}:guest-2`)?.outcome).toBe('not_arrived');
    expect(run.completion!.visitors.find(visitor => visitor.id === `${nextStream.id}:late`)?.outcome).toBe('not_arrived');
    expect(simulate({ ...request, scenario: restored.scenarios[0], plan: restoredPlan }).events).toEqual(run.events);
    expect(original.plans[0].graph.nodes.find(node => node.id === service.id)).toEqual(service);
    expect(scenario.arrivalStreams[0].kind).toBe('total_in_window');
  });
});
