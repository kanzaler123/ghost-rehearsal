import { expect, test } from '@playwright/test';
import type { Download, Page } from '@playwright/test';
import { readFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { ProjectDocument } from '../../src/schemas';
import { MESSAGES } from '../../src/i18n/messages';
import type { JobSummary } from '../../src/experiments/robustness/types';

async function downloadedJson(download: Download) {
  const path = await download.path();
  expect(path).not.toBeNull();
  return JSON.parse(await readFile(path!, 'utf8'));
}

async function openLab(page: Page, name: string) {
  await page.goto('labs/robustness.html');
  if (name.endsWith('en')) await page.getByRole('button', { name: 'English', exact: true }).click();
  await expect(page.getByTestId('robustness-panel')).toBeVisible();
}

async function downloadAll(page: Page) {
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: /^(Export complete JSON|导出完整 JSON)$/ }).click();
  return downloadedJson(await pending);
}

async function expectNoPageOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
}

test('default 60 jobs use a real Worker, preserve adverse results and export through filters', async ({ page }, info) => {
  const errors: string[] = [];
  const workers: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('worker', worker => workers.push(worker.url()));
  await openLab(page, info.project.name);
  const storage = await page.evaluate(() => JSON.stringify(localStorage));
  await expect(page.getByTestId('estimated-jobs')).toContainText('60');
  await expectNoPageOverflow(page);
  await page.getByRole('button', { name: /^(Start experiment|开始实验)$/ }).click();
  await expect(page.getByTestId('batch-status')).toHaveAttribute('data-status', 'complete', { timeout: 90_000 });
  await expect(page.getByTestId('result-row')).toHaveCount(60);
  await expect(page.getByTestId('paired-summary')).toHaveCount(3);
  expect(workers).toHaveLength(1);
  expect(workers[0]).toContain('/src/experiments/robustness/worker.ts');
  const full = await downloadAll(page);
  expect(full.rows).toHaveLength(60);
  expect(full.status).toBe('complete');
  const rows = full.rows as JobSummary[];
  const original = rows.filter(row => row.seed === 20261114 && row.conditionId === 'original');
  expect(original.map(row => row.outcomes?.completed)).toEqual([43, 41]);
  expect(original.map(row => row.earlyLeaving)).toEqual([4, 6]);
  expect(original.map(row => row.outcomes?.unfinished)).toEqual([253, 253]);
  expect(original[0].averageWaiting).toBeCloseTo(1057.7166666667, 8);
  expect(original[1].averageWaiting).toBeCloseTo(1055.3333333333, 8);
  expect(original.map(row => row.p90Waiting)).toEqual([1547.143, 1547.143]);
  expect(rows.every(row => row.basis === 'cutoff' && row.statisticsUntil === 1800)).toBe(true);
  expect(rows.every(row => !('events' in row) && !('visitors' in row))).toBe(true);
  await page.getByLabel(/^(Condition filter|条件筛选)$/).selectOption('original');
  await page.getByLabel(/^(Candidate filter|候选筛选)$/).selectOption('alternative');
  await expect(page.getByTestId('result-row')).toHaveCount(20);
  await page.getByLabel(/^(Status filter|状态筛选)$/).selectOption('failed');
  await expect(page.getByTestId('result-row')).toHaveCount(0);
  const filteredExport = await downloadAll(page);
  expect(filteredExport.rows).toEqual(full.rows);
  await page.getByLabel(/^(Status filter|状态筛选)$/).selectOption('');
  await page.getByLabel(/^(Condition filter|条件筛选)$/).selectOption('');
  await page.getByLabel(/^(Candidate filter|候选筛选)$/).selectOption('');
  await expectNoPageOverflow(page);
  expect(await page.evaluate(() => JSON.stringify(localStorage))).toBe(storage);
  const firstRow = page.getByTestId('result-row').first();
  const details = firstRow.locator('td').last().locator('details');
  await details.locator('summary').click();
  await expect(details.locator('pre')).toBeVisible();
  await expect(details.locator('pre')).toContainText('inputKey');
  await details.locator('summary').click();
  await firstRow.locator('td').first().click();
  await expectNoPageOverflow(page);
  expect(errors).toEqual([]);
  const evidence = resolve('kiro-evidence/reviews/robustness-lab-assets');
  await mkdir(evidence, { recursive: true });
  await page.screenshot({ path: resolve(evidence, `${info.project.name}.png`), fullPage: true });
});

