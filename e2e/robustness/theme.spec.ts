import { expect, test } from '@playwright/test';
import { labels } from '../../src/experiments/robustness/labels';
import { openExample } from '../ui/studio';

test('lab theme keeps inputs, errors and results readable with keyboard focus at narrow widths', async ({ page }, info) => {
  const t = await openExample(page, info), lab = labels[t.lang];
  await page.getByRole('tab', { name: t.modes.Compare, exact: true }).click();
  await page.getByRole('button', { name: lab.title, exact: true }).click();
  const panel = page.getByTestId('robustness-panel');
  const seeds = panel.getByLabel(lab.seeds, { exact: true });
  const start = panel.getByRole('button', { name: lab.start, exact: true });
  await expect(panel).toHaveCSS('background-color', 'rgb(11, 17, 16)');
  await expect(panel.locator('.lab-section').first()).toHaveCSS('background-color', 'rgb(19, 30, 26)');
  await seeds.fill('1, 1');
  await expect(panel.getByRole('alert')).toBeVisible();
  await expect(start).toBeDisabled();
  // Measure rendered text/background colors for enabled inputs, notes and errors.
  const contrasts = await panel.evaluate(root => {
    const rgb = (value: string) => value.match(/[\d.]+/g)!.slice(0, 3).map(Number);
    const luminance = (color: number[]) => color.map(channel => {
      const value = channel / 255;
      return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4;
    }).reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
    return ['.lab-note', 'textarea', '.lab-error'].map(selector => {
      const element = root.querySelector(selector)!;
      const style = getComputedStyle(element);
      let background = style.backgroundColor;
      for (let parent = element.parentElement; background === 'rgba(0, 0, 0, 0)' && parent; parent = parent.parentElement) background = getComputedStyle(parent).backgroundColor;
      // Canvas resolves color-mix() / color(srgb) to RGB in every browser context.
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d')!;
      context.fillStyle = background; context.fillRect(0, 0, 1, 1);
      const bg = luminance(Array.from(context.getImageData(0, 0, 1, 1).data).slice(0, 3));
      const fg = luminance(rgb(style.color));
      return { selector, ratio: (Math.max(fg, bg) + .05) / (Math.min(fg, bg) + .05) };
    });
  });
  for (const value of contrasts) expect(value.ratio, value.selector).toBeGreaterThanOrEqual(4.5);
  await seeds.fill('20261114');
  await seeds.press('Tab');
  await expect(panel.getByLabel(`${lab.multiplier} 1`, { exact: true })).toBeFocused();
  await expect(panel.locator(':focus')).toHaveCSS('outline-style', 'solid');
  await expect(panel.locator(':focus')).toHaveCSS('outline-width', '2px');
  for (const width of [320, 390, 640, 780, 1366]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await panel.evaluate(root => root.scrollWidth <= root.clientWidth + 1), `panel overflow at ${width}`).toBe(true);
    expect(await panel.locator('input:not([type=checkbox]), select, textarea, button').evaluateAll(elements => elements.every(element => element.getBoundingClientRect().height >= 44))).toBe(true);
  }
  await page.setViewportSize(info.project.name.startsWith('mobile') ? { width: 320, height: 844 } : { width: 1366, height: 900 });
  await start.click();
  await expect(panel.getByTestId('batch-status')).toHaveAttribute('data-status', 'complete');
  await expect(panel.getByTestId('result-row')).toHaveCount(6);
  const table = panel.getByRole('region', { name: lab.rows, exact: true });
  await panel.locator('.lab-summary summary').last().focus();
  await page.keyboard.press('Tab');
  await expect(table).toBeFocused();
  await expect(table).toHaveCSS('outline-style', 'solid');
  await page.keyboard.press('ArrowRight');
  await expect.poll(() => table.evaluate(element => element.scrollLeft)).toBeGreaterThan(0);
  expect(await panel.evaluate(root => root.scrollWidth <= root.clientWidth + 1)).toBe(true);
  await panel.getByTestId('paired-summary').first().scrollIntoViewIfNeeded();
  await page.screenshot({ path: info.outputPath('lab-dark-results.png') });
  await seeds.scrollIntoViewIfNeeded();
  await page.screenshot({ path: info.outputPath('lab-dark-inputs.png') });
});
