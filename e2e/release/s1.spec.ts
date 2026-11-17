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

test('replay can locate distant nodes after seeks and plan switches', async ({ page }, info) => {
  const t = MESSAGES[info.project.name.endsWith('zh') ? 'zh' : 'en'];
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  const project = JSON.parse(readFileSync(new URL('../../examples/open-house.json', import.meta.url), 'utf8')) as ProjectDocument;
  project.scenarios[0].attributes = [];
  project.scenarios[0].arrivalStreams = [{ id: 'guests', kind: 'records', provenance: { kind: 'synthetic' }, records: [0, 1, 2].map(index => ({ id: `p${index}`, arrivalTime: 0, attributes: {} })) }];
  for (const plan of project.plans) {
    plan.assignments = [];
    plan.graph = { nodes: Array.from({ length: 62 }, (_, index) => {
      const shared = { id: `n${index}`, name: `Replay node ${index}`, layout: { x: index % 10 * 350, y: Math.floor(index / 10) * 230 } };
      return index === 0 ? { ...shared, type: 'entrance' as const, arrivalStreamIds: ['guests'] }
        : index === 61 ? { ...shared, type: 'exit' as const }
          : { ...shared, type: 'service' as const, stageKey: `s${index}`, requirements: [], openWindows: [], duration: { kind: 'fixed' as const, value: 10, provenance: { kind: 'synthetic' as const } } };
    }), edges: Array.from({ length: 61 }, (_, index) => ({ id: `e${index}`, source: `n${index}`, target: `n${index + 1}` })) };
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(lang => localStorage.setItem('ghost-rehearsal.lang', lang), t.lang);
  await page.goto('./');
  await page.locator('input[type=file]').first().setInputFiles({ name: 'distant-replay.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(project)) });
  await expect(page.locator('.status-notice')).toHaveText(t.notices.imported);
  await page.getByRole('tab', { name: t.modes.Compare, exact: true }).click();
  await expect(page.locator('.people-stats b')).toHaveCount(3);
  await page.getByRole('tab', { name: t.modes.Rehearse, exact: true }).click();
  const slider = page.locator('.scrubber'), play = page.locator('.play-btn');
  if (await page.locator('.sidebar.is-rail .plan-badge.is-a').isVisible()) await page.locator('.sidebar.is-rail .plan-badge.is-a').click();
  await slider.fill('150');
  await page.getByLabel(t.sidebar.searchLabel, { exact: true }).fill('Replay node 10');
  await page.locator('.plan-nodes').getByRole('button', { name: 'Replay node 10', exact: true }).press('Enter');
  await expect.poll(async () => {
    const path = await page.locator('.react-flow__edge[data-id="e9"] .react-flow__edge-path').getAttribute('d');
    const height = await page.locator('.react-flow__node[data-id="n10"]').evaluate(element => element.getBoundingClientRect().height / Number(getComputedStyle(element.closest('.canvas-shell')!).getPropertyValue('--canvas-zoom')));
    return Math.abs(Number(path?.match(/-?\d+(?:\.\d+)?/g)?.[1]) - height / 2);
  }).toBeLessThan(0.05);
  for (const at of [900, 30]) {
    await page.getByTitle(t.stage.fit, { exact: true }).click();
    await slider.fill(String(at));
    await page.getByLabel(t.sidebar.searchLabel, { exact: true }).fill('Replay node 61');
    const target = page.locator('.plan-nodes').getByRole('button', { name: 'Replay node 61', exact: true });
    if (at === 900) await target.press('Enter'); else await target.click();
    const node = page.locator('.react-flow__node[data-id="n61"]');
    await expect(node.locator('.card-live b')).toHaveText(at === 900 ? '3' : '0');
    await expect.poll(() => node.evaluate(element => {
      const r = element.getBoundingClientRect(), c = element.closest('.canvas-shell')!.getBoundingClientRect();
      return r.left < c.right && r.right > c.left && r.top < c.bottom && r.bottom > c.top;
    })).toBe(true);
    await expect(page.locator('.react-flow__viewport')).not.toHaveAttribute('style', /NaN|Infinity/);
  }
  await play.click();
  await expect.poll(() => slider.inputValue().then(Number)).toBeGreaterThan(30);
  await page.locator('.plan-main[aria-pressed="false"]').first().click();
  await expect(slider).toHaveValue('0');
  await expect(play).toHaveAttribute('aria-label', t.dock.play);
  await page.getByLabel(t.sidebar.searchLabel, { exact: true }).fill('Replay node 61');
  await page.locator('.plan-nodes').getByRole('button', { name: 'Replay node 61', exact: true }).click();
  await expect(page.locator('.react-flow__node[data-id="n61"] .card-live b')).toHaveText('0');
  await page.getByTitle(t.stage.overview, { exact: true }).click();
  await expect(page.locator('.react-flow__viewport')).not.toHaveAttribute('style', /NaN|Infinity/);
  await page.getByRole('tab', { name: t.modes.Build, exact: true }).click();
  await expect(page.locator('.react-flow__node[data-id="n61"] .card-name')).toHaveText('Replay node 61');
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
