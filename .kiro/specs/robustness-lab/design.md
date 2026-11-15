# Robustness lab design

`conditions` validates and snapshots input, enumerates jobs and transforms each original Scenario. `runner` invokes the existing engine once per job; `summarize` projects cutoff data to compact rows. `aggregate` pairs rows separately for each candidate and condition. No visitor-level pairing or second simulation engine is introduced.

`worker` posts started / summary / complete / error messages. `RobustnessClient` owns a single Worker and immutable state updates. Every message must come from the currently owned instance and match its batchId. A valid summary must also match the planned job identity; duplicate summaries cannot replace earlier rows. Cancel and dispose terminate the owned instance. Normal completion and transport failure also terminate it.

State begins with all planned jobs marked not-run. A started message identifies the active job; a summary replaces that row. Cancel preserves received rows, marks the active job canceled and finishes the batch as partial. Transport failure marks an acknowledged active job failed with null metrics, keeps pending rows and exposes the batch error. Complete means every job returned, not that every job succeeded. Failed and event-limited aborted rows never enter valid pairs.

`export` serializes full batch state and all unfiltered rows. It also creates a Schema-valid document containing the selected plans and one transformed shared Scenario. Fingerprints are supporting evidence, not substitutes for inputs. Wall-clock timestamps and batch IDs are execution metadata; deterministic metrics and fingerprints can be compared across executions.

`RobustnessPanel` owns configuration and the client, displays prior batch snapshot results separately from editable settings, and offers local-language controls. Lab mounting is separate from App. Styles are scoped to the lab/panel. Wide tables scroll inside their own containers.

Resource costs use scheduled shifts clipped to the same statistics window in staff-hours and device-hours, plus recorded resource-state totals in seconds. These are time quantities, not a currency budget. No confidence intervals, significance claims or overall winner score are calculated.
