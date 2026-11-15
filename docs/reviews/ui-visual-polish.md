# Rehearsal Studio UI delivery review

Implementation on `kiro/ui-visual-polish` passes both typechecks, **370 unit tests in 25 files**, the production build and the final full browser suite: **56 passed, 0 failed, 4 intentional capture skips**. All eight viewport/language/motion path combinations pass, including export and reimport. There are **28 matching before/after screenshot pairs**, with no missing images. The full browser run required stopping its verified preview process after all tests completed; automatic preview teardown remains a local environment limitation. The separate after-capture run exited naturally.

The adopted baseline is `origin/codex/comparison-guided-demo` at `40dc58deb073450f10b4d0aa64a79c22dc19d17f`. The earlier supplied `cbe1a834431bfe9a24817d64632bd8ec9071fca3` is its ancestor, seven commits earlier. Planning was inherited in `eeef1dc`, and the baseline checks were recorded in `4d22025`. Codex captured the unchanged UI in `4ef1d01` before any source edits, then committed styles in `ef777c1`, implementation in `e478920`, browser coverage in `746cb3a` and the verified boundary, focus and layout corrections in `c3464a4`. The final full browser run and after capture target `c3464a4`. No merge into main is part of this delivery.

## What changed

The workbench now separates current replay status from scoped result summaries. Activity and edited-plan names remain in the top bar, with a visible current-target marker on the compact plan rail or Two Futures Plans control; station cards and guests use shared status markers. Two Futures opens with a compact snapshot and gain, regression and resource-cost groups, with explicit empty groups. Missing, stopped, failed and stale results do not qualify as current comparison evidence. Journey places its actual first divergence before the detailed lanes, station table and raw events.

The display keeps simulation precision, existing replay increments, the 0.5/1/2/4/8 speed choices, 1× = 30 scenario seconds per real second, and 20 people per page. Display rounding does not write back to data. Arrangement and reduced motion are presentation preferences; statistics scope, waiting rules and comparison calculations remain based on existing results.

Styling uses ordered CSS layers and shared tokens. Plan identity colors are separate from outcome and resource directions. Bilingual labels, focus states, narrow layouts and timeline text alternatives support the new controls. Property-style checks are table-driven example tests, **not property-based**; `fast-check` was not added.

## Changed files

This inventory is relative to `40dc58d`, including inherited spec/evidence files and delivery documents. Each of the 56 binary image files has its own before/after path and state in the [image inventory](ui-visual-polish/README.md). Final screenshot and browser evidence is committed in `c97af40`.

