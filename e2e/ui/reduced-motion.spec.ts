import { expect, test } from '@playwright/test';
import { openExample, pauseAt } from './studio';

test('reduced motion starts paused while explicit playback and scrubbing work', async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const t = await openExample(page, info);
  await page.getByRole('tab', { name: t.modes.Rehearse, exact: true }).click();
  const slider = page.getByLabel(t.dock.timeline, { exact: true });
  await expect(slider).toBeEnabled();
  await expect(page.locator('.play-btn')).toHaveAttribute('aria-label', t.dock.play);
  const initial = await slider.inputValue();
  await page.waitForTimeout(2100);
  await expect(slider).toHaveValue(initial);
  await page.locator('.play-btn').click();
  await expect.poll(() => slider.inputValue()).not.toBe(initial);
  await pauseAt(page, t, 210);
  await page.waitForTimeout(2100);
  await expect(slider).toHaveValue('210');
  await expect(slider).toHaveAttribute('aria-valuetext', /03:30/);
  await expect(page.getByLabel(t.dock.speed, { exact: true }).locator('option')).toHaveText(['0.5×', '1×', '2×', '4×', '8×']);
});
