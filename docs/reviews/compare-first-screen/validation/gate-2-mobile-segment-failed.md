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
      - <button type="button" class="seg seg-hold" aria-label="Batch holding · Holding · 08:30–09:30 · 1.0 min"></button> intercepts pointer events
    - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <button type="button" class="seg seg-hold" aria-label="Batch holding · Holding · 08:30–09:30 · 1.0 min"></button> intercepts pointer events
    - retrying click action
      - waiting 100ms
    26 × waiting for element to be visible, enabled and stable
       - element is visible, enabled and stable
       - scrolling into view if needed
       - done scrolling
       - <button type="button" class="seg seg-hold" aria-label="Batch holding · Holding · 08:30–09:30 · 1.0 min"></button> intercepts pointer events
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
                - generic "Moved along route · 01:17"
                - generic "Moved along route · 01:17"
                - generic "Moved along route · 01:17"
                - generic "Moved along route · 08:30"
                - generic "Moved along route · 08:30"
                - generic "Moved along route · 08:30"
                - generic "Moved along route · 09:30"
                - 'generic "Actual statistics ends: 30:00" [ref=e183]'
            - generic [ref=e184]:
              - generic [ref=e185]: B
              - generic [ref=e186]:
                - button "ID check · Waiting · 01:17–03:30 · 2.2 min" [ref=e187] [cursor=pointer]
                - button "ID check · Service · 03:30–04:00 · 30.0 s" [ref=e188] [cursor=pointer]
                - button "Batch holding · Holding · 04:00–04:40 · 40.0 s" [ref=e189] [cursor=pointer]
                - button "Kit pickup · Waiting · 04:40–09:50 · 5.2 min" [ref=e190] [cursor=pointer]
                - button "Kit pickup · Service · 09:50–10:35 · 45.0 s" [ref=e191] [cursor=pointer]
                - button "Self-guided briefing · Waiting · 10:35–10:35 · 0.0 s" [ref=e192] [cursor=pointer]
                - button "Self-guided briefing · Service · 10:35–10:55 · 20.0 s" [ref=e193] [cursor=pointer]
                - generic "Moved along route · 01:17"
                - generic "Moved along route · 01:17"
                - generic "Moved along route · 01:17"
                - generic "Moved along route · 01:17"
                - generic "Moved along route · 04:00"
                - generic "Moved along route · 04:00"
                - generic "Moved along route · 04:00"
                - generic "Moved along route · 04:40"
                - generic "Moved along route · 10:35"
                - generic "Moved along route · 10:35"
                - generic "Moved along route · 10:55"
                - 'generic "Actual statistics ends: 30:00" [ref=e195]'
            - generic "At cutoff · 30:00"
            - generic [ref=e196]: Replay · 03:30
            - generic: First difference · 03:30
            - paragraph [ref=e197]: Continues after the cutoff
            - generic [ref=e198]:
              - list "Plan A · Baseline" [ref=e199]:
                - listitem: ID check · Waiting · 01:17–08:00 · 6.7 min
                - listitem: ID check · Service · 08:00–08:30 · 30.0 s
                - listitem: Batch holding · Holding · 08:30–09:30 · 1.0 min
                - listitem: Kit pickup · Waiting · 09:30–29:25 · 19.9 min
                - listitem: Kit pickup · Service · 29:25–30:00 · 35.0 s
              - list "Plan B · Two check-in lanes" [ref=e200]:
                - listitem: ID check · Waiting · 01:17–03:30 · 2.2 min
                - listitem: ID check · Service · 03:30–04:00 · 30.0 s
                - listitem: Batch holding · Holding · 04:00–04:40 · 40.0 s
                - listitem: Kit pickup · Waiting · 04:40–09:50 · 5.2 min
                - listitem: Kit pickup · Service · 09:50–10:35 · 45.0 s
                - listitem: Self-guided briefing · Waiting · 10:35–10:35 · 0.0 s
                - listitem: Self-guided briefing · Service · 10:35–10:55 · 20.0 s
            - generic [ref=e201]:
              - generic [ref=e202]: Waiting
              - generic [ref=e204]: Holding
              - generic [ref=e206]: Blocked
              - generic [ref=e208]: Service
          - group [ref=e210]:
            - generic "Observation cutoff · Station · Raw event log · 39 events" [ref=e211] [cursor=pointer]
        - group [ref=e212]:
          - generic "Guest list" [ref=e213] [cursor=pointer]
          - generic [ref=e214]:
            - generic [ref=e215]: Guest list
            - combobox "Guest list" [ref=e216] [cursor=pointer]:
              - option "Everyone · 300" [selected]
              - option "Waited ≥60 s less · 12"
              - option "Waited ≥60 s more · 9"
              - option "Changed by <60 s · 279"
              - option "Finished only in B · 7"
              - option "Finished only in A · 9"
          - searchbox "Search this group by name or number" [ref=e218]
          - paragraph [ref=e219]: 300 guests
          - generic "Guest list" [ref=e220]:
            - 'button "Main entrance #1 A: completed · B: completed 0" [ref=e221] [cursor=pointer]':
              - generic [ref=e227]:
                - generic [ref=e228]: "Main entrance #1"
                - generic [ref=e229]: "A: completed · B: completed"
              - generic [ref=e230]: "0"
            - 'button "Side entrance #1 A: left early · B: left early 0" [ref=e231] [cursor=pointer]':
              - generic [ref=e237]:
                - generic [ref=e238]: "Side entrance #1"
                - generic [ref=e239]: "A: left early · B: left early"
              - generic [ref=e240]: "0"
            - 'button "Main entrance #2 A: completed · B: completed 0" [ref=e241] [cursor=pointer]':
              - generic [ref=e247]:
                - generic [ref=e248]: "Main entrance #2"
                - generic [ref=e249]: "A: completed · B: completed"
              - generic [ref=e250]: "0"
            - 'button "Side entrance #2 A: completed · B: unfinished +24.6 min" [ref=e251] [cursor=pointer]':
              - generic [ref=e257]:
                - generic [ref=e258]: "Side entrance #2"
                - generic [ref=e259]: "A: completed · B: unfinished"
              - generic [ref=e260]: +24.6 min
            - 'button "Main entrance #3 A: completed · B: unfinished +23.5 min" [ref=e261] [cursor=pointer]':
              - generic [ref=e267]:
                - generic [ref=e268]: "Main entrance #3"
                - generic [ref=e269]: "A: completed · B: unfinished"
              - generic [ref=e270]: +23.5 min
            - 'button "Side entrance #3 A: completed · B: completed 0" [ref=e271] [cursor=pointer]':
              - generic [ref=e277]:
                - generic [ref=e278]: "Side entrance #3"
                - generic [ref=e279]: "A: completed · B: completed"
              - generic [ref=e280]: "0"
            - 'button "Main entrance #4 A: completed · B: unfinished +22.0 min" [ref=e281] [cursor=pointer]':
              - generic [ref=e287]:
                - generic [ref=e288]: "Main entrance #4"
                - generic [ref=e289]: "A: completed · B: unfinished"
              - generic [ref=e290]: +22.0 min
            - 'button "Side entrance #4 A: completed · B: unfinished +20.8 min" [ref=e291] [cursor=pointer]':
              - generic [ref=e297]:
                - generic [ref=e298]: "Side entrance #4"
                - generic [ref=e299]: "A: completed · B: unfinished"
              - generic [ref=e300]: +20.8 min
            - 'button "Main entrance #5 A: completed · B: completed −4.5 min" [ref=e301] [cursor=pointer]':
              - generic [ref=e307]:
                - generic [ref=e308]: "Main entrance #5"
                - generic [ref=e309]: "A: completed · B: completed"
              - generic [ref=e310]: −4.5 min
            - 'button "Main entrance #6 A: completed · B: completed 0" [ref=e311] [cursor=pointer]':
              - generic [ref=e317]:
                - generic [ref=e318]: "Main entrance #6"
                - generic [ref=e319]: "A: completed · B: completed"
              - generic [ref=e320]: "0"
            - 'button "Side entrance #5 A: completed · B: unfinished +16.3 min" [ref=e321] [cursor=pointer]':
              - generic [ref=e327]:
                - generic [ref=e328]: "Side entrance #5"
                - generic [ref=e329]: "A: completed · B: unfinished"
              - generic [ref=e330]: +16.3 min
            - 'button "Main entrance #7 A: completed · B: unfinished +11.8 min" [ref=e331] [cursor=pointer]':
              - generic [ref=e337]:
                - generic [ref=e338]: "Main entrance #7"
                - generic [ref=e339]: "A: completed · B: unfinished"
              - generic [ref=e340]: +11.8 min
            - 'button "Side entrance #6 A: left early · B: left early 0" [ref=e341] [cursor=pointer]':
              - generic [ref=e347]:
                - generic [ref=e348]: "Side entrance #6"
                - generic [ref=e349]: "A: left early · B: left early"
              - generic [ref=e350]: "0"
            - 'button "Main entrance #8 A: completed · B: unfinished +11.1 min" [ref=e351] [cursor=pointer]':
              - generic [ref=e357]:
                - generic [ref=e358]: "Main entrance #8"
                - generic [ref=e359]: "A: completed · B: unfinished"
              - generic [ref=e360]: +11.1 min
            - 'button "Side entrance #7 A: completed · B: unfinished +9.6 min" [ref=e361] [cursor=pointer]':
              - generic [ref=e367]:
                - generic [ref=e368]: "Side entrance #7"
                - generic [ref=e369]: "A: completed · B: unfinished"
              - generic [ref=e370]: +9.6 min
            - 'button "Main entrance #9 A: left early · B: left early −17.3 min" [ref=e371] [cursor=pointer]':
              - generic [ref=e377]:
                - generic [ref=e378]: "Main entrance #9"
                - generic [ref=e379]: "A: left early · B: left early"
              - generic [ref=e380]: −17.3 min
            - 'button "Main entrance #10 A: unfinished · B: completed −8.1 min" [ref=e381] [cursor=pointer]':
              - generic [ref=e387]:
                - generic [ref=e388]: "Main entrance #10"
                - generic [ref=e389]: "A: unfinished · B: completed"
              - generic [ref=e390]: −8.1 min
            - 'button "Side entrance #8 A: completed · B: completed −18.1 min" [ref=e391] [cursor=pointer]':
              - generic [ref=e397]:
                - generic [ref=e398]: "Side entrance #8"
                - generic [ref=e399]: "A: completed · B: completed"
              - generic [ref=e400]: −18.1 min
            - 'button "Main entrance #11 A: completed · B: completed 0" [ref=e401] [cursor=pointer]':
              - generic [ref=e407]:
                - generic [ref=e408]: "Main entrance #11"
                - generic [ref=e409]: "A: completed · B: completed"
              - generic [ref=e410]: "0"
            - 'button "Side entrance #9 A: completed · B: unfinished +1.3 min" [ref=e411] [cursor=pointer]':
              - generic [ref=e417]:
                - generic [ref=e418]: "Side entrance #9"
                - generic [ref=e419]: "A: completed · B: unfinished"
              - generic [ref=e420]: +1.3 min
          - navigation "Guest list" [ref=e421]:
            - button "Previous" [disabled] [ref=e422]
            - generic [ref=e423]: 1 / 15
            - button "Next" [ref=e424] [cursor=pointer]
          - group [ref=e425]:
            - generic "Start from a story" [ref=e426] [cursor=pointer]
  - generic [ref=e427]:
    - status [ref=e428]: Rehearsal complete · 300 guests · 11,333 simulation events
    - alert
  - contentinfo [ref=e429]:
    - generic [ref=e430]: Local workbench
    - status [ref=e432]: Rehearsal complete · 300 guests · 11,333 simulation events
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
  63 |     for (const selector of ['.ghost-card', '.ghost-futures', '.diff-note']) await expect.poll(() => fullyVisible(page.locator(selector))).toBe(true);
  64 |     const identity = await page.locator('.ghost-card').boundingBox();
  65 |     const difference = await page.locator('.diff-note').boundingBox();
  66 |     const roster = await page.locator('.ghost-stories').boundingBox();
  67 |     expect(identity!.y).toBeLessThan(difference!.y);
  68 |     expect(difference!.y).toBeLessThan(roster!.y);
