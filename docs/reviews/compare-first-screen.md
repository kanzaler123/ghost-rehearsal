# Comparison first screen — review record

Date: 2026-11-16 (UTC+8). Status: implementation delivered for independent review; user acceptance is pending.

## Baseline and delivery

- Freshly fetched `origin/main`, verified with `git ls-remote`: `626ef47c64bd176b7db690f051ce7b9adcb3c64f`. This was still the latest remote main, rather than a rollback to the earlier review baseline.
- Task branch: `kiro/compare-first-screen`.
- Isolated worktree: `C:/Users/kanzaler/Desktop/ghost-rehearsal-compare-first-screen`.
- The original `C:/Users/kanzaler/Desktop/KIROWWEN` checkout was clean on `kiro/ui-visual-polish` at `ec5800d` and was left untouched.
- Implementation commit: `66f52ee6839d2424f8d784c81ea44a431385c04f` (17 source/test files; amended before publication).
- Delivery: Draft PR from `kiro/compare-first-screen` into `main` for independent review.
- No merge to main, deployment or competition submission is authorized by this delivery.

## Changes and boundaries

The A/B/C guide now presents the current step, a short explanation and one primary next action. Its existing secondary actions and full explanation remain in a keyboard-accessible disclosure, with Exit visible. The comparison context combines actual plan names, the selected basis and both actual statistics ends. Replay has its own labelled control. Normal completion is compact; computing, failed, stopped, stale and unavailable result handling remains explicit.

The comparison overview gives its two canvases sufficient height. The existing canvas size observer, manual pan/zoom and synchronized view behavior remain in place. One summary shows completions, departures, unfinished guests, average/P90/total waiting and resource values; repeated gain/regression/cost lists and sample explanations have disclosure controls. Negative outcomes remain in the initial summary.

Entering a guest journey collapses global live statistics and keeps a restore control. The guest identity, actual plan names and states, first visible difference and aligned lanes precede the roster in reading order. The roster remains searchable and paginated; station totals and raw events have a clear evidence disclosure and independent scrolling. Phone entry lands on the journey content automatically, with timelines available through natural vertical scrolling.

| Files | Purpose |
| --- | --- |
| `src/app/App.tsx` | Compact comparison context, completion state and restorable live statistics; journey entry behavior. |
| `src/components/GuidedDemo.tsx`, `src/i18n/messages.ts` | Compact bilingual guide and existing secondary actions. |
| `src/components/CompareReport.tsx`, `src/components/shell/ComparisonSnapshot.tsx`, `src/components/shell/ConclusionGroups.tsx` | One visible outcome/cost summary with detailed evidence disclosures. |
| `src/components/Journey.tsx`, `src/components/shell/JourneyContext.tsx`, `src/components/shell/DivergenceCard.tsx` | Identity-first guest layout and compact existing divergence evidence. |
| `src/app/styles/layout.css`, `modes.css`, `components.css`, `responsive.css` | Canvas allocation, compact containers, independent scrolling and phone layout. |
| `e2e/ui/compare-first-screen.spec.ts` | Real-Worker viewport, stage visibility, journey and disclosure regression checks. |
| `e2e/demo/comparison.spec.ts`, `e2e/ui/accessibility.spec.ts`, `tests/ui-report.test.ts` | Traverse the new disclosures and preserve semantic/statistical assertions. |

No simulation engine, sampling, fingerprint, schema, comparison calculation or input fixture changed. Cutoff/final boundaries, paired guests, inclusive waiting thresholds, incomplete samples, resource calculations and export semantics retain their existing sources.

## Matching screenshot conditions

All pairs use the synthetic Open House A/B/C guide, seed `20261114`, observation cutoff `1800` seconds, horizon `7200` seconds, the guide's full run, selected statistics basis `cutoff`, waiting threshold `60` seconds, replay paused at `210` seconds, browser zoom 100%, device scale factor 1, reduced motion enabled and Auto canvas arrangement. Overview is guide step index 0; journey is step index 2 with `side-stream:10` selected. Viewport PNGs are accompanied by JSON containing conditions, exported-project SHA-256, production Worker URL, browser errors and element geometry.

The four primary pairs below additionally hold **canvas zoom at 0.6** on both sides, using the existing wheel interaction and checking the rendered transform. All eight PNGs and their JSON records have been captured and visually inspected. All 16 after images were refreshed from implementation `66f52ee`, including the late phone landing correction; baseline images remain unchanged. Browser zoom and canvas zoom are separate settings. Desktop page scroll remains 0. The [capture script](compare-first-screen/capture.mjs) records these conditions reproducibly.

