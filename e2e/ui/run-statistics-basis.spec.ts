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

for (const outcome of ['cutoff', 'full', 'cancel'] as const) {
  test(`statistics changed while a real worker result is pending: ${outcome}`, async ({ page }, info) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    const t = await openExample(page, info);
    await compareExample(page, t);
    const basis = page.getByLabel(t.review.basis, { exact: true });
    const snapshot = page.locator('.report-snapshot .snapshot-item > small').first();
    await page.locator('.comparison-options > summary').click();
    await basis.selectOption('completion');
    const finalSnapshot = await snapshot.textContent();
    await page.locator('.comparison-options > summary').click();
    await page.locator('.workspace-menu > summary').click();
    await page.getByLabel(t.run.scope, { exact: true }).selectOption(outcome === 'full' ? 'run_to_completion' : 'cutoff');
    await page.locator('.workspace-menu > summary').click();

    // Compute with the production worker; hold only delivery of its actual result.
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    await page.route('**/__hold_worker_result', async route => {
      await gate;
      await route.fulfill({ status: 200, body: 'release' });
    });
    await page.route('**/assets/worker-*.js', async route => {
      const response = await route.fetch();
      const prefix = `(() => { const send = self.postMessage.bind(self); self.postMessage = (...args) => { fetch('/__hold_worker_result').then(() => send(...args)); }; })();\n`;
      await route.fulfill({ response, body: prefix + await response.text() });
    });
    const computed = page.waitForRequest('**/__hold_worker_result');
    await page.getByRole('button', { name: t.run.start, exact: true }).click();
    await computed;
    await expect(page.getByRole('button', { name: t.run.stop, exact: true })).toBeVisible();
    await page.locator('.comparison-options > summary').click();
    await expect(basis.locator('option[value=completion]')).toBeEnabled();
    await basis.selectOption('cutoff');
    await basis.selectOption('completion');
    await expect(basis).toHaveValue('completion');
    await page.locator('.comparison-options > summary').click();
    if (outcome === 'cancel') {
      await page.getByRole('button', { name: t.run.stop, exact: true }).click();
      await expect(page.getByRole('button', { name: t.run.start, exact: true })).toBeVisible();
    }
    release();
    await expect(page.getByRole('button', { name: t.run.start, exact: true })).toBeVisible();
    if (outcome === 'cutoff') {
      await expect(basis).toHaveValue('cutoff');
      await expect(basis.locator('option[value=completion]')).toBeDisabled();
      await expect(snapshot).toHaveText('A 43 → B 41');
      await expect(page.locator('.report-stale')).toHaveCount(0);
    } else {
      await expect(basis).toHaveValue('completion');
      await expect(basis.locator('option[value=completion]')).toBeEnabled();
      if (outcome === 'full') await expect(snapshot).toHaveText(finalSnapshot!);
      else await expect(page.getByRole('status').filter({ hasText: t.notices.cancelled })).toBeVisible();
    }
    expect(errors).toEqual([]);
  });
}
