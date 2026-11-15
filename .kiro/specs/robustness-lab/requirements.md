# Robustness lab requirements

Status: isolated module implementation for task C; independent review and task E integration remain release gates.

1. Receive a valid ProjectDocument; select one baseline and one or two existing candidates sharing one Scenario. The lab loads the existing Open House A/B and can import a validated project containing C.
2. Defaults: ten explicit seeds 20261114–20261123, relative service conditions 1 / 1.25 / 1.5, two plans, 60 jobs. Reject duplicate seeds/plans, invalid graphs, invalid Schema ranges, and more than 200 jobs. The cap is a resource guard, not a performance certification.
3. Snapshot inputs. Replace only the global service factor with original factor × condition factor; preserve stage factors, interruptions, arrivals, routing, resources, shifts and provenance. Original factor 1.2 × 1.25 becomes 1.5. Reject overflow rather than clamp.
4. Use the existing synchronous simulate in one dedicated Worker, sequentially, runMode=cutoff. Stream compact summaries, release full runs, and retain no batch of events or visitor histories.
5. Client cancellation terminates the Worker, preserves received rows and marks the acknowledged active job canceled and other pending jobs not-run. Restart creates a fresh Worker. Reject late messages using batchId and Worker identity; terminate on disposal.
6. Pair run summaries only by seed, condition, scenario fingerprint, model version and equal complete cutoff windows. Count valid pairs separately per candidate. Never match visitors across seeds, replace failed metrics with zero, or use final/completion statistics.
7. Show completion, unfinished and early-leaving deltas; median/min/max of per-run mean and P90 waiting deltas; more/same/less counts; valid/planned denominators; all job statuses; resource counts and cutoff resource time costs. All-arrived waiting is explicit, and missing waiting remains null. Early leaving = rejected + dismissed + diverted + loop_limit.
8. Expose configuration, progress, cancellation, grouped summaries, all job rows and filters. Export ignores filters and includes the full input snapshot, rules, seeds, configuration, statuses and rows. Allow export of a valid shared-scenario project for one seed × condition, including partial batches.
9. Keep Chinese/English strings and CSS local. The independent /labs/robustness.html entry must work at desktop and 390px width with a real Worker. Do not write workbench localStorage.
10. Test the stated Open House fixed outcomes, deterministic reruns/order invariance, cloned-plan zero deltas, no arrivals, failure isolation, transform preservation, cancellation/races, complete/partial exports and workbench reproduction. Record actual results and attribution.

No changes to App, existing comparison components, engine, Schema, shared translations/styles, dependencies, Vite or CI. E owns the main entry, run coordination, stale-snapshot UX and deployed lab/site wiring.
