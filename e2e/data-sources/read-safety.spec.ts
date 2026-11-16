import { expect, test } from '@playwright/test';
import type { Page, TestInfo } from '@playwright/test';
import { dataSourceText } from '../../src/components/data-sources/text';
import { openExample } from '../ui/studio';

async function editor(page: Page, info: TestInfo, kind: 'arrival' | 'service') {
  const t = await openExample(page, info);
  const d = dataSourceText(info.project.name.endsWith('zh') ? 'zh' : 'en');
  const expand = page.getByRole('button', { name: t.studioUi.expandPlans, exact: true });
  if (await expand.isVisible()) await expand.click();
  if (kind === 'arrival') {
    await page.locator('.event-picker summary').click();
    await page.getByRole('button', { name: t.eventSetup.settings, exact: true }).click();
    const stream = page.getByRole('dialog').locator('.config-card').first();
    await stream.locator('summary').filter({ hasText: d.arrival }).click();
  } else {
    await page.locator('.plan-node.type-service').first().click();
    await page.locator('.inspector:not(.collapsed) summary').filter({ hasText: d.service }).click();
  }
  return { d, region: page.getByRole('region', { name: d[kind], exact: true }) };
}
const csv = {
  arrival: 'id,arrival_time,attr:ticket,attr:visit\nfixture-1,0,regular,full\nfixture-2,1.5,vip,quick\n',
  service: 'duration\n1.5\n0.5\n1.5\n',
};

for (const kind of ['arrival', 'service'] as const) {
  test(`${kind} unreadable CSV preserves pasted draft, preview and source; same-file retry works`, async ({ page }, info) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(() => {
      const original = File.prototype.text; let attempts = 0;
      File.prototype.text = function () {
        if (this.name === 'replacement.csv' && attempts++ === 0) return Promise.reject(new Error('controlled unreadable file'));
        return original.call(this);
      };
    });
    const { d, region } = await editor(page, info, kind);
    const text = region.getByRole('textbox', { name: d.text, exact: true });
    await text.fill(csv[kind]);
    await region.getByRole('combobox', { name: d.unit, exact: true }).selectOption('minutes');
    await region.getByRole('button', { name: d.preview, exact: true }).click();
    await region.getByRole('combobox', { name: d.sourceKind, exact: true }).selectOption('historical');
    await region.getByRole('textbox', { name: d.source, exact: true }).fill('Synthetic draft source');
    await region.getByRole('textbox', { name: d.notes, exact: true }).fill('Keep these notes');
    const before = await region.locator('.ds-preview').textContent();
    const replacement = csv[kind].replace('1.5', '2.5');
    const file = { name: 'replacement.csv', mimeType: 'text/csv', buffer: Buffer.from(replacement) };
    await region.getByLabel(d.file, { exact: true }).setInputFiles(file);
    await expect(region.getByRole('alert')).toHaveText(d.fileError);
    await expect(text).toHaveValue(csv[kind]);
    await expect(region.getByRole('combobox', { name: d.unit, exact: true })).toHaveValue('minutes');
    await expect(region.getByRole('combobox', { name: d.sourceKind, exact: true })).toHaveValue('historical');
    await expect(region.getByRole('textbox', { name: d.source, exact: true })).toHaveValue('Synthetic draft source');
    await expect(region.getByRole('textbox', { name: d.notes, exact: true })).toHaveValue('Keep these notes');
    await expect(region.locator('.ds-preview')).toHaveText(before!);
    await expect(region.getByRole('button', { name: d.apply, exact: true })).toBeEnabled();
    await region.getByLabel(d.file, { exact: true }).setInputFiles(file);
    await expect(text).toHaveValue(replacement);
    await expect(region.getByRole('alert')).toHaveCount(0);
    await expect(region.locator('.ds-preview')).toHaveCount(0);
    await expect(region.getByRole('button', { name: d.apply, exact: true })).toBeDisabled();
    await region.getByRole('button', { name: d.preview, exact: true }).click();
    await expect(region.getByRole('button', { name: d.apply, exact: true })).toBeEnabled();
    expect(errors).toEqual([]);
  });

  test(`${kind} delayed CSV cannot apply old preview or overwrite manual edits, cancellation or replacement`, async ({ page }, info) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(() => {
      const original = File.prototype.text;
      const state = { pending: [] as (() => Promise<void>)[] };
      (window as unknown as { csvReads: typeof state }).csvReads = state;
      File.prototype.text = function () {
        if (this.name !== 'slow.csv') return original.call(this);
        return new Promise<string>((resolve, reject) => state.pending.push(() => original.call(this).then(resolve, reject)));
      };
    });
    const { d, region } = await editor(page, info, kind);
    const text = region.getByRole('textbox', { name: d.text, exact: true });
    const changed = csv[kind].replace('1.5', '2.5');
    for (const action of ['edit', 'cancel', 'replace']) {
      await text.fill(csv[kind]);
      await region.getByRole('combobox', { name: d.unit, exact: true }).selectOption('minutes');
      await region.getByRole('button', { name: d.preview, exact: true }).click();
      await region.getByLabel(d.file, { exact: true }).setInputFiles({ name: 'slow.csv', mimeType: 'text/csv', buffer: Buffer.from('invalid-old-read') });
      await expect(region.getByRole('status')).toHaveText(d.loading);
      await expect(text).toHaveValue(csv[kind]);
      await expect(region.getByRole('button', { name: d.apply, exact: true })).toBeDisabled();
      await expect(region.getByRole('button', { name: d.preview, exact: true })).toBeDisabled();
      if (action === 'edit') await text.fill(changed);
      else if (action === 'cancel') await region.getByRole('button', { name: d.cancel, exact: true }).click();
      else await region.getByLabel(d.file, { exact: true }).setInputFiles({ name: 'new.csv', mimeType: 'text/csv', buffer: Buffer.from(changed) });
      await expect(text).toHaveValue(action === 'cancel' ? '' : changed);
      await page.evaluate(async () => { await Promise.all((window as unknown as { csvReads: { pending: (() => Promise<void>)[] } }).csvReads.pending.splice(0).map(release => release())); });
      await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => resolve())));
      await expect(text).toHaveValue(action === 'cancel' ? '' : changed);
      await expect(region.getByRole('button', { name: d.preview, exact: true })).toBeEnabled();
      await expect(region.getByRole('alert')).toHaveCount(0);
    }
    expect(errors).toEqual([]);
  });
}