> 69 |     await page.locator('.lanes .seg-service').first().click();
     |                                                       ^ TimeoutError: locator.click: Timeout 15000ms exceeded.
  70 |     await expect(page.locator('#journey-segment-detail')).toBeVisible();
  71 |   }
  72 |   await liveToggle.focus();
  73 |   await liveToggle.press('Enter');
  74 |   await expect(page.locator('#comparison-live')).toBeVisible();
  75 |   expect(await liveToggle.evaluate(element => getComputedStyle(element).outlineStyle)).not.toBe('none');
  76 |   await liveToggle.press('Enter');
  77 |   await expect(page.locator('#comparison-live')).toBeHidden();
  78 |   await noOverflow();
  79 |   await page.locator('.journey-header button').first().click();
  80 |   await expect(page.locator('.app')).toHaveClass(/focus-overview/);
  81 |   if (!mobile) {
  82 |     for (const flow of await page.locator('.canvas-pane .react-flow').all()) await expect.poll(async () => (await flow.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(180);
  83 |     await expect(page.locator('.canvas-pane .react-flow__node[data-id="checkin"]')).toHaveCount(2);
  84 |   }
  85 |   await page.screenshot({ path: info.outputPath('comparison-first-screen.png'), fullPage: false });
  86 | });
  87 |
  88 |
  89 |
  90 |
```
