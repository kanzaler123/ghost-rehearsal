import { expect, test } from '@playwright/test';
import { compareExample, openExample, pauseAt, selectPacking } from './studio';

for (const motion of ['no-preference', 'reduce'] as const) {
  test(`layout and genuine evidence across modes with motion=${motion}`, async ({ page }, info) => {
    await page.emulateMedia({ reducedMotion: motion });
    const errors: string[] = [], external: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => { if (!request.url().startsWith(new URL(info.project.use.baseURL!).origin) && /^https?:/.test(request.url())) external.push(request.url()); });
    const t = await openExample(page, info);
    const check = async (state: string) => {
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), state).toBe(true);
      await page.screenshot({ path: info.outputPath(`${state}.png`), fullPage: true });
    };
    await selectPacking(page, t);
    await check('build');
    await page.getByRole('tab', { name: t.modes.Rehearse, exact: true }).click();
    await expect(page.getByLabel(t.dock.timeline, { exact: true })).toBeEnabled();
    await pauseAt(page, t, 210);
    await check('rehearse');
    const canvas = await page.locator('.canvas-area').boundingBox();
    expect(canvas!.height).toBeGreaterThanOrEqual(page.viewportSize()!.height * 0.4);
    await page.getByRole('tab', { name: t.modes.Build, exact: true }).click();
    const guide = await compareExample(page, t);
    await check('comparison');
    await expect(page.locator('.conclusion-groups')).toBeVisible();
    await guide.getByRole('button', { name: t.guide.actions[0], exact: true }).click();
    await guide.getByRole('button', { name: t.guide.actions[1], exact: true }).click();
    await expect(page.locator('.diff-note')).toContainText('03:30');
    await check('journey');
    await guide.getByRole('button', { name: t.guide.actions[2], exact: true }).click();
    await expect(page.locator('.evidence-card')).toContainText('check-staff');
    await check('evidence');
    expect(external).toEqual([]);
    expect(errors).toEqual([]);
  });
}
