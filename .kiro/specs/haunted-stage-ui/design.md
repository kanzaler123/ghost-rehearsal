# Haunted Stage UI — design

## Layout (desktop ≥981px)

```
┌ topbar 52px: brand · context chip · Build/Rehearse/Compare · undo/redo · [scope ▾][Run] · save · more · lang ┐
├ guided demo (when active) ─────────────────────────────────────────────────────────────────────────────────┤
├ comparison settings: A · name | B · name | plans | basis | live (Compare only) ──────────────────────────────┤
│ report │ canvas-area                                                              │ inspector │
│ (Comp.)│  ├ SpectralStageBackdrop (canvas, z 0)                                   │           │
│        │  ├ stage-head HUD capsules (absolute; Compare reserves --hud-h on top)   │           │
│        │  └ canvas-pane(s)                                                        │           │
│        ├ dock: [timeline ......................][tabs · legend · stress · ▾]  one row          │
│        └ dock body (journey / insights / …)                                                   │
└ status bar ──────────────────────────────────────────────────────────────────────────────────┘
```

- `TopBar` renders the run-scope `select-pill` before the run button; the old `.run-context` row is removed.
- `.stage-head` moves inside `.canvas-area`. Children are capsules (`.stage-title`, `.stage-tools`) with
  `pointer-events: auto`; the HUD container is `pointer-events: none`. Build/Rehearse: right-aligned overlay (the
  canvas fit keeps 64px top padding). Compare: `.canvas-area` gets `padding-top: var(--hud-h)` so panes start below it.
  ≤980px: the HUD is static and wraps; the canvas area becomes a column.
- `.canvas-tools` becomes an absolute top-left capsule inside each non-compact canvas.
- `.run-plan-checks` becomes a HUD pill: icon + summary (`t.stage.passed/notices/toFix`) with per-plan lines in
  visually hidden spans and the tooltip.
- `.dock-head` wraps `.timeline` and `.dock-tabs`; `@container dock (max-width: 1180px)` stacks them as a column
  (a wrapped column flexbox would size the line to its content and overflow at 390px).

### Person focus strip

`@media (min-width: 981px)`: `.mode-compare.focus-person .canvas-area.split` is a row with
`height: clamp(var(--person-stage-min), calc(100dvh - var(--person-stage-reserve)), var(--person-stage-max))`
(170px at 768px high, ≈300px at 900px). The HUD is hidden in this focus because the journey header already has the
way back. The dock body (≈390px) holds the journey header, a two-column `ghost-card + futures | diff-note` row and the
two lanes. Canvases get `dense` (smaller fit padding, no zoom controls).
The journey detail uses grid areas `card diff / futures diff / lanes lanes / rest rest`.

### Beacon

`App.focusNodes` records `beacons[planId]` (from `byPlan` or the shared ids) in non-Build modes. `Canvas` receives
`beacon?: string[]`; a card is `is-beacon` when its node is listed, a stage card when any member is. This is used by
choose-ghost, locate and jump-to-first-difference, so both futures light up the station where the same guest stands.

## Visual system

Tokens (all in `tokens.css`):

| Group | Tokens |
| --- | --- |
| Surfaces | `--surface-0 #0e0b14`, `--surface-1 #15111e`, `--surface-2 #1f1a2b`; `--bg-*`, `--line`, `--line-2 #8a829c`, `--hover-bg` follow the violet-black ramp |
| Glows | `--glow-crowd-0/1`, `--glow-block-0/1`, `--glow-track`, `--glow-beacon`, `--glow-capsule`, `--glow-orb` |
| Effects | `--fx-ember`, `--fx-wisp-mint`, `--fx-wisp-violet`, `--fx-mist`, `--fx-velvet`, `--fx-rune`, `--fx-rift-a/b` |
| Motion | `--dur-breathe`, `--dur-flame`, `--dur-flow`, `--dur-rune`, `--dur-rift`, `--dur-portal` |
| Geometry | `--topbar-compact-h 52px`, `--hud-h`, `--card-run-w 232px`, `--card-run-h 220px`, `--stage-w 248px`, `--stage-h 220px`, `--person-stage-*` |

Contrast is checked by `tests/ui-styles.test.ts` (text/tone ≥4.5, focus/line ≥3 on each surface).

## Components

### `SpectralStageBackdrop` (`src/components/SpectralStageBackdrop.tsx`, helpers in `spectral.ts`)

- Props: `tempo` (from `tempoOf(playing, speed)`), `reducedMotion`, `moon`, `quiet`.
- Canvas sized by `ResizeObserver`, DPR capped at 1.5. Colours read once from CSS custom properties.
- Pre-rendered glow and mist sprites; per frame: velvet gradient → mist blobs (sin drift) → wisps (lissajous) →
  embers (rise, flicker, wrap) with `lighter` compositing. Tempo is eased toward its target each frame.
- Loop runs only if size > 0, the document is visible and motion is allowed; otherwise one static frame is drawn.
- Mounted once in `.canvas-area` and once in the welcome `.entry-atmosphere`.

### Canvas cards

- Flow card live grid: three equal cells (`is-wait`, `is-serve`, `is-pass`/`is-block`), each a column of
  marker+number then full label. Exit cards keep `is-done`.
- Gauge row: `.queue-gauge > .queue-load[data-scale] > span` plus the `Trend` badge.
- Overload: `.haunt-flames` (three `<i>`), and card animation `haunt-pulse` (`.st-crowded`, `.st-blocked`).
- Tracked: `.tracked-spotlight` element (scaled by `max(1, var(--fx-spot-zoom) / var(--canvas-zoom))`) and a rotating
  `::before` rune ring on `.visitor.is-tracked`.

### Route edge

- `data.flowing` (running and travellers present) adds `.route-aura` and `.route-flow` paths; the flow uses a
  `linearGradient` in user space whose id is namespaced by plan and edge.
- Travellers: `.route-orb` group with three lagging `.orb-trail` circles, an `.orb-halo`, and the existing interactive
  circle (role button, Enter/Space).
- Labels: `EdgeLabelRenderer` → `.route-rune` at the curve midpoint, translated above the line, `pointer-events: none`.

### Queue scale

`queueScale(runs)` in `src/components/queueScale.ts`: `max(10, maxQueue over statistics and completion nodes of the
shown runs)`. `App` computes it once for Rehearse (A) or Compare (A and B) and passes the same value to both canvases.

### Welcome rift

`RiftScene` inline SVG in `Icons.tsx`: moon, lantern, centre ghost, two arched portals, two ghost clones animated with
CSS (`ghost-split-a/b`, `portal-glow`). Text A/B stays on the portals.

## Testing

- Fast loop: `npm run check`, `npm run build`.
- Unit additions: `tests/ui-queue-scale.test.ts`, `tests/ui-spectral.test.ts`; updated surface hexes and geometry map in
  `tests/ui-styles.test.ts`; `TopBar` props in `tests/ui-shell.test.ts`.
- Browser: `npx playwright test e2e/ui/compare-first-screen.spec.ts e2e/ui/reduced-motion.spec.ts e2e/ui/layout.spec.ts
  e2e/robustness/theme.spec.ts --project=desktop-zh --project=mobile-zh`, plus `e2e/ui/creative-redesign.spec.ts`
  whose gauge assertion now checks the shared `data-scale`.
