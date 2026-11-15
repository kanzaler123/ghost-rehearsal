# Implementation Plan: Rehearsal Studio UI

## Overview

This plan implements the presentation, layout, interaction-organization and copy overhaul in `requirements.md` and `design.md`. The language is TypeScript (React 19, `@xyflow/react` 12, Vite 8, Vitest 5, Playwright), as already used by the repository.

Order follows risk. Baseline evidence is recorded first, before any file under `src/` changes. Then come the stylesheet and token layer, shared marker and state components, the top bar, plan navigator, canvas, Build inspector styling, Rehearse, Two Futures, arrangement, Journey, run states, first run, narrow screens and touch targets, reduced motion, bilingual copy and accessibility. The Inspector `<details>` wrapping comes late, after a coordination check with `kiro/dialog-form-reliability`. Verification and delivery tasks are required and close the plan.

Conventions for every task:

- Real scripts from `package.json`: `npm run check` (typecheck plus unit tests), `npm run typecheck`, `npm test` (`vitest run tests --environment node`), `npm run build -- --base=/ghost-rehearsal/`, `npm run test:browser` (`playwright test`, which builds and previews the production bundle with the real Worker). A result is reported only if it was run; anything else is recorded as "not run".
- No new dependency. `fast-check` is NOT added. The design's properties are table-driven example tests in the existing Vitest setup, tagged `// Feature: rehearsal-studio-ui, Property N` and reported honestly as "not property-based".
- Allowed edits follow Requirement 35.1. `src/simulation`, `src/schemas`, `src/features/analysis.ts` and `src/features/project.ts` stay identical to the baseline. `Modal`, `Field`, `NumberInput` and form-reliability logic (owned by `kiro/dialog-form-reliability`) are not changed. If a foreign-owned file needs more than presentation changes, write a minimal interface note in `docs/reviews/ui-visual-polish/interface-notes.md` instead of overwriting.
- Every user-facing string a task adds or touches goes into `src/i18n/messages.ts` in both `en` and `zh` with identical keys and placeholders.
- Extracted components keep the test contract classes named in the design (`.outcome-table`, `.people-stats`, `.people-list`, `.ghost-id`, `.diff-note`, and the others). Existing assertions are never deleted or loosened.
- The guest `side-stream:10` and the time `03:30` appear only in test files, never in `src/`.
- Each top-level task ends with a small logical commit on `kiro/ui-visual-polish`. Never commit to `main`, never force-push, never reset or discard files that had uncommitted changes before the work began. The user's untracked `.kiro/specs/rehearsal-studio-ui/` files are not committed unless the user approves.
- Evidence follows the repo convention: public evidence in `docs/reviews/ui-visual-polish/` next to `docs/reviews/ui-visual-polish.md`; Kiro usage notes in `docs/kiro/`; raw Kiro exports in the ignored `kiro-evidence/` directory.

## Tasks

Status recorded on 2026-11-15: source implementation and browser coverage are committed through `c3464a4`. The final frozen-source check passes 370 tests in 25 files and both typechecks; the production build passes. The final full browser run exits 0 with 56 passed, 0 failed and four intentional capture skips. All eight viewport/language/motion combinations pass the guide/export/import matrix. Preview teardown required stopping the verified run-owned process after all tests completed; this local environment limitation is recorded. The repeated checkpoint gates are satisfied by this final combined verification. See `docs/reviews/ui-visual-polish/verification.md` for commands and preserved failed runs.

- Baseline capture completed before source changes: 28 images, four passing capture cases, commit `4ef1d01`.
- The second full browser run establishes the smoke/demo gates for the implemented shell, report, timeline and copy tasks. The CSS optimizer retains ordered layer blocks instead of a separate order declaration.
- Arrangement, welcome, reduced-motion, accessibility and corner-hit browser cases pass in all four projects. The corrected eight-combination guide/export matrix also passes. Narrow timeline segments retain exact time geometry and use a larger text alternative rather than independent 44px drawn segments.
- Task 20.2 is deferred under 20.1 because task B PR #5 is live and unmerged; `Inspector.tsx` and `Dialogs.tsx` remain unchanged. The coordination notes record both compared SHAs.
- All 28 after images match the before set; capture exits 0 with four passed cases (evidence commit `c97af40`). Delivery notes, verification, image inventory and attribution (`c3b33d9`) are complete. Branch push and Draft PR remain open, including the unresolved questions' remote-delivery gate.

- [x] 1. Record baseline evidence before any UI edit
  - [x] 1.1 Create the work branch and confirm the baseline commit
    - Create `kiro/ui-visual-polish` from `origin/codex/comparison-guided-demo` at `40dc58deb073450f10b4d0aa64a79c22dc19d17f`; confirm `cbe1a834431bfe9a24817d64632bd8ec9071fca3` is an ancestor.
    - Run `git status`; list every file with uncommitted changes (including the untracked `.kiro/specs/rehearsal-studio-ui/`); do not stash, reset or stage them.
    - Check the baseline has the A/B/C guide, the waiting thresholds and the real-Worker browser tests (`e2e/smoke.spec.ts`, `e2e/demo/comparison.spec.ts`). If anything is missing, record branch, base hash and the missing items, and tell the user before the first implementation file change.
    - Files: `docs/reviews/ui-visual-polish/baseline-checks.md` (new).
    - Done-check: `git merge-base --is-ancestor cbe1a834431bfe9a24817d64632bd8ec9071fca3 HEAD` exits 0 on the new branch; the baseline file records both hashes and the working-tree state.
    - _Requirements: 37.1, 37.2, 37.10_

  - [x] 1.2 Run the existing checks on the unmodified baseline and record results
    - Run exactly as typed: `npm ci` (only if `node_modules` is stale), `npm run check`, `npm run build -- --base=/ghost-rehearsal/`, `git diff --check`, `npm run test:browser`.
    - Per command record: text, exit code, pass or fail, and for Vitest and Playwright the passed, failed and skipped counts. Copy `test-results/browser-results.json` to `docs/reviews/ui-visual-polish/baseline-browser-results.json`.
    - List every failing baseline test by name under "Pre-existing failures", so original problems stay separate from newly introduced ones. Mark a command that was not run as "not run" with the reason.
    - Files: `docs/reviews/ui-visual-polish/baseline-checks.md`, `docs/reviews/ui-visual-polish/baseline-browser-results.json` (new).
    - Done-check: every command has a row with a real exit code; no result is stated that was not executed.
    - _Requirements: 36.1, 36.2, 36.4, 36.15_

  - [x] 1.3 Add the screenshot capture spec and capture the "before" screenshots
    - Add `e2e/ui/capture.spec.ts` (task-owned directory; sets viewports with `test.use`; does not edit `playwright.config.ts`). It reads `CAPTURE=before|after`, skips when unset, sets the saved language as `e2e/smoke.spec.ts` does, loads the Example_Project in memory and writes `docs/reviews/ui-visual-polish/<before|after>/<screen>-<viewport>-<lang>.png`.
    - Screens at 1366×768 and 390×844, English and Chinese: `welcome`, `build-inspector` (a service node selected, Inspector expanded), `rehearse-tracked` (run complete, paused at a fixed replay time, a guest tracked), `two-futures-overview`, `journey-divergence` (guest `side-stream:10` at its first divergence). At 390×844 also `narrow-report`, `narrow-flow`, `narrow-journey`, `narrow-evidence`. Selectors are text, role and test-contract classes that exist both at the baseline and after the overhaul, so one file produces both sets.
    - Run `CAPTURE=before npm run test:browser -- e2e/ui/capture.spec.ts` on the unmodified baseline. Add `docs/reviews/ui-visual-polish/README.md` listing each image, its state, the six that form the Requirement 37.4 set, and any image that could not be captured with the reason.
    - Commit the baseline evidence as its own commit and record its hash in `baseline-checks.md`.
    - Files: `e2e/ui/capture.spec.ts`, `docs/reviews/ui-visual-polish/before/*.png`, `docs/reviews/ui-visual-polish/README.md` (all new).
    - Done-check: the capture command exits 0 and `before/` holds one PNG per screen, viewport and language (or the README lists each missing one); `git log` shows this commit before any `src/` change.
    - _Requirements: 36.3, 36.16, 37.4, 37.11_

