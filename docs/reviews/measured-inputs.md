# D — Measured-input module review

Date: 2026-11-15 (Asia/Singapore). Branch: `kiro/measured-inputs`; base: `kiro/release-integration` at `ca28c07`. Worktree: `C:/Users/kanzaler/Desktop/ghost-rehearsal-inputs`.

Status: module implementation and verification for independent review. E still owns main-workbench integration after B and D review; this is not full product or real-event acceptance.

## Problem and resulting behavior

Existing records/empirical models lacked structured CSV import with explicit units, a reliable preview and traceable provenance changes. D supplies arrival and service editors, a shared source field group and pure helpers. A new file, pasted values or changed units resets provenance to `user_estimate`; existing source/notes remain for review. Only an explicit source selection for the current valid preview changes that label. Invalid data or Cancel cannot partially overwrite a model.

Arrival columns use `attr:` to distinguish business attributes from reserved fields. Stream ID/name survive replacement; late records remain present and counted. Service duplicates and zero remain in the empirical sample list. Preview and Apply use the same frozen converted snapshot. The lab demonstrates separate nested Apply, outer project commit, metadata-only edits and export of the committed project.

## Changes and interfaces

- `src/features/data-sources/index.ts`: CSV/TSV parser, row/field diagnostics, existing-schema validation, immutable summaries/snapshots, templates, builders and `updateProvenance`.
- `src/components/data-sources/`: `ArrivalDataEditor`, `ServiceDataEditor`, `ProvenanceFields`, local file/text input, local translations/styles and lab mount.
- `labs/data-sources.html`: independent Vite development entry using existing open-house project data.
- `tests/data-sources-import.test.ts`, `tests/fixtures/data-sources/`: 44 focused cases and clearly labelled synthetic fixture data.
- `e2e/data-sources/verify.mjs`: real Chromium acceptance, screenshots/traces and structured results; no shared test configuration or dependency edits.
- `.kiro/specs/measured-inputs/`, `docs/data-entry.md`, this review and `docs/kiro/measured-inputs-usage.md`: scoped specifications, usage and evidence.

All changes are new D-owned files. App, Dialogs, Inspector, shared styles/messages, schemas, simulation, project/analysis logic, package files, lockfiles, shared test/CI configuration and root Kiro history are unchanged.

E should pass the current `Scenario` stream/attributes/cutoff/horizon and `ServiceNode.duration` directly. Editor callbacks replace only the outer form's draft. Key service editors by plan/node ID. Metadata-only fields preserve values/kind; numerical changes use `updateProvenance` and require explicit label reselection. See [complete integration contract](../data-entry.md).

## Actual verification

Implementation/unit-test commit: `ab0797b4cba1e763ef58b471c6fbdfbe0155c561`.

| Check | Result |
| --- | --- |
| `npm run check` | Passed: both TypeScript checks; 307/307 tests in 13 files, including 44 new D cases |
| `npm run build -- --base=/ghost-rehearsal/` | Passed; existing main-bundle warning remains (829.68 kB before gzip) |
| `git diff --check` | Passed |
| `node e2e/data-sources/verify.mjs` | 30/30 browser behavior cases passed, 0 assertion failures; runner exit 1 because Windows Chromium cleanup exceeded 15 seconds |

Unit tests cover seconds/minutes equivalence; BOM/CRLF including quoted line endings; quoting/escaped quotes/TSV/blank/malformed rows; unknown/missing attributes; reserved business keys including `constructor`; zero, negative/non-finite/overflow/negative-underflow values; duplicate arrival IDs and retained sample repeats; the existing 10,000-sample maximum; immutable previews; Unicode source limits; provenance reset/reselection; untouched references; valid JSON round trips and deterministic real-engine event reproduction. Late records remain in the population and are correctly `not_arrived` outside the corresponding run range.

The required production build verifies the unchanged application's production subpath. D's lab is a development entry; this does not claim the lab was deployed or included in the production entry list.

## Browser reproduction and evidence

A0's shared browser preparation [PR #4](https://github.com/kanzaler123/ghost-rehearsal/pull/4) was still unmerged during this work. Local verification reused its existing `@playwright/test` 1.65.1 installation through an ignored `node_modules` junction to `C:/Users/kanzaler/Desktop/ghost-rehearsal-browser-infra/node_modules`. No parallel framework installation, package/lock edit or premature merge was performed. Unit checks and build ran directly in D's own worktree.

Once A0 is available in the integration branch, install the repository's shared dependencies/browser, start the dev server and run D's script:

```sh
npm ci
npm exec playwright install chromium
npm run dev -- --port 4186 --strictPort
# In a second terminal:
node e2e/data-sources/verify.mjs
```

`DATA_SOURCES_URL` can point the script at another running dev-server lab. `.mjs` is deliberately not named `.test` or `.spec`, so the pre-A0 Vitest discovery does not execute browser cases. The script uses the shared Playwright API and does not alter public runner configuration.

