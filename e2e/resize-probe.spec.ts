import { expect, test } from '@playwright/test';
import { MESSAGES } from '../src/i18n/messages';

for (const variant of ['native', 'node-frame', 'renderer-frame', 'all-frame']) test(`resize probe ${variant}`, async ({ page }, info) => {
  const t = MESSAGES[info.project.name.endsWith('zh') ? 'zh' : 'en'];
  const errors: string[] = [], workers: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
  page.on('worker', worker => workers.push(worker.url()));
  await page.addInitScript(lang => localStorage.setItem('ghost-rehearsal.lang', lang), t.lang);
  await page.addInitScript(variant => {
    const Native = window.ResizeObserver;
    window.ResizeObserver = class extends Native {
      private pending = new Set<number>();
      constructor(callback: ResizeObserverCallback) {
        super((entries, observer) => {
          const nodes = entries.some(entry => entry.target.classList.contains('react-flow__node'));
          const renderer = entries.some(entry => entry.target.classList.contains('react-flow__renderer'));
          if (variant === 'all-frame' || (variant === 'node-frame' && nodes) || (variant === 'renderer-frame' && renderer)) {
            const frame = requestAnimationFrame(() => { this.pending.delete(frame); callback(entries, observer); });
            this.pending.add(frame);
          } else callback(entries, observer);
        });
      }
      disconnect() { this.pending.forEach(cancelAnimationFrame); this.pending.clear(); super.disconnect(); }
    };
  }, variant);
  await page.goto('./');
  await expect(page).toHaveURL(info.project.use.baseURL!);
  await page.getByRole('dialog').getByRole('button', { name: t.eventSetup.demo, exact: true }).click();
  await page.getByRole('tab', { name: t.modes.Compare, exact: true }).click();
  await expect(page.locator('.people-stats b')).toHaveText(['12', '9', '279']);
  expect(workers.some(url => url.startsWith(info.project.use.baseURL!) && /\/assets\/worker-[^/]+\.js$/.test(url))).toBe(true);
  expect(errors).toEqual([]);
  await page.screenshot({ path: info.outputPath('production-smoke.png'), fullPage: true });
  await info.attach('workers', { body: JSON.stringify(workers, null, 2), contentType: 'application/json' });
});
