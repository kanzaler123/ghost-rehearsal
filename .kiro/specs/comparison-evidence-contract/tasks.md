# Tasks

- [x] Audit merged main and freeze the population/threshold contract.
- [x] Unify pairing, classification, histogram and completed-only summary.
- [x] Connect bilingual controls, sample/end explanations and readable exports.
- [x] Cover boundaries and unavailable/stale results with meaningful tests.
- [x] Verify check/build and real-browser cutoff/final/threshold paths; record evidence.

Historical baseline: 2026-11-15, commit `6309d5f`, 263 tests passed. Implementation and verification below are attributed to their actual tool.

2026-11-15, Codex: `npm run check` passed 270 tests in 12 files and both TypeScript checks; production build passed (existing large-chunk warning remains). An intermediate check had three failures because old tests selected the retired group label; they now use the shared 60-second label. A fresh model run confirmed cutoff groups 12/9/279 at 60 seconds and 66/26/208 at any change, paired n=300. Browser acceptance remains pending at this checkpoint.

2026-11-15 final acceptance, Codex: check passed 272 tests in 12 files and both TypeScript checks; the Pages production build and 8 real-Worker browser cases passed. Coverage includes English/Chinese, desktop/390px, shared threshold/count/list/histogram rules, both statistics bases, not-arrived guests, an empty completed subgroup, stale evidence suppression and missing final results. Unequal final ends and per-side resource time are also covered by unit tests. See [the complete validation record](../../../docs/validation-2026-11-15.md) for timings, intermediate failures and remaining foundation requirements.
