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

/** Tracks the SVG and PNG Blob URLs the page creates so a test can prove that every one is released. */
async function trackImageUrls(page: Page) {
  await page.addInitScript(() => {
    const live = new Set<string>();
    const create = URL.createObjectURL.bind(URL), revoke = URL.revokeObjectURL.bind(URL);
    URL.createObjectURL = (source: Blob | MediaSource) => {
      const url = create(source);
      if (source instanceof Blob && /^image\/(?:svg\+xml|png)/.test(source.type)) live.add(url);
      return url;
    };
    URL.revokeObjectURL = (url: string) => { live.delete(url); revoke(url); };
    (window as unknown as { __imageUrls: Set<string> }).__imageUrls = live;
  });
}
const liveImageUrls = (page: Page) => page.evaluate(() => (window as unknown as { __imageUrls: Set<string> }).__imageUrls.size);
const noPageOverflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
test('the fate card opens a stage preview and downloads valid SVG and PNG files', async ({ page }, info) => {
  const external: string[] = [];
  page.on('request', request => { if (!/^(?:https?:\/\/127\.0\.0\.1|blob:|data:|about:)/.test(request.url())) external.push(request.url()); });
  const downloaded: string[] = [];
  page.on('download', file => downloaded.push(file.suggestedFilename()));
  await trackImageUrls(page);
  const t = await openExample(page, info);
  const guide = await compareExample(page, t);
  await guide.getByRole('button', { name: t.guide.actions[0], exact: true }).click();
  await guide.getByRole('button', { name: t.guide.actions[1], exact: true }).click();
  await expect(page.locator('.ghost-id code')).toHaveText('side-stream:10');
  const card = t.encore.fateCard;
  // The trigger is still the one original icon button.
  const button = page.locator('.ghost-card').getByRole('button', { name: card.button, exact: true });
  await expect(button).toBeVisible();
  await expect(button).toHaveAttribute('title', card.button);
  await expect(button).toHaveClass(/icon-btn/);
  await expect(page.locator('.ghost-card .icon-btn')).toHaveCount(1);
  expect(await noPageOverflow(page)).toBe(true);
  // It opens the preview and downloads nothing by itself.
  await button.click();
  const dialog = page.getByRole('dialog', { name: card.dialogTitle, exact: true });
  await expect(dialog).toBeVisible();
  const preview = dialog.locator('img.fate-card-preview');
  await expect(preview).toBeVisible();
  await expect(preview).toHaveAttribute('alt', /#10/);
  await expect.poll(() => preview.evaluate((image: HTMLImageElement) => [image.naturalWidth, image.naturalHeight])).toEqual([1200, 630]);
  expect(await preview.evaluate((image: HTMLImageElement) => image.src.startsWith('blob:'))).toBe(true);
  expect(await dialog.locator('script, object, embed, iframe').count()).toBe(0);
  expect(downloaded).toEqual([]);
  const svgButton = dialog.getByRole('button', { name: card.downloadSvg, exact: true });
  const pngButton = dialog.getByRole('button', { name: card.downloadPng, exact: true });
  const closeButton = dialog.getByRole('button', { name: t.common.close, exact: true });
  await expect(svgButton).toBeEnabled();
  await expect(pngButton).toBeEnabled();
  // Everything fits: no page overflow, the card and the three actions stay inside the dialog and the viewport.
  expect(await noPageOverflow(page)).toBe(true);
  const size = page.viewportSize()!;
  const frame = (await dialog.boundingBox())!;
  expect(frame.x).toBeGreaterThanOrEqual(0);
  expect(frame.x + frame.width).toBeLessThanOrEqual(size.width + 1);
  const image = (await preview.boundingBox())!;
  expect(image.x).toBeGreaterThanOrEqual(frame.x);
  expect(image.x + image.width).toBeLessThanOrEqual(frame.x + frame.width + 1);
  expect(image.width / image.height).toBeGreaterThan(1.8);
  for (const action of [svgButton, pngButton, closeButton]) {
    const box = (await action.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(frame.x - 1);
    expect(box.x + box.width).toBeLessThanOrEqual(frame.x + frame.width + 1);
  }
  expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
  // Download SVG: the exact file name, a real SVG for the tracked guest, drawn by the browser at 1200x630.
  const [svgFile] = await Promise.all([page.waitForEvent('download'), svgButton.click()]);
  expect(svgFile.suggestedFilename()).toBe('ghost-fate-card-side-stream-10.svg');
  const svg = readFileSync((await svgFile.path())!, 'utf8');
  expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true);
  for (const expected of [card.badge.toUpperCase(), 'side-stream:10', card.riftAt('03:30'), card.planA, card.planB, `${card.delta}: `, card.footnote1, card.footnote2]) expect(svg).toContain(expected);
  expect(svg).not.toContain(card.noDifference);
  expect(svg).not.toMatch(/<script|<image|href=/);
  const rendered = await page.evaluate(async markup => {
    const parsed = new DOMParser().parseFromString(markup, 'image/svg+xml');
    const picture = new Image();
    const loaded = new Promise<boolean>(resolve => { picture.onload = () => resolve(true); picture.onerror = () => resolve(false); });
    const url = URL.createObjectURL(new Blob([markup], { type: 'image/svg+xml;charset=utf-8' }));
    picture.src = url;
    const ok = await loaded;
    URL.revokeObjectURL(url);
    return { error: parsed.querySelector('parsererror') !== null, root: parsed.documentElement.localName, loaded: ok, width: picture.naturalWidth, height: picture.naturalHeight };
  }, svg);
  expect(rendered).toEqual({ error: false, root: 'svg', loaded: true, width: 1200, height: 630 });
  // Download PNG: the exact file name, the PNG signature, 2400x1260 in the IHDR chunk, and pixels the browser can decode.
  const [pngFile] = await Promise.all([page.waitForEvent('download'), pngButton.click()]);
  expect(pngFile.suggestedFilename()).toBe('ghost-fate-card-side-stream-10.png');
  const png = readFileSync((await pngFile.path())!);
  expect([...png.subarray(0, 4)]).toEqual([0x89, 0x50, 0x4e, 0x47]);
  expect([...png.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  expect(png.subarray(12, 16).toString('ascii')).toBe('IHDR');
  expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([2400, 1260]);
  const pixels = await page.evaluate(async encoded => {
    const bitmap = await createImageBitmap(new Blob([Uint8Array.from(atob(encoded), character => character.charCodeAt(0))], { type: 'image/png' }));
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width; canvas.height = bitmap.height;
    const context = canvas.getContext('2d')!;
    context.drawImage(bitmap, 0, 0);
    const colours = new Set<string>();
    for (let x = 100; x < bitmap.width; x += 211) for (let y = 100; y < bitmap.height; y += 137) colours.add(context.getImageData(x, y, 1, 1).data.join(','));
    return { width: bitmap.width, height: bitmap.height, alpha: context.getImageData(1200, 8, 1, 1).data[3], colours: colours.size };
  }, png.toString('base64'));
  expect(pixels).toMatchObject({ width: 2400, height: 1260, alpha: 255 });
  expect(pixels.colours).toBeGreaterThan(3);
  // A rapid second click does not start a second export.
  const before = downloaded.filter(name => name.endsWith('.png')).length;
  await pngButton.dblclick();
  await expect.poll(() => downloaded.filter(name => name.endsWith('.png')).length).toBe(before + 1);
  await page.waitForTimeout(500);
  expect(downloaded.filter(name => name.endsWith('.png')).length).toBe(before + 1);
  await expect(pngButton).toBeEnabled();
  expect(await noPageOverflow(page)).toBe(true);
  // When the browser cannot encode the PNG, the reason is readable and the SVG download still works.
  await page.evaluate(() => { HTMLCanvasElement.prototype.toBlob = function (callback: BlobCallback) { callback(null); }; });
  await pngButton.click();
  await expect(dialog.getByRole('alert')).toHaveText(card.pngFailed);
  await expect(pngButton).toBeEnabled();
  await expect(pngButton).toHaveText(card.downloadPng);
  const [again] = await Promise.all([page.waitForEvent('download'), svgButton.click()]);
  expect(again.suggestedFilename()).toBe('ghost-fate-card-side-stream-10.svg');
  expect(await noPageOverflow(page)).toBe(true);
  // Escape closes the preview and returns focus to the trigger; the Close button does the same.
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(button).toBeFocused();
  await button.click();
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('alert')).toHaveCount(0);
  await closeButton.click();
  await expect(dialog).toBeHidden();
  await expect(button).toBeFocused();
  // Every preview and rasterizing URL has been released, and nothing left the machine.
  await expect.poll(() => liveImageUrls(page)).toBe(0);
  expect(await noPageOverflow(page)).toBe(true);
  expect(external).toEqual([]);
});
