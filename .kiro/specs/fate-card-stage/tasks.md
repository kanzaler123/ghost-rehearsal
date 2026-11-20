# Fate card stage: tasks
Boundaries: see `requirements.md` 10–16. No edits to `src/simulation/**`, `src/schemas/**`, `examples/open-house.json`, `src/components/shell/TopBar.tsx` or `tests/ui-redesign-equivalence.test.ts`. No `git commit` or `git push`.

- [x] 1. Write `requirements.md`, `design.md` and this file before any implementation.
- [x] 2. `src/features/fateCard.ts`: `fateCardPngFilename`, `renderFateCardPngBlob`, `saveBlob`.
- [x] 3. `src/i18n/messages.ts`: new `t.encore.fateCard` keys in English and Chinese.
- [x] 4. `src/app/styles/tokens.css` and `components.css`: tokens and three rules.
- [x] 5. `src/components/FateCardModal.tsx`.
- [x] 6. `src/components/Journey.tsx`: trigger opens the modal; snapshot and reset effect.
- [x] 7. `tests/fate-card.test.ts`: PNG filename and helper tests.
- [x] 8. `e2e/ui/encore.spec.ts`: replace the download case with the preview, SVG, PNG, failure and overflow checks.
- [x] 9. `npm run check`.
- [x] 10. `npm run build -- --base=/ghost-rehearsal/`.
- [x] 11. `npm run test:browser:smoke`.
- [x] 12. `npx playwright test e2e/ui/encore.spec.ts e2e/ui/compare-first-screen.spec.ts`.
- [x] 13. MCP: `verify_simulation_invariants` and `inspect_guest_divergence` once, if the tools are available.
- [x] 14. Confirm protected files are unchanged with `git diff`.
- [x] 15. Append verification results below.

## Verification log
### 2026-11-20 (UTC+8), Windows, Node v24.18.0, Chromium via Playwright 1.65.1
Run by the implementing agent in the working tree. No commit was made. Pre-existing uncommitted changes outside this task (`KIRO_USAGE.md`, `README.md`, `docs/**`, `scripts/guard-haunted-invariants.mjs`, `tests/guard-haunted-invariants.test.ts`, MCP work from `ghost-rehearsal-mcp`) were left as they were.

| Check | Result |
| --- | --- |
| `npm run check` | Pass. Typecheck clean; 45 test files, 671 of 671 tests (includes the new `fateCardPngFilename` and `renderFateCardPngBlob` tests, `ui-styles`, `ui-i18n` and the unchanged `ui-redesign-equivalence`). |
| `npm run build -- --base=/ghost-rehearsal/` | Pass. No external `src`, `href`, `@import` or `url()` reference in `dist`. |
| `npx playwright test e2e/ui/encore.spec.ts e2e/ui/compare-first-screen.spec.ts` | Pass, 16 of 16 in desktop-en, desktop-zh, mobile-en and mobile-zh (production build and Worker). Run twice: once before the final token tweak (4.7 min) and once after (1.4 min), both green. The new case covers the preview, 1200×630 natural size, SVG and PNG file names, SVG parse and render, PNG signature, IHDR 2400×1260 and decode, double-click protection, forced encode failure with the SVG still downloadable, Escape and Close with focus return, release of every image Blob URL, no overflow, and zero external requests. |
| `npm run test:browser:smoke` | First run: 39 passed, 1 failed, 8 not run. The run hit the config's 600 s `globalTimeout` ("Timed out waiting 600s for the test suite to run"); the one failure (`critical.spec.ts` native keyboard menu, mobile-en) was the test in flight when the limit hit, waiting for the replay slider. Rerun with `-- --global-timeout=1700000`: 48 of 48 passed (5.4 min). The smoke set does not open the fate card; the config was not edited. |
| MCP `verify_simulation_invariants` | `passed: true`, 6 of 6 digests match. |
| MCP `inspect_guest_divergence` (defaults) | `side-stream:10` first diverges at 210 s (03:30); plan A unfinished at 1657.857 s, plan B completed at 482.857 s, difference −1175 s. Unchanged from the earlier recorded result. The running MCP process may predate this change, but it reads only simulation modules, which are untouched. |
| `git diff` on `src/simulation`, `src/schemas`, `examples`, `TopBar.tsx`, `tests/ui-redesign-equivalence.test.ts`, `package.json`, `package-lock.json` | Empty. |
| Visual check | Screenshots at 1366×768, 1440×900 and 390×844 (temporary spec, deleted). Dialog 1040 px wide, card preview 972×488 at 1366×768 and 972×510 at 1440×900, 310×163 at 390 px. The dialog body scrolled 2 px at 1366×768, so `--fate-stage-chrome` was raised from 280 px to 290 px; the later runs above used the final value. |
| Browsers other than Chromium (`test:browser:webkit`) | Not run. |
| In-IDE manual check in Kiro | Not performed. No Kiro session contribution is recorded here. |

Notes: the PNG text uses the SVG's own fallback fonts (Georgia, Segoe UI, system monospace), because an SVG drawn as an image cannot use the page's web fonts. The trigger button gained `aria-haspopup="dialog"`; its name, title, icon and position are unchanged. `README.md` and `docs/kiroween-submission.md` still describe the export as a direct SVG download and were not edited.