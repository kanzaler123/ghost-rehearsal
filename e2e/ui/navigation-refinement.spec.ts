import { expect, test } from '@playwright/test';
import { MESSAGES } from '../../src/i18n/messages';
import { openEventSetup } from './studio';

test('blank-plan spacing, direct name editing and minimap clearance', async ({ page }, info) => {
  const t = MESSAGES[info.project.name.endsWith('zh') ? 'zh' : 'en'];
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(lang => localStorage.setItem('ghost-rehearsal.lang', lang), t.lang);
  await page.goto('./');
  await openEventSetup(page, t);
  await page.getByRole('dialog').getByLabel(t.dialogs.eventName, { exact: true }).fill('Two-Entrance Open House');
  await page.getByRole('dialog').getByRole('button', { name: t.eventSetup.create, exact: true }).click();
  await expect(page.locator('.react-flow__minimap')).toHaveCount(0);
  await expect(page.locator('.canvas-shell .haunt-moon')).toBeVisible();
  await expect(page.locator('.canvas-shell .haunt-bat')).toHaveCount(3);

  for (const width of [320, 390, 768, 1440, 1704]) {
    await page.setViewportSize({ width, height: 900 });
    await expect.poll(() => page.evaluate(() => {
      const card = document.querySelector('.plan-main')!.getBoundingClientRect();
      const hint = document.querySelector('.empty-b')!;
      const hintRect = hint.getBoundingClientRect();
      const badge = hint.querySelector('.plan-badge')!.getBoundingClientRect();
      const range = document.createRange(); range.selectNodeContents(hint.lastChild!);
      const label = range.getBoundingClientRect();
      const title = document.querySelector('.event-title')!.getBoundingClientRect();
      const picker = document.querySelector('.event-switcher')!.getBoundingClientRect();
      return hintRect.top - card.bottom >= 7 && label.left - badge.right >= 7 && title.right <= picker.left && document.documentElement.scrollWidth <= innerWidth;
    })).toBe(true);
  }
  await page.setViewportSize(info.project.use.viewport!);
  await page.locator('.event-title').click();
  await page.getByRole('dialog').getByLabel(t.dialogs.eventName, { exact: true }).fill('Midnight rehearsal');
  await page.getByRole('dialog').getByRole('button', { name: t.dialogs.applyShared(1), exact: true }).click();
  await expect(page.locator('.event-title')).toHaveText('Midnight rehearsal');
  await page.getByRole('button', { name: t.header.undo, exact: true }).click();
  await expect(page.locator('.event-title')).toHaveText('Two-Entrance Open House');
  await page.getByRole('button', { name: t.header.redo, exact: true }).click();
  await expect(page.locator('.event-title')).toHaveText('Midnight rehearsal');

  await page.locator('.plan-main').first().click();
  await page.getByRole('dialog').getByLabel(t.review.planName, { exact: true }).fill('Main route');
  await page.getByRole('dialog').getByRole('button', { name: t.header.save, exact: true }).click();
  await expect(page.locator('.plan-main')).toHaveAccessibleName('Main route');
  await page.locator('.plan-main').press('Enter');
  await page.getByRole('dialog').getByLabel(t.review.planName, { exact: true }).fill('Cancelled rename');
  await page.keyboard.press('Escape');
  await expect(page.locator('.plan-main')).toHaveAccessibleName('Main route');
  await expect(page.locator('.plan-main')).toBeFocused();
  await page.screenshot({ path: info.outputPath('black-blank.png'), fullPage: true });

  await page.locator('.event-picker summary').click();
  await page.getByRole('button', { name: t.eventSetup.new, exact: true }).click();
  await page.getByRole('dialog').getByLabel(t.dialogs.eventName, { exact: true }).fill('Second event');
  await page.getByRole('dialog').getByRole('button', { name: t.eventSetup.create, exact: true }).click();
  await page.getByLabel(t.eventSetup.active, { exact: true }).selectOption({ label: 'Midnight rehearsal' });
  await expect(page.locator('.plan-main')).toHaveAccessibleName('Main route');

  await page.locator('input[type=file]').first().setInputFiles('examples/open-house.json');
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(page.locator('.react-flow__minimap')).toBeVisible();
  const map = await page.locator('.react-flow__minimap').boundingBox();
  const attribution = await page.locator('.react-flow__attribution').boundingBox();
  expect(map!.y + map!.height + 8).toBeLessThanOrEqual(attribution!.y);
  await page.screenshot({ path: info.outputPath('black-workbench.png') });
  expect(errors).toEqual([]);
});
