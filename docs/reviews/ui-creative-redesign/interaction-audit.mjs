import { chromium } from 'playwright';
import { readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { MESSAGES } from '../../../src/i18n/messages.ts';

const browser = await chromium.launch();
const t = MESSAGES.en;
const report = { time: new Date().toISOString(), commit: execFileSync('git', ['rev-parse', 'HEAD']).toString().trim(), browser: browser.version(), probes: [], interactions: [], errors: [] };
async function open(port) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('pageerror', error => report.errors.push(error.message));
  await page.addInitScript(() => {
    window.auditWorker = [];
    const OriginalWorker = window.Worker;
    window.Worker = class extends OriginalWorker {
      postMessage(message, ...options) {
        const started = performance.now();
        this.addEventListener('message', event => window.auditWorker.push({ milliseconds: performance.now() - started, succeeded: Array.isArray(event.data.runs), guests: event.data.runs?.[0]?.population.length }), { once: true });
        super.postMessage(message, ...options);
      }
    };
    window.auditEvents = [];
    if (PerformanceObserver.supportedEntryTypes.includes('event')) new PerformanceObserver(list => {
      window.auditEvents.push(...list.getEntries().filter(entry => entry.interactionId).map(entry => ({ name: entry.name, duration: entry.duration, interactionId: entry.interactionId })));
    }).observe({ type: 'event', durationThreshold: 16 });
  });
  await page.goto(`http://127.0.0.1:${port}/ghost-rehearsal/`);
  await page.getByRole('dialog').getByRole('button', { name: t.eventSetup.demo, exact: true }).click();
  return page;
}
async function pause(page) {
  const button = page.getByRole('button', { name: t.dock.pause, exact: true });
  if (await button.isVisible()) await button.click();
}
async function interaction(page, action, run) {
  await page.evaluate(() => { window.auditEvents = []; });
  await run();
  await page.waitForTimeout(250);
  const events = await page.evaluate(() => window.auditEvents);
  report.interactions.push({ action, events, durationUpperBound: Math.max(16, ...events.map(event => event.duration)), note: events.length ? 'Event Timing, 8 ms quantization' : 'No event at the supported 16 ms reporting threshold' });
}
try {
  for (const phase of ['before', 'after']) {
    const page = await open(phase === 'before' ? 4192 : 4193);
    const project = JSON.parse(await readFile('examples/open-house.json', 'utf8'));
    project.scenarios[0].arrivalStreams[0].count = 10000 - project.scenarios[0].arrivalStreams[1].buckets.reduce((sum, bucket) => sum + bucket.count, 0);
    await page.locator('input[type=file]').first().setInputFiles({ name: '10000-guests.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(project)) });
    const scope = page.getByRole('combobox', { name: t.run.scope, exact: true });
    if (!await scope.isVisible()) await page.locator('.workspace-menu > summary').click();
    await scope.selectOption('cutoff');
    await page.keyboard.press('Escape');
    await page.getByRole('tab', { name: t.modes.Rehearse, exact: true }).click();
    await page.getByLabel(t.dock.timeline, { exact: true }).waitFor();
    await pause(page);
    await page.getByLabel(t.dock.timeline, { exact: true }).fill('0');
    const playback = await page.evaluate(async () => {
      const frames = [], tasks = [];
      const observer = new PerformanceObserver(list => tasks.push(...list.getEntries().map(entry => entry.duration)));
      observer.observe({ type: 'longtask' });
      const started = performance.now(); let previous = started;
      document.querySelector('.play-btn').click();
      await new Promise(resolve => requestAnimationFrame(function tick(now) {
        frames.push(now - previous); previous = now;
        if (now - started >= 10000) resolve(); else requestAnimationFrame(tick);
      }));
      observer.disconnect(); frames.sort((a, b) => a - b);
      return { frames: frames.length, p95: frames[Math.ceil(frames.length * .95) - 1], maximum: frames.at(-1), longestTask: Math.max(0, ...tasks), worker: window.auditWorker };
    });
    report.probes.push({ phase, ...playback, measurement: 'Worker postMessage to message callback, includes message transfer and Worker startup; excludes subsequent React rendering. Probe only, not performance certification.' });
    await page.close();
  }
  const page = await open(4193);
  await page.getByRole('tab', { name: t.modes.Rehearse, exact: true }).click();
  await page.getByLabel(t.dock.timeline, { exact: true }).waitFor();
  await pause(page);
  await interaction(page, 'play', () => page.locator('.play-btn').click());
  await interaction(page, 'pause', () => page.getByRole('button', { name: t.dock.pause, exact: true }).click());
  await interaction(page, 'scrubber pointer seek', () => page.getByLabel(t.dock.timeline, { exact: true }).click());
  await page.getByLabel(t.dock.timeline, { exact: true }).fill('210');
  await interaction(page, 'guest glyph selection', () => page.locator('.ghost-line button').first().click());
  await interaction(page, 'switch to Build', () => page.getByRole('tab', { name: t.modes.Build, exact: true }).click());
  await interaction(page, 'switch to Rehearse', () => page.getByRole('tab', { name: t.modes.Rehearse, exact: true }).click());
  await page.locator('.workspace-menu > summary').click();
  await interaction(page, 'open export', () => page.getByRole('button', { name: t.header.export, exact: true }).click());
  report.eventTimingSupported = await page.evaluate(() => PerformanceObserver.supportedEntryTypes.includes('event'));
} catch (error) {
  report.errors.push(String(error)); process.exitCode = 1;
} finally {
  await browser.close();
  await writeFile('docs/reviews/ui-creative-redesign/interaction-audit.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}
