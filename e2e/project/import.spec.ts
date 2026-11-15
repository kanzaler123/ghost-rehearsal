import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import type { ProjectDocument } from '../../src/schemas';
import { MESSAGES } from '../../src/i18n/messages';
import { openExample } from '../ui/studio';

const example = JSON.parse(readFileSync(new URL('../../examples/open-house.json', import.meta.url), 'utf8')) as ProjectDocument;

function projectFile(name: string, planName: string) {
  const document = structuredClone(example);
  document.plans.forEach(plan => { plan.name = planName; });
  return { name, mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(document)) };
}

test('unreadable project preserves work and permits retrying the same file', async ({ page }, info) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const t = await openExample(page, info);
  const selected = page.getByRole('heading', { level: 1 }).first();
  const before = await selected.textContent();
  await page.evaluate(() => {
    const read = File.prototype.text;
    let failed = false;
    File.prototype.text = function () {
      if (this.name === 'unreadable.json' && !failed) { failed = true; return Promise.reject(new Error('simulated file read failure')); }
      return read.call(this);
    };
  });
  const input = page.locator('input[type=file]').first();
  const file = projectFile('unreadable.json', 'Recovered project');
  await input.setInputFiles(file);
  await expect(page.locator('.status-notice')).toHaveText(t.notices.fileReadFailed);
  await expect(selected).toHaveText(before!);
  await expect(input).toHaveValue('');
  await input.setInputFiles(file);
  await expect(selected).toHaveText('Recovered project');
  await expect(page.locator('.status-notice')).toHaveText(t.notices.imported);
  expect(errors).toEqual([]);
});

for (const outcome of ['success', 'failure'] as const) test(`latest project selection wins over an older read ${outcome}`, async ({ page }, info) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const t = await openExample(page, info);
  await page.evaluate(outcome => {
    const read = File.prototype.text;
    File.prototype.text = function () {
      if (this.name !== 'older.json') return read.call(this);
      const file = this;
      return new Promise<string>((resolve, reject) => {
        (window as typeof window & { finishOlder: () => Promise<void> }).finishOlder = async () => {
          if (outcome === 'failure') reject(new Error('simulated superseded read failure'));
          else resolve(await read.call(file));
        };
      });
    };
  }, outcome);
  const input = page.locator('input[type=file]').first();
  await input.setInputFiles(projectFile('older.json', 'Older project'));
  await input.setInputFiles(projectFile('latest.json', 'Latest project'));
  const selected = page.getByRole('heading', { level: 1 }).first();
  await expect(selected).toHaveText('Latest project');
  await page.evaluate(() => (window as typeof window & { finishOlder: () => Promise<void> }).finishOlder());
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await expect(selected).toHaveText('Latest project');
  await expect(page.locator('.status-notice')).toHaveText(t.notices.imported);
  expect(errors).toEqual([]);
});

test('undoing a delayed import restores edits made while reading', async ({ page }, info) => {
  const t = await openExample(page, info);
  await page.evaluate(() => {
    const read = File.prototype.text;
    File.prototype.text = function () {
      const file = this;
      return new Promise<string>(resolve => {
        (window as typeof window & { finishImport: () => Promise<void> }).finishImport = async () => resolve(await read.call(file));
      });
    };
  });
  await page.locator('input[type=file]').first().setInputFiles(projectFile('delayed.json', 'Imported project'));
  const expand = page.getByRole('button', { name: t.studioUi.expandPlans, exact: true });
  if (await expand.isVisible()) await expand.click();
  await page.locator('.plan-navigator .section-heading summary').first().click();
  await page.getByRole('button', { name: t.review.rename, exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel(t.review.planName, { exact: true }).fill('Edit made while reading');
  await dialog.getByRole('button', { name: t.header.save, exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 }).first()).toHaveText('Edit made while reading');
  await page.evaluate(() => (window as typeof window & { finishImport: () => Promise<void> }).finishImport());
  await expect(page.getByRole('heading', { level: 1 }).first()).toHaveText('Imported project');
  await page.getByRole('button', { name: t.header.undo, exact: true }).click();
  await page.locator('.workspace-menu > summary').click();
  await page.getByRole('button', { name: t.header.export, exact: true }).click();
  const pending = page.waitForEvent('download');
  await page.getByRole('dialog').getByRole('button').filter({ has: page.getByText(t.dialogs.exportProject, { exact: true }) }).click();
  const download = await pending;
  const restored = JSON.parse(await readFile((await download.path())!, 'utf8')) as ProjectDocument;
  expect(restored.plans.map(plan => plan.name)).toContain('Edit made while reading');
  expect(restored.plans.map(plan => plan.name)).not.toContain('Imported project');
});

test('choosing a new example supersedes an unfinished import', async ({ page }, info) => {
  const t = MESSAGES[info.project.name.endsWith('zh') ? 'zh' : 'en'];
  await page.addInitScript(lang => localStorage.setItem('ghost-rehearsal.lang', lang), t.lang);
  await page.goto('./');
  await page.evaluate(() => {
    const read = File.prototype.text;
    File.prototype.text = function () {
      const file = this;
      return new Promise<string>(resolve => {
        (window as typeof window & { finishImport: () => Promise<void> }).finishImport = async () => resolve(await read.call(file));
      });
    };
  });
  await page.locator('input[type=file]').first().setInputFiles(projectFile('delayed.json', 'Superseded import'));
  await page.getByRole('dialog').getByRole('button', { name: t.eventSetup.demo, exact: true }).click();
  const heading = page.getByRole('heading', { level: 1 }).first();
  const chosen = await heading.textContent();
  await page.evaluate(() => (window as typeof window & { finishImport: () => Promise<void> }).finishImport());
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await expect(heading).toHaveText(chosen!);
  await expect(page.locator('.status-notice')).not.toHaveText(t.notices.imported);
});
