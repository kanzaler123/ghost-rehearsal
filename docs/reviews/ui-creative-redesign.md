# Ghostlight UI redesign — review and delivery

The subsequent [black-theme and navigation correction](ui-creative-redesign/black-theme/review.md) implements the owner's visual feedback and supersedes the palette and name-editing flow described in the original delivery below. Its evidence and validation are recorded separately.

The interface is implemented on `feat/ui-creative-redesign`, against baseline `f8371999e64d25c250699e5cd96f85eabb79bb32`. The tested implementation is `cec4204bc40f378d680a4c30c8ef6581e9309e7a`: `af34260` implements Ghostlight and `cec4204` makes narrow comparison reports reachable after leaving the guide. Verification records and screenshots are added in subsequent records-only commits. The final handoff names HEAD and verifies that the application and test trees still equal the tested implementation.

Local production preview: **http://127.0.0.1:4193/ghost-rehearsal/**. No deployment or push was made. The earlier 4190 preview worked in Chromium but did not navigate in this host's WebKit; use 4193.

Verified at the delivered application tree: check **464 passed**; production build **exit 0**; complete Chromium browser suite **304 passed / 4 opt-in captures skipped / 0 failed / 0 flaky**, exit 0; new-flow WebKit **24 passed**; six main and ten additional capture projects passed. The known minor toolbar-spacing issue and checks not performed are listed below; this is a reviewable implementation, not a claim that every formal acceptance clause is certified.

Final first-load payload: JavaScript 292,931 B gzip, CSS 34,664 B gzip, binary assets 359,396 B; whole build 2,366,375 B. Maximum measured welcome CLS is 0.000928. Final drag/pan/zoom and 1×/8× replay p95 frame intervals are 16.7–16.8 ms. Thresholds, before measurements and raw records are in verification.md.

## Experience the change

1. With empty browser storage, activate **Follow a guest through A/B / 跟随一位访客，比较 A / B**. The existing 300-guest example runs in the real production Worker.
2. Activate **Follow the same guest / 追踪同一位访客**, then **Jump to first difference / 跳到首次差异**. At 03:30, `side-stream:10` is waiting in A and being served in B. This is an observed state difference, not proof of a single cause or a blanket recommendation for B.
3. Open Build or Rehearse. Run scope, included plan names and separate error/notice counts are visible. Queue bars use recorded waiting counts divided by the same population, and ghost glyphs represent actual present guests. The followed guest keeps a distinct marker.

Ghostlight uses green-black surfaces, ivory typography, amber actions and explicit mint A / lilac B identities. The entry introduces the product beside the original event form. Comparison evidence, adverse outcomes, exports and input provenance retain their existing semantics. Decorative animation is static; reduced motion also pauses initial replay and removes movement transitions.

## Evidence and commands

- [Design, alternatives, diagnosis and assets](../../.kiro/specs/ui-creative-redesign/design.md).
- [Before captures](ui-creative-redesign/before/) and [after captures](ui-creative-redesign/after/), paired by state, viewport and language. Each image has metadata. [Capture script](ui-creative-redesign/capture.spec.ts).
- [Recordings](ui-creative-redesign/recordings/): run, edit/connect/drag/undo, 1× replay and seek, first difference; after also includes reduced motion and mobile Chinese first difference.
- [Append-only verification and preserved failures](ui-creative-redesign/verification.md), [baseline host/protected work](ui-creative-redesign/baseline-state.json).
- [Interface change log and overlapping PR files](ui-creative-redesign/interface-changes.md).
- [Every changed path and ownership category](ui-creative-redesign/changed-paths.tsv), including documentation and evidence files.
- [Kiro/Codex attribution and pending raw exports](../kiro/ui-creative-redesign-usage.md).

```sh
npm ci
npm run check
npm run build -- --base=/ghost-rehearsal/
npm run preview -- --port 4193 --strictPort --base=/ghost-rehearsal/
npm run test:browser
```

The dependency lock and package scripts are unchanged. The installed dependencies were used; a fresh `npm ci` is documented for reproduction, not claimed as a new verification run. Full command results and any shard runs are recorded separately in verification.md.

## Capability inventory

Baseline capability sources: README, `App.tsx`'s 16 non-null dialogs and five tabs, Canvas keyboard/menu handlers, and shell ContextMenus. Baseline browser checks were incomplete because of the global timeout. A dedicated baseline keyboard-only completion check was **not** performed for every row; the baseline automated coverage is the saved report, not an inferred manual pass. The final Browser_Suite is the authority for delivered behavior below.

