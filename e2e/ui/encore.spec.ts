import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { compareExample, openExample, pauseAt } from './studio';

declare global { interface Window { __encore: { contexts: number; oscillators: number; frequencies: number[]; requests: string[] } } }

/** Counts AudioContext use and oscillator pitches without replacing the real Web Audio implementation. */
async function spyOnAudio(page: Page) {
  await page.addInitScript(() => {
    const spy = { contexts: 0, oscillators: 0, frequencies: [] as number[], requests: [] as string[] };
    window.__encore = spy;
    const Real = window.AudioContext;
    if (!Real) return;
    class Spy extends Real {
      constructor(options?: AudioContextOptions) { super(options); spy.contexts++; }
      createOscillator() {
        const oscillator = super.createOscillator();
        spy.oscillators++;
        const set = oscillator.frequency.setValueAtTime.bind(oscillator.frequency);
        oscillator.frequency.setValueAtTime = (value: number, time: number) => { spy.frequencies.push(Math.round(value * 100) / 100); return set(value, time); };
        return oscillator;
      }
    }
    window.AudioContext = Spy as typeof AudioContext;
  });
}
const audio = (page: Page) => page.evaluate(() => window.__encore);

test('sound is muted by default and the rift cue respects the selected scope', async ({ page }, info) => {
  const external: string[] = [];
  page.on('request', request => { if (!/^(?:https?:\/\/127\.0\.0\.1|blob:|data:|about:)/.test(request.url())) external.push(request.url()); });
  await spyOnAudio(page);
  const t = await openExample(page, info);
  const mobile = info.project.name.startsWith('mobile');
  const guide = await compareExample(page, t);
  await guide.getByRole('button', { name: t.guide.actions[0], exact: true }).click();
  await guide.getByRole('button', { name: t.guide.actions[1], exact: true }).click();
  await expect(page.getByLabel(t.dock.timeline, { exact: true })).toHaveValue('210');
  const toggle = page.getByRole('button', { name: t.encore.sound.label, exact: true });
  await expect(toggle).toBeVisible();
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await expect(toggle).toHaveAttribute('title', t.encore.sound.titleOff);
  expect((await audio(page)).contexts).toBe(0);

  // Muted: replay crosses the first difference at 03:30 without a sound or an AudioContext.
  const playBack = async (seconds = 200) => { await pauseAt(page, t, seconds); await page.getByRole('button', { name: t.dock.play, exact: true }).click(); };
  await playBack();
  await expect.poll(async () => Number(await page.getByLabel(t.dock.timeline, { exact: true }).inputValue())).toBeGreaterThan(215);
  await page.getByRole('button', { name: t.dock.pause, exact: true }).click();
  expect(await audio(page)).toMatchObject({ contexts: 0, oscillators: 0 });

  // Unmuted: the same crossing plays the soft two-tone rift.
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await expect(toggle).toHaveAttribute('title', t.encore.sound.titleOn);
  expect((await audio(page)).contexts).toBe(1);
  await playBack();
  await expect.poll(async () => (await audio(page)).frequencies).toEqual(expect.arrayContaining([311.13, 440]));
  await page.getByRole('button', { name: t.dock.pause, exact: true }).click();

  // The toggle must not widen the timeline or the page, including at 390px.
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const timeline = page.locator('.timeline');
  expect(await timeline.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
  const box = (await toggle.boundingBox())!;
  const size = page.viewportSize()!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(size.width);
  if (mobile) expect(box.width).toBeGreaterThanOrEqual(24);

  const search = page.locator('.ghost-stories').getByRole('searchbox');
  await search.fill('main-stream:64');
  await search.press('Enter');
  await expect(page.locator('.ghost-id code')).toHaveText('main-stream:64');
  await expect(page.locator('.diff-note')).toContainText(t.reportUi.noDivergence);
  const rifts = (await audio(page)).frequencies.filter(pitch => pitch === 311.13).length;
  await playBack(1810);
  await expect.poll(async () => Number(await page.getByLabel(t.dock.timeline, { exact: true }).inputValue())).toBeGreaterThan(1825);
  await page.getByRole('button', { name: t.dock.pause, exact: true }).click();
  expect((await audio(page)).frequencies.filter(pitch => pitch === 311.13)).toHaveLength(rifts);

  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  expect(external).toEqual([]);
});

test('reduced motion keeps the sound toggle disabled and silent', async ({ page }, info) => {
  await spyOnAudio(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const t = await openExample(page, info);
  const guide = await compareExample(page, t);
  await guide.getByRole('button', { name: t.guide.actions[0], exact: true }).click();
  await guide.getByRole('button', { name: t.guide.actions[1], exact: true }).click();
  const toggle = page.getByRole('button', { name: t.encore.sound.label, exact: true });
  await expect(toggle).toBeDisabled();
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await expect(toggle).toHaveAttribute('title', t.encore.sound.unavailable);
  expect(await audio(page)).toMatchObject({ contexts: 0, oscillators: 0 });
});

test('the fate card downloads as a real, valid SVG for the tracked ghost', async ({ page }, info) => {
  const t = await openExample(page, info);
  const guide = await compareExample(page, t);
  await guide.getByRole('button', { name: t.guide.actions[0], exact: true }).click();
  await guide.getByRole('button', { name: t.guide.actions[1], exact: true }).click();
  await expect(page.locator('.ghost-id code')).toHaveText('side-stream:10');
  const button = page.locator('.ghost-card').getByRole('button', { name: t.encore.fateCard.button, exact: true });
  await expect(button).toBeVisible();
  const [file] = await Promise.all([page.waitForEvent('download'), button.click()]);
  expect(file.suggestedFilename()).toBe('ghost-fate-card-side-stream-10.svg');
  const svg = readFileSync((await file.path())!, 'utf8');
  const card = t.encore.fateCard;
  expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true);
  for (const expected of [card.badge.toUpperCase(), 'side-stream:10', card.riftAt('03:30'), card.planA, card.planB, `${card.delta}: `, card.footnote1, card.footnote2]) expect(svg).toContain(expected);
  expect(svg).not.toContain(card.noDifference);
  expect(svg).not.toMatch(/<script|<image|href=/);
  // A browser must parse it as SVG and draw it at the declared size.
  const rendered = await page.evaluate(async markup => {
    const parsed = new DOMParser().parseFromString(markup, 'image/svg+xml');
    const image = new Image();
    const loaded = new Promise<boolean>(resolve => { image.onload = () => resolve(true); image.onerror = () => resolve(false); });
    image.src = URL.createObjectURL(new Blob([markup], { type: 'image/svg+xml;charset=utf-8' }));
    return { error: parsed.querySelector('parsererror') !== null, root: parsed.documentElement.localName, loaded: await loaded, width: image.naturalWidth, height: image.naturalHeight };
  }, svg);
  expect(rendered).toEqual({ error: false, root: 'svg', loaded: true, width: 1200, height: 630 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