| File | Main change |
| --- | --- |
| `.kiro/specs/rehearsal-studio-ui/.config.kiro` | Records the rehearsal-studio-ui spec identity inherited from the planning work. |
| `.kiro/specs/rehearsal-studio-ui/requirements.md` | Records the scoped UI requirements, including the completion criteria and excluded decisions. |
| `.kiro/specs/rehearsal-studio-ui/design.md` | Defines presentation components, states, tokens and interaction contracts. |
| `.kiro/specs/rehearsal-studio-ui/tasks.md` | Tracks implemented work separately from pending verification and delivery gates. |
| `KIRO_USAGE.md` | Appends the continuation record without attributing Codex implementation to Kiro. |
| `docs/kiro/ui-visual-polish-usage.md` | Separates inherited Kiro planning evidence from this Codex continuation. |
| `docs/reviews/ui-visual-polish.md` | Provides this delivery report and review instructions. |
| `docs/reviews/ui-visual-polish/verification.md` | Records actual commands, failures, corrections and the completed browser path matrix. |
| `docs/reviews/ui-visual-polish/interface-notes.md` | Records task B's live ownership boundary and defers Inspector markup changes. |
| `docs/reviews/ui-visual-polish/baseline-checks.md` | Preserves the baseline outcomes and adds the pre-edit screenshot evidence. |
| `docs/reviews/ui-visual-polish/baseline-browser-rerun-results.json` | Preserves only the successful isolated baseline browser rerun. |
| `docs/reviews/ui-visual-polish/before-capture-results.json` | Preserves the successful four-project baseline capture report. |
| `docs/reviews/ui-visual-polish/desktop-ui-initial-results.json` | Preserves the first desktop UI run, including five failures. |
| `docs/reviews/ui-visual-polish/desktop-ui-second-results.json` | Preserves the second desktop UI run and its teardown error. |
| `docs/reviews/ui-visual-polish/full-browser-initial-results.json` | Preserves the first full UI browser run with eight concrete regressions. |
| `docs/reviews/ui-visual-polish/full-browser-second-results.json` | Preserves the second full run, where only four strict corner-hit cases failed. |
| `docs/reviews/ui-visual-polish/full-browser-third-results.json` | Preserves the third full run and its eight new-test plan-count errors. |
| `docs/reviews/ui-visual-polish/after-browser-results.json` | Preserves the final passing real-Worker suite with all corrected interaction and export checks. |
| `docs/reviews/ui-visual-polish/after-capture-results.json` | Preserves the successful four-case final capture run. |
| `docs/reviews/ui-visual-polish/README.md` | Indexes all 28 before/after screenshot pairs by state, language and viewport. |
| `src/app/App.tsx` | Wires extracted workbench controls, live/current states, arrangement, evidence navigation and reduced motion. |
| `src/app/main.tsx` | Loads vendor canvas styles through the layered stylesheet manifest. |
| `src/app/preferences.ts` | Persists the explicit dual-canvas arrangement preference. |
| `src/app/useMedia.ts` | Tracks narrow viewport and reduced-motion preferences. |
| `src/app/styles.css` | Declares the stylesheet layer order and imports each owned stylesheet. |
| `src/app/styles/tokens.css` | Defines surface, text, state, plan, spacing, size and motion tokens. |
| `src/app/styles/base.css` | Applies shared typography, focus, controls and base semantics. |
| `src/app/styles/components.css` | Styles shared controls, panels, dialogs and report components. |
| `src/app/styles/layout.css` | Defines the workbench frame, panel layout and first-run atmosphere. |
| `src/app/styles/modes.css` | Styles Build, Rehearse, Two Futures and Journey presentation. |
| `src/app/styles/responsive.css` | Adapts compact and narrow layouts and key touch targets. |
| `src/app/styles/motion.css` | Disables nonessential animation under reduced motion. |
| `src/components/Canvas.tsx` | Reorders node cards, adds state markers, tracks ghosts and respects viewport motion preferences. |
| `src/components/CompareReport.tsx` | Presents the snapshot, grouped conclusions, scoped costs and explicit missing/current-result states. |
| `src/components/Icons.tsx` | Adds icons used by the shared status registry. |
| `src/components/Journey.tsx` | Presents shared-axis timelines, divergence context, station evidence and accessible timeline alternatives. |
| `src/components/Rehearse.tsx` | Shows current queues and recorded key moments with shared state labels. |
| `src/components/Results.tsx` | Uses explicit no-evidence presentation and a relevant recovery action. |
| `src/components/StatisticsScope.tsx` | Keeps result scope and zero-completed sample explanations explicit. |
| `src/components/comparisonText.ts` | Uses shared bilingual messages while preserving comparison calculations. |
| `src/components/ghostRow.ts` | Computes tracked-first ghost marker placement and overflow counts. |
| `src/components/timelineGeometry.ts` | Clamps time segments and determines whether labels fit without changing event times. |
| `src/components/shell/ArrangementControl.tsx` | Exposes Auto, Top-bottom and Left-right presentation choices. |
| `src/components/shell/ComparisonSnapshot.tsx` | Shows five compact outcome/resource rows for the selected statistics scope. |
| `src/components/shell/ConclusionGroups.tsx` | Separates gains, regressions and costs and puts one evidence action before the lists. |
| `src/components/shell/ContextMenu.tsx` | Provides labelled native menus with Escape dismissal and focus return. |
| `src/components/shell/DeltaBadge.tsx` | Displays metric direction and below-precision changes without plan-color ambiguity. |
| `src/components/shell/DivergenceCard.tsx` | Shows the actual first divergent steps, per-plan times and a distinct identical-journey state. |
| `src/components/shell/JourneyContext.tsx` | Keeps back, scope, threshold and one evidence entry together. |
| `src/components/shell/LiveAnnouncer.tsx` | Separates polite status announcements from assertive failure announcements. |
| `src/components/shell/LiveStatusStrip.tsx` | Shows live counts, queues and tracked-guest status. |
| `src/components/shell/ModeActions.tsx` | Groups actions by workbench mode. |
| `src/components/shell/ModeNav.tsx` | Renders labelled mode tabs and unavailable-state explanations. |
| `src/components/shell/PlanNavigator.tsx` | Presents plans, active edit context and localized node search. |
| `src/components/shell/RunStateCard.tsx` | Pairs each run or empty state with its marker, explanation and next action. |
| `src/components/shell/StatusMarker.tsx` | Renders shared icon, text and color status semantics. |
| `src/components/shell/SummaryStrip.tsx` | Shows scoped outcome totals independently of replay time. |
| `src/components/shell/TopBar.tsx` | Shows activity/plan context and primary, project and run actions. |
| `src/components/shell/arrangement.ts` | Resolves saved arrangement and forced narrow-screen stacking. |
| `src/components/shell/comparisonMetrics.ts` | Maps existing statistics into display metrics and conclusion groups. |
| `src/components/shell/deltaTone.ts` | Classifies outcome and resource deltas without modifying their values. |
| `src/components/shell/index.ts` | Exports shell components and their test-harness registry. |
| `src/components/shell/markers.ts` | Defines the shared status marker registry. |
| `src/components/shell/navigation.ts` | Filters nodes and derives current longest queues and past key moments. |
| `src/components/shell/runState.ts` | Derives distinct run and empty states. |
| `src/features/motion.ts` | Centralizes presentation duration and default-autoplay decisions. |
| `src/features/viewport.ts` | Accepts the additive reduced-motion placement option. |
| `src/i18n/messages.ts` | Adds matching English and Chinese UI messages and localized list joining. |
| `tests/ui-arrangement.test.ts` | Checks arrangement resolution and persisted preference behavior. |
| `tests/ui-canvas.test.ts` | Guards node/card dimensions and canvas presentation contracts. |
| `tests/ui-delta.test.ts` | Checks directional delta classification and precision cases. |
| `tests/ui-ghostrow.test.ts` | Checks tracked-first placement and ghost overflow geometry. |
| `tests/ui-i18n.test.ts` | Checks bilingual parity, formatter behavior and source-copy boundaries. |
| `tests/ui-motion.test.ts` | Checks motion helpers and audited viewport durations. |
| `tests/ui-report.test.ts` | Checks genuine simulation-backed report, divergence, queue and empty-state rendering. |
| `tests/ui-runstate.test.ts` | Checks distinct run and empty-state derivation. |
| `tests/ui-shell.test.ts` | Checks shell names, mode state, menus, next actions and node filtering. |
| `tests/ui-styles.test.ts` | Audits layer order, tokens, color contrast and stylesheet constraints. |
| `tests/ui-timeline.test.ts` | Checks clamped segment geometry, zero duration and label-fit monotonicity. |
| `tests/workbench-ui.test.ts` | Checks replay/summary separation, arrangement, stale handling and divergence actions. |
| `tests/workbench.test.ts` | Expands extracted shell components and accepts accessible button names in the harness without changing assertions. |
| `e2e/ui/acceptance.spec.ts` | Exercises a real edit/undo/redo, paused replay and first-divergence path. |
| `e2e/ui/accessibility.spec.ts` | Exercises keyboard replay, menu dismissal and guided guest/divergence entry. |
| `e2e/ui/arrangement.spec.ts` | Checks saved arrangement across reload and narrow/wide transitions. |
| `e2e/ui/capture.spec.ts` | Captures matching real-Worker baseline and after review states. |
| `e2e/ui/layout.spec.ts` | Checks layout, the full A/B/C path, report export and project round trip with both motion preferences. |
| `e2e/ui/reduced-motion.spec.ts` | Checks paused initial replay plus explicit play and scrubbing under reduced motion. |
| `e2e/ui/run-states.spec.ts` | Checks stopped, failed and retrying runs without exposing retained evidence as current. |
| `e2e/ui/studio.ts` | Shares actual navigation, exact labels and stable capture/test setup. |
| `e2e/ui/touch-targets.spec.ts` | Checks phone sidebar target dimensions, actual key-control corner hits and page width. |
| `e2e/ui/welcome.spec.ts` | Checks first-launch actions, visible introduction and local example loading. |

