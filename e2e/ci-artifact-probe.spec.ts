import { expect, test } from '@playwright/test';

// Temporary diagnostic only: remove and restore the full command before review.
test('INTENTIONAL artifact-upload probe; not a product regression', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('dialog')).toBeVisible();
  throw new Error('INTENTIONAL ARTIFACT PROBE: verify screenshot, trace and reports survive a failed CI run.');
});
