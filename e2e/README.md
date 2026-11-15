# Shared browser tests (A0)

Use Node matching `package.json`, then run:

```sh
npm ci
npx playwright install chromium
npm run check
npm run build -- --base=/ghost-rehearsal/
npm run test:browser -- e2e/smoke.spec.ts
```

Linux hosts may need `npx playwright install --with-deps chromium`. The runner builds the current source and starts a fresh production preview at `http://127.0.0.1:4178/ghost-rehearsal/`; an occupied port fails instead of reusing another checkout. `PLAYWRIGHT_BASE_PATH` changes both build and preview together. No development server or mocked Worker is used. Configuration follows the [Playwright web-server documentation](https://playwright.dev/docs/test-webserver).

The four projects cover English/Chinese at 1440×1000 and 390×844. Use `--project=desktop-en` for a focused run. Vitest includes only `tests/**/*.test.ts`; browser cases belong under `e2e/` and are typechecked separately from test discovery.

Ownership: `e2e/smoke.spec.ts` and common configuration belong to A/E; A adds cases under `e2e/demo/`, B under `e2e/forms/`, C under `e2e/robustness/`, D under `e2e/data-sources/`. Do not add a second framework or change shared dependencies in other task branches. Keep task-specific helpers beside those cases; request shared fixtures from A/E when needed.

HTML reports: `playwright-report/index.html` (`npx playwright show-report`). Machine-readable results and per-case screenshots: `test-results/`. Failures automatically retain `test-failed-1.png` and `trace.zip` (`npx playwright show-trace <path>`). To retain successful traces too, add `--trace=on`. Both output directories are ignored by Git. Preserve review evidence outside them before a later run overwrites it.

This increment changes no CI/deployment permissions. B/C/D can merge the integration branch after A0 passes independent review and is integrated. E owns the final deployment gate.

## CI Chromium shards

The Pages workflow runs the full Chromium suite in two file-level [Playwright shards](https://playwright.dev/docs/test-sharding). Both jobs keep the same production build, unit/type checks, two browser workers, zero retries, and browser timeout. Run either partition locally with `npm run test:browser -- --shard=1/2` or `--shard=2/2`; omit the option for the full suite.

The stable `build` check succeeds only when both Chromium jobs succeed. Deployment still requires `build`; only shard 1 uploads the Pages artifact, preventing duplicate artifact names. Each failed shard retains its own HTML report and `test-results/` under a distinct artifact name for 14 days. The other shard continues after failure so its diagnostics are retained too.

The separate WebKit workflow covers project import and route keyboard tests only. The broader WebKit validation proposal remains draft PR #19; it must be rebased and its additional deployment dependency preserved if that proposal is later completed.
