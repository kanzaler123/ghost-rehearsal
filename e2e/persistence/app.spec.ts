import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import type { ProjectDocument } from '../../src/schemas';
const example = JSON.parse(readFileSync(new URL('../../examples/open-house.json', import.meta.url), 'utf8')) as ProjectDocument;
import { MESSAGES } from '../../src/i18n/messages';
import type { Messages } from '../../src/i18n/messages';
import { openExample } from '../ui/studio';
import { storedProject } from './browser';

async function renameEvent(page: Page, t: Messages, name: string) {
  const expand = page.getByRole('button', { name: t.studioUi.expandPlans, exact: true });
  if (await expand.isVisible()) await expand.click();
  await page.locator('.event-picker summary').click();
  await page.getByRole('button', { name: t.eventSetup.settings, exact: true }).click();
  const dialog = page.getByRole('dialog', { name: t.dialogs.scenarioTitle });
  await dialog.getByLabel(t.dialogs.eventName, { exact: true }).fill(name);
  await dialog.getByRole('button', { name: t.dialogs.applyShared(2), exact: true }).click();
}

test('two App tabs keep both edits, report conflict, and restore the selected version', async ({ page, context }, info) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  const t = await openExample(page, info);
  await page.getByTitle(t.header.saveTitle, { exact: true }).click();
  await expect(page.locator('.save-state')).toHaveText(t.header.saved);
  const b = await context.newPage(); b.on('pageerror', error => errors.push(error.message));
  await b.goto('./');
  await expect(b.locator('.save-state')).toHaveText(t.header.saved);
  await renameEvent(page, t, 'Tab A draft');
  await expect(page.locator('.save-state')).toHaveText(t.review.draftSaved);
  await renameEvent(b, t, 'Tab B draft');
  await expect(b.getByRole('alert').filter({ hasText: t.persistence.conflict })).toBeVisible();
  await expect(page.getByRole('alert').filter({ hasText: t.persistence.conflict })).toBeVisible();
  await b.getByRole('button', { name: t.persistence.recover, exact: true }).click();
  const recovery = b.getByRole('dialog', { name: t.persistence.recover });
  await expect(recovery).toContainText('Tab A draft'); await expect(recovery).toContainText('Tab B draft');
  await recovery.locator('.check-item').filter({ hasText: 'Tab A draft' }).getByRole('button', { name: t.persistence.resolve, exact: true }).click();
  await expect(b.locator('.save-state')).toHaveText(t.review.draftSaved);
  await expect(b.getByLabel(t.eventSetup.active)).toContainText('Tab A draft');
  await b.getByTitle(t.header.saveTitle, { exact: true }).click();
  await expect(b.locator('.save-state')).toHaveText(t.header.saved);
  const saved = await storedProject(b, 'saved'); expect(saved).toContain('Tab A draft');
  await b.reload();
  await expect(b.locator('.save-state')).toHaveText(t.header.saved);
  expect(await storedProject(b, 'saved')).toBe(saved);
  expect(errors).toEqual([]);
});

test('constructor plan IDs work through import, real Worker and reload', async ({ page }, info) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  const t = MESSAGES[info.project.name.endsWith('zh') ? 'zh' : 'en'];
  await page.addInitScript(lang => localStorage.setItem('ghost-rehearsal.lang', lang), t.lang);
  await page.goto('./');
  const document = structuredClone(example); document.plans = [document.plans[0]]; document.plans[0].id = 'constructor';
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: t.eventSetup.import, exact: true }).click();
  await (await chooser).setFiles({ name: 'constructor.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(document)) });
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('tab', { name: t.modes.Rehearse, exact: true }).click();
  await expect(page.locator('.run-state-card')).toHaveAttribute('data-state', 'complete');
  await page.getByTitle(t.header.saveTitle, { exact: true }).click();
  await expect(page.locator('.save-state')).toHaveText(t.header.saved);
  await page.reload();
  await expect(page.locator('.save-state')).toHaveText(t.header.saved);
  expect(await storedProject(page, 'saved')).toContain('constructor');
  expect(errors).toEqual([]);
});

test('unreadable template storage retains its original and requires explicit repair', async ({ page }, info) => {
  const t = MESSAGES[info.project.name.endsWith('zh') ? 'zh' : 'en'];
  await page.addInitScript(lang => {
    localStorage.setItem('ghost-rehearsal.lang', lang);
    localStorage.setItem('ghost-rehearsal.templates.v1', '{broken originals');
  }, t.lang);
  await page.goto('./');
  await page.getByRole('button', { name: t.eventSetup.demo, exact: true }).click();
  const expand = page.getByRole('button', { name: t.studioUi.expandPlans, exact: true });
  if (await expand.isVisible()) await expand.click();
  await page.getByRole('button', { name: t.templates.browse, exact: true }).click();
  const library = page.getByRole('dialog', { name: t.templates.title });
  await expect(library).toContainText(t.persistence.libraryFailed);
  const [raw] = await Promise.all([page.waitForEvent('download'), library.getByRole('button', { name: t.persistence.raw, exact: true }).click()]);
  const stream = await raw.createReadStream(); const chunks: Buffer[] = []; for await (const chunk of stream!) chunks.push(chunk);
  expect(Buffer.concat(chunks).toString()).toBe('{broken originals');
  await library.getByRole('button', { name: t.persistence.resetLibrary, exact: true }).click();
  await expect(library).not.toContainText(t.persistence.libraryFailed);
  expect(await page.evaluate(() => localStorage.getItem('ghost-rehearsal.templates.v1'))).toBe('{broken originals');
});

test('Worker construction failure leaves a retryable state and preserves the previous result', async ({ page }, info) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  const t = await openExample(page, info);
  await page.getByRole('tab', { name: t.modes.Rehearse, exact: true }).click();
  await expect(page.locator('.run-state-card')).toHaveAttribute('data-state', 'complete');
  await page.evaluate(() => {
    const Original = window.Worker;
    window.Worker = class extends Original {
      constructor(url: string | URL, options?: WorkerOptions) { window.Worker = Original; throw new Error('Injected construction failure'); super(url, options); }
    };
  });
  await page.getByRole('button', { name: t.run.start, exact: true }).click();
  await expect(page.locator('.run-state-card')).toHaveAttribute('data-state', 'failed');
  await page.getByRole('region', { name: t.runState.failed.label, exact: true }).getByRole('button').click();
  await expect(page.locator('.run-state-card')).toHaveAttribute('data-state', 'complete');
  expect(errors).toEqual([]);
});