| 1366 × 768 state | Before | After |
| --- | --- | --- |
| English overview | [PNG](compare-first-screen/before/overview-1366x768-en-fixed-zoom.png) · [conditions](compare-first-screen/before/overview-1366x768-en-fixed-zoom.json) | [PNG](compare-first-screen/after/overview-1366x768-en-fixed-zoom.png) · [conditions](compare-first-screen/after/overview-1366x768-en-fixed-zoom.json) |
| Chinese overview | [PNG](compare-first-screen/before/overview-1366x768-zh-fixed-zoom.png) · [conditions](compare-first-screen/before/overview-1366x768-zh-fixed-zoom.json) | [PNG](compare-first-screen/after/overview-1366x768-zh-fixed-zoom.png) · [conditions](compare-first-screen/after/overview-1366x768-zh-fixed-zoom.json) |
| English first difference | [PNG](compare-first-screen/before/journey-divergence-1366x768-en-fixed-zoom.png) · [conditions](compare-first-screen/before/journey-divergence-1366x768-en-fixed-zoom.json) | [PNG](compare-first-screen/after/journey-divergence-1366x768-en-fixed-zoom.png) · [conditions](compare-first-screen/after/journey-divergence-1366x768-en-fixed-zoom.json) |
| Chinese first difference | [PNG](compare-first-screen/before/journey-divergence-1366x768-zh-fixed-zoom.png) · [conditions](compare-first-screen/before/journey-divergence-1366x768-zh-fixed-zoom.json) | [PNG](compare-first-screen/after/journey-divergence-1366x768-zh-fixed-zoom.png) · [conditions](compare-first-screen/after/journey-divergence-1366x768-zh-fixed-zoom.json) |

The original 24 default-view PNGs and their JSON records remain in the same [before](compare-first-screen/before/) and [after](compare-first-screen/after/) directories, named `overview-<viewport>-<language>` and `journey-divergence-<viewport>-<language>`, covering English/Chinese at **1366 × 768**, **1440 × 900** and **390 × 844**. Those supplementary captures use automatic canvas fitting without manual pan/zoom: at 1366 × 768 its measured scale is 0.6 before and 0.646628 after, reflecting the changed available area. They demonstrate default behavior but do not hold canvas zoom constant. Phone captures use the same UI actions without manual page scrolling; the changed landing offset is the implemented automatic journey entry behavior. The default 1440 × 1000 browser project is not a substitute for the 1366 × 768 checks.

The primary fixed-zoom pairs and the 12 supplementary pairs have matching exported-project hashes, Worker asset paths and replay times; all final after records contain no page errors. The controlled 1366 × 768 React Flow viewports are **59.5 px before** and **204.40625 px after** on each side, in both languages. All six main stage cards change from clipped to fully visible; both desktop journey lanes are visible after the change without scrolling. Codex visually inspected all eight controlled PNGs, the four default-view 1366 × 768 after screenshots, the English/Chinese phone views and the 1440 × 900 overview. Final phone overview captures show the report heading, first metrics and resource summary after automatic landing; the guest captures show identity, both plan states and the first difference without horizontal overflow. The late landing defect and its correction remain recorded below. User acceptance remains pending.

The current fixture retains completed **43/41**, early departures **4/6**, unfinished **253/253**, and the selected guest's first visible difference at **210 seconds**. Those values remain computed results and test expectations, not interface constants. A reduced average wait does not imply an overall improvement: fewer completions and more early departures remain visible.

## Verification history

Local environment verified with `node --version`, `npm --version` and the installed Playwright package: Windows, Node.js **24.18.0**, npm **11.16.0**, Playwright **1.65.1**, Chromium. Browser verification uses the production Pages-base build and actual Worker.

