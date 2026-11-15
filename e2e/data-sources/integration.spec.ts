import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import type { Messages } from '../../src/i18n/messages';
import type { ProjectDocument, ServiceNode } from '../../src/schemas';
import { dataSourceText } from '../../src/components/data-sources/text';
import { openExample } from '../ui/studio';

async function exportProject(page: Page, t: Messages) {
  await page.locator('.workspace-menu > summary').click();
  await page.getByRole('button', { name: t.header.export, exact: true }).click();
  const pending = page.waitForEvent('download');
  await page.getByRole('dialog').getByRole('button').filter({ has: page.getByText(t.dialogs.exportProject, { exact: true }) }).click();
  return JSON.parse(await readFile((await (await pending).path())!, 'utf8')) as ProjectDocument;
}

async function openSettings(page: Page, t: Messages) {
  await page.getByRole('tab', { name: t.modes.Build, exact: true }).click();
  const expand = page.getByRole('button', { name: t.studioUi.expandPlans, exact: true });
  if (await expand.isVisible()) await expand.click();
  await page.locator('.event-picker summary').click();
  await page.getByRole('button', { name: t.eventSetup.settings, exact: true }).click();
  return page.getByRole('dialog', { name: t.dialogs.scenarioTitle, exact: true });
}

async function upload(page: Page, editor: Locator, text: string, t: ReturnType<typeof dataSourceText>) {
  const chooser = page.waitForEvent('filechooser');
  await editor.getByLabel(t.file, { exact: true }).click();
  await (await chooser).setFiles({ name: 'synthetic-test.csv', mimeType: 'text/csv', buffer: Buffer.from(text) });
  await expect(editor.getByRole('textbox', { name: t.text, exact: true })).toHaveValue(text);
  await editor.getByRole('combobox', { name: t.unit, exact: true }).selectOption('minutes');
  await editor.getByRole('button', { name: t.preview, exact: true }).click();
  const controls = await editor.locator('input:not([type=file]), select').evaluateAll(elements => elements.map(element => {
    const style = getComputedStyle(element);
    return { contentHeight: element.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom), lineHeight: parseFloat(style.lineHeight) };
  }));
  for (const control of controls) expect(control.contentHeight).toBeGreaterThanOrEqual(control.lineHeight - 1);
}

test('arrival file import is staged, validates before outer Apply and round-trips the shared scenario', async ({ page }, info) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  const t = await openExample(page, info);
  const d = dataSourceText(info.project.name.endsWith('zh') ? 'zh' : 'en');
  const original = await exportProject(page, t);
  await page.getByRole('tab', { name: t.modes.Compare, exact: true }).click();
  await expect(page.locator('.run-state-card')).toHaveAttribute('data-state', 'complete');
  const dialog = await openSettings(page, t);
  const stream = dialog.locator('.config-card').first();
  const importer = stream.getByRole('region', { name: d.arrival, exact: true });
  await stream.locator('summary').filter({ hasText: d.arrival }).click();
  await importer.getByLabel(d.file, { exact: true }).dispatchEvent('cancel', { bubbles: true, cancelable: false });
  await expect(dialog).toBeVisible();
  const csv = 'id,arrival_time,attr:ticket,attr:visit\nfixture-1,0,regular,full\nfixture-2,1.5,vip,quick\n';
  await upload(page, importer, csv.replace('fixture-2', 'fixture-1'), d);
  await expect(importer.getByRole('button', { name: d.apply, exact: true })).toBeDisabled();
  await stream.locator('summary').filter({ hasText: d.arrival }).click();
  await dialog.getByRole('button', { name: t.dialogs.applyShared(2), exact: true }).click();
  await expect(dialog).toBeVisible();
  await expect(importer.getByRole('textbox', { name: d.text, exact: true })).toBeFocused();
  await importer.getByRole('button', { name: d.cancel, exact: true }).click();
  await upload(page, importer, csv, d);
  await importer.getByRole('combobox', { name: d.sourceKind, exact: true }).selectOption('historical');
  await importer.getByRole('textbox', { name: d.source, exact: true }).fill('Synthetic integration fixture');
  await importer.getByRole('textbox', { name: d.notes, exact: true }).fill('Not real event observations');
  await importer.getByRole('button', { name: d.apply, exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: info.outputPath('arrival-import.png') });
  await importer.getByRole('button', { name: d.apply, exact: true }).click();
  await expect(stream.getByRole('combobox', { name: t.review.pattern, exact: true })).toHaveValue('records');
  await dialog.getByRole('button', { name: t.common.cancel, exact: true }).click();
  expect(await exportProject(page, t)).toEqual(original);

  await openSettings(page, t);
  await stream.locator('summary').filter({ hasText: d.arrival }).click();
  await upload(page, importer, csv, d);
  await importer.getByRole('combobox', { name: d.sourceKind, exact: true }).selectOption('historical');
  await importer.getByRole('textbox', { name: d.source, exact: true }).fill('Synthetic integration fixture');
  await importer.getByRole('textbox', { name: d.notes, exact: true }).fill('Not real event observations');
  await importer.getByRole('button', { name: d.apply, exact: true }).click();
  await dialog.getByRole('button', { name: t.dialogs.applyShared(2), exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator('.run-state-card')).toContainText(t.runState.stale.label);
  const imported = await exportProject(page, t);
  expect(imported.plans).toEqual(original.plans);
  expect(imported.scenarios[0].arrivalStreams.slice(1)).toEqual(original.scenarios[0].arrivalStreams.slice(1));
  expect(imported.scenarios[0].arrivalStreams[0]).toMatchObject({ id: original.scenarios[0].arrivalStreams[0].id, kind: 'records', records: [{ id: 'fixture-1', arrivalTime: 0 }, { id: 'fixture-2', arrivalTime: 90 }], provenance: { kind: 'historical', source: 'Synthetic integration fixture', notes: 'Not real event observations' } });
  await expect.poll(() => page.evaluate(() => !!localStorage.getItem('ghost-rehearsal.draft.v1'))).toBe(true);
  await page.reload();
  expect(await exportProject(page, t)).toEqual(imported);
  await page.locator('.workspace-menu > summary').click();
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: t.header.import, exact: true }).click();
  await (await chooser).setFiles({ name: 'roundtrip.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(imported)) });
  expect(await exportProject(page, t)).toEqual(imported);
  await page.getByRole('tab', { name: t.modes.Compare, exact: true }).click();
  await expect(page.locator('.run-state-card')).toHaveAttribute('data-state', 'complete');
  await expect(page.locator('.run-state-card')).not.toContainText(t.runState.stale.label);
  expect(errors).toEqual([]);
});

