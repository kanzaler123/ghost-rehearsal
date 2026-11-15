import { expect, test } from '@playwright/test';
import { openExample } from './studio';

test('phone key actions have 44px hit areas and no horizontal page overflow', async ({ page }, info) => {
  const t = await openExample(page, info);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('tab', { name: t.modes.Rehearse, exact: true }).click();
  await expect(page.getByLabel(t.dock.timeline, { exact: true })).toBeEnabled();
  const targets = [page.locator('.play-btn'), page.getByLabel(t.dock.speed, { exact: true }), page.getByRole('tab', { name: t.modes.Build, exact: true })];
  for (const target of targets) {
    const dimensions = await target.evaluate(element => {
      const rect = element.getBoundingClientRect();
      const pseudo = getComputedStyle(element, '::after');
      const extraX = pseudo.content !== 'none' ? Math.max(0, -parseFloat(pseudo.left) || 0) + Math.max(0, -parseFloat(pseudo.right) || 0) : 0;
      const extraY = pseudo.content !== 'none' ? Math.max(0, -parseFloat(pseudo.top) || 0) + Math.max(0, -parseFloat(pseudo.bottom) || 0) : 0;
      return { width: rect.width + extraX, height: rect.height + extraY };
    });
    expect(dimensions.width).toBeGreaterThanOrEqual(44);
    expect(dimensions.height).toBeGreaterThanOrEqual(44);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
