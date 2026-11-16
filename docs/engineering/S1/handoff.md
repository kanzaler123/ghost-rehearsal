# S1 integration record

Started 2026-11-16, continued 2026-11-17 (Asia/Singapore). Worktree: `C:/Users/kanzaler/Desktop/ghost-rehearsal-s1`; branch: `integration/reliability-performance-ui`. Implementation and verification by Codex.

## Fixed inputs

| Input | Branch | Commit | Handoff |
| --- | --- | --- | --- |
| Latest main at start | main | `69502b8db149dd80e6b8311fe43e87154d3b6d93` | Existing integration inspected in source |
| UI | feat/ui-creative-redesign | `cc6dc964b9cae86d96a35079c1e29e766699027d` | `docs/reviews/ui-creative-redesign/interface-changes.md`, `verification.md`, `black-theme/review.md` |
| A | fix/project-data-reliability | `c72ffa020a8547aea19a345f99807c46ea086929` | `docs/engineering/A/handoff.md` |
| B | fix/sampling-and-statistics | `03cfbe36bcfce9164c122e7edf5229dcab1e7512` | `docs/engineering/B/handoff.md` |
| C | perf/incremental-playback | `e956a81dea1e8106b428109a5c20f99928e15ce9` | `docs/engineering/C/handoff.md` |
| D | fix/runtime-and-import-recovery | `e9183e931b10219dfe74c88d906b3b99180e6514` | `docs/engineering/D/handoff.md` |
| E | test/cross-browser-release-gates | `9a61358b1066e38f6e28f97fe84ba4b6ffe605b5` | `docs/engineering/E/handoff.md` |

The refreshed main already contains all five inputs, prior application wiring, and the commits of #19/#32/#33 through merged #39. These are inherited history, not merges performed by S1. Reverting main's existing work would violate the latest-main baseline. S1 merges only the reviewed UI commit. The UI worktree and its unstaged README are untouched. No main merge or deployment is authorized by this delivery.

## Conflict decisions

- App: preserve safe result Map, persistence and import clients, cancellation and recovery guards; add UI run context, legend, welcome language controls and focus behavior. Guide activation cancels pending import and clears its diagnostics.
- Canvas: preserve stable callbacks and existing observer/viewport fixes; include population in memo dependencies for accurate UI queue bars. Do not restore the old callback dependencies.
- EventCreator: combine the new welcome layout and language switch with cancelable import and existing recovery guards. Keep the guide's accessible description.
- ContextMenu: retain main's pointer activation/focus handling, which covers touch as well as mouse; retain the UI's surrounding presentation.
- Styles: use UI tokens and welcome layout in the conflicting rules; preserve the fixed ghost-row height and absence of continuous ghost animations.
- Messages: retain both bilingual persistence/import strings and new UI strings. Existing selected-statistics story wording is retained.
- README: preserve main's English structure and updated verification history; update only the welcome action and visible run-scope location. Do not reintroduce the removed historical Chinese duplicate.

## Integration and performance checkpoints

The UI merge commit `51a7ad30e4b75bed4af308f9454387bc3574fba6` is the pre-S1-performance checkpoint. It passed both TypeScript configurations, 567 unit tests in 40 files, the production build and 37 release-gate tests. The first integrated Chromium desktop-English set passed 16/16 (critical flows, persistence App flows, creative redesign and navigation refinement). Subsequent application fixes and performance changes are separate commits. Existing main already contains earlier performance changes; comparisons measure incremental S1 effects, not a comparison against the old f837199 product.

## Wiring audit

