# B: Dialog and form reliability — implementation review

Implementation: `094e9e5`; additional keyboard coverage: `bd446f7`. Status: module available for independent review; A0 integration remains pending. This is not final release acceptance.

Delivery: [Draft PR #5](https://github.com/kanzaler123/ghost-rehearsal/pull/5), `kiro/dialog-form-reliability` → `kiro/release-integration`. Evidence commit: `57379c9`. Awaiting independent review.

## Reproduction

Runtime baseline `ca28c07`, tested with A0 infrastructure `9462cc9`, Chromium on Windows, English, at 390×568, 390×844 and 1280×720. The initial 9 browser cases failed as expected: the import error was painted beneath the welcome modal; one Escape dismissed both; clearing Guests restored 100; arrow keys did not activate the second resource tab and no associated panel existed. [Raw baseline results](dialog-form-reliability/baseline-results.json), [stack screenshot](dialog-form-reliability/baseline-stack-390x568.png), [stack trace](dialog-form-reliability/baseline-stack-trace.zip).

The footer geometry check alone did not fail: browser focus scrolled the old outer modal until Create was visible. Visual inspection found that this clipped the title and close control. The final regression additionally checks that the heading remains visible when the footer is focused. [Baseline footer screenshot](dialog-form-reliability/baseline-footer-390x568.png).

## Implementation and interfaces

- `Dialogs.tsx`: native modal top layer, portal, one-layer Escape, keyboard isolation, form submission, persistent resource panels and automatic roving tabs. JSON content/errors share the scrollable body.
- `Inspector.tsx`: compatible Field/NumberInput/MinuteInput exports, optional numeric inputs, entity-keyed fields and fieldset/legend checkbox groups.
- `src/components/forms/`: local focus lifecycle, numeric parsing/drafts, error translations and scoped styles. No App, Canvas, comparison, global messages/styles, dependency/lock or CI edits.
- `tests/forms-number.test.ts`: finite/partial numbers, inclusive limits, integer/decimal steps, optional blank versus zero and minute conversion.
- `e2e/forms/`: real UI paths at each required viewport in both languages, plus workbench shortcut isolation and hidden-trigger focus fallback. These use A0's existing runner; viewport overrides are local to B's cases.

Numbers commit on blur or Enter. Enter commits a field without submitting the form. Invalid drafts remain visible, have linked local errors and block submission. Numeric external changes and Inspector entity changes reset drafts. Optional blanks remain unset; 1.5 minutes emits 90 seconds. The minute step is 0.0001, matching the existing four-decimal display and millisecond conversion, rather than enforcing the old 0.1 step against finer existing values.

Both resource panels remain mounted. Arrow keys, Home and End activate a tab immediately; only the active tab is in the Tab sequence. Apply reveals/focuses an invalid field in a hidden panel. Cancel/Escape discard drafts; one Undo after Apply is checked against the pre-edit value.

## Validation environment and dependency

B is based on the existing remote `kiro/dialog-form-reliability` at `ca28c07`. A0 [PR #4](https://github.com/kanzaler123/ghost-rehearsal/pull/4) is still an unmerged Draft. No unreviewed infrastructure was merged into the integration branch or B.

To validate now, the separate `ghost-rehearsal-forms-browser` worktree uses A0 `9462cc9` with B's exact source, unit test and browser test files overlaid. `git diff --no-index` verified the source/test copies match B. Node 24.18.0, npm 11.16.0, Playwright 1.65.1, Windows. The only local config difference is port 4178 → 4183, since 4178 belongs to another running checkout; the build, `/ghost-rehearsal/` subpath, projects, discovery, retries and reporters are unchanged. This local port override is not committed.

- B standalone: TypeScript passed; `npx vitest run tests --environment node` passed 278/278 tests in 13 files; `npm run build -- --base=/ghost-rehearsal/` and `git diff --check` passed. The existing large-chunk warning remains.
- B standalone `npm run check` was attempted and failed because the pre-A0 Vitest discovery includes `e2e/`, while `@playwright/test` is not yet in its dependency set. The 278 unit tests passed in that run. This is an explicit integration dependency, not a claimed passing standalone check.
- B + A0: `npm run check` passed both TypeScript checks and all 278 tests. Separate TypeScript checking of B's browser file passed.
- The first repaired reproduction run passed 9/9. During expanded case authoring, two locators were corrected (hidden panel selection and an implicit select label); the affected two cases then passed. Product assertions were retained.
- `npm run test:browser -- e2e/forms/reliability.spec.ts e2e/smoke.spec.ts --project=desktop-en --project=desktop-zh --trace=on`: **38/38 passed**, 238.749 seconds, zero retries/skips/flaky cases/global errors. This covers 36 B cases (6 workflows × 3 viewports × 2 languages) plus 2 public production-Worker smoke cases. [Raw results](dialog-form-reliability/browser-results.json).
- `npm run test:browser -- e2e/forms/keyboard.spec.ts --project=desktop-en --project=desktop-zh --trace=on`: **6/6 passed**, covering all three viewports in both languages. Ctrl+Z/Ctrl+S leave the workbench data/save state unchanged while an import error is open; attempted background focus stays in the modal; closing restores a visible control after the menu trigger is hidden. [Raw results](dialog-form-reliability/keyboard-results.json), [successful EN trace](dialog-form-reliability/keyboard-en-trace.zip).

Together the two final browser runs passed **44/44 cases** with no retries or skips. Runtime source is `094e9e5`; the supplementary test is `bd446f7`. Later delivery commits update documentation/evidence only.

## Browser evidence and visual inspection

Codex inspected the actual PNGs below. In both languages the import error owns focus above the welcome dialog; the first Escape restores Import and the second closes welcome. On the shortest viewport, focusing Create/Apply preserves the title and close button while the content scrolls. Long JSON errors wrap and remain inside the content scroll area; Close and Check & apply remain visible and are exercised by keyboard and pointer.

| Viewport | English long-error footer | Chinese long-error footer |
| --- | --- | --- |
| 390×568 | [PNG](dialog-form-reliability/json-error-footer-390x568-en.png) | [PNG](dialog-form-reliability/json-error-footer-390x568-zh.png) |
| 390×844 | [PNG](dialog-form-reliability/json-error-footer-390x844-en.png) | [PNG](dialog-form-reliability/json-error-footer-390x844-zh.png) |
| 1280×720 | [PNG](dialog-form-reliability/json-error-footer-1280x720-en.png) | [PNG](dialog-form-reliability/json-error-footer-1280x720-zh.png) |

At 390×568: import [EN](dialog-form-reliability/import-stack-390x568-en.png) / [ZH](dialog-form-reliability/import-stack-390x568-zh.png); numeric error and Create [EN](dialog-form-reliability/event-footer-390x568-en.png) / [ZH](dialog-form-reliability/event-footer-390x568-zh.png); scenario Apply [EN](dialog-form-reliability/scenario-footer-390x568-en.png) / [ZH](dialog-form-reliability/scenario-footer-390x568-zh.png).

Replayable successful traces: [Inspector decimals, Undo, entity switching and checkbox groups (EN)](dialog-form-reliability/inspector-en-trace.zip), [resource tabs, hidden invalid drafts, deletion focus, Cancel and single Apply (ZH)](dialog-form-reliability/resources-zh-trace.zip). Open with `npx playwright show-trace <file>`.

The fixtures are synthetic examples, not real-event evidence. No human review or physical-device/cross-browser certification has been performed. A separate Chrome DevTools interactive check stalled at accessibility-tree retrieval; it is not counted as successful validation. Real Chromium Playwright paths and inspected screenshots are the acceptance evidence. Existing raw JSON schema errors can remain English in the Chinese UI; the shared schema-message translation is unchanged, while all new numeric errors are bilingual.

## Integration / reviewer follow-up

1. Review and integrate A0, then merge `kiro/release-integration` into B and rerun the standard commands directly in B.
2. Independently review modal lifecycle, numeric commit rules, keyboard navigation and the evidence below before merging B.
3. E owns D-component insertion, main-workspace composition and final release acceptance. B imports no unfinished D module.