- [x] 2. Reorganise the stylesheet and define the design tokens
  - [x] 2.1 Split `styles.css` into layered files with no visual change
    - Make `src/app/styles.css` a manifest declaring `@layer vendor, tokens, base, components, layout, modes, responsive, motion;` and importing `@xyflow/react/dist/style.css` into `vendor` and each new file into its own layer.
    - Create `src/app/styles/{tokens,base,components,layout,modes,responsive,motion}.css` by moving existing rules by purpose; values stay identical.
    - Remove the `@xyflow/react/dist/style.css` import from `src/app/main.tsx` (font imports stay).
    - Files: `src/app/styles.css`, `src/app/styles/*.css` (new), `src/app/main.tsx`.
    - Done-check: `npm run build -- --base=/ghost-rehearsal/` exits 0, `dist/assets/*.css` still holds the layer order statement, and `npm run test:browser -- e2e/smoke.spec.ts` exits 0.
    - _Requirements: 4.1, 4.2, 35.1_

  - [x] 2.2 Define the complete token set
    - In `tokens.css` add three Surface_Levels with elevation tokens, three text tiers, `--brand`, `--plan-a`, `--plan-b`, state tones (queue, serve, blocked, finished, left, tracked, diff, stale, failed), delta tones (gain, regression, cost, neutral), spacing, radius, control heights (28, 34, 40 px), `--touch-min` 44 px, type scale (12 to 24 px), border and focus-ring tokens, motion durations, layout sizes, and card-size tokens equal to `NODE_SIZE` and `STAGE_SIZE` in `src/features/stages.ts`.
    - Keep the existing background, panel and overlay color values unchanged. Choose tone values so each reaches 4.5:1 as text on all three surfaces, none equals a plan color or the brand, and the focus ring reaches 3:1.
    - Note the media-query breakpoints in a comment (CSS variables cannot be used in media queries).
    - Files: `src/app/styles/tokens.css`.
    - Done-check: `npm run build -- --base=/ghost-rehearsal/` exits 0; contrast is enforced by the audit in 2.5.
    - _Requirements: 1.1, 1.2, 1.3, 1.6, 1.8, 2.1, 2.2, 2.7, 3.1, 3.7_

  - [x] 2.3 Replace literals with tokens in base, components and layout
    - Move every literal color, length and shadow in `base.css`, `components.css` and `layout.css` onto tokens; use `color-mix` over tokens for alpha tints; no auxiliary text below 12 px; tabular digits on times, counts, durations and deltas; font stacks ending in the generic family; one 2 px `:focus-visible` rule.
    - Apply color semantics: warm orange only for the brand mark and primary actions (remove it from changed edges, waiting state, `.btn.accent` and the active mode tab); mint only for Plan A and purple only for Plan B (no mint for "done" or gain deltas).
    - Panels and cards use the panel level, menus, dialogs and toasts the overlay level; emphasis effects only on primary actions, selection, the Tracked_Visitor and stale, failed, blocked or first-divergence states.
    - Files: `src/app/styles/base.css`, `components.css`, `layout.css`. `Dialogs.tsx` is styled by CSS only.
    - Done-check: `npm run build -- --base=/ghost-rehearsal/` exits 0; the literal audit in 2.5 reports no violation in these files.
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 1.7, 1.9, 2.1, 2.2, 2.3, 3.2, 3.3, 3.7, 3.8, 35.12_

  - [x] 2.4 Replace literals in modes, responsive and motion; remove `!important` and dead rules
    - Tokenise `modes.css`, `responsive.css`, `motion.css`. Keep `!important` only in `.react-flow__*` rules and inside `@media (prefers-reduced-motion: reduce)` (this removes the `.scope-note` one). Delete rules whose selectors match no rendered element; merge duplicate rules that set the same property for the same selector in one layer.
    - Files: `src/app/styles/modes.css`, `responsive.css`, `motion.css`.
    - Done-check: `npm run build -- --base=/ghost-rehearsal/` exits 0 and `npm run test:browser -- e2e/smoke.spec.ts` exits 0.
    - _Requirements: 1.2, 3.7, 4.2, 4.3, 4.4_

  - [x] 2.5 Write the stylesheet audit test
    - `tests/ui-styles.test.ts` reads CSS and sources and checks: declared layer order and a layer on every `@import`; no hex, `rgb()`, `hsl()`, length literal (except 0) or literal shadow outside `tokens.css`; `!important` only in allowed contexts; every class selector is used by source (dynamic prefixes by prefix); no property set twice for one selector in one layer; contrast of every text token and tone on all three surfaces (4.5:1 text, 3:1 focus ring and borders); the five guest-state markers differ pairwise in tone, icon and shape (enabled after 3.2); base palette equals the baseline; card-size tokens equal the `stages.ts` constants; no font size below 12 px except third-party attribution. This is a static audit, not a property-based test.
    - Files: `tests/ui-styles.test.ts` (new).
    - Done-check: `npm test` exits 0 with this file included.
    - _Requirements: 1.2, 1.4, 1.6, 1.8, 2.4, 2.7, 3.7, 4.1, 4.2, 4.3, 4.4_

- [x] 3. Build the shared status marker, delta and run-state components
  - [x] 3.1 Add the shell scaffolding and extend the test harness
    - Create `src/components/shell/index.ts` with a `SHELL_COMPONENTS` registry (filled as components are added). Shell components are hook-free except `useI18n`.
    - Extend the `flatten` helper in `tests/workbench.test.ts` to expand registered shell components by calling them as functions. No assertion is edited.
    - Create `tests/workbench-ui.test.ts` with the App hook shim copied from `tests/workbench.test.ts`, ready for later behavior tests.
    - Files: `src/components/shell/index.ts` (new), `tests/workbench.test.ts` (helper only), `tests/workbench-ui.test.ts` (new).
    - Done-check: `npm test` exits 0 with existing `tests/workbench.test.ts` assertions unchanged.
    - _Requirements: 4.5, 35.7_

  - [x] 3.2 Add the marker registry and `StatusMarker`
    - `markers.ts` (`MarkerId`, `MARKERS` with icon, shape and tone token per the design table) and `StatusMarker.tsx` (text label, icon, shape class; `compact` keeps shape and icon, label as accessible name). Add `markers.*` and `delta.*` keys in `en` and `zh`, and marker styles in `components.css`.
    - Files: `src/components/shell/markers.ts`, `StatusMarker.tsx` (new), `shell/index.ts`, `src/i18n/messages.ts`, `src/app/styles/components.css`.
    - Done-check: `npm run typecheck` exits 0; the marker-distinctness check in `tests/ui-styles.test.ts` passes under `npm test`.
    - _Requirements: 2.4, 2.5, 2.6, 9.2, 14.6, 29.1_

  - [x] 3.3 Add delta classification and `DeltaBadge`
    - `deltaTone.ts`: `classifyDelta` with the direction table, `ZERO_EPS`, `belowPrecision` and `unavailable`. `DeltaBadge.tsx`: sign, unit through the existing helpers, icon, shape and word; a neutral "no change" marker; "differs below display precision". Add a metric formatter that returns a dash without unit for missing or non-finite values and never prints `NaN` or `Infinity`.
    - Files: `src/components/shell/deltaTone.ts`, `DeltaBadge.tsx` (new), `shell/index.ts`, `src/i18n/messages.ts`, `src/app/styles/components.css`.
    - Done-check: `npm run typecheck` exits 0; the tests in 3.5 pass.
    - _Requirements: 3.5, 3.6, 3.9, 3.10, 16.6, 18.2, 18.4, 18.5, 18.8_

  - [x] 3.4 Add run-state derivation and `RunStateCard`
    - `runState.ts` (`deriveRunState`, `deriveEmptyState`) and `RunStateCard.tsx` for nine states (not run, computing, run complete, stopped, run failed, result stale, empty roster, no difference, no evidence): unique marker label, a one-sentence description, exactly one enabled primary action. Computing shows an indeterminate indicator, never a percentage. Add `runState.*` keys in both languages.
    - Files: `src/components/shell/runState.ts`, `RunStateCard.tsx` (new), `shell/index.ts`, `src/i18n/messages.ts`, `src/app/styles/components.css`.
    - Done-check: `npm run typecheck` exits 0.
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.8, 16.9, 16.10_

  - [x] 3.5 Write table-driven classification tests (Properties 1, 2, 3; not property-based)
    - `tests/ui-delta.test.ts`: tables for every metric in the direction table (gain, regression, cost, none), signs, pairs equal after rounding with a non-zero delta, a display function rounding both sides to the same text, and missing, `NaN`, `Infinity` and `-Infinity` inputs (dash, never 0).
    - **Property 1: Delta classification follows the metric direction table and ignores display rounding**
    - **Property 2: Below-display-precision flag**
    - **Property 3: Unavailable values never render as numbers**
    - **Validates: Requirements 3.5, 3.6, 3.9, 3.10, 18.2, 18.4, 18.5**
    - Files: `tests/ui-delta.test.ts` (new).
    - Done-check: `npm test` exits 0 with this file included.
    - _Requirements: 3.6, 18.2, 18.4_

- [x] 4. Checkpoint - Ensure all tests pass
  - Run `npm run check` and `npm run test:browser -- e2e/smoke.spec.ts`. Ensure all tests pass, ask the user if questions arise.

- [x] 5. Rebuild the top bar and mode navigation
  - [x] 5.1 Add `ContextMenu` and `ModeNav`
    - `ContextMenu.tsx`: native `<details>` menu that closes on Escape and focus-out, returns focus to its summary and stops propagation so only the topmost layer closes. `ModeNav.tsx`: tablist of Build, Rehearse, Two Futures (ids stay `Build | Rehearse | Compare`), `aria-selected` plus a shape-bearing marker, `aria-disabled` with `aria-describedby` to a visible reason, disabled while a run computes. Button text equals the label exactly.
    - Files: `src/components/shell/ContextMenu.tsx`, `ModeNav.tsx` (new), `shell/index.ts`, `src/i18n/messages.ts`, `src/app/styles/components.css`, `src/app/styles/layout.css`.
    - Done-check: `npm run typecheck` and `npm test` exit 0.
    - _Requirements: 6.2, 6.3, 6.5, 6.6, 6.7, 28.4_

  - [x] 5.2 Extract `TopBar` and `ModeActions` and wire them into `App.tsx`
    - `TopBar.tsx`: brand, context chip (activity · plan, ellipsis with `title` and full accessible name), `ModeNav`, undo and redo, Run (replaced by Stop while computing), Save with a text save state, one more-actions menu (import, export, plan and scenario JSON, run scope, about) and the language switch. `ModeActions.tsx`: mode-specific actions at a stable position with the visible disabled reason. State stays in `App.tsx`; handlers are typed props, no `any`. Stop keeps earlier results and the project and shows the cancelled notice.
    - Files: `src/components/shell/TopBar.tsx`, `ModeActions.tsx` (new), `src/app/App.tsx`, `src/i18n/messages.ts`, `src/app/styles/layout.css`.
    - Done-check: `npm run check` and `npm run test:browser -- e2e/smoke.spec.ts` exit 0 with existing assertions unchanged.
    - _Requirements: 4.5, 6.1, 6.4, 6.5, 6.6, 6.8, 6.9, 35.7, 38.1_

  - [x]* 5.3 Write shell render tests for the top bar and mode navigation
    - Render `TopBar`, `ModeNav`, `ModeActions` as functions: activity and plan names, `aria-selected`, disabled reason with `aria-describedby`, secondary actions inside the menu, icon-only buttons have names, shell components use no hook except `useContext`.
    - Files: `tests/ui-shell.test.ts` (new).
    - Done-check: `npm test` exits 0.
    - _Requirements: 6.1, 6.3, 6.5, 28.9_

