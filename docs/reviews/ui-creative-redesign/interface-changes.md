# Integration interface changes

Baseline: `f8371999e64d25c250699e5cd96f85eabb79bb32`. Work branch: `feat/ui-creative-redesign`.

## Exported interfaces

| Module | Before → after | Reason |
|---|---|---|
| `src/components/Dialogs.tsx` | `EventCreator` adds optional `onGuide?: () => void` and required `onLang: (lang: Lang) => void`; all previous props preserved | Welcome guide and language entry use the existing App actions; the New Event form remains unchanged in function |
| `src/components/shell/TopBar.tsx` | `TopBarProps` adds required `planChecks: string[]` | Display the actual target plans and separate error/notice counts beside run scope |
| `src/i18n/messages.ts` | `Messages`/`MESSAGES` add `redesign` strings and formatter, `legend.moving`, `legend.left`; `legend.done` now means completed only | Equal English/Chinese meaning for the new presentation |
| `src/components/Canvas.tsx` | `TYPE_COLORS` signature unchanged; values now CSS semantic colour references | Edges and minimap share the palette; consumers must not append hexadecimal alpha suffixes |

No exported function was removed, renamed or moved. No App state, reducer, ref or context value changed owner, name or type. The guide increments the existing `projectRead` generation and clears obsolete import errors. `GuidedDemo` adds a local element ref for focus; Canvas has a private population field for proportional queue bars. No new browser-storage key, project field, Worker message or computational helper.

## Entry and locator mapping

| Capability | Baseline entry | Delivered entry |
|---|---|---|
| Guide | Build footer / comparison toolbar: **Start the A/B/C guide / 开始 A/B/C 引导** | Both retained; welcome adds **Follow a guest through A/B / 跟随一位访客，比较 A / B** with initial focus |
| Run scope | More options → **Run scope / 运行范围** | Permanently visible strip below the toolbar, same accessible label and values |
| Canvas legend | Static text, hidden on narrow screens | Keyboard-operable disclosure in replay controls; completed and early departure are separate; existing legend name retained |
| Welcome language | Header behind modal | Language controls additionally available inside welcome; same EN/中文 labels |
| Create / demo / import | EventCreator setup form and its secondary buttons | Same controls, names and data effects; welcome groups the form beside an introduction |
| Activity name | Name shown inside the native **Active event / 当前活动** select | The visible name is now a button opening existing **Event settings / 活动设置**. An adjacent native select retains the original accessible name, values and switching action. |
| Current plan in Build | Clicking the selected plan repeated selection; rename available in its menu | Clicking the selected card now opens existing **Rename plan / 重命名方案**. Other cards still select plans; Rehearse/Compare selection is unchanged. |

Existing roles are retained except the static legend becomes native `details`/`summary` with a note inside. No baseline test locator was removed. Theme tests update only the selected surface RGB values. `tests/ui-shell.test.ts` supplies the new display prop; `tests/canvas.test.ts` supplies the newly consumed population on its partial run fixture; no assertion is weakened. The six-result equivalence test is additional.

## Ownership exceptions

- `src/i18n/messages.ts`: bilingual presentation copy and labels; permitted by requirement 22.8.
- `tests/ui-styles.test.ts`, `e2e/robustness/theme.spec.ts`: exact palette expectations now match Ghostlight, with contrast and accessibility thresholds unchanged.
- `tests/ui-shell.test.ts`, `tests/canvas.test.ts`: fixture inputs for changed presentation interfaces.
- `tests/ui-redesign-equivalence.test.ts`, `e2e/ui/creative-redesign.spec.ts`: required computational freeze and new-interface regressions.
- All existing infrastructure, package manifests, schemas, simulation code, analysis, stage geometry and persistence protocols remain unchanged.

## Other work and overlap

GitHub inspection on 2026-11-16 found that all three PRs called drafts in the requirements had already been merged at 21:03 UTC+8. That historical description is stale. This work neither merged them nor adopted their commits; the required original baseline is retained.

Paths below were obtained with `git diff --name-only --no-renames f837199...<head>` and intersected with this branch's changes:

| PR and inspected head | Shared file | Redesign / other work |
|---|---|---|
| #19 `9a52d300b62d0f8519706d0d1b70077e7e53b779` | None | Browser/CI diagnostics remain independent |
| #32 `6eb2f8279176dca7ad6dc3bba8b2b8e4c19d1334` | `src/app/App.tsx` | Guide entry and read invalidation / welcome guide wiring |
| #32 | `src/app/styles/components.css` | Entire visual system and entry layout / welcome CTA sizing |
| #32 | `src/components/Dialogs.tsx` | Editorial welcome with form / guide button in existing welcome |
| #32 | `src/i18n/messages.ts` | New introduction, guide CTA and legend / welcome guide copy |
| #33 `634d1eecaddf8f06810699a70ea70374154e13d5` | `src/app/App.tsx` | Visible run context, guide and selection / freshness and render-cost changes |
| #33 | `src/components/Canvas.tsx` | Population bars, guest glyphs, readability and focus / stable stage and selection handlers |
| #33 | `tests/canvas.test.ts` | Partial run fixture population / stable-render regressions |

Integration must preserve #33's performance changes without replacing the frozen calculations here. The welcome flow independently preserves #32's goals (native guide button, initial focus, target size, superseded reads); the copy and two-column layout differ. Browser-specific focus validation is recorded in verification.md. No inference of Safari certification is made from Chromium.
