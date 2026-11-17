import { readFile } from 'node:fs/promises';
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
    if (!info.project.name.startsWith('mobile')) {
      const report = await page.locator('.is-report').boundingBox();
      const lastRow = await page.locator('.snapshot-item').last().boundingBox();
      expect(lastRow!.y + lastRow!.height).toBeLessThanOrEqual(report!.y + report!.height);
    }
    for (const row of await page.locator('.snapshot-item:not(.resource-summary)').all()) {
      const label = await row.locator(':scope > span').boundingBox();
      const value = await row.locator(':scope > strong').boundingBox();
      expect(label!.x + label!.width).toBeLessThanOrEqual(value!.x);
    }
    await guide.getByRole('button', { name: t.guide.actions[0], exact: true }).click();
    await guide.getByRole('button', { name: t.guide.actions[1], exact: true }).click();
    await expect(page.locator('.diff-note')).toContainText('03:30');
    await check('journey');
    await expect(page.locator('.replay-label')).toBeVisible();
    await expect(page.locator('.lane-diff .lane-marker-label')).toBeVisible();
    // Smooth scrolling can advance between two Playwright calls. Read both
    // viewport rectangles in one browser task so they describe the same frame.
    const { replayLabel, differenceLabel } = await page.evaluate(() => {
      const replay = document.querySelector('.replay-label')!.getBoundingClientRect();
      const difference = document.querySelector('.lane-diff .lane-marker-label')!.getBoundingClientRect();
      return {
        replayLabel: { top: replay.top, bottom: replay.bottom },
        differenceLabel: { top: difference.top, bottom: difference.bottom },
      };
    });
    expect(replayLabel.bottom <= differenceLabel.top || differenceLabel.bottom <= replayLabel.top).toBe(true);
    await guide.getByRole('button', { name: t.guide.actions[2], exact: true }).click();
    await expect(page.locator('.evidence-card')).toContainText('check-staff');
    await check('evidence');
    await guide.getByRole('button', { name: t.guide.actions[3], exact: true }).click();
    const completed = page.locator('.outcome-table').getByRole('row').filter({ has: page.getByRole('rowheader', { name: t.compare.rows.completed, exact: true }) });
    await expect(completed.locator('td').nth(1)).toHaveText('72');
    await guide.getByRole('button', { name: t.guide.actions[4], exact: true }).click();
    const arrangementDownload = page.waitForEvent('download');
    await guide.getByRole('button', { name: t.guide.actions[5], exact: true }).click();
    expect(await readFile((await (await arrangementDownload).path())!, 'utf8')).toContain(`${t.outcomes.completed}: 72`);
    await page.locator('.workspace-menu > summary').click();
    await page.getByRole('button', { name: t.header.export, exact: true }).click();
    const projectDownload = page.waitForEvent('download');
    await page.getByRole('dialog').getByRole('button').filter({ has: page.getByText(t.dialogs.exportProject, { exact: true }) }).click();
    const project = await readFile((await (await projectDownload).path())!, 'utf8');
    expect(JSON.parse(project).plans).toHaveLength(5);
    await guide.getByRole('button', { name: t.guide.exit, exact: true }).click();
    await page.getByRole('tab', { name: t.modes.Build, exact: true }).click();
    await page.locator('input[type=file]').first().setInputFiles({ name: 'motion-roundtrip.json', mimeType: 'application/json', buffer: Buffer.from(project) });
    await expect(page.locator('.status-notice')).toHaveText(t.notices.imported);
    await expect(page.getByRole('tab', { name: t.modes.Build, exact: true })).toBeVisible();
    await page.locator('.workspace-menu > summary').click();
    await page.getByRole('button', { name: t.header.export, exact: true }).click();
    const restoredDownload = page.waitForEvent('download');
    await page.getByRole('dialog').getByRole('button').filter({ has: page.getByText(t.dialogs.exportProject, { exact: true }) }).click();
    expect(await readFile((await (await restoredDownload).path())!, 'utf8')).toBe(project);
    expect(external).toEqual([]);
    expect(errors).toEqual([]);
  });
}
