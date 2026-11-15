# D — Measured-input modules

Status: independent module implementation; workbench integration and D6 acceptance belong to E after B and D review. Existing records/empirical/provenance schemas, JSON codec, simulation and report behavior are reused.

1. Import arrival CSV or pasted CSV/TSV with `id,arrival_time,attr:<attribute ID>...`. All scenario attributes are required, values come from their existing definitions, and templates are generated from those definitions. Business keys `id`, `arrival_time`, `source` and `notes` remain legal through `attr:`.
2. Import service data with one `duration` column. Retain duplicate samples and zero. Reuse the existing empirical sample bound; do not fit or replace samples with a mean.
3. Require an explicit seconds/minutes choice. Convert relative arrival times and service durations to seconds. Handle BOM, CRLF, quoted/escaped and multiline cells, blank lines, empty input, duplicate headers and malformed/missing/extra columns. Identify errors using physical line and one-based field column.
4. Preview total/valid data rows, exact converted values and target. Arrival summaries include earliest/latest, at-or-before/after cutoff and after horizon. All legal late records remain in the candidate. Service summaries show count/min/max/arithmetic mean as imported sample summaries, not simulation results.
5. Any error blocks the whole application. Cancel, a pending/failed file read or preview alone cannot change parent values. Data, units or target changes invalidate the preview; apply emits the verified snapshot once.
6. Replace the selected stream preserving its ID and legal name. Never create attributes, streams, plans or graph changes implicitly.
7. New data and changed units reset provenance to `user_estimate`, preserving source/notes. An explicit selection on the current valid preview may choose another kind. Pure source/notes edits retain kind. The reusable manual-value helper defaults changed values to `user_estimate`; explicit corrected-measurement selection can override that choice. Existing text-length constraints apply.
8. Deliver controlled `ArrivalDataEditor`, `ServiceDataEditor`, `ProvenanceFields` and pure parsing/provenance helpers without shared-file edits. Nested Apply updates the outer form draft only; E retains the outer project commit and stale-result rules.
9. `/labs/data-sources.html` uses the existing synthetic open-house project, supports desktop and 390px review, preserves an explicit outer commit boundary and exports a schema-valid committed project. Local UI/help is English/Chinese.
10. Deliver synthetic templates/fixtures, unit and real-browser checks, usage instructions, review evidence and truthful tool attribution. Draft PR targets `kiro/release-integration`; no merge or deployment is part of D.

## Integration acceptance still owned by E

Ordinary workbench import → outer Apply → actual run; service preview/save agreement; shared-scenario A/B stale-result handling; JSON refresh/import/reproducible rerun; execution-report/UI source agreement; cancel/error behavior in B's dialogs; keyboard/focus/short-screen behavior after embedding. A standalone lab cannot establish these integrated behaviors.
