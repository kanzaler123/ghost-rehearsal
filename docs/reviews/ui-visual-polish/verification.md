# UI overhaul verification

Recorded on 2026-11-15. The final full type/unit check passes **370 tests in 25 files**; the production build passes. The final browser suite exits **0 with 56 passed, 0 failed, 4 intentional capture skips and 0 flaky cases**. All eight viewport/language/motion combinations pass the complete guide/export/import path. After capture exits **0 with four passed cases**, producing all 28 matching image pairs. Full-suite preview teardown required the verified run-owned process to be stopped after all cases completed; this local environment limitation remains. The capture run exited naturally.

## Baseline and evidence

Baseline: `40dc58deb073450f10b4d0aa64a79c22dc19d17f`. Inherited spec: `eeef1dc`; baseline record commit: `4d22025`; pre-edit images: `4ef1d01`; styles: `ef777c1`; implementation: `e478920`; new browser coverage: `746cb3a`; final boundary, focus and layout corrections: `c3464a4`. The final full browser run and after captures target the frozen source at `c3464a4`; their evidence is committed in `c97af40`. Attribution records are committed in `c3b33d9`.

See [baseline-checks.md](baseline-checks.md) for the original full baseline command results. The first full baseline browser JSON was overwritten before preservation; [baseline-browser-rerun-results.json](baseline-browser-rerun-results.json) covers only the isolated two-case rerun. This limitation prevents a complete raw per-case comparison against the original full baseline.

## Commands and observed outcomes

“Pending” is not an exit code. Counts describe the actual run in that row; they are not aggregated across retries.

