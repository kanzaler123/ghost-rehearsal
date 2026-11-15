# Release integration verification

Code candidate: `bbcd9f8e49a67e26627155ba5d1c4083af9208af`, based on integration `967f1901e3c3b13909ea0c872524b381d1e667e8`. Main baseline: `6309d5f33ff3cb38a3e72d34e21b4d7a2ac5e6c2`. Its production source is identical to `151ba7c05c041bf420d4d816ecb0967ac17ffe6d`; the final commit changes one browser-test wait.

Status: candidate reviewed and validated for integration. Merge to main requires passing CI on the final integration tip.

## Scope and behavior

The integration contains reviewed PRs [#4](https://github.com/kanzaler123/ghost-rehearsal/pull/4) (browser infrastructure), [#3](https://github.com/kanzaler123/ghost-rehearsal/pull/3) (comparison/guide), [#6](https://github.com/kanzaler123/ghost-rehearsal/pull/6) (measured inputs), [#7](https://github.com/kanzaler123/ghost-rehearsal/pull/7) (robustness), [#8](https://github.com/kanzaler123/ghost-rehearsal/pull/8) (UI), and [#5](https://github.com/kanzaler123/ghost-rehearsal/pull/5) (forms). [PR #9](https://github.com/kanzaler123/ghost-rehearsal/pull/9) supplies the production connections and remaining fixes.

- Arrival CSV/TSV imports replace one group's outer scenario draft. Pending imports block outer Apply; Cancel does not change the project. Service imports commit one undoable node edit. Manual arrival/service-duration changes retain source notes and reset the source kind to User estimate.
- The comparison report opens robustness experiments with the current project and selected plans. The panel shows its fixed cutoff, uses a start-time snapshot and flags changed configuration. Ordinary rehearsal and experiments cannot run concurrently. Closing the panel cancels its worker. Single-group exports reopen through the ordinary workbench.
- Resource requirement rows retain their own numeric drafts when another row is removed. Quantity width leaves the resource selector readable. Embedded data controls retain enough height for their text.
- Opening the canvas menu cancels pending automatic placement. User zoom/pan still closes it; the original keyboard acceptance test is unchanged.
- File-input cancellation does not close its parent dialog. The timeline retains a visible focus outline when Firefox focuses it without matching `:focus-visible`.

These changes and this verification were performed with Codex. Independent Codex agents cross-reviewed the implemented areas; this is not a claim of external human approval or additional Kiro work.

## Checks

| Check | Result |
| --- | --- |
| Both TypeScript checks and unit tests | Passed on production source `151ba7c`: 452 tests, 30 files; 5.71 seconds in CI |
| Production build at `/ghost-rehearsal/` | Passed; ordinary and robustness worker assets emitted |
| Original keyboard browser case | Passed in English/Chinese at desktop/mobile sizes |
| Robustness standalone browser matrix | Passed: 16/16; 6.7 minutes |
| Production import, experiment and existing layout regressions | Passed on `98af659`: 6/6 desktop-English cases; 2.2 minutes; included in the later full matrix |
| Full production Chromium matrix | Passed in CI on `151ba7c`: 168 passed, 4 optional capture cases skipped, 0 failed; 4.9 minutes |
| Data-source standalone matrix | Passed on the code candidate: 30/30, English/Chinese, desktop/mobile/short-screen; cleanup complete |
| Firefox key production paths | Passed on the code candidate: 6/6 in 47.0 seconds, Firefox 159, Windows desktop English, one worker, full trace and original timeouts |
| Remote PR CI | [Run 43731147969](https://github.com/kanzaler123/ghost-rehearsal/actions/runs/43731147969) passed on `151ba7c`; final merge remains gated by CI |

Local production measurements on Windows, Chromium 159.0.8154.6, 1440×1000: welcome usable 202 ms, comparison ready 224 ms, journey switch 82 ms, six-job batch 507 ms, cancellation 400 ms. These are single-run measurements, not service guarantees. The run recorded no console errors or page errors. Results are retained under `%TEMP%/ghost-rehearsal-release-measurements-20261115`; the standalone import evidence is under `%TEMP%/ghost-rehearsal-release-d-results-20261115`.

The first full unit run had a 5-second timeout in a simulation-heavy robustness test. Its unchanged 14-test file passed alone in 1.43 seconds; with other browser jobs stopped, the entire unchanged 452-test suite passed in 10.91 seconds. No timeout or assertion was relaxed.

Targeted browser development found two incorrect test assumptions: the default comparison outcome table is inside collapsed details, and canonical exports sort plans by ID. Tests now inspect actual completed-run state and address the edited plan by ID. Initial failure evidence is retained locally under `%TEMP%/ghost-rehearsal-dc-integration-first-20261115`.

The first candidate's new experiment button occupied a separate row and pushed the comparison summary below its visible area. The unchanged layout assertions detected this locally and in [CI run 43728807687](https://github.com/kanzaler123/ghost-rehearsal/actions/runs/43728807687): 166 browser cases passed, 2 layout cases failed, and 4 optional screenshot captures were skipped. The entry now occupies the existing toolbar with a bilingual accessible name and tooltip. Both original layout cases passed in the targeted rerun.

The first local matrix was stopped after confirming that layout regression. It also recorded a native file-input click timeout before any CSV reached the application. Its trace showed no page error or invalid/covered target. All eight data-import cases passed in the same candidate's Linux CI, and the unchanged local arrival test passed in the targeted rerun. Evidence from the stopped run is retained under `%TEMP%/ghost-rehearsal-release-first-matrix-20261115`.

The `98af659` full matrix completed in Linux CI, including both languages, both viewport profiles, all import paths and the unchanged layout/keyboard cases. The duplicate local matrix had no new failed case when stopped after that complete CI result, to proceed with Firefox and standalone-module checks; it is not reported as a completed local matrix. Its artifacts are under `%TEMP%/ghost-rehearsal-release-local-matrix-20261115`. The later `151ba7c` full CI matrix also passed.

Firefox found two additional compatibility issues. A trusted, bubbling `cancel` event from a file input reached the dialog's unconditional handler and closed the scenario draft. The handler now checks that the dialog itself is the event target; the import test retains a regression assertion and uses a real file chooser. Firefox also did not match `:focus-visible` after programmatic range focus and ArrowRight, despite changing the value. The timeline now uses the existing outline tokens for `:focus`; the original keyboard case is unchanged.

The 180-job Firefox cancellation case repeatedly timed out before its first successful row. Turning off trace snapshots or changing its dialog locator did not reliably solve it, so those test changes were discarded. Inspection of Playwright's `_expectInternal` found that each unsuccessful missing-element assertion generates a full-page ARIA snapshot, reading styles and geometry throughout the result table even with trace off. The final test first polls the same successful-row count with a numeric assertion, then retains the original attachment assertion. The first-row deadline remains 10 seconds, with no automatic retries or removed assertions. Independent review verified that this avoids the expensive failure-diagnostic path without relaxing the success condition. The final full six-case Firefox run passed; the complete cancellation/rerun/close case took 7.9 seconds. Final results are under `%TEMP%/ghost-rehearsal-release-firefox-final-results-20261115`. Original failures, timing probes and the unchanged case's later passing run remain under `%TEMP%/ghost-rehearsal-release-firefox-*` and `%TEMP%/ghost-rehearsal-c-firefox-*`.

Three independent cross-reviews found no remaining confirmed code blocker in the four repaired areas or their interaction with plan ownership, comparison populations/statistics, saved drafts, imports and exports. The Firefox compatibility fixes and the final test wait also received independent review. Final integration CI remains the merge-to-main gate.

## Limits

The examples and imported fixtures are synthetic. No real organizer study, field calibration, physical-device certification or acceptance of every product-foundation requirement is claimed. The existing JavaScript bundle-size warning remains; it is not treated as a measured interaction failure. The development-only lab matrix can report local font-junction/ResizeObserver diagnostics; production console and page errors are checked separately.
