import { expect, test, type Page } from '@playwright/test';
import { MESSAGES, type Messages } from '../../src/i18n/messages';
import type { ProjectDocument } from '../../src/schemas';
import type { SimulationRun } from '../../src/simulation/types';

const project: ProjectDocument = {
  format: 'ghost-rehearsal', schemaVersion: 1,
  scenarios: [{ id: 'scenario', seed: 42, observationCutoff: 15, horizon: 120, attributes: [], assumptionOverrides: [],
    arrivalStreams: [{ id: 'guests', kind: 'records', provenance: { kind: 'synthetic' },
      records: [0, 1, 2].map(index => ({ id: `p${index}`, arrivalTime: 0, attributes: {} })) }] }],
  plans: ['A', 'B'].map((name, index) => ({
    id: `plan-${name.toLowerCase()}`, name: `Navigation ${name}`, scenarioId: 'scenario', skills: [], deviceTypes: [], assignments: [], staff: [],
    graph: { nodes: [
      { id: 'entrance', type: 'entrance', name: 'Entrance', layout: { x: 0, y: 0 }, arrivalStreamIds: ['guests'] },
      { id: 'service', type: 'service', name: 'Service', layout: { x: 300, y: 0 }, stageKey: 'service', requirements: [], maxConcurrent: 1,
        duration: { kind: 'fixed', value: index ? 10 : 1, provenance: { kind: 'synthetic' } }, openWindows: [] },
      { id: 'exit', type: 'exit', name: 'Exit', layout: { x: 600, y: 0 } },
    ], edges: [{ id: 'in', source: 'entrance', target: 'service' }, { id: 'out', source: 'service', target: 'exit' }] },
  })),
};

async function openProject(page: Page, t: Messages) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(lang => localStorage.setItem('ghost-rehearsal.lang', lang), t.lang);
  await page.goto('./');
  await page.locator('input[type=file]').first().setInputFiles({ name: 'navigation.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(project)) });
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('tab', { name: t.modes.Build, exact: true })).toHaveAttribute('aria-selected', 'true');
}

async function choosePlan(page: Page, name: string) {
  const button = page.getByRole('button', { name: `Navigation ${name}`, exact: true });
  await button.click();
  await expect(button).toHaveAttribute('aria-pressed', 'true');
}

async function holdResult(page: Page) {
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/__hold_navigation_result', async route => {
    await gate;
    await route.fulfill({ status: 200, body: 'release' });
  });
  await page.route('**/assets/worker-*.js', async route => {
    const response = await route.fetch();
    // The native worker still computes and serializes its real response. Only delivery waits.
    const prefix = `(() => { const send = self.postMessage.bind(self); self.postMessage = (...args) => {
      fetch('/__hold_navigation_result', { method: 'POST', body: JSON.stringify(args[0]) }).then(() => send(...args));
    }; })();\n`;
    await route.fulfill({ response, body: prefix + await response.text() });
  });
  return { release, computed: () => page.waitForRequest('**/__hold_navigation_result') };
}

for (const cachedB of [false, true]) {
  test(`a completed run keeps the selected Build plan and its ${cachedB ? 'cached' : 'empty'} results`, async ({ page }, info) => {
    const t = MESSAGES[info.project.name.endsWith('zh') ? 'zh' : 'en'];
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    let simulations = 0;
    page.on('worker', worker => { if (/\/assets\/worker-[^/]+\.js$/.test(worker.url())) simulations++; });
    await openProject(page, t);
    const completed = page.locator('.metric-group.is-final .m-completed .metric-value');
    if (cachedB) {
      await choosePlan(page, 'B');
      await page.getByRole('banner').getByRole('button', { name: t.run.start, exact: true }).click();
      await expect(completed).toHaveText('1');
      await page.getByRole('tab', { name: t.modes.Build, exact: true }).click();
      await choosePlan(page, 'A');
    }
    const held = await holdResult(page);
    try {
      const computed = held.computed();
      await page.getByRole('banner').getByRole('button', { name: t.run.start, exact: true }).click();
      const actualResponse = (await computed).postDataJSON() as { runs: SimulationRun[] };
      await info.attach('actual-worker-response', { body: JSON.stringify(actualResponse), contentType: 'application/json' });
      expect(actualResponse.runs.map(run => [run.request.plan.id, run.status, run.statistics?.outcomes.completed])).toEqual([['plan-a', 'succeeded', 3]]);
      await expect(page.getByRole('button', { name: t.run.stop, exact: true })).toBeVisible();
      await choosePlan(page, 'B');
      held.release();
      await expect(page.getByRole('banner').getByRole('button', { name: t.run.start, exact: true })).toBeVisible();
      await expect(page.getByRole('tab', { name: t.modes.Build, exact: true })).toHaveAttribute('aria-selected', 'true');
      await expect(page.locator('.stage-head h1')).toHaveText('Navigation B');
      await expect(page.locator('.status-notice')).toContainText('Navigation A');
      const beforeViewing = simulations;
      if (cachedB) {
        await page.getByRole('tab', { name: t.modes.Rehearse, exact: true }).click();
        await expect(completed).toHaveText('1');
        expect(simulations).toBe(beforeViewing);
        await page.getByRole('tab', { name: t.modes.Build, exact: true }).click();
      }
      await choosePlan(page, 'A');
      await page.getByRole('tab', { name: t.modes.Rehearse, exact: true }).click();
      await expect(completed).toHaveText('3');
      expect(simulations).toBe(beforeViewing);
    } finally {
      held.release();
      await info.attach('page-errors', { body: JSON.stringify(errors), contentType: 'application/json' });
      expect(errors).toEqual([]);
    }
  });
}
