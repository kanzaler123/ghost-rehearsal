# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ui\accessibility.spec.ts >> keyboard replay, menu dismissal, guest selection and divergence
- Location: e2e\ui\accessibility.spec.ts:4:1

# Error details

```
Error: expect(locator).toHaveValue(expected) failed

Locator:  getByLabel('Replay timeline', { exact: true })
Expected: "0"
Received: "285.4"
Timeout:  10000ms

Call log:
  - Expect "toHaveValue" getByLabel('Replay timeline', { exact: true }) with timeout 10000ms
  - waiting for getByLabel('Replay timeline', { exact: true })
    2 × locator resolved to <input min="0" max="7200" step="0.1" type="range" class="scrubber" value="3.1289999985694887" aria-label="Replay timeline" aria-valuetext="00:03 of 120:00"/>
      - unexpected value "3.1"
    - locator resolved to <input min="0" max="7200" step="0.1" type="range" class="scrubber" value="6.333000000715256" aria-label="Replay timeline" aria-valuetext="00:06 of 120:00"/>
    - unexpected value "6.3"
    - locator resolved to <input min="0" max="7200" step="0.1" type="range" class="scrubber" value="9.168000000715256" aria-label="Replay timeline" aria-valuetext="00:09 of 120:00"/>
    - unexpected value "9.2"
    - locator resolved to <input min="0" max="7200" step="0.1" type="range" class="scrubber" value="12.405000000000001" aria-label="Replay timeline" aria-valuetext="00:12 of 120:00"/>
    - unexpected value "12.4"
    - locator resolved to <input min="0" max="7200" step="0.1" type="range" value="27.195" class="scrubber" aria-label="Replay timeline" aria-valuetext="00:27 of 120:00"/>
    - unexpected value "27.2"
    - locator resolved to <input min="0" max="7200" step="0.1" type="range" class="scrubber" value="45.41699999928475" aria-label="Replay timeline" aria-valuetext="00:45 of 120:00"/>
    - unexpected value "45.4"
    - locator resolved to <input min="0" max="7200" step="0.1" type="range" class="scrubber" value="63.11699999928475" aria-label="Replay timeline" aria-valuetext="01:03 of 120:00"/>
    - unexpected value "63.1"
    - locator resolved to <input min="0" max="7200" step="0.1" type="range" value="81.405" class="scrubber" aria-label="Replay timeline" aria-valuetext="01:21 of 120:00"/>
    - unexpected value "81.4"
    - locator resolved to <input min="0" max="7200" step="0.1" type="range" class="scrubber" value="99.08100000143051" aria-label="Replay timeline" aria-valuetext="01:39 of 120:00"/>
    - unexpected value "99.1"
    - locator resolved to <input min="0" max="7200" step="0.1" type="range" class="scrubber" value="114.05999999999999" aria-label="Replay timeline" aria-valuetext="01:54 of 120:00"/>
    - unexpected value "114.1"
    - locator resolved to <input min="0" max="7200" step="0.1" type="range" class="scrubber" value="132.17699999928473" aria-label="Replay timeline" aria-valuetext="02:12 of 120:00"/>
    - unexpected value "132.2"
    - locator resolved to <input min="0" max="7200" step="0.1" type="range" value="150.375" class="scrubber" aria-label="Replay timeline" aria-valuetext="02:30 of 120:00"/>
    - unexpected value "150.4"
    - locator resolved to <input min="0" max="7200" step="0.1" type="range" class="scrubber" value="165.34800000071527" aria-label="Replay timeline" aria-valuetext="02:45 of 120:00"/>
    - unexpected value "165.3"
    - locator resolved to <input min="0" max="7200" step="0.1" type="range" class="scrubber" value="183.3989999985695" aria-label="Replay timeline" aria-valuetext="03:03 of 120:00"/>
    - unexpected value "183.4"
    - locator resolved to <input min="0" max="7200" step="0.1" type="range" class="scrubber" value="201.08699999928476" aria-label="Replay timeline" aria-valuetext="03:21 of 120:00"/>
    - unexpected value "201.1"
    - locator resolved to <input min="0" max="7200" step="0.1" type="range" class="scrubber" value="216.4439999985695" aria-label="Replay timeline" aria-valuetext="03:36 of 120:00"/>
    - unexpected value "216.4"
    - locator resolved to <input min="0" max="7200" step="0.1" type="range" class="scrubber" value="234.12300000071528" aria-label="Replay timeline" aria-valuetext="03:54 of 120:00"/>
    - unexpected value "234.1"
    - locator resolved to <input min="0" max="7200" step="0.1" type="range" class="scrubber" value="252.3689999985695" aria-label="Replay timeline" aria-valuetext="04:12 of 120:00"/>
    - unexpected value "252.4"
    - locator resolved to <input min="0" max="7200" step="0.1" type="range" class="scrubber" value="267.2069999992848" aria-label="Replay timeline" aria-valuetext="04:27 of 120:00"/>
    - unexpected value "267.2"
    - locator resolved to <input min="0" max="7200" step="0.1" type="range" class="scrubber" value="285.3539999985695" aria-label="Replay timeline" aria-valuetext="04:45 of 120:00"/>
    - unexpected value "285.4"

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
- region "A/B/C decision guide":
  - strong: 1/6 · Compare A/B
  - paragraph: "Synthetic example: compare outcomes, waiting and costs."
  - button "Follow the same guest"
  - group: More options
  - button "Exit guide"
- text: A · Plan A · Baseline B · Plan B · Two check-in lanes
- group:
  - text: Observation cutoff · A 30:00 / B 30:00 Statistics basis
  - combobox "Statistics basis":
    - option "Observation cutoff" [selected]
    - option "Final / run limit"
  - text: Waiting change rule
  - combobox "Waiting change rule":
    - option "At least 60 seconds" [selected]
    - option "Any change"
  - text: Run to completion to enable final statistics. Final can still include unfinished guests at the run limit.
- button "Now · 04:45"
- navigation "Comparison focus":
  - button "Report" [pressed]
  - button "Flow"
  - button "Guest journey"
  - button "Inspect the evidence"
- complementary "Read the two futures":
  - button "Collapse report" [expanded]
  - button "Plans & nodes": A · Plan A · Baseline
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
    - table:
      - rowgroup:
        - row "Measure A B B − A":
          - columnheader "Measure"
          - columnheader "A"
          - columnheader "B"
          - columnheader "B − A"
      - rowgroup:
        - row "Finished 43 41 −2 Regression":
          - rowheader "Finished"
          - cell "43"
          - cell "41"
          - cell "−2 Regression"
        - row "Not finished 253 253 0 No change":
          - rowheader "Not finished"
          - cell "253"
          - cell "253"
          - cell "0 No change"
        - row "Left early or turned away 4 6 +2 Regression":
          - rowheader "Left early or turned away"
          - cell "4"
          - cell "6"
          - cell "+2 Regression"
        - row "Average wait per guest 17.6 min 17.6 min −2.4 s Gain Differs below display precision":
          - rowheader "Average wait per guest"
          - cell "17.6 min"
          - cell "17.6 min"
          - cell "−2.4 s Gain Differs below display precision"
        - row "P90 wait 25.8 min 25.8 min 0.0 s No change":
          - rowheader "P90 wait"
          - cell "25.8 min"
          - cell "25.8 min"
          - cell "0.0 s No change"
        - row "Total waiting, all guests 5,288.6 person-min 5,276.7 person-min −11.9 person-min Gain":
          - rowheader "Total waiting, all guests"
          - cell "5,288.6 person-min"
          - cell "5,276.7 person-min"
          - cell "−11.9 person-min Gain"
    - paragraph: Read waiting alongside completions and departures; leaving early can also shorten a wait.
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
    - term: Staff
    - definition: 3 → 3 0 No change
    - term: ID scanner
    - definition: 1 → 2 +1 Cost
    - term: Staffed time in the window
    - definition: 1.5 h → 1.5 h 0.0 h No change
    - term: Device time in the window
    - definition: 0.5 h → 1.0 h +0.5 h Cost
    - term: Overtime
    - definition: 0.0 s → 0.0 s 0.0 s No change
    - text: Busy share of available time
    - term: Check-in staff
    - definition: 73% → 100%
    - term: Floater
    - definition: 78% → 98%
    - term: Kit staff
    - definition: 94% → 94%
    - term: ID scanner 1
    - definition: 100% → 82%
    - term: ID scanner 2
    - definition: — → 80%
    - text: Staffed and device time come from shifts inside the selected statistics window.
- status: Rehearsal complete · 300 guests · 11,333 simulation events
- alert
- contentinfo:
  - text: Local workbench
  - status: Rehearsal complete · 300 guests · 11,333 simulation events
```

