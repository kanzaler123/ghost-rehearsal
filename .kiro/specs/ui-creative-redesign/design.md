# Ghostlight — one guest, two futures

The approved requirements are frozen. Kiro authored the requirements and the first capture script; Codex implements and verifies this design. Baseline: `f837199`, branch: `feat/ui-creative-redesign`. No external visual reference, generated artwork, new package or service is needed.

## Direction and alternatives

| Concept | Organisation | Metaphor | Interaction rhythm | Simulation presentation | Trade-off |
|---|---|---|---|---|---|
| **Ghostlight (selected)** | A continuous stage, paired A/B scenes and an evidence rail | A rehearsal before opening night | Build → rehearse → compare; follow one guest to the first divergence | Actual ghosts and proportional queue bars, one shared replay clock | Keeps the existing interaction and data contracts; strongest link to the product name |
| Field atlas | A large analytical map surrounded by marginal notes | An organiser's annotated field notebook | Scan → select → inspect | Routes and station annotations on a light map | Clear for print, but light/dark canvas switching and a new spatial navigation model add accessibility and regression risk |

Both preserve actual event records and make no recommendation about a winning plan. Ghostlight uses the existing shell, Canvas, Dialogs, Guide and styles; the atlas would change the same files plus viewport navigation. Neither needs a simulation, schema, storage or Worker change. Only bilingual copy under `src/i18n/messages.ts` lies outside the owned UI area. Representative, explicitly illustrative comparison frames: [Ghostlight](../../../docs/reviews/ui-creative-redesign/concepts/ghostlight.svg), [Field atlas](../../../docs/reviews/ui-creative-redesign/concepts/field-atlas.svg).

## Diagnosis and visible response

1. **Welcome / first impression:** the baseline opens directly into a tall configuration form. The purpose and example action are visually secondary. Put an expressive product introduction and the guided example next to the existing creation form; keep import, new event and language controls visible.
2. **Compare overview / reading results:** the report, toolbars and scene use almost identical visual weight. Use an evidence rail, clearer plan identity, calm surfaces and a brighter focal point around the followed guest. Preserve every result and adverse outcome.
3. **Rehearse tracked / movement:** untracked guests resemble control icons; queue magnitude relies on reading numbers. Use the product ghost with a state badge and a proportional, labelled-by-adjacent-count queue measure.
4. **Build and build inspector / configuration:** run scope is hidden in More. Show it alongside the included plan and separate validation error/notice counts before run; keep the existing form and canvas operations.
5. **Journey divergence / continuity:** the same guest's changed state at 03:30 is the clearest existing product insight. Give it the visual hierarchy of the signature moment and a direct welcome entry, while preserving the shared time axis, first-difference definition and return action.
6. **Secondary states:** event settings, resources, templates, imports, errors, robustness and export inherit the same token system. Their existing behaviour is retained. Before/after capture logs provide state-specific observations; unresolved layout or runtime findings are recorded in verification rather than counted as resolved.

## Signature moment

From welcome, start the A/B/C guide, follow the same guest and jump to the first difference: three visible activations. At 210 seconds the original `side-stream:10` is still queuing in A while B has started service. Both timelines, plan identities, station and event evidence come from the real production Worker. A/B/C assumptions and adverse outcomes remain visible. Reduced motion presents the same moment without tweening. The two stage scenes, ghost glyph and shared clock establish the language used in Build and Rehearse too.

## Layout, focus and actions

| States | Focus | Primary action | Always visible / on demand |
|---|---|---|---|
| welcome | Purpose and guided example | Start guide | Language, demo, creation, import / creation parameters in scrollable body |
| build, build-inspector, empty-canvas | Current plan and editable flow | Run | Plan, scope, validation / inspector and library |
| rehearse-tracked, rehearse-end | Recorded guest and current state | Play when paused | Clock and recorded counts / guest list, station evidence, legend |
| compare-overview, guide-bc | Paired flow and outcome evidence | Next guide step when guide is active | A/B names, basis and results / detailed resource and sample evidence |
| journey-divergence | Same guest's two timelines | Next guide step | First difference, outcomes and common time axis / full events |
| event-settings, staff-devices | Current draft | Apply | Required fields / advanced fields |
| templates | Template choice | Selected template action | Categories / resource details |
| arrival-import-error, invalid-import | Exact issue and original data | None until valid | Error list / unchanged project |
| computing | Run status | Stop | Existing recording / previous evidence suppressed |
| stopped, failed, stale | State and reason | Retry | Previous results labelled history / issue details |
| robustness | Batch controls and status | Start or cancel | Progress and inputs / outcomes after completion |
| export | Export choice and scope | None | Available formats and disabled evidence reason |

