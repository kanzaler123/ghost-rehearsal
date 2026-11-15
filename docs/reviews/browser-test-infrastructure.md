# A0: shared browser infrastructure

Status: locally verified; awaiting independent review into `kiro/release-integration`.

This isolates the existing Playwright 1.65.1 dependency/configuration from Codex commit `cbe1a83` without including the comparison/demo product changes. It adds explicit Vitest discovery, task directory ownership and a small smoke case against integration baseline `ca28c07`. The browser command now rebuilds current source and serves the same `/ghost-rehearsal/` path by default, preventing accidental testing of an old build. No runtime application files or CI permissions change.

2026-11-15 (UTC+8), Windows, Node 24.18.0: `npm ci --no-audit --no-fund` succeeded; `npm run check` passed both TypeScript checks and 263/263 tests in 12 files; `npm run build -- --base=/ghost-rehearsal/` passed; `git diff --check` passed. `npm run test:browser -- e2e/smoke.spec.ts --trace=on` passed 4/4 projects with zero retries, skips or console/page/network errors. The existing large-chunk build warning remains.

Evidence from that run: [results JSON](browser-test-infrastructure/browser-results.json), [desktop screenshot](browser-test-infrastructure/desktop-en.png), [desktop trace](browser-test-infrastructure/desktop-en-trace.zip). Trace and screenshot cover the actual application/Worker; this synthetic example is not real-event validation. Failure screenshot/trace retention is configured; this successful run used `--trace=on` to retain a review trace and did not intentionally induce a failure.

Run commands, artifact handling and `e2e/demo`, `forms`, `robustness`, `data-sources` ownership are in [e2e/README.md](../../e2e/README.md). B/C/D should consume this commit via integration after review, with no framework upgrades of their own. Final CI/deployment gates remain E's responsibility. A's later product PR will carry this same increment; integrate A0 first so Git removes these shared files from the later review diff.
