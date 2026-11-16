import { chromium } from 'playwright';
import { readFile, writeFile, mkdir, readdir, stat, rename } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { gzipSync } from 'node:zlib';
import { MESSAGES } from '../../../src/i18n/messages.ts';

const phase = process.env.AUDIT_PHASE ?? 'after';
const url = process.env.AUDIT_URL ?? 'http://127.0.0.1:4193/ghost-rehearsal/';
const dist = process.env.AUDIT_DIST ?? 'dist';
const directory = 'docs/reviews/ui-creative-redesign';
const t = MESSAGES.en;
const browser = await chromium.launch();
const report = { phase, time: new Date().toISOString(), commit: phase === 'before' ? 'f8371999e64d25c250699e5cd96f85eabb79bb32' : execFileSync('git', ['rev-parse', 'HEAD']).toString().trim(), browser: browser.version(), node: process.version, url, cases: [], errors: [] };
await mkdir(`${directory}/recordings`, { recursive: true });

async function open({ video, lang = 'en', viewport = { width: 1440, height: 900 }, reducedMotion = 'no-preference' } = {}) {
  const context = await browser.newContext({ viewport, reducedMotion, ...(video ? { recordVideo: { dir: `${directory}/recordings`, size: viewport } } : {}) });
  const page = await context.newPage();
  page.on('pageerror', error => report.errors.push(error.message));
  page.on('dialog', dialog => dialog.accept());
  await page.addInitScript(lang => localStorage.setItem('ghost-rehearsal.lang', lang), lang);
  await page.goto(url);
  await page.evaluate(() => document.fonts.ready);
  await page.getByRole('dialog').getByRole('button', { name: MESSAGES[lang].eventSetup.demo, exact: true }).click();
  return { context, page };
}
async function close({ context, page }, video) {
  const recording = page.video();
  await context.close();
  if (recording && video) {
    const path = `${directory}/recordings/${phase}-${video}.webm`;
    await rename(await recording.path(), path);
    report.cases.push({ recording: path, bytes: (await stat(path)).size });
  }
}
async function scope(page, value) {
  const select = page.getByRole('combobox', { name: t.run.scope, exact: true });
  if (!await select.isVisible()) await page.locator('.workspace-menu > summary').click();
  await select.selectOption(value);
  await page.keyboard.press('Escape');
}
async function pause(page, labels = t) {
  const control = page.getByRole('button', { name: labels.dock.pause, exact: true });
  if (await control.isVisible()) await control.click();
}
async function sample(page, name, speed) {
  await pause(page);
  await page.getByLabel(t.dock.timeline, { exact: true }).fill('0');
  await page.getByRole('combobox', { name: t.dock.speed, exact: true }).selectOption(String(speed));
  const metrics = await page.evaluate(async labels => {
    const frames = [], tasks = [];
    const observer = new PerformanceObserver(list => tasks.push(...list.getEntries().map(entry => entry.duration)));
    observer.observe({ type: 'longtask' });
    const button = document.querySelector('.play-btn');
    const start = performance.now(); let last = start;
    button.click();
    await new Promise(resolve => {
      const tick = now => {
        frames.push(now - last); last = now;
        if (now - start >= 10_000 || (now - start > 300 && button.getAttribute('aria-label') === labels.play)) resolve();
        else requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    observer.disconnect();
    frames.sort((a, b) => a - b);
    return { milliseconds: performance.now() - start, frames: frames.length, p95: frames[Math.ceil(frames.length * .95) - 1], largestFrame: frames.at(-1), longestTask: Math.max(0, ...tasks) };
  }, t.dock);
  report.cases.push({ name, speed, ...metrics });
  await pause(page);
}

async function gesture(page, name, action) {
  await page.evaluate(() => {
    window.auditFrames = []; window.auditFrameStop = false;
    let last = performance.now();
    const tick = now => { window.auditFrames.push(now - last); last = now; if (!window.auditFrameStop) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  });
  await action();
  const metrics = await page.evaluate(() => {
    window.auditFrameStop = true;
    const frames = window.auditFrames.sort((a, b) => a - b);
    return { frames: frames.length, p95: frames[Math.ceil(frames.length * .95) - 1], largestFrame: frames.at(-1) };
  });
  report.cases.push({ name, ...metrics });
}

async function drag(page, x, y, dx, dy) {
  await page.mouse.move(x, y); await page.mouse.down();
  for (let i = 1; i <= 24; i++) { await page.mouse.move(x + dx * i / 24, y + dy * i / 24); await page.waitForTimeout(90); }
  await page.mouse.up();
}

try {
  const runVideo = await open({ video: true });
  await runVideo.page.getByRole('tab', { name: t.modes.Rehearse, exact: true }).click();
  await runVideo.page.getByLabel(t.dock.timeline, { exact: true }).waitFor();
  await pause(runVideo.page); await runVideo.page.waitForTimeout(700);
  await close(runVideo, 'run');
  const edit = await open({ video: true });
  const nodeIds = await edit.page.locator('.react-flow__node').evaluateAll(nodes => nodes.map(node => node.dataset.id));
  await edit.page.locator('.canvas-tools').getByRole('button', { name: t.sidebar.addNode, exact: true }).click();
  await edit.page.locator('.canvas-node-choices button').filter({ hasText: t.nodeTypes.merge }).click();
  const mergeId = (await edit.page.locator('.react-flow__node').evaluateAll(nodes => nodes.map(node => node.dataset.id))).find(id => !nodeIds.includes(id));
  const merge = edit.page.locator(`.react-flow__node[data-id="${mergeId}"]`);
  const bounds = await merge.boundingBox();
  await gesture(edit.page, 'drag-node-400px', () => drag(edit.page, bounds.x + bounds.width / 2, bounds.y + 35, -400, 0));
  const withMerge = await edit.page.locator('.react-flow__node').evaluateAll(nodes => nodes.map(node => node.dataset.id));
  await edit.page.locator('.canvas-tools').getByRole('button', { name: t.sidebar.addNode, exact: true }).click();
  await edit.page.locator('.canvas-node-choices button').filter({ hasText: t.nodeTypes.exit }).click();
  const exitId = (await edit.page.locator('.react-flow__node').evaluateAll(nodes => nodes.map(node => node.dataset.id))).find(id => !withMerge.includes(id));
  const exitNode = edit.page.locator(`.react-flow__node[data-id="${exitId}"]`);
  await merge.locator('.react-flow__handle.source').dragTo(exitNode.locator('.react-flow__handle.target'));
  const exitBounds = await exitNode.boundingBox();
  await drag(edit.page, exitBounds.x + exitBounds.width / 2, exitBounds.y + 35, 0, 80);
  await edit.page.getByRole('button', { name: t.header.undo, exact: true }).click();
  await edit.page.getByRole('button', { name: t.canvas.pan, exact: true }).click();
  const canvas = await edit.page.locator('.canvas-shell').boundingBox();
  await gesture(edit.page, 'pan-400px', () => drag(edit.page, canvas.x + canvas.width - 50, canvas.y + canvas.height - 80, -400, 0));
  await edit.page.mouse.move(canvas.x + canvas.width / 2, canvas.y + canvas.height / 2);
  for (let i = 0; i < 20; i++) await edit.page.mouse.wheel(0, 150);
  await edit.page.waitForTimeout(400);
  const zoomStart = await edit.page.locator('.canvas-zoom').textContent();
  await gesture(edit.page, 'zoom-in', async () => { for (let i = 0; i < 30; i++) { await edit.page.mouse.wheel(0, -150); await edit.page.waitForTimeout(80); } });
  report.cases.push({ name: 'zoom-endpoints', start: zoomStart, end: await edit.page.locator('.canvas-zoom').textContent() });
  await close(edit, 'edit');
  const run = await open({ video: true });
  await scope(run.page, 'run_to_completion');
  await run.page.getByRole('tab', { name: t.modes.Rehearse, exact: true }).click();
  await run.page.getByLabel(t.dock.timeline, { exact: true }).waitFor();
  await sample(run.page, 'rehearse', 1);
  await run.page.getByLabel(t.dock.timeline, { exact: true }).fill('210');
  await run.page.waitForTimeout(700);
  await close(run, 'replay');
  for (const mode of ['rehearse', 'compare']) {
    const state = await open();
    if (mode === 'compare') {
      await state.page.getByRole('button', { name: t.guide.start, exact: true }).click();
      await state.page.locator('.people-stats b').first().waitFor();
    } else {
      await scope(state.page, 'run_to_completion');
      await state.page.getByRole('tab', { name: t.modes.Rehearse, exact: true }).click();
      await state.page.getByLabel(t.dock.timeline, { exact: true }).waitFor();
    }
    if (mode === 'compare') await sample(state.page, mode, 1);
    await sample(state.page, mode, 8);
    await close(state);
  }
  for (const mobile of phase === 'after' ? [false, true] : [false]) {
    const lang = mobile ? 'zh' : 'en', labels = MESSAGES[lang];
    const state = await open({ video: true, lang, viewport: mobile ? { width: 390, height: 844 } : undefined });
    if (!await state.page.getByRole('button', { name: labels.guide.start, exact: true }).isVisible()) await state.page.locator('.side-collapse').click();
    await state.page.getByRole('button', { name: labels.guide.start, exact: true }).click();
    const guide = state.page.getByRole('region', { name: labels.guide.title, exact: true });
    await guide.getByRole('button', { name: labels.guide.actions[0], exact: true }).click();
    await guide.getByRole('button', { name: labels.guide.actions[1], exact: true }).click();
    await state.page.waitForTimeout(1500);
    await close(state, mobile ? 'follow-and-diverge-mobile-zh' : 'follow-and-diverge');
  }
  const probe = await open();
  const project = JSON.parse(await readFile('examples/open-house.json', 'utf8'));
  project.scenarios[0].arrivalStreams[0].count = 10000 - project.scenarios[0].arrivalStreams[1].buckets.reduce((total, bucket) => total + bucket.count, 0);
  await probe.page.locator('input[type=file]').first().setInputFiles({ name: 'population-probe.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(project)) });
  await scope(probe.page, 'cutoff');
  const started = Date.now();
  await probe.page.getByRole('tab', { name: t.modes.Rehearse, exact: true }).click();
  await probe.page.getByLabel(t.dock.timeline, { exact: true }).waitFor({ timeout: 120_000 });
  report.cases.push({ name: '10000-guest-run', milliseconds: Date.now() - started, measurement: 'UI request-to-result wall time; includes Worker simulation and rendering. Probe, not certification.', notice: await probe.page.locator('.status-notice').textContent() });
  await sample(probe.page, '10000-guest-rehearse', 1);
  await close(probe);
  if (phase === 'after') {
    const state = await open({ video: true, reducedMotion: 'reduce' });
    await state.page.getByRole('tab', { name: t.modes.Rehearse, exact: true }).click();
    await state.page.getByLabel(t.dock.timeline, { exact: true }).waitFor();
    await sample(state.page, 'reduced-motion-rehearse', 1);
    await state.page.getByLabel(t.dock.timeline, { exact: true }).fill('210');
    await close(state, 'reduced-motion-replay');
  }
  const files = await readdir(dist, { recursive: true });
  let total = 0, javascriptGzip = 0, cssGzip = 0, binary = 0;
  for (const file of files) {
    const path = `${dist}/${file}`; if (!(await stat(path)).isFile()) continue;
    const bytes = await readFile(path); total += bytes.length;
    if (file.endsWith('.js')) javascriptGzip += gzipSync(bytes).length;
    else if (file.endsWith('.css')) cssGzip += gzipSync(bytes).length;
    else if (/\.(woff2?|png|jpe?g|svg|webm|mp3|glb)$/.test(file)) binary += bytes.length;
  }
  report.bundle = { total, javascriptGzip, cssGzip, binary, measurement: 'Conservative total of every built chunk, not just first-load requests' };
} catch (error) {
  report.errors.push(String(error)); process.exitCode = 1;
} finally {
  await browser.close();
  await writeFile(`${directory}/${phase}-production-audit.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}
