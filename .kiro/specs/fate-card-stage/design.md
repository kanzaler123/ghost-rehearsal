# Fate card stage: design

## Files
| File | Change |
| --- | --- |
| `src/features/fateCard.ts` | Add `fateCardPngFilename`, `renderFateCardPngBlob`, `saveBlob`, `FATE_CARD_PNG_SCALE`. Existing exports and the SVG output are untouched. |
| `src/components/FateCardModal.tsx` | New. Preview, actions, error region. Uses `Modal` from `Dialogs.tsx` in `wide` mode. |
| `src/components/Journey.tsx` | The icon button now opens the modal. The SVG is built once when the button is pressed. |
| `src/i18n/messages.ts` | New keys in `t.encore.fateCard`, English and Chinese. `button` is unchanged. |
| `src/app/styles/tokens.css` | New tokens `--fate-stage-width`, `--fate-stage-chrome`, `--fate-card-ratio`. |
| `src/app/styles/components.css` | Three small rules: dialog width, frame, preview. |
| `tests/fate-card.test.ts`, `e2e/ui/encore.spec.ts` | Updated as in requirements 17 and 18. |

Nothing under `src/simulation/**`, `src/schemas/**`, `examples/**`, `TopBar.tsx` or the equivalence test is edited.

## Journey.tsx
`exportFateCard` becomes `openFateCard`. It builds the same `FateCardInput` as before (sides from `statisticsAt`, `journeyOf` boundaries, `difference`, `cutoff`, `basis`) and stores a snapshot `{ svg, visitorId, name }` in `useState`. Building at press time keeps the previous semantics (one build per user action) and avoids rebuilding on every replay tick. The `difference` object is recreated on each render, so a `useMemo` over it would never hit.

A `useEffect` keyed on `visitorId`, `basis`, `runs[0]?.inputKey`, `runs[1]?.inputKey` and `canExportCard` clears the snapshot, which closes the modal. This is the same dependency list the component already uses for its own resets. The modal is rendered as a sibling of `.ghost-detail` inside `.ghost-journey`. `Modal` portals to `document.body`, so layout does not change.

The trigger line keeps `canExportCard &&`, the single `button.icon-btn`, `aria-label`, `title`, the `Download` icon and its position. Only `onClick` changes.

## FateCardModal
Props: `svg`, `visitorId`, `name`, `onClose`.
- `previewUrl` is created in an effect from `svg` and revoked in the cleanup, which runs on close, on SVG change and on unmount (React strict mode safe).
- The `<img>` has `alt={card.description(name)}`, `width`/`height` attributes from `FATE_CARD_SIZE`, `className="fate-card-preview"` and `draggable={false}`. It renders only when the URL exists.
- **Download SVG** calls the existing `download(fateCardFilename(id), svg, 'image/svg+xml;charset=utf-8')`.
- **Download PNG (2×)**: `busy` state, set before the await, guards re-entry (the button is `disabled` and `aria-busy`). `renderFateCardPngBlob(svg)` resolves to a Blob, then `saveBlob(fateCardPngFilename(id), blob)`. A `mounted` ref prevents state updates and downloads after the modal closed. A rejection sets `failed`, which shows `card.pngFailed` in `<p role="alert" className="form-error">`. The error text is a translated message; the technical reason goes to `console.warn`.
- The footer is `div.modal-footer` with `btn ghost` (SVG), `btn primary` (PNG) and `btn ghost` (Close). `forms-modal` already lets the footer wrap at 390 px.
- The body holds `p.dialog-description.inline` (one-line hint), the frame with the image, and the error region.

## Rasterizer (`renderFateCardPngBlob(svg, scale = FATE_CARD_PNG_SCALE)`)
1. Reject a `scale` that is not an integer from 1 to 4 (`RangeError`).
2. `URL.createObjectURL` of an `image/svg+xml;charset=utf-8` Blob.
3. Load it in an off-screen `Image`; `onerror` rejects with "The browser could not decode the fate card SVG."
4. Create a canvas of `1200*scale × 630*scale`, get `2d` (reject if null), `drawImage` at full size.
5. `canvas.toBlob(..., 'image/png')`; a null blob rejects with "The browser could not encode the PNG."
6. The temporary URL is revoked in `finally`, so success and every failure path release it.

The card has no `foreignObject`, no external image and no web-font file, so the canvas is not tainted. Inside an image context the browser cannot use the page's `@font-face` fonts, so the PNG text uses the SVG's own fallback font stack (Georgia, Segoe UI, system monospace). The standalone SVG file has the same fallback chain when opened outside the app.

`saveBlob(name, blob)` is the Blob counterpart of `download`: object URL, anchor click, revoke after 1 s.

## Messages (`t.encore.fateCard`)
New keys: `dialogTitle`, `previewHint`, `downloadSvg`, `downloadPng`, `pngWorking`, `pngFailed`. `Close` reuses `t.common.close`. Both languages are filled in the same commit; the `Messages` type is derived from the English object, so TypeScript reports a missing Chinese key.

## Styling
`tokens.css`: `--fate-stage-width: 1040px`, `--fate-stage-chrome: 280px`, `--fate-card-ratio: 1200 / 630`.
`components.css` (no literals, no new colours, no shadow other than a token, no motion):
```css
.modal.wide:has(.fate-card-stage) { width: var(--fate-stage-width); }
.fate-card-frame { display: grid; place-items: center; padding: var(--space-4); border: var(--stroke) solid var(--line); border-radius: var(--radius-lg); background: var(--surface-0); box-shadow: var(--glow-card); }
.fate-card-preview { display: block; width: 100%; height: auto; max-height: calc(100dvh - var(--fate-stage-chrome)); aspect-ratio: var(--fate-card-ratio); object-fit: contain; border-radius: var(--radius-md); }
```
The dialog's existing `max-width` keeps it inside the viewport. `max-height` on the image makes the whole card fit at 1366×768 without scrolling the dialog body; `object-fit: contain` letterboxes inside the frame when the height limit applies. `.fate-card-stage` is the wrapper class in the body and is only used as the `:has()` hook.

## Tests
| Area | Check |
| --- | --- |
| Unit | `fateCardPngFilename` for the example ID, unsafe characters, empty ID, `.png` replaces `.svg` and the stem equals `fateCardFilename`'s. `renderFateCardPngBlob` rejects a bad scale before touching the DOM. In the Node test environment (no `document`) a valid call rejects with an `Error`, not a crash. |
| Browser | Requirement 18 on the production build in four projects (desktop and mobile, English and Chinese). The PNG is decoded by reading the IHDR chunk, not by trusting the file name. Failure injection replaces `HTMLCanvasElement.prototype.toBlob` with a version that returns `null`. |
| Regression | `compare-first-screen.spec.ts`, `tests/ui-styles.test.ts`, `tests/ui-i18n.test.ts` and the equivalence test. |

## Risks
- The `.modal.wide:has(...)` selector needs `:has()`. The project already depends on it (`body:has(dialog.forms-modal[open])`). Without it the dialog keeps the 780 px wide width and the image shrinks; nothing breaks.
- Rasterization quality depends on the browser's SVG renderer. The browser test checks signature and dimensions, not pixels.