- [x] 6. Rebuild the plan navigator
  - [x] 6.1 Extract `PlanNavigator` with the node filter
    - `navigation.ts` gets `filterNodes` (trimmed, case-insensitive on node name or type name, original order, empty query returns all). `PlanNavigator.tsx`: activity name, A and B badges in plan colors, the plan being edited marked on one plan only, rename, duplicate, delete, set-as-B, save-as-template and event settings in a keyboard-operable `ContextMenu`, a collapsible rail that keeps the badges (and in Rehearse the stage list with waiting counts), an empty-B slot, an empty-result text that keeps the typed text and ignores Enter, search cleared on activity change.
    - Files: `src/components/shell/navigation.ts`, `PlanNavigator.tsx` (new), `shell/index.ts`, `src/app/App.tsx`, `src/i18n/messages.ts`, `src/app/styles/layout.css`.
    - Done-check: `npm run check` and `npm run test:browser -- e2e/smoke.spec.ts` exit 0.
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 38.1_

  - [x]* 6.2 Write table-driven node-filter and navigator tests (Property 13; not property-based)
    - Tables for `filterNodes` (case, trimming, no match, empty query, order) and render tests for badges, empty B slot and rail.
    - **Property 13: Node search filter**
    - **Validates: Requirements 7.5, 7.8**
    - Files: `tests/ui-navigation.test.ts` (new), `tests/ui-shell.test.ts`.
    - Done-check: `npm test` exits 0.
    - _Requirements: 7.5, 7.8_

- [x] 7. Rework canvas node cards, edges, ghosts and viewport
  - [x] 7.1 Reorder node and stage card internals, markers and edges
    - First read `src/components/Canvas.tsx`, `src/features/stages.ts`, `src/features/viewport.ts`, `tests/canvas.test.ts` and `tests/stages.test.ts` together. `NODE_SIZE`, `STAGE_SIZE`, `FRAME_PAD` and the outer card boxes stay unchanged; only the card interior changes.
    - Card order: type icon, node name (one line, ellipsis, full name as accessible name and `title`), key configuration from `detailOf` with units ("not set" when empty), a status row of `StatusMarker`s for selected, error, plan difference and running without overlap. Stage_Frame shows its title and the same stage marker as its Stage_Card.
    - Edges keep the target arrowhead and branch labels. A selected node highlights all its edges and endpoint markers by stroke width as well as color; a selected edge highlights itself and its two endpoints. In Two Futures each node and stage that differs under `planChanges` gets the plan-difference marker on every side where it exists.
    - Add `quiet` to `HauntedBackdrop` (reduced prominence, beneath nodes, edges, ghosts and labels, `pointer-events: none`); full prominence stays for entry screens and an empty canvas; compact Two Futures canvases still omit it.
    - Files: `src/components/Canvas.tsx`, `src/components/Icons.tsx`, `src/app/styles/components.css`, `src/app/styles/modes.css`, `src/i18n/messages.ts`.
    - Done-check: `npm run typecheck` exits 0; `npx vitest run tests/canvas.test.ts tests/stages.test.ts --environment node` exits 0 with expectations unchanged.
    - _Requirements: 3.4, 5.1, 5.2, 5.5, 5.6, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9, 9.10_

  - [x] 7.2 Add canvas view actions, the active marker and manual-move detection
    - Add `viewMark` state (`'default' | 'all' | null`) in `App.tsx` and two text-labelled actions ("Readable view", "Full overview"), each active only while the viewport matches. Add an `onManual` callback from `Canvas` (wheel, drag, pinch, keyboard, zoom controls, minimap) that clears `viewMark` and stops automatic placement.
    - Opening or closing the Inspector, a panel or the Dock keeps a user-set viewport and re-places only while automatic placement is active. Selecting a node on the canvas leaves the viewport unchanged; selecting from the node list focuses it. Minimap, zoom controls and tools stay clear of `.card-name` and `.card-detail` in the readable view at 1366×768 and 390×844; the narrow-container minimap rule stays.
    - Files: `src/components/Canvas.tsx`, `src/components/shell/ModeActions.tsx`, `src/app/App.tsx`, `src/app/styles/components.css`, `src/app/styles/layout.css`, `src/i18n/messages.ts`. `src/features/viewport.ts` only if the active-view logic needs it.
    - Done-check: `npm run check` exits 0; `npx vitest run tests/canvas.test.ts --environment node` exits 0 unchanged.
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9, 8.10, 10.7_

  - [x] 7.3 Extract `layoutGhosts` and apply tracked-first drawing
    - Add `src/components/ghostRow.ts` with `layoutGhosts(ghosts, limit, trackedId)` returning `{ pinned, shown, undrawn }`; use it in `GhostRow` and `StageCard`. The Tracked_Visitor is drawn first, larger, with a name label and a `tracked` marker (halo shape plus text); drawn plus undrawn equals the guests present at the current replay time. Ghosts come only from recorded playback state; transfers use the recorded duration with zero added travel time.
    - Files: `src/components/ghostRow.ts` (new), `src/components/Canvas.tsx`.
    - Done-check: `npm run check` exits 0.
    - _Requirements: 5.3, 15.2, 15.3, 15.4, 32.1, 32.2, 32.3_

  - [x] 7.4 Add the canvas guard tests
    - `tests/ui-canvas.test.ts`: `onManual` clears the active view mark; card-size tokens equal the `stages.ts` constants. The existing `tests/canvas.test.ts` and `tests/stages.test.ts` pass untouched (edges attached, frames enclose members with `FRAME_PAD`, locate-node and zoom-to-fit keep targets inside the viewport).
    - Files: `tests/ui-canvas.test.ts` (new).
    - Done-check: `npx vitest run tests/canvas.test.ts tests/stages.test.ts tests/ui-canvas.test.ts --environment node` exits 0.
    - _Requirements: 8.4, 9.9_

  - [x]* 7.5 Write table-driven ghost-row tests (Property 7; not property-based)
    - Tables over list length, limit, tracked present, tracked absent and limit 0: drawn plus undrawn equals present, no duplicate, tracked first and once, at most `max(limit, 1)` when tracked is present.
    - **Property 7: Ghost row accounting and tracked-first drawing**
    - **Validates: Requirements 5.3, 15.2, 15.3, 15.4**
    - Files: `tests/ui-ghostrow.test.ts` (new).
    - Done-check: `npm test` exits 0.
    - _Requirements: 15.2, 15.4_

- [x] 8. Checkpoint - Ensure all tests pass
  - Run `npm run check` and `npm run test:browser -- e2e/smoke.spec.ts`. Ensure all tests pass, ask the user if questions arise.

- [x] 9. Style the Build inspector (CSS only)
  - [x] 9.1 Check Dialogs and Inspector coordination
    - Run `git fetch`; compare `src/components/Inspector.tsx`, `src/components/Dialogs.tsx` and the `Modal`, `Field`, `NumberInput` code on `origin/kiro/dialog-form-reliability` (if it exists) and `origin/kiro/release-integration` with the working tree. Record in `docs/reviews/ui-visual-polish/interface-notes.md` what task B changed, that this task makes only styling and layout changes there, and the minimal interface needed for the late wrapping in task 20. Write no code in `Dialogs.tsx` or `Inspector.tsx` in this task.
    - Files: `docs/reviews/ui-visual-polish/interface-notes.md` (new).
    - Done-check: the notes list the compared refs with commit hashes (or "branch not found"); `git diff --stat -- src/components/Dialogs.tsx` is empty.
    - _Requirements: 35.10, 35.11, 35.12_

  - [x] 9.2 Restyle the Inspector and its read-only look
    - In `components.css` and `layout.css` style the Inspector panel (324 px), headers, field groups with unit labels, and the read-only look and text marker in Rehearse and Two Futures. No change to field, `NumberInput`, draft and commit, validation or focus-trap logic.
    - Files: `src/app/styles/components.css`, `src/app/styles/layout.css`.
    - Done-check: `npm run build -- --base=/ghost-rehearsal/` exits 0; `git diff --stat -- src/components/Inspector.tsx src/components/Dialogs.tsx` is empty.
    - _Requirements: 10.3, 10.8, 35.12_

