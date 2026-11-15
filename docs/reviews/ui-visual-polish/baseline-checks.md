# Baseline checks (before any UI edit)

Recorded on 2026-11-15 in this checkout, before any file under `src/` was changed.

## Baseline and branch

| Item | Value |
| --- | --- |
| Work branch | `kiro/ui-visual-polish` |
| Adopted baseline | `origin/codex/comparison-guided-demo` at `40dc58deb073450f10b4d0aa64a79c22dc19d17f` (after `git fetch origin --prune`) |
| Earlier-named baseline | `cbe1a834431bfe9a24817d64632bd8ec9071fca3`, an ancestor of the adopted baseline. The remote branch moved forward by 7 commits (`git rev-list --count`), adding comparison-demo evidence, `e2e/demo/comparison.spec.ts`, `tests/comparison/context.test.ts` and small changes to `analysis.ts`, `project.ts`, `Journey.tsx`, `CompareReport.tsx`, `Results.tsx`. |
| Spec commit | `eeef1dc` (adds `.kiro/specs/rehearsal-studio-ui/`) |
| `origin/kiro/release-integration` | `ca28c07`, 10 commits behind the baseline in the left-right count (`0 10`) |
| Uncommitted work at start | only the untracked `.kiro/specs/rehearsal-studio-ui/`; nothing was reset, stashed or discarded |

The baseline contains the A/B/C guide, waiting thresholds and the real-Worker browser tests (`e2e/smoke.spec.ts`, `e2e/demo/comparison.spec.ts`).

## Commands and results

| Command | Exit code | Result |
| --- | --- | --- |
| `npm run check` | 0 | typecheck passed; Vitest 13 files, 278 tests passed, 0 failed |
| `npm run build -- --base=/ghost-rehearsal/` | 0 | built; only the existing chunk-size warning |
| `git diff --check` | 0 | no whitespace errors |
| `npm run test:browser` (first run) | 1 | 11 passed, 1 failed, 0 skipped (12 tests); plus one error outside any test |
| `npx playwright test e2e/demo/comparison.spec.ts --project=desktop-en` (rerun) | 0 | 2 passed |

## Pre-existing failures

- `e2e/demo/comparison.spec.ts` "real Worker: guided A/B/C, scopes, bilingual evidence and project round trip" in project `desktop-en` failed once in the full run: the `Finished` row header in `.outcome-table` was not found within 10 s (expected first cell `41`). The same test passed on an isolated rerun (22.9 s), so it is recorded as an intermittent baseline failure, not as a UI regression. Cause not investigated.
- The full browser run reported `Timed out waiting 600s for the teardown for plugin setup to run`, and left its `vite preview` server on port 4178. That leftover server was stopped by hand (process started by this run) before the rerun.
- `npm run test:browser` therefore does not exit 0 on the unmodified baseline in this environment. The first full run's raw `browser-results.json` was overwritten by the isolated rerun before it was copied, so it is not preserved; the counts above come from the terminal output and from reading that file right after the first run. `baseline-browser-rerun-results.json` holds the isolated rerun only (2 passed).

Nothing in this file is taken from README or earlier review notes.

## Codex continuation: before screenshots

Before editing any `src/` file, Codex added the capture spec and saved 28 PNGs (English/Chinese, 1366×768 and 390×844). Evidence commit: `4ef1d01`. `$env:CAPTURE='before'; npm run test:browser -- e2e/ui/capture.spec.ts` exited 0 with 4 passed, 0 failed, 0 skipped (about 1.8 minutes); raw report: `before-capture-results.json`. An initial capture attempt was interrupted after a strict-selector error: searching `side-stream:10` also matched `side-stream:100`–`109`. The capture selector now selects the exact displayed #10; no application behavior changed to obtain the capture.