## Verification

The [verification record](ui-visual-polish/verification.md) contains exact commands, exit codes, counts, failure details and the completed path matrix. The [baseline record](ui-visual-polish/baseline-checks.md) remains the comparison source; earlier README history is not evidence for this change.

| Run | Result |
| --- | --- |
| Baseline `npm run check` | Exit 0; 278 passed in 13 files. |
| Before capture | Exit 0; 4 passed, 0 failed, 0 skipped; 28 images; 108019.967 ms. |
| Final `npm run check` | Exit 0; both typechecks; 370 passed in 25 files, 0 failed, 0 skipped. |
| Latest `npm run build -- --base=/ghost-rehearsal/` | Exit 0; existing chunk-size warning. |
| Focused report check after moving the evidence action | Exit 0; 10 passed, 0 failed, 0 skipped. |
| Focused report/comparison check after boundary fixes | Exit 0; 23 passed in 2 files, 0 failed, 0 skipped; initial new fixture failure and correction recorded. |
| Initial desktop UI browser run | Exit 1; 5 passed, 5 failed, 0 skipped; raw report preserved. |
| Second desktop UI browser run | Exit 1; 5 passed, 1 failed, 0 skipped, plus an outside-test teardown timeout; raw report preserved. |
| First full browser run after implementation | Exit 1; 48 passed, 8 failed, 4 intentional capture skips; 400190.381 ms; no report-level errors. |
| Second full browser run | Exit 1; 52 passed, 4 failed, 4 intentional capture skips; 206707.215 ms; failures limited to strict corner-hit assertions. |
| Third full browser run | Exit 1; 48 passed, 8 failed, 4 intentional capture skips; 357805.002 ms; a new export test expected four plans instead of the setup's five. |
| Final `npm run test:browser` | Exit 0; 56 passed, 0 failed, 4 intentional capture skips, 0 flaky; 258156.366 ms; no report-level errors. Preview cleanup required after the cases finished. |
| Acceptance path matrix | All 40 rows passed across two viewports, two languages, two motion preferences and five paths. |
| After capture | Exit 0; 4 passed, 0 failed, 0 skipped, 0 flaky; 46279.242 ms; 28 images paired with all 28 baseline images. |

