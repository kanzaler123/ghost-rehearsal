# Spectral Fate Card stage preview with SVG and PNG export
Status: specified 2026-11-20 before implementation. Presentation and export only. Governed by `.kiro/steering/haunted-stage.md` and `.kiro/steering/comparison-evidence.md`; background in `haunted-stage-encore` (A/B/G requirements for the fate card) and `comparison-evidence-contract`.

## Problem
The icon button in the tracked-guest card (`.ghost-card` in `Journey.tsx`) downloads the fate card SVG without showing it. The user cannot see the card, and there is no raster format for chat, slides or social posts.

## Behavior
1. Activating the existing icon button opens a modal preview of the fate card instead of downloading. The preview shows the same 1200×630 card that `buildFateCardSvg` produces for the tracked guest, the selected basis and the current language. It does not download anything by itself.
2. The modal offers three actions, in this order: **Download SVG**, **Download PNG (2×)** and **Close**. English and Chinese labels are `t.encore.fateCard.downloadSvg`, `downloadPng` and the existing `t.common.close`.
3. Download SVG saves exactly the SVG text that is previewed, named `ghost-fate-card-<id>.svg` (`fateCardFilename`).
4. Download PNG rasterizes that same SVG text in the browser into a 2400×1260 PNG named `ghost-fate-card-<id>.png` (`fateCardPngFilename`). While the PNG is being produced the PNG button is disabled and shows a working label, so a second click cannot start a second export. The SVG button stays enabled.
5. If the browser cannot decode or encode the image, the modal shows a readable error message (`t.encore.fateCard.pngFailed`) in a `role="alert"` region, re-enables the PNG button, keeps the SVG download working and does not throw out of the component. The PNG helper rejects with an `Error` that has a clear message.
6. Escape, the header close button and the Close button close the modal, and focus returns to the icon button (the existing `Modal` behavior). The modal also closes when the tracked guest, the basis or either run changes, or when the comparison is no longer ready, so a card for a different state is never shown.
7. The preview is an `<img>` whose `src` is a Blob URL of the SVG. `dangerouslySetInnerHTML` is not used. The Blob URL is revoked when the modal closes, when the SVG changes and when the component unmounts. The temporary URL used for rasterizing is revoked on success and on failure.
8. The preview is as large as the dialog allows and keeps the 1200:630 ratio. Its natural size is 1200×630. At 390 px wide and at 1366×768 and 1440×900 there is no horizontal page overflow and the whole card, the actions and the error region are reachable.
9. The card content, basis, per-side statistics ends and sample-size evidence are unchanged: the preview, SVG and PNG all come from one SVG string, so they cannot disagree. A missing, stale, failed or aborted comparison cannot open the modal (the trigger keeps the existing `canExportCard` condition). There is no fallback from final to cutoff.

## Constraints that stay as they are
10. The trigger keeps its single `icon-btn` in `.ghost-card`, the same position, the same `aria-label` and `title` (`t.encore.fateCard.button`) and the same icon. No new first-screen button is added. `compare-first-screen.spec.ts` stays green at 1366×768, 1440×900 and 390 px.
11. No change to `src/simulation/**`, `src/schemas/**`, `examples/open-house.json`, `src/components/shell/TopBar.tsx` or `tests/ui-redesign-equivalence.test.ts`. The six frozen digests are not touched.
12. Styling uses tokens only (`src/app/styles/tokens.css` holds new literal values). No literal colour, length, duration or inline shadow in other style files, no orphan class, exactly three `--surface-*` and three `--elev-*` tokens, existing contrast floors. No animation or transition is added, so reduced motion needs no new rule.
13. All user-visible text, English and Chinese, lives in `t.encore.fateCard` in `src/i18n/messages.ts`. The new component has no `lang ===` check and no hard-coded Chinese or English text.
14. Zero external runtime requests: the preview and both downloads use `blob:` URLs and a Canvas 2D context only.
15. The SVG builder's output is unchanged. `fateCard.ts` gains `fateCardPngFilename`, `renderFateCardPngBlob` and one blob-download helper; no existing export changes.
16. The development MCP server (`ghost-rehearsal-mcp`) is unaffected and keeps working: it only reads `buildFateCardSvg`, `fateCardFilename` and `FATE_CARD_SIZE`.

## Tests and acceptance
17. `tests/fate-card.test.ts` covers `fateCardPngFilename` (normal, unsafe and empty IDs, and agreement with `fateCardFilename`) and the PNG helper's argument and failure behavior.
18. `e2e/ui/encore.spec.ts` replaces the direct-download case. On desktop and 390 px in both languages, with the production build and its Worker, it checks: the modal is visible and named by `t.encore.fateCard.dialogTitle`; the preview image's natural size is 1200×630 and it has descriptive alt text; Download SVG yields `ghost-fate-card-side-stream-10.svg` that parses as SVG and renders at 1200×630; Download PNG yields `ghost-fate-card-side-stream-10.png` with the PNG signature `89 50 4E 47`, width 2400 and height 1260 read from the IHDR chunk; no request outside `127.0.0.1`, `blob:`, `data:` and `about:`; no horizontal page overflow with the modal open; the modal closes by button and by Escape and focus returns to the trigger; a forced rasterization failure shows the error message, keeps the SVG download working and re-enables the PNG button.
19. Acceptance commands: `npm run check`, `npm run build -- --base=/ghost-rehearsal/`, `npm run test:browser:smoke`, `npx playwright test e2e/ui/encore.spec.ts e2e/ui/compare-first-screen.spec.ts`. When the `ghost-rehearsal-engine` MCP tools are available in the session, `verify_simulation_invariants` and `inspect_guest_divergence` are called once to confirm zero simulation drift.
20. Results are appended to `tasks.md` with the date. Prior runs and failures are retained. Nothing is committed or pushed. Kiro contribution is recorded only for what happened in a real Kiro session.
