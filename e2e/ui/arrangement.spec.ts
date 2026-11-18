import { expect, test } from '@playwright/test';
import { openExample } from './studio';

test('arrangement preference survives reload and narrow screens force rows', async ({ page }, info) => {
  const t = await openExample(page, info);
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.getByRole('tab', { name: t.modes.Compare, exact: true }).click();
  await expect(page.locator('.people-stats b')).toHaveText(['9', '9', '276']);
  const choices = page.getByRole('group', { name: t.arrangement.label, exact: true });
  await choices.getByRole('button', { name: t.arrangement.cols, exact: true }).click();
  await expect(choices.getByRole('button', { name: t.arrangement.cols, exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.canvas-area')).toHaveClass(/cols/);
  await expect.poll(() => page.evaluate(() => localStorage.getItem('ghost-rehearsal.arrangement.v1'))).toContain('cols');
  await page.reload();
  const welcome = page.getByRole('dialog').getByRole('button', { name: t.eventSetup.demo, exact: true });
  await expect(welcome.or(page.getByRole('tab', { name: t.modes.Compare, exact: true, disabled: false }))).toBeVisible();
  if (await welcome.isVisible()) await welcome.click();
  await page.getByRole('tab', { name: t.modes.Compare, exact: true }).click();
  await expect(page.locator('.people-stats b')).toHaveCount(3);
  await expect(page.getByRole('group', { name: t.arrangement.label, exact: true }).getByRole('button', { name: t.arrangement.cols, exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('.mobile-compare-nav').getByRole('button', { name: t.workspace.canvas, exact: true }).click();
  await expect(page.locator('.canvas-area')).toHaveClass(/rows/);
  await expect(page.locator('.arrangement-note')).toHaveText(t.arrangement.narrowNote);
  await page.setViewportSize({ width: 1366, height: 768 });
  await expect(page.locator('.canvas-area')).toHaveClass(/cols/);
});
