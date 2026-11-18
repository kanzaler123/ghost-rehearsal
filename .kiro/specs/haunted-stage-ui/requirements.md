# Haunted Stage UI — requirements

Authored in a Kiro session on 2026-11-18 (UTC+8) for the Kiroween Costume Contest entry Ghost Rehearsal.
Scope: presentation only. `src/simulation/**`, `src/schemas/**` and `examples/open-house.json` are not modified, and
`tests/ui-redesign-equivalence.test.ts` keeps its recorded digests.

## Goal

Turn the dark-grey back-office workbench into a "Midnight Haunted Stage": a `100dvh`, non-scrolling node workbench
whose canvas gets most of the screen, whose atmosphere reacts to the replay, and whose every number still comes from
the recorded simulation.

## R1 Space for the stage

1. The top bar, the run-scope row and the stage header collapse into one 52px top bar. The run-scope select sits next
   to the run button and keeps the accessible name `t.run.scope`.
2. Configuration status, view switching, fit/overview and the comparison focus toggle become floating capsules over
   the canvas instead of a full-width row. The stage `h1` stays in the DOM for assistive technology.
3. In Rehearse and Compare, a completed run shows a compact state chip (`.run-state-card.is-compact[data-state=complete]`)
   instead of a banner. Computing, stopped, failed and stale results keep the full banner and its action.
4. Activity and plan names are not repeated as decoration: in Compare the top-bar context chip and the report
   toolbar plan name are hidden visually; A/B identities and pane labels remain.
5. The replay timeline and dock tabs share one header row when the dock is wider than 1180px (container query) and
   stack otherwise.

## R2 Two futures on one screen

1. On desktop (≥981px), "Follow a ghost" (`focus-person`) keeps both canvases visible as a compact side-by-side strip
   above the journey, instead of hiding them.
2. At 1366×768 and 1440×900 the `.ghost-card`, `.diff-note` and both `.lane` rows are fully visible without scrolling
   the dock body; `e2e/ui/compare-first-screen.spec.ts` passes unchanged.
3. Choosing a ghost, scrubbing, or "Jump to first difference" moves the timeline cursor and focuses the corresponding
   station in each future; those stations get a beacon highlight in both canvases.
4. Mobile (≤980px) keeps its one-panel-at-a-time navigation.

## R3 Atmosphere layer (local, non-interactive)

1. `SpectralStageBackdrop` draws velvet light, drifting mist, amber embers and mint/violet wisps on a Canvas 2D layer
   behind the canvas area and the welcome screen. It is `aria-hidden`, `pointer-events: none` and makes no requests.
2. Particle tempo follows replay: faster at higher speeds (0.5×–8×), slow breathing when paused.
3. With `prefers-reduced-motion: reduce` it draws one static frame and never starts a `requestAnimationFrame` loop.
   It also stops looping while the tab is hidden or the layer has no size.

## R4 Routes and travellers

1. During replay, routes with travellers currently on them get a glowing gradient flow line. Other routes stay plain.
2. Each recorded `ROUTE_TRANSITION` traveller is drawn as an orb with a halo and a short lagging trail at its real
   progress. The orb remains the keyboard/click target that follows the guest.
3. Branch labels (`vip`, `regular`, `first`, …) render as gold-outlined rune capsules lifted above the curve so they do
   not cover connection handles, and do not capture pointer events.

## R5 Overload and the tracked ghost

1. `haunt-pulse` is a working keyframe. Cards that are crowded (`waiting > 10`) or blocked (`blocked > 0`) breathe an
   amber or crimson glow and show small rising ghost-flames.
2. The tracked ghost's card shows a gold spotlight and its ghost carries a rotating rune ring; the spotlight scales up
   when the canvas is zoomed out so the ghost is findable at any zoom.

## R6 Divergence rift

1. The welcome screen shows an animated scene: a ghost under a moon and a jack-o'-lantern splits into a mint door (A)
   and a violet door (B).
2. The journey's "First difference" marker carries a soft two-colour rift beam.

## R7 Card and gauge correctness

1. Card live cells show number and full label without overlap or ellipsis in both languages: run cards are
   232×220 and stage cards 248×220. `NODE_SIZE`, `STAGE_SIZE` and the `--card-*`/`--stage-*` tokens stay equal.
2. The queue trend moves out of the number cell into the gauge row.
3. Queue gauges share one scale for every card on both canvases: the larger of 10 and the highest recorded `maxQueue`
   in the shown runs' statistics. Width = `min(100%, waiting / scale)`. The scale is exposed as `data-scale`.

## R8 Dark ledger inputs and narrow-screen polish

1. Data-source editors (service samples, source type) use dark surfaces; text and inputs reach ≥4.5:1 contrast.
2. At 390px: "Read-only" never wraps, "Collapse report" never breaks mid-word, the tracked-status chip wraps instead
   of being clipped, and canvas zoom controls do not cover card text (canvas fit leaves room for them).

## R9 Guard rails

1. Non-token CSS in `src/app/styles/` uses no literal colours, lengths, durations or inline shadows; 8 layers unchanged;
   no orphan classes; `!important` only for `.react-flow__` and reduced motion.
2. Surfaces become a midnight violet-black; exactly 3 `--surface-*` and 3 `--elev-*` tokens; text/tone ≥4.5:1 and
   focus/line ≥3:1 on all surfaces. Glows are `--glow-*`/`--fx-*` tokens.
3. Reduced motion: every element reports animation and transition durations ≤ 0.001s.
4. No external network request; all art is inline SVG, CSS or Canvas 2D.
5. Existing roles, labels and selectors (`role="tab"`, timeline label, `.play-btn`, `.comparison-identities`,
   `.ghost-card`, `.diff-note`, `.lane`, dialogs) keep working in English and Chinese.
