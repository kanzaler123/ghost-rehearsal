import { expect, test } from '@playwright/test';
test('isolated Canvas survives repeated geometry and mode changes', async ({ page }, info) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(lang => localStorage.setItem('ghost-rehearsal.lang', lang), info.project.name.endsWith('zh') ? 'zh' : 'en');
  await page.goto('/');
  await expect(page.locator('.react-flow__node').first()).toBeVisible();
  for (let step = 1; step <= 6; step++) {
    await page.getByRole('button', { name: 'Toggle layout', exact: true }).click();
    await expect(page.locator('output')).toHaveAttribute('data-step', String(step));
    // Include the application's final 420ms viewport-placement pass.
    await page.waitForTimeout(500);
  }
  await info.attach('browser-errors', { body: JSON.stringify(errors), contentType: 'application/json' });
  expect(errors).toEqual([]);
});
