import { expect, test } from '@playwright/test';
import { compareExample, openExample } from './studio';

test('worker loading failure produces one retry action and no comparison claims', async ({ page }, info) => {
  const t = await openExample(page, info);
  await page.route('**/assets/worker-*.js', route => route.abort('failed'));
  await page.getByRole('button', { name: t.run.start, exact: true }).click();
  const state = page.locator('.run-state-card.state-failed');
  await expect(state).toBeVisible();
  await expect(state.locator('.status-marker')).toContainText(t.runState.failed.label);
  await expect(state.locator('button.primary')).toHaveCount(1);
  await expect(page.locator('.conclusion-groups')).toHaveCount(0);
  await expect(page.locator('.live-announcer[role=alert]')).not.toBeEmpty();
});

test('retrying an existing comparison hides its evidence while computing and after cancellation', async ({ page }, info) => {
  const t = await openExample(page, info);
  await compareExample(page, t);
  await expect(page.locator('.conclusion-groups')).toBeVisible();
  await page.route('**/assets/worker-*.js', async route => {
    await new Promise(resolve => setTimeout(resolve, 2500));
    await route.continue().catch(() => {});
  });
  await page.getByRole('button', { name: t.run.start, exact: true }).click();
  await expect(page.locator('.conclusion-groups')).toHaveCount(0);
  await page.getByRole('button', { name: t.run.stop, exact: true }).first().click();
  await expect(page.locator('.run-state-card.state-stopped').first()).toBeVisible();
  await expect(page.locator('.conclusion-groups')).toHaveCount(0);
});

test('stopping an in-flight Worker records cancellation separately from failure', async ({ page }, info) => {
  const t = await openExample(page, info);
  await page.route('**/assets/worker-*.js', async route => {
    await new Promise(resolve => setTimeout(resolve, 2500));
    await route.continue().catch(() => {});
  });
  await page.getByRole('button', { name: t.run.start, exact: true }).click();
  await page.getByRole('button', { name: t.run.stop, exact: true }).first().click();
  const state = page.locator('.run-state-card.state-stopped');
  await expect(state).toBeVisible();
  await expect(state.locator('button.primary')).toHaveCount(1);
  await expect(page.locator('.run-state-card.state-failed')).toHaveCount(0);
});
