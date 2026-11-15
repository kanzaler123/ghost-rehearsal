# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ui\compare-first-screen.spec.ts >> comparison and guest evidence occupy the first screen
- Location: e2e\ui\compare-first-screen.spec.ts:18:1

# Error details

```
TimeoutError: locator.click: Timeout 15000ms exceeded.
Call log:
  - waiting for locator('.lanes .seg-service').first()
    - locator resolved to <button type="button" class="seg seg-service" aria-label="ID check · Service · 08:00–08:30 · 30.0 s"></button>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <i class="seg-mark" aria-label="Moved along route · 08:30"></i> intercepts pointer events
    - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <i class="seg-mark" aria-label="Moved along route · 08:30"></i> intercepts pointer events
    - retrying click action
      - waiting 100ms
    26 × waiting for element to be visible, enabled and stable
       - element is visible, enabled and stable
       - scrolling into view if needed
       - done scrolling
       - <i class="seg-mark" aria-label="Moved along route · 08:30"></i> intercepts pointer events
     - retrying click action
       - waiting 500ms

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - banner [ref=e4]:
    - strong [ref=e13]: Ghost Rehearsal
    - generic "Two-Entrance Open House · Plan A · Baseline" [ref=e14]
    - tablist "Canvas mode" [ref=e15]:
      - tab "Build" [ref=e16] [cursor=pointer]
      - tab "Rehearse" [ref=e22] [cursor=pointer]
      - tab "Two Futures" [selected] [ref=e26] [cursor=pointer]
    - generic [ref=e30]:
      - button "Undo (Ctrl+Z)" [ref=e31] [cursor=pointer]
      - button "Redo (Ctrl+Shift+Z)" [disabled] [ref=e35]
      - button "Run rehearsal" [ref=e39] [cursor=pointer]
    - generic [ref=e45]:
      - button "Save in this browser (Ctrl+S)" [ref=e46] [cursor=pointer]
      - generic [ref=e51]: Draft saved
      - group [ref=e52]:
        - generic "More options" [ref=e53] [cursor=pointer]
        - option "Stop at cutoff"
        - option "Run to completion" [selected]
    - group "Interface language" [ref=e58]:
      - button "EN" [pressed] [ref=e59] [cursor=pointer]
      - button "中文" [ref=e60] [cursor=pointer]
  - region "A/B/C decision guide" [ref=e61]:
    - generic [ref=e62]:
      - strong [ref=e63]: 3/6 · First difference
      - paragraph [ref=e64]: Inspect the first visible change; it does not establish a cause.
    - generic [ref=e65]:
      - button "Inspect posts and resources" [active] [ref=e66] [cursor=pointer]
      - group [ref=e67]:
        - generic "More options" [ref=e68] [cursor=pointer]
      - button "Exit guide" [ref=e69] [cursor=pointer]
  - generic [ref=e70]:
    - group [ref=e71]:
      - generic "Observation cutoff · A 30:00 / B 30:00" [ref=e72] [cursor=pointer]
      - option "Observation cutoff" [selected]
      - option "Final / run limit"
      - option "At least 60 seconds" [selected]
      - option "Any change"
    - button "Now · 03:30" [ref=e73] [cursor=pointer]
  - navigation "Comparison focus" [ref=e76]:
    - button "Report" [ref=e77] [cursor=pointer]
    - button "Flow" [ref=e78] [cursor=pointer]
    - button "Guest journey" [pressed] [ref=e79] [cursor=pointer]
    - button "Inspect the evidence" [ref=e80] [cursor=pointer]
  - main [ref=e82]:
    - generic [ref=e83]:
      - generic [ref=e84]:
        - button "Play replay" [ref=e85] [cursor=pointer]
        - button "Reset replay" [ref=e88] [cursor=pointer]
        - time [ref=e92]:
          - generic [ref=e93]: Replay
          - text: 03:30
        - slider "Replay timeline" [ref=e95] [cursor=pointer]: "210"
        - generic "1× plays 30 scenario seconds per second" [ref=e96]:
          - combobox "Replay speed" [ref=e97] [cursor=pointer]:
            - option "0.5×"
            - option "1×" [selected]
            - option "2×"
            - option "4×"
            - option "8×"
      - generic [ref=e99]:
        - generic [ref=e100]:
          - button "Back to comparison" [ref=e102] [cursor=pointer]
          - button "Inspect the evidence" [ref=e105] [cursor=pointer]
          - group [ref=e106]:
            - generic "Comparison evidence" [ref=e107] [cursor=pointer]
        - generic [ref=e108]:
          - generic [ref=e109]:
            - generic [ref=e116]:
              - generic [ref=e117]: "Side entrance #10"
              - code [ref=e118]: side-stream:10
              - paragraph [ref=e119]: Arrived at Side entrance at 01:17
              - generic [ref=e120]:
                - generic [ref=e121]:
                  - text: Ticket type
                  - generic [ref=e122]: regular
                - generic [ref=e123]:
                  - text: Visit type
                  - generic [ref=e124]: full
            - button "Show on canvas" [ref=e125] [cursor=pointer]
          - generic [ref=e128]:
            - generic [ref=e129]:
              - strong [ref=e130]:
                - generic [ref=e131]: A
                - text: Plan A · Baseline
              - generic [ref=e132]:
                - generic [ref=e133]: Replay state · 03:30
                - text: Queuing at ID check for 2.2 min
              - generic [ref=e134]:
                - generic [ref=e135]: Outcome at cutoff · 30:00
                - text: unfinished · waited 27.6 min in total
            - generic [ref=e136]:
              - strong [ref=e137]:
                - generic [ref=e138]: B
                - text: Plan B · Two check-in lanes
              - generic [ref=e139]:
                - generic [ref=e140]: Replay state · 03:30
                - text: Being served at ID check
              - generic [ref=e141]:
                - generic [ref=e142]: Outcome at cutoff · 30:00
                - text: completed · waited 8.0 min in total
          - region "First difference" [ref=e143]:
            - generic [ref=e144]:
              - generic [ref=e145]:
                - text: First difference ·
                - time [ref=e146]: 03:30
              - generic [ref=e147]:
                - button "Jump to first difference" [ref=e148] [cursor=pointer]
                - button "Inspect the evidence" [ref=e152] [cursor=pointer]
            - generic [ref=e153]:
              - generic [ref=e154]:
                - generic [ref=e155]: A
                - button "ID check" [ref=e156] [cursor=pointer]
                - time [ref=e157]: 01:17
                - paragraph [ref=e158]: Queuing at ID check for 2.2 min
              - generic [ref=e159]:
                - generic [ref=e160]: B
                - button "ID check" [ref=e161] [cursor=pointer]
                - time [ref=e162]: 03:30
                - paragraph [ref=e163]: Being served at ID check
          - generic "Where the time went · Observation cutoff · Lanes, outcomes and station waits all end at 30:00" [ref=e164]:
            - generic [ref=e166]:
              - generic [ref=e167]: 00:00
              - generic [ref=e168]: 05:00
              - generic [ref=e169]: 10:00
              - generic [ref=e170]: 15:00
              - generic [ref=e171]: 20:00
              - generic [ref=e172]: 25:00
              - generic [ref=e173]: 30:00
            - generic [ref=e174]:
              - generic [ref=e175]: A
              - generic [ref=e176]:
                - button "ID check · Waiting · 01:17–08:00 · 6.7 min" [ref=e177] [cursor=pointer]
                - button "ID check · Service · 08:00–08:30 · 30.0 s" [ref=e178] [cursor=pointer]
                - button "Batch holding · Holding · 08:30–09:30 · 1.0 min" [ref=e179] [cursor=pointer]
                - button "Kit pickup · Waiting · 09:30–29:25 · 19.9 min" [ref=e180] [cursor=pointer]:
                  - generic [ref=e181]: Kit pickup
                - button "Kit pickup · Service · 29:25–30:00 · 35.0 s · Continues after the cutoff" [ref=e182] [cursor=pointer]
                - generic "Moved along route · 01:17" [ref=e183]
                - generic "Moved along route · 01:17" [ref=e184]
                - generic "Moved along route · 01:17" [ref=e185]
                - generic "Moved along route · 08:30" [ref=e186]
                - generic "Moved along route · 08:30" [ref=e187]
                - generic "Moved along route · 08:30" [ref=e188]
                - generic "Moved along route · 09:30" [ref=e189]
                - 'generic "Actual statistics ends: 30:00" [ref=e190]'
            - generic [ref=e191]:
              - generic [ref=e192]: B
              - generic [ref=e193]:
                - button "ID check · Waiting · 01:17–03:30 · 2.2 min" [ref=e194] [cursor=pointer]
                - button "ID check · Service · 03:30–04:00 · 30.0 s" [ref=e195] [cursor=pointer]
                - button "Batch holding · Holding · 04:00–04:40 · 40.0 s" [ref=e196] [cursor=pointer]
                - button "Kit pickup · Waiting · 04:40–09:50 · 5.2 min" [ref=e197] [cursor=pointer]
                - button "Kit pickup · Service · 09:50–10:35 · 45.0 s" [ref=e198] [cursor=pointer]
                - button "Self-guided briefing · Waiting · 10:35–10:35 · 0.0 s" [ref=e199] [cursor=pointer]
                - button "Self-guided briefing · Service · 10:35–10:55 · 20.0 s" [ref=e200] [cursor=pointer]
                - generic "Moved along route · 01:17" [ref=e201]
                - generic "Moved along route · 01:17" [ref=e202]
                - generic "Moved along route · 01:17" [ref=e203]
                - generic "Moved along route · 01:17" [ref=e204]
                - generic "Moved along route · 04:00" [ref=e205]
                - generic "Moved along route · 04:00" [ref=e206]
                - generic "Moved along route · 04:00" [ref=e207]
                - generic "Moved along route · 04:40" [ref=e208]
                - generic "Moved along route · 10:35" [ref=e209]
                - generic "Moved along route · 10:35" [ref=e210]
                - generic "Moved along route · 10:55" [ref=e211]
                - 'generic "Actual statistics ends: 30:00" [ref=e213]'
            - generic "At cutoff · 30:00"
            - generic [ref=e214]: Replay · 03:30
            - generic: First difference · 03:30
            - paragraph [ref=e215]: Continues after the cutoff
            - generic [ref=e216]:
              - list "Plan A · Baseline" [ref=e217]:
                - listitem: ID check · Waiting · 01:17–08:00 · 6.7 min
                - listitem: ID check · Service · 08:00–08:30 · 30.0 s
                - listitem: Batch holding · Holding · 08:30–09:30 · 1.0 min
                - listitem: Kit pickup · Waiting · 09:30–29:25 · 19.9 min
                - listitem: Kit pickup · Service · 29:25–30:00 · 35.0 s
              - list "Plan B · Two check-in lanes" [ref=e218]:
                - listitem: ID check · Waiting · 01:17–03:30 · 2.2 min
                - listitem: ID check · Service · 03:30–04:00 · 30.0 s
                - listitem: Batch holding · Holding · 04:00–04:40 · 40.0 s
                - listitem: Kit pickup · Waiting · 04:40–09:50 · 5.2 min
                - listitem: Kit pickup · Service · 09:50–10:35 · 45.0 s
                - listitem: Self-guided briefing · Waiting · 10:35–10:35 · 0.0 s
                - listitem: Self-guided briefing · Service · 10:35–10:55 · 20.0 s
            - generic [ref=e219]:
              - generic [ref=e220]: Waiting
              - generic [ref=e222]: Holding
              - generic [ref=e224]: Blocked
              - generic [ref=e226]: Service
          - group [ref=e228]:
            - generic "Observation cutoff · Station · Raw event log · 39 events" [ref=e229] [cursor=pointer]
        - group [ref=e230]:
          - generic "Guest list" [ref=e231] [cursor=pointer]
          - generic [ref=e232]:
            - generic [ref=e233]: Guest list
            - combobox "Guest list" [ref=e234] [cursor=pointer]:
              - option "Everyone · 300" [selected]
              - option "Waited ≥60 s less · 12"
              - option "Waited ≥60 s more · 9"
              - option "Changed by <60 s · 279"
              - option "Finished only in B · 7"
              - option "Finished only in A · 9"
          - searchbox "Search this group by name or number" [ref=e236]
          - paragraph [ref=e237]: 300 guests
          - generic "Guest list" [ref=e238]:
            - 'button "Main entrance #1 A: completed · B: completed 0" [ref=e239] [cursor=pointer]':
              - generic [ref=e245]:
                - generic [ref=e246]: "Main entrance #1"
                - generic [ref=e247]: "A: completed · B: completed"
              - generic [ref=e248]: "0"
            - 'button "Side entrance #1 A: left early · B: left early 0" [ref=e249] [cursor=pointer]':
              - generic [ref=e255]:
                - generic [ref=e256]: "Side entrance #1"
                - generic [ref=e257]: "A: left early · B: left early"
              - generic [ref=e258]: "0"
            - 'button "Main entrance #2 A: completed · B: completed 0" [ref=e259] [cursor=pointer]':
              - generic [ref=e265]:
                - generic [ref=e266]: "Main entrance #2"
                - generic [ref=e267]: "A: completed · B: completed"
              - generic [ref=e268]: "0"
            - 'button "Side entrance #2 A: completed · B: unfinished +24.6 min" [ref=e269] [cursor=pointer]':
              - generic [ref=e275]:
                - generic [ref=e276]: "Side entrance #2"
                - generic [ref=e277]: "A: completed · B: unfinished"
              - generic [ref=e278]: +24.6 min
            - 'button "Main entrance #3 A: completed · B: unfinished +23.5 min" [ref=e279] [cursor=pointer]':
              - generic [ref=e285]:
                - generic [ref=e286]: "Main entrance #3"
                - generic [ref=e287]: "A: completed · B: unfinished"
              - generic [ref=e288]: +23.5 min
            - 'button "Side entrance #3 A: completed · B: completed 0" [ref=e289] [cursor=pointer]':
              - generic [ref=e295]:
                - generic [ref=e296]: "Side entrance #3"
                - generic [ref=e297]: "A: completed · B: completed"
              - generic [ref=e298]: "0"
            - 'button "Main entrance #4 A: completed · B: unfinished +22.0 min" [ref=e299] [cursor=pointer]':
              - generic [ref=e305]:
                - generic [ref=e306]: "Main entrance #4"
                - generic [ref=e307]: "A: completed · B: unfinished"
              - generic [ref=e308]: +22.0 min
            - 'button "Side entrance #4 A: completed · B: unfinished +20.8 min" [ref=e309] [cursor=pointer]':
              - generic [ref=e315]:
                - generic [ref=e316]: "Side entrance #4"
                - generic [ref=e317]: "A: completed · B: unfinished"
              - generic [ref=e318]: +20.8 min
            - 'button "Main entrance #5 A: completed · B: completed −4.5 min" [ref=e319] [cursor=pointer]':
              - generic [ref=e325]:
                - generic [ref=e326]: "Main entrance #5"
                - generic [ref=e327]: "A: completed · B: completed"
              - generic [ref=e328]: −4.5 min
            - 'button "Main entrance #6 A: completed · B: completed 0" [ref=e329] [cursor=pointer]':
              - generic [ref=e335]:
                - generic [ref=e336]: "Main entrance #6"
                - generic [ref=e337]: "A: completed · B: completed"
              - generic [ref=e338]: "0"
            - 'button "Side entrance #5 A: completed · B: unfinished +16.3 min" [ref=e339] [cursor=pointer]':
              - generic [ref=e345]:
                - generic [ref=e346]: "Side entrance #5"
                - generic [ref=e347]: "A: completed · B: unfinished"
              - generic [ref=e348]: +16.3 min
            - 'button "Main entrance #7 A: completed · B: unfinished +11.8 min" [ref=e349] [cursor=pointer]':
              - generic [ref=e355]:
                - generic [ref=e356]: "Main entrance #7"
                - generic [ref=e357]: "A: completed · B: unfinished"
              - generic [ref=e358]: +11.8 min
            - 'button "Side entrance #6 A: left early · B: left early 0" [ref=e359] [cursor=pointer]':
              - generic [ref=e365]:
                - generic [ref=e366]: "Side entrance #6"
                - generic [ref=e367]: "A: left early · B: left early"
              - generic [ref=e368]: "0"
            - 'button "Main entrance #8 A: completed · B: unfinished +11.1 min" [ref=e369] [cursor=pointer]':
              - generic [ref=e375]:
                - generic [ref=e376]: "Main entrance #8"
                - generic [ref=e377]: "A: completed · B: unfinished"
              - generic [ref=e378]: +11.1 min
            - 'button "Side entrance #7 A: completed · B: unfinished +9.6 min" [ref=e379] [cursor=pointer]':
              - generic [ref=e385]:
                - generic [ref=e386]: "Side entrance #7"
                - generic [ref=e387]: "A: completed · B: unfinished"
              - generic [ref=e388]: +9.6 min
            - 'button "Main entrance #9 A: left early · B: left early −17.3 min" [ref=e389] [cursor=pointer]':
              - generic [ref=e395]:
                - generic [ref=e396]: "Main entrance #9"
                - generic [ref=e397]: "A: left early · B: left early"
              - generic [ref=e398]: −17.3 min
            - 'button "Main entrance #10 A: unfinished · B: completed −8.1 min" [ref=e399] [cursor=pointer]':
              - generic [ref=e405]:
                - generic [ref=e406]: "Main entrance #10"
                - generic [ref=e407]: "A: unfinished · B: completed"
              - generic [ref=e408]: −8.1 min
            - 'button "Side entrance #8 A: completed · B: completed −18.1 min" [ref=e409] [cursor=pointer]':
              - generic [ref=e415]:
                - generic [ref=e416]: "Side entrance #8"
                - generic [ref=e417]: "A: completed · B: completed"
              - generic [ref=e418]: −18.1 min
            - 'button "Main entrance #11 A: completed · B: completed 0" [ref=e419] [cursor=pointer]':
              - generic [ref=e425]:
                - generic [ref=e426]: "Main entrance #11"
                - generic [ref=e427]: "A: completed · B: completed"
              - generic [ref=e428]: "0"
            - 'button "Side entrance #9 A: completed · B: unfinished +1.3 min" [ref=e429] [cursor=pointer]':
              - generic [ref=e435]:
                - generic [ref=e436]: "Side entrance #9"
                - generic [ref=e437]: "A: completed · B: unfinished"
              - generic [ref=e438]: +1.3 min
          - navigation "Guest list" [ref=e439]:
            - button "Previous" [disabled] [ref=e440]
            - generic [ref=e441]: 1 / 15
            - button "Next" [ref=e442] [cursor=pointer]
          - group [ref=e443]:
            - generic "Start from a story" [ref=e444] [cursor=pointer]
  - generic [ref=e445]:
    - status [ref=e446]: Rehearsal complete · 300 guests · 11,333 simulation events
    - alert
  - contentinfo [ref=e447]:
    - generic [ref=e448]: Local workbench
    - status [ref=e450]: Rehearsal complete · 300 guests · 11,333 simulation events
```

