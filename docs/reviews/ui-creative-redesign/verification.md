# Verification — UI creative redesign

## 2026-11-16 21:50–21:57 UTC+8 — baseline

Baseline application: `f837199` on `feat/ui-creative-redesign`. Host and protected work: [baseline-state.json](baseline-state.json). Windows; Node/npm versions are recorded there. The existing uncommitted README change belongs to earlier work and is preserved.

- `npm run check`: exit 0; 32 files / 463 tests passed, no failures or skips. [Log](baseline-check.log).
- `npm run build`: exit 0; existing large-chunk warning. [Log](baseline-build.log).
- `npm run test:browser`: running; complete result will be appended. [Log](baseline-browser.log).
- A/B/C deterministic equivalence: `npx vitest run tests/ui-redesign-equivalence.test.ts --environment node --update`, exit 0, one test passed. Six baseline SHA-256 digests captured before application edits. [Log](baseline-equivalence.log).
- First additional capture attempt interrupted after welcome did not render. The concurrent browser build uses `/ghost-rehearsal/`, while the inherited capture configuration used `/`. Corrected the review-only preview base and restarted; no application or test infrastructure change. [First log](baseline-capture.log), [retry](baseline-capture-retry.log).
- Kiro's earlier screenshots remain available; the corrected captures use the requirement's 210-second state and specific guest. Partial screenshot coverage is not full acceptance.

## 2026-11-16 22:00–22:14 UTC+8 — baseline completion and capture corrections

- Full baseline browser command reached its unchanged 600-second global limit: 203 passed, 1 failed, 3 skipped, 77 not run; 2 global errors. The failed desktop-Chinese 1280×720 new-event footer case is retained in `baseline-browser.json` and the log. This is not a green baseline.
- Baseline shard 1/2 also reached 600 seconds: 69 passed, 1 failed (delayed-import Undo), 1 skipped, 71 not run, 2 global errors. Its log and JSON are retained. The follow-on command was interrupted before continuing baseline work against modified sources. This incomplete run is not used to claim baseline coverage.
- Capture retry: 5 passed / 1 failed. Mobile replay controls were hidden by the report tab; the arrival unit label included its options; a deliberately delayed Worker request could already be cancelled. Corrected the review script's navigation/locator and cancellation handling. Final rerun of desktop EN and mobile EN/ZH: 3 passed in 4.5 minutes. Other desktop/laptop captures came from the preceding corrected run. These fixes affect the evidence harness only.

## 2026-11-16 22:12–22:29 UTC+8 — implementation corrections

Application remained on baseline parent `f837199` during these uncommitted checks. Host is unchanged from baseline-state.json.

- Check 1 failed at TypeScript because the TopBar unit fixture did not supply its new required display prop.
- Check 2: 451 passed / 13 failed, all Canvas unit fixtures lacking `population` on their partial run. Added the fixture field; no assertion changed.
- Check 3: 464 passed, 33 files. Check 4 then exposed that the deliberately partial run requires an `unknown` assertion; restored that explicit fixture cast. Check 5: 464 passed, 33 files. Logs are retained as `implementation-check-*.log`.
- First-screen/theme subset: 4 passed in 15.2 seconds, desktop EN and mobile ZH; contrast, keyboard focus, narrow layouts and 03:30 guest evidence retained.
- First after full-browser attempt was stopped after discovering regressions. Five failures: the three new guide tests incorrectly counted always-open report disclosures as popovers, and two existing desktop layout tests found the last report row 0.90625 px below the available panel. Corrected the new test to inspect actual menus/popovers, and reduced report spacing. The interrupted run has only its text log; no complete JSON reporter result was emitted. It is not a gate pass.
- Correction retry: welcome activation and superseded reads passed; report spacing still exceeded the boundary; the new proportional-bar check also used precision beyond CSS serialization (12.3333% versus 12.333333%). Reduced the report's top gap, kept the original layout assertion unchanged, and set the new percentage assertion to 0.0005 percentage-point tolerance (under 0.002 px at the card width).
- Final correction subset: 6 passed in 1.1 minutes (desktop EN/mobile ZH, ordinary/reduced motion, proportional bars). The earlier failure logs are retained.
- Visual corrections also restore an amber, contrasting play control; keep run/stop width stable; make keyboard outlines remain 2 screen pixels at every zoom; and remove residual journey-marker interpolation after seeking.

## 2026-11-16 22:29–22:36 UTC+8 — WebKit welcome validation

- The first review configuration timed out navigating to local port 4190 before any document request. Interrupted the remaining cases. A separate probe loaded the identical baseline on 4192; the same delivered build loaded successfully on 4193. HTTP 200 on 4190 was independently confirmed. No application error was suppressed and no timeout assertion was relaxed.
- Changed only the review configuration's preview URL to 4193. Result: **24 passed in 1.8 minutes**, one worker, no retries, desktop/mobile × EN/ZH. Pointer, native Enter and Space each start one guide, keep visible focus after 1,100 ms, open no unrelated menu, use the production Worker, and reach guest `side-stream:10` at 210 seconds. Late import success/failure is discarded. `welcome-webkit-port-fixed.log` contains the result.
- This is WebKit automation on this Windows host, not certification on physical Safari/iOS hardware. These results precede the final nonvisual run-target/name-key/language callback corrections; delivered-build results will be recorded separately.