| Capability / baseline and delivered entry | Verification route |
|---|---|
| Welcome; create blank, haunted or candy event; new event from event selector | `forms/reliability`, `forms/keyboard`, `ui/creative-redesign` |
| Two-plan example and project import from welcome; new direct guide entry | `project/import`, `demo/comparison`, `ui/creative-redesign` |
| Event selector, plan selection, copy, rename and removal with Undo | `ui/acceptance`, `forms/reliability`, project unit tests |
| Event settings / scenario dialog, arrival groups and time slots | `forms/reliability`, `data-sources/integration`, `data-sources/read-safety` |
| Staff & devices / resources dialog, staff posts, shifts and device groups | `forms/reliability`, `demo/comparison` |
| Node/edge selection, Inspector fields and routing conditions | `ui/acceptance`, `forms/reliability` |
| Add/connect/move/remove nodes and edges; select/pan/zoom; stage folding | `ui/acceptance`, `ui/canvas-playback`, Canvas unit tests, edit recording |
| Node JSON and edge JSON from Inspector; plan/scenario JSON from More | `forms/reliability`, `demo/comparison` |
| Templates library; saved node/plan templates; template save dialog; backup/import | template unit tests and existing browser flows; no new storage format |
| About dialog / More → About | Retained native dialog; baseline and delivered standalone keyboard completion not separately certified |
| Run/stop, live announcements, failed/stopped/computing/empty states | `smoke`, `ui/run-states`, `ui/reduced-motion` |
| Run scope moved from More to permanent run strip | `demo/comparison`, `ui/creative-redesign` |
| Rehearse tabs: now, journey, insights, resources, event record | `ui/layout`, `ui/acceptance`, `ui/canvas-playback` |
| Replay play/pause/reset, scrubber, speed and Space/Arrow controls | `ui/reduced-motion`, `ui/route-keyboard`, playback recordings |
| Two Futures, comparison-plan dialog, A/B arrangement, overview and individual journey | `ui/compare-first-screen`, `ui/mobile-navigation`, `demo/comparison` |
| Cutoff/final basis, waiting threshold, groups and first difference | `demo/comparison`, `ui/acceptance`, analysis unit tests |
| Guide follow/inspect/create C/reset/rerun/exit and C arrangement export | `demo/comparison`, `demo/guide-mapping`, `demo/experiment-export` |
| Change an assumption / stress dialog | Existing comparison workflow and source retained; dedicated final keyboard completion not separately certified |
| Robustness dialog, paired batches, cancellation and export | `robustness/integration`, `robustness/theme` |
| Export dialog: canonical project, plan arrangement, comparison evidence | `demo/comparison`, `demo/experiment-export`, `ui/layout` |
| Save, draft recovery, import retries and obsolete-read cancellation | `project/import`, project unit tests, `ui/creative-redesign` |
| Ctrl/Cmd+S, undo/redo, modal Escape/focus and menu keyboard handling | `forms/keyboard`, `forms/reliability`, `ui/acceptance`, shell unit tests |
| English/Chinese and reduced-motion preference | All four Browser_Suite projects; reduced-motion and welcome tests |

No original entry was removed. The legend changes from static text to a disclosure; run scope changes location; welcome adds guide and language controls. Baseline README falsely described a welcome guide entry; baseline code offered the guide only in the workbench. The new entry implements that capability.

Interface changes, separately from visual styling: EventCreator consumes guide-start and existing language-switch callbacks; TopBar consumes display-only plan-check strings; bilingual messages add welcome and legend copy; the canvas colour export now references semantic CSS variables. App state ownership, Worker messages and storage keys do not change. Full old/new signatures and moved entry labels are in the interface log.

## Business contracts and scope

The six A/B/C SHA-256 run digests match the baseline for cutoff and completion. Simulation, schema/version/fingerprints, analysis, stage geometry, `createPackingExperiment`, Worker messages, package locks and existing browser infrastructure are byte-identical to baseline. Browser tests retain outcome/group values, `side-stream:10`, 210 seconds, canonical export round trips, stale/failed evidence suppression, storage preservation and actual Worker requests. These govern requirements 9–17 and 22; their per-command results are in verification.md.

Source paths changed: `src/app/App.tsx`; all seven sheets under `src/app/styles/`; `src/components/Canvas.tsx`, `Dialogs.tsx`, `GuidedDemo.tsx`, `shell/TopBar.tsx`, `forms/forms.css`, `data-sources/data-sources.css`; `src/experiments/robustness/styles.css`. These are Owned_Area. `src/i18n/messages.ts` is the permitted bilingual presentation exception. The changed and added test files are listed in the interface log. Spec, review, Kiro usage, recordings and screenshots are records. `examples/README.md` updates entry labels as required. Final exact path/status/protected-work snapshots accompany delivery.

The owner approved the concrete [README update](ui-creative-redesign/README-update.patch) on 2026-11-16 after requirements 1.6–1.7's protection of earlier uncommitted work was explained. The update changes entry wording, restores a current Chinese quick guide and corrects contribution attribution. Other pre-existing README edits remain in the working tree and are excluded from the redesign commit.

## Welcome and integration notes

