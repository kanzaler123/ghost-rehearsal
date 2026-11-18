# Haunted Stage UI — tasks

- [x] 1. Tokens and surfaces: violet-black ramp, glow/fx/motion/geometry tokens; update surface assertions in
  `tests/ui-styles.test.ts` and `e2e/robustness/theme.spec.ts`. (R9)
- [x] 2. Shell: run scope in `TopBar`, remove `.run-context`, 52px top bar, HUD capsules inside `.canvas-area`, compact
  complete chip, plan-check pill, dock header shared by timeline and tabs when the dock is wider than 1180px. (R1)
- [x] 3. Person focus strip, journey grid areas, `dense` canvases and beacons (stored in a `Map`, so plan IDs such as
  `constructor` cannot hit inherited object keys). (R2)
- [x] 4. `SpectralStageBackdrop` + `spectral.ts` helpers, mounted in canvas area and welcome; tempo from replay. (R3)
- [x] 5. Route edge flow, orb trails, rune labels anchored after the source handle (`routeLabel.ts`). (R4)
- [x] 6. Card grid rework, sizes 232×220 / 248×220 synced with `stages.ts`, queue gauge with shared `queueScale`.
  `arrangeLayout` keeps its 200×196 pitch (`ARRANGE_CELL`) so the example's tidy layout is unchanged. (R7)
- [x] 7. `haunt-pulse`, flames, tracked spotlight and rune ring. (R5)
- [x] 8. Welcome rift scene and lane rift beam. (R6)
- [x] 9. Dark data-source ledger and 390px fixes. (R8)
- [x] 10. Verification: `npm run check`, `npm run build`, targeted Playwright run; record results below.

## Verification log

### 2026-11-18 (UTC+8), Kiro session

- `npm run check`: typecheck clean; 41 files, 591 tests passed (includes `tests/ui-redesign-equivalence.test.ts`).
  An earlier run failed `tests/stages.test.ts › keeps the example in its tidy layout` after the run-card size change;
  fixed by giving `arrangeLayout` its own `ARRANGE_CELL` pitch.
- `npm run build`: succeeded (existing >500 kB chunk warning only).
- Targeted browser run, `--project=desktop-zh --project=mobile-zh`: `compare-first-screen`, `reduced-motion`, `layout`
  (both motion settings), `robustness/theme`, `creative-redesign` — 22 passed. Earlier attempts failed at 390px
  (top-bar command group 409px wide; dock timeline 609px wide from a wrapped column flexbox); both fixed before the
  passing run.
- Full `npm run test:browser` (520 tests): the first attempt hit the config's 600s global timeout after 60 tests and
  found two failures. `persistence/app.spec.ts:60` was a real crash (beacon lookup by plan ID `constructor` on a plain
  object), fixed and re-passed. `forms/reliability.spec.ts:260` passed when rerun alone. A second attempt with
  `--workers=4` produced timeouts in 11 tests; 8 of them were rerun at the configured 2 workers and passed.
- Full run with `--global-timeout=0` at 2 workers: 493 passed, 23 failed. 16 were `route-keyboard` clicking the stage
  `h1`, which the Rehearse HUD had made visually hidden (the live dot intercepted the click); the heading is now
  visible outside Build. The other 7 (robustness lab batch, forms 390×568, welcome pending import) timed out. The same
  specs pass on unchanged `main` in 1.0 min, and on this branch only after the backdrop stopped looping, so the Canvas
  atmosphere was starving the Worker under headless software rendering. Fix: half-resolution canvas, 30 fps cap
  (15 fps when draws are slow), pause while a dialog is open, and no per-frame `filter`/shimmer on animated routes,
  rift and gauges. After the fix those 28 tests passed in 1.1 min.
- Final full run (`npx playwright test --global-timeout=0`, production Worker, desktop and 390px, en and zh):
  515 passed, 4 skipped, 1 failed: `demo/comparison.spec.ts:24` on desktop-zh (report snapshot not found within 10s).
  It passed on the other three projects in the same run and 3 of 3 times when rerun alone (`--repeat-each=3`), so it
  is recorded as timing-sensitive, not fixed. Note that `npm run test:browser` as configured cannot finish: its 600s
  global timeout ends the 520-test suite after about 60 tests.
