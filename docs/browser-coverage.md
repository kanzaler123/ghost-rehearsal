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

The Chromium `build` job and the `webkit` job run independently. Pages deployment requires both to succeed. WebKit failures retain the same two output roots as the main job, with artifact name `browser-failure-webkit-<run-id>-<attempt>` for 14 days. This distinct name avoids collisions when both jobs fail. Open its HTML report from the extracted `playwright-report/webkit` directory. See [failure diagnostics](ci-diagnostics.md) for trace inspection and retention limits.

## Current validation blocker

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
