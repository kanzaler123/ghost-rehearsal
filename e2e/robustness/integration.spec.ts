import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import type { Download } from '@playwright/test';
import type { ProjectDocument } from '../../src/schemas';
import type { JobSummary } from '../../src/experiments/robustness/types';
import { labels } from '../../src/experiments/robustness/labels';
import { openExample } from '../ui/studio';

async function downloadedJson(download: Download) {
  return JSON.parse(await readFile((await download.path())!, 'utf8'));
}

test('selected comparison plans run at cutoff and group export reproduces in the workbench', async ({ page }, info) => {
  const t = await openExample(page, info), lab = labels[t.lang];
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  if (!await page.locator('.plan-main').first().isVisible()) await page.locator('.side-collapse').click();
  await page.locator('.plan-main').nth(1).click();
  await page.locator('.workspace-menu > summary').click();
  await page.getByLabel(t.run.scope, { exact: true }).selectOption('run_to_completion');
  await page.keyboard.press('Escape');
  await page.getByRole('tab', { name: t.modes.Compare, exact: true }).click();
  const entry = page.getByRole('button', { name: lab.title, exact: true });
  await entry.click();
  const dialog = page.getByRole('dialog', { name: lab.title, exact: true });
  await expect(dialog).toBeVisible();
  expect(await dialog.locator('input:not([type=checkbox]):not([type=file]), select').evaluateAll(controls => controls.every(control => {
    const style = getComputedStyle(control);
    return control.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom) >= parseFloat(style.lineHeight) - 1;
  }))).toBe(true);
  await expect(dialog.getByLabel(lab.baseline, { exact: true })).toHaveValue('alternative');
  await expect(dialog.getByTestId('experiment-cutoff')).toContainText('1,800 s');
  await expect(dialog.locator('input[type=file]')).toHaveCount(0);
  await dialog.getByLabel(lab.seeds, { exact: true }).fill('20261114');
  const worker = page.waitForEvent('worker');
  await dialog.getByRole('button', { name: lab.start, exact: true }).click();
  expect((await worker).url()).toMatch(/\/ghost-rehearsal\/assets\/worker-[^/]+\.js$/);
  await expect(dialog.getByTestId('batch-status')).toHaveAttribute('data-status', 'complete');
  await expect(dialog.getByTestId('result-row')).toHaveCount(6);
  await expect(dialog.getByTestId('experiment-input-status')).toHaveText(lab.inputCurrent);
  const batchDownload = page.waitForEvent('download');
  await dialog.getByRole('button', { name: lab.export, exact: true }).click();
  const batch = await downloadedJson(await batchDownload);
  expect(batch.config.baselinePlanId).toBe('alternative');
  expect(batch.config.candidatePlanIds).toEqual(['baseline']);
  expect((batch.rows as JobSummary[]).every(row => row.status === 'succeeded' && row.basis === 'cutoff' && row.statisticsUntil === 1800)).toBe(true);
  await dialog.getByLabel(lab.seeds, { exact: true }).fill('20261115');
  await expect(dialog.getByTestId('experiment-input-status')).toHaveText(lab.inputChanged);
  const groupDownload = page.waitForEvent('download');
  await dialog.getByRole('button', { name: lab.groupExport, exact: true }).click();
  const groupFile = await groupDownload;
  const group = await downloadedJson(groupFile) as ProjectDocument;
  expect(group.scenarios).toHaveLength(1);
  expect(group.scenarios[0].seed).toBe(20261114);
  expect(group.plans.every(plan => plan.scenarioId === group.scenarios[0].id)).toBe(true);
  await dialog.getByTestId('experiment-input-status').scrollIntoViewIfNeeded();
  await dialog.screenshot({ path: info.outputPath('robustness-integration.png') });
  await dialog.getByRole('button', { name: t.common.closeDialog, exact: true }).click();
  await expect(entry).toBeFocused();
  await page.locator('.workspace-menu > summary').click();
  const chooseFile = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: t.header.import, exact: true }).click();
  await (await chooseFile).setFiles((await groupFile.path())!);
  await expect(page.locator('.status-notice')).toHaveText(t.notices.imported);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.locator('.workspace-menu > summary').click();
  await page.getByLabel(t.run.scope, { exact: true }).selectOption('cutoff');
  await page.keyboard.press('Escape');
  await page.getByRole('tab', { name: t.modes.Compare, exact: true }).click();
  await expect(page.locator('.outcome-table tbody tr')).toHaveCount(6);
  const summaries = group.plans.map(plan => (batch.rows as JobSummary[]).find(row => row.conditionId === 'original' && row.planId === plan.id)!);
  const expected = [
    summaries.map(row => String(row.outcomes!.completed)), summaries.map(row => String(row.outcomes!.unfinished)),
    summaries.map(row => String(row.earlyLeaving)), summaries.map(row => t.formatWait(row.averageWaiting)),
    summaries.map(row => t.formatWait(row.p90Waiting)), summaries.map(row => t.formatPersonTime(row.totalWaiting)),
  ];
  for (const [index, values] of expected.entries()) {
    const cells = page.locator('.outcome-table tbody tr').nth(index).locator('td');
    await expect(cells.nth(0)).toHaveText(values[0]);
    await expect(cells.nth(1)).toHaveText(values[1]);
  }
  expect(errors).toEqual([]);
});

