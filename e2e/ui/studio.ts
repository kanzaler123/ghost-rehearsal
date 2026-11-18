import { expect } from '@playwright/test';
import type { Page, TestInfo } from '@playwright/test';
import { MESSAGES } from '../../src/i18n/messages';
import type { Messages } from '../../src/i18n/messages';

export async function openEventSetup(page: Page, t: Messages) {
  await page.getByRole('button', { name: t.redesign.enter, exact: true }).click();
  await page.getByRole('button', { name: t.redesign.setup, exact: true }).click();
}

export async function openExample(page: Page, info: TestInfo) {
  const lang = info.project.name.endsWith('zh') ? 'zh' : 'en';
  const t = MESSAGES[lang];
  await page.setViewportSize(info.project.name.startsWith('mobile') ? { width: 390, height: 844 } : { width: 1366, height: 768 });
  await page.addInitScript(value => localStorage.setItem('ghost-rehearsal.lang', value), lang);
  await page.goto('./');
  await openEventSetup(page, t);
  await page.getByRole('dialog').getByRole('button', { name: t.eventSetup.demo, exact: true }).click();
  return t;
}

export async function pauseAt(page: Page, t: Messages, seconds: number) {
  const pause = page.getByRole('button', { name: t.dock.pause, exact: true });
  if (await pause.isVisible()) await pause.click();
  await page.getByLabel(t.dock.timeline, { exact: true }).fill(String(seconds));
}

export async function selectPacking(page: Page, t: Messages) {
  const label = (await page.locator('.react-flow__node[data-id="packing"] .card-name').textContent())!;
  const search = page.getByLabel(t.sidebar.searchLabel, { exact: true });
  if (!await search.isVisible()) await page.locator('.side-collapse').click();
  await search.fill(label);
  await page.locator('.plan-nodes').getByRole('button', { name: label, exact: true }).click();
  await expect(page.locator('.inspector:not(.collapsed)')).toBeVisible();
  await expect.poll(async () => {
    const viewport = page.locator('.react-flow__viewport');
    const before = await viewport.getAttribute('style');
    await page.waitForTimeout(150);
    return await viewport.getAttribute('style') === before;
  }).toBe(true);
}

export async function compareExample(page: Page, t: Messages) {
  if (!await page.getByRole('button', { name: t.guide.start, exact: true }).isVisible()) await page.locator('.side-collapse').click();
  await page.getByRole('button', { name: t.guide.start, exact: true }).click();
  await expect(page.locator('.people-stats b')).toHaveText(['9', '9', '276']);
  return page.getByRole('region', { name: t.guide.title, exact: true });
}
