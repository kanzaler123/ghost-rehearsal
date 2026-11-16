import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { MESSAGES } from '../../../src/i18n/messages';
import { selectPacking } from '../../../e2e/ui/studio';
import { dataSourceText } from '../../../src/components/data-sources/text';

// Captures matching review states for the before/after comparison of the UI redesign.
// Every state is reached through user-level steps on the bundled two-plan example.
// A state that cannot be reached is logged in the sidecar file instead of stopping the run.

const phase = process.env.CAPTURE ?? 'before';
const commit = phase === 'before' ? 'f8371999e64d25c250699e5cd96f85eabb79bb32' : (() => { try { return execSync('git rev-parse HEAD').toString().trim(); } catch { return null; } })();

test('capture review states', async ({ page }, info) => {
  const lang = info.project.name.endsWith('zh') ? 'zh' : 'en';
  const t = MESSAGES[lang];
  const d = dataSourceText(lang);
  const { width, height } = page.viewportSize()!;
  const narrow = width <= 980;
  const secondary = (width === 1440 && lang === 'en') || (width === 390 && lang === 'zh');
  const dir = `docs/reviews/ui-creative-redesign/${phase}`;
  await mkdir(dir, { recursive: true });
  const errors: string[] = [];
  const workers = new Set<string>();
  let projectDigest: string | null = null;
  page.on('request', request => { if (/\/worker-[^/]*\.js/.test(request.url())) workers.add(request.url()); });
  page.on('dialog', dialog => dialog.accept());
  page.on('pageerror', error => errors.push(String(error)));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  const log: Record<string, unknown>[] = [];
  const shot = async (state: string, extra: Record<string, unknown> = {}) => {
    await page.waitForTimeout(350);
    const file = `${state}-${width}x${height}-${lang}`;
    const storedProject = await page.evaluate(() => localStorage.getItem('ghost-rehearsal.draft.v1') ?? localStorage.getItem('ghost-rehearsal.project.v1'));
    const currentProjectDigest = storedProject ? createHash('sha256').update(storedProject).digest('hex') : null;
    await page.screenshot({ path: `${dir}/${file}.png` });
    const entry = { state, file: `${file}.png`, commit, phase, viewport: { width, height }, lang,
      capturedAt: new Date().toISOString(), timezone: 'Asia/Singapore',
      replayTime: null, statisticsBasis: null, waitingRule: null, followedGuest: null, projectDigest: currentProjectDigest ?? projectDigest,
      nullReason: 'No project or result in this state; otherwise the field is not applicable.',
      canvasZoom: await page.locator('.react-flow__viewport').evaluateAll(nodes => nodes.map(node => getComputedStyle(node).transform)),
      workerURLs: [...workers], errors: [...errors], ...extra };
    log.push(entry);
    await writeFile(`${dir}/${file}.json`, JSON.stringify(entry, null, 2));
  };
  const attempt = async (state: string, steps: () => Promise<void>) => {
    try { await steps(); }
    catch (error) {
      log.push({ state, unreachable: String(error).split('\n')[0] });
      console.log(`[capture] ${state} unreachable: ${String(error).split('\n')[0]}`);
    }
  };
  const pause = async () => {
    const mobile = page.locator('.mobile-compare-nav');
    if (await mobile.isVisible()) await mobile.getByRole('button', { name: t.workspace.canvas, exact: true }).click();
    const button = page.getByRole('button', { name: t.dock.pause, exact: true });
    if (await button.isVisible().catch(() => false)) await button.click();
  };
  const openNav = async (p: Page) => {
    const collapse = p.locator('.side-collapse');
    if (await collapse.isVisible().catch(() => false) && !(await p.getByRole('button', { name: t.guide.start, exact: true }).isVisible().catch(() => false))) await collapse.click();
  };
  const more = () => page.locator('.workspace-menu > summary').click();
  const closeDialog = () => page.getByRole('dialog').last().getByRole('button', { name: t.common.closeDialog, exact: true }).click();

  await page.addInitScript(value => localStorage.setItem('ghost-rehearsal.lang', value), lang);
  await page.goto('./');
  await attempt('welcome', async () => {
    await expect(page.getByRole('dialog')).toBeVisible();
    await shot('welcome');
  });
  await page.getByRole('dialog').getByRole('button', { name: t.eventSetup.demo, exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await more();
  await page.getByRole('button', { name: t.header.export, exact: true }).click();
  const downloaded = page.waitForEvent('download');
  await page.locator('.option-card').filter({ hasText: t.dialogs.exportProject }).click();
  const download = await downloaded;
  projectDigest = createHash('sha256').update(await readFile((await download.path())!)).digest('hex');
  await attempt('build', async () => { await page.waitForTimeout(700); await shot('build'); });
  await attempt('build-inspector', async () => {
    await selectPacking(page, t);
    await shot('build-inspector');
    await page.getByRole('button', { name: t.inspector.collapse, exact: true }).click();
  });
  if (secondary) {
    await attempt('event-settings', async () => {
      await openNav(page);
      await page.locator('.side-link').filter({ hasText: t.sidebar.guests }).click();
      await shot('event-settings');
      await attempt('arrival-import-error', async () => {
        await page.getByRole('dialog').locator('summary').filter({ hasText: d.arrival }).first().click();
        const editor = page.getByRole('region', { name: d.arrival, exact: true }).first();
        await editor.getByLabel(d.file, { exact: true }).setInputFiles('tests/fixtures/data-sources/invalid-arrivals.csv');
        await editor.locator('label').filter({ hasText: d.unit }).locator('select').selectOption('seconds');
        await editor.getByRole('button', { name: d.preview, exact: true }).click();
        await shot('arrival-import-error');
      });
      await closeDialog();
    });
    await attempt('staff-devices', async () => { await page.locator('.side-link').filter({ hasText: t.sidebar.resources }).click(); await shot('staff-devices'); await closeDialog(); });
    await attempt('templates', async () => { await page.getByRole('button', { name: t.templates.browse, exact: false }).click(); await shot('templates'); await closeDialog(); });
  }
  await attempt('rehearse-playing', async () => {
    await page.getByRole('tab', { name: t.modes.Rehearse, exact: true }).click();
    await expect(page.getByRole('slider', { name: t.dock.timeline, exact: true })).toBeEnabled({ timeout: 30_000 });
    await page.waitForTimeout(2500);
    await shot('rehearse-playing');
  });
  await attempt('rehearse-tracked', async () => {
    await pause();
    await page.getByRole('slider', { name: t.dock.timeline, exact: true }).fill('210');
    await page.getByRole('tab', { name: t.dock.tabs.journey, exact: true }).click();
    await page.locator('.ghost-stories input[type=search]').fill('side-stream:10');
    await page.locator('.people-list .people-result').filter({ has: page.locator('b').filter({ hasText: /#10$/ }) }).click();
    await shot('rehearse-tracked', { replayTime: 210, statisticsBasis: 'cutoff', followedGuest: 'side-stream:10' });
  });
  await attempt('rehearse-end', async () => { const slider = page.getByRole('slider', { name: t.dock.timeline, exact: true }); const end = Number(await slider.getAttribute('max')); await slider.fill(String(end)); await shot('rehearse-end', { replayTime: end, statisticsBasis: 'cutoff' }); });
  await attempt('compare-overview', async () => {
    await page.getByRole('tab', { name: t.modes.Build, exact: true }).click();
    await openNav(page);
    await page.getByRole('button', { name: t.guide.start, exact: true }).click();
    await expect(page.locator('.people-stats b')).toHaveText(['12', '9', '279'], { timeout: 60_000 });
    await pause();
    await page.getByRole('slider', { name: t.dock.timeline, exact: true }).fill('210');
    if (narrow) await page.locator('.mobile-compare-nav').getByRole('button', { name: t.workspace.report, exact: true }).click();
    await shot('compare-overview', { replayTime: 210, statisticsBasis: 'cutoff', waitingRule: 60 });
  });
  await attempt('journey-divergence', async () => {
    const guide = page.getByRole('region', { name: t.guide.title, exact: true });
    await guide.getByRole('button', { name: t.guide.actions[0], exact: true }).click();
    await guide.getByRole('button', { name: t.guide.actions[1], exact: true }).click();
    await expect(page.locator('.diff-note')).toContainText('03:30');
    await shot('journey-divergence', { replayTime: 210, statisticsBasis: 'cutoff', waitingRule: 60, followedGuest: 'side-stream:10' });
  });
  await attempt('guide-bc', async () => {
    const guide = page.getByRole('region', { name: t.guide.title, exact: true });
    await guide.getByRole('button', { name: t.guide.actions[2], exact: true }).click();
    await guide.getByRole('button', { name: t.guide.actions[3], exact: true }).click();
    await expect(guide.getByRole('button', { name: t.guide.actions[4], exact: true })).toBeEnabled({ timeout: 60_000 });
    await pause(); await page.getByRole('slider', { name: t.dock.timeline, exact: true }).fill('210');
    if (narrow) await page.locator('.mobile-compare-nav').getByRole('button', { name: t.workspace.report, exact: true }).click();
    else await page.locator('.comparison-focus').getByRole('button', { name: t.workspace.overview, exact: true }).click();
    await shot('guide-bc', { replayTime: 210, statisticsBasis: 'cutoff', waitingRule: 60 });
  });
  if (secondary) {
  await attempt('export', async () => { await more(); await page.getByRole('button', { name: t.header.export, exact: true }).click(); await shot('export'); await closeDialog(); });
  await attempt('robustness', async () => { await page.locator('.robustness-trigger').click(); await shot('robustness'); await closeDialog(); });
  await attempt('compare-stale', async () => { await more(); await page.getByRole('combobox', { name: t.run.scope, exact: true }).selectOption('cutoff'); await page.keyboard.press('Escape'); await shot('compare-stale', { replayTime: 210, statisticsBasis: 'cutoff', waitingRule: 60 }); });
  await attempt('computing', async () => {
    await page.route(/worker-[^/]*\.js/, async route => { await new Promise(resolve => setTimeout(resolve, 6000)); await route.continue().catch(() => undefined); });
    await page.getByRole('tab', { name: t.modes.Build, exact: true }).click();
    await page.getByRole('button', { name: t.run.start, exact: true }).first().click();
    await page.waitForTimeout(400);
    await shot('computing');
    await page.getByRole('button', { name: t.run.stop, exact: true }).first().click();
    await expect(page.locator('.run-state-card.state-stopped').first()).toBeVisible();
    await shot('run-stopped');
    await page.unroute(/worker-[^/]*\.js/);
  });
  await attempt('run-failed', async () => {
    await page.route(/worker-[^/]*\.js/, route => route.abort());
    await page.getByRole('tab', { name: t.modes.Build, exact: true }).click().catch(() => undefined);
    await page.getByRole('button', { name: t.run.start, exact: true }).first().click();
    await page.waitForTimeout(1500);
    await shot('run-failed');
    await page.unroute(/worker-[^/]*\.js/);
  });
  await attempt('invalid-import', async () => { await more(); const picker = page.waitForEvent('filechooser'); await page.getByRole('button', { name: t.header.import, exact: true }).click(); await (await picker).setFiles('docs/reviews/ui-creative-redesign/invalid-project.json'); await expect(page.getByRole('dialog', { name: t.stage.checksTitle })).toBeVisible(); await shot('invalid-import'); await closeDialog(); });
  await attempt('empty-canvas', async () => { await page.getByRole('tab', { name: t.modes.Build, exact: true }).click(); await openNav(page); await page.locator('.event-picker summary').click(); await page.getByRole('button', { name: t.eventSetup.new, exact: true }).click(); await page.getByRole('textbox', { name: t.dialogs.eventName, exact: true }).fill('Empty rehearsal'); await page.getByRole('button', { name: t.eventSetup.create, exact: true }).click(); await shot('empty-canvas'); });
  }
  await writeFile(`${dir}/_log-${width}x${height}-${lang}.json`, JSON.stringify(log, null, 2));
  if (phase !== 'before') expect(log.filter(entry => 'unreachable' in entry)).toEqual([]);
  void narrow;
});
