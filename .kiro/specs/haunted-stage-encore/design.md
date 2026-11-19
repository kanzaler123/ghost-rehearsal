# Haunted Stage Encore — design

## Soundscape

- `src/features/soundscape.ts` (no React, no DOM at import time)
  - `hauntedStations(nodes, planId)` returns the plan and station IDs for each node with `queued + holding + blocked > 10` or `blocked > 0`. This mirrors `Canvas.tsx`.
  - `planCues(input, state) → { cues, state }` receives `enabled`, `playing`, `from`, `to`, `riftTime`, `finishTimes` and `hotStations`. It stores the latest `hotStations` and `lastEmberAt`. A forward step of 0 < `to − from` ≤ `MAX_STEP` (60 scenario s) counts as playback. Crossing means `from < t ≤ to`. An ember requires a station newly entering the haunted state and `EMBER_COOLDOWN` (20 s) since the last ember. The station list stays current during scrubbing.
  - `createSoundEngine(env = globalThis)`: lazily builds one context. Every call is wrapped in `try/catch`; a missing or throwing constructor yields `available: false`. Cues are oscillators with gain envelopes: rift (tritone sines), ember (55 Hz sine through a low-pass, two pulses), bell (sine with a 2× partial and fast decay).
- `src/app/useSoundscape.ts`: React wrapper. `enabled` starts `false`. `toggle()` creates the engine inside the click for the autoplay policy. The effect calls `planCues` when the replay time or haunted stations change. Reduced motion forces `enabled=false` and disables the button.
- `App.tsx` builds `riftTime` and `finishTimes` from tracked journeys within the selected statistics basis. It reads haunted stations from the playback views and reuses `icon-btn` for the toggle after the speed selector.

## Fate card

- `src/features/fateCard.ts`: `buildFateCardSvg({ t, visitorId, visitorName, eventName, basis, cutoff, sides: [Side, Side], difference })`, where `Side = { planName, journey, outcome?, until }`. `esc()` escapes `& < > " '`. Geometry is plain numbers on a 1200×630 canvas. Both bands use `x = 80 + time / span × 1040`, with `span = max(1, cutoff)`. Segment colours stay inside a mint (A) or purple (B) family, and a state label is drawn per side. SVG colours are literals because the file is standalone, not app CSS. `fateCardFilename(visitorId)` returns a safe file name.
- `Journey.tsx`: `exportCard()` builds the SVG from values it already holds (`journeys`, `plans`, `statisticsAt`, `difference`) and calls `download`. The button sits next to Locate in `.ghost-card` and reuses `btn small ghost`, so no CSS is added. The existing `ghost-card` wrap rule keeps 390px free of overflow.
- `messages.ts`: a new `encore` group (`sound`, `fateCard`) is added to both languages. The three parity-checked groups are untouched.

## Tests

- Unit: `planCues` boundaries, cooldown, scrub silence, disabled/paused silence; the engine with fake and throwing contexts; the fate card with escaping, both languages, difference and none, XML validity, and signed delta.
- E2E (`e2e/ui/encore.spec.ts`): the sound toggle (`aria-pressed`, with an `AudioContext` spy confirming cues fire during playback) and the fate card download parsed as SVG, at desktop and 390px in both languages.
