# Robustness lab contract

Task C is an independent module. Import `RobustnessPanel` from `src/experiments/robustness/RobustnessPanel.tsx` and provide a legal ProjectDocument. Review with `npm run dev -- --port 4189 --strictPort` at `/labs/robustness.html`. The production Vite entry remains owned by E; the normal production build does not publish this lab HTML automatically.

## Pure input and computation

- `defaultConfig(project)` supplies seeds 20261114 through 20261123, conditions 1/1.25/1.5, the first plan and one same-scenario candidate, maxEvents 1,000,000.
- `prepareBatch(project, config, batchId)` validates the document, selected graphs, seed uniqueness/range, distinct plans/conditions, one shared scenario, relative multiplier Schema bounds and a 200-job maximum. It returns cloned project/config snapshots and the complete job schedule or throws before execution.
- `transformScenario(source, seed, condition)` changes the seed and multiplies only the existing global service factor (implicit original factor = 1). A ×1 condition preserves original overrides. Stage factors and interruptions remain intact. Each condition derives from the original, never from the previous condition.
- `runJob(batch, job)` / `runBatch(batch, onStarted, onSummary)` call existing simulate with cutoff only. maxEvents defaults to 1,000,000; existing engine maxSteps remains 1,000. One summary per scheduled job, including exceptions and failed/aborted simulations. Full events and visitors do not cross the Worker boundary.

## Rows and aggregation

A row includes batchId, id, seed, conditionId, planId, status, basis, modelVersion, inputKey, scenarioKey, coveredUntil, statisticsUntil, all outcomes, arrived, averageWaiting, p90Waiting, totalWaiting, earlyLeaving, staffCount, deviceCount, resource and issues. Failure/cancellation/unstarted simulation metrics are null; resource counts describe inputs. Failed and aborted rows preserve engine fingerprints/coverage where available.

`aggregateBatch(batch, rows)` returns one group for each condition × candidate. Pairing requires the scheduled seed and condition, matching scenario fingerprint/modelVersion, and both successful, fully covered cutoff statistics. A failure in B does not remove A/C pairs. Each group includes plannedPairs, validPairs, individual pair deltas, distributions with their own n, completion/waiting direction counts, and baseline/candidate/combined status counts. Distributions describe candidate minus baseline per-run values; they do not pool visitors or calculate an overall P90.

Waiting uses all arrived visitors in run.statistics; no arrivals yields null mean/P90, with zero available waiting pairs; total waiting is the empty sum 0. Early leaving means rejected + dismissed + diverted + loop_limit, displayed alongside completed and unfinished. All original outcomes including not_arrived remain in rows. The same visitor ID in another seed is never paired. Deterministic inputs may yield zero ranges; repeated seeds are rejected and simulation repeats are not real-world observations.

Resource time costs: staffHours and deviceHours are scheduled shift overlaps with [0, statisticsUntil], not money or actual utilization. Resource state totals and overtime use seconds from cutoff statistics. No price assumptions are added.

## Client lifecycle

`new RobustnessClient(onState)` creates the default dedicated module Worker on `start(preparedBatch)`. `cancel()` calls terminate, retains received summaries, marks the acknowledged active job canceled and remaining jobs not-run. If cancellation precedes the first started message, all jobs remain not-run because no start was acknowledged. `dispose()` cancels/terminates on component unmount. Every new start creates a new Worker.

BatchState includes batch, rows, currentJobId, status (running/complete/partial), startedAt, finishedAt and optional error. Worker identity and batchId both gate messages, even if a caller reuses an ID. Unknown or duplicate summary jobs cannot replace rows. Transport errors preserve received data and are visible/exported. Complete means all jobs returned; failed/aborted counts must still be inspected.

## Exports and integration

`exportBatch(state)` produces format `ghost-rehearsal-robustness`, version 1, full project/config/job schedule, all rows, model version, cutoff/run limits, transformation rule, aggregates, units and execution metadata. Running exports are explicitly partial. UI filters never change this data. This audit JSON is not a ProjectDocument.

`exportGroup(batch, seed, conditionId)` produces a standard serialized ProjectDocument with only the selected plans and one transformed shared scenario. Import it into the existing workbench and select cutoff to reproduce that group. The existing codec sorts plans by ID; identify plans by planId and reselect the baseline rather than assuming imported A/B positions retain their experiment roles. For a batch with a custom event cap, reproduce that cap through the engine API; the ProjectDocument Schema has no execution-limit field. Partial groups preserve inputs but make no promise of successful completed simulation.

E must connect the component to current project snapshots, coordinate main-workbench and lab running/cancellation, display stale-input state, and include any desired deployment entry. This module does not touch workbench storage or intercept the main UI. Independent module review is not complete product acceptance.