- [x] 10. Rework Rehearse live status, the dock and the tracked visitor
  - [x] 10.1 Add the queue and key-moment helpers and use them in `Rehearse.tsx`
    - Add `longestQueues` (limit 4, waiting above 0, largest first) and `momentsSoFar` (limit 6, time at or before the replay time, newest first) to `navigation.ts`. Keep the labels "Longest queues now" and "Key moments so far" and their Chinese equivalents; show the empty texts "no one is waiting at that moment" and "nothing notable has happened yet". Rows use the shared marker icons. A "hot" marker is described as based on the display threshold at the current replay time, with no wording implying proven danger or a single bottleneck. A queue row focuses its station without changing replay time.
    - Files: `src/components/shell/navigation.ts`, `src/components/Rehearse.tsx`, `src/i18n/messages.ts`.
    - Done-check: `npm run check` exits 0.
    - _Requirements: 14.3, 14.4, 14.5, 14.6, 14.8, 14.9_

  - [x] 10.2 Add `LiveStatusStrip` and `SummaryStrip`
    - `LiveStatusStrip`: titled "Replay state · mm:ss", four counts (in the flow, waiting, being served, finished) with label, icon and whole number, computed from the same `playbackAt` view as the ghosts; a "no replay data" indication, not zeros, when no run exists. `SummaryStrip`: a separate region titled with the Statistics_Scope and its scenario time, each cell labelled with its scope. A replay-time change re-renders only the live strip; a scope change only the summary strip.
    - Files: `src/components/shell/LiveStatusStrip.tsx`, `SummaryStrip.tsx` (new), `shell/index.ts`, `src/app/App.tsx`, `src/i18n/messages.ts`, `src/app/styles/modes.css`.
    - Done-check: `npm run check` exits 0.
    - _Requirements: 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 30.1, 30.5_

  - [x] 10.3 Rework the dock layout and replay controls
    - Fixed control row (play and pause, reset, speed, replay clock, timeline, end time) that does not move when tabs open; timeline `aria-valuetext` "mm:ss of mm:ss"; key-moment markers as buttons with an icon and accessible name "mm:ss · description" that jump, pause and locate the station. Tabs keep their ids; each fact shows its full value in one tab and others link to it; collapsed tabs show a summary line (item count and first item); expand controls expose their state and work by keyboard; dock body height `clamp(140px, 20dvh, 240px)`. With no results the controls are disabled and the replay time reads 0:00. Replay base rate (30 scenario seconds per real second at 1×) and speeds are unchanged.
    - Files: `src/components/Rehearse.tsx`, `src/components/Results.tsx` (presentation only), `src/app/App.tsx`, `src/app/styles/components.css`, `src/app/styles/layout.css`, `src/i18n/messages.ts`.
    - Done-check: `npm run check` exits 0.
    - _Requirements: 12.1, 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7, 13.8, 13.9, 14.1, 14.2, 14.7_

  - [x] 10.4 Finish the tracked-visitor status
    - The dock status text shows the current station and state while the visitor is in the system, and "not in the system at this time" before arrival and after leaving or finishing, with the visitor kept set and no canvas marker. "Locate" is disabled when the visitor does not exist in the run. Entry points keep the same position in Rehearse and Two Futures; in Two Futures the visitor appears on both canvases at the shared replay time; collapsed Stage_Cards show the visitor first with its name.
    - Files: `src/components/Rehearse.tsx`, `src/components/Canvas.tsx`, `src/app/App.tsx`, `src/i18n/messages.ts`.
    - Done-check: `npm run check` exits 0.
    - _Requirements: 15.1, 15.3, 15.5, 15.6, 15.7, 15.8, 15.9, 19.1, 19.10_

  - [x] 10.5 Write replay-versus-summary tests (Properties 4 and 6; table-driven, not property-based)
    - In `tests/workbench-ui.test.ts`, with the Example_Project run and replay times at start, middle, end and three distinct drag positions in both scopes: every summary cell, the scope title and time stay identical after scrubbing, the scope selection does not change, and the live waiting and serving counts equal the sums over nodes of `playbackAt(run.events, plan, time)`.
    - **Property 4: Replay scrubbing leaves summary values unchanged**
    - **Property 6: Live counts equal the per-node sums shown on cards**
    - **Validates: Requirements 12.4, 12.5, 12.6, 13.4, 30.1, 30.2, 32.6**
    - Files: `tests/workbench-ui.test.ts`.
    - Done-check: `npm test` exits 0.
    - _Requirements: 12.4, 12.5, 12.6, 30.2_

  - [x]* 10.6 Write table-driven queue and moment list tests (Property 14; not property-based)
    - **Property 14: Longest-queue and key-moment lists**
    - **Validates: Requirements 14.8, 14.9**
    - Files: `tests/ui-navigation.test.ts`.
    - Done-check: `npm test` exits 0.
    - _Requirements: 14.8, 14.9_

- [x] 11. Rework the Two Futures report: snapshot, conclusions and resource cost
  - [x] 11.1 Move and extend `ComparisonSnapshot`
    - Move the local snapshot from `CompareReport.tsx` to `shell/ComparisonSnapshot.tsx`. Rows: completed, average wait, left early, unfinished, resource cost, each with A → B and a `DeltaBadge`. The header shows A and B names (ellipsis, full name on hover, focus and as accessible name), "both plans use the same group of guests", the Statistics_Scope with its time as mm:ss, and "B relative to A".
    - Average and P90 wait for all arrived guests are primary; the completed-only figure is secondary with its own label and sample size, and "No guest completed" with no Delta when that sample is empty. Every number sits beside its scope, each side's statistics end, arrived sample size, not-arrived count and unmatched count. Plan B never carries "better", "best", "winner" or "recommended".
    - Files: `src/components/shell/ComparisonSnapshot.tsx` (new), `src/components/CompareReport.tsx`, `shell/index.ts`, `src/i18n/messages.ts`, `src/app/styles/modes.css`.
    - Done-check: `npm run check` and `npm run test:browser -- e2e/demo/comparison.spec.ts` exit 0 with assertions unchanged.
    - _Requirements: 17.1, 17.2, 17.3, 18.1, 18.2, 18.3, 18.6, 18.7, 18.8, 38.3_

  - [x] 11.2 Add `ConclusionGroups`
    - Three labelled groups (gains, regressions, costs), one list item per metric with a non-zero delta built from the same `classifyDelta` results as the snapshot, "none" for an empty group, no single-paragraph verdict. Remove the duplicated `Verdict` paragraph.
    - Files: `src/components/shell/ConclusionGroups.tsx` (new), `src/components/CompareReport.tsx`, `shell/index.ts`, `src/i18n/messages.ts`.
    - Done-check: `npm run check` exits 0.
    - _Requirements: 17.5, 17.6, 18.1, 18.2, 38.3_

  - [x] 11.3 Fix the report section order and collapsing
    - Order: what changed, how the overall results moved, who is affected, where waiting changed, resource cost. The summary and the three conclusion groups stay visible; detailed changes, distributions, station tables and resource details sit in sections collapsed by default with keyboard-operable headers. Keep people-group buttons (disabled at count 0), representative shortcuts, the evidence entry and the Visitor_Journey reachable. At Desktop_Compact add a labelled collapse and expand control for the report (`reportCollapsed` in `App.tsx`, reset on leaving Two Futures).
    - Files: `src/components/CompareReport.tsx`, `src/app/App.tsx`, `src/app/styles/modes.css`, `src/i18n/messages.ts`.
    - Done-check: `npm run check` and `npm run test:browser -- e2e/demo/comparison.spec.ts` exit 0.
    - _Requirements: 17.4, 17.7, 17.8, 20.1, 20.2, 20.3, 20.6, 27.3, 38.8_

  - [x] 11.4 Present resource cost
    - Show B relative to A for headcount (people), devices, staffed and device time (hours) and overtime (existing duration format) with explicit signs (zero unsigned); "Resources and scheduled time unchanged" when all are equal; "not available" for any unavailable item while the rest still show; no currency, ROI or monetary text; no mixed units in one value.
    - Files: `src/components/CompareReport.tsx`, `src/components/shell/ComparisonSnapshot.tsx`, `src/i18n/messages.ts`.
    - Done-check: `npm run check` exits 0.
    - _Requirements: 21.1, 21.2, 21.3, 21.4, 21.5, 21.6_

  - [x] 11.5 Show not-ready states instead of comparison numbers
    - When `comparisonReady` does not hold, replace every comparison number, group count, story and divergence with a `RunStateCard` naming the reason (missing run for A or B, stale, incompatible, missing final results) and one action. Keep plans and runs unchanged, disable comparison export, never substitute cutoff numbers for missing final ones. Evidence from a previous run is labelled as such and read from its own snapshot.
    - Files: `src/components/CompareReport.tsx`, `src/app/App.tsx`, `src/i18n/messages.ts`.
    - Done-check: `npm run check` exits 0.
    - _Requirements: 16.5, 18.9, 31.1, 31.2, 31.3, 31.4, 38.5_

  - [x] 11.6 Write the scope-switching test (Property 5; table-driven, not property-based)
    - In `tests/workbench-ui.test.ts`, with the Example_Project run and compared: switching the Statistics_Scope between cutoff and final and the wait rule between its options creates no new Worker, keeps the same `runs` object, leaves the replay time unchanged, and updates the report, scope title and time, per-station times and resource scope. Scrubbing to at least three replay times afterwards leaves every summary value unchanged.
    - **Property 5: Scope and threshold changes do not rerun and do not move replay time**
    - **Validates: Requirements 25.3, 25.4, 30.3, 36.9**
    - Files: `tests/workbench-ui.test.ts`.
    - Done-check: `npm test` exits 0.
    - _Requirements: 25.3, 25.4, 30.3, 30.4_

  - [x]* 11.7 Write conclusion-grouping and wording tests (Property 17; table-driven, not property-based)
    - Each non-zero metric appears in exactly one group; zero or unavailable metrics in none; an empty group renders "none"; a source scan finds no "better", "best", "winner" or "recommended" attached to Plan B and no currency terms in the report.
    - **Property 17: Conclusion groups partition the changed metrics**
    - **Validates: Requirements 17.5, 17.6, 18.1, 18.2, 21.3**
    - Files: `tests/ui-delta.test.ts`, `tests/ui-i18n.test.ts` (new).
    - Done-check: `npm test` exits 0.
    - _Requirements: 17.5, 17.6, 18.1, 21.3_