test('service file import is one undoable change and manual edits retain source notes', async ({ page }, info) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  const t = await openExample(page, info);
  const d = dataSourceText(info.project.name.endsWith('zh') ? 'zh' : 'en');
  const original = await exportProject(page, t);
  await page.getByRole('tab', { name: t.modes.Build, exact: true }).click();
  const expand = page.getByRole('button', { name: t.studioUi.expandPlans, exact: true });
  if (await expand.isVisible()) await expand.click();
  await page.locator('.plan-node.type-service').first().click();
  const inspector = page.locator('.inspector:not(.collapsed)');
  const importer = inspector.getByRole('region', { name: d.service, exact: true });
  await inspector.locator('summary').filter({ hasText: d.service }).click();
  await upload(page, importer, 'duration\n1.5\n0.5\n1.5\n', d);
  await importer.getByRole('combobox', { name: d.sourceKind, exact: true }).selectOption('measured');
  await importer.getByRole('textbox', { name: d.source, exact: true }).fill('Synthetic stopwatch fixture');
  await importer.getByRole('textbox', { name: d.notes, exact: true }).fill('Test data only');
  await importer.getByRole('button', { name: d.apply, exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: info.outputPath('service-import.png') });
  await importer.getByRole('button', { name: d.apply, exact: true }).click();
  const service = (document: ProjectDocument) => document.plans.find(plan => plan.id === 'baseline')!.graph.nodes.find(node => node.id === 'checkin') as ServiceNode;
  expect(service(await exportProject(page, t)).duration).toEqual({ kind: 'empirical', samples: [90, 30, 90], provenance: { kind: 'measured', source: 'Synthetic stopwatch fixture', notes: 'Test data only' } });
  await page.getByRole('button', { name: t.header.undo, exact: true }).click();
  expect(await exportProject(page, t)).toEqual(original);
  await page.getByRole('button', { name: t.header.redo, exact: true }).click();
  await inspector.getByRole('combobox', { name: t.inspector.distribution, exact: true }).selectOption('fixed');
  const duration = inspector.getByLabel(t.inspector.serviceTime, { exact: true });
  await duration.fill('45.5');
  await duration.press('Enter');
  const manual = service(await exportProject(page, t)).duration;
  expect(manual).toEqual({ kind: 'fixed', value: 45.5, provenance: { kind: 'user_estimate', source: 'Synthetic stopwatch fixture', notes: 'Test data only' } });
  await inspector.locator('summary').filter({ hasText: d.sourceKind }).click();
  const source = inspector.getByRole('region', { name: d.sourceKind, exact: true });
  await source.getByRole('combobox', { name: d.sourceKind, exact: true }).selectOption('measured');
  await source.getByRole('button', { name: d.applySource, exact: true }).click();
  expect(service(await exportProject(page, t)).duration).toEqual({ ...manual, provenance: { ...manual.provenance, kind: 'measured' } });
  expect(errors).toEqual([]);
});
