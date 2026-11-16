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

## Verification and remaining work

In progress: final wiring audit, browser validation, measurements and independent S2 handoff. Historical input-branch checks are not final integrated evidence. Physical Safari/iOS/Android devices have not been verified here.
