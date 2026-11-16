import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import type { ProjectDocument } from '../../src/schemas';
import { compareExample, openExample } from '../ui/studio';

test('downloaded comparison records actual run scope independently of view and next-run settings', async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const t = await openExample(page, info);
  await compareExample(page, t);
  async function exportText(title: string) {
    await page.locator('.workspace-menu > summary').click();
    await page.getByRole('button', { name: t.header.export, exact: true }).click();
    const pending = page.waitForEvent('download');
    await page.getByRole('dialog').getByRole('button').filter({ has: page.getByText(title, { exact: true }) }).click();
    return readFile((await (await pending).path())!, 'utf8');
  }
  const project = JSON.parse(await exportText(t.dialogs.exportProject)) as ProjectDocument;
  const full = await exportText(t.evidence.comparison);
  const scenario = project.scenarios.find(s => full.includes(t.report.scenario(s.name ?? s.id, s.id)))!;
  expect(scenario).toBeDefined();
  expect(full).toContain(t.report.seed(scenario.seed));
  expect(full).toContain(t.report.window(scenario.observationCutoff, scenario.horizon));
  expect(full).toContain(`${t.review.basis}: ${t.review.cutoff}`);
  for (const side of ['A', 'B']) expect(full).toContain(`${side} · ${t.run.scope}: ${t.run.completion}`);
  await page.locator('.workspace-menu > summary').click();
  await page.getByLabel(t.run.scope, { exact: true }).selectOption('cutoff');
  await page.locator('.workspace-menu > summary').click();
  // Changing execution settings makes the old comparison stale: keep the export gate.
  await page.locator('.workspace-menu > summary').click();
  await page.getByRole('button', { name: t.header.export, exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('button').filter({ has: page.getByText(t.evidence.comparison, { exact: true }) })).toBeDisabled();
  await page.keyboard.press('Escape');
  await page.locator('.workspace-menu > summary').click();
  await page.getByLabel(t.run.scope, { exact: true }).selectOption('run_to_completion');
  await page.locator('.workspace-menu > summary').click();
  expect(await exportText(t.evidence.comparison)).toBe(full);
  await page.locator('.comparison-options > summary').click();
  await page.getByLabel(t.review.basis, { exact: true }).selectOption('completion');
  await page.locator('.comparison-options > summary').click();
  const final = await exportText(t.evidence.comparison);
  expect(final).toContain(`${t.review.basis}: ${t.review.completion}`);
  for (const side of ['A', 'B']) expect(final).toContain(`${side} · ${t.run.scope}: ${t.run.completion}`);
  // Choose cutoff statistics before execution; this independent branch does not depend on PR26.
  await page.locator('.comparison-options > summary').click();
  await page.getByLabel(t.review.basis, { exact: true }).selectOption('cutoff');
  await page.locator('.comparison-options > summary').click();
  await page.locator('.workspace-menu > summary').click();
  await page.getByLabel(t.run.scope, { exact: true }).selectOption('cutoff');
  await page.locator('.workspace-menu > summary').click();
  const worker = page.waitForEvent('worker');
  await page.getByRole('button', { name: t.run.start, exact: true }).click();
  expect((await worker).url()).toMatch(/\/assets\/worker-[^/]+\.js$/);
  await expect(page.getByRole('button', { name: t.run.start, exact: true })).toBeVisible();
  const cutoff = await exportText(t.evidence.comparison);
  for (const side of ['A', 'B']) expect(cutoff).toContain(`${side} · ${t.run.scope}: ${t.run.cutoff}`);
  expect(cutoff).toContain(t.report.seed(scenario.seed));
  expect(cutoff).toContain(t.report.window(scenario.observationCutoff, scenario.horizon));
  expect(cutoff).toContain(`${t.review.basis}: ${t.review.cutoff}`);
  await info.attach('comparison-full-cutoff-basis', { body: full, contentType: 'text/markdown' });
  await info.attach('comparison-full-final-basis', { body: final, contentType: 'text/markdown' });
  await info.attach('comparison-cutoff', { body: cutoff, contentType: 'text/markdown' });
  expect(errors).toEqual([]);
});
