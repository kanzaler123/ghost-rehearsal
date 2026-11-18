import { readFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { expect, test as base } from '@playwright/test';
import type { Locator, Page, TestInfo } from '@playwright/test';
import { MESSAGES } from '../../src/i18n/messages';
import type { Messages } from '../../src/i18n/messages';
import type { ProjectDocument } from '../../src/schemas';

const example = JSON.parse(readFileSync(new URL('../../examples/open-house.json', import.meta.url), 'utf8')) as ProjectDocument;

const test = base.extend<{ runtimeEvidence: void }>({
  runtimeEvidence: [async ({ context, browser }, use, info) => {
    const pageErrors: string[] = [], consoleMessages: string[] = [], requests: string[] = [];
    const watch = (page: Page) => {
      page.on('pageerror', error => pageErrors.push(`${error.message}\n${error.stack ?? ''}`));
      page.on('console', message => consoleMessages.push(`${message.type()}: ${message.text()}`));
      page.on('requestfailed', request => requests.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText}`));
    };
    context.on('page', watch); context.pages().forEach(watch);
    await use();
    await info.attach('runtime-evidence', { contentType: 'application/json', body: JSON.stringify({
      browser: browser.version(), platform: process.platform, project: info.project.name,
      hasTouch: info.project.use.hasTouch ?? false, pageErrors, consoleMessages, requests,
    }, null, 2) });
    expect(pageErrors, 'All uncaught page errors, including ResizeObserver, must be fixed').toEqual([]);
  }, { auto: true }],
});

async function activate(control: Locator, info: TestInfo) {
  if (info.project.use.hasTouch) {
    const page = control.page();
    await page.evaluate(() => { (window as typeof window & { releaseTouches: boolean[] }).releaseTouches = []; });
    await control.tap();
    expect(await page.evaluate(() => (window as typeof window & { releaseTouches: boolean[] }).releaseTouches)).toContain(true);
  } else await control.click();
}

async function open(page: Page, info: TestInfo) {
  const t = MESSAGES[info.project.name.endsWith('zh') ? 'zh' : 'en'];
  await page.addInitScript(lang => localStorage.setItem('ghost-rehearsal.lang', lang), t.lang);
  await page.addInitScript(() => {
    const target = window as typeof window & { releaseTouches: boolean[] };
    target.releaseTouches = [];
    document.addEventListener('touchstart', event => target.releaseTouches.push(event.isTrusted), true);
  });
  await page.goto('./');
  return t;
}

test('saving keeps header actions and the event menu stationary', async ({ page }, info) => {
  const t = await open(page, info);
  await activate(page.getByRole('button', { name: t.eventSetup.demo, exact: true }), info);
  await expect(page.locator('.save-state')).toHaveText(t.review.draftSaved);
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  const positions = () => page.evaluate(() => ['.command-group', '.event-card summary'].map(selector => {
    const rect = document.querySelector(selector)!.getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  }));
  const before = await positions();
  await activate(page.getByTitle(t.header.saveTitle, { exact: true }), info);
  await expect(page.locator('.save-state')).toHaveText(t.header.saved);
  expect(await positions()).toEqual(before);
});

async function exportProject(page: Page, t: Messages, info: TestInfo) {
  await activate(page.getByLabel(t.header.more, { exact: true }), info);
  await activate(page.getByRole('button', { name: t.header.export, exact: true }), info);
  await expect(page.getByRole('dialog')).toBeVisible();
  const [file] = await Promise.all([
    page.waitForEvent('download'),
    activate(page.getByRole('dialog').getByRole('button').filter({ has: page.getByText(t.dialogs.exportProject, { exact: true }) }), info),
  ]);
  const text = await readFile((await file.path())!, 'utf8');
  return { text, document: JSON.parse(text) as ProjectDocument };
}

async function compareBaseline(page: Page, t: Messages, info: TestInfo) {
  await activate(page.getByRole('tab', { name: t.modes.Compare, exact: true }), info);
  await activate(page.getByRole('button', { name: t.comparePicker.title, exact: true }), info);
  const dialog = page.getByRole('dialog', { name: t.comparePicker.title, exact: true });
  await dialog.getByLabel(t.comparePicker.left, { exact: true }).selectOption('baseline');
  await dialog.getByLabel(t.comparePicker.right, { exact: true }).selectOption('alternative');
  await dialog.getByLabel(t.run.scope, { exact: true }).selectOption('cutoff');
  await activate(dialog.getByRole('button', { name: t.comparePicker.apply, exact: true }), info);
  await expect(page.locator('.people-stats b')).toHaveText(['9', '9', '276']);
}

test('create an event, edit shared parameters, save and reopen', async ({ page }, info) => {
  const t = await open(page, info);
  const dialog = page.getByRole('dialog', { name: t.eventSetup.title, exact: true });
  await dialog.getByLabel(t.dialogs.eventName, { exact: true }).fill('Release contract');
  await dialog.getByLabel(t.dialogs.count, { exact: true }).fill('12');
  await dialog.getByLabel(t.eventSetup.duration, { exact: true }).fill('45');
  await dialog.getByLabel(t.eventSetup.arrivals, { exact: true }).fill('8');
  await dialog.getByLabel(t.eventSetup.startingFlow, { exact: true }).selectOption('haunted');
  await activate(dialog.getByRole('button', { name: t.eventSetup.create, exact: true }), info);
  await expect(dialog).toHaveCount(0);
  const created = (await exportProject(page, t, info)).document;
  expect(created.scenarios[0]).toMatchObject({ name: 'Release contract', observationCutoff: 2700, arrivalStreams: [{ count: 12, end: 480 }] });
  const expand = page.getByRole('button', { name: t.studioUi.expandPlans, exact: true });
  if (await expand.isVisible()) await activate(expand, info);
  await activate(page.locator('.event-picker summary'), info);
  await activate(page.getByRole('button', { name: t.eventSetup.settings, exact: true }), info);
  const settings = page.getByRole('dialog', { name: t.dialogs.scenarioTitle, exact: true });
  await settings.getByLabel(t.dialogs.eventName, { exact: true }).fill('Edited release contract');
  await settings.getByLabel(t.dialogs.cutoff, { exact: true }).fill('60');
  await activate(settings.getByRole('button', { name: t.dialogs.applyShared(1), exact: true }), info);
  await expect(settings).toHaveCount(0);
  await activate(page.getByTitle(t.header.saveTitle, { exact: true }), info);
  const edited = await exportProject(page, t, info);
  expect(edited.document.scenarios[0].name).toBe('Edited release contract');
  expect(edited.document.scenarios[0].observationCutoff).toBe(3600);
  expect(edited.document.plans).toEqual(created.plans);
  await page.reload();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect((await exportProject(page, t, info)).text).toBe(edited.text);
});

test('open project, run real Worker, pause and seek, compare A/B, export and reopen', async ({ page }, info) => {
  const t = await open(page, info);
  const workers: string[] = [];
  page.on('worker', worker => workers.push(worker.url()));
  const chooser = page.waitForEvent('filechooser');
  await activate(page.getByRole('dialog').getByRole('button', { name: t.eventSetup.import, exact: true }), info);
  await (await chooser).setFiles({ name: 'release-example.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(example)) });
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const before = await exportProject(page, t, info);
  await activate(page.getByRole('tab', { name: t.modes.Rehearse, exact: true }), info);
  const timeline = page.getByRole('slider', { name: t.dock.timeline, exact: true });
  await expect(timeline).toBeEnabled();
  const pause = page.getByRole('button', { name: t.dock.pause, exact: true });
  await expect(pause).toBeVisible();
  await activate(pause, info);
  await timeline.fill('210');
  await expect(page.getByLabel(t.dock.play, { exact: true })).toBeVisible();
  await page.waitForTimeout(250);
  await expect(timeline).toHaveValue('210');
  await timeline.fill('60');
  await expect(timeline).toHaveValue('60');
  await compareBaseline(page, t, info);
  expect(workers.some(url => /\/assets\/worker-[^/]+\.js$/.test(url))).toBe(true);
  const exported = await exportProject(page, t, info);
  expect(exported.text).toBe(before.text);
  await activate(page.getByLabel(t.header.more, { exact: true }), info);
  const reopen = page.waitForEvent('filechooser');
  await activate(page.getByRole('button', { name: t.header.import, exact: true }), info);
  await (await reopen).setFiles({ name: 'roundtrip.json', mimeType: 'application/json', buffer: Buffer.from(exported.text) });
  await expect(page.getByRole('tab', { name: t.modes.Build, exact: true })).toHaveAttribute('aria-selected', 'true');
  expect((await exportProject(page, t, info)).text).toBe(exported.text);
  await compareBaseline(page, t, info);
});

test('native keyboard opens the add-node menu and Escape returns focus', async ({ page }, info) => {
  const t = await open(page, info);
  await activate(page.getByRole('dialog').getByRole('button', { name: t.eventSetup.demo, exact: true }), info);
  const add = page.locator('.canvas-tools').getByRole('button', { name: t.sidebar.addNode, exact: true });
  await add.focus(); await page.keyboard.press('Enter');
  const menu = page.getByRole('dialog', { name: t.sidebar.addNode, exact: true });
  await expect(menu.getByRole('textbox', { name: t.canvas.search, exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(menu).toHaveCount(0);
  await expect(add).toBeFocused();
  await page.getByRole('tab', { name: t.modes.Rehearse, exact: true }).focus();
  await page.keyboard.press('Enter');
  const timeline = page.getByRole('slider', { name: t.dock.timeline, exact: true });
  await expect(timeline).toBeEnabled();
  const pause = page.getByRole('button', { name: t.dock.pause, exact: true });
  await pause.focus(); await page.keyboard.press('Space');
  await timeline.fill('60'); await timeline.focus(); await timeline.press('ArrowRight');
  expect(Number(await timeline.inputValue())).toBeGreaterThan(60);
  await expect(page.getByLabel(t.dock.play, { exact: true })).toBeVisible();
});

test('Worker loading failure exposes one retry action and retry runs the real Worker', async ({ page }, info) => {
  const t = await open(page, info);
  await activate(page.getByRole('dialog').getByRole('button', { name: t.eventSetup.demo, exact: true }), info);
  const pattern = '**/assets/worker-*.js';
  await page.route(pattern, route => route.abort('failed'));
  await activate(page.getByRole('button', { name: t.run.start, exact: true }), info);
  const failed = page.getByRole('region', { name: t.runState.failed.label, exact: true });
  await expect(failed).toBeVisible();
  await expect(failed.getByRole('button')).toHaveCount(1);
  await expect(page.locator('.conclusion-groups')).toHaveCount(0);
  await page.unroute(pattern);
  const workers: string[] = [];
  page.on('worker', worker => workers.push(worker.url()));
  await activate(failed.getByRole('button'), info);
  await expect(failed).toHaveCount(0);
  await expect(page.getByRole('slider', { name: t.dock.timeline, exact: true })).toBeEnabled();
  expect(workers.some(url => /\/assets\/worker-[^/]+\.js$/.test(url))).toBe(true);
});