# Test source

```ts
  1  | import { expect, test } from '@playwright/test';
  2  | import type { Locator } from '@playwright/test';
  3  | import { compareExample, openExample, pauseAt } from './studio';
  4  |
  5  | async function fullyVisible(locator: Locator) {
  6  |   return locator.evaluate(element => {
  7  |     const rect = element.getBoundingClientRect();
  8  |     let left = 0, top = 0, right = innerWidth, bottom = innerHeight;
  9  |     for (let parent = element.parentElement; parent; parent = parent.parentElement) {
  10 |       const style = getComputedStyle(parent), bounds = parent.getBoundingClientRect();
  11 |       if (/auto|hidden|clip|scroll/.test(style.overflowY)) { top = Math.max(top, bounds.top); bottom = Math.min(bottom, bounds.bottom); }
  12 |       if (/auto|hidden|clip|scroll/.test(style.overflowX)) { left = Math.max(left, bounds.left); right = Math.min(right, bounds.right); }
  13 |     }
  14 |     return rect.width > 0 && rect.height > 0 && rect.left >= left - 1 && rect.right <= right + 1 && rect.top >= top - 1 && rect.bottom <= bottom + 1;
  15 |   });
  16 | }
  17 |
  18 | test('comparison and guest evidence occupy the first screen', async ({ page }, info) => {
  19 |   await page.emulateMedia({ reducedMotion: 'reduce' });
  20 |   const t = await openExample(page, info);
  21 |   const mobile = info.project.name.startsWith('mobile');
  22 |   const guide = await compareExample(page, t);
  23 |   await page.evaluate(() => document.fonts.ready);
  24 |   const noOverflow = async () => expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  25 |   const canvasFits = async () => {
  26 |     await expect(page.locator('.canvas-pane .react-flow')).toHaveCount(2);
  27 |     for (const flow of await page.locator('.canvas-pane .react-flow').all()) {
  28 |       await expect.poll(async () => (await flow.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(180);
  29 |       const stages = flow.locator('.stage-card');
  30 |       await expect(stages).toHaveCount(3);
  31 |       for (const stage of await stages.all()) await expect.poll(() => fullyVisible(stage)).toBe(true);
  32 |     }
  33 |   };
  34 |   if (!mobile) {
  35 |     await pauseAt(page, t, 210);
  36 |     await canvasFits();
  37 |     await page.setViewportSize({ width: 1440, height: 900 });
  38 |     await canvasFits();
  39 |     await page.setViewportSize({ width: 1366, height: 768 });
  40 |     await canvasFits();
  41 |   }
  42 |   await noOverflow();
  43 |   const liveToggle = page.locator('button[aria-controls="comparison-live"]');
  44 |   await liveToggle.click();
  45 |   await expect(page.locator('#comparison-live')).toBeVisible();
  46 |   await guide.getByRole('button', { name: t.guide.actions[0], exact: true }).click();
  47 |   await expect(liveToggle).toHaveAttribute('aria-expanded', 'false');
  48 |   await expect(page.locator('#comparison-live')).toBeHidden();
  49 |   await guide.getByRole('button', { name: t.guide.actions[1], exact: true }).click();
  50 |   await expect(page.locator('.ghost-id code')).toHaveText('side-stream:10');
  51 |   await expect(page.locator('.diff-note')).toContainText('03:30');
  52 |   await expect(page.getByLabel(t.dock.timeline, { exact: true })).toHaveValue('210');
  53 |   const identities = await page.locator('.comparison-identities > span').allTextContents();
  54 |   expect(identities).toHaveLength(2);
  55 |   for (const identity of identities) await expect(page.locator('.ghost-futures')).toContainText(identity.replace(/^[AB] · /, ''));
  56 |   await expect(page.locator('.lane')).toHaveCount(2);
  57 |   if (!mobile) {
  58 |     await expect.poll(() => fullyVisible(page.locator('.ghost-card'))).toBe(true);
  59 |     await expect.poll(() => fullyVisible(page.locator('.diff-note'))).toBe(true);
  60 |     for (const lane of await page.locator('.lane').all()) await expect.poll(() => fullyVisible(lane)).toBe(true);
  61 |     expect(await page.locator('.dock-body').evaluate(element => element.scrollTop)).toBe(0);
  62 |   } else {
  63 |     const identity = await page.locator('.ghost-card').boundingBox();
  64 |     const difference = await page.locator('.diff-note').boundingBox();
  65 |     const roster = await page.locator('.ghost-stories').boundingBox();
  66 |     expect(identity!.y).toBeLessThan(difference!.y);
  67 |     expect(difference!.y).toBeLessThan(roster!.y);
> 68 |     await page.locator('.lanes .seg-service').first().click();
     |                                                       ^ TimeoutError: locator.click: Timeout 15000ms exceeded.
  69 |     await expect(page.locator('#journey-segment-detail')).toBeVisible();
  70 |   }
  71 |   await liveToggle.focus();
  72 |   await liveToggle.press('Enter');
  73 |   await expect(page.locator('#comparison-live')).toBeVisible();
  74 |   expect(await liveToggle.evaluate(element => getComputedStyle(element).outlineStyle)).not.toBe('none');
  75 |   await liveToggle.press('Enter');
  76 |   await expect(page.locator('#comparison-live')).toBeHidden();
  77 |   await noOverflow();
  78 |   await page.locator('.journey-header button').first().click();
  79 |   await expect(page.locator('.app')).toHaveClass(/focus-overview/);
  80 |   if (!mobile) await canvasFits();
  81 |   await page.screenshot({ path: info.outputPath('comparison-first-screen.png'), fullPage: false });
  82 | });
  83 |
  84 |
  85 |
```