| Run | Actual result |
| --- | --- |
| `npm ci` | Passed; 0 reported vulnerabilities. |
| Baseline `npm run build -- --base=/ghost-rehearsal/` | Passed with the existing large-chunk warning. Baseline production output was copied before source changes. |
| First `npm run check` | Failed: 450/452 tests passed. Obsolete `.report-basis` CSS and the changed evidence wrapper conflicted with existing assertions; corrected without changing statistical expectations. |
| Second `npm run check` | Failed: 450/452 tests passed. The expanded snapshot has seven items rather than five; final-basis wording was absent from a mocked journey rendering. Both were corrected. |
| `npx vitest run tests/ui-report.test.ts --environment node` | Initial targeted run: 11/12 passed, with the station-table/raw-log selector failure. After selecting the actual raw-log container: 12/12 passed. These were intermediate checks. |
| First focused browser attempt, 48 planned cases | Interrupted, not a passing run. A concurrent Playwright invocation encountered occupied port 4178 and cleaned shared artifacts, producing ENOENT errors. The run also exposed a real phone identity-bar sticky regression, subsequently corrected. Its original result artifacts were overwritten by the concurrent invocation and are unavailable; no complete pass/fail count is inferred. |
| Subsequent focused browser attempt, 16 cases | Exit 1: **10 passed, 6 failed**, 4.2 minutes. All eight existing demo cases passed, including B/C, cutoff/final and actual exports. The six failures and corrections are described below; [JSON result](compare-first-screen/validation/focused-16-failed.json) and six error-context files are preserved in [validation](compare-first-screen/validation/). |
| `npm run check` after those corrections | Exit 0: **452/452 tests in 30 files**, plus both typechecks passed. This was an intermediate check before the phone report-landing effect. |
| Check/build before late phone landing correction | `npm run check` passed 452/452 tests and both typechecks at 2026-11-16 01:37:46 (UTC+8); the standalone Pages-base build passed. These were superseded by the final reruns below. |
| Final `npm run check` | Exit 0 at 2026-11-16 01:41:36 (UTC+8): **452/452 tests in 30 files** and both typechecks passed. |
| Final standalone `npm run build -- --base=/ghost-rehearsal/` | Passed with the existing large-chunk warning. Output includes `index-_cFHulug.js` and `index-AweWS-P8.css`; simulation Worker remains `worker-Hj9-Aq7I.js`. |
| First full release gate: `npm run test:browser`, 176 planned cases | Interrupted after an arrival-import integration case failed because the compact completion marker no longer matched `.run-state-card[data-state=complete]`. The source now preserves that completion-state class/data attribute with compact styling; the existing integration assertion was not changed. [Failure context](compare-first-screen/validation/gate-data-sources-integration-a-723da-d-trips-the-shared-scenario-desktop-en-failed.md) is archived. This was not a complete run; no total pass count is inferred. |
| Second full release gate: `npm run test:browser`, 176 planned cases | Exit 1: **99 passed, 1 failed, 2 existing opt-in skips, 74 did not run**. The unchanged 600-second global timeout and teardown timeout prevented completion. The English phone first-screen case failed because adjacent `.seg-hold` intercepted the first short service segment's ordinary center click. [JSON result](compare-first-screen/validation/gate-2-timeout.json) and [failure context](compare-first-screen/validation/gate-2-mobile-segment-failed.md) are archived. This full command did not pass. |
| First-screen regression after padding correction | **4/4 passed**, 0 failed/skipped/flaky, **30.5 seconds**, across desktop/phone and English/Chinese. The ordinary phone service-segment click passed. [Preserved result](compare-first-screen/validation/first-screen-padding-pass.json). |
| Initial shard 1 attempt: `npm run test:browser -- --shard=1/2` | Explicitly interrupted after one console-observed passing case to fix the late visual landing issue below. No JSON result was produced and no complete run count is claimed. |
| First-screen regression after phone landing correction: `e2e/ui/compare-first-screen.spec.ts` | **4/4 passed**, 0 failed/skipped/flaky, **30.4 seconds**. Includes the new assertion that the first phone summary metric is fully visible, and retains the ordinary service-segment click. [Final targeted result](compare-first-screen/validation/first-screen-final.json). |
| Restarted shard 1: `npm run test:browser -- --shard=1/2` | Exit 1: **85 passed, 1 failed, 2 existing opt-in skips**, all 88 selected cases accounted for, **7.8 minutes**. The unchanged desktop-English robustness cancellation/rerun case timed out at `entry.click()` (line 100, existing 15-second action timeout). [JSON result](compare-first-screen/validation/shard-1-final.json) and [failure context](compare-first-screen/validation/shard-1-robustness-failed.md) are archived. |
| Shard 2: `npm run test:browser -- --shard=2/2` | Exit 0: **86 passed, 2 existing opt-in skips**, **8.0 minutes**. [JSON result](compare-first-screen/validation/shard-2-final.json). Both shards retain the existing timeouts, retries and workers. |
| Combined final shards | **176 unique cases: 171 passed, 1 failed, 4 existing opt-in capture skips**. Uniqueness is by spec ID plus project; titles repeat across viewport/language projects. All **48/48** cases in the eight directly related files below passed. The failed shard and earlier full-command timeout remain recorded as failures. |
| Unchanged robustness case, isolated rerun | Exit 0: **1/1 passed**, **40.3 seconds** total, **16.6 seconds** for the test, with no source/test changes or timeout increases. [JSON result](compare-first-screen/validation/robustness-isolated.json). This successful rerun does not turn the failed shard into a passing run. |

Passing static checks alone are not visual acceptance. Browser cases use the production build and actual Worker; explicit failed-load/cancellation tests deliberately inject transport faults to verify error states. No assertion was weakened, no failed case skipped and no timeout enlarged to obtain a passing result.

The six focused failures comprised two cases for each issue:

