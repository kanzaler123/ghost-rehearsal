# Tasks

- [x] Audit merged main and freeze the population/threshold contract.
- [x] Unify pairing, classification, histogram and completed-only summary.
- [x] Connect bilingual controls, sample/end explanations and readable exports.
- [x] Cover boundaries and unavailable/stale results with meaningful tests.
- [x] Verify check/build and real-browser cutoff/final/threshold paths; record evidence.

Historical baseline: 2026-11-15, commit `6309d5f`, 263 tests passed. Implementation and verification below are attributed to their actual tool.

2026-11-15, Codex: `npm run check` passed 270 tests in 12 files and both TypeScript checks; production build passed (existing large-chunk warning remains). An intermediate check had three failures because old tests selected the retired group label; they now use the shared 60-second label. A fresh model run confirmed cutoff groups 12/9/279 at 60 seconds and 66/26/208 at any change, paired n=300. Browser acceptance remains pending at this checkpoint.

2026-11-15 final acceptance, Codex: check passed 272 tests in 12 files and both TypeScript checks; the Pages production build and 8 real-Worker browser cases passed. Coverage includes English/Chinese, desktop/390px, shared threshold/count/list/histogram rules, both statistics bases, not-arrived guests, an empty completed subgroup, stale evidence suppression and missing final results. Unequal final ends and per-side resource time are also covered by unit tests. See [the complete validation record](https://github.com/kanzaler123/ghost-rehearsal/blob/6607ece2ab21ed2a5f7f3582de5a94bdc6066f90/docs/validation-2026-11-15.md) for timings, intermediate failures and remaining foundation requirements.

## Parallel release A continuation — 2026-11-15

- [x] A1: expose a shared comparison context with identities, samples, thresholds, actual boundaries and unavailable states; consistently replace/clear excluded selections.
- [x] A2: preserve all-arrived primary and completed-only secondary waiting; add hand-calculated early-departure/unfinished/late/empty samples and context tests.
- [x] Correct foundation First_Divergence glossary and requirement 4.8 to settled visible states; retain the 210-second regression.
- [x] Continuation acceptance: 278 unit tests and both typechecks passed; production subpath build passed; 12/12 complete browser cases passed on `30bb3cb`, followed by 4/4 final guide/name-visibility cases on `bef5694`. Evidence: `docs/reviews/comparison-demo.md`.
- [ ] Independent review and integration acceptance.

These are additions to the previous implementation and historical validation, not a new implementation of the simulation engine.