test('cancel terminates the real Worker, preserves partial rows and immediately reruns in a new batch', async ({ page }, info) => {
  const workers: { url: string; closed: boolean }[] = [];
  page.on('worker', worker => {
    const record = { url: worker.url(), closed: false };
    workers.push(record);
    worker.on('close', () => { record.closed = true; });
  });
  await openLab(page, info.project.name);
  // Match the integrated cancellation fixture: keep real work running long enough
  // to click Cancel after observing a completed row, even on a fast Worker.
  const project = JSON.parse(await readFile(resolve('examples/open-house.json'), 'utf8')) as ProjectDocument;
  for (const stream of project.scenarios[0].arrivalStreams) {
    if (stream.kind === 'total_in_window') stream.count *= 10;
  }
  await page.getByLabel(/^(Import project JSON|导入项目 JSON)$/).setInputFiles({ name: 'cancel-load.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(project)) });
  await page.getByLabel(/^(Seeds.*|种子（逗号或空格分隔）)$/).fill(Array.from({ length: 30 }, (_, i) => String(20261114 + i)).join(', '));
  await expect(page.getByTestId('estimated-jobs')).toContainText('180');
  await page.getByRole('button', { name: /^(Start experiment|开始实验)$/ }).click();
  await expect(page.locator('[data-testid="result-row"][data-status="succeeded"]').first()).toBeAttached();
  await page.getByRole('button', { name: /^(Cancel batch|取消批次)$/ }).click();
  await expect(page.getByTestId('batch-status')).toHaveAttribute('data-status', 'partial');
  await expect.poll(() => workers[0]?.closed).toBe(true);
  const partial = await downloadAll(page);
  expect(partial.status).toBe('partial');
  expect(partial.rows).toHaveLength(180);
  expect(partial.rows.some((row: JobSummary) => row.status === 'succeeded')).toBe(true);
  expect(partial.rows.some((row: JobSummary) => row.status === 'canceled' || row.status === 'not-run')).toBe(true);
  const completed = partial.rows.filter((row: JobSummary) => row.status === 'succeeded');
  expect(completed.length).toBeLessThan(180);
  await page.getByLabel(/^(Seeds.*|种子（逗号或空格分隔）)$/).fill('20261114');
  await page.getByRole('button', { name: /^(Start experiment|开始实验)$/ }).click();
  await expect(page.getByTestId('batch-status')).toHaveAttribute('data-status', 'complete');
  const rerun = await downloadAll(page);
  expect(rerun.batchId).not.toBe(partial.batchId);
  expect(rerun.rows).toHaveLength(6);
  expect(rerun.rows.every((row: JobSummary) => row.batchId === rerun.batchId && row.status === 'succeeded')).toBe(true);
  expect(workers).toHaveLength(2);
  expect(workers.every(worker => worker.closed)).toBe(true);
  await page.getByRole('button', { name: /^(Start experiment|开始实验)$/ }).click();
  await expect.poll(() => workers.length).toBe(3);
  await page.goto('./');
  await expect.poll(() => workers[2]?.closed).toBe(true);
});

test('a group export imports into the original workbench and reproduces its cutoff results', async ({ page }, info) => {
  const t = MESSAGES[info.project.name.endsWith('zh') ? 'zh' : 'en'];
  await openLab(page, info.project.name);
  await page.getByLabel(/^(Seeds.*|种子（逗号或空格分隔）)$/).fill('20261114');
  await page.getByRole('button', { name: /^(Start experiment|开始实验)$/ }).click();
  await expect(page.getByTestId('batch-status')).toHaveAttribute('data-status', 'complete');
  const batch = await downloadAll(page);
  const groupDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: /^(Export group project|导出单组项目)$/ }).click();
  const group = await downloadedJson(await groupDownload);
  expect(group.format).toBe('ghost-rehearsal');
  expect(group.scenarios).toHaveLength(1);
  expect(group.plans).toHaveLength(2);
  expect(group.plans.every((plan: { scenarioId: string }) => plan.scenarioId === group.scenarios[0].id)).toBe(true);
  const planIds: string[] = [batch.config.baselinePlanId, ...batch.config.candidatePlanIds];
  const summaries = planIds.map(id => (batch.rows as JobSummary[]).find(row => row.conditionId === 'original' && row.planId === id)!);
  await page.addInitScript(lang => localStorage.setItem('ghost-rehearsal.lang', lang), t.lang);
  await page.goto('./');
  await page.locator('input[type=file]').first().setInputFiles({ name: 'robustness-group.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(group)) });
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const worker = page.waitForEvent('worker');
  await page.getByRole('tab', { name: t.modes.Compare, exact: true }).click();
  expect((await worker).url()).toContain('/src/simulation/worker.ts');
  await expect(page.locator('.outcome-table tbody tr')).toHaveCount(6);
  const expected = [
    summaries.map(row => String(row.outcomes!.completed)),
    summaries.map(row => String(row.outcomes!.unfinished)),
    summaries.map(row => String(row.earlyLeaving)),
    summaries.map(row => t.formatWait(row.averageWaiting)),
    summaries.map(row => t.formatWait(row.p90Waiting)),
    summaries.map(row => t.formatPersonTime(row.totalWaiting)),
  ];
  for (const [i, values] of expected.entries()) {
    const cells = page.locator('.outcome-table tbody tr').nth(i).locator('td');
    await expect(cells.nth(0)).toHaveText(values[0]);
    await expect(cells.nth(1)).toHaveText(values[1]);
  }
});




test('imports an existing third plan, rejects duplicate seeds and invalid graphs without replacing valid input', async ({ page }, info) => {
  await openLab(page, info.project.name);
  const project = JSON.parse(await readFile(resolve('examples/open-house.json'), 'utf8')) as ProjectDocument;
  project.plans.push({ ...structuredClone(project.plans[0]), id: 'existing-c', name: 'Existing C' });
  const fileInput = page.getByLabel(/^(Import project JSON|导入项目 JSON)$/);
  await fileInput.setInputFiles({ name: 'three-plans.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(project)) });
  await page.getByLabel(/^(Baseline plan|基线方案)$/).selectOption('baseline');
  await page.getByRole('checkbox', { name: 'Existing C · open-house', exact: true }).check();
  await expect(page.getByTestId('estimated-jobs')).toContainText('90');
  const seeds = page.getByLabel(/^(Seeds.*|种子（逗号或空格分隔）)$/);
  await seeds.fill('20261114, 20261114');
  await expect(page.getByRole('alert')).toContainText('Duplicate seeds');
  await expect(page.getByRole('button', { name: /^(Start experiment|开始实验)$/ })).toBeDisabled();
  await seeds.fill('20261114,');
  await expect(page.getByTestId('estimated-jobs')).toContainText('9');
  await fileInput.setInputFiles({ name: 'invalid.json', mimeType: 'application/json', buffer: Buffer.from('{invalid') });
  await expect(page.getByRole('alert')).toContainText('invalid_json');
  await expect(page.getByRole('checkbox', { name: 'Existing C · open-house', exact: true })).toBeChecked();
  await expect(seeds).toHaveValue('20261114,');
  project.plans[0].graph.edges[0].target = 'missing-node';
  await fileInput.setInputFiles({ name: 'bad-graph.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(project)) });
  await expect(page.getByRole('alert')).toContainText('unknown_edge_target');
  await expect(page.getByRole('checkbox', { name: 'Existing C · open-house', exact: true })).toBeChecked();
  await expect(seeds).toHaveValue('20261114,');
  await page.getByRole('button', { name: /^(Start experiment|开始实验)$/ }).click();
  await expect(page.getByTestId('batch-status')).toHaveAttribute('data-status', 'complete');
  const result = await downloadAll(page);
  expect(result.rows).toHaveLength(9);
  const cloneGroups = result.aggregates.filter((group: { candidatePlanId: string }) => group.candidatePlanId === 'existing-c');
  expect(cloneGroups).toHaveLength(3);
  expect(cloneGroups.every((group: { validPairs: number; deltas: Record<string, { median: number }> }) => group.validPairs === 1 && Object.values(group.deltas).every(delta => delta.median === 0))).toBe(true);
});
