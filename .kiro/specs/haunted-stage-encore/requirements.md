# Haunted Stage Encore — requirements

Scope: two small Costume Contest highlights, presentation only. `src/simulation/**`, `src/schemas/**`, `examples/open-house.json` and the six digests in `tests/ui-redesign-equivalence.test.ts` stay untouched. Steering: `haunted-stage.md`, `comparison-evidence.md`.

## A. Spectral Soundscape (`src/features/soundscape.ts`)

- A1. Sound is synthesized with the Web Audio API (`AudioContext` / `webkitAudioContext`). No audio file, no network request.
- A2. Sound is off by default. Under `prefers-reduced-motion: reduce`, or when `AudioContext` is missing, blocked or throws, the feature stays silent and never throws.
- A3. A pure function decides which cues fire from replay progress. It needs no DOM and no `AudioContext`. Cues fire only when `playing` and sound are on and time advances forward by a normal tick (a large jump is a scrub and stays silent):
  - crossing the tracked ghost's `firstDifference.time` within the selected statistics basis in Two Futures plays a soft two-tone rift chord;
  - a station newly entering the haunted state (`waiting > 10` or `blocked > 0`, same rule as the canvas): low ember pulse, with a cooldown;
  - crossing the tracked ghost's completion time within the selected statistics basis plays a bright bell.
- A4. UI: one compact icon toggle (`Volume2` / `VolumeX`) inside `.timeline` in `App.tsx`, next to the speed selector, with `aria-pressed` and bilingual `aria-label` / `title`. `TopBar.tsx` is not modified. No horizontal overflow at 390px.

## B. Spectral Fate Card (`src/features/fateCard.ts`)

- B1. `buildFateCardSvg(...)` is pure. It returns a self-contained, valid, XML-escaped `<svg xmlns="http://www.w3.org/2000/svg">`. All text comes from `Messages` in English and Chinese.
- B2. Top: ghost badge, guest name and ID, event name, statistics basis (cutoff or final / run limit) and each side's actual statistics end.
- B3. Middle: aligned A (mint) and B (ghost purple) timeline bands on one shared span. A first difference draws a two-colour vertical rift line with its time. Otherwise the card states there is no difference in this scope.
- B4. The bottom shows each side's outcome and total waiting, the signed difference (comparison − baseline), and a footnote explaining that the rehearsal uses the selected inputs and assumptions. Actual event outcomes may differ. The card limits its claims to the recorded outcomes and waits.
- B5. UI: a secondary button `Export fate card` / `导出命运卡` inside `.ghost-card` beside Locate. It shows only when `compare && journeys.length === 2` and the comparison context is `ready`. It calls `download(filename, svg, 'image/svg+xml;charset=utf-8')`. The compare first screen stays visible at 1366×768 and 1440×900.

## Guardrails

- G1. Non-token CSS has no literal colours, lengths, durations or inline shadows, and no orphan classes. Reuse existing classes and tokens.
- G2. `Journey.tsx` has no `lang ===` and no Chinese characters. All copy lives in `src/i18n/messages.ts`; `reportUi`, `changeUi` and `list` keep identical key sets in both languages.
- G3. Tests: `tests/soundscape.test.ts`, `tests/fate-card.test.ts`, and one Playwright case covering the sound toggle plus a real downloaded SVG.
- G4. Acceptance: `npm run check`, `npm run build -- --base=/ghost-rehearsal/`, `npm run test:browser:smoke` and the new E2E case. Verification results are appended with dates and not overwritten.
