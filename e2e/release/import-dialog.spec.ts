import { expect, test as base, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { MESSAGES, type Messages } from '../../src/i18n/messages';
import { parseDocument } from '../../src/schemas';
import type { ProjectDocument } from '../../src/schemas';
import { openExample } from '../ui/studio';

const test = base.extend<{ runtimeCheck: void }>({
  runtimeCheck: [async ({ page }, use, info) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await use();
    await info.attach('page-errors', { body: JSON.stringify(errors), contentType: 'application/json' });
    expect(errors).toEqual([]);
  }, { auto: true }],
});

const document = JSON.parse(readFileSync(new URL('../../examples/open-house.json', import.meta.url), 'utf8')) as ProjectDocument;
document.plans.forEach(plan => { plan.name = 'Imported during dialog'; });
document.scenarios[0].seed = 12345;
const file = { name: 'pending-dialog.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(document)) };
const expected = parseDocument(file.buffer.toString()).document!;

async function holdRead(page: Page) {
  await page.evaluate(() => {
    const read = File.prototype.text;
    File.prototype.text = function () {
      if (this.name !== 'pending-dialog.json') return read.call(this);
      const file = this;
      return new Promise<string>(resolve => {
        (window as typeof window & { finishDialogImport: () => Promise<void> }).finishDialogImport = async () => resolve(await read.call(file));
      });
    };
  });
  await page.locator('input[type=file]').first().setInputFiles(file);
  await page.waitForFunction(() => typeof (window as typeof window & { finishDialogImport?: unknown }).finishDialogImport === 'function');
}

async function finishRead(page: Page) {
  await page.evaluate(() => (window as typeof window & { finishDialogImport: () => Promise<void> }).finishDialogImport());
}

async function openNewEvent(page: Page, t: Messages) {
  const expand = page.getByRole('button', { name: t.studioUi.expandPlans, exact: true });
  if (await expand.isVisible()) await expand.click();
  await page.locator('.event-card summary').click();
  await page.getByRole('button', { name: t.eventSetup.new, exact: true }).click();
  return page.getByRole('dialog', { name: t.eventSetup.title, exact: true });
}

async function openExport(page: Page, t: Messages) {
  await page.locator('.workspace-menu > summary').click();
  await page.getByRole('button', { name: t.header.export, exact: true }).click();
  return page.getByRole('dialog', { name: t.dialogs.exportTitle, exact: true });
}

async function downloadProject(page: Page, t: Messages) {
  const pending = page.waitForEvent('download');
  await page.getByRole('dialog').getByRole('button').filter({ has: page.getByText(t.dialogs.exportProject, { exact: true }) }).click();
  const path = await (await pending).path();
  return JSON.parse(await readFile(path!, 'utf8')) as ProjectDocument;
}

test('an import keeps a later export dialog and exports the newly imported document', async ({ page }, info) => {
  const t = await openExample(page, info);
  await holdRead(page);
  const dialog = await openExport(page, t);
  const projectButton = dialog.getByRole('button').filter({ has: page.getByText(t.dialogs.exportProject, { exact: true }) });
  await projectButton.focus();
  await finishRead(page);
  await expect(page.locator('.status-notice')).toHaveText(t.notices.imported);
  await expect(dialog).toBeVisible();
  expect(await dialog.evaluate(element => element.matches(':modal'))).toBe(true);
  await expect(projectButton).toBeFocused();
  expect(await downloadProject(page, t)).toEqual(expected);
});

test('a Build import preserves a later new-event draft and its focus', async ({ page }, info) => {
  const t = await openExample(page, info);
  await holdRead(page);
  const dialog = await openNewEvent(page, t);
  const name = dialog.getByLabel(t.dialogs.eventName, { exact: true });
  await name.fill('Draft opened during import');
  await dialog.getByLabel(t.dialogs.count, { exact: true }).fill('137');
  await dialog.getByLabel(t.eventSetup.startingFlow, { exact: true }).selectOption('candy');
  await name.focus();
  await finishRead(page);
  await expect(page.locator('.status-notice')).toHaveText(t.notices.imported);
  await expect(dialog).toBeVisible();
  expect(await dialog.evaluate(element => element.matches(':modal'))).toBe(true);
  await expect(name).toHaveValue('Draft opened during import');
  await expect(name).toBeFocused();
  await expect(dialog.getByLabel(t.dialogs.count, { exact: true })).toHaveValue('137');
  await expect(dialog.getByLabel(t.eventSetup.startingFlow, { exact: true })).toHaveValue('candy');
  await dialog.getByRole('button', { name: t.eventSetup.create, exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await openExport(page, t);
  const saved = await downloadProject(page, t);
  expect(saved.plans.filter(plan => expected.plans.some(imported => imported.id === plan.id))).toEqual(expected.plans);
  expect(saved.scenarios).toContainEqual(expected.scenarios[0]);
  expect(saved.scenarios.find(scenario => scenario.name === 'Draft opened during import')?.arrivalStreams[0]).toMatchObject({ count: 137 });
});

for (const entry of ['welcome', 'new-event'] as const) {
  test(`an import still closes its own ${entry} dialog`, async ({ page }, info) => {
    const t = MESSAGES[info.project.name.endsWith('zh') ? 'zh' : 'en'];
    if (entry === 'new-event') { await openExample(page, info); await openNewEvent(page, t); }
    else {
      await page.addInitScript(lang => localStorage.setItem('ghost-rehearsal.lang', lang), t.lang);
      await page.goto('./');
    }
    const dialog = page.getByRole('dialog', { name: t.eventSetup.title, exact: true });
    await expect(dialog).toBeVisible();
    await holdRead(page);
    await expect(dialog.getByRole('status')).toContainText(t.imports.busy);
    await finishRead(page);
    await expect(dialog).toHaveCount(0);
    await expect(page.locator('.stage-head h1')).toHaveText('Imported during dialog');
    await expect(page.locator('.status-notice')).toHaveText(t.notices.imported);
  });
}

test('closing and reopening a new-event dialog rejects the previous owned read', async ({ page }, info) => {
  const t = await openExample(page, info);
  const before = await page.locator('.stage-head h1').textContent();
  let dialog = await openNewEvent(page, t);
  await holdRead(page);
  await dialog.getByRole('button', { name: t.common.closeDialog, exact: true }).click();
  dialog = await openNewEvent(page, t);
  const name = dialog.getByLabel(t.dialogs.eventName, { exact: true });
  await name.fill('Replacement draft');
  await finishRead(page);
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await expect(dialog).toBeVisible();
  await expect(name).toHaveValue('Replacement draft');
  await expect(name).toBeFocused();
  await expect(page.locator('.stage-head h1')).toHaveText(before!);
  await expect(page.locator('.status-notice')).not.toHaveText(t.notices.imported);
});
