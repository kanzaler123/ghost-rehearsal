import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';
import { chromium } from '@playwright/test';

const root = fileURLToPath(new URL('../../../test-results/d-runtime/', import.meta.url));
await mkdir(root, { recursive: true });
await writeFile(`${root}/index.html`, '<!doctype html><html><head><link rel="icon" href="data:,"></head><body><script type="module" src="./entry.ts"></script></body></html>');
await writeFile(`${root}/entry.ts`, `
import { SimulationClient } from '../../src/simulation/client';
import { simulate } from '../../src/simulation/engine';
import { ImportClient } from '../../src/features/imports/client';
import { appendImportedTemplates } from '../../src/features/imports/parser';
import { initialDocument, serializeTemplate } from '../../src/features/project';
import { buildArrivalStream, buildServiceDuration } from '../../src/features/data-sources';
Object.assign(window, { SimulationClient, simulate, ImportClient, appendImportedTemplates, initialDocument, serializeTemplate, buildArrivalStream, buildServiceDuration });
`);
const config = { root, configFile: false, base: './', publicDir: false, build: { outDir: 'dist' } };
await build(config);
const dist = resolve(root, 'dist');
const server = createServer(async (request, response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname;
  const file = resolve(dist, '.' + (pathname === '/' ? '/index.html' : pathname));
  if (!file.startsWith(dist + sep)) { response.writeHead(403).end(); return; }
  try {
    const content = await readFile(file);
    response.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : 'text/html');
    response.end(content);
  } catch { response.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser;
const timeout = setTimeout(() => { console.error('Runtime verification exceeded 60 seconds'); process.exitCode = 1; void browser?.close(); server.closeAllConnections(); server.close(); }, 60000);
const pageErrors = [], consoleErrors = [], workerUrls = [];
try {
  browser = await chromium.launch({ headless: true });
  console.log('Chromium launched');
  const page = await browser.newPage();
  page.setDefaultTimeout(30000);
  page.on('pageerror', error => pageErrors.push(String(error)));
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); else if (message.text().startsWith('Verified:')) console.log(message.text()); });
  page.on('worker', worker => workerUrls.push(worker.url()));
  const address = server.address();
  await page.goto(`http://127.0.0.1:${address.port}/`);
  await page.waitForFunction(() => !!window.ImportClient);
  const checks = await page.evaluate(async () => {
    const { SimulationClient, ImportClient, initialDocument, serializeTemplate, appendImportedTemplates, simulate, buildArrivalStream, buildServiceDuration } = window;
    const checks = [];
    function check(name, condition, details = {}) { if (!condition) throw new Error(name + ': ' + JSON.stringify(details)); checks.push({ name, ...details }); console.log('Verified: ' + name); }
    const doc = initialDocument(), before = JSON.stringify(doc);
    const requests = doc.plans.map(plan => ({ schemaVersion: 1, plan, scenario: doc.scenarios[0], runMode: 'cutoff' }));
    let settle;
    const simulation = new SimulationClient(state => { if (state.status !== 'running') settle?.(state); });
    function run() { return new Promise(resolve => { settle = resolve; simulation.start(requests); }); }
    const successful = await run();
    check('real simulation Worker matches direct algorithm output', successful.status === 'succeeded' && JSON.stringify(successful.runs) === JSON.stringify(requests.map(simulate)));
    const old = successful.lastSuccessful;
    const canceled = run(); simulation.cancel();
    check('cancel preserves separately identified previous success', (await canceled).status === 'canceled' && simulation.getState().lastSuccessful === old && simulation.getState().runs === null);
    const retried = await run();
    check('ordinary Worker retries successfully', retried.status === 'succeeded' && retried.requestId === 3);
    simulation.dispose();

    const imports = new ImportClient(() => {});
    const service = await imports.startFiles([new File(['\uFEFFduration\r\n0\r\n1.5\r\n1.5'], 'service.csv')], { kind: 'services', unit: 'minutes' });
    const provenance = { kind: 'measured', source: 'Synthetic browser fixture', notes: 'No field data' };
    check('real File and import Worker retain conversion, duplicates and provenance', service.status === 'ready'
      && JSON.stringify(buildServiceDuration(service.value.preview, provenance)) === JSON.stringify({ kind: 'empirical', samples: [0, 90, 90], provenance }));
    const arrivals = await imports.startTexts([{ name: 'arrival.csv', text: 'id,arrival_time,attr:ticket\na,0,"a,b"\nb,1.5,vip' }],
      { kind: 'arrivals', unit: 'minutes', attributes: [{ id: 'ticket', name: 'Ticket', values: ['a,b', 'vip'] }], observationCutoff: 60, horizon: 100 });
    check('real Worker retains arrival unit conversion and quoted attributes', arrivals.status === 'ready'
      && buildArrivalStream({ id: 'guests', kind: 'records', records: [], provenance }, arrivals.value.preview, provenance).records[1].arrivalTime === 90);
    const project = await imports.startFiles([new File([before], 'project.json')], { kind: 'project' });
    check('project parsing returns a staged value without changing the current project', project.status === 'ready' && JSON.stringify(doc) === before);
    const broken = await imports.startFiles([new File(['{'], 'broken.json')], { kind: 'project' });
    check('broken project cannot be applied and previous project remains usable', broken.status === 'invalid' && broken.failure.code === 'invalid_json' && imports.getValue(project.requestId) === null && JSON.stringify(doc) === before);

    const templateDoc = initialDocument(); templateDoc.plans = [templateDoc.plans[0]];
    const template = { id: 'template-1', name: 'Test', document: templateDoc }, templateText = serializeTemplate(template);
    const existing = [template], oldLibrary = JSON.stringify(existing);
    const invalidBatch = await imports.startFiles([new File([templateText], 'good.json'), new File(['{}'], 'bad.json')], { kind: 'templates' });
    check('template batch failure leaves the whole library unchanged', invalidBatch.status === 'invalid' && invalidBatch.value === null && JSON.stringify(existing) === oldLibrary);
    const batch = await imports.startFiles([new File([templateText], 'a.json'), new File([templateText], 'b.json')], { kind: 'templates' });
    const applied = appendImportedTemplates(existing, batch.value.templates);
    check('explicit template apply allocates unique IDs atomically', batch.status === 'ready' && applied.length === 3 && new Set(applied.map(item => item.id)).size === 3 && JSON.stringify(existing) === oldLibrary);

    const errors = await imports.startTexts([{ name: 'bad.csv', text: 'id,arrival_time\n' + Array(6000).fill('Bad-ID,-1').join('\n') }],
      { kind: 'arrivals', unit: 'seconds', attributes: [], observationCutoff: 60, horizon: 100 });
    check('all 17999 diagnostics remain available beyond the 50-row first page', errors.status === 'invalid' && errors.failure.code === 'errors_limit'
      && errors.issueCount === 17999 && errors.issues.length === 50 && imports.getAllIssues().length === 17999 && imports.getIssues(17990).items.length === 9);
    const huge = new File([' '.repeat(4 * 1024 * 1024 + 1)], 'huge.csv');
    let reads = 0; huge.text = async () => { reads++; return 'duration\n1'; };
    const tooBig = await imports.startFiles([huge], { kind: 'services', unit: 'seconds' });
    check('oversized File is rejected before text()', tooBig.status === 'failed' && tooBig.failure.code === 'file_bytes_limit' && reads === 0);

    const heavy = [{ name: 'heavy.csv', text: 'duration\n' + Array(10000).fill(' '.repeat(417) + '1').join('\n') }];
    const heavyOptions = { kind: 'services', unit: 'seconds' };
    let heartbeats = 0;
    const heartbeat = setInterval(() => { heartbeats++; }, 5);
    const start = performance.now();
    const large = await imports.startTexts(heavy, heavyOptions);
    clearInterval(heartbeat);
    check('heavy parse runs in a Worker while the page event loop progresses', large.status === 'ready' && large.value.preview.samples.length === 10000 && heartbeats > 0,
      { wallMs: performance.now() - start, heartbeats });
    const slow = imports.startTexts(heavy, heavyOptions);
    await new Promise(resolve => setTimeout(resolve, 0));
    const latest = imports.startTexts([{ name: 'latest.csv', text: 'duration\n7' }], heavyOptions);
    check('later selection supersedes an active parsing Worker', (await slow).status === 'canceled' && (await latest).value.preview.samples[0] === 7);
    const closing = imports.startTexts(heavy, heavyOptions);
    await new Promise(resolve => setTimeout(resolve, 0)); imports.cancel();
    check('cancel invalidates an active preview and permits retry', (await closing).status === 'canceled' && imports.getValue(imports.getState().requestId) === null
      && (await imports.startTexts([{ name: 'latest.csv', text: 'duration\n7' }], heavyOptions)).status === 'ready');
    imports.dispose();
    check('dispose is terminal without applying any project changes', imports.getState().status === 'disposed' && JSON.stringify(doc) === before);
    return checks;
  });
  assert.deepEqual(pageErrors, []); assert.deepEqual(consoleErrors, []);
  const uniqueWorkerUrls = [...new Set(workerUrls)];
  assert.equal(uniqueWorkerUrls.length, 2, 'Both clients must load their distinct production Worker assets');
  assert.ok(uniqueWorkerUrls.every(url => /\/assets\/worker-.*\.js$/.test(url)));
  const evidence = { verifiedAt: new Date().toISOString(), node: process.version, browser: browser.version(),
    scope: 'Isolated production build of new clients and their real Workers. App and upload/preview UI are not wired.',
    checks, workerAssets: uniqueWorkerUrls.map(url => new URL(url).pathname), workerInstances: workerUrls.length, pageErrors, consoleErrors };
  await writeFile(new URL('./runtime-validation.json', import.meta.url), JSON.stringify(evidence, null, 2) + '\n');
  console.log(`${checks.length} real-browser checks passed; no pageerror or console error.`);
} catch (error) { console.error(error); throw error; } finally {
  clearTimeout(timeout);
  console.log('Closing Chromium');
  await browser?.close();
  console.log('Closing fixture server');
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
}