## 2026-11-16 22:37 UTC+8 — implementation commit and scope review

Implementation commit: `af34260` on `feat/ui-creative-redesign`. Every source hunk was reviewed against requirements 6, 7, 9, 10, 14–17 and 22: entry/signature, readable editing, run context, truthful guest/queue display, motion, tokens/accessibility and safe guide handoff. Test changes are limited to the selected presentation and consumed fixture fields; assertions remain intact.

`git diff --quiet f837199 -- src/simulation src/schemas src/features/analysis.ts src/features/stages.ts src/features/project.ts package.json package-lock.json vite.config.ts tsconfig.json tsconfig.schemas.json playwright.config.ts e2e/project/playwright.config.ts e2e/comparison/playwright.config.ts e2e/robustness/playwright.config.ts vitest.config.ts .github/workflows` returned 0. `git diff --check` returned 0. No merge, push or deployment occurred.

## 2026-11-16 22:37–22:55 UTC+8 — delivered inspection and narrow-screen correction

Host remains the baseline Windows host. At `af34260881d830781c7d89dd93a497f731fc6cc4`, `npm run check` passed 464 tests in 33 files (3.61 s, exit 0); `npm run build` exited 0. The complete `npm run test:browser` then exited 1: 303 passed, one failed, four opt-in captures skipped, no retries, 6.0 minutes. Preserved results: `delivered-check.log`, `delivered-build.log`, `delivered-browser.log` and `delivered-browser.json`.

The failed mobile-English experiment-export flow exposed a real 320×720 layout regression: the permanent run context and wrapping header reduced the fixed-height comparison workspace to approximately 16 px. Sticky controls intercepted the report outcome disclosure. The correction lets narrow comparisons scroll as a page, as the guided comparison already did. The first six-case retry passed five but found horizontal overflow after successfully completing that flow. A DOM geometry probe identified the report toolbar's English no-wrap button labels, not the result data. A narrow-screen white-space override fixes that remaining overflow. Neither existing test nor assertion was changed. Intermediate evidence: `mobile-report-fix.log`, `mobile-report-probe.png`; second retry: `mobile-report-fix-2.log`.

The `af34260` after-capture set passed all six viewport/language projects in 1.5 minutes. The extra check-viewport run was interrupted after eight projects passed when the mobile correction required a new build; it is not counted as a complete check. Both logs are retained. Final capture sets will be regenerated against the correction commit.

The successful baseline and `af34260` production measurement runs exited 0, after preserving the unsuccessful first baseline probe separately. Across node dragging, panning, zooming and four 10-second replay cases, frame-interval p95 was 16.7–16.8 ms. No replay task of 50 ms or longer was reported. The synthetic 10,000-guest cutoff run succeeded with 68,285 events: 361 ms before / 377 ms after, measured from UI activation to rendered result. **This includes scheduling and rendering, so it is not the required isolated Worker timing or a performance certification.** Raw records are `before-production-audit.json` and `after-production-audit.json`; videos are in `recordings/`.

## 2026-11-16 22:55–23:04 UTC+8 — corrected implementation `cec4204`

The mobile retry passed all six cases in 40.9 s, exit 0, with no failures/skips/retries. Its source diff is exactly the subsequently committed `cec4204bc40f378d680a4c30c8ef6581e9309e7a`. The two CSS changes were reviewed against narrow-screen reachability and overflow requirements; the simulation and test assertions remain unchanged. Final `npm run check` passed all 464 tests / 33 files in 5.52 s; `npm run build` exited 0 (730 ms Vite build, existing chunk warning). The complete browser command follows those checks and is recorded in `final-browser.log`/JSON.

The first final capture launch overlapped the browser command's rebuild, so its initial document could not render during asset replacement. It was interrupted and retained as `final-after-capture.log`. The stable-build retry passed all six capture projects in 2.2 minutes, then all ten additional viewport/language projects in 3.0 minutes, exit 0, no unreachable capture steps. See `final-after-capture-2.log` and `final-check-viewports.log`. These cover core states at 1920×1080, 1440×900, 1366×768, 1280×720, 1024×768, 768×1024, 390×844 and 320×568, in both languages. Secondary-state screenshots are concentrated at desktop EN and mobile ZH; they are not a full secondary-state cross product.

Additional real-browser instrumentation uses the unchanged production Worker. The first interaction-audit attempt completed both 10,000-guest probes but found two legitimate buttons named Play replay; the script's ambiguous locator was narrowed to the replay control. Both attempt records are retained. The corrected audit exited 0, with no page errors. Worker post-message-to-reply time was 1,202.5 ms baseline / 877.8 ms delivered (includes Worker startup and message transfer, excludes subsequent UI rendering). Ten-second 1× replay p95 was 16.8 / 33.3 ms; maximum 33.4 / 33.4 ms; no task of 50 ms or longer was reported. Other browser checks were running on the same host during this supplementary probe, so the values do not establish a Worker speedup. This remains a probe, not a scale certification.