| Input / requirement | Application path and decision | Validation |
| --- | --- | --- |
| A / result lookup | App uses `RunResults` Map for primary, secondary, Inspector and experiment export. Copies have no inherited result; deletion removes the exact ID; project replacement clears results. Numeric indexing in Journey is an ordered pair, not plan-ID lookup. | Existing constructor import/run/save/reload and Worker failure App tests retained. |
| A / persistence | `useProjectPersistence` opens the real IndexedDB store, subscribes to external changes, serializes this tab's writes using its original parents, preserves both conflicting versions and exposes explicit recovery. Dirty/failed/pending edits retain beforeunload protection. | Existing two-App-tab conflict/restore and corrupt-template raw-download/repair tests retained. |
| A / templates | Ready/empty/error/conflict remain distinct; mutations await persistence receipts. Corrupt originals are downloadable and only explicit repair can initialize the library. | Production App test retained, alongside independent transaction tests. |
| B / statistics | App passes `statisticsAt(run,basis)` as the fifth `rehearsePicks` argument. History stories use that end; queuedNow continues to use replay state/time. Existing bilingual labels refer to the selected statistics end. | Added three-person real-Worker page test: 15 → 20 seconds longest wait at unchanged replay time 5 seconds, queued wait stays 5 seconds; unfinished disappears at final and returns at cutoff. |
| C / replay | Each visible side owns a reader bound to the accepted run and input generation. Creation/disposal occur in layout effects; old bindings are never queried for new inputs. Deterministic `at` queries return independent snapshots; repeated/abandoned renders can only change private cache cursors. Initial binding uses the reference query until the effect installs its reader. A/B use separate instances, current/trend use separate lanes. Build, project/run/input changes and unmount release readers; StrictMode setup creates a new instance. | Existing forward/backward/End/Home, edit/undo/freshness and comparison tests retained. |
| D / ordinary Worker | App uses SimulationClient with request context installed before start; stale callbacks cannot commit. Failure/cancel keeps existing results; partial aborted runs stay explicitly failed and cannot become comparison evidence. New reset clears the previous project; dispose clears requests and lastSuccessful as well as runs. | Added reset/late-response/restart/dispose unit test; existing retry/cancel/old-result browser assertions retained. |
| D / imports | Project and template inputs have independent ImportClients; CSV reads use readImportFiles and each editor owns its parser client. Close/cancel/reselect invalidate pending requests; Apply reads the current CSV request. Template batch validation is atomic and appends to the current library. Project/template import retain the existing direct-apply interaction after successful bounded validation. | Existing file-read, oversize, cancellation, same-file retry, data-source integration and diagnostic-page tests retained. |
| E / release | Existing required-check reporter, Chromium shards, touch, Firefox, WebKit, import-WebKit repeat count and comparison-WebKit dependencies preserved. New S1 cases added to E's critical set. Welcome locators/accessible description use the selected UI wording, with all behavior assertions retained. | Final results appended below. |
| Serialization / validation | Project text is memoized by document identity. Existing input fingerprints plus memoized owner/checks/secondary graph validation no longer rescan on ticks. Hidden nonselected event/story panels do not calculate their data. | Production dense replay measurements and existing behavior tests. |
| Canvas | Node merge indexes previous nodes by ID, retaining dragging position and selection/type rules. One visitor pass indexes travelers by displayed edge group, preserving visitor order, aggregate edges and current progress. | Existing Canvas unit tests, real replay, selection, keyboard and drag tests retained. |
| On-demand analysis | Robustness panel and its CSS load only when opened; localized loading/error/retry states handle network failure and ignore completion after unmount. | Added production chunk-block/retry/focus-return test. |
| Result retention | Keep one result per extant plan and previous successful attempt for failure recovery; no arbitrary eviction of active/comparison results. Project replacement resets the client and result Map. Status notices store bilingual strings instead of render closures: heap inspection found a notice closure retaining the former run. | Forced-GC browser measurements track loaded result and project replacement separately. |

Source search found no remaining App plan-ID object lookups, direct ordinary Worker construction, direct file.text calls or synchronous CSV parser calls. Remaining synchronous readProject calls validate existing documents at manual save/export; they do not read uploaded files. The original independent lab entry points are not substitutes for these App paths.

The standalone development robustness lab still has its own legacy import control. That control is excluded by `embedded` in the real App and the standalone HTML is not a production build entry. The production robustness dialog receives the already validated App project. This distinction was checked in source rather than treating the presence of a helper module as proof of wiring.

## Final review corrections

