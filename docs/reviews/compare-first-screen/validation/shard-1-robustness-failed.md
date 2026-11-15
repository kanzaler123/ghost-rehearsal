# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: robustness\integration.spec.ts >> cancel, rerun and closing the lab release its Worker and restore normal rehearsal
- Location: e2e\robustness\integration.spec.ts:84:1

# Error details

```
TimeoutError: locator.click: Timeout 15000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: 'Robustness lab', exact: true })

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - banner [ref=e4]:
    - strong [ref=e13]: Ghost Rehearsal
    - generic "Two-Entrance Open House · Plan A · Baseline" [ref=e14]
    - tablist "Canvas mode" [ref=e15]:
      - tab "Build" [disabled] [selected] [ref=e16]
      - tab "Rehearse" [disabled] [ref=e22]
      - tab "Two Futures" [disabled] [ref=e26]
    - generic [ref=e30]:
      - button "Undo (Ctrl+Z)" [disabled] [ref=e31]
      - button "Redo (Ctrl+Shift+Z)" [disabled] [ref=e35]
      - button "Stop" [ref=e40] [cursor=pointer]
    - generic [ref=e43]:
      - button "Save in this browser (Ctrl+S)" [ref=e44] [cursor=pointer]
      - generic [ref=e49]: Draft saved
      - group [ref=e50]:
        - generic "More options" [ref=e51] [cursor=pointer]
        - option "Stop at cutoff" [selected]
        - option "Run to completion"
    - group "Interface language" [ref=e56]:
      - button "EN" [pressed] [ref=e57] [cursor=pointer]
      - button "中文" [ref=e58] [cursor=pointer]
  - generic [ref=e59]:
    - complementary "Plans & nodes" [ref=e60]:
      - button "Collapse plans" [expanded] [ref=e61] [cursor=pointer]: Collapse sidebar
      - generic [ref=e65]:
        - generic [ref=e66]: Event
        - generic [ref=e67]:
          - combobox "Active event" [disabled] [ref=e68] [cursor=pointer]:
            - option "Two-Entrance Open House" [selected]
          - group [ref=e69]:
            - generic "Event settings" [ref=e70] [cursor=pointer]
        - button "Guests & arrivals 3000" [ref=e75] [cursor=pointer]:
          - generic [ref=e81]: Guests & arrivals
          - generic [ref=e82]: "3000"
        - button "Staff & devices 4" [ref=e83] [cursor=pointer]:
          - generic [ref=e89]: Staff & devices
          - generic [ref=e90]: "4"
      - generic [ref=e91]:
        - generic [ref=e92]:
          - heading "Plans" [level=2] [ref=e93]
          - group [ref=e94]:
            - generic "Plan and activity actions" [ref=e95] [cursor=pointer]
        - list [ref=e100]:
          - listitem [ref=e101]:
            - button "Plan A · Baseline" [pressed] [ref=e102] [cursor=pointer]:
              - generic [ref=e103]: A
              - generic [ref=e104]:
                - generic [ref=e105]: Plan A · Baseline
                - generic [ref=e106]: Two-Entrance Open House
                - generic "Editing" [ref=e107]
          - listitem [ref=e112]:
            - button "Plan B · Two check-in lanes" [ref=e113] [cursor=pointer]:
              - generic [ref=e114]: B
              - generic [ref=e115]:
                - generic [ref=e116]: Plan B · Two check-in lanes
                - generic [ref=e117]: Two-Entrance Open House
      - generic [ref=e118]:
        - generic [ref=e119]:
          - heading "Flow nodes17" [level=2] [ref=e120]
          - button "Add node" [ref=e121] [cursor=pointer]
        - textbox "Search nodes" [ref=e124]:
          - /placeholder: Search nodes…
        - generic [ref=e125]:
          - button "Main entrance" [ref=e126] [cursor=pointer]
          - button "Side entrance" [ref=e131] [cursor=pointer]
          - button "Entry merge" [ref=e136] [cursor=pointer]
          - button "Split by ticket" [ref=e142] [cursor=pointer]
          - button "ID check" [ref=e146] [cursor=pointer]
          - button "After-check merge" [ref=e151] [cursor=pointer]
          - button "Needs recheck?" [ref=e157] [cursor=pointer]
          - button "Manual recheck" [ref=e161] [cursor=pointer]
          - button "Batch holding" [ref=e166] [cursor=pointer]
          - button "Kit pickup" [ref=e171] [cursor=pointer]
          - button "Visit choice" [ref=e176] [cursor=pointer]
          - button "Guided tour" [ref=e180] [cursor=pointer]
          - button "Completed" [ref=e185] [cursor=pointer]
          - button "Left early" [ref=e190] [cursor=pointer]
          - button "Check & recheck" [ref=e195] [cursor=pointer]
          - button "Arrival" [ref=e207] [cursor=pointer]
          - button "Activities" [ref=e219] [cursor=pointer]
      - generic [ref=e231]:
        - button "Start the A/B/C guide" [disabled] [ref=e232]
        - button "Templates" [disabled] [ref=e238]:
          - text: Templates
          - generic [aria-hidden] [ref=e241]: ↗
    - main [ref=e242]:
      - generic [ref=e243]:
        - generic [ref=e244]:
          - heading "Plan A · Baseline" [level=1]
          - generic [ref=e246]: 17 nodes · 15 routes
        - generic [ref=e247]:
          - button "Checks passed" [ref=e248] [cursor=pointer]
          - button "Tidy by stage" [disabled] [ref=e252]
          - button "Reset view" [pressed] [ref=e257] [cursor=pointer]
          - button "Whole flow" [ref=e262] [cursor=pointer]
          - generic [ref=e269]: The rehearsal is running; you can stop it at any time.
      - region "Computing" [ref=e270]:
        - generic [ref=e271]:
          - generic "Computing" [ref=e272]
          - paragraph [ref=e281]: The rehearsal is running; you can stop it at any time.
        - button "Stop rehearsal" [ref=e283] [cursor=pointer]
      - generic [ref=e286]:
        - application [ref=e287]:
          - generic [ref=e289] [cursor=pointer]:
            - generic:
              - generic:
                - img:
                  - group "Edge from main to intake" [ref=e290]
                - img:
                  - group "Edge from side to intake" [ref=e293]
                - img:
                  - group "Edge from intake to tickets"
                - img:
                  - group "Edge from tickets to checked" [ref=e296]:
                    - generic [ref=e299]: vip
                - img:
                  - group "Edge from tickets to checkin" [ref=e301]:
                    - generic [ref=e304]: regular
                - img:
                  - group "Edge from checkin to checked"
                - img:
                  - group "Edge from checked to review"
                - img:
                  - group "Edge from review to recheck" [ref=e306]:
                    - generic [ref=e309]: again
                - img:
                  - group "Edge from recheck to review" [ref=e311]
                - img:
                  - group "Edge from review to holding" [ref=e314]:
                    - generic [ref=e317]: forward
                - img:
                  - group "Edge from holding to packing"
                - img:
                  - group "Edge from packing to visit-choice" [ref=e319]
                - img:
                  - group "Edge from visit-choice to orientation" [ref=e322]:
                    - generic [ref=e325]: full
                - img:
                  - group "Edge from visit-choice to leave" [ref=e327]:
                    - generic [ref=e330]: quick
                - img:
                  - group "Edge from orientation to finish" [ref=e332]
              - generic:
                - button "Check & recheck 4 steps" [ref=e336]:
                  - generic [ref=e347]: Check & recheck
                  - generic [ref=e348]: 4 steps
                - button "Arrival 4 steps" [ref=e350]:
                  - generic [ref=e361]: Arrival
                  - generic [ref=e362]: 4 steps
                - button "Activities 4 steps" [ref=e364]:
                  - generic [ref=e375]: Activities
                  - generic [ref=e376]: 4 steps
                - group [ref=e377]:
                  - generic [ref=e378]:
                    - generic [ref=e379]: Entrance
                    - strong [ref=e385]: Main entrance
                    - generic [ref=e386]: 1 arrival stream
                - group [ref=e388]:
                  - generic [ref=e389]:
                    - generic [ref=e390]: Entrance
                    - strong [ref=e396]: Side entrance
                    - generic [ref=e397]: 1 arrival stream
                - group [ref=e399]:
                  - generic [ref=e400]:
                    - generic [ref=e402]: Merge
                    - strong [ref=e409]: Entry merge
                    - generic [ref=e410]: Merges by priority
                - group [ref=e412]:
                  - generic [ref=e413]:
                    - generic [ref=e415]: Decision
                    - strong [ref=e420]: Split by ticket
                    - generic [ref=e421]: 2 branches
                    - generic "vip" [ref=e422]
                    - generic "regular" [ref=e423]
                - group [ref=e424]:
                  - generic [ref=e425]:
                    - generic [ref=e427]: Service
                    - strong [ref=e433]: ID check
                    - generic [ref=e434]: 30s · 1 staff + 1 device
                - group [ref=e436]:
                  - generic [ref=e437]:
                    - generic [ref=e439]: Merge
                    - strong [ref=e446]: After-check merge
                    - generic [ref=e447]: Merges by priority
                - group [ref=e449]:
                  - generic [ref=e450]:
                    - generic [ref=e452]: Decision
                    - strong [ref=e457]: Needs recheck?
                    - generic [ref=e458]: 2 branches · loop guard
                    - generic "again" [ref=e459]
                    - generic "forward" [ref=e460]
                - group [ref=e461]:
                  - generic [ref=e462]:
                    - generic [ref=e464]: Service
                    - strong [ref=e470]: Manual recheck
                    - generic [ref=e471]: 20s · 1 staff
                - group [ref=e473]:
                  - generic [ref=e474]:
                    - generic [ref=e476]: Waiting area
                    - strong [ref=e482]: Batch holding
                    - generic [ref=e483]: 10 per batch
                - group [ref=e485]:
                  - generic [ref=e486]:
                    - generic [ref=e488]: Service
                    - strong [ref=e494]: Kit pickup
                    - generic [ref=e495]: 45s · 1 staff
                - group [ref=e497]:
                  - generic [ref=e498]:
                    - generic [ref=e500]: Decision
                    - strong [ref=e505]: Visit choice
                    - generic [ref=e506]: 2 branches
                    - generic "full" [ref=e507]
                    - generic "quick" [ref=e508]
                - group [ref=e509]:
                  - generic [ref=e510]:
                    - generic [ref=e512]: Service
                    - strong [ref=e518]: Guided tour
                    - generic [ref=e519]: 30s · 4 concurrent
                - group [ref=e521]:
                  - generic [ref=e522]:
                    - generic [ref=e524]: Exit
                    - strong [ref=e530]: Completed
                    - generic [ref=e531]: Completes flow
                - group [ref=e532]:
                  - generic [ref=e533]:
                    - generic [ref=e535]: Exit
                    - strong [ref=e541]: Left early
                    - generic [ref=e542]: Leaves early
          - generic "Control Panel" [ref=e543]:
            - button "Zoom In" [ref=e544] [cursor=pointer]
            - button "Zoom Out" [ref=e547] [cursor=pointer]
          - img "Mini Map" [ref=e551]
          - link "React Flow attribution" [ref=e570] [cursor=pointer]:
            - /url: https://reactflow.dev?utm_source=attribution
            - text: React Flow
        - toolbar "Canvas tools" [ref=e572]:
          - button "Select and arrange" [pressed] [ref=e573] [cursor=pointer]
          - button "Hand tool · pan canvas" [ref=e576] [cursor=pointer]
          - button "Reset zoom to 100%" [ref=e582] [cursor=pointer]: 76%
          - button "Add node" [ref=e583] [cursor=pointer]
    - complementary "Inspector" [ref=e585]:
      - button "Show inspector" [ref=e586] [cursor=pointer]:
        - generic [ref=e590]: Inspector
  - generic [ref=e591]:
    - status [ref=e592]: The rehearsal is running; you can stop it at any time.
    - alert
  - contentinfo [ref=e593]:
    - generic [ref=e594]: Computing · the canvas stays viewable
    - status [ref=e596]: Computing every guest’s simulated journey…
    - generic [ref=e597]:
      - text: Event flows · scenario comparison
      - button "Scope" [ref=e598] [cursor=pointer]
```

