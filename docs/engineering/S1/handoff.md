# S1 integration record

Started 2026-11-16, continued 2026-11-17 (Asia/Singapore). Worktree: `C:/Users/kanzaler/Desktop/ghost-rehearsal-s1`; branch: `integration/reliability-performance-ui`. Implementation and verification by Codex.

## Fixed inputs

| Input | Branch | Commit | Handoff |
| --- | --- | --- | --- |
| Latest main at start | main | `69502b8db149dd80e6b8311fe43e87154d3b6d93` | Existing integration inspected in source |
| UI | feat/ui-creative-redesign | `cc6dc964b9cae86d96a35079c1e29e766699027d` | `docs/reviews/ui-creative-redesign/interface-changes.md`, `verification.md`, `black-theme/review.md` |
| A | fix/project-data-reliability | `c72ffa020a8547aea19a345f99807c46ea086929` | `docs/engineering/A/handoff.md` |
| B | fix/sampling-and-statistics | `03cfbe36bcfce9164c122e7edf5229dcab1e7512` | `docs/engineering/B/handoff.md` |
| C | perf/incremental-playback | `e956a81dea1e8106b428109a5c20f99928e15ce9` | `docs/engineering/C/handoff.md` |
| D | fix/runtime-and-import-recovery | `e9183e931b10219dfe74c88d906b3b99180e6514` | `docs/engineering/D/handoff.md` |
| E | test/cross-browser-release-gates | `9a61358b1066e38f6e28f97fe84ba4b6ffe605b5` | `docs/engineering/E/handoff.md` |

The refreshed main already contains all five inputs, prior application wiring, and the commits of #19/#32/#33 through merged #39. These are inherited history, not merges performed by S1. Reverting main's existing work would violate the latest-main baseline. S1 merges only the reviewed UI commit. The UI worktree and its unstaged README are untouched. No main merge or deployment is authorized by this delivery.

## Conflict decisions

- App: preserve safe result Map, persistence and import clients, cancellation and recovery guards; add UI run context, legend, welcome language controls and focus behavior. Guide activation cancels pending import and clears its diagnostics.
- Canvas: preserve stable callbacks and existing observer/viewport fixes; include population in memo dependencies for accurate UI queue bars. Do not restore the old callback dependencies.
- EventCreator: combine the new welcome layout and language switch with cancelable import and existing recovery guards. Keep the guide's accessible description.
- ContextMenu: retain main's pointer activation/focus handling, which covers touch as well as mouse; retain the UI's surrounding presentation.
- Styles: use UI tokens and welcome layout in the conflicting rules; preserve the fixed ghost-row height and absence of continuous ghost animations.
- Messages: retain both bilingual persistence/import strings and new UI strings. Existing selected-statistics story wording is retained.
- README: preserve main's English structure and updated verification history; update only the welcome action and visible run-scope location. Do not reintroduce the removed historical Chinese duplicate.

## Integration and performance checkpoints

The UI merge commit is the pre-S1-performance checkpoint. Its first check passed both TypeScript configurations and 567 unit tests in 40 files. Subsequent application fixes and performance changes will be separate commits. Existing main already contains earlier performance changes; comparisons measure incremental S1 effects, not a comparison against the old f837199 product.

## Verification and remaining work

In progress: final wiring audit, browser validation, measurements and independent S2 handoff. Historical input-branch checks are not final integrated evidence. Physical Safari/iOS/Android devices have not been verified here.
