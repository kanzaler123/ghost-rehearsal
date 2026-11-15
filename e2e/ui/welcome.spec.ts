import { expect, test } from '@playwright/test';
import { MESSAGES } from '../../src/i18n/messages';

test('first launch exposes example, blank setup and import without changing saved projects', async ({ page }, info) => {
  const t = MESSAGES[info.project.name.endsWith('zh') ? 'zh' : 'en'];
  await page.addInitScript(lang => localStorage.setItem('ghost-rehearsal.lang', lang), t.lang);
  await page.goto('./');
  const dialog = page.getByRole('dialog');
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