| Command exactly as run | Exit | Passed / failed / skipped | Observation / evidence |
| --- | --- | --- | --- |
| `npm run check` (baseline) | 0 | 278 / 0 / 0; 13 files | Both typechecks and unit tests passed; inherited baseline record. |
| `npm run build -- --base=/ghost-rehearsal/` (baseline) | 0 | Not applicable | Existing chunk-size warning only. |
| `git diff --check` (baseline) | 0 | Not applicable | No whitespace errors. |
| `npm run test:browser` (baseline full run) | 1 | 11 / 1 / 0 | One intermittent guide failure and one outside-test teardown error; original JSON not preserved. |
| `npx playwright test e2e/demo/comparison.spec.ts --project=desktop-en` (baseline rerun) | 0 | 2 / 0 / 0 | [Raw isolated rerun](baseline-browser-rerun-results.json). |
| `$env:CAPTURE='before'; npm run test:browser -- e2e/ui/capture.spec.ts` | 0 | 4 / 0 / 0 | 28 pre-edit PNGs; 108019.967 ms; [raw capture](before-capture-results.json). |
| `npm run check` (before boundary fixes) | 0 | 364 / 0 / 0; 25 files | Both typechecks passed. |
| `npm run check` (after report/layout fixes) | 0 | 367 / 0 / 0; 25 files | Both typechecks passed. |
| `npm test -- tests/ui-canvas.test.ts tests/workbench-ui.test.ts tests/workbench.test.ts` (shell follow-up) | 0 | 370 / 0 / 0; 25 files | The package script still includes the full `tests` directory; this ran the whole unit suite, including the new focus/current-target checks. |
| `npm run typecheck` (shell follow-up) | 0 | Not applicable | Both TypeScript configurations passed; this was a separate command from the preceding unit run. |
| `npm run check` (final frozen source) | 0 | 370 / 0 / 0; 25 files | Both typechecks passed; Vitest started at 21:45:24 and finished in 4.65 s. |
| `$testFiles = Get-ChildItem -LiteralPath e2e/ui -Filter *.ts \| Select-Object -ExpandProperty FullName; npx tsc --noEmit --target ES2022 --module ESNext --moduleResolution Bundler --jsx react-jsx --esModuleInterop --skipLibCheck $testFiles` | 0 | Not applicable | Separate TypeScript check covers all UI browser test files. |
| `npm run build -- --base=/ghost-rehearsal/` (latest before boundary fixes) | 0 | Not applicable | Existing warning for chunks above 500 kB; no build failure. |
| `npm run build -- --base=/ghost-rehearsal/` (final frozen source) | 0 | Not applicable | Bundle built in 893 ms; the existing greater-than-500 kB chunk warning remains. |
| `npx vitest run tests/ui-report.test.ts --environment node` (after evidence-button move) | 0 | 10 / 0 / 0; 1 file | Evidence entry precedes conclusion lists. |
| `npm run test:browser -- e2e/ui --project=desktop-en --grep-invert capture` | 1 | 5 / 5 / 0 | 331394.862 ms; [initial raw report](desktop-ui-initial-results.json). |
| `npm run test:browser -- e2e/ui/accessibility.spec.ts e2e/ui/arrangement.spec.ts e2e/ui/reduced-motion.spec.ts e2e/ui/touch-targets.spec.ts e2e/ui/layout.spec.ts --project=desktop-en` | 1 | 5 / 1 / 0 | 600008.884 ms, plus outside-test teardown timeout; [second raw report](desktop-ui-second-results.json). |
| `npm run test:browser` (first full implementation run, preceding the final rerun) | 1 | 48 / 8 / 4 | 400190.381 ms; errors array empty; [raw full report](full-browser-initial-results.json). Four scope disclosure failures and four mobile Journey overflows. |
| `npm run test:browser` (second full implementation run) | 1 | 52 / 4 / 4 | 206707.215 ms; [raw full report](full-browser-second-results.json). Only the four strict corner-hit cases failed. |
| `npm run test:browser` (third full implementation run) | 1 | 48 / 8 / 4 | 357805.002 ms; [raw full report](full-browser-third-results.json). Eight new layout/export cases incorrectly expected four plans; the setup creates five. The run exited naturally. |
| `npm run test:browser` (final full rerun) | 0 | 56 / 0 / 4; 0 flaky | 258156.366 ms; errors array empty; [final raw report](after-browser-results.json). Capture cases intentionally skip when CAPTURE is unset. After all cases completed, the verified run-owned preview process was stopped to finish teardown. |
| `npx vitest run tests/ui-report.test.ts tests/comparison-ui.test.ts --environment node` (first boundary-fix check) | 1 | 22 / 1 / 0; 2 files | Newly added zero-completed test used invalid cutoff 0 and received no usable result. Fixture corrected to valid cutoff 1. |
| `npx vitest run tests/ui-report.test.ts tests/comparison-ui.test.ts --environment node` (boundary-fix rerun) | 0 | 23 / 0 / 0; 2 files | Open scope disclosure, retained average/P90 dashes and exact stale text pass; existing comparison assertions unchanged. |
| `git diff --stat 40dc58deb073450f10b4d0aa64a79c22dc19d17f -- src/simulation src/schemas src/features/analysis.ts src/features/project.ts src/components/Dialogs.tsx src/components/Inspector.tsx` | 0 | Not applicable | Empty output: frozen business logic and B-owned source files unchanged. |
| `git diff --check` (delivery documents and current working tree) | 0 | Not applicable | No whitespace errors; Git reports the repository's LF/CRLF conversion notices. Recheck after later edits. |
| `$env:CAPTURE='after'; npm run test:browser -- e2e/ui/capture.spec.ts` | 0 | 4 / 0 / 0; 0 flaky | 46279.242 ms; [raw capture report](after-capture-results.json). All 28 after images match the before filenames; no missing images. Natural process exit without cleanup. |
| `git push -u origin kiro/ui-visual-polish` | 0 | Not applicable | Branch created on origin and upstream configured; source and screenshot evidence pushed. |
| Draft PR creation and inspection | Not run | Not applicable | Target must be `kiro/release-integration`, draft, dependent on PR #3; no merge. |

The before-capture setup first encountered an ambiguous search matching guest IDs 10 and 100–109 and was interrupted. The successful capture selected the exact displayed #10. Its four-case raw report, not the interrupted attempt, is the capture evidence.

The production CSS inspection found ordered `@layer vendor`, `tokens`, `base`, `components`, `layout`, `modes`, `responsive`, `motion` blocks and retained `color-mix` output. The optimizer removes the separate layer-order declaration but retains the ordered blocks. This is recorded as an output-format difference from task 2.1, not a claim that the literal declaration survives minification.

`tests/example.test.ts` and `tests/fingerprint.test.ts` pass unchanged in the latest full check. The frozen-file diff is empty. These establish the existing example and fingerprint regression contracts; no new simulation semantics are asserted by visual tests.

## Failures and corrections

### Pre-existing baseline failures

