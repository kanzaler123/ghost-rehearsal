import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { MESSAGES } from '../../src/i18n/messages';

for (const activation of ['pointer', 'Enter', 'Space'] as const) test(`welcome starts one guide with ${activation} and reaches the real first difference`, async ({ page }, info) => {
  const lang = info.project.name.endsWith('zh') ? 'zh' : 'en', t = MESSAGES[lang];
  const workers: string[] = [], errors: string[] = [];
  page.on('request', request => { if (/\/worker-[^/]*\.js/.test(request.url())) workers.push(request.url()); });
  page.on('pageerror', error => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(lang => localStorage.setItem('ghost-rehearsal.lang', lang), lang);
  await page.goto('./');
  const start = page.getByRole('button', { name: t.redesign.begin, exact: true });
  await expect(start).toBeFocused();
  if (activation === 'pointer') await start.click(); else await start.press(activation);
  const guide = page.getByRole('region', { name: t.guide.title, exact: true });
  await expect(guide).toBeVisible();
  await page.waitForTimeout(1100);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('.context-menu[open], .workspace-menu[open], .guide-options[open], .comparison-options[open], .canvas-menu, [popover]:popover-open')).toHaveCount(0);
  expect(await page.evaluate(() => document.activeElement !== document.body && !!document.activeElement?.getClientRects().length)).toBe(true);
  await expect(page.locator('.people-stats b')).toHaveText(['12', '9', '279']);
  await guide.getByRole('button', { name: t.guide.actions[0], exact: true }).click();
  await guide.getByRole('button', { name: t.guide.actions[1], exact: true }).click();
  await expect(page.locator('.ghost-id code')).toHaveText('side-stream:10');
  await expect(page.locator('.diff-note')).toContainText('03:30');
  await expect(page.getByLabel(t.dock.timeline, { exact: true })).toHaveValue('210');
  await expect(page.locator('.ghost-futures .future-plan')).toHaveCount(2);
  await expect(page.getByRole('button', { name: t.dock.pause, exact: true })).toBeHidden();
  expect(workers).toHaveLength(1);
  expect(errors).toEqual([]);
});

for (const outcome of ['success', 'failure'] as const) test(`starting the welcome guide discards a pending import ${outcome}`, async ({ page }, info) => {
  const lang = info.project.name.endsWith('zh') ? 'zh' : 'en', t = MESSAGES[lang];
  await page.addInitScript(lang => localStorage.setItem('ghost-rehearsal.lang', lang), lang);
  await page.goto('./');
  await page.evaluate(outcome => {
    const read = File.prototype.text;
    File.prototype.text = function () {
      const file = this;
      return new Promise<string>((resolve, reject) => {
        (window as typeof window & { finishImport: () => Promise<void> }).finishImport = async () => {
          if (outcome === 'failure') reject(new Error('superseded read'));
          else resolve(await read.call(file));
        };
      });
    };
  }, outcome);
  await page.locator('input[type=file]').first().setInputFiles({ name: 'pending.json', mimeType: 'application/json', buffer: readFileSync('examples/open-house.json') });
  await page.getByRole('button', { name: t.redesign.begin, exact: true }).click();
  await expect(page.locator('.people-stats b')).toHaveText(['12', '9', '279']);
  const identity = await page.locator('.comparison-identities').textContent();
  await page.evaluate(() => (window as typeof window & { finishImport: () => Promise<void> }).finishImport());
  await page.waitForTimeout(100);
  await expect(page.getByRole('region', { name: t.guide.title, exact: true })).toBeVisible();
  await expect(page.locator('.comparison-identities')).toHaveText(identity!);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('.status-notice')).not.toHaveText(t.notices.imported);
  await expect(page.locator('.status-notice')).not.toHaveText(t.notices.fileReadFailed);
});

test('visible run checks and queue lengths share the actual population scale', async ({ page }, info) => {
  const lang = info.project.name.endsWith('zh') ? 'zh' : 'en', t = MESSAGES[lang];
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(lang => localStorage.setItem('ghost-rehearsal.lang', lang), lang);
  await page.goto('./');
  await page.getByRole('button', { name: t.redesign.begin, exact: true }).click();
  await expect(page.locator('.people-stats b')).toHaveText(['12', '9', '279']);
  const mobile = page.locator('.mobile-compare-nav');
  if (await mobile.isVisible()) await mobile.getByRole('button', { name: t.workspace.canvas, exact: true }).click();
  await expect(page.getByRole('combobox', { name: t.run.scope, exact: true })).toBeVisible();
  await expect(page.locator('.run-plan-checks > span')).toHaveCount(2);
  for (const time of ['210', '600', '0']) {
    await page.getByLabel(t.dock.timeline, { exact: true }).fill(time);
    const queues = await page.locator('.stage-card').evaluateAll(cards => cards.map(card => ({
      waiting: Number(card.querySelector('.stage-queue b')!.textContent),
      width: parseFloat((card.querySelector('.queue-load > span') as HTMLElement).style.width),
    })));
    expect(queues.length).toBeGreaterThan(0);
    for (const queue of queues) expect(queue.width).toBeCloseTo(queue.waiting / 300 * 100, 3);
  }
});