- Initial focus is the new native guide button. Pointer, Enter and Space start the existing guide once and move focus to its visible region.
- The old demo and import buttons remain; create is the filled primary action once an event name is entered. Text fields preserve native form submission; unrelated actions remain `type="button"`.
- Language switches use the existing App language action, preserving project localization. New Event retains the ordinary creation form.
- Starting guide invalidates a pending file read; late success or failure cannot replace the guide or show an obsolete notice.
- These functional goals match draft #32's stated intent. Copy, visual hierarchy and two-column welcome differ. Browser test coverage and remaining platform boundaries are stated in verification.md.
- GitHub now reports #19/#32/#33 merged by other work; this task retains the original baseline as required and does not integrate their commits. Their inspected SHAs and every overlapping path are in the interface log.

## Review boundaries

No external asset, account, licence purchase, placeholder, 3D model or sound is needed. Existing fonts and icons keep their bundled notices. Kiro supplied the requirements and initial screenshot preparation; Codex supplied the implementation and verification. Stop Hook execution remains unverified and raw conversation exports remain pending.

The capture named `compare-stale` uses a changed run scope, matching the baseline browser test. The exact requested variant—edit B's simulation inputs while staying in comparison—is not directly reachable in the baseline read-only comparison interface: returning from Build reruns incompatible results. This substitute is identified rather than represented as the requested input-edit state.

Final quantitative results, visual corrections and any unresolved acceptance checks are appended after the delivered runs in verification.md. No unperformed check is counted as passed.

## Contract checks

| Preserved business contract | Governing requirements | Delivered checks |
|---|---|---|
| Project import/export | 17, 22.6, 22.9 | `project/import`, `demo/experiment-export`; canonical round trips and existing-event preservation |
| Manual save, draft autosave and recovery | 17, 22.6, 22.9 | project unit tests, `forms/reliability`, `ui/acceptance`; format/storage code unchanged |
| Shared guest batch across plans | 11, 16, 22.9 | six deterministic run digests, analysis unit tests and `demo/comparison` |
| Cutoff/final statistics | 11, 16, 22.9 | `ui/run-statistics-basis`, `demo/experiment-export`; actual 41/72 completions and 218 unfinished/10 departures retained |
| Run cancellation | 9, 13, 22.5 | `ui/run-states`, `robustness/integration`; Worker termination and previous evidence handling |
| Stale detection | 12, 13, 16, 22.9 | `demo/comparison`, `ui/run-states`; stale evidence and export suppression |
| Keyboard operation | 7, 8, 17, 22.14 | `forms/keyboard`, `ui/accessibility`, `ui/route-keyboard`, native welcome activation |
| English and Chinese | 15, 17, 22.14 | all four Browser_Suite projects and four welcome WebKit projects |

The recorded complete browser result determines pass/fail for these routes. Unit-only evidence is not a substitute for an incomplete browser run.

## Visual review and remaining acceptance boundaries

- **Distinct visual stance:** the green/ivory/amber entry, original ghost illustration and lettered A/B identities are implemented. No missing asset or placeholder remains. Welcome before/after images at 1440×900 in both languages show the largest visible change.
- **Core working surfaces:** the previous report-row clipping was corrected in `af34260`. The 320 px report workspace collapse and English toolbar overflow were corrected in `cec4204`; six unchanged mobile navigation, first-screen and experiment-export cases pass. Narrow screens still wrap the toolbar and use vertical page scrolling. This is a visible density tradeoff, not a claim that all header content fits above every result.
- **Interaction continuity:** three native welcome activations reach the same guest at 210 seconds; pending imports cannot overwrite that guide. Canvas selection, run context, real replay and import/export are covered by the existing functional tests and recordings. The exact input-edit stale capture remains unavailable in the baseline interaction model; the recorded run-scope substitute is identified above.
- **Detail consistency:** shared semantic colours/type/spacing replace literal-value tokens; play contrast, visible focus, fixed run/stop width and seek settling were corrected in `af34260`. Existing contrast, reduced-motion, touch-target and overflow assertions remain unchanged. One minor known visual issue remains: at 1440×900 English, create C and view B/C with the report expanded; the collapse label and plan selector are tightly spaced in the report toolbar (`after/guide-bc-1440x900-en.png`). Their actions remain covered by passing tests. The automated capture matrix does not imply that every secondary screen was manually reviewed at every size.

The selected Ghostlight design is implemented; no additional concept design is pending. Formal acceptance still excludes an instrumented, frame-by-frame 1 px control-geometry certification for every transition/viewport/language, independent photosensitive-flash testing, standalone keyboard-only completion of every legacy dialog, and physical Safari/iOS testing. The substitutes are unchanged browser quality assertions, native-control tests, WebKit automation and the saved recordings. These are explicit limits, not passed checks. Requirements 20.5's legacy project/comparison WebKit configurations are reported separately; the added welcome configuration does not stand in for them.

No owner-supplied asset, software account or purchase is required. Raw private session exports remain pending. The Stop Hook may append to KIRO_USAGE.md after handoff, leaving an uncommitted change outside the reported head commit.