- [x] 12. Add the two-canvas arrangement option
  - [x] 12.1 Add the preference and viewport helpers
    - `src/app/preferences.ts`: `loadArrangement`, `saveArrangement` on `localStorage['ghost-rehearsal.arrangement.v1']` (try/catch; invalid or unavailable storage resolves to `auto`). `src/app/useMedia.ts`: `useNarrowScreen()` from `useState` and `useEffect` with `window.matchMedia?.('(max-width: 980px)')`, no other hooks. `shell/arrangement.ts`: `parseArrangement` and `effectiveArrangement(pref, narrow, autoRows)`.
    - Files: `src/app/preferences.ts`, `src/app/useMedia.ts`, `src/components/shell/arrangement.ts` (new).
    - Done-check: `npm run typecheck` exits 0.
    - _Requirements: 19.2, 19.3, 19.12, 19.13_

  - [x] 12.2 Add `ArrangementControl` and wire it into Two Futures
    - Segmented control "Auto / Top-bottom / Left-right" (default Auto) in the Two Futures `ModeActions`, shown above 980 px; at 980 px or narrower the canvases are top-bottom and an explanatory text replaces the control. `App.tsx` keeps `arrangement` state (loaded from storage, saved on explicit selection, never overwritten by the forced narrow layout) and sets the `.canvas-area` class from `effectiveArrangement`. Only the container class changes: React keys, plan data, node coordinates, replay time, tracked visitor and expanded stages stay put and no result becomes stale. Each canvas title shows the plan badge, plan name (ellipsis, full name on hover and focus), the replay time and a text "Read-only" chip.
    - Files: `src/components/shell/ArrangementControl.tsx` (new), `shell/ModeActions.tsx`, `shell/index.ts`, `src/app/App.tsx`, `src/components/Canvas.tsx`, `src/i18n/messages.ts`, `src/app/styles/modes.css`.
    - Done-check: `npm run check` exits 0.
    - _Requirements: 19.2, 19.3, 19.5, 19.7, 19.8, 19.12, 19.13, 19.14, 19.15_

  - [x] 12.3 Write arrangement unit tests (Properties 9 and 10; table-driven, not property-based)
    - `tests/ui-arrangement.test.ts`: the 3 × 2 × 2 table for `effectiveArrangement`; `parseArrangement` for valid, invalid, null and undefined; storage that throws resolves to `auto`; a select, narrow, wide sequence restores the last explicit preference. In `tests/workbench-ui.test.ts`: a sequence of arrangement selections leaves `project`, node coordinates, `time`, `visitorId`, `expanded`, `runs` and stale flags reference-equal and creates no Worker.
    - **Property 9: Arrangement resolution and restore**
    - **Property 10: Arrangement changes touch only the container**
    - **Validates: Requirements 19.2, 19.3, 19.12, 19.13, 19.14, 19.15**
    - Files: `tests/ui-arrangement.test.ts` (new), `tests/workbench-ui.test.ts`.
    - Done-check: `npm test` exits 0.
    - _Requirements: 19.2, 19.3, 19.12, 19.13, 19.14, 19.15_

  - [x] 12.4 Write the arrangement browser spec
    - `e2e/ui/arrangement.spec.ts` (own viewport): the control offers Auto, Top-bottom and Left-right with Auto default; a manual choice persists through resize, replay, a plan edit in Build and back, and reload; at 980 px or narrower the canvases stack and the explanation shows; widening restores the saved choice; exported node positions are identical before and after.
    - Files: `e2e/ui/arrangement.spec.ts` (new).
    - Done-check: `npm run test:browser -- e2e/ui/arrangement.spec.ts` exits 0.
    - _Requirements: 19.2, 19.3, 19.12, 19.13, 19.14, 36.12_

- [x] 13. Rework the Visitor Journey: hierarchy, timeline and divergence card
  - [x] 13.1 Add timeline geometry and shared-axis lanes
    - `timelineGeometry.ts`: `segmentExtent(start, end, span)` (percent, clamped) and `labelFits(label, widthPx)`. In `Journey.tsx` draw A and B on one axis; hide segment text that does not fit; show station, state, start, end and duration on hover, focus or activation and remove it on leave, blur or Escape; open segments end at the scope end with a "continues after the cutoff" text; zero-duration transitions are zero-width markers with no added travel time; replay and First_Divergence markers carry text labels (no divergence marker when none exists); segments are buttons in time order with a visible focus ring and Enter and Space activation; the lanes have a text alternative listing each segment.
    - Files: `src/components/timelineGeometry.ts` (new), `src/components/Journey.tsx`, `src/app/styles/modes.css`, `src/i18n/messages.ts`.
    - Done-check: `npm run check` and `npm run test:browser -- e2e/demo/comparison.spec.ts` exit 0.
    - _Requirements: 23.1, 23.2, 23.3, 23.4, 23.5, 23.6, 23.7, 23.8, 23.9, 28.9_

  - [x] 13.2 Add `DivergenceCard` and the jump action
    - `DivergenceCard.tsx` reads time, station and state only from `firstDifference` and the recorded journeys (no hardcoded values). It shows mm:ss and the A-side and B-side station and state; a side with no station shows a placeholder text and no link; "no divergence in this scope" disables the jump and leaves replay time and focus unchanged; "the two futures are identical for this guest" when none exists. The jump sets the replay time to the divergence time and focuses the divergence station on each canvas (or the one that has a station), keeping guest, plans, scope and threshold. Station links open the station in the owning plan's inspector without changing replay time, guest or scope. Keep the `.diff-note` class.
    - Files: `src/components/shell/DivergenceCard.tsx` (new), `shell/index.ts`, `src/components/Journey.tsx`, `src/app/App.tsx`, `src/i18n/messages.ts`, `src/app/styles/modes.css`.
    - Done-check: `npm run check` exits 0.
    - _Requirements: 24.1, 24.2, 24.3, 24.4, 24.5, 24.6, 38.4, 38.6_

  - [x] 13.3 Reorder the Journey sections and add the context header
    - `JourneyContext.tsx` header with "Back to overview", scope and rule. Section order: guest and attributes; replay state and outcome (labelled "replay state" and "outcome at cutoff" or "outcome at final / run limit"); divergence card; lanes; per-station table (wait, service time and Delta for A and B); raw events in a `<details>`. The people list keeps 20 per page and combines case-insensitive search with the group filter; an empty result keeps the query, filter and the selected guest; a guest with no records shows "no data" in the affected sections and never the previous guest's data. Exactly one evidence entry in the conclusion, the divergence card and the journey. Returning to the overview restores plans, scope, threshold and keeps the selected guest as Tracked_Visitor. No new retention of page, search or scroll.
    - Files: `src/components/shell/JourneyContext.tsx` (new), `shell/index.ts`, `src/components/Journey.tsx`, `src/app/App.tsx`, `src/i18n/messages.ts`, `src/app/styles/modes.css`.
    - Done-check: `npm run check` and `npm run test:browser -- e2e/demo/comparison.spec.ts` exit 0.
    - _Requirements: 20.4, 20.5, 20.6, 20.7, 22.1, 22.2, 22.3, 22.4, 22.5, 22.6, 22.7, 22.8, 22.9, 22.10, 25.1, 25.2, 25.5, 35.13, 38.7, 38.8_

  - [x] 13.4 Write the jump-to-divergence consistency test
    - In `tests/workbench-ui.test.ts`, with the real Example_Project run and guest `side-stream:10`: the First_Divergence is 03:30 with A queueing and B serving; after the jump the replay time shows 03:30, the Tracked_Visitor is `side-stream:10`, the focused station is the one named in the card, and plans, scope and threshold are unchanged. A second case covers no divergence: the jump is disabled and nothing changes. These values appear only in test files.
    - Files: `tests/workbench-ui.test.ts`.
    - Done-check: `npm test` exits 0 and `grep -R "side-stream:10" src` finds nothing.
    - _Requirements: 24.2, 24.3, 36.8_

  - [x]* 13.5 Write table-driven timeline geometry tests (Properties 15 and 16; not property-based)
    - **Property 15: Timeline geometry**
    - **Property 16: Label fit is monotonic**
    - **Validates: Requirements 23.1, 23.2, 23.3, 23.5**
    - Files: `tests/ui-timeline.test.ts` (new).
    - Done-check: `npm test` exits 0.
    - _Requirements: 23.2, 23.3, 23.5_

- [x] 14. Unify run states
  - [x] 14.1 Track stopped and failed runs and show `RunStateCard`
    - Add `lastRun` state in `App.tsx` (`{ kind: 'stopped' | 'failed', planIds }`), set in the cancel, Worker-error and failed-run branches and cleared on the next launch, a successful result for those plans, a plan change and a mode change. Show `RunStateCard` in Build, Rehearse and Two Futures for not run, computing, stopped, failed and stale, each with exactly one next action (run, stop or rerun). A stopped or failed run never presents values as results, and earlier results stay under the existing stale rules. The stale marker shows on the affected plan. `src/schemas/fingerprint.ts` is not changed.
    - Files: `src/app/App.tsx`, `src/components/shell/RunStateCard.tsx`, `src/components/shell/TopBar.tsx`, `src/i18n/messages.ts`.
    - Done-check: `npm run check` exits 0.
    - _Requirements: 6.8, 16.1, 16.2, 16.3, 16.4, 16.5, 33.3, 33.4, 33.6_

  - [x] 14.2 Add empty, unknown and run-limit presentations
    - Empty roster names the active filter and search text and offers a clear action; no difference names the rule and offers a rule choice; zero Evidence records shows the no-evidence state and never presents the conclusion as supported; unknown "—" has an explanation reachable by keyboard and touch; a run-limit result shows unfinished and not-arrived counts separately in people and never says "everyone finished".
    - Files: `src/components/Journey.tsx`, `src/components/CompareReport.tsx`, `src/components/Results.tsx`, `src/components/shell/RunStateCard.tsx`, `src/i18n/messages.ts`.
    - Done-check: `npm run check` exits 0.
    - _Requirements: 16.6, 16.7, 16.8, 16.9, 16.10_

  - [x] 14.3 Write stop, failure and stale tests (Property 8; table-driven, not property-based)
    - In `tests/workbench-ui.test.ts`: Stop leaves `runs` and the project unchanged and sets the stopped state; a failed run sets the failed state and does not make the comparison ready. Edits to name, description, notes, node position or collapse state keep `inputKey` and the result valid with no stale marker. Edits to a service duration, staff shift, route weight, resource quantity or run limit change `inputKey`, mark the affected plan stale and make Comparison_Ready false until rerun.
    - **Property 8: Display-only edits never make results stale; simulation edits do**
    - **Validates: Requirements 9.10, 11.5, 33.1, 33.2, 36.10**
    - Files: `tests/workbench-ui.test.ts`.
    - Done-check: `npm test` exits 0.
    - _Requirements: 6.8, 11.5, 16.3, 16.4, 33.1, 33.2_

  - [x]* 14.4 Write table-driven run-state derivation tests (Property 12; not property-based)
    - **Property 12: Run state derivation is total and unique**
    - **Validates: Requirements 16.1**
    - Files: `tests/ui-runstate.test.ts` (new).
    - Done-check: `npm test` exits 0.
    - _Requirements: 16.1_

