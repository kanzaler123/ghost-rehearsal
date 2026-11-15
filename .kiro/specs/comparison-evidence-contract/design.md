# Design

- Keep simulation inputs and primary Statistics unchanged. In `analysis.ts`, use one pairing/classification path for `affected`, `affectedVisitors`, `comparePicks` and `pairedVisitors`; one helper derives completed-only waiting from recorded visitor metrics.
- Store the waiting threshold beside `basis` in App and pass it to the report, Insights and Journey. Comparison controls remain accessible at 390px, including when the flow canvas is hidden.
- Seven histogram bins retain the outer −10/−5/+5/+10 minute boundaries. At 60 seconds the centre is (−1,+1) minutes, negative boundary −1 belongs to less and +1 to more. At “Any change” the centre is exactly zero and adjacent bins contain every nonzero change below five minutes. Labels show the actual interval boundaries.
- Select each side's Statistics without fallback. Display per-side sample/ends and completed-only n/average/P90. Resource schedules are clipped to the corresponding `Statistics.until`.
- The comparison export reuses the same analysis functions as the UI. Freshness and run compatibility are checked before adding evidence; no fabricated zeroes for missing results.
- Unit coverage: exact boundaries, empty/unmatched/not-arrived populations, early leaving, run limits, unequal final ends, missing final/stale/incompatible results. Real Worker/browser acceptance is recorded in the demo Spec and shared validation report.
- `comparisonContext` in `analysis.ts` is the shared selector for App, overview, Journey, Insights, sample labels and export. It reuses the existing pairing/classification functions, includes identities and explicit unavailable states, and supplies one selection replacement/clearing rule.
