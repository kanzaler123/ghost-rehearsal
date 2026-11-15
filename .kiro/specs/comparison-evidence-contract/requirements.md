# Comparison evidence contract

Authored with Codex, 2026-11-15. This is a product contract, not evidence of a Kiro session.

1. Waiting groups use B minus A, rounded to the simulation's millisecond resolution. Default: less ≤ −60 seconds, more ≥ +60 seconds, otherwise little change. An explicit “Any change” option uses negative / zero / positive. Counts, lists, filters, stories, histogram and exports share this rule; changing it never reruns simulation.
2. Primary average/P90 waiting includes all arrived guests, including unfinished and early departures. Every side shows its actual statistics end, arrived sample size and not-arrived count. Paired waiting groups include only IDs present and arrived on both sides; report excluded IDs/counts rather than treating missing waits as zero.
3. Cutoff is the default. Final uses each run's actual end and requires final statistics on both sides. Never silently substitute cutoff for missing final results. Different final ends must be visible. Reaching the horizon with unfinished/not-arrived guests is not completion.
4. Resolve product-foundation 40.2–3 explicitly: retain all-arrived average/P90 as the primary final metric, and also provide the original “completed only” average/P90/n as a labelled secondary group at both bases. These are different populations; do not present their difference as a paired treatment effect. Empty samples display no value, not zero.
5. Stale, failed, aborted, incompatible-model/scenario/run-mode or missing results cannot supply a current paired conclusion or exported comparison. Existing recordings may remain available as labelled history. Early departures must accompany waiting interpretation.
6. English/Chinese interface, example instructions and readable exports explain identical boundaries and populations. Exports identify plan IDs, basis, threshold, sample sizes, actual ends, outcomes and resource time/cost; project JSON remains the canonical input document.
