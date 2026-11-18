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
  await b.evaluate(() => {
    const read = File.prototype.text;
    File.prototype.text = function () {
      const file = this;
      return new Promise<string>(resolve => {
        (window as typeof window & { finishImport: () => Promise<void> }).finishImport = async () => resolve(await read.call(file));
      });
    };
  });
  await b.locator('input[type=file]').first().setInputFiles({ name: 'superseded.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(example)) });
  await b.getByRole('button', { name: t.persistence.recover, exact: true }).click();
  const recovery = b.getByRole('dialog', { name: t.persistence.recover });
  await expect(recovery).toContainText('Tab A draft'); await expect(recovery).toContainText('Tab B draft');
  await recovery.locator('.check-item').filter({ hasText: 'Tab A draft' }).getByRole('button', { name: t.persistence.resolve, exact: true }).click();
  await b.evaluate(() => (window as typeof window & { finishImport: () => Promise<void> }).finishImport());
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

test('a failed draft write prevents recovery from replacing unsaved edits', async ({ page }, info) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  const t = await openExample(page, info);
  await page.getByTitle(t.header.saveTitle, { exact: true }).click();
  await expect(page.locator('.save-state')).toHaveText(t.header.saved);
  const original = JSON.parse((await storedProject(page, 'saved'))!).scenarios[0].name as string;
  await page.evaluate(() => {
    const add = IDBObjectStore.prototype.add;
    const storageTest = window as typeof window & { restoreWrites: () => void; failedDraftWrites: number };
    let failing = true;
    storageTest.failedDraftWrites = 0;
    storageTest.restoreWrites = () => { failing = false; };
    IDBObjectStore.prototype.add = function (value, key) {
      if (failing && this.name === 'revisions') {
        storageTest.failedDraftWrites++;
        throw new DOMException('Injected full quota', 'QuotaExceededError');
      }
      return add.call(this, value, key);
    };
  });
  await renameEvent(page, t, 'Unsaved recovery original');
  await expect(page.getByRole('alert').filter({ hasText: t.persistence.failed })).toBeVisible();
  await page.getByRole('button', { name: t.persistence.recover, exact: true }).click();
  const recovery = page.getByRole('dialog', { name: t.persistence.recover });
  await recovery.getByRole('button', { name: t.persistence.restore, exact: true }).first().click();
  await page.waitForFunction(() => (window as typeof window & { failedDraftWrites: number }).failedDraftWrites >= 2);
  await expect(recovery).toBeVisible();
  await expect(page.locator('.event-title')).toContainText('Unsaved recovery original');
  await expect(page.getByTitle(t.header.undo, { exact: false })).toBeEnabled();
  await page.evaluate(() => {
    const transaction = IDBDatabase.prototype.transaction;
    IDBDatabase.prototype.transaction = function (...args: Parameters<IDBDatabase['transaction']>) {
      const tx = transaction.apply(this, args);
      if (args[1] === 'readwrite') {
        IDBDatabase.prototype.transaction = transaction;
        tx.addEventListener('complete', event => {
          event.stopImmediatePropagation();
          (window as typeof window & { finishDraft: () => void }).finishDraft = () => tx.dispatchEvent(new Event('complete'));
        }, { once: true });
      }
      return tx;
    };
  });
  await page.keyboard.press('Escape');
  await expect(recovery).toHaveCount(0);
  const notice = page.getByRole('alert').filter({ hasText: t.persistence.failed });
  const [raw] = await Promise.all([page.waitForEvent('download'), notice.getByRole('button', { name: t.persistence.raw, exact: true }).click()]);
  const stream = await raw.createReadStream(); const chunks: Buffer[] = []; for await (const chunk of stream!) chunks.push(chunk);
  const recovered = JSON.parse(Buffer.concat(chunks).toString());
  expect(recovered.project.scenarios[0].name).toBe('Unsaved recovery original');
  expect(recovered.recovery.some((item: { raw: string }) => item.raw.includes('Unsaved recovery original'))).toBe(true);
  await page.waitForFunction(() => typeof (window as typeof window & { finishDraft?: unknown }).finishDraft === 'function');
  await notice.getByRole('button', { name: t.persistence.recover, exact: true }).click();
  await page.evaluate(() => {
    (window as typeof window & { restoreWrites: () => void }).restoreWrites();
    (window as typeof window & { finishDraft: () => void }).finishDraft();
  });
  await expect(page.locator('.save-state')).toHaveText(t.review.draftSaved);
  await expect(recovery.getByRole('button', { name: t.persistence.resolve, exact: true })).toHaveCount(0);
  await recovery.getByRole('button', { name: t.persistence.restore, exact: true }).first().click();
  await expect(recovery).toHaveCount(0);
  await expect(page.locator('.event-title')).toHaveText(original!);
  expect(await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('ghost-rehearsal.persistence.v2');
      request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
    });
    try {
      return await new Promise<boolean>((resolve, reject) => {
        const request = db.transaction('revisions').objectStore('revisions').getAll();
        request.onsuccess = () => resolve(JSON.stringify(request.result).includes('Unsaved recovery original'));
        request.onerror = () => reject(request.error);
      });
    } finally { db.close(); }
  })).toBe(true);
  expect(errors).toEqual([]);
});

