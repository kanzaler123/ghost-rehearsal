import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { MESSAGES } from '../../src/i18n/messages';
import { labels } from '../../src/experiments/robustness/labels';
import { openExample } from '../ui/studio';
import type { ProjectDocument } from '../../src/schemas';

test('single-plan stories follow statistics while current queues follow replay', async ({ page }, info) => {
  const t = MESSAGES[info.project.name.endsWith('zh') ? 'zh' : 'en'];
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  const project: ProjectDocument = { format: 'ghost-rehearsal', schemaVersion: 1,
    scenarios: [{ id: 'scenario', seed: 42, observationCutoff: 15, horizon: 200, attributes: [], assumptionOverrides: [],
      arrivalStreams: [{ id: 'guests', kind: 'records', provenance: { kind: 'synthetic' }, records: [0, 1, 2].map(index => ({ id: `p${index}`, arrivalTime: 0, attributes: {} })) }] }],
    plans: [{ id: 'constructor', name: 'Story boundary', scenarioId: 'scenario', skills: [], deviceTypes: [], assignments: [], staff: [],
      graph: { nodes: [
        { id: 'entrance', type: 'entrance', name: 'Entrance', layout: { x: 0, y: 0 }, arrivalStreamIds: ['guests'] },
        { id: 'service', type: 'service', name: 'Service', layout: { x: 300, y: 0 }, stageKey: 'service', requirements: [], maxConcurrent: 1,
          duration: { kind: 'fixed', value: 10, provenance: { kind: 'synthetic' } }, openWindows: [] },
        { id: 'exit', type: 'exit', name: 'Exit', layout: { x: 600, y: 0 } },
      ], edges: [{ id: 'in', source: 'entrance', target: 'service' }, { id: 'out', source: 'service', target: 'exit' }] } }],
  };
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(lang => localStorage.setItem('ghost-rehearsal.lang', lang), t.lang);
  await page.goto('./');
  await page.locator('input[type=file]').first().setInputFiles({ name: 'stories.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(project)) });
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByLabel(t.run.scope, { exact: true }).selectOption('run_to_completion');
  await page.getByRole('tab', { name: t.modes.Rehearse, exact: true }).click();
  const slider = page.getByLabel(t.dock.timeline, { exact: true });
  await expect(slider).toBeEnabled(); await slider.fill('5');
  const longest = page.locator('.report-picks .story-pick').filter({ hasText: t.journey.picks.longest });
  const queued = page.locator('.report-picks .story-pick').filter({ hasText: t.journey.picks.queuedNow });
  await expect(longest.locator('b')).toHaveText(t.formatWait(15));
  await expect(queued.locator('b')).toHaveText(t.formatWait(5));
  await expect(page.locator('.report-picks .story-pick').filter({ hasText: t.journey.picks.unfinished })).toHaveCount(1);
  await page.getByLabel(t.review.basis, { exact: true }).selectOption('completion');
  await expect(longest.locator('b')).toHaveText(t.formatWait(20));
  await expect(queued.locator('b')).toHaveText(t.formatWait(5));
  await expect(page.locator('.report-picks .story-pick').filter({ hasText: t.journey.picks.unfinished })).toHaveCount(0);
  await expect(slider).toHaveValue('5');
  await slider.fill('25');
  await expect(queued).toHaveCount(0);
  await page.getByLabel(t.review.basis, { exact: true }).selectOption('cutoff');
  await expect(longest.locator('b')).toHaveText(t.formatWait(15));
  expect(errors).toEqual([]);
});

for (const asset of ['js', 'css']) test(`analysis loads only on demand and a failed ${asset} load can be retried`, async ({ page }, info) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  let requested = 0, blocked = true;
  await page.route(new RegExp(`/assets/(?:RobustnessPanel|styles)-[^/]+\\.${asset}$`), route => { requested++; return blocked ? route.abort() : route.continue(); });
  const t = await openExample(page, info), lab = labels[t.lang];
  expect(requested).toBe(0);
  await page.getByRole('tab', { name: t.modes.Compare, exact: true }).click();
  await page.getByRole('button', { name: lab.title, exact: true }).click();
  const dialog = page.getByRole('dialog', { name: lab.title, exact: true });
  await expect(dialog.getByRole('alert')).toContainText(t.analysisLoading.failed);
  blocked = false;
  await dialog.getByRole('button', { name: t.analysisLoading.retry, exact: true }).click();
  await expect(dialog.getByLabel(lab.seeds, { exact: true })).toBeVisible();
  await expect(dialog.locator('.lab-config-grid')).toHaveCSS('display', 'grid');
  expect(requested).toBeGreaterThanOrEqual(2);
  await dialog.getByRole('button', { name: t.common.closeDialog, exact: true }).click();
  await expect(page.getByRole('button', { name: lab.title, exact: true })).toBeFocused();
  expect(errors).toEqual([]);
});

for (const motion of ['no-preference', 'reduce'] as const) test(`hidden comparison canvases keep finite viewports with motion=${motion}`, async ({ page }, info) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.emulateMedia({ reducedMotion: motion });
  const t = await openExample(page, info);
  await page.setViewportSize({ width: 390, height: 844 });
  for (let iteration = 0; iteration < 3; iteration++) {
    await page.getByRole('tab', { name: t.modes.Compare, exact: true }).click();
    await expect(page.locator('.people-stats b')).toHaveCount(3);
    await expect(page.locator('.canvas-shell').first()).toBeHidden();
    await page.getByRole('tab', { name: t.modes.Build, exact: true }).click();
    await expect(page.locator('.canvas-shell')).toBeVisible();
    await page.getByTitle(t.stage.overview, { exact: true }).click();
    await expect.poll(() => page.locator('.react-flow__viewport').getAttribute('style')).not.toContain('NaN');
    await expect.poll(() => page.locator('.canvas-shell').evaluate(element => Number(getComputedStyle(element).getPropertyValue('--canvas-zoom')))).toBeGreaterThan(0);
    await expect.poll(async () => {
      const before = await page.locator('.react-flow__viewport').getAttribute('style');
      await page.waitForTimeout(150);
      return before === await page.locator('.react-flow__viewport').getAttribute('style');
    }).toBe(true);
    await expect(page.locator('.react-flow__viewport')).not.toHaveAttribute('style', /NaN|Infinity/);
  }
  expect(errors).toEqual([]);
});