- [x] 15. Rework the welcome and first-run experience
  - [x] 15.1 Update first-run copy, order and atmosphere
    - Replace `eventSetup.subtitle` with one sentence saying Ghost Rehearsal rehearses an event flow and compares outcomes for the same simulated guests under two plans. Update `notices.exampleLoaded` to at most two sentences (current mode, run action, comparison action). With CSS only, move `.event-start-options` (the "try the two-plan example" and import actions) to the top of `.event-setup` and style them as buttons; create activity, starting flow and import stay separate controls. In `App.tsx` add an entry-atmosphere layer with full-prominence `HauntedBackdrop` for `welcome`, `new` and `templates` and a lighter backdrop dim; decorations never overlap the sentence, actions or focus rings. No tour or multi-step overlay; the example loads from the in-memory definition; the A/B/C guided demo entry stays. `Dialogs.tsx` is not edited.
    - Files: `src/i18n/messages.ts`, `src/app/App.tsx`, `src/app/styles/components.css`, `src/app/styles/layout.css`.
    - Done-check: `npm run check` exits 0.
    - _Requirements: 5.2, 26.1, 26.3, 26.4, 26.5, 26.6, 26.7, 26.8, 26.9, 35.10, 35.12_

  - [x] 15.2 Write the welcome browser spec
    - `e2e/ui/welcome.spec.ts`: at 1366×768 and 390×844 in both languages the product sentence and the "try the two-plan example" button lie fully inside the initial viewport; the three controls are separate; activating the example shows Build with the notice; no second overlay or tour step exists; the page requests nothing from another origin.
    - Files: `e2e/ui/welcome.spec.ts` (new).
    - Done-check: `npm run test:browser -- e2e/ui/welcome.spec.ts` exits 0.
    - _Requirements: 26.1, 26.2, 26.4, 26.5, 26.7, 35.6_

- [x] 16. Narrow-screen switcher, compact collapse and 44×44 hit areas
  - [x] 16.1 Add the touch-target hit-area rule
    - In `responsive.css`, at 980 px or narrower give top bar actions, mode tabs, language buttons, switcher entries, dock controls and tabs, list item actions, people rows, dialog buttons, timeline marker buttons and the speed select an effective 44×44 hit area through an `::after` expansion and `gap` and `row-gap` of `max(var(--space-3), calc(var(--touch-min) - var(--control-md)))`. Icons are not enlarged; neighbours do not overlap; no clipping, no horizontal scroll; focus order and rings are unchanged.
    - Files: `src/app/styles/responsive.css`, `src/app/styles/components.css`.
    - Done-check: `npm run build -- --base=/ghost-rehearsal/` exits 0; the spec in 16.3 passes.
    - _Requirements: 1.10, 27.9_

  - [x] 16.2 Finish the narrow switcher and compact collapse controls
    - Two Futures at 980 px or narrower: a labelled switcher (report, flow, guest journey, evidence) showing one view at a time, with the active entry marked by a visible non-color indicator and exposed pressed or selected state, and state preserved on switching. At Desktop_Compact: the plan navigator as a rail and one-click labelled collapse controls for the report and the Dock. Long tables scroll inside their own area; document width stays within the viewport in English and Chinese; long text wraps or truncates with a full accessible name.
    - Files: `src/app/App.tsx`, `src/components/CompareReport.tsx`, `src/app/styles/responsive.css`, `src/app/styles/modes.css`, `src/i18n/messages.ts`.
    - Done-check: `npm run check` and `npm run test:browser -- e2e/smoke.spec.ts` exit 0.
    - _Requirements: 27.1, 27.2, 27.3, 27.4, 27.5, 27.6, 27.7, 27.8_

  - [x] 16.3 Write the touch-target and narrow-layout browser spec
    - `e2e/ui/touch-targets.spec.ts` at 390×844 in both languages: for each listed control sample the four corners of a 44×44 box centred on it with `document.elementFromPoint` (must return the control or a child) and check adjacent control centres are at least 44 px apart; Tab order and focus rings are unchanged; the document has no horizontal scroll in Build, Rehearse, Two Futures and Journey; the switcher shows exactly one view.
    - Files: `e2e/ui/touch-targets.spec.ts` (new).
    - Done-check: `npm run test:browser -- e2e/ui/touch-targets.spec.ts` exits 0.
    - _Requirements: 1.10, 27.4, 27.5, 27.6, 27.9_

- [x] 17. Handle reduced motion (CSS, smooth scrolling, canvas animation, default-paused replay)
  - [x] 17.1 Add the motion helpers and viewport option
    - `src/features/motion.ts`: `motionDuration(reduced, ms)` and `autoplayAfterRun(reduced)` (`!reduced`). Extend `src/app/useMedia.ts` with `usePrefersReducedMotion()` (`useState`, `useEffect` and a `change` listener; `false` when `matchMedia` is missing). Add the additive `options.reduced` to `createViewportPlacement` in `src/features/viewport.ts` so every `apply` duration is 0 while reduced and the baseline values (300, 0, 0) otherwise.
    - Files: `src/features/motion.ts` (new), `src/app/useMedia.ts`, `src/features/viewport.ts`.
    - Done-check: `npm run typecheck` exits 0 and `npx vitest run tests/canvas.test.ts --environment node` exits 0.
    - _Requirements: 5.4, 28.8, 28.10, 28.11_

  - [x] 17.2 Wire reduced motion through App, Canvas, Journey and CSS
    - `App.tsx` keeps `reducedRef`; `launch` and `switchMode` call `setPlaying(autoplayAfterRun(reducedRef.current))`, so with the preference set replay is paused after a run and when a mode is entered with current results, and without it playback starts automatically as before. Play, Space and timeline scrubbing work as before. The Worker request is identical for both values. `Canvas.tsx` takes `reducedMotion` and passes `motionDuration` to every `setViewport`, `zoomTo`, `fitView` and `setCenter` call, including the zoom controls. `Journey.tsx` and any workspace scroll use non-smooth scrolling under the preference. `motion.css` disables animation, transition and `scroll-behavior: smooth`, and decorations are static. A preference change while the page is open applies without reload and does not interrupt a running replay.
    - Files: `src/app/App.tsx`, `src/components/Canvas.tsx`, `src/components/Journey.tsx`, `src/app/styles/motion.css`.
    - Done-check: `npm run check` exits 0.
    - _Requirements: 5.4, 28.8, 28.10, 28.11_

  - [x] 17.3 Write reduced-motion unit tests (Property 11; table-driven, not property-based)
    - `tests/ui-motion.test.ts`: `autoplayAfterRun` and `motionDuration` tables; the real `createViewportPlacement` with fake timers passes 0 durations when reduced and the baseline durations otherwise across placement, resize and user-move sequences. In `tests/workbench-ui.test.ts`: with the preference set playback is not playing after a run or after entering a mode with current results, manual play starts it, and results equal the not-set case; with the preference unset playback still starts automatically. A source scan fails if `setViewport(`, `zoomTo(`, `fitView(`, `setCenter(`, `scrollIntoView(`, `scrollTo(` or `duration:` appears outside the motion helper and the audited call sites.
    - **Property 11: Reduced motion changes presentation, not results**
    - **Validates: Requirements 5.4, 28.8, 28.10, 28.11**
    - Files: `tests/ui-motion.test.ts` (new), `tests/workbench-ui.test.ts`.
    - Done-check: `npm test` exits 0.
    - _Requirements: 28.8, 28.10, 28.11_

  - [x] 17.4 Write the reduced-motion browser spec
    - `e2e/ui/reduced-motion.spec.ts` with `reducedMotion: 'reduce'`: after Run the replay time stays at 0:00 for 2 seconds and Play starts it; sampled elements have `animation-name: none` and `transition-duration: 0s`; `getComputedStyle(document.documentElement).scrollBehavior` is `auto`; the canvas transform reaches its final value within one animation frame after the readable-view action; completed counts equal those of a run without the preference; without the preference playback starts automatically.
    - Files: `e2e/ui/reduced-motion.spec.ts` (new).
    - Done-check: `npm run test:browser -- e2e/ui/reduced-motion.spec.ts` exits 0.
    - _Requirements: 28.8, 28.10, 28.11, 36.12_

- [x] 18. Move bilingual copy into `src/i18n/messages.ts`
  - [x] 18.1 Migrate the remaining inline strings
    - Move every remaining `t.lang === 'zh' ? … : …` literal in `CompareReport.tsx`, `Journey.tsx` and `comparisonText.ts` into `src/i18n/messages.ts` as keys with identical shapes and placeholders in `en` and `zh`, including the statistics boundaries (cutoff versus final, all-arrived versus completed-only, run-limit versus completion, sample size). Rendered text stays the same.
    - Files: `src/components/CompareReport.tsx`, `src/components/Journey.tsx`, `src/components/comparisonText.ts`, `src/i18n/messages.ts`.
    - Done-check: `npm run check` exits 0 and `npm run test:browser -- e2e/demo/comparison.spec.ts` exits 0.
    - _Requirements: 29.1, 29.2, 29.3, 29.4_

  - [x] 18.2 Add list joining and number parity
    - Add `list.join` (", " in English, "、" in Chinese; a single item is returned unchanged) and use it wherever the UI joins items. Confirm numbers use the existing helpers with the same digits and decimals in both languages.
    - Files: `src/i18n/messages.ts`, `src/components/CompareReport.tsx`, `src/components/Journey.tsx`, `src/components/comparisonText.ts`.
    - Done-check: `npm run check` exits 0.
    - _Requirements: 29.5, 29.6_

  - [x] 18.3 Write the copy audit tests (Property 18; table-driven, not property-based)
    - `tests/ui-i18n.test.ts`: a scan of `CompareReport.tsx`, `Journey.tsx` and `comparisonText.ts` finds no `lang ===` branch and no CJK literal outside comments; tables for `list.join` and for `formatWait`, `formatPersonTime`, `formatHours` in both languages; no `side-stream:10` or `03:30` under `src/`.
    - **Property 18: Formatting parity across languages**
    - **Validates: Requirements 29.2, 29.5, 29.6, 36.8**
    - Files: `tests/ui-i18n.test.ts`.
    - Done-check: `npm test` exits 0.
    - _Requirements: 29.2, 29.5, 29.6_