- The new desktop regression test expected three folded stage cards after the divergence action had deliberately expanded check-in. The return-path assertion now checks the preserved expanded check-in and both canvas heights. The strict initial three-card bounds checks remain unchanged.
- The new phone keyboard check assumed replay was paused, although the Report panel hides the pause control and normal replay starts automatically. It now establishes reduced motion before entering comparison and asserts the playback button's paused `aria-label` directly.
- A real phone service-segment interaction was intercepted by the noninteractive route marker `i.seg-mark`. Applying `pointer-events: none` removes that decorative obstruction. The second full gate then exposed a separate adjacent hold-segment interception: trace inspection showed a roughly 5 px temporal segment rendered as a 10 px button because of horizontal padding. Padding was moved from the button to its text span so the hit area follows the computed duration. All four targeted first-screen browser cases passed after this correction; the test continues to use an ordinary click.

Late visual inspection found the first phone overview metric above the viewport despite those earlier passes. The guide entry effect ran while the application was still in Build and `.report-head` did not yet exist; Compare became available only after the Worker completed. Adding the existing `comparisonReady` state to the landing effect's dependencies makes it run when that report exists. The new phone first-metric visibility assertion passed in both languages. This is a visual defect found and corrected after the earlier targeted run, not a previously passed acceptance claim.

The restarted shard 1 robustness failure occurred while the application was still in Build computing the enlarged 3,000-guest scenario; the Worker request returned HTTP 200, but the comparison UI had not rendered before the entry click timed out. The launch/message handling, simulation, robustness implementation and this existing test are unchanged by the task. The cause is not established, and resource contention is not claimed. The isolated unchanged case subsequently passed; neither the failed shard nor the timed-out full command is reported as passing.

The final shards include these directly related files, all passing:

| File | Passed |
| --- | --- |
| `e2e/demo/comparison.spec.ts` | 8/8 |
| `e2e/ui/layout.spec.ts` | 8/8 |
| `e2e/ui/run-states.spec.ts` | 12/12 |
| `e2e/ui/accessibility.spec.ts` | 4/4 |
| `e2e/ui/reduced-motion.spec.ts` | 4/4 |
| `e2e/ui/touch-targets.spec.ts` | 4/4 |
| `e2e/ui/arrangement.spec.ts` | 4/4 |
| `e2e/ui/compare-first-screen.spec.ts` | 4/4 |

Interrupted 48-case command:

```sh
npm run test:browser -- e2e/demo/comparison.spec.ts e2e/ui/layout.spec.ts e2e/ui/run-states.spec.ts e2e/ui/accessibility.spec.ts e2e/ui/reduced-motion.spec.ts e2e/ui/touch-targets.spec.ts e2e/ui/arrangement.spec.ts e2e/ui/compare-first-screen.spec.ts
```

Subsequent 16-case command:

```sh
npm run test:browser -- e2e/ui/compare-first-screen.spec.ts e2e/demo/comparison.spec.ts e2e/ui/accessibility.spec.ts
```

Unchanged robustness isolation command:

```sh
npm run test:browser -- e2e/robustness/integration.spec.ts --project=desktop-en --grep 'cancel, rerun'
```

## Reproduce and review

1. Check out `kiro/compare-first-screen` in a fresh checkout and run `npm ci`.
2. Run `npm run check`, then `npm run build -- --base=/ghost-rehearsal/`.
3. Run `npm run preview -- --port 4181 --strictPort --base=/ghost-rehearsal/` and open `http://127.0.0.1:4181/ghost-rehearsal/` in a fresh browser context. Use the capture conditions above for direct screenshot comparison.
   To reproduce the controlled after images, run `node docs/reviews/compare-first-screen/capture.mjs after 4181 fixed`; omit `fixed` for the default-view captures at all three viewports. These commands overwrite the corresponding after capture files.
4. Start the A/B/C guide. Pause at 03:30 for overview; follow the same guest and jump to the first difference for the journey. Check both actual plan names, both statistics boundaries, negative outcomes and cost values. Repeat in Chinese and at all three requested viewports.
5. Expand and collapse global statistics, guide options, sample details and journey evidence; switch overview/journey and resize the viewport. Confirm keyboard focus, roster search/pagination, canvas location and manual pan/zoom remain usable. Continue to B/C and inspect adverse outcomes and export evidence.

Independent review should concentrate on the remaining 15-second robustness entry timing failure and full-command time budget, B/C name mapping, uneven final statistics ends, unavailable result visibility, and phone layout after resize or disclosure changes. The failed gate's cause remains uncertain despite the passing isolated rerun. Physical-device and cross-browser certification, real-event calibration and user acceptance have not been performed. Delivery stops at Draft PR review; it does not establish user acceptance.

Tool attribution and raw-evidence status are recorded in [the usage record](../kiro/compare-first-screen-usage.md).
