# Reading an exported comparison report

In Two Futures, choose More options → Export → Comparison evidence. The Markdown report records the selected statistics basis and waiting-change rule, the event name/ID, random seed, observation cutoff and run limit, plus each side's actual run scope. Values come from the recorded runs. Changing Run scope makes the old comparison stale and disables evidence export until you rerun or restore the matching settings.

A run-to-completion result can be viewed at the observation cutoff. In that case the report correctly says **Statistics basis: Observation cutoff** and **Run scope: Run to completion**: these describe different things. Each side has an explicit run-scope line. Runs with different execution scopes are incompatible and are not exported as comparison evidence.

The report retains per-side actual statistics ends, model version, input/scenario SHA-256 fingerprints, population and exclusions, outcomes, waiting groups, and resource costs. A stale or unavailable comparison is not exported as current evidence. These are results under the recorded assumptions; they are not field validation.

Markdown is a human-readable record, not an importable project. Keep the project JSON separately to rerun the inputs. The A/B/C guide can also download its scoped experiment JSON. Simulation results and view settings are recalculated/reselected after importing JSON.
