import { expect, test } from '@playwright/test';
import { compareExample, openExample } from './studio';

test.use({ hasTouch: true });

test('mobile comparison navigation clears the sticky header after wrapping and view changes', async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const t = await openExample(page, info);
  await page.setViewportSize({ width: 320, height: 568 });
  await compareExample(page, t);
  const clearHeader = async (selector: string) => {
    await expect(page.locator(selector)).toBeInViewport();
    // Read both rectangles in one frame, including during smooth scrolling.
    await expect.poll(() => page.evaluate(selector => {
      const target = document.querySelector(selector)!.getBoundingClientRect();
      const header = document.querySelector('.comparison-settings')!.getBoundingClientRect();
      return target.top >= header.bottom && target.bottom <= innerHeight;
    }, selector)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  };
  await clearHeader('.report-head h2');
  for (const motion of ['reduce', 'no-preference'] as const) {
    await page.emulateMedia({ reducedMotion: motion });
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 568 });
      await page.locator('.mobile-compare-nav').getByRole('button', { name: t.workspace.person, exact: true }).tap();
      await clearHeader('.journey-header');
      await page.locator('.journey-header button').first().tap();
      await clearHeader('.report-head h2');
      await page.screenshot({ path: info.outputPath(`report-${width}-${motion}.png`) });
    }
  }
});
