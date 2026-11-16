import assert from 'node:assert/strict';
import { cpus, platform, release, totalmem } from 'node:os';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const server = await createServer({ root, configFile: false, server: { middlewareMode: true }, appType: 'custom' });
try {
  const { parseImport } = await server.ssrLoadModule('/src/features/imports/parser.ts');
  const { IMPORT_LIMITS } = await server.ssrLoadModule('/src/features/imports/limits.ts');
  const { initialDocument } = await server.ssrLoadModule('/src/features/project.ts');
  const project = initialDocument();
  const scenario = project.scenarios[0];
  scenario.arrivalStreams = [{ id: scenario.arrivalStreams[0].id, kind: 'records', provenance: { kind: 'synthetic' },
    records: Array.from({ length: 10000 }, (_, index) => ({ id: `guest-${index}`, arrivalTime: index / 10,
      attributes: Object.fromEntries(scenario.attributes.map(attribute => [attribute.id, attribute.values[0]])) })) }];
  for (const plan of project.plans) for (const node of plan.graph.nodes) if (node.type === 'service') {
    node.duration = { kind: 'empirical', samples: Array.from({ length: 10000 }, (_, index) => index % 60), provenance: { kind: 'synthetic' } };
  }
  const templateDocument = initialDocument(); templateDocument.plans = [templateDocument.plans[0]];
  const templateText = JSON.stringify({ format: 'ghost-rehearsal-template-library', schemaVersion: 1,
    templates: Array.from({ length: 2 }, (_, index) => ({ id: `template-${index}`, name: 'Synthetic limit probe', document: templateDocument })) });
  const arrivals = { kind: 'arrivals', unit: 'seconds', attributes: [], observationCutoff: 1000, horizon: 2000 };
  const services = { kind: 'services', unit: 'seconds' };
  const cases = [
    { name: 'services-10000', text: 'duration\n' + Array(10000).fill('1.5').join('\n'), options: services, expected: 'services' },
    { name: 'services-near-4MiB', text: 'duration\n' + Array(10000).fill(' '.repeat(417) + '1').join('\n'), options: services, expected: 'services' },
    { name: 'arrivals-10000', text: 'id,arrival_time\n' + Array.from({ length: 10000 }, (_, index) => `guest-${index},${index / 10}`).join('\n'), options: arrivals, expected: 'arrivals' },
    { name: 'arrivals-17999-errors', text: 'id,arrival_time\n' + Array(6000).fill('Bad-ID,-1').join('\n'), options: arrivals, expected: 'errors_limit' },
    { name: 'project-10000-records-60000-samples', text: JSON.stringify(project), options: { kind: 'project' }, expected: 'project' },
    { name: 'templates-20-files-40-templates-near-16MiB', files: Array.from({ length: 20 }, (_, index) => ({ name: `${index}.json`, text: templateText.padEnd(800 * 1024) })), options: { kind: 'templates' }, expected: 'templates' },
    { name: 'services-10001-rejected', text: 'duration\n' + Array(10001).fill('1').join('\n'), options: services, expected: 'table_rows_limit' },
    { name: 'json-depth-65-rejected', text: '['.repeat(65) + '0' + ']'.repeat(65), options: { kind: 'project' }, expected: 'depth_limit' },
  ];
  const measurements = [];
  for (const item of cases) {
    const files = item.files ?? [{ name: item.name, text: item.text }];
    const rawMs = [];
    let result;
    for (let round = 0; round < 6; round++) {
      const start = performance.now(); result = parseImport(files, item.options);
      const elapsed = performance.now() - start;
      assert.equal(result.value?.kind ?? result.failure?.code, item.expected, JSON.stringify(result.issues.slice(0, 3)));
      if (round) rawMs.push(elapsed);
    }
    const measurement = { name: item.name, files: files.length, bytes: files.reduce((sum, file) => sum + Buffer.byteLength(file.text), 0),
      result: item.expected, issues: result.issues.length, validationComplete: result.validationComplete,
      rawMs, medianMs: [...rawMs].sort((a, b) => a - b)[2] };
    measurements.push(measurement); console.log(`${item.name}: ${measurement.medianMs.toFixed(2)} ms`);
  }
  const evidence = { measuredAt: new Date().toISOString(), environment: { node: process.version, platform: platform(), release: release(),
    cpu: cpus()[0].model, logicalCpus: cpus().length, memoryBytes: totalmem() },
    method: 'Node Vite SSR, synchronous parseImport core only; one warm-up plus five measured calls per case. No browser/Worker startup, IPC, disk I/O or UI timing. Synthetic fixtures; timings are not application speedups.',
    limits: IMPORT_LIMITS, measurements, maxRssKiB: process.resourceUsage().maxRSS };
  await writeFile(new URL('./import-measurements.json', import.meta.url), JSON.stringify(evidence, null, 2) + '\n');
} finally { await server.close(); }
