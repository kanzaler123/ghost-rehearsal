# Browser coverage

`npm run test:browser` remains the complete Chromium suite. `npm run test:browser:webkit` runs a focused subset with Playwright's Linux WebKit engine in English and Chinese, using desktop and narrow viewports. It reuses existing assertions for:

- Production subpath and real dedicated Worker loading.
- Guided A/B/C comparison, statistics boundaries and project import/export.
- Robustness experiments, cancellation, rerunning and Worker cleanup.
- Keyboard controls, narrow-screen navigation and timeline touch selection.

This is engine-level regression coverage, not physical iPhone/iPad testing or certification of the released Safari browser. The WebKit subset does not replace the full Chromium suite or claim coverage of every browser/OS combination. Touch events are emulated; smooth-scroll checks establish observed visible states rather than every animation frame.

## Run locally

```sh
npm ci
npx playwright install --with-deps webkit
npm run test:browser:webkit
```

The host needs WebKit's native dependencies. A downloaded browser package alone does not establish that the browser can launch. `npm run test:browser:webkit -- --list` checks discovery only, not execution. The config inherits the production preview, base path, timeouts and retry policy from the main config, replacing only projects, selected files and output locations.

WebKit results use `test-results/webkit/`, `test-results/webkit-results.json` and `playwright-report/webkit/`. The default suite may clear its parent output directory on the next run; copy needed evidence first. CI jobs have separate workspaces.

## CI and failures

The `build` release gate requires quality, both Chromium shards, Chromium touch, WebKit, Firefox, import-WebKit and comparison-WebKit checks to succeed before Pages can deploy. The WebKit release job uses `e2e/release/playwright.config.ts`; its artifact is `webkit-<run-id>-<attempt>` and its report is under `test-results/release-report`. See [failure diagnostics](ci-diagnostics.md) for all artifact paths and retention limits.

## Historical validation failures

The integrated application now includes a targeted React Flow size-publication patch.
See the [resize investigation](../diagnostics/resize-observer/README.md) for its implementation and validation. The failures below describe the earlier PR #19 revisions.

The first focused WebKit run (43761211358, candidate 7a23250) passed 26
cases and failed 6 desktop cases with `ResizeObserver loop completed with
undelivered notifications.` Chromium passed its full suite (184 passed,
4 skipped). Keep this change in draft until the WebKit failures are resolved;
do not filter these errors or skip the affected cases to enable deployment.

A temporary repeated-smoke diagnostic (43762390316) reproduced 3 failures
in 12 runs. Native observer callbacks immediately before the error targeted
React Flow containers and nodes, not the comparison header or timeline.
Deferring the application's viewport resize refit by one animation frame did
not fix it (43762701062: 5 failures in 12 runs). That experiment and the
instrumentation were removed, and the full focused WebKit command restored.
The callback sequence narrows the investigation but does not establish the
root cause. These experiments are not successful validation of the candidate.

Follow-up isolation (43763283149, temporary candidate 5238897) ran desktop
smoke in both languages, twice per variant, retaining strict error assertions:

| Diagnostic variant | Passed | Failed |
| --- | ---: | ---: |
| Native observers | 2 | 2 |
| Defer only node callbacks | 0 | 4 |
| Defer only renderer callbacks | 4 | 0 |
| Defer all callbacks | 4 | 0 |

These small samples implicate the renderer notification path; they do not prove
that a global observer wrapper is safe. No such wrapper is included in the
application. A narrower application experiment deferred card detail changes
caused by zoom (43763687359, candidate 9c1e81a); native WebKit still failed
3 of 12 smoke runs. Its local 452 unit and 4 Chromium smoke passes do not
resolve those WebKit failures. This experiment was also removed.

The next investigation should minimize the renderer resize reproduction and
separate React Flow's container-size store update from its pane-extent cache
update. Root cause and a reliable production fix remain unconfirmed. Original
error assertions and the full focused WebKit command remain in place.

The renderer split probe (43764172630) passed 4/4 when only size-state
publication was deferred, versus 0/4 for extent-cache deferral and 1/4 native.
An isolated real-Canvas fixture subsequently passed 4/4 native WebKit cases
(43764559153) and 2/2 local Chromium cases, so it has **not** reproduced the
complete application's failure. Both reproducible diagnostic entry points are
saved in `diagnostics/resize-observer/README.md`. At that handoff, no production or dependency
patch was included and PR #19 remained blocked pending a reliable root-cause fix.