# Test source

```ts
  1  | import { expect, test } from '@playwright/test';
  2  | import { compareExample, openExample } from './studio';
  3  |
  4  | test('keyboard replay, menu dismissal, guest selection and divergence', async ({ page }, info) => {
  5  |   const t = await openExample(page, info);
  6  |   const menu = page.locator('.workspace-menu > summary');
  7  |   await menu.focus();
  8  |   await menu.press('Enter');
  9  |   await expect(page.locator('.workspace-menu')).toHaveAttribute('open', '');
  10 |   await page.keyboard.press('Escape');
  11 |   await expect(page.locator('.workspace-menu')).not.toHaveAttribute('open');
  12 |   await expect(menu).toBeFocused();
  13 |   const checks = page.locator('.check-chip');
  14 |   await checks.focus();
  15 |   await page.keyboard.press('Enter');
  16 |   await expect(page.getByRole('button', { name: t.stage.closeChecks, exact: true })).toBeFocused();
  17 |   await page.keyboard.press('Escape');
  18 |   await expect(page.locator('.checks-drawer')).toHaveCount(0);
  19 |   await expect(checks).toBeFocused();
  20 |   const addNode = page.locator('.canvas-tools').getByRole('button', { name: t.sidebar.addNode, exact: true });
  21 |   await addNode.focus();
  22 |   await page.keyboard.press('Enter');
  23 |   await expect(page.locator('.canvas-menu').getByRole('textbox', { name: t.canvas.search, exact: true })).toBeFocused();
  24 |   await page.keyboard.press('Escape');
  25 |   await expect(page.locator('.canvas-menu')).toHaveCount(0);
  26 |   await expect(addNode).toBeFocused();
  27 |   await page.getByRole('tab', { name: t.modes.Rehearse, exact: true }).focus();
  28 |   await page.keyboard.press('Enter');
  29 |   const slider = page.getByLabel(t.dock.timeline, { exact: true });
  30 |   await expect(slider).toBeEnabled();
  31 |   const pause = page.getByRole('button', { name: t.dock.pause, exact: true });
  32 |   if (await pause.isVisible()) { await pause.focus(); await page.keyboard.press('Enter'); }
  33 |   await slider.focus();
  34 |   const initial = Number(await slider.inputValue());
  35 |   await slider.press('ArrowRight');
  36 |   expect(Number(await slider.inputValue())).toBeGreaterThan(initial);
  37 |   expect(await slider.evaluate(element => getComputedStyle(element).outlineStyle)).not.toBe('none');
  38 |   await page.getByLabel(t.dock.speed, { exact: true }).focus();
  39 |   await page.keyboard.press('End');
  40 |   await page.keyboard.press('Enter');
  41 |   await expect(page.getByLabel(t.dock.speed, { exact: true })).toHaveValue('8');
  42 |   await page.getByRole('tab', { name: t.modes.Build, exact: true }).click();
  43 |   const guide = await compareExample(page, t);
  44 |   const pauseComparison = page.getByRole('button', { name: t.dock.pause, exact: true });
  45 |   if (await pauseComparison.isVisible()) await pauseComparison.click();
  46 |   const pausedTime = await slider.inputValue();
  47 |   for (const selector of ['.comparison-options', '.guide-options']) {
  48 |     const disclosure = page.locator(selector), summary = disclosure.locator(':scope > summary');
  49 |     await summary.focus();
  50 |     await summary.press('Space');
  51 |     await expect(disclosure).toHaveAttribute('open', '');
> 52 |     await expect(slider).toHaveValue(pausedTime);
     |                          ^ Error: expect(locator).toHaveValue(expected) failed
  53 |     await expect(page.getByRole('button', { name: t.dock.play, exact: true })).toBeVisible();
  54 |     await summary.press('Escape');
  55 |     await expect(disclosure).not.toHaveAttribute('open');
  56 |     await expect(summary).toBeFocused();
  57 |   }
  58 |   await guide.getByRole('button', { name: t.guide.actions[0], exact: true }).focus();
  59 |   await page.keyboard.press('Enter');
  60 |   await guide.getByRole('button', { name: t.guide.actions[1], exact: true }).focus();
  61 |   await page.keyboard.press('Enter');
  62 |   await expect(page.locator('.ghost-id code')).toHaveText('side-stream:10');
  63 |   await expect(page.getByLabel(t.dock.timeline, { exact: true })).toHaveValue('210');
  64 | });
  65 |
```
