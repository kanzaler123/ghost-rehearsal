# 2026-11-15 development and validation record

All development described here was performed with Codex on `codex/comparison-guided-demo`, starting from merged main `6309d5f`. Dates use UTC+8. Earlier README/task records remain historical records.

## Stages

| Stage | Commit | Observed verification |
| --- | --- | --- |
| Merged-main audit and new Specs | `aef3baf` | Baseline: 263 tests in 12 files; both strict TypeScript checks and production build passed |
| Comparison evidence contract | `1da5495` | 270 tests in 12 files; both strict TypeScript checks and build passed. Three intermediate test failures used obsolete group labels; corrected to the shared labels |
| Guided demo | `a38917d` | 272 tests in 12 files, both TypeScript checks and production builds passed; includes a hidden-canvas placement regression |
| Browser acceptance and final records | This record's commit | 8/8 production-Worker browser tests passed; CI, Steering and bilingual records updated |

The production build retains its existing warning about a JavaScript chunk exceeding 500 kB. No large-scale performance or real-event calibration claim is made.

## Final verification

Host: Windows, Node **24.18.0**, npm **11.16.0**, Playwright **1.65.1**, bundled Chromium **159.0.8154.6**. Application changes are in `a38917d` plus the two Chinese label corrections in this record's commit.

- `npm run check`: **272/272 tests in 12 files**, plus both TypeScript checks, passed. Last unit run started at **17:09:07**.
- `npm run build -- --base=/ghost-rehearsal/`: passed. The existing large-chunk warning remains. Root-path builds were also checked during development.
- `PLAYWRIGHT_BASE_PATH=/ghost-rehearsal/ npm run test:browser` (set with `$env:PLAYWRIGHT_BASE_PATH` on PowerShell): **8 passed, 0 failed, 0 skipped, 0 flaky**, exit code **0**. Started at **17:09:21.934**, duration **75.972 seconds**, no global test-runner errors. Retries were disabled.

| Browser viewport / language | Complete guide | Boundary case |
| --- | ---: | ---: |
| 1440 × 1000 / English | 12.213 s | 3.703 s |
| 390 × 844 / English | 11.839 s | 3.107 s |
| 1440 × 1000 / Chinese | 10.903 s | 3.557 s |
| 390 × 844 / Chinese | 7.249 s | 4.650 s |

Source of these timings: `test-results/browser-results.json`. Total suite time includes setup, browser cleanup and parallel scheduling. Desktop and mobile B/C screenshots were visually inspected; the mobile report scrolls as a full page and exposes adverse outcomes and cost. These are browser viewport tests, not physical-device or cross-browser certification.

The workflow now runs check, production build and the same browser suite using the Pages base path. **Remote GitHub Actions and deployment were not run** in this local branch session.

## Browser acceptance scope

`e2e/smoke.spec.ts` runs two cases at 1440 × 1000 and 390 × 844 CSS pixels, in both English and Chinese. It starts the production preview, observes `/assets/worker-Hj9-Aq7I.js` creation and reads actual downloaded files. It does not mock the Worker, simulation results or network. The only initialization script sets the interface language.

- The complete guide checks A/B outcomes, both waiting thresholds, matching histogram/count/list data, search, cutoff/final switches without new simulation, the same visitor and 03:30 first difference, real posts/backlog evidence, C creation and B/C costs, reset/rerun without duplicate C, exit, project round trip, invalid import preservation and language switching.
- The boundary case runs three synthetic arrival records at 0, 0 and 100 seconds, with a 5-second cutoff and 25-second limit. It checks the two-arrived/one-not-arrived population, an empty completed-only sample, stale-result suppression, disabled evidence export, final/run-limit results and absence of final data after a cutoff-only rerun.
- Browser assertions include page errors and console errors. Artifacts include the B/C screenshots, C arrangement, canonical project JSON and observed Worker URLs; failure traces are retained. Generated artifacts stay in ignored `test-results/` and `playwright-report/`.

Observed example outcomes at the 1800-second cutoff (arrived n=300 per plan):