Primary style is the filled `.primary` button; `.run` is primary only for idle Build. Navigation, outlines and guide links do not count as a second filled primary. The five questions are answered by the welcome purpose; run scope/plan strip; stage waiting counts; comparison report; and guest journey/evidence panel, respectively.

## Visual system

Near-black green stage surfaces, warm ivory text, amber brand, mint A and lilac B. Plan identities always include letters and names. Warm coral indicates adverse outcomes; yellow is observed waiting, blue service, rose blocked, pale blue completed, taupe early departure. Observed crowding means a recorded waiting count greater than 10, never a causal diagnosis.

Inter is the control font, Fraunces the display face and JetBrains Mono the numeric face; all are already bundled. Type scale: 12, 13, 14, 16, 20, 24, 32, 40, 56 px. Spacing: 2, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80 px. Radius: 4, 8, 12, 20, 999 px. Five elevations including none; six durations at most (1, 120, 180, 300, 500, 1600 ms); standard and decelerating easing. Literal-value token names are replaced with semantic roles. Geometry dimensions remain explicit semantic tokens to preserve flow sizing. Lucide plus the existing Ghost glyph are the only icon families.

Queue lengths use the same population denominator on both plans, with no positive minimum. Exact counts remain visible. Guest caps remain 8/5/1 per station and 5/3/1 per stage at near/mid/far zoom, plus the pinned followed guest; undrawn present guests are counted. Only recorded travelers appear on routes. Finished and departed guests are reported, not left standing in the flow.

## Interaction and continuity

Preserve the baseline project, scenarios, compared plans, run scope, statistics basis, threshold, selected guest and view preferences. Build→Rehearse/Compare reuses usable runs, resets time and follows the existing autoplay/reduced-motion rule; a selected node is kept visible. Rehearse↔Compare retains speed and guest eligibility. Rehearse/Compare→Build restores editing and pauses. Successful runs reset selection/time/speed as before; failed/stopped runs preserve previous recordings and suppress conclusions; aborted single runs retain partial playback without summary statistics. Dialogs keep their existing Escape/focus behavior. New guide entry invalidates pending file reads and transfers focus into the guide.

Motion: border/colour feedback 120–180 ms; panel entrance 180 ms; viewport movement at most 300 ms. No decorative looping motion in the workbench. Guest positions remain driven by recorded time; pause/seek settles immediately. Every transition becomes absent under reduced motion. No audio.

## Assets and implementation boundaries

| Type | Decision / delivery | Origin, licence, cost | Owner action / fallback |
|---|---|---|---|
| Ghost character | Existing inline SVG; identity and actual participant glyphs | Repository code, MIT; no cost | None; no placeholder |
| Entry illustration | Original inline vector/CSS dual path; visibly illustrative | Authored in this repository, MIT | None |
| Icons | Existing Lucide, standard 14/16/20/24 px, 1.8–2 px stroke | Pinned package; existing notices | None |
| Textures | CSS stage grid/light; no image request | Repository code, MIT | None |
| Fonts | Existing locally bundled Inter/Fraunces/JetBrains Mono | Existing pinned packages and OFL notices | None |
| Motion files, sound, 3D | Unnecessary for explaining recorded flows | Not used | None |

No new exports, calculation helpers or state containers are planned. Interface changes, changed text and test locators are recorded in `docs/reviews/ui-creative-redesign/interface-changes.md`. Simulation, schemas, analysis, stage calculation, storage formats, Worker protocol and infrastructure stay at the baseline. Existing README edits predate this handover and are preserved separately.

## Verification

Before application edits: record repository state, run check/build/browser baseline, capture the specified states and save A/B/C run hashes. After implementation: repeat check/build/browser; compare the six hashes; exercise the signature moment, queue state, reduced motion, keyboard focus, small screens and imports; capture matching evidence and perform a correction pass. Record every failed, skipped or unavailable check explicitly in the append-only verification record. Do not infer complete acceptance from passing unit tests or screenshots alone.