The baseline already had one intermittent desktop A/B/C guide failure and a teardown timeout; its full raw JSON was overwritten by the baseline isolated rerun. The preserved baseline JSON therefore proves only the two-case isolated rerun. The first full run's scope disclosure and phone Journey regressions passed after correction in the second run; the corner-hit correction passed in the third. The third run's export failure was an incorrect new-test assumption, not a product regression. The final suite passes all cases after correction; failed reports remain preserved.

## Screenshot review set

The six pairs below form the required 12-image review set. Before images were taken before source changes; after images use `c3464a4`. The [full inventory](ui-visual-polish/README.md) includes Chinese, phone and narrow-panel captures, totaling 28 pairs with no missing image.

| Screen | Before | After |
| --- | --- | --- |
| Welcome, 1366×768 English | [Before](ui-visual-polish/before/welcome-1366x768-en.png) | [After](ui-visual-polish/after/welcome-1366x768-en.png) |
| Build with Inspector, 1366×768 English | [Before](ui-visual-polish/before/build-inspector-1366x768-en.png) | [After](ui-visual-polish/after/build-inspector-1366x768-en.png) |
| Rehearse with tracked guest, 1366×768 English | [Before](ui-visual-polish/before/rehearse-tracked-1366x768-en.png) | [After](ui-visual-polish/after/rehearse-tracked-1366x768-en.png) |
| Two Futures overview, 1366×768 English | [Before](ui-visual-polish/before/two-futures-overview-1366x768-en.png) | [After](ui-visual-polish/after/two-futures-overview-1366x768-en.png) |
| Journey with first divergence, 1366×768 English | [Before](ui-visual-polish/before/journey-divergence-1366x768-en.png) | [After](ui-visual-polish/after/journey-divergence-1366x768-en.png) |
| Phone evidence, 390×844 English | [Before](ui-visual-polish/before/narrow-evidence-390x844-en.png) | [After](ui-visual-polish/after/narrow-evidence-390x844-en.png) |

## Reproduce and review

These steps reproduce the tested paths and the screenshot states.

