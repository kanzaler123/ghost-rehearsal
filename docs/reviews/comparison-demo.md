# A: comparison semantics and guided decision demo

Status: module ready for independent review; local acceptance passed. PR [#3](https://github.com/kanzaler123/ghost-rehearsal/pull/3) is Draft and targets `kiro/release-integration`.

## Scope and commits

This continues `codex/comparison-guided-demo` at `cbe1a83`, preserving existing work and the untracked `.kiro/specs/rehearsal-studio-ui/` files. Earlier comparison, experiment extraction, guide and Worker/browser implementation are retained, not reimplemented or attributed to Kiro.

| Commit | Increment |
| --- | --- |
| `9462cc9` | Independently reviewable shared browser setup, [Draft PR #4](https://github.com/kanzaler123/ghost-rehearsal/pull/4), based only on integration `ca28c07` |
| `6c3cb8e` | Move A's existing cases to `e2e/demo/comparison.spec.ts` |
| `d482e89` | Bring the same A0 commit into A; resolve shared configuration to the A0 version |
| `30bb3cb` | Shared comparison context, consistent selection, overview entry, hand-calculated fixtures, ownership and specification corrections |
| `bef5694` | Seven-line follow-up: keep current plan names visible across views, including after scrolling mobile resource evidence, and assert that browser behavior |

## Behavior and interfaces

- `comparisonContext(a, b, basis, threshold, fresh)` in `src/features/analysis.ts` carries plan identities, input/scenario fingerprints, model versions, rule, population, sample sizes, per-side actual ends and run-limit flags. Status is ready, missing-run, stale, missing-final or incompatible. It supplies counts, the complete paired list, group selection and recommendations to App, CompareReport, Journey, Insights, StatisticsScope and export. Missing/stale/incompatible data supplies no comparison conclusion.
- Waiting uses B minus A at the engine's millisecond resolution. The default includes exactly ±60 seconds; any-change uses the sign with zero in neither less nor more. Histograms retain the same partition. Only IDs arrived on both sides enter paired comparisons; each side reports arrivals outside that sample and not-arrived guests separately.
- Primary mean/P90 retains all arrived guests, including unfinished and early departures. Completed-only mean/P90/n is secondary and each side has its own completed population. Empty samples are null/“—”. Final has no cutoff fallback and each side uses its actual end, including unequal ends and horizon-limited outcomes.
- A selection stays only while eligible; otherwise the first eligible visitor is chosen, using the featured visitor for an unfiltered sample. Empty/unavailable groups clear selection. The guide's first-difference action uses the currently eligible visitor, not an earlier stored ID.
- Guide entry is in Build and directly in the comparison overview. It creates an independent activity with `addEvent`, reuses the existing `createPackingExperiment`, and preserves original plans/scenarios. C adds one clone of B's packing worker and one post, preserving skills, shifts/unavailability, routes, services, devices and existing posts. Reset/rerun reuse C; exit retains the independent activity for editing. Fresh entries have unique IDs.
- Foundation First_Divergence and requirement 4.8 now describe visible states after all events at a timestamp settle. The existing `side-stream:10` = 210-second regression is retained. The earlier 159/263/272-test records are unchanged; this report is an additional checkpoint.

## Actual validation

Windows, Node 24.18.0, npm 11.16.0, Playwright 1.65.1; dates below use UTC+8. Full context/guide acceptance source: `30bb3cb`; final plan-name visibility follow-up: `bef5694`.

- `npm run check`: passed both TypeScript checks and **278/278 tests in 13 files**. Existing canvas owner, grouped selection, templates, save/restore and stale-result regressions pass.
- `npm run build -- --base=/ghost-rehearsal/`: passed. Existing large-chunk warning remains.
- `git diff --check`: passed.
- `npm run test:browser -- --trace=on` on `30bb3cb`: **12/12 passed**, zero retries/skips/flaky cases/global errors; 556.466 seconds including build, setup and cleanup. [Raw results](comparison-demo/context-browser-results.json). The Windows run was slow; this is an end-to-end test duration, not simulation performance. The desktop guide trace includes 23.6 seconds in context cleanup.
- `npm run test:browser -- e2e/demo/comparison.spec.ts --grep 'guided A/B/C'` on `bef5694`: **4/4 passed**, zero retries/skips/flaky cases/global errors; 191.909 seconds. [Raw results](comparison-demo/visibility-browser-results.json). The complete guide checks the actual names and that they remain in the viewport after scrolling resource evidence. Both TypeScript checks, 278 unit tests and the production subpath build also passed on this final application commit. The following evidence/task-status commit changes no application or test code. Final branch CI runs the complete suite again; its result is reported in the PR.

Browser scope: actual production Worker and downloads; desktop 1440×1000 / mobile 390×844, English/Chinese. Checks cover the complete A/B → guest → 03:30 first difference → posts/resources → C → costs/adverse outcomes → export flow, both statistical scopes and thresholds, full lists, empty selection, exit/reset/rerun/new entry, original project retention, canonical round trip, invalid import preservation and reduced-motion boundary flow. These are synthetic fixtures and viewport checks, not organizer/physical-device validation.

Observed cutoff results from actual runs:

| Outcome / cost | A | B | C |
| --- | ---: | ---: | ---: |
| Completed | 43 | 41 | 72 |
| Unfinished | 253 | 253 | 218 |
| Early departures | 4 | 6 | 10 |
| Staff | 3 | 3 | 4 |
| Scheduled staff hours | 1.50 | 1.50 | 2.00 |

C versus B completes 31 more people, but also has 4 more early departures and requires one extra staff member / 0.50 scheduled staff-hours at cutoff. This is not evidence of real-event impact or a universally better plan.

## Evidence and corrections

The first expanded 12-case suite had 8 passes and 4 failures: all four failures were the original-scenario retention assertion assuming export array positions. Canonical export sorts by ID; the scenario was still present unchanged. The final test checks full object equality by original ID and exact added plan/scenario counts. No application output or threshold was changed to make that assertion pass. [Initial results](comparison-demo/initial-browser-results.json), [automatic failure screenshot](comparison-demo/initial-failure.png), [automatic failure trace](comparison-demo/initial-failure-trace.zip).

During implementation, typechecking caught an inferred status string and an incorrect fixture field (`arriving` instead of `late`); both were fixed. A unit expectation initially picked a guest whose saving actually exceeded 60 seconds; it now selects a verified sub-minute change and still checks both retention and replacement. The initial desktop-only browser checkpoint passed 2/2 before the final expanded checks.

The successful `30bb3cb` boundary trace is [available here](comparison-demo/boundary-desktop-en-trace.zip); open it with `npx playwright show-trace <downloaded-file>`. It covers scope/empty selection/stale/final/import preservation and is distinct from the initial failing trace. Final `bef5694` screenshots were visually inspected: [desktop B/C outcomes](comparison-demo/bc-outcomes-desktop-en.png), [English mobile comparison](comparison-demo/bc-mobile-en.png), [Chinese mobile comparison](comparison-demo/bc-mobile-zh.png). They show completions, additional departures and staff cost together; the persistent name strip is present. The resource-scroll visibility assertion passed in all four projects. No human reviewer has signed off this change.

## Ownership, integration and unfinished work

1. Review/integrate A0 #4 first, then have B/C/D consume it through integration. A already contains the same commit, so it will drop out of A's diff after integration. No ordinary PR receives Pages write permissions. A0's remote [check/build workflow](https://github.com/kanzaler123/ghost-rehearsal/actions/runs/43700136176) passed; artifact upload and deployment were skipped. A0's 4 browser checks were local; its unchanged baseline workflow does not yet run browsers.
2. `Dialogs.tsx` and `Inspector.tsx` have **zero net difference from integration**. The inherited optional `EventCreator.onDemo` extension is removed; A does not need B to accept an interface change. C/D independent features and their directories are untouched.
3. E must integrate reviewed modules, connect C/D to the main workbench and run cross-module acceptance/deployment gates. E should update README's inherited welcome-screen instruction to the current Build/comparison-overview entry, and finalize screenshots/case material. The inherited README/examples/CI changes from the previous A work are preserved; this continuation does not edit them.
4. Independent review is still required. Full foundation contracts, complete keyboard/device/browser coverage, real-event calibration, final submission materials and verified Kiro/Hook execution remain outside this module acceptance. See [attribution](../kiro/comparison-demo-usage.md).