for (const later of ['new-event', 'reopened-recovery'] as const) test(`a closed recovery cannot replace the ${later} dialog after its draft write completes`, async ({ page }, info) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  const t = await openExample(page, info);
  await page.getByTitle(t.header.saveTitle, { exact: true }).click();
  await expect(page.locator('.save-state')).toHaveText(t.header.saved);
  const original = JSON.parse((await storedProject(page, 'saved'))!).scenarios[0].name as string;
  await page.evaluate(() => {
    const add = IDBObjectStore.prototype.add;
    IDBObjectStore.prototype.add = function (value, key) {
      if (this.name === 'revisions') throw new DOMException('Injected full quota', 'QuotaExceededError');
      return add.call(this, value, key);
    };
    (window as typeof window & { restoreWrites: () => void }).restoreWrites = () => { IDBObjectStore.prototype.add = add; };
  });
  await renameEvent(page, t, 'Current content backed up');
  await expect(page.getByRole('alert').filter({ hasText: t.persistence.failed })).toBeVisible();
  await page.getByRole('button', { name: t.persistence.recover, exact: true }).click();
  const recovery = page.getByRole('dialog', { name: t.persistence.recover });
  await page.evaluate(() => {
    (window as typeof window & { restoreWrites: () => void }).restoreWrites();
    const transaction = IDBDatabase.prototype.transaction;
    IDBDatabase.prototype.transaction = function (...args: Parameters<IDBDatabase['transaction']>) {
      const tx = transaction.apply(this, args);
      if (args[1] === 'readwrite') {
        IDBDatabase.prototype.transaction = transaction;
        tx.addEventListener('complete', event => {
          event.stopImmediatePropagation();
          (window as typeof window & { finishRecovery: () => void }).finishRecovery = () => tx.dispatchEvent(new Event('complete'));
        }, { once: true });
      }
      return tx;
    };
  });
  const restore = recovery.locator('.check-item').filter({ hasText: original }).getByRole('button', { name: t.persistence.restore, exact: true });
  await restore.click();
  await page.waitForFunction(() => typeof (window as typeof window & { finishRecovery?: unknown }).finishRecovery === 'function');
  if (later === 'new-event') await page.keyboard.press('Escape');
  else await recovery.getByRole('button', { name: t.common.closeDialog, exact: true }).click();
  await expect(recovery).toHaveCount(0);
  if (later === 'new-event') {
    await page.locator('.event-card summary').click();
    await page.getByRole('button', { name: t.eventSetup.new, exact: true }).click();
    const dialog = page.getByRole('dialog', { name: t.eventSetup.title, exact: true });
    await dialog.getByLabel(t.dialogs.eventName, { exact: true }).fill('Later unsaved event draft');
    await dialog.getByLabel(t.dialogs.count, { exact: true }).fill('137');
    await dialog.getByLabel(t.eventSetup.startingFlow, { exact: true }).selectOption('candy');
    await dialog.getByLabel(t.dialogs.eventName, { exact: true }).focus();
  } else await page.getByRole('button', { name: t.persistence.recover, exact: true }).click();
  await page.evaluate(async () => {
    (window as typeof window & { finishRecovery: () => void }).finishRecovery();
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  });
  await expect(page.locator('.event-title')).toHaveText('Current content backed up');
  await expect(page.getByTitle(t.header.undo, { exact: false })).toBeEnabled();
  expect(await storedProject(page, 'draft')).toContain('Current content backed up');
  if (later === 'new-event') {
    const dialog = page.getByRole('dialog', { name: t.eventSetup.title, exact: true });
    await expect(dialog).toBeVisible();
    expect(await dialog.evaluate(element => element.matches(':modal'))).toBe(true);
    await expect(dialog.getByLabel(t.dialogs.eventName, { exact: true })).toHaveValue('Later unsaved event draft');
    await expect(dialog.getByLabel(t.dialogs.eventName, { exact: true })).toBeFocused();
    await expect(dialog.getByLabel(t.dialogs.count, { exact: true })).toHaveValue('137');
    await expect(dialog.getByLabel(t.eventSetup.startingFlow, { exact: true })).toHaveValue('candy');
    await dialog.getByRole('button', { name: t.eventSetup.create, exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await page.getByTitle(t.header.saveTitle, { exact: true }).click();
    await expect(page.locator('.save-state')).toHaveText(t.header.saved);
    const saved = JSON.parse((await storedProject(page, 'saved'))!) as ProjectDocument;
    expect(saved.scenarios.some(scenario => scenario.name === 'Current content backed up')).toBe(true);
    expect(saved.scenarios.find(scenario => scenario.name === 'Later unsaved event draft')?.arrivalStreams[0]).toMatchObject({ count: 137 });
  } else {
    await expect(recovery).toBeVisible();
    await recovery.locator('.check-item').filter({ hasText: 'Current content backed up' }).getByRole('button', { name: t.persistence.restore, exact: true }).click();
    await expect(recovery).toHaveCount(0);
    await expect(page.locator('.event-title')).toHaveText('Current content backed up');
    await expect(page.getByTitle(t.header.undo, { exact: false })).toBeDisabled();
    await expect(page.locator('.status-notice')).toHaveText(t.review.draftRestored);
  }
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