1. From a fresh directory, run `git clone --branch kiro/ui-visual-polish https://github.com/kanzaler123/ghost-rehearsal.git`, then `cd ghost-rehearsal`. Confirm `git branch --show-current` prints `kiro/ui-visual-polish`. Remote delivery is pending until the branch push is recorded.
2. Use a Node version supported by `package.json`, run `npm ci`, then `npx playwright install chromium`. Successful commands install the locked dependencies and the browser needed by the tests.
3. Run `npm run check`, `npm run build -- --base=/ghost-rehearsal/` and `npm run test:browser`. Compare actual results with the linked verification record; the browser script builds a production bundle and starts its own local preview using the real Worker.
4. Run `npm run dev` and open the local URL printed by Vite in a fresh browser profile. At 1366×768, the welcome view should show the product sentence plus separate example, blank-activity and import actions. Choose “Try the two-plan demo”; Build should open without a second tour overlay.
5. For Build, use the plan navigator search to locate the packing station and select it. The expanded Inspector should identify that station. Review the node cards and viewport controls; edit a parameter, undo and redo, checking the value, selection and viewport each time.
6. Enter Rehearse, wait for the real run, pause and scrub to 03:30. Open the Guest journey dock tab, search `side-stream:10` and select the exact guest #10. The clock, live state and tracked station should agree; the clock should remain still after pausing.
7. Return to Build and start the A/B/C comparison guide. The initial Two Futures view should show the A/B plan names, snapshot and three conclusion groups. Read plan changes, outcomes, affected guests and resource costs; switch statistics scope and verify that it changes the summary basis without rerunning.
8. Use the guide’s guest and first-divergence actions. The Journey should identify `side-stream:10`, the first divergence at 03:30, A queueing and B serving; jumping should pause at the same time and keep the same guest. Activate the evidence entry to expose station times and raw events.
9. At 390×844, use the Two Futures report, flow, journey and evidence switcher. Review each view without document-level horizontal scrolling; the staff-post evidence path should show `check-staff`. The arrangement is forced to top-bottom with an explanation; widening should restore the saved explicit choice.
10. Repeat the relevant views in Chinese and with the browser’s reduced-motion preference enabled. Replay should begin paused under reduced motion, while explicit play and scrubbing still work. Record any inaccessible target, clipped label, unexpected motion or missing focus indicator rather than treating visual similarity as a pass.

## Coordination and remaining limits

- [Interface notes](ui-visual-polish/interface-notes.md) record task B PR #5 as open and unmerged at `b22556accca1fc27e9fb0dc6d72ef8ed3d93e72b`, against integration `ca28c078443b35d49bee6593a5d0dc6a20db12ae`. The late Inspector wrapper (task 20.2) is deferred; `Inspector.tsx` and `Dialogs.tsx` remain unchanged. Inspector keyboard dismissal remains within that ownership boundary; this review does not claim every drawer now implements Escape dismissal. Apply any future wrapper to B’s reviewed markup.
- The intended Draft PR targets `kiro/release-integration` and depends on task A PR #3, still unmerged at `40dc58d` when checked. Draft PR creation and push are pending. After A merges, synchronize by merging integration into this branch and rerun checks; do not rebase or force-push.
- The browser matrix and screenshot capture pass. The verification record maps checked interactions to tests; the image inventory supplies all matching visual states.
- Precisely positioned timeline segments can be short or overlap at the same timestamp. Their geometry is not enlarged into false durations; the text alternative provides larger actionable entries. This does not establish a separate, non-overlapping 44×44 target for every point on the drawn timeline.
- Final output retains the existing large-chunk build warning. The final browser suite finished all tests but required stopping its verified preview process to complete teardown and write exit 0. Automatic local preview shutdown remains unresolved; no general process-killing or infrastructure workaround is part of this UI change.
- Frozen simulation, schema, analysis and project files have an empty diff against the baseline. No separate business-logic change is included.

## Unresolved decisions

1. Should the people-list page number, search text, group filter and overview scroll position be retained when returning from the Visitor Journey? The baseline does not retain all of this state; no new return-context retention was added in this round.
2. Should each Two Futures canvas get its own “edit this plan” action? This round adds the “Read-only” presentation and does not add per-canvas editing entry points.
3. Should Inspector field-level validation messages and undo granularity change? These belong to task B, `kiro/dialog-form-reliability`, and are unchanged here.

Kiro contribution and unexported evidence are recorded separately in [the usage note](../kiro/ui-visual-polish-usage.md). Codex implementation, tests and screenshots are not attributed to Kiro; no Hook execution is claimed without a recorded execution output.
