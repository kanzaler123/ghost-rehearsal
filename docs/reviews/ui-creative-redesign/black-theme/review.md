# Black theme and navigation corrections

Date: 2026-11-16, Asia/Singapore. Baseline: `29264dd615374de22d0ea8990ff8e37427ba7614`. Application commits: `be3f57dddfe835b460c7d08fd2cc9f115528cd40`, menu-focus correction `761ba14`, and long-name sizing correction `4823bf2` on `feat/ui-creative-redesign`.

The owner reported cramped plan cards, an overlapping second-plan hint, an event title that could not be clicked to edit, a disliked green palette, and an awkward minimap overlapping React Flow attribution. The owner clarified that the moon should remain with bats on it.

## Changes

- Neutral black/charcoal surfaces and neutral text replace the green palette. The existing A/B and result colours keep their meanings.
- Plan metadata and the B hint have explicit spacing. The event title opens the existing event editor; the adjacent arrow retains native event selection. Clicking the current plan in Build opens the existing rename dialog; choosing other plans and non-editing selection keep their existing behavior. Existing save, validation, cancellation and undo operations are reused.
- Menu-button mouse-down keeps focus in the menu until click completes. A WebKit check found that clicking New Event otherwise blurred the summary to the document body, closing the menu before mouse-up and losing the requested action. Keyboard dismissal and focus restoration remain unchanged.
- The event section can shrink inside the mobile grid. The long English example name otherwise expanded a 390 px page to 414 px; a DOM measurement confirmed that the correction restores 390 px, with the name ellipsized.
- A grey moon with three existing vector bats replaces the yellow moon styling. The artwork remains decorative and does not animate.
- The minimap has an opaque black background, a restrained 4 px corner radius and thin border, and sits above attribution. At the screenshot viewport its bottom is 851 CSS px and attribution starts at 864.609 CSS px: 13.609 px clearance. Empty plans do not render an empty minimap. Corner decorations no longer show through the navigation area.

No simulation, Worker, schema, persistence, dependency or existing test-infrastructure changes. No external image service was required: the bat SVG already belongs to this repository. All changes and checks in this correction were performed by Codex. The pre-existing README draft remains untouched.

## Evidence

- [English blank event](blank-en.png), [Chinese blank event](blank-zh.png).
- [English workbench](workbench-en.png), [Chinese workbench](workbench-zh.png), [minimap detail](minimap.png).
- [Capture metadata](captures.json): 1704×916 CSS pixels, device scale 1.5, matching the density of the supplied screenshot.
- The interface change log records the event-title role change and direct plan-renaming entry. Exported props, state ownership and storage keys are unchanged.

## Verification

The check and build are rerun after the final sizing correction. The desktop screenshots precede the menu-focus and mobile sizing corrections; their rendering is unchanged.

- `npm run check`: exit 0; 464 tests in 33 files passed, with both TypeScript checks. [Log](check.log).
- `npm run build -- --base=/ghost-rehearsal/`: exit 0. The existing chunk-size advisory remains. [Log](build.log).
- Initial targeted Chromium checks at `be3f57d`: exit 0; 32 passed, no skipped, failed or flaky tests, 138.408 seconds. They cover direct event/plan editing, undo, cancel, native event switching, blank-state spacing at widths 320/390/768/1440/1704, minimap clearance, keyboard access, contrast and touch targets, in both languages. [Log](browser-targeted.log), [JSON](browser-targeted.json).
- The first focused WebKit run exposed the menu-focus defect in both English projects (two failed, two incomplete). It and the concurrent full Chromium run (33 passed, 279 incomplete) were interrupted to correct the defect; neither interrupted run counts as acceptance. Partial logs: [WebKit](webkit-initial.log), [Chromium](browser-full-initial.log). No complete JSON result was emitted. No timeout or assertion was relaxed.
- Focused WebKit rerun at `761ba14`: exit 0; all four desktop/mobile and English/Chinese projects passed in 1.4 minutes, including actual menu clicks, event switching, direct name editing and minimap clearance. [Log](webkit-after-menu.log).
- Full Chromium run at `761ba14`: exit 1 after the unchanged 600-second limit; 218 passed, two failed, three optional captures skipped, 89 not run, and two global timeout/teardown errors. Both failures were the existing mobile-English layout cases, exposing the long-name overflow above. They were not relaxed; the new navigation case now also uses the long English example name. [Log](browser-full.log), [JSON](browser-full.json).
- Final focused WebKit at `4823bf2`: all four projects passed in 35.8 seconds, exit 0. The long English activity name is now checked at every tested width in both languages. [Log](webkit.log).
- Final Chromium shard 1/2 at `4823bf2`: exit 0, 154 passed and two optional captures skipped; no failed, flaky or incomplete tests and no global errors, 247.677 seconds. Both previously failing mobile-English layout cases now pass. [Log](browser-shard-1-of-2.log), [JSON](browser-shard-1-of-2.json).
- Final Chromium shard 2/2 at `4823bf2`: exit 0, 154 passed and two optional captures skipped; no failed, flaky or incomplete tests and no global errors, 414.710 seconds. [Log](browser-shard-2-of-2.log), [JSON](browser-shard-2-of-2.json).

The two final shards cover all 312 cases: 308 passed and four skipped, one optional `e2e/ui/capture.spec.ts` per project. Each of the desktop/mobile and English/Chinese projects contains 78 cases. Automatic retries remain disabled, and existing timeouts and infrastructure settings are unchanged. Together with the final check/build and focused WebKit run, these certify the corrections above; earlier green-theme counts are not used as evidence for this version.

The application and test trees were checked against `4823bf2dbf06521d64152bbfe4cd9004a7c5adfe` before the records-only handoff. The local production preview returned HTTP 200. README's pre-existing draft remains unchanged.

The new regression is `e2e/ui/navigation-refinement.spec.ts`. Existing assertion changes are only the explicitly requested surface colours in `tests/ui-styles.test.ts` and `e2e/robustness/theme.spec.ts`; behavioral and quality thresholds are preserved.