test('empirical playback can pause, seek, switch plans and replace the project without resize errors', async ({ page }, info) => {
  const t = MESSAGES[info.project.name.endsWith('zh') ? 'zh' : 'en'];
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  const project = JSON.parse(readFileSync(new URL('../../examples/open-house.json', import.meta.url), 'utf8')) as ProjectDocument;
  for (const plan of project.plans) {
    const service = plan.graph.nodes.find(node => node.type === 'service')!;
    service.duration = { kind: 'empirical', samples: Array.from({ length: 10000 }, (_, i) => ((i * 7919) % 997) / 100 + .00049), provenance: { kind: 'synthetic' } };
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(lang => localStorage.setItem('ghost-rehearsal.lang', lang), t.lang);
  await page.goto('./');
  await page.locator('input[type=file]').first().setInputFiles({ name: 'empirical.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(project)) });
  await expect(page.locator('.status-notice')).toHaveText(t.notices.imported);
  await page.getByRole('tab', { name: t.modes.Compare, exact: true }).click();
  await expect(page.locator('.people-stats b')).toHaveCount(3);
  await page.getByRole('tab', { name: t.modes.Rehearse, exact: true }).click();
  const slider = page.locator('.scrubber'), play = page.locator('.play-btn');
  const startPlayback = async () => {
    await slider.fill('150');
    await play.click();
    await expect(play).toHaveAttribute('aria-label', t.dock.pause);
    await expect.poll(() => slider.inputValue().then(Number)).toBeGreaterThan(156);
    expect(Number(await slider.inputValue())).toBeLessThan(Number(await slider.getAttribute('max')));
  };
  await startPlayback();
  await page.waitForTimeout(2000);
  await play.click();
  await expect(play).toHaveAttribute('aria-label', t.dock.play);
  const paused = await slider.inputValue();
  await page.waitForTimeout(250);
  await expect(slider).toHaveValue(paused);
  await startPlayback();
  await slider.fill('900');
  await expect(slider).toHaveValue('900');
  await expect(play).toHaveAttribute('aria-label', t.dock.play);
  if (await page.locator('.sidebar.is-rail .plan-badge.is-a').isVisible()) await page.locator('.sidebar.is-rail .plan-badge.is-a').click();
  const otherPlan = page.locator('.plan-main[aria-pressed="false"]').first();
  await expect(otherPlan).toBeVisible();
  await startPlayback();
  await otherPlan.click();
  await expect(slider).toHaveValue('0');
  await expect(play).toHaveAttribute('aria-label', t.dock.play);
  await page.getByRole('tab', { name: t.modes.Compare, exact: true }).click();
  await expect(page.locator('.people-stats b')).toHaveCount(3);
  await page.getByRole('tab', { name: t.modes.Build, exact: true }).click();
  project.plans = [project.plans[0]];
  project.plans[0].graph = { nodes: [], edges: [] };
  await page.locator('input[type=file]').first().setInputFiles({ name: 'replacement.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(project)) });
  await expect(page.locator('.canvas-empty')).toBeVisible();
  await page.waitForTimeout(1000);
  expect(errors).toEqual([]);
});
