---
inclusion: always
---

# Comparison and demo evidence

- Before changing comparison or demo behavior, read `.kiro/specs/comparison-evidence-contract/requirements.md` and `.kiro/specs/guided-decision-demo/requirements.md`. Keep changes limited to the requested behavior.
- Use `analysis.ts` for paired populations, waiting groups, histogram bins and completed-only summaries. Default to inclusive 60 seconds; “Any change” uses millisecond resolution. Never create a second grouping rule in a component or export.
- Primary waiting includes all arrived guests, including unfinished and early departures. Always identify sample sizes, actual per-side statistics ends, cutoff/final and excluded not-arrived/unmatched guests. Preserve the labelled completed-only secondary sample.
- Missing final, stale, failed and aborted results cannot provide a current comparison. A horizon stop does not mean every guest completed. Do not silently fall back to cutoff.
- Create C through `createPackingExperiment`; tests must call the same builder. Preserve B and all existing events. Show C's extra staffing, every outcome and assumptions; do not promise a winner or a unique bottleneck cause.
- For acceptance, run `npm run check`, `npm run build`, then `npm run test:browser`. The browser suite uses the production Worker at desktop and 390px in both languages. Mocked Worker tests, static markup and builds alone are not browser acceptance.
- Append dated verification results; retain prior runs and failures. Record Kiro contribution only when supported by a real Kiro session. A loaded Hook is not an executed Hook. Keep Codex contributions attributed to Codex and private session exports out of Git.
