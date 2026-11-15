import { expect, test } from '@playwright/test';
import { compareExample, openExample } from './studio';

test.use({ hasTouch: true });

test('short timeline segments have separate touch targets in both plans and statistics scopes', async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const t = await openExample(page, info);
  await page.setViewportSize({ width: 320, height: 568 });
  const guide = await compareExample(page, t);
  await guide.getByRole('button', { name: t.guide.actions[0], exact: true }).tap();
  await guide.getByRole('button', { name: t.guide.actions[1], exact: true }).tap();
  const picker = page.locator('.journey-segments');
  await picker.locator(':scope > summary').tap();
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 568 });
    for (const basis of ['completion', 'cutoff']) {
      await page.locator('.comparison-options > summary').tap();
      await page.getByLabel(t.review.basis, { exact: true }).selectOption(basis);
      await page.locator('.comparison-options > summary').tap();
      await expect(picker.getByRole('button')).toHaveCount(await page.locator('.lane-track .seg').count());
      for (const column of [0, 1]) {
        const service = page.locator('.lane').nth(column).locator('.seg-service').first();
        const description = (await service.getAttribute('aria-label'))!;
        const button = picker.locator('.segment-plan').nth(column).getByRole('button', { name: description, exact: true });
        // A's 30-second service is only about 1 CSS px at the 120-minute scale.
        // Tap the independently sized target, without force or synthetic events.
        await button.tap();
        await expect(page.getByLabel(t.dock.timeline, { exact: true })).toHaveValue(column === 0 ? '480' : '210');
        await expect(page.locator('#journey-segment-detail')).toHaveText(description);
        const target = await button.boundingBox();
        expect(target!.width).toBeGreaterThanOrEqual(44);
        expect(target!.height).toBeGreaterThanOrEqual(44);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      }
    }
    await page.screenshot({ path: info.outputPath(`timeline-touch-${width}.png`) });
  }
  const summary = picker.locator(':scope > summary');
  await summary.focus();
  await summary.press('Space');
  await expect(picker).not.toHaveAttribute('open');
  await summary.press('Space');
  await expect(picker).toHaveAttribute('open', '');
  await summary.press('Tab');
  await expect(picker.getByRole('button').first()).toBeFocused();
  expect(await picker.getByRole('button').first().evaluate(element => getComputedStyle(element).outlineStyle)).not.toBe('none');
});
