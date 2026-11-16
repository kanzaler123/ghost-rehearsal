import { chromium, webkit } from 'playwright';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { cpus, platform, release, totalmem } from 'node:os';
import { MESSAGES } from '../../../src/i18n/messages.ts';

const [phase = 'before', url = 'http://127.0.0.1:4197/ghost-rehearsal/', dist = '.s1-evidence/baseline-dist'] = process.argv.slice(2);
const source = 'f075c9cb513b7e7a3cf81095611cb25027b0ccb8:diagnostics/natural-state/original-fixture.json';
const fixture = execFileSync('git', ['show', source]);
const t = MESSAGES.en;
const report = { phase, source, fixtureSha256: createHash('sha256').update(fixture).digest('hex'), projectBytes: fixture.length, at: new Date().toISOString(), head: execFileSync('git', ['rev-parse', 'HEAD']).toString().trim(), host: { platform: platform(), release: release(), cpu: cpus()[0].model, logicalCpus: cpus().length, ramBytes: totalmem(), node: process.version }, cases: [] };
await mkdir('.s1-evidence', { recursive: true });
for (const [name, engine] of [['chromium', chromium], ['webkit', webkit]]) {
  const browser = await engine.launch();
  try {
    for (let repeat = 0; repeat < Number(process.env.MEASURE_REPEATS ?? 3); repeat++) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
      const page = await context.newPage();
      page.setDefaultTimeout(30_000);
      const row = { engine: name, version: browser.version(), repeat, errors: [], heap: {}, frames: null };
      report.cases.push(row);
      page.on('pageerror', error => row.errors.push(error.message));
      page.on('dialog', dialog => dialog.accept());
      await page.addInitScript(() => {
        localStorage.setItem('ghost-rehearsal.lang', 'en');
        const NativeWorker = window.Worker;
        window.Worker = class extends NativeWorker {
          constructor(...args) {
            super(...args);
            this.addEventListener('message', event => {
              if (event.data?.runs) {
                window.measuredRun = { bytes: new TextEncoder().encode(JSON.stringify(event.data.runs)).length, events: event.data.runs.reduce((sum, run) => sum + run.events.length, 0) };
                window.measuredRunRef = new WeakRef(event.data.runs[0]);
                event.data.runs[0].__s1MemoryMarker = 'S1-run';
              }
            });
          }
        };
      });
      const cdp = name === 'chromium' ? await context.newCDPSession(page) : null;
      async function heap(label) {
        if (!cdp) return;
        await cdp.send('HeapProfiler.collectGarbage');
        row.heap[label] = await cdp.send('Runtime.getHeapUsage');
      }
      try {
        await page.goto(url);
        await page.getByRole('dialog').waitFor();
        row.welcomeNetwork = await page.evaluate(() => performance.getEntriesByType('resource').map(item => ({ name: item.name, transferSize: item.transferSize, encodedBodySize: item.encodedBodySize, decodedBodySize: item.decodedBodySize })));
        row.loadedJavaScriptGzipBytes = 0;
        row.bundles = [];
        for (const resource of row.welcomeNetwork.filter(item => item.name.endsWith('.js'))) {
          const bytes = await readFile(`${dist}/assets/${new URL(resource.name).pathname.split('/').at(-1)}`);
          row.loadedJavaScriptGzipBytes += gzipSync(bytes).length;
          row.bundles.push({ name: resource.name, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
        }
        await heap('welcome');
        await page.locator('input[type=file]').first().setInputFiles({ name: 'dense.json', mimeType: 'application/json', buffer: fixture });
        await page.getByRole('dialog').waitFor({ state: 'hidden' });
        await page.getByRole('tab', { name: t.modes.Rehearse, exact: true }).click();
        const timeline = page.getByRole('slider', { name: t.dock.timeline, exact: true });
        await timeline.waitFor();
        await heap('result');
        row.result = await page.evaluate(() => window.measuredRun);
        await timeline.fill('150');
        await page.evaluate(() => {
          window.frameTimes = []; window.frameStop = false;
          let last = performance.now();
          const frame = now => { window.frameTimes.push(now - last); last = now; if (!window.frameStop) requestAnimationFrame(frame); };
          requestAnimationFrame(frame);
        });
        await page.locator('.play-btn').click();
        await page.waitForTimeout(4000);
        const start = performance.now();
        await page.locator('.play-btn').click();
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        row.pauseToTwoFramesMs = performance.now() - start;
        row.frames = await page.evaluate(() => { window.frameStop = true; const frames = window.frameTimes.sort((a, b) => a - b); return { count: frames.length, p95: frames[Math.ceil(frames.length * .95) - 1], max: frames.at(-1) }; });
        await timeline.fill('1800');
        await heap('end');
        await page.getByRole('tab', { name: t.modes.Build, exact: true }).click();
        const replacement = JSON.parse(fixture); replacement.plans = [replacement.plans[0]]; replacement.plans[0].graph.nodes = []; replacement.plans[0].graph.edges = [];
        await page.locator('input[type=file]').first().setInputFiles({ name: 'empty.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(replacement)) });
        await page.locator('.canvas-empty').waitFor();
        await page.waitForTimeout(1000);
        await heap('replaced');
        row.resultStillReachable = await page.evaluate(() => !!window.measuredRunRef.deref());
        if (cdp && process.env.MEMORY_SNAPSHOT && repeat === 0) {
          const chunks = [];
          cdp.on('HeapProfiler.addHeapSnapshotChunk', event => chunks.push(event.chunk));
          await cdp.send('HeapProfiler.takeHeapSnapshot');
          await writeFile(`.s1-evidence/${phase}.heapsnapshot`, chunks.join(''));
        }
      } catch (error) { row.failure = String(error); }
      await context.close();
      await writeFile(`.s1-evidence/${phase}.json`, JSON.stringify(report, null, 2));
      console.log(name, repeat, row.failure ?? JSON.stringify({ frames: row.frames, heap: row.heap, result: row.result }));
    }
  } finally { await browser.close(); }
}
if (report.cases.some(row => row.failure || row.errors.length)) process.exitCode = 1;