- The desktop English “real Worker: guided A/B/C, scopes, bilingual evidence and project round trip” test once failed to find the Finished row within 10 seconds; its first expected cell was 41. Its isolated two-case spec rerun passed. The cause was not investigated.
- The baseline full run timed out after 600 seconds during setup-plugin teardown and left its preview server on port 4178. This was an outside-test error.
- The second focused UI run again reported a 600-second teardown timeout. Its owned leftover preview process was identified and stopped. Reappearance is recorded separately from test assertion failures.

### New focused UI run failures

| Run / case | Observed failure | Correction or current status |
| --- | --- | --- |
| Initial accessibility | Clicking the welcome example timed out while waiting for stability. | All four accessibility cases passed in the second full run. |
| Initial arrangement | After reload the test assumed A/B order and expected 12/9/279; observed 9/12/279. | Persistence assertion now checks arrangement state without assuming restored plan order; original numerical comparison tests remain unchanged. |
| Initial reduced-motion layout | Directly clicking the packing canvas node was intercepted by nearby cards/pane. | Shared setup now searches and selects the real node through the plan navigator and waits for viewport stability. |
| Initial reduced-motion replay | “Play replay” matched both the state-card action and dock control. | Replay interaction is scoped to `.play-btn`. |
| Initial phone touch case | Document width exceeded the viewport. | Focused rerun passed; strengthened corner-hit assertions later found a separate target issue. |
| Second accessibility | `.workspace-menu > summary` matched three menus. | The class now identifies the top-bar menu only; unchanged menu expectations pass in all four second-full-run projects. |

### Full-run regressions and fixes

The first full implementation suite finished with 48 passed, 8 failed and 4 intentional capture skips. Four original boundary cases failed because the completed-only disclosure was hidden; four mobile layout cases failed because Journey overflowed. These are actual UI regressions, not baseline failures. At the end of all 60 declared cases the runner was waiting for preview shutdown; its workspace command and creation time were checked, and only that run's preview process was stopped. The runner then returned the real eight-failure result, with no outside-test error and no 600-second timeout in that report. Assertions were not bypassed.

- The report's new collapsed outer scope hid the original completed-only control. The outer scope now follows the snapshot and conclusions and starts open; the completed-only subgroup remains collapsed until selected.
- The zero-completed presentation had removed the existing average/P90 labels and unavailable dashes. They now remain alongside the explicit no-completed explanation.
- Stale comparison detail explicitly uses the existing comparison stale message.
- A general 44px dock-button minimum widened short timeline segments and caused phone document overflow. The rule now excludes exact-time segments; their text-list alternatives remain available.

All eight first-full-run failures passed in the second full run. That run's four failures were the phone corner-hit case in each project: nominal control dimensions alone did not guarantee that all corners reached the control. The transparent hit layer was corrected without loosening the assertions, and all four cases passed in the third full run.

The third full run's eight failures came from the new export step in each layout/motion combination. Loading the welcome demo creates two plans; starting its guide adds A/B/C, for five in total. The new test incorrectly expected four. The assertion now uses the setup's actual five-plan contract and also checks byte-for-byte export equality after import. Existing statistical and round-trip assertions were not changed. This is a test-setup correction, not a product regression. All eight complete paths pass in the final full run.

The final run completed all 60 declared cases before waiting for preview teardown. The process was checked against the PID previously emitted by Playwright's WebServer, its Node executable and unchanged creation time; only that preview process was stopped. The runner then wrote exit 0 with an empty errors array. This does not establish fully automatic local teardown, and the report does not conceal that manual cleanup.

## Coverage and test contracts

Existing `e2e/smoke.spec.ts`, `e2e/demo/comparison.spec.ts`, statistical expected values and existing unit assertions were not edited. The sole existing test file changed is `tests/workbench.test.ts`: its flatten helper expands registered extracted shell components, and its button helper accepts `aria-label` as well as visible text so the same assertions reach the same controls. No existing test file or case was deleted and no existing assertion was loosened.

The new UI tests share exact localized labels and actual navigation in `e2e/ui/studio.ts`. The selector corrections listed above apply to new tests. Capture selects guest #10 exactly, preventing accidental selection of #100–109. Original contract classes remain in source/render tests: `.outcome-table`, `.people-stats`, `.people-list`, `.people-result`, `.ghost-id`, `.diff-note`, `.bin-count`, `.evidence-card`, `.pair-groups`, `.resource-comparison`, `.report-plans`, `.comparison-identities`, `.statistics-scope`, `.journey-header`, `.ghost-stories`, `.workspace-menu`. Existing smoke/demo cases pass in the second full run with their statistical assertions unchanged.