- `299d288552d68afcdf219e2c99bdb54131a8aa25` contains the primary S1 lifecycle/performance changes, separately reviewable from the UI checkpoint.
- `445c981361bbae4eb6c09830803844016b4d6e78` adds two final App corrections: stop the hidden comparison event panel's event scan while retaining the visible single-plan summary, and focus the robustness trigger before opening its dialog. Windows WebKit did not focus a pointer-activated button automatically, so the modal previously restored focus elsewhere. The original focus-return assertion remains unchanged.
- The same commit strengthens the CSV reload test's precondition: wait until the stored draft equals the just-imported project, not merely until any older draft exists. Both remote Chromium shards exposed that race on the first integration run. The 400 ms autosave debounce and pending-edit unload protection remain intact; all post-reload, provenance, shared-scenario and unchanged-plan assertions remain intact.
- The next full run exposed the equivalent asynchronous-import assumption in the mobile-English demo export test. It opened the export dialog immediately after file selection, before the import Worker completed and replaced the project. The test now waits for the App's import-success notice; its exact exported-file equality and existing-event preservation checks remain unchanged.
- The first remote integration run, [43904386510](https://github.com/kanzaler123/ghost-rehearsal/actions/runs/43904386510), was **not green**: each Chromium shard had 209 passes, one premature-reload failure and two allowlisted screenshot skips. WebKit 92, import-WebKit 216, Firefox 22, touch 26 and comparison-WebKit 24 passed. The local Windows cross-browser run had 42 passes and two focus-return failures. These failures prompted the corrections above; no retry count, timeout, skip or error filter was loosened.

## Verification

Product changes are frozen at `445c981361bbae4eb6c09830803844016b4d6e78`. Subsequent S1 changes only update verification and delivery evidence. The final delivery SHA, its CI run and outcomes are pinned in [PR #40](https://github.com/kanzaler123/ghost-rehearsal/pull/40); S2 should use that exact SHA, not a moving branch name. Historical A–E checks are not substituted for integrated checks.

| Check | Observed result |
| --- | --- |
| Both TypeScript configurations, unit suite, production subpath build | Passed on the frozen product; 568/568 tests in 40 files. Existing large-chunk advisory remains. |
| Release-gate unit checks | 37/37; required behavior cases cannot be skipped silently, while the four existing screenshot-only cases remain allowlisted. |
| Initial integrated affected App flows on `299d288` | 26/26, desktop English and 390px Chinese: persistence, constructor IDs, Worker recovery, CSV integration, welcome/guide race handling, replay and both new S1 cases. |
| Final affected browser rerun on `445c981` | 24/24 in 2.1 minutes, with each case repeated twice. Windows desktop WebKit English and mobile WebKit Chinese cover S1 + arrival/service data integration; Firefox English and Chromium touch English cover S1. No assertion was weakened. An earlier interrupted attempt had only three completed records and is not counted as a pass. |
| Final demo import/export synchronization | 6/6 in 42.5 seconds, mobile English and Chinese, three repetitions each. Full A/B/C export/import, unchanged existing events and all numerical outcome assertions retained. |
| Constructor project after reload | Additional production-browser check passed on `445c981`: import, explicit save, reload, then a new real Worker run completes with no page errors. |
| Development React StrictMode smoke on `299d288` | Passed with no page or console errors: constructor project, A/B, forward/backward seeks, mode changes, rerun, project replacement and reload. The reader implementation has not changed since this smoke. Production tests alone are not used to claim StrictMode effect replay. |
| Production performance / retention | Three contexts per browser and per recorded build; exact hashes, all samples, separate serialization/heap/network measures in [performance.md](./performance.md). |
| Full remote matrix | Chromium two shards; E's WebKit, Firefox and touch sets; dedicated import-WebKit (three repeats) and comparison-WebKit. The final exact-SHA run is linked from PR #40, including the aggregate gate and skipped PR deployment. |

Commands for the final local checks:

```text
npm run check
npm run build -- --base=/ghost-rehearsal/
node --test e2e/release/gate-checks.mjs
npx playwright test e2e/release/s1.spec.ts e2e/persistence/app.spec.ts e2e/ui/canvas-playback.spec.ts e2e/data-sources/integration.spec.ts e2e/ui/welcome.spec.ts --project=desktop-en --project=mobile-zh
npx playwright test --config e2e/release/playwright.config.ts e2e/release/s1.spec.ts e2e/data-sources/integration.spec.ts --project=desktop-webkit-en --project=mobile-webkit-zh --project=desktop-firefox-en --project=mobile-touch-en --repeat-each=2
npx playwright test e2e/demo/experiment-export.spec.ts --project=mobile-en --project=mobile-zh --repeat-each=3
```

The first affected-flow command was run before the final corrections; the second was run after them. `PLAYWRIGHT_PORT=4196` isolated these runs from other local sessions. Full remote commands and required dependencies are in `.github/workflows/pages.yml`; none were removed or relaxed. Local diagnostic logs are in `.s1-evidence/` and are not packaged into the repository.

## A–E completion and remaining limits

- **A: wired.** Real App conflict/recovery and corrupt-template preservation, constructor IDs, save/reload and result access verified. Standalone persistence transaction cases also remain in the full Chromium suite.
- **B: wired.** Single-plan cutoff/final stories and live queues are tested on real Worker data in both languages; sampling/statistics unit tests remain intact.
- **C: wired.** App owns separate A/B readers and trend lanes with disposal; real seek/mode/rerun and freshness behavior verified, with a development StrictMode smoke in addition to production coverage.
- **D: wired.** Ordinary Worker and all production project/template/CSV import routes use the new clients. Real cancellation, old-result/retry behavior, invalid imports, same-file retry and diagnostic paging remain covered by the integrated suites.
- **E: wired.** Browser matrix, strict result reporter, diagnostics upload and aggregate release dependencies retained; S1 cases added. No merge, deployment, auto-merge or branch-protection change was performed.

No known application wiring blocker remains. Independent **S2 acceptance is still required**. Dense WebKit playback remains slow (see measurements); no claim of smooth playback or universal speedup is made. Initial JS still exceeds Vite's advisory. Very many large retained plan results have no new arbitrary eviction policy; maximum-plan/low-memory stress needs further measurement rather than dropping current/comparison/recovery results.

Physical Safari/macOS, iPhone/iPad, Android browsers, assistive technology and low-memory hardware have not been tested. Playwright WebKit and viewport/touch emulation are not physical-device acceptance. GitHub inspection found no main branch protection or rulesets; the workflow gates exist, but repository enforcement is an outstanding administrative setting, not something S1 enabled.

For S2: inspect the input/conflict and wiring tables, compare product changes to `51a7ad3`, use the PR-pinned final SHA, and independently exercise constructor save/reload, two-tab conflict restore, cutoff/final versus live queue stories, A/B seek and input changes, Worker cancellation/failure recovery, bounded import cancellation/paging, lazy-load retry and Canvas drag/selection/folding/keyboard navigation. Review the reported performance limitations explicitly. Leave main and deployment untouched until a separately authorized release.
