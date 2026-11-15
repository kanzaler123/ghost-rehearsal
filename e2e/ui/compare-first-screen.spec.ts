import { expect, test } from '@playwright/test';
import type { Locator } from '@playwright/test';
import { compareExample, openExample, pauseAt } from './studio';

async function fullyVisible(locator: Locator) {
  return locator.evaluate(element => {
    const rect = element.getBoundingClientRect();
    let left = 0, top = 0, right = innerWidth, bottom = innerHeight;
    for (let parent = element.parentElement; parent; parent = parent.parentElement) {
      const style = getComputedStyle(parent), bounds = parent.getBoundingClientRect();
      if (/auto|hidden|clip|scroll/.test(style.overflowY)) { top = Math.max(top, bounds.top); bottom = Math.min(bottom, bounds.bottom); }
      if (/auto|hidden|clip|scroll/.test(style.overflowX)) { left = Math.max(left, bounds.left); right = Math.min(right, bounds.right); }
    }
    return rect.width > 0 && rect.height > 0 && rect.left >= left - 1 && rect.right <= right + 1 && rect.top >= top - 1 && rect.bottom <= bottom + 1;
  });
}

test('comparison and guest evidence occupy the first screen', async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const t = await openExample(page, info);
  const mobile = info.project.name.startsWith('mobile');
  const guide = await compareExample(page, t);
  await page.evaluate(() => document.fonts.ready);
  const noOverflow = async () => expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const canvasFits = async () => {
    await expect(page.locator('.canvas-pane .react-flow')).toHaveCount(2);
    for (const flow of await page.locator('.canvas-pane .react-flow').all()) {
      await expect.poll(async () => (await flow.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(180);
      const stages = flow.locator('.stage-card');
      await expect(stages).toHaveCount(3);
      for (const stage of await stages.all()) await expect.poll(() => fullyVisible(stage)).toBe(true);
    }
  };
  if (!mobile) {
    await pauseAt(page, t, 210);
    await canvasFits();
    await page.setViewportSize({ width: 1440, height: 900 });
    await canvasFits();
    await page.setViewportSize({ width: 1366, height: 768 });
    await canvasFits();
  }
  await noOverflow();
  if (mobile) await expect.poll(() => fullyVisible(page.locator('.report-snapshot .snapshot-item').first())).toBe(true);
  const liveToggle = page.locator('button[aria-controls="comparison-live"]');
  await liveToggle.click();
  await expect(page.locator('#comparison-live')).toBeVisible();
  await guide.getByRole('button', { name: t.guide.actions[0], exact: true }).click();
  await expect(liveToggle).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('#comparison-live')).toBeHidden();
  await guide.getByRole('button', { name: t.guide.actions[1], exact: true }).click();
  await expect(page.locator('.ghost-id code')).toHaveText('side-stream:10');
  await expect(page.locator('.diff-note')).toContainText('03:30');
  await expect(page.getByLabel(t.dock.timeline, { exact: true })).toHaveValue('210');
  const identities = await page.locator('.comparison-identities > span').allTextContents();
  expect(identities).toHaveLength(2);
  for (const identity of identities) await expect(page.locator('.ghost-futures')).toContainText(identity.replace(/^[AB] · /, ''));
  await expect(page.locator('.lane')).toHaveCount(2);
  if (!mobile) {
    await expect.poll(() => fullyVisible(page.locator('.ghost-card'))).toBe(true);
    await expect.poll(() => fullyVisible(page.locator('.diff-note'))).toBe(true);
    for (const lane of await page.locator('.lane').all()) await expect.poll(() => fullyVisible(lane)).toBe(true);
    expect(await page.locator('.dock-body').evaluate(element => element.scrollTop)).toBe(0);
  } else {
    for (const selector of ['.ghost-card', '.ghost-futures', '.diff-note']) await expect.poll(() => fullyVisible(page.locator(selector))).toBe(true);
    const identity = await page.locator('.ghost-card').boundingBox();
    const difference = await page.locator('.diff-note').boundingBox();
    const roster = await page.locator('.ghost-stories').boundingBox();
    expect(identity!.y).toBeLessThan(difference!.y);
    expect(difference!.y).toBeLessThan(roster!.y);
    await page.locator('.lanes .seg-service').first().click();
    await expect(page.locator('#journey-segment-detail')).toBeVisible();
  }
  await liveToggle.focus();
  await liveToggle.press('Enter');
  await expect(page.locator('#comparison-live')).toBeVisible();
  expect(await liveToggle.evaluate(element => getComputedStyle(element).outlineStyle)).not.toBe('none');
  await liveToggle.press('Enter');
  await expect(page.locator('#comparison-live')).toBeHidden();
  await noOverflow();
  await page.locator('.journey-header button').first().click();
  await expect(page.locator('.app')).toHaveClass(/focus-overview/);
  if (!mobile) {
    for (const flow of await page.locator('.canvas-pane .react-flow').all()) await expect.poll(async () => (await flow.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(180);
    await expect(page.locator('.canvas-pane .react-flow__node[data-id="checkin"]')).toHaveCount(2);
  }
  await page.screenshot({ path: info.outputPath('comparison-first-screen.png'), fullPage: false });
});