The presentation checks use table-driven examples, **not property-based** testing; no `fast-check` dependency was added. Simulation-backed unit checks cover unchanged numerical contracts, gating, scopes, queues and divergence. Unit checks do not replace real keyboard, layout or motion observations.

| Interaction | Evidence exercised |
| --- | --- |
| Build edit and history | `acceptance.spec.ts` changes maximum concurrent service, then checks the value, selected node and viewport after both undo and redo. |
| Replay and scopes | Browser tests pause for two seconds, scrub, select speed and jump to the recorded divergence; unit tests compare live counts with replay state while scoped summaries remain fixed. Original demo tests check statistics-scope changes and stale results. |
| Two Futures and evidence | `layout.spec.ts` follows overview, guest journey, divergence and staff-post evidence, then creates C and checks 72 completed guests. It also checks the five desktop snapshot rows fit inside the first report viewport, metric text does not overlap and timeline marker labels do not overlap vertically. The paths run in each of the eight viewport/language/motion combinations. |
| Exports and import | The same layout path checks the arrangement export contains 72 completed, exports the setup's five-plan project, imports it again and compares its re-export byte for byte. Existing demo tests additionally check the original detailed round-trip contracts. |
| Motion | `reduced-motion.spec.ts` checks paused startup, explicit playback, scrubbing and computed animation/transition durations; unit tests check zero-duration viewport placement and unchanged results. |
| Accessibility and targets | Browser tests exercise keyboard menus, Checks drawer and canvas Add menu Escape/focus return, replay, guest selection and divergence; shell tests check control names and live announcements. Phone tests check sidebar dimensions and actual corners of key controls. |
| Run failures | Normal paths use the real Worker. Targeted failure tests abort or delay its asset request to check failed, stopped and retrying states without presenting retained comparison evidence as current. |

The matrix below records path coverage rather than claiming an exhaustive audit of every possible field or dialog state. Precise short timeline segments use the actionable text-list alternative. The current edit target remains visibly marked in compact Build/Rehearse rails and the Two Futures Plans control. Inspector source and its keyboard-dismissal behavior remain with task B; the new Checks drawer and canvas-menu handling does not imply that every B-owned drawer was changed.

## Acceptance matrix

Each row names the viewport, language, motion and path exercised by `layout.spec.ts` in the final passing suite. Its eight cases each cover the five paths below, including C, report export, project import and byte-identical re-export. These are observed path results, not forty separate Playwright cases.

