import { expect, test } from '@playwright/test';
import { MESSAGES } from '../../src/i18n/messages';
import { readFileSync } from 'node:fs';
import type { ProjectDocument } from '../../src/schemas';

test.use({ hasTouch: true });
let errors: string[];
test.beforeEach(({ page }) => {
  errors = [];
  page.on('pageerror', error => errors.push(error.message));
});
test.afterEach(() => expect(errors).toEqual([]));

test('first launch exposes example, blank setup and import without changing saved projects', async ({ page }, info) => {
  const t = MESSAGES[info.project.name.endsWith('zh') ? 'zh' : 'en'];
  await page.addInitScript(lang => localStorage.setItem('ghost-rehearsal.lang', lang), t.lang);
  await page.goto('./');
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('button', { name: t.guide.start, exact: true })).toBeVisible();
  await expect(dialog.getByRole('button', { name: t.eventSetup.demo, exact: true })).toBeVisible();
  await expect(dialog.locator('input').first()).toBeVisible();
  await expect(dialog.getByRole('button', { name: t.eventSetup.import, exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: t.eventSetup.demo, exact: true }).click();
  await page.getByTitle(t.header.saveTitle, { exact: true }).click();
  const saved = await page.evaluate(() => Object.entries(localStorage).filter(([key]) => key !== 'ghost-rehearsal.lang'));
  await page.reload();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(await page.evaluate(() => Object.entries(localStorage).filter(([key]) => key !== 'ghost-rehearsal.lang'))).toEqual(saved);
});

test('welcome starts a real A/B guide by keyboard or touch without filling setup', async ({ page }, info) => {
  const t = MESSAGES[info.project.name.endsWith('zh') ? 'zh' : 'en'];
  const mobile = info.project.name.startsWith('mobile');
  if (mobile) await page.setViewportSize({ width: 320, height: 568 });
  const workers: string[] = [];
  page.on('worker', worker => workers.push(worker.url()));
  await page.addInitScript(lang => localStorage.setItem('ghost-rehearsal.lang', lang), t.lang);
  await page.goto('./');
  const dialog = page.getByRole('dialog');
  const start = dialog.getByRole('button', { name: t.guide.start, exact: true });
  await expect(start).toBeFocused();
  await expect(start).toBeInViewport({ ratio: 1 });
  await expect(start).toHaveAccessibleDescription(t.guide.welcomeHint);
  await expect(dialog.getByLabel(t.dialogs.eventName, { exact: true })).toHaveValue('');
  await expect(dialog.getByRole('button', { name: t.eventSetup.create, exact: true })).toBeDisabled();
  // The existing dialog entrance scales its descendants for 220ms. Measure the
  // settled touch target, as native pointer actionability does, without reducing motion.
  await dialog.evaluate(element => Promise.all(element.getAnimations().map(animation => animation.finished)));
  const box = await start.boundingBox();
  expect(box!.height).toBeGreaterThanOrEqual(44);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath('welcome-guide.png'), fullPage: true });
  if (mobile) await start.tap();
  else await start.press('Enter');
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('tab', { name: t.modes.Compare, exact: true })).toHaveAttribute('aria-selected', 'true');
  const guide = page.getByRole('region', { name: t.guide.title, exact: true });
  await expect(guide.getByRole('button', { name: t.guide.actions[0], exact: true })).toBeEnabled();
  await expect(page.locator('.people-stats b')).toHaveText(['12', '9', '279']);
  expect(workers.some(url => /\/assets\/worker-[^/]+\.js$/.test(url))).toBe(true);
  const project = await page.evaluate(() => JSON.parse(localStorage.getItem('ghost-rehearsal.draft.v1')!) as ProjectDocument);
  expect(project.plans).toHaveLength(3);
  expect(project.scenarios).toHaveLength(2);
  expect(project.plans.find(plan => plan.id === 'plan-1')).toMatchObject({ name: t.defaults.plan, scenarioId: 'scenario-1', graph: { nodes: [], edges: [] } });
  expect(project.scenarios.find(scenario => scenario.id === 'scenario-1')).toMatchObject({ name: t.defaults.event, seed: 42, observationCutoff: 1800, horizon: 7200 });
  await guide.getByRole('button', { name: t.guide.actions[0], exact: true }).click();
  await expect(page.locator('.ghost-id code')).toHaveText('side-stream:10');
  await page.getByTitle(t.header.saveTitle, { exact: true }).click();
  const saved = await page.evaluate(() => localStorage.getItem('ghost-rehearsal.project.v1'));
  await page.reload();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('ghost-rehearsal.project.v1'))).toBe(saved);
  const expand = page.getByRole('button', { name: t.studioUi.expandPlans, exact: true });
  if (await expand.isVisible()) await expand.click();
  await page.locator('.event-picker summary').click();
  await page.getByRole('button', { name: t.eventSetup.new, exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('button', { name: t.guide.start, exact: true })).toHaveCount(0);
  await expect(page.getByRole('dialog').getByLabel(t.dialogs.eventName, { exact: true })).toBeFocused();
});

for (const outcome of ['success', 'failure'] as const) test(`starting the welcome guide supersedes an older import ${outcome}`, async ({ page }, info) => {
  const t = MESSAGES[info.project.name.endsWith('zh') ? 'zh' : 'en'];
  await page.addInitScript(lang => localStorage.setItem('ghost-rehearsal.lang', lang), t.lang);
  await page.goto('./');
  await page.evaluate(outcome => {
    const read = File.prototype.text;
    File.prototype.text = function () {
      const file = this;
      return new Promise<string>((resolve, reject) => {
        (window as typeof window & { finishOlder: () => Promise<void> }).finishOlder = async () => {
          if (outcome === 'failure') reject(new Error('superseded file read failure'));
          else resolve(await read.call(file));
        };
      });
    };
  }, outcome);
  const older = JSON.parse(readFileSync(new URL('../../examples/open-house.json', import.meta.url), 'utf8')) as ProjectDocument;
  older.plans.forEach(plan => { plan.name = 'Older imported plan'; });
  await page.locator('input[type=file]').first().setInputFiles({ name: 'older.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(older)) });
  await page.getByRole('dialog').getByRole('button', { name: t.guide.start, exact: true }).click();
  const guide = page.getByRole('region', { name: t.guide.title, exact: true });
  await expect(guide.getByRole('button', { name: t.guide.actions[0], exact: true })).toBeEnabled();
  const before = await page.evaluate(() => localStorage.getItem('ghost-rehearsal.draft.v1'));
  await page.evaluate(() => (window as typeof window & { finishOlder: () => Promise<void> }).finishOlder());
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await expect(page.getByRole('tab', { name: t.modes.Compare, exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(guide.getByRole('button', { name: t.guide.actions[0], exact: true })).toBeEnabled();
  await expect(page.locator('.people-stats b')).toHaveText(['12', '9', '279']);
  expect(await page.evaluate(() => localStorage.getItem('ghost-rehearsal.draft.v1'))).toBe(before);
  await expect(page.locator('.status-notice')).not.toHaveText(t.notices.fileReadFailed);
  await expect(page.locator('.status-notice')).not.toHaveText(t.notices.imported);
});
