# Interface and ownership checks

On 2026-11-15 the GitHub connector confirmed B PR #5 remains open, draft and unmerged: head `b22556accca1fc27e9fb0dc6d72ef8ed3d93e72b`, integration `ca28c078443b35d49bee6593a5d0dc6a20db12ae`. Local remote refs match these SHAs. Comparing those refs shows 67 additions and 42 deletions across Dialogs and Inspector. Therefore the late Inspector wrapper (task 20.2) is deferred under the plan's coordination rule; Inspector and Dialogs source remain unchanged. Global visual styling is in scope. Once B merges, wrap B's final groups without changing its draft/validation/undo behavior.

The return-to-overview list/search/page/scroll retention, per-canvas edit actions, and field-level validation/undo changes remain excluded. Simulation, schemas, analysis and project logic are frozen to `40dc58d`. This branch depends on A PR #3 and is delivered as a draft into `kiro/release-integration`; nothing is merged into main.
