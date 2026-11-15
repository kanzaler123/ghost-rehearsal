# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: data-sources\integration.spec.ts >> arrival file import is staged, validates before outer Apply and round-trips the shared scenario
- Location: e2e\data-sources\integration.spec.ts:40:1

# Error details

```
Error: expect(locator).toHaveAttribute(expected) failed

Locator: locator('.run-state-card')
Expected: "complete"
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toHaveAttribute" locator('.run-state-card') with timeout 10000ms
  - waiting for locator('.run-state-card')
    2 × locator resolved to <section data-state="computing" aria-label="Computing" class="run-state-card state-computing">…</section>
      - unexpected value "computing"

```

```yaml
- banner:
  - strong: Ghost Rehearsal
  - text: Two-Entrance Open House · Plan A · Baseline
  - tablist "Canvas mode":
    - tab "Build"
    - tab "Rehearse"
    - tab "Two Futures" [selected]
  - button "Undo (Ctrl+Z)"
  - button "Redo (Ctrl+Shift+Z)" [disabled]
  - button "Run rehearsal"
  - button "Save in this browser (Ctrl+S)"
  - text: Draft saved
  - group
  - group "Interface language":
    - button "EN" [pressed]
    - button "中文"
- text: A · Plan A · Baseline B · Plan B · Two check-in lanes
- group: Observation cutoff · A 30:00 / B 30:00
- button "Now · 04:45"
- complementary "Read the two futures":
  - button "Collapse report" [expanded]
  - button "Plans & nodes": A · Plan A · Baseline
  - button "Start the A/B/C guide"
  - button "Robustness lab"
  - heading "Read the two futures" [level=2]
  - paragraph: Both plans use the same group of guests · B relative to A
  - text: Finished
  - strong: −2 Regression
  - text: A 43 → B 41 Average wait per guest
  - strong: −2.4 s Gain Differs below display precision
  - text: A 17.6 min → B 17.6 min Left early or turned away
  - strong: +2 Regression
  - text: A 4 → B 6 Not finished
  - strong: 0 No change
  - text: A 253 → B 253 P90 wait
  - strong: 0.0 s No change
  - text: A 25.8 min → B 25.8 min Total waiting, all guests
  - strong: −11.9 person-min Gain
  - text: A 5,288.6 person-min → B 5,276.7 person-min Resource cost
  - list:
    - listitem: Staff A 3 → B 3
    - listitem: ID scanner A 1 → B 2 +1 Cost
    - listitem: Staffed time in the window A 1.5 h → B 1.5 h
    - listitem: Device time in the window A 0.5 h → B 1.0 h +0.5 h Cost
    - listitem: Overtime A 0.0 s → B 0.0 s
  - button "Inspect the evidence"
  - group: Gains / Regressions / Costs
  - group: Sample n 300 · Observation cutoff · A 30:00 / B 30:00
  - group:
    - heading "1 What changed · 13" [level=3]
  - group:
    - heading "2 What the results did" [level=3]
  - group:
    - heading "3 Who was affected" [level=3]
    - paragraph: 300 arrived guests in both futures
    - button "12 Waited ≥60 s less"
    - button "9 Waited ≥60 s more"
    - button "279 Changed by <60 s"
    - paragraph: B − A waiting, at millisecond resolution; bins are in minutes. Negative means less waiting, not necessarily a better outcome.
    - group: Change in each guest’s wait, B − A (minutes)
    - button "7 finished only in B"
    - button "9 finished only in A"
    - paragraph: "Follow one of them:"
    - 'button "Side entrance #10 Finished only in B · 10:55 Waited less in B · −19.6 min Featured"':
      - text: "Side entrance #10 Finished only in B · 10:55 Waited less in B · −19.6 min"
      - emphasis
    - 'button "Side entrance #2 Waited more in B · +24.6 min Finished only in A · 06:40"'
  - group:
    - heading "4 Where waiting changed" [level=3]
  - group:
    - heading "5 What it costs" [level=3]
- main:
  - heading "Same guests · two arrangements" [level=1]
  - text: Run complete
  - group "Canvas arrangement":
    - button "Auto" [pressed]
    - button "Top-bottom"
    - button "Left-right"
  - group "Comparison focus":
    - button "Overview" [pressed]
    - button "Guest journey"
  - group "Canvas view":
    - button "Stages" [pressed]
    - button "Full map"
  - button "Reset view" [pressed]
  - button "Whole flow"
  - application:
    - img:
      - group "Edge from arrival to verification"
    - img:
      - group "Edge from verification to holding"
    - img:
      - group "Edge from holding to packing"
    - img:
      - group "Edge from packing to activities"
    - group:
      - strong: Arrival
      - text: 0 waiting 0 serving
      - button "Open stage Arrival"
    - group:
      - strong: Check & recheck
      - text: 46 waiting +7/min 1 serving
      - 'button "Follow Side entrance #10"': "Side entrance #10"
      - 'button "Follow Main entrance #7"'
      - 'button "Follow Main entrance #8"'
      - text: "+44"
      - button "Open stage Check & recheck"
    - group:
      - strong: Activities
      - text: 0 waiting 2 serving 6 finished
      - 'button "Follow Main entrance #14"'
      - 'button "Follow Main entrance #2"'
      - button "Open stage Activities"
    - group:
      - strong: Batch holding
      - text: 0 −1/min waiting 0 serving 30 passages
    - group:
      - text: Crowded
      - strong: Kit pickup
      - text: 20 +6/min waiting 2 serving 8 passages
      - 'button "Follow Main entrance #15"'
      - 'button "Follow Main entrance #11"'
      - 'button "Follow Side entrance #2"'
      - 'button "Follow Side entrance #15"'
      - 'button "Follow Main entrance #23"'
      - text: "+17"
    - img
    - button "Zoom In":
      - img
    - button "Zoom Out":
      - img
    - link "React Flow attribution":
      - /url: https://reactflow.dev?utm_source=attribution
      - text: React Flow
  - text: "A Plan A · Baseline Read-only Side entrance #10 · Queuing at ID check for 3.5 min"
  - application:
    - img:
      - group "Edge from arrival to verification"
    - img:
      - group "Edge from verification to holding"
    - img:
      - group "Edge from holding to packing"
    - img:
      - group "Edge from packing to activities"
    - group:
      - strong: Arrival
      - text: 0 waiting 0 serving
      - button "Open stage Arrival"
    - group:
      - strong: Check & recheck
      - text: 47 waiting +7/min 1 serving
      - 'button "Follow Side entrance #12"'
      - 'button "Follow Side entrance #14"'
      - 'button "Follow Main entrance #18"'
      - text: "+45"
      - button "Open stage Check & recheck"
    - group:
      - strong: Activities
      - text: 0 waiting 2 serving 6 finished
      - 'button "Follow Main entrance #14"'
      - 'button "Follow Main entrance #2"'
      - button "Open stage Activities"
    - group:
      - strong: Batch holding
      - text: 0 −1/min waiting 0 serving 29 passages
    - group:
      - text: Crowded
      - strong: Kit pickup
      - text: 19 +6/min waiting 2 serving 8 passages
      - 'button "Follow Side entrance #10"': "Side entrance #10"
      - 'button "Follow Main entrance #15"'
      - 'button "Follow Main entrance #11"'
      - 'button "Follow Main entrance #5"'
      - 'button "Follow Side entrance #15"'
      - text: "+16"
    - img
    - button "Zoom In":
      - img
    - button "Zoom Out":
      - img
    - link "React Flow attribution":
      - /url: https://reactflow.dev?utm_source=attribution
      - text: React Flow
  - text: B Plan B · Two check-in lanes Read-only
  - emphasis: 13 changes
  - text: "Side entrance #10 · Queuing at Kit pickup for 5.1 s"
  - button "Pause replay"
  - button "Reset replay"
  - time: Replay 04:45
  - slider "Replay timeline": "285.1"
  - time: 30:00
  - combobox "Replay speed":
    - option "0.5×"
    - option "1×" [selected]
    - option "2×"
    - option "4×"
    - option "8×"
  - text: 1× = 30 s/s
  - tablist:
    - tab "One ghost, two futures"
    - tab "Waits and evidence"
    - tab "Resource use"
    - tab "Event log"
    - note "How to read the canvas": Being served Waiting
    - button "Change an assumption"
    - button "Expand panel"
- complementary "Inspector":
  - button "Show inspector": Inspector
- status: Rehearsal complete · 300 guests · 6,241 simulation events
- alert
- contentinfo:
  - text: Local workbench
  - status: Rehearsal complete · 300 guests · 6,241 simulation events
  - text: Event flows · scenario comparison
  - button "Scope"
```