test('cancel, rerun and closing the lab release its Worker and restore normal rehearsal', async ({ page }, info) => {
  const t = await openExample(page, info), lab = labels[t.lang];
  const expand = page.getByRole('button', { name: t.studioUi.expandPlans, exact: true });
  if (await expand.isVisible()) await expand.click();
  await page.locator('.event-picker summary').click();
  await page.getByRole('button', { name: t.eventSetup.settings, exact: true }).click();
  const settings = page.getByRole('dialog', { name: t.dialogs.scenarioTitle, exact: true });
  const counts = settings.getByLabel(t.dialogs.count, { exact: true });
  await expect(counts).toHaveCount(3);
  for (const count of await counts.all()) {
    await count.fill(String(Number(await count.inputValue()) * 10));
    await count.press('Tab');
  }
  await settings.getByRole('button', { name: t.dialogs.applyShared(2), exact: true }).click();
  await page.getByRole('tab', { name: t.modes.Compare, exact: true }).click();
  const entry = page.getByRole('button', { name: lab.title, exact: true });
  await entry.click();
  const dialog = page.getByRole('dialog', { name: lab.title, exact: true });
  const workers: { closed: boolean }[] = [];
  page.on('worker', worker => {
    const record = { closed: false };
    workers.push(record);
    worker.on('close', () => { record.closed = true; });
  });
  const seeds = dialog.getByLabel(lab.seeds, { exact: true });
  await seeds.fill(Array.from({ length: 30 }, (_, i) => String(20261114 + i)).join(', '));
  await dialog.getByRole('button', { name: lab.start, exact: true }).click();
  await expect.poll(() => dialog.locator('[data-testid="result-row"][data-status="succeeded"]').count()).toBeGreaterThan(0);
  await expect(dialog.locator('[data-testid="result-row"][data-status="succeeded"]').first()).toBeAttached();
  await dialog.getByRole('button', { name: lab.cancel, exact: true }).click();
  await expect(dialog.getByTestId('batch-status')).toHaveAttribute('data-status', 'partial');
  await expect.poll(() => workers[0]?.closed).toBe(true);
  const firstBatch = await dialog.getByTestId('batch-id').textContent();
  await seeds.fill('20261114');
  await dialog.getByRole('button', { name: lab.start, exact: true }).click();
  await expect(dialog.getByTestId('batch-status')).toHaveAttribute('data-status', 'complete');
  await expect(dialog.getByTestId('batch-id')).not.toHaveText(firstBatch!);
  await expect(dialog.getByTestId('result-row')).toHaveCount(6);
  await expect.poll(() => workers[1]?.closed).toBe(true);
  await seeds.fill(Array.from({ length: 30 }, (_, i) => String(20261114 + i)).join(', '));
  await dialog.getByRole('button', { name: lab.start, exact: true }).click();
  await expect.poll(() => workers.length).toBe(3);
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect.poll(() => workers[2]?.closed).toBe(true);
  await expect(entry).toBeFocused();
  const nextRun = page.waitForEvent('worker');
  await page.locator('.topbar').getByRole('button', { name: t.run.start, exact: true }).click();
  await nextRun;
  await expect(entry).toBeEnabled();
  await expect(page.locator('.outcome-table tbody tr')).toHaveCount(6);
});