- [x] 19. Accessibility pass
  - [x] 19.1 Add `LiveAnnouncer`
    - A polite region for computing, complete, stale, copied and saved, and an assertive `role="alert"` region for failed. `App.tsx` derives messages from `busy`, `lastRun`, the stale state and the existing notice function; the status-bar text stays.
    - Files: `src/components/shell/LiveAnnouncer.tsx` (new), `shell/index.ts`, `src/app/App.tsx`, `src/i18n/messages.ts`.
    - Done-check: `npm run check` exits 0.
    - _Requirements: 28.6_

  - [x] 19.2 Audit and fix names, text alternatives and hover-only information
    - Every icon-only control gets a non-empty accessible name; charts and timelines get text alternatives with the same numbers and units; no information or action is hover-only (truncated names, tooltips and the "—" explanation work by focus and touch); every focusable control shows the 2 px focus ring; menus, drawers and dialogs close only the topmost layer on Escape and return focus to their trigger, with no change to `Modal`.
    - Files: `src/components/*.tsx` (presentation and attributes only), `src/components/shell/*.tsx`, `src/app/styles/base.css`, `src/i18n/messages.ts`.
    - Done-check: `npm run check` exits 0 with the icon-only-name scan in `tests/ui-shell.test.ts` passing.
    - _Requirements: 2.6, 28.1, 28.4, 28.5, 28.7, 28.9_

  - [x] 19.3 Write the accessibility browser spec
    - `e2e/ui/accessibility.spec.ts`: keyboard-only play and pause, scrub, speed change, guest selection, group filtering, divergence jump, and opening and closing every panel and menu; Escape closes the menu before the dialog and focus returns to the trigger; the live region is polite for a completed run and assertive for a forced failure; every interactive control reached by Tab in drawers and dialogs shows a visible focus indicator.
    - Files: `e2e/ui/accessibility.spec.ts` (new).
    - Done-check: `npm run test:browser -- e2e/ui/accessibility.spec.ts` exits 0.
    - _Requirements: 28.1, 28.2, 28.3, 28.4, 28.5, 28.6, 36.12_

- [ ] 20. Wrap Inspector sections (late, layout only)
  - [x] 20.1 Re-check the Inspector coordination before editing
    - Run `git fetch` and compare `src/components/Inspector.tsx` and the form components with `origin/kiro/dialog-form-reliability` and `origin/kiro/release-integration` again; update `docs/reviews/ui-visual-polish/interface-notes.md` with the result. If task B changed the same lines, keep B's markup and re-wrap it. If the files cannot be reconciled, record the minimal interface requirement and skip 20.2 instead of overwriting.
    - Files: `docs/reviews/ui-visual-polish/interface-notes.md`.
    - Done-check: the notes list the compared commit hashes and the decision (proceed or skip) with the reason.
    - _Requirements: 35.10, 35.11, 35.12_

  - [ ] 20.2 Add the Inspector header and `InspectorSection` — deferred pending task B integration
    - `InspectorSection.tsx` wraps the existing groups in `<details>` collapsed by default, operable by pointer, Enter and Space. Inspector order: node name, core behavior, common parameters, then advanced sections. The header shows the node's type icon, name and plan. Layout only: no change to fields, `NumberInput`, draft and commit timing, validation display or undo behavior; after undo and redo the same node stays selected and the Inspector stays open.
    - Files: `src/components/shell/InspectorSection.tsx` (new), `shell/index.ts`, `src/components/Inspector.tsx` (layout only), `src/app/styles/components.css`, `src/i18n/messages.ts`.
    - Done-check: `npm run check` exits 0 and `git diff -- src/components/Inspector.tsx` shows no change in field, `NumberInput` or validation logic.
    - _Requirements: 10.1, 10.2, 10.3, 10.5, 10.6, 10.10, 35.12_

- [x] 21. Checkpoint - Ensure all tests pass
  - Run `npm run check` and `npm run test:browser`. Ensure all tests pass, ask the user if questions arise.

- [x] 22. Verify the whole overhaul (required)
  - [x] 22.1 Write the layout and acceptance browser specs
    - `e2e/ui/layout.spec.ts` at 1366×768 and 390×844 in both languages for Build, Rehearse, Two Futures and the Journey: `scrollWidth` at most `innerWidth`; canvas height at least 40 % of the viewport with the Dock open; snapshot rows inside the first report viewport; minimap, controls, tools and pane label do not intersect any `.card-name` or `.card-detail` in the readable view; the page makes no request to another origin; no clipped text without a full-text accessible name; no untranslated text from the other language.
    - `e2e/ui/acceptance.spec.ts` on the real Example_Project, covering Requirement 36.5 to 36.13: Build edit, undo and redo with the same node selected and the viewport unchanged; a real rehearsal (run, play, pause, drag, switch stages, track a guest) with consistent replay time, live counts and tracked station and a replay time that stays put for 2 seconds after pause; Two Futures reading in report order; `side-stream:10` first divergence at 03:30 (A queueing, B serving) and the jump; scope switching with no rerun; stale versus layout-only edits; the guest round trip keeping plans, scope, threshold, group filter and guest; the stopped, failed, stale and run-limit states, each with a marker, one sentence and one action and no current comparison value.
    - Files: `e2e/ui/layout.spec.ts`, `e2e/ui/acceptance.spec.ts` (new).
    - Done-check: `npm run test:browser -- e2e/ui/layout.spec.ts e2e/ui/acceptance.spec.ts` exits 0, or each failing step is recorded as "failed" with the observed result.
    - _Requirements: 8.7, 17.1, 27.1, 27.2, 27.6, 35.6, 36.5, 36.6, 36.7, 36.8, 36.9, 36.10, 36.11, 36.12, 36.13, 36.14_

  - [x] 22.2 Run the typecheck and unit tests
    - Run `npm run check` exactly as typed. Record the command, exit code and Vitest test and file counts in `docs/reviews/ui-visual-polish/verification.md`. List each failure and whether it is also under "Pre-existing failures" in the baseline record.
    - Files: `docs/reviews/ui-visual-polish/verification.md` (new).
    - Done-check: the file has a row with the real exit code; the command exited 0 or the failure is recorded as failed.
    - _Requirements: 35.4, 36.1_

  - [x] 22.3 Run the production build and whitespace check
    - Run `npm run build -- --base=/ghost-rehearsal/` and `git diff --check` exactly as typed and record exit codes. Inspect `dist/assets/*.css` for the layer statement and surviving `color-mix` output. Run `git diff --stat 40dc58deb073450f10b4d0aa64a79c22dc19d17f -- src/simulation src/schemas src/features/analysis.ts src/features/project.ts` and record that it is empty. Confirm the Example_Project input and scenario keys equal the baseline (`tests/example.test.ts` and `tests/fingerprint.test.ts` pass unchanged).
    - Files: `docs/reviews/ui-visual-polish/verification.md`.
    - Done-check: both commands exit 0 and the frozen-file diff is empty, or the deviation is recorded.
    - _Requirements: 35.2, 35.4, 35.6, 36.1_

  - [x] 22.4 Run the browser tests against the production build with the real Worker
    - Run `npm run test:browser` exactly as typed (the Playwright web server builds and previews the production bundle; no mocked Worker). Record exit code and the passed, failed and skipped counts. Copy `test-results/browser-results.json` to `docs/reviews/ui-visual-polish/after-browser-results.json`. Compare with the baseline results and list tests that now fail but passed at the baseline separately from pre-existing failures. If the 600-second global timeout is hit, record that and rerun by directory (`e2e/smoke.spec.ts`, `e2e/demo/`, `e2e/ui/`), recording each command.
    - Files: `docs/reviews/ui-visual-polish/verification.md`, `docs/reviews/ui-visual-polish/after-browser-results.json` (new).
    - Done-check: the verification file lists the command, exit code and counts from the actual run.
    - _Requirements: 36.2, 36.15_

  - [x] 22.5 Check the verification matrix
    - Using the specs from 22.1 and the earlier `e2e/ui` specs, plus real interaction where no automated step exists, check at 1366×768 and 390×844, with normal motion and with reduced motion, in English and Chinese: the overview, the guest journey, the canvas, the A/B/C guide (existing `e2e/demo/comparison.spec.ts`) and export (comparison export enabled only while Comparison_Ready; project export then import restores nodes, edges, stages, parameters and positions). Record each combination as passed, failed or not run with the observed result. Do not report the overhaul as accepted if any step failed or was not run.
    - Files: `docs/reviews/ui-visual-polish/verification.md`.
    - Done-check: the matrix has one row per viewport, motion setting, language and path, each with a real result; no cell is blank.
    - _Requirements: 11.3, 36.12, 36.14, 36.15_

  - [x] 22.6 Capture the "after" screenshots of the same states
    - Run `CAPTURE=after npm run test:browser -- e2e/ui/capture.spec.ts`. Confirm every image in `before/` has an `after/` image with the same screen, viewport and language. Update `docs/reviews/ui-visual-polish/README.md` with before and after pairs and list any missing image with its reason. Color, spacing and typography are accepted through these pairs and real interaction, not pixel assertions.
    - Files: `docs/reviews/ui-visual-polish/after/*.png` (new), `docs/reviews/ui-visual-polish/README.md`.
    - Done-check: the capture command exits 0 and each before image has an after image, or the README lists the missing one by screen, viewport, language and reason.
    - _Requirements: 36.3, 37.4, 37.11_

  - [x] 22.7 Confirm test contracts, coverage and expectations
    - Run `git diff 40dc58deb073450f10b4d0aa64a79c22dc19d17f -- tests e2e` and confirm: no test file or case is deleted, no real statistical expectation is edited, no assertion is loosened, `e2e/smoke.spec.ts` and `e2e/demo/comparison.spec.ts` pass; list every selector change with the reason. Confirm the test contract classes still exist in the rendered output (`.outcome-table`, `.people-stats`, `.people-list`, `.people-result`, `.ghost-id`, `.diff-note`, `.bin-count`, `.evidence-card`, `.pair-groups`, `.resource-comparison`, `.report-plans`, `.comparison-identities`, `.statistics-scope`, `.journey-header`, `.ghost-stories`, `.workspace-menu`). Confirm `git diff -- src/components/Dialogs.tsx` is empty and that `Inspector.tsx` changes are layout only.
    - Files: `docs/reviews/ui-visual-polish/verification.md`.
    - Done-check: the verification file lists the diff summary, each selector change with its reason, and "no deleted coverage / no loosened assertions" only if the diff shows it.
    - _Requirements: 4.5, 35.12, 36.15_

