import { expect, test } from '@playwright/test';
import { compareExample, openExample } from './studio';

test('topbar cutoff execution selects available statistics without changing full-run preferences', async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const t = await openExample(page, info);
  await compareExample(page, t);
  const basis = page.getByLabel(t.review.basis, { exact: true });
  const completed = page.locator('.report-snapshot .snapshot-item > small').first();
  await expect(completed).toHaveText('A 43 → B 41');
  async function chooseBasis(value: 'cutoff' | 'completion') {
    await page.locator('.comparison-options > summary').click();
    await basis.selectOption(value);
    await page.locator('.comparison-options > summary').click();
  }
  async function chooseScope(value: 'cutoff' | 'run_to_completion') {
    await page.locator('.workspace-menu > summary').click();
    await page.getByLabel(t.run.scope, { exact: true }).selectOption(value);
    await page.locator('.workspace-menu > summary').click();
  }
  async function run() {
    const worker = page.waitForEvent('worker');
    await page.getByRole('button', { name: t.run.start, exact: true }).click();
    expect((await worker).url()).toMatch(/\/assets\/worker-[^/]+\.js$/);
    await expect(page.getByRole('button', { name: t.run.start, exact: true })).toBeVisible();
  }
  await chooseBasis('completion');
  const finalCompleted = await completed.textContent();
  await chooseScope('cutoff');
  // Changing the next run's settings must not change the selected view yet.
  await expect(basis).toHaveValue('completion');
  await run();
  await expect(basis).toHaveValue('cutoff');
  await expect(basis.locator('option[value=completion]')).toBeDisabled();
  await expect(completed).toHaveText('A 43 → B 41');
  await expect(page.locator('.report-stale')).toHaveCount(0);
  await run();
  await expect(basis).toHaveValue('cutoff');
  await expect(completed).toHaveText('A 43 → B 41');
  await chooseScope('run_to_completion');
  await run();
  await expect(basis).toHaveValue('cutoff');
  await expect(basis.locator('option[value=completion]')).toBeEnabled();
  await expect(completed).toHaveText('A 43 → B 41');
  await chooseBasis('completion');
  await run();
  await expect(basis).toHaveValue('completion');
  await expect(completed).toHaveText(finalCompleted!);
  expect(errors).toEqual([]);
});
