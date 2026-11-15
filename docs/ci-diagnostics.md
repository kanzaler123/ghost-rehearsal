# Browser failure diagnostics

The `Check and deploy` workflow uploads `test-results/` and `playwright-report/` when its build job fails. The artifact is named `browser-failure-<run-id>-<run-attempt>` and is retained for 14 days. It contains the available Playwright JSON/HTML reports, failure screenshots and retained traces. If tests never started, no files may exist; the upload then does nothing. Cancelled jobs are not guaranteed to upload diagnostics.

The upload is separate from the Pages artifact. A failed test still fails the build and blocks deployment. Passing runs do not upload browser diagnostics. No extra repository permissions are granted. Only the two test-output directories are included, not the workspace or credentials.

## Inspect a failure

1. Open the failed Actions run and download its `browser-failure-…` artifact while signed in to GitHub. Check the run ID and attempt so a rerun is not confused with the original failure.
2. Extract the ZIP. Open the report with `npx playwright show-report <extracted>/playwright-report` using the repository's installed Playwright version.
3. Open an individual `test-results/<case>/trace.zip` with `npx playwright show-trace <path-to-trace.zip>`. Compare the screenshot, action log and reported assertion; a screenshot alone may not establish timing or causality.
4. Preserve the original failure when recording any rerun. Download needed evidence before it expires.

CLI alternative:

```sh
gh run download RUN_ID --repo kanzaler123/ghost-rehearsal \
  --name browser-failure-RUN_ID-ATTEMPT --dir /tmp/ghost-browser-failure
```

## Validation record

A temporary probe at `7de8f6037aecb073a2f51c506ce428a76af6f679` deliberately failed four browser cases after opening the production workbench. [Run 43758799624](https://github.com/kanzaler123/ghost-rehearsal/actions/runs/43758799624) failed as intended, skipped deployment and successfully uploaded artifact `14179447105` (7,157,276 bytes), expiring on 2026-11-29. Its ZIP was downloaded through the authorized GitHub connector and checked: four expected probe errors, four screenshots, four valid trace archives and both reports. The local `gh` download encountered HTTP 403 at the temporary storage redirect; connector download succeeded. This was a diagnostic-path test, not a passing product suite.

The temporary test and probe-only command were then removed. The final workflow restores `npm run test:browser` unchanged. Final full CI and independent review are recorded on the PR; the deliberate probe is not a substitute for them. Upload action v7.0.2 is pinned to its official commit; runtime metadata uses Node 24. This is Codex work, with no Kiro execution or Hook success claimed.