# Test source

```ts
  1   | import { readFile } from 'node:fs/promises';
  2   | import { expect, test } from '@playwright/test';
  3   | import type { Download } from '@playwright/test';
  4   | import type { ProjectDocument } from '../../src/schemas';
  5   | import type { JobSummary } from '../../src/experiments/robustness/types';
  6   | import { labels } from '../../src/experiments/robustness/labels';
  7   | import { openExample } from '../ui/studio';
  8   |
  9   | async function downloadedJson(download: Download) {
  10  |   return JSON.parse(await readFile((await download.path())!, 'utf8'));
  11  | }
  12  |
  13  | test('selected comparison plans run at cutoff and group export reproduces in the workbench', async ({ page }, info) => {
  14  |   const t = await openExample(page, info), lab = labels[t.lang];
  15  |   const errors: string[] = [];
  16  |   page.on('pageerror', error => errors.push(error.message));
  17  |   if (!await page.locator('.plan-main').first().isVisible()) await page.locator('.side-collapse').click();
  18  |   await page.locator('.plan-main').nth(1).click();
  19  |   await page.locator('.workspace-menu > summary').click();
  20  |   await page.getByLabel(t.run.scope, { exact: true }).selectOption('run_to_completion');
  21  |   await page.keyboard.press('Escape');
  22  |   await page.getByRole('tab', { name: t.modes.Compare, exact: true }).click();
  23  |   const entry = page.getByRole('button', { name: lab.title, exact: true });
  24  |   await entry.click();
  25  |   const dialog = page.getByRole('dialog', { name: lab.title, exact: true });
  26  |   await expect(dialog).toBeVisible();
  27  |   expect(await dialog.locator('input:not([type=checkbox]):not([type=file]), select').evaluateAll(controls => controls.every(control => {
  28  |     const style = getComputedStyle(control);
  29  |     return control.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom) >= parseFloat(style.lineHeight) - 1;
  30  |   }))).toBe(true);
  31  |   await expect(dialog.getByLabel(lab.baseline, { exact: true })).toHaveValue('alternative');
  32  |   await expect(dialog.getByTestId('experiment-cutoff')).toContainText('1,800 s');
  33  |   await expect(dialog.locator('input[type=file]')).toHaveCount(0);
  34  |   await dialog.getByLabel(lab.seeds, { exact: true }).fill('20261114');
  35  |   const worker = page.waitForEvent('worker');
  36  |   await dialog.getByRole('button', { name: lab.start, exact: true }).click();
  37  |   expect((await worker).url()).toMatch(/\/ghost-rehearsal\/assets\/worker-[^/]+\.js$/);
  38  |   await expect(dialog.getByTestId('batch-status')).toHaveAttribute('data-status', 'complete');
  39  |   await expect(dialog.getByTestId('result-row')).toHaveCount(6);
  40  |   await expect(dialog.getByTestId('experiment-input-status')).toHaveText(lab.inputCurrent);
  41  |   const batchDownload = page.waitForEvent('download');
  42  |   await dialog.getByRole('button', { name: lab.export, exact: true }).click();
  43  |   const batch = await downloadedJson(await batchDownload);
  44  |   expect(batch.config.baselinePlanId).toBe('alternative');
  45  |   expect(batch.config.candidatePlanIds).toEqual(['baseline']);
  46  |   expect((batch.rows as JobSummary[]).every(row => row.status === 'succeeded' && row.basis === 'cutoff' && row.statisticsUntil === 1800)).toBe(true);
  47  |   await dialog.getByLabel(lab.seeds, { exact: true }).fill('20261115');
  48  |   await expect(dialog.getByTestId('experiment-input-status')).toHaveText(lab.inputChanged);
  49  |   const groupDownload = page.waitForEvent('download');
  50  |   await dialog.getByRole('button', { name: lab.groupExport, exact: true }).click();
  51  |   const groupFile = await groupDownload;
  52  |   const group = await downloadedJson(groupFile) as ProjectDocument;
  53  |   expect(group.scenarios).toHaveLength(1);
  54  |   expect(group.scenarios[0].seed).toBe(20261114);
  55  |   expect(group.plans.every(plan => plan.scenarioId === group.scenarios[0].id)).toBe(true);
  56  |   await dialog.getByTestId('experiment-input-status').scrollIntoViewIfNeeded();
  57  |   await dialog.screenshot({ path: info.outputPath('robustness-integration.png') });
  58  |   await dialog.getByRole('button', { name: t.common.closeDialog, exact: true }).click();
  59  |   await expect(entry).toBeFocused();
  60  |   await page.locator('.workspace-menu > summary').click();
  61  |   const chooseFile = page.waitForEvent('filechooser');
  62  |   await page.getByRole('button', { name: t.header.import, exact: true }).click();
  63  |   await (await chooseFile).setFiles((await groupFile.path())!);
  64  |   await expect(page.getByRole('dialog')).toHaveCount(0);
  65  |   await page.locator('.workspace-menu > summary').click();
  66  |   await page.getByLabel(t.run.scope, { exact: true }).selectOption('cutoff');
  67  |   await page.keyboard.press('Escape');
  68  |   await page.getByRole('tab', { name: t.modes.Compare, exact: true }).click();
  69  |   await expect(page.locator('.outcome-table tbody tr')).toHaveCount(6);
  70  |   const summaries = group.plans.map(plan => (batch.rows as JobSummary[]).find(row => row.conditionId === 'original' && row.planId === plan.id)!);
  71  |   const expected = [
  72  |     summaries.map(row => String(row.outcomes!.completed)), summaries.map(row => String(row.outcomes!.unfinished)),
  73  |     summaries.map(row => String(row.earlyLeaving)), summaries.map(row => t.formatWait(row.averageWaiting)),
  74  |     summaries.map(row => t.formatWait(row.p90Waiting)), summaries.map(row => t.formatPersonTime(row.totalWaiting)),
  75  |   ];
  76  |   for (const [index, values] of expected.entries()) {
  77  |     const cells = page.locator('.outcome-table tbody tr').nth(index).locator('td');
  78  |     await expect(cells.nth(0)).toHaveText(values[0]);
  79  |     await expect(cells.nth(1)).toHaveText(values[1]);
  80  |   }
  81  |   expect(errors).toEqual([]);
  82  | });
  83  |
  84  | test('cancel, rerun and closing the lab release its Worker and restore normal rehearsal', async ({ page }, info) => {
  85  |   const t = await openExample(page, info), lab = labels[t.lang];
  86  |   const expand = page.getByRole('button', { name: t.studioUi.expandPlans, exact: true });
  87  |   if (await expand.isVisible()) await expand.click();
  88  |   await page.locator('.event-picker summary').click();
  89  |   await page.getByRole('button', { name: t.eventSetup.settings, exact: true }).click();
  90  |   const settings = page.getByRole('dialog', { name: t.dialogs.scenarioTitle, exact: true });
  91  |   const counts = settings.getByLabel(t.dialogs.count, { exact: true });
  92  |   await expect(counts).toHaveCount(3);
  93  |   for (const count of await counts.all()) {
  94  |     await count.fill(String(Number(await count.inputValue()) * 10));
  95  |     await count.press('Tab');
  96  |   }
  97  |   await settings.getByRole('button', { name: t.dialogs.applyShared(2), exact: true }).click();
  98  |   await page.getByRole('tab', { name: t.modes.Compare, exact: true }).click();
  99  |   const entry = page.getByRole('button', { name: lab.title, exact: true });
> 100 |   await entry.click();
      |               ^ TimeoutError: locator.click: Timeout 15000ms exceeded.
  101 |   const dialog = page.getByRole('dialog', { name: lab.title, exact: true });
  102 |   const workers: { closed: boolean }[] = [];
  103 |   page.on('worker', worker => {
  104 |     const record = { closed: false };
  105 |     workers.push(record);
  106 |     worker.on('close', () => { record.closed = true; });
  107 |   });
  108 |   const seeds = dialog.getByLabel(lab.seeds, { exact: true });
  109 |   await seeds.fill(Array.from({ length: 30 }, (_, i) => String(20261114 + i)).join(', '));
  110 |   await dialog.getByRole('button', { name: lab.start, exact: true }).click();
  111 |   await expect.poll(() => dialog.locator('[data-testid="result-row"][data-status="succeeded"]').count()).toBeGreaterThan(0);
  112 |   await expect(dialog.locator('[data-testid="result-row"][data-status="succeeded"]').first()).toBeAttached();
  113 |   await dialog.getByRole('button', { name: lab.cancel, exact: true }).click();
  114 |   await expect(dialog.getByTestId('batch-status')).toHaveAttribute('data-status', 'partial');
  115 |   await expect.poll(() => workers[0]?.closed).toBe(true);
  116 |   const firstBatch = await dialog.getByTestId('batch-id').textContent();
  117 |   await seeds.fill('20261114');
  118 |   await dialog.getByRole('button', { name: lab.start, exact: true }).click();
  119 |   await expect(dialog.getByTestId('batch-status')).toHaveAttribute('data-status', 'complete');
  120 |   await expect(dialog.getByTestId('batch-id')).not.toHaveText(firstBatch!);
  121 |   await expect(dialog.getByTestId('result-row')).toHaveCount(6);
  122 |   await expect.poll(() => workers[1]?.closed).toBe(true);
  123 |   await seeds.fill(Array.from({ length: 30 }, (_, i) => String(20261114 + i)).join(', '));
  124 |   await dialog.getByRole('button', { name: lab.start, exact: true }).click();
  125 |   await expect.poll(() => workers.length).toBe(3);
  126 |   await page.keyboard.press('Escape');
  127 |   await expect(dialog).toHaveCount(0);
  128 |   await expect.poll(() => workers[2]?.closed).toBe(true);
  129 |   await expect(entry).toBeFocused();
  130 |   const nextRun = page.waitForEvent('worker');
  131 |   await page.locator('.topbar').getByRole('button', { name: t.run.start, exact: true }).click();
  132 |   await nextRun;
  133 |   await expect(entry).toBeEnabled();
  134 |   await expect(page.locator('.outcome-table tbody tr')).toHaveCount(6);
  135 | });
  136 |
```
