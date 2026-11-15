# D — Delivery checklist

- [x] Read common parallel-release rules and D's task; inspect current model constraints and remote branch.
- [x] Create isolated `kiro/measured-inputs` worktree from the named remote branch without touching the original checkout.
- [x] Implement CSV/TSV parsing, explicit unit conversion, row/column errors, summaries and generated templates.
- [x] Preserve stream identity, late records and duplicate service samples; reject duplicate arrival IDs.
- [x] Reuse existing model/provenance schemas and limits; provide pure provenance transitions and immutable validated snapshots.
- [x] Deliver controlled arrival/service/source components, local bilingual text/styles and asynchronous read/cancel protection.
- [x] Deliver lab with actual existing project objects, nested/outer Apply separation, metadata-only editing and legal JSON export.
- [x] Add labelled synthetic fixtures and 44 focused unit/integration tests, including actual engine/codec round-trip behavior.
- [x] Run `npm run check`: 307/307 tests in 13 files and both TypeScript checks pass on `ab0797b`.
- [x] Run production `/ghost-rehearsal/` build and `git diff --check`; retain the existing bundle-size warning in the report.
- [x] Complete 30/30 real-browser behavior cases in English/Chinese, desktop/390px/short-screen views and inspect screenshots. Runner cleanup failed separately; see review.
- [ ] Resolve Windows Chromium runner teardown (current overall browser command exits 1 despite 30 passing behavior cases).
- [x] Deliver requirements/design, user/integration instructions and truthful Kiro/tool attribution.
- [x] Finalize review evidence and the browser-runner limitation for a Draft PR to `kiro/release-integration`.
- [ ] Independent PR review.
- [ ] E: embed in B's completed forms and finish all D6 workbench, stale-result, report, JSON-refresh and focus acceptance.

This checklist records module acceptance separately from E's product integration. No main merge or deployment is authorized as part of D.
