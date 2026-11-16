import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import type { ProjectDocument } from '../../src/schemas';
import { MESSAGES } from '../../src/i18n/messages';

const example = JSON.parse(readFileSync(new URL('../../examples/open-house.json', import.meta.url), 'utf8')) as ProjectDocument;

test('canvas counters and guests update after seeking and rewinding real results', async ({ page }, info) => {
  const t = MESSAGES[info.project.name.endsWith('zh') ? 'zh' : 'en'];
  const project = structuredClone(example);
  const plan = project.plans[0];
  project.plans = [plan];
  const scenario = project.scenarios.find(item => item.id === plan.scenarioId)!;
  project.scenarios = [scenario];
  scenario.assumptionOverrides = [];
  plan.staff = []; plan.deviceTypes = []; plan.assignments = [];
  plan.graph = { nodes: [
    { id: 'start', type: 'entrance', name: 'Start', layout: { x: 0, y: 0 }, arrivalStreamIds: scenario.arrivalStreams.map(stream => stream.id) },
    { id: 'service', type: 'service', name: 'Service', layout: { x: 350, y: 0 }, stageKey: 'service', duration: { kind: 'fixed', value: 1, provenance: { kind: 'synthetic' } }, requirements: [], openWindows: [] },
    { id: 'finish', type: 'exit', name: 'Finish', layout: { x: 700, y: 0 } },
  ], edges: [{ id: 'in', source: 'start', target: 'service' }, { id: 'out', source: 'service', target: 'finish' }] };
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(lang => localStorage.setItem('ghost-rehearsal.lang', lang), t.lang);
  await page.goto('./');
  await page.locator('input[type=file]').first().setInputFiles({ name: 'canvas-playback.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(project)) });
  await page.getByRole('tab', { name: t.modes.Rehearse, exact: true }).click();
  const slider = page.getByLabel(t.dock.timeline, { exact: true });
  await expect(slider).toBeEnabled();
  const pause = page.locator('.play-btn');
  await expect(pause).toHaveAttribute('aria-label', t.dock.pause);
  await pause.click();
  await expect(pause).toHaveAttribute('aria-label', t.dock.play);
  const service = page.locator('.react-flow__node[data-id="service"]');
  const finish = page.locator('.react-flow__node[data-id="finish"]');
  await slider.focus();
  await slider.press('End');
  await expect(service.locator('.is-pass b')).toHaveText('300');
  await expect(finish.locator('.is-done b')).toHaveText('300');
  await expect(service.locator('.visitor')).toHaveCount(0);
  await slider.press('Home');
  await expect(service.locator('.is-pass b')).toHaveText('0');
  await expect(finish.locator('.is-done b')).toHaveText('0');
  // Both original arrival streams start with one visitor at time zero.
  await expect(service.locator('.visitor')).toHaveCount(2);
  await slider.press('End');
  await expect(service.locator('.is-pass b')).toHaveText('300');
  await expect(finish.locator('.is-done b')).toHaveText('300');
  await expect(service.locator('.visitor')).toHaveCount(0);
  expect(errors).toEqual([]);
});