The browser matrix covers English/Chinese at 1440×1000 and 390×844, plus keyboard import at 390×568. It exercises file upload and pasted TSV, unit choice, row/column errors, cancellation, late-record summaries, unchanged IDs/other streams/plans, duplicate and zero samples, measured/historical reset, metadata lengths, source-only edits, stale label drafts after replacement, snapshot/target changes, delayed file reads and committed-project export/codec round trip. Browser-console/page errors and horizontal overflow are asserted, with zero retries.

During harness development, one complete intermediate run had 20 passing and 6 failing cases: four expectations incorrectly assumed the file BOM would remain in the textarea, one screenshot was detached by a concurrent development reload, and one Chinese keyboard case used an English letter shortcut. The harness now compares the browser's normalized file display and uses language-independent arrow navigation; application correctness assertions were retained. A separate code review found a lab source draft keyed only by provenance, which could retain an unapplied measured label after new samples. The key now includes the complete duration and has a browser regression.

A second iteration stopped after 16 completed cases (15 passed, one first-page cold-navigation timeout at 10 seconds; 14 not executed). Navigation now has an explicit 30-second limit. The initial Windows browser cleanup also hung after the assertions; the runner now saves its report before cleanup and bounds cleanup, treating cleanup failure as a failure. Intermediate evidence is retained locally at `C:/Users/kanzaler/AppData/Local/Temp/measured-inputs-browser-development-20261115`, with the partial run under `cold-start-iteration`.

The cleanup-safe connected-browser launcher then exposed a harness-only download API difference: a third partial run completed 16 cases (14 passed, two export setup failures; 14 not executed). Download assertions now read the public download stream instead of requesting a browser-local path. The export/codec equality assertions are unchanged.

The final stable-source run passed all 30 application cases but returned a cleanup error when graceful Chromium shutdown exceeded 15 seconds. That result is **not a successful runner exit**. Focused checks reproduced unresolved library cleanup after both graceful closure and the public kill API. Native Windows termination of one precisely identified owned browser tree succeeded, but another probe returned a nonzero status when a child had already exited. No platform process-enumeration workaround was added. The script saves the report before bounded cleanup and explicitly exits 1 on cleanup failure; the final exit guard is the only runner change after the 30-case run. The Windows tool teardown issue remains for A0/E or the browser runtime owner to resolve.

Final run: **30 passed, 0 failed behavior assertions, zero retries and no page/console errors**, 2026-11-15 18:29:57–18:31:01 Singapore time. Cleanup failed separately as above. [Structured report](measured-inputs-evidence/browser-results.json) records all profiles and the actual cleanup error. Each desktop/mobile language profile passed seven cases; each short-screen language profile passed one keyboard case.

Codex opened the real lab in Chromium and visually inspected the desktop and narrow-screen screenshots: all five arrival rows remain present, including 7,260 seconds after a 7,200-second horizon; the displayed cutoff counts are 3 at/before and 2 after, with 1 after horizon. Service preview preserves `[0, 90, 90]` and shows mean 60 seconds. On the 390×568 keyboard screenshot, focused Apply is visible. Narrow table identifiers wrap without overflowing the page. This was agent-operated browser/visual verification, not a claim of independent human review.

- [Desktop arrivals](measured-inputs-evidence/desktop-en-arrival-preview.png) · [Desktop service](measured-inputs-evidence/desktop-zh-service-preview.png)
- [390px arrivals, Chinese](measured-inputs-evidence/mobile-zh-arrival-preview.png) · [390px service, English](measured-inputs-evidence/mobile-en-service-preview.png)
- [Short-screen keyboard, Chinese](measured-inputs-evidence/short-zh-keyboard-apply.png)
- [Desktop export trace](measured-inputs-evidence/desktop-en-outer-commit-export-trace.zip) · [Mobile Chinese export trace](measured-inputs-evidence/mobile-zh-outer-commit-export-trace.zip)

## Remaining acceptance

E must connect ArrivalDataEditor to B's ScenarioEditor and ServiceDataEditor/ProvenanceFields to Inspector without bypassing outer Apply; use the provenance helper for manual numeric changes; verify ordinary UI import/run, shared-scenario result invalidation, export/refresh/import reproducibility, execution-report source agreement, cancel/error result-state behavior and B's focus/keyboard behavior in real dialogs. The independent lab demonstrates module behavior but does not satisfy those workbench checks.

The browser runner's Windows teardown must be resolved before treating its overall command as green. No real activity dataset, physical-device test or non-Chromium browser test is claimed. All screenshots and fixtures use synthetic data. Independent PR review, integration and deployment remain outstanding. [Actual tool/Kiro attribution](../kiro/measured-inputs-usage.md) records Codex authorship and no verified new Kiro development or Hook execution.
