import { expect, test } from '@playwright/test';
import { compareExample, openExample } from './studio';

test('keyboard replay, menu dismissal, guest selection and divergence', async ({ page }, info) => {
  const t = await openExample(page, info);
  const menu = page.locator('.workspace-menu > summary');
  await menu.focus();
  await menu.press('Enter');
  await expect(page.locator('.workspace-menu')).toHaveAttribute('open', '');
  await page.keyboard.press('Escape');
  await expect(page.locator('.workspace-menu')).not.toHaveAttribute('open');
  await expect(menu).toBeFocused();
  await page.getByRole('tab', { name: t.modes.Rehearse, exact: true }).focus();
  await page.keyboard.press('Enter');
  const slider = page.getByLabel(t.dock.timeline, { exact: true });
  await expect(slider).toBeEnabled();
  const pause = page.getByRole('button', { name: t.dock.pause, exact: true });
  if (await pause.isVisible()) { await pause.focus(); await page.keyboard.press('Enter'); }
  await slider.focus();
  const initial = Number(await slider.inputValue());
  await slider.press('ArrowRight');
  expect(Number(await slider.inputValue())).toBeGreaterThan(initial);
  expect(await slider.evaluate(element => getComputedStyle(element).outlineStyle)).not.toBe('none');
  await page.getByLabel(t.dock.speed, { exact: true }).focus();
  await page.keyboard.press('End');
  await page.keyboard.press('Enter');
  await expect(page.getByLabel(t.dock.speed, { exact: true })).toHaveValue('8');
  await page.getByRole('tab', { name: t.modes.Build, exact: true }).click();
  const guide = await compareExample(page, t);
  await guide.getByRole('button', { name: t.guide.actions[0], exact: true }).focus();
  await page.keyboard.press('Enter');
  await guide.getByRole('button', { name: t.guide.actions[1], exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.ghost-id code')).toHaveText('side-stream:10');
  await expect(page.getByLabel(t.dock.timeline, { exact: true })).toHaveValue('210');
});