- [ ] 23. Deliver the work
  - [x] 23.1 Write the delivery report
    - Write `docs/reviews/ui-visual-polish.md` with: branch name; a table of changed files with a one-sentence change each; design notes; every verification command as typed with its real exit status and pass, fail and skip counts (linking `verification.md` and `baseline-checks.md`); pre-existing failures separate from new ones; the statement that property checks are table-driven and "not property-based" because `fast-check` was not added; the 12-screenshot set (plus the extra captures) and any missing image with reason; local run and review steps as a numbered list from a fresh checkout (install, start, test, open each of the six screens, each with its observable result); minimal interface notes for other tasks; remaining issues and known limitations or "no remaining issues". Any business-logic problem found outside scope is reported with cause, impact and verification scope, with no fix included.
    - Files: `docs/reviews/ui-visual-polish.md` (new).
    - Done-check: every row of the report matches a recorded result; `git diff --check` exits 0.
    - _Requirements: 35.3, 35.5, 36.1, 36.2, 37.3, 37.4, 37.5, 37.11_

  - [x] 23.2 Record this round's Kiro contribution
    - Add `docs/kiro/ui-visual-polish-usage.md` following `docs/kiro/comparison-demo-usage.md`: name each Kiro feature actually used this round, list files changed with Kiro's help, state each verification result with its real outcome, mark each item's evidence "exported" or "pending", and keep this round's Kiro work separate from earlier manual and Codex work. Append a new dated section at the end of `KIRO_USAGE.md` (append only; earlier text and history are not rewritten); keep any genuine entry the Stop Hook already appended and report it. Do not attribute Codex or manual work to Kiro, and do not claim that a Hook ran unless a recorded Hook execution output from this round exists. Mark every unexported session export or screenshot as "pending"; raw exports belong in the ignored `kiro-evidence/` directory.
    - Files: `docs/kiro/ui-visual-polish-usage.md` (new), `KIRO_USAGE.md` (append only).
    - Done-check: `git diff -- KIRO_USAGE.md` shows only added lines at the end; the usage note marks unexported items "pending".
    - _Requirements: 37.6, 37.7, 37.8_

  - [x] 23.3 Commit in small logical commits and push the branch
    - Review `git log` on `kiro/ui-visual-polish`: one commit per top-level task or logical extraction (baseline evidence, styles, shared components, shell, canvas, Rehearse, Two Futures, arrangement, Journey, run states, first run, narrow and touch, reduced motion, copy, accessibility, Inspector wrapper, specs, evidence, docs). Stage files by name. Do not include the untracked `.kiro/specs/rehearsal-studio-ui/` files unless the user approves, and do not touch files that had uncommitted changes before the work began. Never commit to `main` and never force-push. Run `git push -u origin kiro/ui-visual-polish`.
    - Done-check: `git branch --show-current` prints `kiro/ui-visual-polish`; `git status` shows no staged leftovers; the push exits 0; `git log origin/main..HEAD` shows no commit authored on `main`.
    - _Requirements: 37.1, 37.9, 37.10_

  - [ ] 23.4 Open the Draft PR into `kiro/release-integration`
    - Create a Draft PR from `kiro/ui-visual-polish` targeting `kiro/release-integration` (not `main`). The description states the dependency on PR #3 (task A) and the shared files touched (`App.tsx`, the split `styles.css`, `messages.ts`, `CompareReport.tsx`, `Journey.tsx`, `comparisonText.ts`, `Results.tsx`, `Inspector.tsx`), links `docs/reviews/ui-visual-polish.md`, summarises the verification results with real counts and "not run" items, lists the screenshots, unfinished items and known limitations, and states that the merge into `main` happens with the other tasks at the end of the release. Merge nothing. After PR #3 merges into the integration branch, sync by merging the integration branch into this branch (no rebase, no force-push) and re-run `npm run check`.
    - Done-check: `gh pr view --json isDraft,baseRefName` reports `isDraft: true` and `baseRefName: kiro/release-integration`; the PR body contains the dependency statement.
    - _Requirements: 37.3, 37.9, 35.11_

- [ ] 24. Record unresolved decisions in the delivery notes
  - [ ] 24.1 Record unresolved decisions in the delivery notes
    - Add an "Unresolved decisions" section to `docs/reviews/ui-visual-polish.md` and to the Draft PR description, phrased as questions for the user, with no code and no implementation work: (1) Should the people-list page number, search text, group filter and overview scroll position be retained when returning from the Visitor_Journey? (Not added this round; Requirement 35.13.) (2) Should each Two Futures canvas get its own "edit this plan" action (Requirements 19.8, 19.9, 34.2)? Only a "Read-only" text chip was added. (3) Should Inspector field-level validation messages and undo granularity (Requirements 10.4, 10.9, 10.10) be changed? They belong to `kiro/dialog-form-reliability` and were not touched. Also note that `fast-check` was not added and the property checks are table-driven example tests. Commit and push this change as its own small commit; update the PR with `gh pr edit`; present the three questions to the user.
    - Files: `docs/reviews/ui-visual-polish.md`.
    - Done-check: the report and the PR body contain the three questions; `git diff --check` exits 0; the push exits 0.
    - _Requirements: 35.13, 37.3_

## Notes

- Tasks marked with `*` are optional supplementary tests and can be skipped for a faster MVP. The behavior tests for reduced-motion default-paused, arrangement, jump-to-divergence, scope switching, stale versus layout-only and replay scrubbing are required and not marked optional.
- Each task references requirement numbers for traceability. Checkpoints ensure incremental validation.
- Property-style tests are table-driven example tests in the existing Vitest setup and are not property-based; no dependency is added.
- Verification and delivery tasks (22 to 24) are required. A step that fails or is not run is recorded as such, and the overhaul is not reported as accepted in that case.
- Implementation continued in Codex under the user's instruction; Kiro's task-status tool was not available. These checkboxes record repository evidence and do not claim a Kiro task execution or Hook run.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2"] },
    { "id": 2, "tasks": ["1.3"] },
    { "id": 3, "tasks": ["2.1"] },
    { "id": 4, "tasks": ["2.2"] },
    { "id": 5, "tasks": ["2.3"] },
    { "id": 6, "tasks": ["2.4"] },
    { "id": 7, "tasks": ["2.5"] },
    { "id": 8, "tasks": ["3.1"] },
    { "id": 9, "tasks": ["3.2"] },
    { "id": 10, "tasks": ["3.3"] },
    { "id": 11, "tasks": ["3.4", "3.5"] },
    { "id": 12, "tasks": ["5.1"] },
    { "id": 13, "tasks": ["5.2"] },
    { "id": 14, "tasks": ["5.3", "6.1"] },
    { "id": 15, "tasks": ["6.2", "7.1"] },
    { "id": 16, "tasks": ["7.2"] },
    { "id": 17, "tasks": ["7.3"] },
    { "id": 18, "tasks": ["7.4", "7.5"] },
    { "id": 19, "tasks": ["9.1"] },
    { "id": 20, "tasks": ["9.2"] },
    { "id": 21, "tasks": ["10.1"] },
    { "id": 22, "tasks": ["10.2"] },
    { "id": 23, "tasks": ["10.3"] },
    { "id": 24, "tasks": ["10.4"] },
    { "id": 25, "tasks": ["10.5", "10.6"] },
    { "id": 26, "tasks": ["11.1"] },
    { "id": 27, "tasks": ["11.2"] },
    { "id": 28, "tasks": ["11.3"] },
    { "id": 29, "tasks": ["11.4"] },
    { "id": 30, "tasks": ["11.5"] },
    { "id": 31, "tasks": ["11.6", "11.7"] },
    { "id": 32, "tasks": ["12.1"] },
    { "id": 33, "tasks": ["12.2"] },
    { "id": 34, "tasks": ["12.3", "12.4"] },
    { "id": 35, "tasks": ["13.1"] },
    { "id": 36, "tasks": ["13.2"] },
    { "id": 37, "tasks": ["13.3"] },
    { "id": 38, "tasks": ["13.4", "13.5"] },
    { "id": 39, "tasks": ["14.1"] },
    { "id": 40, "tasks": ["14.2"] },
    { "id": 41, "tasks": ["14.3", "14.4"] },
    { "id": 42, "tasks": ["15.1"] },
    { "id": 43, "tasks": ["15.2", "16.1"] },
    { "id": 44, "tasks": ["16.2", "17.1"] },
    { "id": 45, "tasks": ["16.3", "17.2"] },
    { "id": 46, "tasks": ["17.3", "17.4"] },
    { "id": 47, "tasks": ["18.1"] },
    { "id": 48, "tasks": ["18.2"] },
    { "id": 49, "tasks": ["18.3"] },
    { "id": 50, "tasks": ["19.1"] },
    { "id": 51, "tasks": ["19.2"] },
    { "id": 52, "tasks": ["19.3"] },
    { "id": 53, "tasks": ["20.1"] },
    { "id": 54, "tasks": ["20.2"] },
    { "id": 55, "tasks": ["22.1"] },
    { "id": 56, "tasks": ["22.2"] },
    { "id": 57, "tasks": ["22.3"] },
    { "id": 58, "tasks": ["22.4"] },
    { "id": 59, "tasks": ["22.5"] },
    { "id": 60, "tasks": ["22.6"] },
    { "id": 61, "tasks": ["22.7"] },
    { "id": 62, "tasks": ["23.1"] },
    { "id": 63, "tasks": ["23.2"] },
    { "id": 64, "tasks": ["23.3"] },
    { "id": 65, "tasks": ["23.4"] },
    { "id": 66, "tasks": ["24.1"] }
  ]
}
```