| Outcome | A | B | C |
| --- | ---: | ---: | ---: |
| Completed | 43 | 41 | 72 |
| Unfinished | 253 | 253 | 218 |
| Early departures | 4 | 6 | 10 |

For B/C, staff count is 3 → 4 and scheduled staff time is 1.50 → 2.00 hours. The guide exposes the increase in early departures. A/B waiting groups are 12/9/279 at the inclusive 60-second threshold and 66/26/208 for any change, with paired n=300. These observations describe the supplied synthetic model, not real-event impact.

## Intermediate browser and check results

- The first desktop smoke found a test expectation missing the displayed `+` in extra staff hours; corrected the expectation to `+0.50`.
- Browser error collection then caught NaN coordinates when a pending viewport animation ran on a hidden canvas. The component now checks its visible dimensions before placement, and a unit regression covers hiding/revealing it.
- One check run concurrent with browser work had a 5-second timeout in an existing workbench test; subsequent `npm run check` passed all 272 tests, including that test, without changing its timeout or behavior.
- English desktop/390px runs passed the complete guide and scope/absence/stale tests. Initial all-project runs were interrupted while investigating slow browser teardown; they are not recorded as full-suite passes.
- The first `/ghost-rehearsal/` run found a missing base-path argument on the preview server (JavaScript returned 404). Preview now uses the same base path as the production build.
- A completed Chinese-only run reported **2 passed / 2 failed (4.7 minutes)**: both boundary tests passed, both long guide tests exceeded 90 seconds. Standalone browser probes also observed slow shutdown with no application workflow: a blank headless page closed after 75,313 ms, and a blank full-Chromium page after 88,010 ms on this host. These are diagnostic observations, not application performance measurements.
- The long-test limit is now 180 seconds, with a 15-second action limit and a 600-second whole-suite limit. No failing assertion was removed to obtain acceptance.
- The 17:07:45 run then passed **8/8** in **60.015 seconds**, with no retries, skipped tests or global errors. Visual review of its desktop and mobile screenshots led to two final Chinese wording corrections: the completed-only group is named in Chinese, and resource-hour labels refer to the selected statistics range rather than implying cutoff only.

## Kiro Hook and Steering audit

The installed Kiro application reports version `1.4.178`. The existing `.kiro/hooks/update-usage-log.json` has a `Stop` agent action and matches the documented [Hook file format](https://kiro.dev/docs/hooks/). The new Steering uses documented [always inclusion](https://kiro.dev/docs/steering/) and supplies concrete rules for the comparison functions, shared C builder, browser acceptance and attribution.

A read-only inspection of the local `Kiro Logs.log` under `20261114T143027/window1/exthost/kiro.kiroAgent` found:

```text
2026-11-15 16:33:39.136 [info] hooks.reload.loaded {"read":1,"registered":1}
2026-11-15 16:33:39.136 [info] fs.hooksReload.ok {"system":"fs","durationMs":7}
```

This is evidence of loading/registration. The inspected log did not provide a matching execution/completion record for the usage Hook, and `KIRO_USAGE.md` has no generated actual-task entry. Therefore live execution, duplicate prevention, recursion and quota use remain **unverified**. The new Steering was reviewed by Codex; loading it in a new Kiro session has not been verified. No Kiro task or Kiro contribution is claimed for this development.

To complete that separate acceptance: start a fresh Kiro session in this workspace, perform a substantive task, observe the Stop Hook adding one accurate entry, export the session, and check that logging itself produces neither duplicate entries nor another task. Preserve raw exports in ignored `kiro-evidence/`. Do not manually write an entry and call it Hook evidence.

## Remaining work outside these two Specs

The two new product Specs are implemented and locally verified. This does not complete all 47 foundation requirements. The full output runtime contracts, simulation semantics and complete golden suite, full keyboard/state-restoration acceptance, and original Requirement 46's seven-scene machine-readable storyboard remain open in the foundation task list. Real organizer validation/calibration, a submission video and the final competition entry are also unfinished. Kiro's live Hook execution and actual Kiro development evidence remain separately unverified as described above.
