import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import type { ProjectDocument } from '../../src/schemas';
import { MESSAGES } from '../../src/i18n/messages';

const example = JSON.parse(readFileSync(new URL('../../examples/open-house.json', import.meta.url), 'utf8')) as ProjectDocument;

for (const key of ['Space', 'Enter']) for (const initiallyPlaying of [false, true]) {
  test(`${key} selects a route guest from ${initiallyPlaying ? 'playing' : 'paused'} replay`, async ({ page }, info) => {
    const t = MESSAGES[info.project.name.endsWith('zh') ? 'zh' : 'en'];
    const project = structuredClone(example);
    // Keep real Worker route transitions visible long enough for keyboard use.
    for (const plan of project.plans) for (const edge of plan.graph.edges) {
      edge.transferDuration = { kind: 'fixed', value: 600, provenance: { kind: 'synthetic' } };
    }
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(lang => localStorage.setItem('ghost-rehearsal.lang', lang), t.lang);
    await page.goto('./');
    await page.locator('input[type=file]').first().setInputFiles({ name: 'route-keyboard.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(project)) });
    await page.getByRole('tab', { name: t.modes.Rehearse, exact: true }).click();
    const slider = page.getByLabel(t.dock.timeline, { exact: true });
    await expect(slider).toBeEnabled();
    const pause = page.getByRole('button', { name: t.dock.pause, exact: true });
    if (await pause.isVisible()) await pause.click();
    await page.getByLabel(t.dock.speed, { exact: true }).selectOption('0.5');
    const play = page.locator('.play-btn');
    // Native button activation must run once, without the global Space handler.
    await play.focus();
    await play.press('Space');
    await expect(play).toHaveAttribute('aria-label', t.dock.pause);
    await play.press('Space');
    await expect(play).toHaveAttribute('aria-label', t.dock.play);
    await slider.fill('10');
    await page.getByRole('button', { name: t.stage.views.full, exact: true }).click();
    const traveler = page.locator('.react-flow__edge circle[role=button]').first();
    await expect(traveler).toBeVisible();
    if (initiallyPlaying) {
      await play.press('Space');
      await expect(play).toHaveAttribute('aria-label', t.dock.pause);
      await expect.poll(async () => Number(await slider.inputValue())).toBeGreaterThan(10);
    }
    await traveler.focus();
    await expect(traveler).toBeFocused();
    await expect(play).toHaveAttribute('aria-label', initiallyPlaying ? t.dock.pause : t.dock.play);
    await traveler.press(key);
    await expect(traveler).toHaveAttribute('fill', 'var(--tone-track)');
    await expect(page.locator('.play-btn')).toHaveAttribute('aria-label', t.dock.play);
    const stoppedAt = await slider.inputValue();
    if (!initiallyPlaying) expect(stoppedAt).toBe('10');
    // Observe more than two 100ms playback ticks to catch unintended restart.
    await page.waitForTimeout(250);
    await expect(slider).toHaveValue(stoppedAt);
    // An unhandled Space elsewhere still controls replay.
    await page.getByRole('heading', { level: 1 }).first().click();
    await page.keyboard.press('Space');
    await expect(page.locator('.play-btn')).toHaveAttribute('aria-label', t.dock.pause);
    await page.keyboard.press('Space');
    await expect(page.locator('.play-btn')).toHaveAttribute('aria-label', t.dock.play);
    expect(errors).toEqual([]);
  });
}