| Viewport | Language | Motion | Path | Result / observation |
| --- | --- | --- | --- | --- |
| 1366×768 | English | Normal | Overview | Passed — snapshot and conclusions visible; report layout assertions pass. |
| 1366×768 | English | Normal | Guest journey | Passed — recorded 03:30 divergence, staff-post evidence and readable marker labels. |
| 1366×768 | English | Normal | Canvas | Passed — Build/Rehearse width and canvas-space checks; no page errors. |
| 1366×768 | English | Normal | A/B/C guide | Passed — follow guest, divergence and staff evidence; C completes 72 guests. |
| 1366×768 | English | Normal | Export / import | Passed — export contains 72 completed; five-plan project reimports and re-exports byte-identically. |
| 1366×768 | English | Reduced | Overview | Passed — snapshot and conclusions visible; report layout assertions pass. |
| 1366×768 | English | Reduced | Guest journey | Passed — recorded 03:30 divergence, staff-post evidence and readable marker labels. |
| 1366×768 | English | Reduced | Canvas | Passed — Build/Rehearse width and canvas-space checks; no page errors. |
| 1366×768 | English | Reduced | A/B/C guide | Passed — follow guest, divergence and staff evidence; C completes 72 guests. |
| 1366×768 | English | Reduced | Export / import | Passed — export contains 72 completed; five-plan project reimports and re-exports byte-identically. |
| 1366×768 | Chinese | Normal | Overview | Passed — snapshot and conclusions visible; report layout assertions pass. |
| 1366×768 | Chinese | Normal | Guest journey | Passed — recorded 03:30 divergence, staff-post evidence and readable marker labels. |
| 1366×768 | Chinese | Normal | Canvas | Passed — Build/Rehearse width and canvas-space checks; no page errors. |
| 1366×768 | Chinese | Normal | A/B/C guide | Passed — follow guest, divergence and staff evidence; C completes 72 guests. |
| 1366×768 | Chinese | Normal | Export / import | Passed — export contains 72 completed; five-plan project reimports and re-exports byte-identically. |
| 1366×768 | Chinese | Reduced | Overview | Passed — snapshot and conclusions visible; report layout assertions pass. |
| 1366×768 | Chinese | Reduced | Guest journey | Passed — recorded 03:30 divergence, staff-post evidence and readable marker labels. |
| 1366×768 | Chinese | Reduced | Canvas | Passed — Build/Rehearse width and canvas-space checks; no page errors. |
| 1366×768 | Chinese | Reduced | A/B/C guide | Passed — follow guest, divergence and staff evidence; C completes 72 guests. |
| 1366×768 | Chinese | Reduced | Export / import | Passed — export contains 72 completed; five-plan project reimports and re-exports byte-identically. |
| 390×844 | English | Normal | Overview | Passed — snapshot and conclusions visible; report layout assertions pass. |
| 390×844 | English | Normal | Guest journey | Passed — recorded 03:30 divergence, staff-post evidence and readable marker labels. |
| 390×844 | English | Normal | Canvas | Passed — Build/Rehearse width and canvas-space checks; no page errors. |
| 390×844 | English | Normal | A/B/C guide | Passed — follow guest, divergence and staff evidence; C completes 72 guests. |
| 390×844 | English | Normal | Export / import | Passed — export contains 72 completed; five-plan project reimports and re-exports byte-identically. |
| 390×844 | English | Reduced | Overview | Passed — snapshot and conclusions visible; report layout assertions pass. |
| 390×844 | English | Reduced | Guest journey | Passed — recorded 03:30 divergence, staff-post evidence and readable marker labels. |
| 390×844 | English | Reduced | Canvas | Passed — Build/Rehearse width and canvas-space checks; no page errors. |
| 390×844 | English | Reduced | A/B/C guide | Passed — follow guest, divergence and staff evidence; C completes 72 guests. |
| 390×844 | English | Reduced | Export / import | Passed — export contains 72 completed; five-plan project reimports and re-exports byte-identically. |
| 390×844 | Chinese | Normal | Overview | Passed — snapshot and conclusions visible; report layout assertions pass. |
| 390×844 | Chinese | Normal | Guest journey | Passed — recorded 03:30 divergence, staff-post evidence and readable marker labels. |
| 390×844 | Chinese | Normal | Canvas | Passed — Build/Rehearse width and canvas-space checks; no page errors. |
| 390×844 | Chinese | Normal | A/B/C guide | Passed — follow guest, divergence and staff evidence; C completes 72 guests. |
| 390×844 | Chinese | Normal | Export / import | Passed — export contains 72 completed; five-plan project reimports and re-exports byte-identically. |
| 390×844 | Chinese | Reduced | Overview | Passed — snapshot and conclusions visible; report layout assertions pass. |
| 390×844 | Chinese | Reduced | Guest journey | Passed — recorded 03:30 divergence, staff-post evidence and readable marker labels. |
| 390×844 | Chinese | Reduced | Canvas | Passed — Build/Rehearse width and canvas-space checks; no page errors. |
| 390×844 | Chinese | Reduced | A/B/C guide | Passed — follow guest, divergence and staff evidence; C completes 72 guests. |
| 390×844 | Chinese | Reduced | Export / import | Passed — export contains 72 completed; five-plan project reimports and re-exports byte-identically. |

The shared browser configuration remains unchanged. UI specs set their owned 1366×768 viewport locally; existing desktop smoke/demo cases also pass at the shared 1440×1000 viewport in the second full run. No separate 1440×900 screenshot review has been recorded.

## Screenshot and delivery gates

There are 28 before images, captured and committed before any source edit, and 28 matching after images from `c3464a4`. [README.md](README.md) identifies every pair by state, viewport and language. The six representative pairs form the required 12-image set; no image is missing. Visual review covered desktop comparison, Chinese Build Inspector, phone welcome, mobile Journey and narrow evidence, alongside the browser's snapshot and label-overlap assertions.

Implementation and verification are complete within the documented scope and presentation choices. Inspector wrapper task 20.2 is deferred because task B's PR #5 is live and unmerged; see [interface-notes.md](interface-notes.md). The report records the three excluded decisions without adding their behavior. Push and Draft PR evidence remain pending.
