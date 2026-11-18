import { mkdir } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { MESSAGES } from '../../src/i18n/messages';
import { selectPacking } from './studio';

test('capture matching UI review states', async ({ page }, info) => {
  test.skip(!process.env.CAPTURE, 'Set CAPTURE=before or CAPTURE=after to record review images.');
  const lang = info.project.name.endsWith('zh') ? 'zh' : 'en';
  const narrow = info.project.name.startsWith('mobile');
  const t = MESSAGES[lang];
  await page.setViewportSize(narrow ? { width: 390, height: 844 } : { width: 1366, height: 768 });
  const directory = `docs/reviews/ui-visual-polish/${process.env.CAPTURE}`;
  await mkdir(directory, { recursive: true });
  const capture = async (screen: string) => {
    await page.screenshot({ path: `${directory}/${screen}-${narrow ? '390x844' : '1366x768'}-${lang}.png`, fullPage: true, animations: 'disabled' });
  };
  await page.addInitScript(value => localStorage.setItem('ghost-rehearsal.lang', value), lang);
  await page.goto('./');
  await expect(page.getByRole('dialog')).toBeVisible();
  await capture('welcome');
  await page.getByRole('dialog').getByRole('button', { name: t.eventSetup.demo, exact: true }).click();
  await selectPacking(page, t);
  await expect(page.locator('.inspector:not(.collapsed)')).toBeVisible();
  await capture('build-inspector');
  await page.getByRole('tab', { name: t.modes.Rehearse, exact: true }).click();
  await expect(page.getByLabel(t.dock.timeline, { exact: true })).toBeEnabled();
  const pause = page.getByRole('button', { name: t.dock.pause, exact: true });
  if (await pause.isVisible()) await pause.click();
  await page.getByLabel(t.dock.timeline, { exact: true }).fill('210');
  await page.getByRole('tab', { name: t.dock.tabs.journey, exact: true }).click();
  await page.locator('.ghost-stories input[type=search]').fill('side-stream:10');
  await page.locator('.people-list .people-result').filter({ has: page.locator('b').filter({ hasText: /#10$/ }) }).click();
  await capture('rehearse-tracked');
  await page.getByRole('tab', { name: t.modes.Build, exact: true }).click();
  await page.getByRole('button', { name: t.guide.start, exact: true }).click();
  await expect(page.locator('.people-stats b')).toHaveText(['9', '9', '276']);
  await capture('two-futures-overview');
  if (narrow) await capture('narrow-report');
  const guide = page.getByRole('region', { name: t.guide.title, exact: true });
  await guide.getByRole('button', { name: t.guide.actions[0], exact: true }).click();
  await guide.getByRole('button', { name: t.guide.actions[1], exact: true }).click();
  await expect(page.locator('.diff-note')).toContainText('03:30');
  await capture('journey-divergence');
  if (narrow) {
    await capture('narrow-journey');
    await page.locator('.mobile-compare-nav').getByRole('button', { name: t.workspace.canvas, exact: true }).click();
    await capture('narrow-flow');
    await guide.getByRole('button', { name: t.guide.actions[2], exact: true }).click();
    await expect(page.locator('.evidence-card')).toContainText('check-staff');
    await capture('narrow-evidence');
  }
});