Chromium Event Timing reported upper bounds of 56 ms play, 16 ms pause, 64 ms scrubber pointer seek, 128 ms guest selection, 128 ms Build switch, 120 ms Rehearse switch and 168 ms export opening. The 16 ms result means no event exceeded the browser's reporting threshold; other values are quantized to 8 ms. All are below 200 ms. See `interaction-audit.json` and `interaction-audit.mjs`.

The owner approved the prepared README patch at 23:03 UTC+8. The working README retains the earlier draft, with only the approved changes applied. The staged README is constructed from HEAD plus the redesign wording, preserving earlier verification paragraphs; unrelated restructuring remains unstaged. This satisfies the approval without committing the earlier draft.

## 2026-11-16 23:06 UTC+8 — complete gates

At tested implementation `cec4204bc40f378d680a4c30c8ef6581e9309e7a`, the unchanged `npm run test:browser` completed successfully: **304 passed, 4 skipped, 0 failed, 0 flaky, 0 not run; 582.266 s; exit 0**. All four skips are the original opt-in `e2e/ui/capture.spec.ts`. No retries or timeout increases were used. The earlier mobile-English experiment-export failure now passes in this complete run. `final-browser.json` contains every result. Together with the preceding final check and build, requirement 20.4's three commands all exit 0.

The delivered welcome WebKit configuration passed **24 / 24 in 2.9 minutes**, no failures/skips/retries, exit 0. This is `npx playwright test -c docs/reviews/ui-creative-redesign/playwright.webkit.config.ts`, covering the new guide/late-import/queue display behavior on four desktop/mobile and language projects. The pre-existing `e2e/project/playwright.config.ts` and `e2e/comparison/playwright.config.ts` were not rerun: this round used their scenarios in the full Chromium suite and scoped WebKit automation to the changed welcome behavior. Their full WebKit coverage therefore remains unverified at this commit, as explicitly permitted for reporting by requirement 20.5.

`git diff --quiet cec4204 -- src index.html public labs examples package.json package-lock.json vite.config.ts tests e2e playwright.config.ts vitest.config.ts .github/workflows` returned 0 after the run. README and review-record edits do not alter any tested application or infrastructure tree. `git diff --check` and the staged check both returned 0.

Delivery comparison with `baseline-state.json`: all other branch heads and worktree heads match, and the stash list is identical. The authorized README wording is the only exception to preserving the original README bytes; its unrelated draft remains unstaged. Raw snapshots are in `delivery-state.json`.

## 2026-11-16 23:06–23:09 UTC+8 — final measurements and recordings

With the complete browser suites finished, `node docs/reviews/ui-creative-redesign/entry-audit.mjs` and then `node docs/reviews/ui-creative-redesign/production-audit.mjs` both exited 0 at `cec4204`. Earlier `af34260` measurements are retained under that prefix. All six after recordings were regenerated at the final application tree; each is below 3.1 MB, within the 8 MB per-file requirement. No page error was observed.

| Measurement | Baseline | Delivered | Limit / result |
|---|---:|---:|---|
| First-load JavaScript gzip | 291,895 B | 292,931 B | ≤350,000 B, pass |
| First-load CSS gzip | 34,935 B | 34,664 B | ≤60,000 B, pass |
| First-load binary assets | 359,396 B | 359,396 B | No increase, pass |
| Whole production build | 2,354,151 B | 2,366,375 B | ≤5,000,000 B, pass |
| Largest welcome CLS across 6 viewport/language combinations | 0.000650 | 0.000928 | ≤0.1, pass |
| Drag / pan / zoom p95 frame interval | 16.7–16.8 ms | 16.7–16.8 ms | ≤50 ms, pass |
| Rehearse and Compare, 1×/8×, each 10 seconds | 16.7–16.8 ms | 16.7–16.8 ms | ≤50 ms, pass |
| Longest observed replay main-thread task ≥50 ms | None | None | No observed task exceeded 200 ms |

First-load measurements use the actual requested assets in fresh contexts at 1440×900, 1366×768 and 390×844, both languages. No horizontal page overflow or page error occurred. Reduced-motion playback and the 10,000-guest after-run replay also measured 16.7 ms p95 on the final idle-host run. The separate Worker-message timing and interaction measurements remain in `interaction-audit.json`, with their host-load caveat. No frame-by-frame control-geometry or independent flash-safety certification is implied by these results.

Final staged review: every staged path is named in `staged-paths.txt`; source/document whitespace checks pass. Captured tool logs and the exact proposed patch retain their original trailing whitespace, so the unrestricted check reports those data-file whitespace warnings. No recorded failure or output text was removed to silence them. All changed paths and their ownership categories are in `changed-paths.tsv`. README's prior restructuring remains unstaged; only the approved redesign hunks are included.