# Test source

```ts
  1   | import { readFile } from 'node:fs/promises';
  2   | import { expect, test } from '@playwright/test';
  3   | import type { Locator, Page } from '@playwright/test';
  4   | import type { Messages } from '../../src/i18n/messages';
  5   | import type { ProjectDocument, ServiceNode } from '../../src/schemas';
  6   | import { dataSourceText } from '../../src/components/data-sources/text';
  7   | import { openExample } from '../ui/studio';
  8   |
  9   | async function exportProject(page: Page, t: Messages) {
  10  |   await page.locator('.workspace-menu > summary').click();
  11  |   await page.getByRole('button', { name: t.header.export, exact: true }).click();
  12  |   const pending = page.waitForEvent('download');
  13  |   await page.getByRole('dialog').getByRole('button').filter({ has: page.getByText(t.dialogs.exportProject, { exact: true }) }).click();
  14  |   return JSON.parse(await readFile((await (await pending).path())!, 'utf8')) as ProjectDocument;
  15  | }
  16  |
  17  | async function openSettings(page: Page, t: Messages) {
  18  |   await page.getByRole('tab', { name: t.modes.Build, exact: true }).click();
  19  |   const expand = page.getByRole('button', { name: t.studioUi.expandPlans, exact: true });
  20  |   if (await expand.isVisible()) await expand.click();
  21  |   await page.locator('.event-picker summary').click();
  22  |   await page.getByRole('button', { name: t.eventSetup.settings, exact: true }).click();
  23  |   return page.getByRole('dialog', { name: t.dialogs.scenarioTitle, exact: true });
  24  | }
  25  |
  26  | async function upload(page: Page, editor: Locator, text: string, t: ReturnType<typeof dataSourceText>) {
  27  |   const chooser = page.waitForEvent('filechooser');
  28  |   await editor.getByLabel(t.file, { exact: true }).click();
  29  |   await (await chooser).setFiles({ name: 'synthetic-test.csv', mimeType: 'text/csv', buffer: Buffer.from(text) });
  30  |   await expect(editor.getByRole('textbox', { name: t.text, exact: true })).toHaveValue(text);
  31  |   await editor.getByRole('combobox', { name: t.unit, exact: true }).selectOption('minutes');
  32  |   await editor.getByRole('button', { name: t.preview, exact: true }).click();
  33  |   const controls = await editor.locator('input:not([type=file]), select').evaluateAll(elements => elements.map(element => {
  34  |     const style = getComputedStyle(element);
  35  |     return { contentHeight: element.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom), lineHeight: parseFloat(style.lineHeight) };
  36  |   }));
  37  |   for (const control of controls) expect(control.contentHeight).toBeGreaterThanOrEqual(control.lineHeight - 1);
  38  | }
  39  |
  40  | test('arrival file import is staged, validates before outer Apply and round-trips the shared scenario', async ({ page }, info) => {
  41  |   const errors: string[] = [];
  42  |   page.on('pageerror', error => errors.push(error.message));
  43  |   page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  44  |   const t = await openExample(page, info);
  45  |   const d = dataSourceText(info.project.name.endsWith('zh') ? 'zh' : 'en');
  46  |   const original = await exportProject(page, t);
  47  |   await page.getByRole('tab', { name: t.modes.Compare, exact: true }).click();
> 48  |   await expect(page.locator('.run-state-card')).toHaveAttribute('data-state', 'complete');
      |                                                 ^ Error: expect(locator).toHaveAttribute(expected) failed
  49  |   const dialog = await openSettings(page, t);
  50  |   const stream = dialog.locator('.config-card').first();
  51  |   const importer = stream.getByRole('region', { name: d.arrival, exact: true });
  52  |   await stream.locator('summary').filter({ hasText: d.arrival }).click();
  53  |   await importer.getByLabel(d.file, { exact: true }).dispatchEvent('cancel', { bubbles: true, cancelable: false });
  54  |   await expect(dialog).toBeVisible();
  55  |   const csv = 'id,arrival_time,attr:ticket,attr:visit\nfixture-1,0,regular,full\nfixture-2,1.5,vip,quick\n';
  56  |   await upload(page, importer, csv.replace('fixture-2', 'fixture-1'), d);
  57  |   await expect(importer.getByRole('button', { name: d.apply, exact: true })).toBeDisabled();
  58  |   await stream.locator('summary').filter({ hasText: d.arrival }).click();
  59  |   await dialog.getByRole('button', { name: t.dialogs.applyShared(2), exact: true }).click();
  60  |   await expect(dialog).toBeVisible();
  61  |   await expect(importer.getByRole('textbox', { name: d.text, exact: true })).toBeFocused();
  62  |   await importer.getByRole('button', { name: d.cancel, exact: true }).click();
  63  |   await upload(page, importer, csv, d);
  64  |   await importer.getByRole('combobox', { name: d.sourceKind, exact: true }).selectOption('historical');
  65  |   await importer.getByRole('textbox', { name: d.source, exact: true }).fill('Synthetic integration fixture');
  66  |   await importer.getByRole('textbox', { name: d.notes, exact: true }).fill('Not real event observations');
  67  |   await importer.getByRole('button', { name: d.apply, exact: true }).scrollIntoViewIfNeeded();
  68  |   await page.screenshot({ path: info.outputPath('arrival-import.png') });
  69  |   await importer.getByRole('button', { name: d.apply, exact: true }).click();
  70  |   await expect(stream.getByRole('combobox', { name: t.review.pattern, exact: true })).toHaveValue('records');
  71  |   await dialog.getByRole('button', { name: t.common.cancel, exact: true }).click();
  72  |   expect(await exportProject(page, t)).toEqual(original);
  73  |
  74  |   await openSettings(page, t);
  75  |   await stream.locator('summary').filter({ hasText: d.arrival }).click();
  76  |   await upload(page, importer, csv, d);
  77  |   await importer.getByRole('combobox', { name: d.sourceKind, exact: true }).selectOption('historical');
  78  |   await importer.getByRole('textbox', { name: d.source, exact: true }).fill('Synthetic integration fixture');
  79  |   await importer.getByRole('textbox', { name: d.notes, exact: true }).fill('Not real event observations');
  80  |   await importer.getByRole('button', { name: d.apply, exact: true }).click();
  81  |   await dialog.getByRole('button', { name: t.dialogs.applyShared(2), exact: true }).click();
  82  |   await expect(dialog).toHaveCount(0);
  83  |   await expect(page.locator('.run-state-card')).toContainText(t.runState.stale.label);
  84  |   const imported = await exportProject(page, t);
  85  |   expect(imported.plans).toEqual(original.plans);
  86  |   expect(imported.scenarios[0].arrivalStreams.slice(1)).toEqual(original.scenarios[0].arrivalStreams.slice(1));
  87  |   expect(imported.scenarios[0].arrivalStreams[0]).toMatchObject({ id: original.scenarios[0].arrivalStreams[0].id, kind: 'records', records: [{ id: 'fixture-1', arrivalTime: 0 }, { id: 'fixture-2', arrivalTime: 90 }], provenance: { kind: 'historical', source: 'Synthetic integration fixture', notes: 'Not real event observations' } });
  88  |   await expect.poll(() => page.evaluate(() => !!localStorage.getItem('ghost-rehearsal.draft.v1'))).toBe(true);
  89  |   await page.reload();
  90  |   expect(await exportProject(page, t)).toEqual(imported);
  91  |   await page.locator('.workspace-menu > summary').click();
  92  |   const chooser = page.waitForEvent('filechooser');
  93  |   await page.getByRole('button', { name: t.header.import, exact: true }).click();
  94  |   await (await chooser).setFiles({ name: 'roundtrip.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(imported)) });
  95  |   expect(await exportProject(page, t)).toEqual(imported);
  96  |   await page.getByRole('tab', { name: t.modes.Compare, exact: true }).click();
  97  |   await expect(page.locator('.run-state-card')).toHaveAttribute('data-state', 'complete');
  98  |   await expect(page.locator('.run-state-card')).not.toContainText(t.runState.stale.label);
  99  |   expect(errors).toEqual([]);
  100 | });
  101 |
  102 | test('service file import is one undoable change and manual edits retain source notes', async ({ page }, info) => {
  103 |   const errors: string[] = [];
  104 |   page.on('pageerror', error => errors.push(error.message));
  105 |   page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  106 |   const t = await openExample(page, info);
  107 |   const d = dataSourceText(info.project.name.endsWith('zh') ? 'zh' : 'en');
  108 |   const original = await exportProject(page, t);
  109 |   await page.getByRole('tab', { name: t.modes.Build, exact: true }).click();
  110 |   const expand = page.getByRole('button', { name: t.studioUi.expandPlans, exact: true });
  111 |   if (await expand.isVisible()) await expand.click();
  112 |   await page.locator('.plan-node.type-service').first().click();
  113 |   const inspector = page.locator('.inspector:not(.collapsed)');
  114 |   const importer = inspector.getByRole('region', { name: d.service, exact: true });
  115 |   await inspector.locator('summary').filter({ hasText: d.service }).click();
  116 |   await upload(page, importer, 'duration\n1.5\n0.5\n1.5\n', d);
  117 |   await importer.getByRole('combobox', { name: d.sourceKind, exact: true }).selectOption('measured');
  118 |   await importer.getByRole('textbox', { name: d.source, exact: true }).fill('Synthetic stopwatch fixture');
  119 |   await importer.getByRole('textbox', { name: d.notes, exact: true }).fill('Test data only');
  120 |   await importer.getByRole('button', { name: d.apply, exact: true }).scrollIntoViewIfNeeded();
  121 |   await page.screenshot({ path: info.outputPath('service-import.png') });
  122 |   await importer.getByRole('button', { name: d.apply, exact: true }).click();
  123 |   const service = (document: ProjectDocument) => document.plans.find(plan => plan.id === 'baseline')!.graph.nodes.find(node => node.id === 'checkin') as ServiceNode;
  124 |   expect(service(await exportProject(page, t)).duration).toEqual({ kind: 'empirical', samples: [90, 30, 90], provenance: { kind: 'measured', source: 'Synthetic stopwatch fixture', notes: 'Test data only' } });
  125 |   await page.getByRole('button', { name: t.header.undo, exact: true }).click();
  126 |   expect(await exportProject(page, t)).toEqual(original);
  127 |   await page.getByRole('button', { name: t.header.redo, exact: true }).click();
  128 |   await inspector.getByRole('combobox', { name: t.inspector.distribution, exact: true }).selectOption('fixed');
  129 |   const duration = inspector.getByLabel(t.inspector.serviceTime, { exact: true });
  130 |   await duration.fill('45.5');
  131 |   await duration.press('Enter');
  132 |   const manual = service(await exportProject(page, t)).duration;
  133 |   expect(manual).toEqual({ kind: 'fixed', value: 45.5, provenance: { kind: 'user_estimate', source: 'Synthetic stopwatch fixture', notes: 'Test data only' } });
  134 |   await inspector.locator('summary').filter({ hasText: d.sourceKind }).click();
  135 |   const source = inspector.getByRole('region', { name: d.sourceKind, exact: true });
  136 |   await source.getByRole('combobox', { name: d.sourceKind, exact: true }).selectOption('measured');
  137 |   await source.getByRole('button', { name: d.applySource, exact: true }).click();
  138 |   expect(service(await exportProject(page, t)).duration).toEqual({ ...manual, provenance: { ...manual.provenance, kind: 'measured' } });
  139 |   expect(errors).toEqual([]);
  140 | });
  141 |
```
