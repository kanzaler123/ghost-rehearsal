import { storedProject } from '../persistence/browser';
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

test('first launch tours six workspace regions and a saved activity can replay the opening', async ({ page }, info) => {
  const t = MESSAGES[info.project.name.endsWith('zh') ? 'zh' : 'en'];
  await page.addInitScript(lang => localStorage.setItem('ghost-rehearsal.lang', lang), t.lang);
  await page.goto('./');
  const opening = page.locator('.opening-page');
  const other = MESSAGES[t.lang === 'zh' ? 'en' : 'zh'];
  await opening.getByRole('button', { name: t.language[other.lang], exact: true }).click();
  await expect(opening.getByRole('heading', { level: 1 })).toContainText(other.redesign.highlight);
  await opening.getByRole('button', { name: t.language[t.lang], exact: true }).click();
  await expect(opening.locator('.people-stats b')).toHaveText(['9', '9', '276']);
  await expect(opening).toContainText(t.evidence.excluded(6));
  await opening.getByRole('slider').fill('655');
  await expect(opening.locator('.opening-tracked')).toContainText(t.markers.finished);
  await opening.getByRole('button', { name: t.redesign.create, exact: true }).click();
  const choice = page.getByRole('dialog', { name: t.redesign.choose });
  await expect(choice.getByRole('button', { name: t.redesign.modules, exact: true })).toBeFocused();
  await expect(choice.getByRole('button', { name: t.redesign.follow, exact: true })).toBeVisible();
  await expect(choice.getByRole('button', { name: t.redesign.setup, exact: true })).toBeVisible();
  expect(await storedProject(page, 'draft')).toBeNull();
  await choice.getByRole('button', { name: t.redesign.modules, exact: true }).press('Enter');
  const tour = page.getByRole('dialog', { name: t.tour.title });
  for (const [i, [title, description]] of t.tour.steps.entries()) {
    await expect(tour.getByRole('heading')).toHaveText(title);
    await expect(tour).toContainText(description);
    await expect(tour.locator('.spotlight-window')).toBeInViewport();
    if (i === 1 && info.project.name.startsWith('mobile')) {
      const portrait = page.viewportSize()!;
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.setViewportSize({ width: 720, height: 360 });
      await expect.poll(async () => {
        const box = await tour.locator('.spotlight-window').boundingBox();
        return !!box && box.width > 600 && box.height > 30;
      }).toBe(true);
      await page.setViewportSize(portrait);
    }
    await expect(tour.getByRole('button', { name: t.tour.skip })).toBeInViewport({ ratio: 1 });
    await tour.getByRole('button', { name: i === 5 ? t.tour.done : t.tour.next, exact: true }).click();
  }
  await expect(page.locator('.workspace-menu > summary')).toBeFocused();
  await expect(page.getByRole('tab', { name: t.modes.Build, exact: true })).toHaveAttribute('aria-selected', 'true');
  await page.getByTitle(t.header.saveTitle, { exact: true }).click();
  await expect(page.locator('.save-state')).toHaveText(t.header.saved);
  const saved = await storedProject(page, 'saved');
  expect(saved).not.toBeNull();
  await page.reload();
  await expect(page.locator('.save-state')).toHaveText(t.header.saved);
  await expect(opening).toHaveCount(0);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.locator('.workspace-menu > summary').click();
  await page.getByRole('button', { name: t.redesign.replay, exact: true }).click();
  await opening.getByRole('button', { name: t.redesign.enter, exact: true }).click();
  await expect(choice.getByRole('button', { name: t.redesign.modules, exact: true })).toHaveAccessibleDescription(t.redesign.currentHint);
  await choice.getByRole('button', { name: t.redesign.modules, exact: true }).click();
  await tour.getByRole('button', { name: t.tour.next, exact: true }).click();
  await tour.getByRole('button', { name: t.tour.previous, exact: true }).click();
  await expect(tour.getByRole('heading')).toHaveText(t.tour.steps[0][0]);
  await page.keyboard.press('Escape');
  await expect(page.locator('.workspace-menu > summary')).toBeFocused();
  await page.locator('.workspace-menu > summary').click();
  await page.getByRole('button', { name: t.tour.title, exact: true }).click();
  await tour.getByRole('button', { name: t.tour.skip, exact: true }).click();
  expect(await storedProject(page, 'saved')).toEqual(saved);
  expect(await storedProject(page, 'draft')).toEqual(saved);
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
  const start = page.getByRole('button', { name: t.redesign.begin, exact: true });
  await expect(start).toHaveAccessibleDescription(t.redesign.guideHint);
  await expect(dialog).toHaveCount(0);
  const box = await start.boundingBox();
  expect(box!.height).toBeGreaterThanOrEqual(44);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath('welcome-guide.png'), fullPage: true });
  if (mobile) {
    await page.getByRole('button', { name: t.redesign.enter, exact: true }).tap();
    await dialog.getByRole('button', { name: t.redesign.follow, exact: true }).tap();
  }
  else await start.press('Enter');
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('tab', { name: t.modes.Compare, exact: true })).toHaveAttribute('aria-selected', 'true');
  const guide = page.getByRole('region', { name: t.guide.title, exact: true });
  await expect(guide.getByRole('button', { name: t.guide.actions[0], exact: true })).toBeEnabled();
  await expect(page.locator('.people-stats b')).toHaveText(['9', '9', '276']);
  expect(workers.some(url => /\/assets\/worker-[^/]+\.js$/.test(url))).toBe(true);
  await expect.poll(() => storedProject(page, 'draft')).not.toBeNull();
  const project = JSON.parse((await storedProject(page, 'draft'))!) as ProjectDocument;
  expect(project.plans).toHaveLength(3);
  expect(project.scenarios).toHaveLength(2);
  expect(project.plans.find(plan => plan.id === 'plan-1')).toMatchObject({ name: t.defaults.plan, scenarioId: 'scenario-1', graph: { nodes: [], edges: [] } });
  expect(project.scenarios.find(scenario => scenario.id === 'scenario-1')).toMatchObject({ name: t.defaults.event, seed: 42, observationCutoff: 1800, horizon: 7200 });
  await guide.getByRole('button', { name: t.guide.actions[0], exact: true }).click();
  await expect(page.locator('.ghost-id code')).toHaveText('side-stream:10');
  await page.getByTitle(t.header.saveTitle, { exact: true }).click();
  await expect(page.locator('.save-state')).toHaveText(t.header.saved);
  const saved = await storedProject(page, 'saved');
  expect(saved).not.toBeNull();
  await page.reload();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(await storedProject(page, 'saved')).toBe(saved);
  const expand = page.getByRole('button', { name: t.studioUi.expandPlans, exact: true });
  if (await expand.isVisible()) await expand.click();
  await page.locator('.event-picker summary').click();
  await page.getByRole('button', { name: t.eventSetup.new, exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('button', { name: t.redesign.begin, exact: true })).toHaveCount(0);
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
  await page.getByRole('button', { name: t.redesign.begin, exact: true }).click();
  const guide = page.getByRole('region', { name: t.guide.title, exact: true });
  await expect(guide.getByRole('button', { name: t.guide.actions[0], exact: true })).toBeEnabled();
  await expect.poll(() => storedProject(page, 'draft')).not.toBeNull();
  const before = await storedProject(page, 'draft');
  await page.evaluate(() => (window as typeof window & { finishOlder: () => Promise<void> }).finishOlder());
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await expect(page.getByRole('tab', { name: t.modes.Compare, exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(guide.getByRole('button', { name: t.guide.actions[0], exact: true })).toBeEnabled();
  await expect(page.locator('.people-stats b')).toHaveText(['9', '9', '276']);
  expect(await storedProject(page, 'draft')).toBe(before);
  await expect(page.locator('.status-notice')).not.toHaveText(t.notices.fileReadFailed);
  await expect(page.locator('.status-notice')).not.toHaveText(t.notices.imported);
});
