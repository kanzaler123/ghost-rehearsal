# Haunted Stage Encore — tasks

- [x] 1. Spec: requirements, design, tasks.
- [x] 2. `src/i18n/messages.ts`: add the `encore` group in en and zh.
- [x] 3. `src/features/soundscape.ts` and `tests/soundscape.test.ts`.
- [x] 4. `src/app/useSoundscape.ts` and the toggle in `App.tsx` `.timeline`.
- [x] 5. `src/features/fateCard.ts` and `tests/fate-card.test.ts`.
- [x] 6. Export button in `Journey.tsx` `.ghost-card`.
- [x] 7. `e2e/ui/encore.spec.ts`.
- [x] 8. Acceptance: `npm run check`, `npm run build -- --base=/ghost-rehearsal/`, `npm run test:browser:smoke`, the new E2E, then the compare-first-screen spec.
- [x] 9. Append verification results below, then commit (no push, no merge to main).

## Verification log

- 2026-11-19, Kiro session sess_c8ef18f5-67ca-4040-9cec-2e690d222045.
  - First first-screen run FAILED: a text "Export fate card" button squeezed `.ghost-id` and pushed the lanes off the 1366×768 first screen (desktop-en). Changed to an icon-only `icon-btn` with `aria-label` / `title`.
  - Second run FAILED on mobile-en (`.ghost-card` / `.ghost-futures` / `.diff-note` not fully visible). Confirmed the button caused it by hiding it. Fixed with `flex-basis` on `.ghost-id` in the mobile block of `responsive.css`.
  - Two Playwright runs started in parallel collided on port 4178 and `test-results`. Their results were discarded and the runs repeated serially.
  - Final serial runs: `npm run check` 43 files / 614 tests passed; `npm run build -- --base=/ghost-rehearsal/` built; `npm run test:browser:smoke` 40 passed; `npx playwright test e2e/ui` 144 passed, 4 skipped (optional capture), which includes `encore.spec.ts` and `compare-first-screen.spec.ts`.
  - `npm run test:browser` (the full suite) was not run.
