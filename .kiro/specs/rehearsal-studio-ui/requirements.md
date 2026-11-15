# Requirements Document

## Introduction

Rehearsal Studio UI is a presentation, layout, interaction-organization and copy overhaul of the Ghost Rehearsal workbench. The target is a "ghost rehearsal control room": a dark, precise, professional workbench with light mystery, where real simulated crowd flow and the diverging fates of the same guests are the visual subject.

The overhaul merges the existing Build, Rehearse and Two Futures modes, the visitor journey and the first-run screens into one consistent experience. It keeps every existing capability: node editing, connections, stages, templates, undo/redo, viewport controls, event-driven ghost replay, synchronized A/B comparison, the full participant roster, the single-visitor two-timeline journey, observation-cutoff and final statistics scopes, stale-result detection, Chinese/English text, local save, import/export and keyboard access. No capability is replaced by a simplified version.

This Spec is independent of `product-foundation`, `comparison-evidence-contract` and `guided-decision-demo`. Those Specs stay unchanged. This Spec inherits their data and evidence rules and does not redefine them. It reuses the existing simulation, schema, analysis, fingerprint and persistence modules. Any behavior change in those modules is out of scope unless a requirement below names it, and each such change is explained and verified separately.

Baseline observed in the repository before this Spec (used to make requirements concrete, not as a design):

- Baseline commit: `origin/codex/comparison-guided-demo` at `40dc58deb073450f10b4d0aa64a79c22dc19d17f`. The commit `cbe1a834431bfe9a24817d64632bd8ec9071fca3` named earlier is an ancestor of it; the remote branch has advanced since. Work branch: `kiro/ui-visual-polish`.
- `src/app/styles.css` is a single stylesheet of about 1,660 lines. It defines colors and fonts as variables and has one radius token and one shadow token, but no spacing, control-height or surface-elevation tokens. It uses auxiliary font sizes from 9 px to 11.5 px in many rules, and uses `!important` on four lines (two target third-party React Flow selectors, one is the reduced-motion rule and one is the `.scope-note` rule).
- Plan A is shown in warm orange in the plan list (`.plan-card.is-a`) and in mint in metric badges (`.ab-value`). Gain deltas (`.delta.good`) use the same mint as Plan A.
- The canvas layer (`HauntedBackdrop` in `Icons.tsx`) renders moon, bats, cobweb, pumpkins and fog behind the flow on every non-compact canvas, which means in Build and Rehearse and not on the two Two Futures canvases.
- `CompareReport.tsx`, `Journey.tsx` and `comparisonText.ts` contain inline Chinese/English strings (`t.lang === 'zh' ? … : …`) that bypass `src/i18n/messages.ts`.
- `ComparisonSnapshot` (a local component in `CompareReport.tsx`) shows completed-count change, average-wait change and resource cost.
- The comparison validity gate is `comparisonReady` in `App.tsx`: plans and runs exist, `compatibleRuns` holds (both runs succeeded, same scenario key, model version and run mode), and neither run is stale.
- Replay advances by 30 scenario seconds per real second at 1× (`App.tsx` playback timer), and playback starts automatically after a run and when a mode is entered with current results. The speed choices are 0.5×, 1×, 2×, 4× and 8×.
- The Visitor_Journey people list shows 20 guests per page (`PAGE_SIZE` in `Journey.tsx`). Its page number and search text are local to that view and are not retained after it closes.
- `styles.css` already contains a `prefers-reduced-motion: reduce` rule that disables CSS animation and transition. The canvas viewport placement still animates (`setViewport` with a duration), and `Journey.tsx` already switches `scrollIntoView` to non-smooth behavior under that preference.
- `e2e/smoke.spec.ts` and `e2e/demo/comparison.spec.ts` run the production Worker through the Playwright projects in `playwright.config.ts` (1440×1000 and 390×844, in both languages) and depend on class names such as `.outcome-table`, `.people-stats`, `.people-list`, `.ghost-id` and `.diff-note`. No project uses 1366×768.

New behavior this round (explicitly approved; each is also marked "New behavior this round" in its requirement):

- Reduced motion (Requirements 5.4 and 28.8 to 28.11): with the reduced-motion preference set, results display as usual but replay is paused by default after a run and the user can still start playback manually, and both CSS motion and programmatic smooth scrolling or canvas animation are disabled.
- Two-canvas arrangement (Requirements 19.2, 19.3 and 19.12 to 19.15): an "Auto / Top-bottom / Left-right" option for the two Two Futures canvases, default Auto, with top-bottom forced at 980 px or narrower and the saved preference restored when the viewport is wide again.
- Touch targets (Requirements 1.10 and 27.9): at 980 px or narrower, key buttons and actions have an effective hit area of at least 44×44 CSS px.

Facts corrected against the baseline code (the requirements below now follow the code):

- The replay base rate is 30 scenario seconds per real second at 1×, and the speed choices are unchanged (Requirement 13.5).
- The people list keeps its existing 20 guests per page; this round does not change the page size (Requirement 22.3).
- Time precision is layered: engine computation is unchanged, the replay clock keeps `mm:ss`, waiting durations keep the existing seconds/minutes rule, and display rounding never feeds back into computed data, classification or Delta sign (Requirements 3.6, 13.5, 13.6 and 18.2 to 18.4).
- The longest-queue list and the key-moment list keep their existing lengths and labels, and the tracked-visitor marker keeps its existing size, label and "+N more" behavior (Requirements 14.3, 14.8, 15.2 and 15.4).
- Mode navigation is disabled, not enabled, while a run is computing (Requirement 6.7), and plan differences follow the existing `planChanges` rule, which ignores display-only fields such as names (Requirement 9.10).
- With the same simulation input, run configuration, random seed and model version, the events, statistics and comparison results are identical before and after the UI overhaul (Requirement 35.4).

## Glossary

- **Workbench**: The complete Ghost Rehearsal application screen: top bar, left navigation, canvas stage, inspector, dock and status bar.
- **Top_Bar**: The global header containing the brand, Mode_Navigation, undo/redo, the run or stop action, save, the more-actions menu and the language switch.
- **Mode_Navigation**: The control that switches between Build, Rehearse and Two Futures.
- **Mode_Actions**: The set of actions relevant to the current mode, shown together with Mode_Navigation (for example Run in Build, Play in Rehearse, statistics scope in Two Futures).
- **Plan_Navigator**: The left area that shows the current activity, its plans (A and B) and node search.
- **Canvas**: The React Flow flow stage that draws nodes, stages, edges and ghosts.
- **Flow_Card**: A node drawn on the Canvas.
- **Stage_Card**: The folded card that stands for one top-level subflow in Rehearse and Two Futures.
- **Stage_Frame**: The container that outlines the members of an expanded subflow.
- **Inspector**: The right panel that edits the selected node, edge or plan settings.
- **Dock**: The bottom panel that holds replay controls, the timeline, key moments and detail tabs.
- **Replay_State**: The time-dependent state at the current replay time: who is queued, being served, blocked or finished at that moment. Dragging the timeline changes only Replay_State.
- **Statistics_Scope**: The selected basis of summary numbers: Observation_Cutoff or Final_Statistics (the `cutoff` and `completion` result bases of the existing code).
- **Observation_Cutoff**: The scenario time at which cutoff statistics are taken.
- **Final_Statistics**: The statistics of a run that was executed to completion or to its run limit, using that run's actual end.
- **Comparison_Ready**: The existing validity condition for an A/B comparison: both plans have a successful, non-stale run, and the runs share the same scenario key, model version and run mode (`compatibleRuns`).
- **Comparison_Snapshot**: The at-a-glance summary of completed-count change, average-wait change and resource cost between A and B.
- **Delta**: B minus A for one metric, displayed with sign, unit and direction wording.
- **Plan_Identity_Color**: The stable color that identifies a plan: mint green for A, purple for B.
- **Status_Marker**: A combination of text label, icon and shape that expresses a state. Color may accompany a Status_Marker and never replaces it.
- **Design_Tokens**: Named reusable values for color, surface level, spacing, radius, control height, typography, elevation, motion and focus style.
- **Surface_Level**: One of three elevation tiers: background, panel, overlay.
- **Tracked_Visitor**: The single guest the user follows across Rehearse and Two Futures.
- **Visitor_Journey**: The full-height view that compares one guest's two timelines.
- **First_Divergence**: The first moment at which the same guest's recorded state differs between A and B, as computed by the existing `firstDifference` analysis.
- **Run_State**: One of: not run, computing, run complete, stopped, run failed, result stale, empty roster, no difference, no evidence.
- **Evidence**: Raw event records, per-station durations, resource records and statistics that support a displayed conclusion.
- **Example_Project**: The built-in synthetic two-plan Open House example.
- **Desktop_Compact**: A 1366×768 CSS-pixel viewport. A primary acceptance viewport.
- **Phone**: A 390×844 CSS-pixel viewport. A primary acceptance viewport.
- **Desktop_Wide**: A 1440×900 CSS-pixel viewport. An additional check.
- **Narrow_Screen**: A viewport 980 CSS px wide or narrower, which is the existing responsive breakpoint.
- **Touch_Target**: The effective hit area of a control, which may be larger than its visible icon or label.
- **Reduced_Motion_Preference**: The system setting `prefers-reduced-motion: reduce`.
- **Arrangement_Preference**: The user's choice of Auto, Top-bottom or Left-right for the two Two Futures canvases, kept outside the project document.
- **Guest_State**: One of the existing guest status kinds: not arrived, waiting (queued, held or blocked), in service, moving, left, done.
- **Covered_Time**: The scenario time span from 0 to the end of the recorded events of the run that the replay covers.
- **Baseline_Commit**: `40dc58deb073450f10b4d0aa64a79c22dc19d17f` on `origin/codex/comparison-guided-demo`.

## Requirements

### Requirement 1: Surface and spacing design tokens

**User Story:** As a user, I want a calm, consistent surface hierarchy, so that panels, overlays and controls look related and the important element stands out.

#### Acceptance Criteria

1. THE Workbench SHALL define exactly three Surface_Levels (background, panel, overlay) as Design_Tokens, each with its own background token and its own elevation token, where elevation increases in the order background, panel, overlay.
2. THE Workbench SHALL define Design_Tokens for spacing, corner radius, control heights, border color, three text color tiers (primary, secondary, muted) and elevation, and THE Workbench SHALL reference these tokens in all component styles, with no literal length, color or shadow values except 0, none, auto, inherit and 100%.
3. THE Workbench SHALL use one control-height token for each control size (small, medium and large) across buttons, inputs, selects, tabs and menu items.
4. THE Workbench SHALL render buttons, inputs, badges, tables, menus, toasts, dialogs and keyboard focus indicators from shared token-based styles, and THE Workbench SHALL draw each keyboard focus indicator as an outline at least 2 px wide that is clearly visible against the adjacent background with a contrast ratio of at least 3:1.
5. THE Workbench SHALL apply emphasis effects (gradient fills, colored glow, and borders on both a container and its direct child on the same edge) only to primary actions, the current selection, the Tracked_Visitor, and elements in a stale, failed, blocked or first-divergence state.
6. THE Workbench SHALL keep the values of the existing background, panel and overlay color tokens (the dark charcoal and ink-purple base palette) unchanged from their values before this change.
7. THE Workbench SHALL take the background and elevation of every panel, card, menu, dialog and toast from exactly one of the three Surface_Levels, using the panel level for panels and cards, and the overlay level for menus, dialogs and toasts.
8. THE Workbench SHALL render text with a contrast ratio of at least 4.5:1 against its background, and large text with a contrast ratio of at least 3:1, measured against the Surface_Level on which the text is rendered, with disabled controls exempt.
9. WHILE an element is in a stale, failed, blocked or first-divergence state, THE Workbench SHALL render that element with the emphasis style (gradient, glow or border) defined for that state, and THE Workbench SHALL remove the emphasis style when the element leaves that state.
10. WHILE the viewport is a Narrow_Screen, THE Workbench SHALL apply the Touch_Target rule of Requirement 27.9 to the controls styled by the shared control-height tokens. **New behavior this round.**

### Requirement 2: Color semantics and plan identity

**User Story:** As a user, I want colors to mean one thing each, so that I can tell plans, brand actions and live states apart.

#### Acceptance Criteria

1. THE Workbench SHALL use warm orange only for the brand mark and for primary action controls, and SHALL NOT use warm orange for any Plan_Identity_Color, Status_Marker or metric tone.
2. THE Workbench SHALL use mint green as the Plan_Identity_Color of Plan A and purple as the Plan_Identity_Color of Plan B, and SHALL NOT use either color for the brand, primary actions, Status_Markers or metric tones.
3. THE Workbench SHALL render the Plan_Identity_Color of each plan with one identical color value in every plan-specific location: plan badges, the plan list, comparison tables, canvas titles, timeline track labels and exports shown on screen.
4. THE Workbench SHALL express each of the five states (queueing, serving, blocked, finished and left-early) with its own Status_Marker, such that no two of the five Status_Markers share the same color and icon or shape combination, and no Status_Marker uses a Plan_Identity_Color.
5. THE Workbench SHALL express each of a metric gain, a regression and a cost with a Status_Marker made up of a sign, an icon and a wording label, so that each tone stays identifiable when color is not perceived.
6. THE Workbench SHALL present each of the following states with at least one non-color indicator (a text label, an icon or a shape) in addition to color: selected, error, plan-difference, running, stale, tracked, blocked and queueing.
7. THE Workbench SHALL render text at a contrast ratio of at least 4.5:1 and large text at a contrast ratio of at least 3:1 against the Surface_Level on which it is rendered, and SHALL render focus indicators and the borders of interactive controls at a contrast ratio of at least 3:1, with disabled controls exempt.

### Requirement 3: Typography and numeric display

**User Story:** As a user, I want readable text and aligned numbers, so that I can scan values and compare them without effort.

#### Acceptance Criteria

1. THE Workbench SHALL keep the base body text size of 14 CSS px (the existing root size) on all Workbench screens outside the Canvas.
2. THE Workbench SHALL use the installed Inter family for node names, forms, buttons, tables and menus, the installed Fraunces family for the brand name and for page-level and section-level headings only, and the installed JetBrains Mono family for times and numbers.
3. THE Workbench SHALL display times, counts, durations and deltas with tabular digits, so that every digit 0 to 9 has the same advance width and digits in the same position align vertically within a column.
4. WHEN the Canvas zoom level changes, THE Canvas SHALL keep its existing level-of-detail switching (near, mid and far, as defined by `detailAt` in `Canvas.tsx`), so that card text that is shown remains legible and text that cannot be shown legibly at the current level is omitted instead of shrunk.
5. THE Workbench SHALL display each quantity with one unit family through the existing helpers (`formatWait` for waiting and durations, `formatPersonTime` for summed waiting and `formatHours` for hours), and SHALL NOT mix these units in one figure: headcount as people, passes as visits, summed waiting as person-minutes, and durations as seconds or minutes.
6. THE Workbench SHALL apply the following layered precision rule:
   - The simulation engine's computed values and recorded events are unchanged by the user interface.
   - The replay clock keeps its existing `mm:ss` display (`formatTime`: whole seconds, with minutes not converted to hours).
   - Waiting durations keep the existing display rule (`formatWait`: seconds with one decimal below one minute, minutes with one decimal otherwise).
   - Summed waiting keeps person-minutes with one decimal, hours keep one decimal, and headcounts and visits are whole numbers.
   - Display rounding is never written back into computed data, never affects population classification (including the waiting-threshold groups), and never changes the sign of a Delta.
7. THE Workbench SHALL NOT render auxiliary text (captions, helper text, badges and table footnotes) smaller than 12 CSS px, except for text on third-party attribution links.
8. IF an installed font family fails to load, THEN THE Workbench SHALL render the affected text in the generic sans-serif family for Inter, the generic serif family for Fraunces, or the generic monospace family for JetBrains Mono, and SHALL keep the sizes required by criteria 1 and 7.
9. IF a metric value is unavailable or is not a finite number, THEN THE Workbench SHALL display a placeholder dash with no unit in place of the value, and SHALL NOT display "NaN", "Infinity", or a substituted 0.
10. THE Workbench SHALL display each non-zero Delta with an explicit "+" or "−" sign and with the same unit helper as its metric.

### Requirement 4: Stylesheet organization

**User Story:** As a maintainer, I want the style code organized by purpose, so that later changes do not depend on rule order accidents.

#### Acceptance Criteria

1. THE Workbench SHALL place every style rule in exactly one of seven named groups (tokens, base, components, layout, mode-specific rules, responsive rules, motion), and SHALL declare the group order explicitly as tokens, base, components, layout, mode-specific rules, responsive rules, motion, either as ordered layers or as ordered files.
2. THE Workbench SHALL define each component's unconditional rules in exactly one location, so that no two rules with the same selector set the same property for the same component unless the later rule sits inside a mode-specific, responsive, or motion group and applies only under that group's condition.
3. THE Workbench SHALL contain zero `!important` declarations, except in rules that target third-party library selectors and in rules inside the reduced-motion preference condition.
4. THE Workbench SHALL contain zero style rules whose selectors match no element rendered by the source code after the overhaul, including rules for components that the overhaul deletes or replaces.
5. WHERE a presentational component is extracted from `App.tsx` (top bar, mode frame, summary strip, panels), THE Workbench SHALL keep ownership of the existing state in `App.tsx`. The extracted component SHALL receive that state and its handlers as props, SHALL NOT declare its own state for data that `App.tsx` owned before the extraction, and the existing automated test suite SHALL pass. Existing test selectors MAY be adjusted when the UI changes, but no assertion SHALL be deleted or loosened.

### Requirement 5: Decorative atmosphere

**User Story:** As a user, I want a festive tone on entry screens and a clear working surface on the canvas, so that the theme supports the work.

#### Acceptance Criteria

1. WHILE the Canvas shows a flow with at least one node in Build or Rehearse, THE Workbench SHALL render the moon, bats, cobweb and pumpkin decorations (the existing `HauntedBackdrop`) at reduced prominence compared with entry screens, beneath all nodes, edges, ghosts and labels, so that no decoration hides any node, edge, ghost or label and no decoration intercepts pointer input.
2. WHILE the screen is the welcome screen, a new-activity screen, an empty state (a Canvas with zero nodes) or template selection, THE Workbench SHALL show the moon, bats, cobweb and pumpkin decorations at the unreduced prominence defined for entry screens, with all four decoration types visible.
3. THE Canvas SHALL draw ghost graphics only for participants present in the recorded playback state at the current replay time, up to the existing per-card display limit, SHALL show the number of undrawn participants as required by Requirement 15.4, and SHALL NOT draw any ghost graphic as decoration inside the flow area.
4. WHILE the Reduced_Motion_Preference is set, THE Workbench SHALL render all decorations as static, with no animated movement, flapping, drifting or fading, and WHEN the preference changes while the page is open, THE Workbench SHALL apply the new setting without a page reload. The replay and scrolling consequences of the preference are specified in Requirements 28.8, 28.10 and 28.11 (**New behavior this round**).
5. WHEN the user moves from an entry screen to a Canvas showing a flow, or back, THE Workbench SHALL apply the decoration prominence defined in criterion 1 or criterion 2 for the new screen.
6. WHERE a Canvas is compact (each of the two Two Futures canvases), THE Canvas SHALL omit the decorations, as the existing implementation does.

### Requirement 6: Global top bar and mode navigation

**User Story:** As a user, I want one clear global header, so that I always know the current mode and what I can do in it.

#### Acceptance Criteria

1. THE Top_Bar SHALL display, in every mode, the brand, the Mode_Navigation, an undo control, a redo control, the run action (replaced by a Stop action while a run is computing), a Save action with a save state indicator, one more-actions menu (import, export, plan and scenario JSON, run scope and about) and the language switch.
2. THE Mode_Navigation SHALL display exactly three items in this order: Build, Rehearse and Two Futures.
3. WHEN a mode becomes the current mode, THE Mode_Navigation SHALL mark that item with `aria-selected="true"` and a visible text-bearing or shape-bearing marker that is distinguishable without color, and SHALL set `aria-selected="false"` on the other two items.
4. THE Workbench SHALL display the Mode_Actions of the current mode adjacent to the Mode_Navigation or in the stage header, and SHALL keep each Mode_Action at the same screen position when the mode state changes within the same mode.
5. IF a Mode_Action is unavailable in the current state, THEN THE Workbench SHALL display the action as disabled with a reason text that is visible without hover or focus (for example "Add a second plan to compare") and is also exposed as the accessible description of the action.
6. THE Workbench SHALL place each global action in exactly one primary location, and SHALL present secondary management actions only inside a context menu or overflow menu, not as permanently visible buttons.
7. WHILE a run is computing, THE Top_Bar SHALL display a Stop action and SHALL keep the Mode_Navigation visible and disabled, as the existing implementation does.
8. WHEN the user activates the Stop action, THE Workbench SHALL cancel the run, remove the Stop action, leave previously computed results and the project data unchanged, and show a notice that the run was cancelled.
9. IF the current activity name or plan name exceeds the available width in the Top_Bar, THEN THE Top_Bar SHALL truncate the name with an ellipsis, SHALL expose the full name on pointer hover and on keyboard focus, and SHALL set the full name as the element's accessible name.

### Requirement 7: Activity and plan navigation

**User Story:** As a user, I want a compact left area that says which activity and plan I am working on, so that I never lose my place.

#### Acceptance Criteria

1. THE Plan_Navigator SHALL show the name of the current activity, the name of its A plan and the name of its B plan, each with its Plan_Identity_Color badge, and a node search field.
2. WHEN the user selects a plan, THE Plan_Navigator SHALL show which plan is A and which plan is B and SHALL mark the plan being edited in Build with a visible indicator that appears on only that one plan.
3. THE Plan_Navigator SHALL present rename, duplicate, delete, set-as-B, save-as-template and event settings as context actions of an activity or plan, reachable by pointer and by keyboard, and SHALL NOT show these actions as permanently visible buttons.
4. WHEN the user collapses the Plan_Navigator, THE Plan_Navigator SHALL reduce to a rail that still shows the Plan_Identity_Color badges of the A plan and the B plan, and WHEN the user expands the rail, THE Plan_Navigator SHALL restore the full content of criterion 1.
5. WHEN the user types in the node search field, THE Plan_Navigator SHALL filter the node list of the current plan to nodes whose name or node type name contains the typed text, ignoring letter case, and WHEN the user activates a listed node by pointer or by keyboard, THE Plan_Navigator SHALL select that node.
6. WHEN the user changes the selected activity, THE Plan_Navigator SHALL list only the plans of that activity, SHALL clear the node search field, and SHALL show an empty-list indication if that activity has 0 plans.
7. WHILE the Plan_Navigator is collapsed to the rail in Rehearse, THE Workbench SHALL show the flow stage list with a waiting count for each stage, computed from the current replay time.
8. IF the text in the node search field matches 0 nodes, THEN THE Plan_Navigator SHALL show an empty-result indication, SHALL keep the typed text, SHALL leave the current node selection unchanged, and SHALL ignore the Enter key.
9. IF the current activity has no B plan, THEN THE Plan_Navigator SHALL show an empty B-plan slot in place of the B plan name and badge, and SHALL show the set-as-B action only as a context action of a plan.

### Requirement 8: Canvas composition and views

**User Story:** As a user, I want the flow readable on first sight, so that I do not need to zoom and pan before I can work.

#### Acceptance Criteria

1. THE Canvas SHALL provide a default readable view that centers the flow in the canvas and keeps the existing readable zoom floors (`EDIT_ZOOM` in Build and `READABLE_ZOOM` in Rehearse and Two Futures, both in `Canvas.tsx`), so that node names and the configuration values shown on each Flow_Card and Stage_Card are readable.
2. THE Canvas SHALL show two separate actions, one labelled with visible text for the default readable view and one labelled with visible text for the full overview. THE Canvas SHALL mark exactly one of the two actions as active while the viewport matches the view that action produced, and SHALL mark neither as active after the user pans or zooms.
3. WHEN a flow is opened or a run starts, THE Canvas SHALL place the viewport using the default readable view through the existing placement request, and IF the flow fits the canvas at the readable zoom floor, THEN THE Canvas SHALL center it.
4. WHEN the user pans or zooms by dragging, wheel, pinch, keyboard or the zoom controls, THE Canvas SHALL stop automatic viewport placement until the user activates the default readable view action or the full overview action.
5. WHEN the user opens or closes the Inspector, a panel, or the Dock, THE Canvas SHALL keep a viewport that the user has set unchanged and SHALL NOT switch to the full overview. WHILE automatic placement is still active, THE Canvas SHALL re-place the default readable view for the new available area, as the existing resize rule in `src/features/viewport.ts` does.
6. WHEN the user selects a node from the node list, THE Canvas SHALL bring that node into the visible canvas area through the existing focus request, and WHEN the user selects a node on the Canvas itself, THE Canvas SHALL leave the viewport unchanged.
7. THE Canvas SHALL keep the minimap, zoom controls and canvas tools from covering node titles or key information of Flow_Cards and Stage_Cards in the default readable view at Desktop_Compact and Phone, and SHALL keep the existing rule that hides the minimap in a narrow canvas container.
8. WHEN the user activates the full overview action, THE Canvas SHALL place the viewport so that every node and stage is inside the canvas, even if node text falls to a lower level of detail.
9. IF the flow cannot fit within the canvas at the readable zoom floor, THEN THE Canvas SHALL keep the readable zoom in the default readable view and SHALL start at the flow entrance, as the existing placement rule does.
10. WHEN the user activates the default readable view action, THE Canvas SHALL place the viewport using the same rules as criteria 1, 3 and 9 and SHALL mark that action as active.

### Requirement 9: Node cards, stages and edges

**User Story:** As a user, I want nodes that tell me type, name, key setting and status at a glance, so that I can read the flow quickly.

#### Acceptance Criteria

1. THE Flow_Card SHALL present, in reading order (top to bottom in a vertical layout, start to end in a horizontal layout): type icon, node name, key configuration, status.
2. THE Flow_Card SHALL distinguish the selected, error, plan-difference and running states with four different Status_Markers, each with its own text label, icon and shape. WHEN more than one state applies, THE Flow_Card SHALL show the Status_Marker of every applicable state at the same time, and no Status_Marker SHALL hide, replace or overlap another.
3. THE Flow_Card SHALL show each key configuration value with an explicit unit label, keeping the existing detail text produced by `detailOf` in `Canvas.tsx` (for example a service time with its seconds unit, and a staff or device quantity with its unit).
4. IF a node has no key configuration value set, THEN THE Flow_Card SHALL show the text "not set" in the key configuration position and SHALL NOT show a numeric value or unit for it.
5. IF a node name is longer than fits on one line of the Flow_Card, THEN THE Flow_Card SHALL truncate the name to one line ending in an ellipsis and SHALL expose the full name as its accessible name and on hover and keyboard focus.
6. THE Canvas SHALL draw each edge with a direction arrow at the target end, an endpoint marker at each end, and a branch label on every edge that leaves a branching node, and the branch label text SHALL meet the text contrast of Requirement 2.7.
7. WHEN a node is selected, THE Canvas SHALL highlight all of its incoming and outgoing edges and their endpoint markers. WHEN an edge or branch label is selected, THE Canvas SHALL highlight that edge and its two endpoint markers. The highlight SHALL differ from the unhighlighted style by stroke width in addition to color, and THE Canvas SHALL remove the highlight when the selection is cleared or moves to another item.
8. THE Stage_Frame SHALL enclose all of its member nodes with the padding defined by `FRAME_PAD` in `src/features/stages.ts`, SHALL show the subflow title as visible text, and SHALL show a visible association to the Stage_Card that stands for the same subflow, using the same title text and the same stage marker on both.
9. WHEN Flow_Card or Stage_Card dimensions change, THE Canvas, `src/features/stages.ts` and the viewport logic SHALL keep the following correct, and `tests/stages.test.ts` and `tests/canvas.test.ts` SHALL pass with their expectations unchanged:
   - Each edge stays attached to the card it connects.
   - Each Stage_Frame still encloses all of its members with the existing padding from criterion 8.
   - Locate-node brings the target node into the visible viewport.
   - Zoom-to-fit brings all nodes and stages into the visible viewport.
10. WHILE the mode is Two Futures, THE Canvas SHALL mark every node and stage that differs between A and B with a plan-difference Status_Marker. A node or stage differs under the existing `planChanges` rule: it exists in only one plan, or a simulation-relevant field or connection differs, and display-only fields (name, layout, description, notes and provenance) do not count. The marker SHALL appear on each side in which the node or stage exists.

### Requirement 10: Inspector behavior

**User Story:** As a user, I want the inspector to show the important parameters first, so that I can edit a node quickly without scanning every field.

#### Acceptance Criteria

1. WHEN the Inspector opens for a node, THE Inspector SHALL display, from top to bottom, the node name, the core behavior, the common parameters, and then the advanced parameters in sections that are collapsed by default.
2. WHEN the user activates the header of a collapsed advanced section by pointer or by keyboard (Enter or Space), THE Inspector SHALL expand that section, and WHEN the user activates the header of an expanded section, THE Inspector SHALL collapse it.
3. THE Inspector SHALL display a text label naming the unit, adjacent to the value, for each time, headcount, concurrency and resource field.
4. IF a field value fails validation, THEN THE Inspector SHALL show the shared validation messages for the selected item adjacent to the affected section, and the draft handling, the rejection of invalid numeric input and its undo behavior SHALL remain with the existing field logic owned by `kiro/dialog-form-reliability`.
5. WHILE a node is being edited, THE Inspector SHALL display the node's type icon, name and plan in its header.
6. WHEN the user selects a node from the node list, THE Inspector SHALL open for that node with the same content, header and selection state as when the node is selected on the Canvas.
7. WHEN the Inspector opens or closes, THE Workbench SHALL apply the viewport rule of Requirement 8.5 and SHALL keep the selected node visible in the part of the Canvas not covered by the Inspector.
8. WHILE the mode is Rehearse or Two Futures, THE Inspector SHALL display node settings as read-only, SHALL NOT accept edits to any field, and SHALL display a text read-only marker in the Inspector.
9. WHEN the user commits an edit to a parameter, THE Workbench SHALL record the edit in the undo history through the existing commit path, and the draft and commit timing of number fields SHALL remain as owned by `kiro/dialog-form-reliability`.
10. WHEN the user performs undo or redo of a parameter edit, THE Workbench SHALL restore the previous or next value respectively, SHALL keep the same node selected, and SHALL keep the Inspector open for that node.

### Requirement 11: Build interaction preservation

**User Story:** As an existing user, I want my editing tools to keep working, so that the new look does not cost me speed.

#### Acceptance Criteria

1. WHEN the user performs any of the following in Build, THE Workbench SHALL produce the same outcome as the Baseline_Commit: the undo, redo or save keyboard shortcut, multi-select with Shift, Ctrl or Cmd, selection-box drag on empty canvas, hand tool drag, Space-drag or middle-mouse-drag pan, wheel zoom within the existing minimum and maximum zoom limits, double-click add, or right-click context menu.
2. WHEN the user performs connection creation, edge editing, node or plan template insertion, drag-to-arrange, automatic stage-aware layout, project export or project import in Build, THE Workbench SHALL produce the same project data and the same on-canvas result as the Baseline_Commit.
3. WHEN the user exports a project and then imports the exported file, THE Workbench SHALL restore a project with the same nodes, edges, stages, parameters and node positions as the exported project.
4. WHILE the user is in Build, THE Workbench SHALL provide access to the shared validation messages and the checks drawer with at most one click or tap, without leaving Build, and the messages shown SHALL be identical to those shown for the same project on other screens.
5. WHEN the user performs a layout-only action (moving a node, arranging, or resizing a stage, with no change to simulation inputs), THE Workbench SHALL keep existing results displayed and SHALL NOT mark them stale.
6. IF the user imports a file that is not a valid project, THEN THE Workbench SHALL reject the file, show an error message indicating the file could not be imported, and keep the current project unchanged.

### Requirement 12: Rehearse layout and live status

**User Story:** As a user, I want the flow to dominate the Rehearse screen and the live numbers to be easy to scan, so that I can see where people are right now.

#### Acceptance Criteria

1. WHILE the mode is Rehearse, THE Workbench SHALL meet the layout conditions of Requirement 27.2 with the Dock open at its default size, so that the Canvas remains the primary visible region and the user can locate, pan and zoom on it.
2. WHILE the mode is Rehearse, THE Workbench SHALL show a compact live-status area with four counts at the current replay time: guests in the flow, guests waiting (queued, held or blocked), guests being served and guests finished. Each count SHALL have a text label, an icon and a whole-number value of 0 or more.
3. THE Workbench SHALL title the live-status area as the Replay_State and SHALL show the current replay time in minutes and seconds in that title or label. THE Workbench SHALL show the observation-cutoff or final summary in a separate area with a different title that names the Statistics_Scope (Observation_Cutoff or Final_Statistics) and its scenario time in minutes and seconds.
4. WHEN the Statistics_Scope changes, THE Workbench SHALL update the summary area and SHALL leave the Replay_State area, the four live-status counts and the replay time unchanged.
5. WHEN the replay time changes, THE Workbench SHALL update the four live-status counts and the replay time in the Replay_State area and SHALL leave the summary area and the Statistics_Scope unchanged.
6. THE Workbench SHALL compute the live-status counts from the same replay time and playback state that position the ghosts on the Canvas (`playbackAt`), so that the waiting and serving counts equal the sums of the per-node counts shown on the Canvas cards at every replay time. A card draws ghosts up to its level-of-detail limit and shows the remainder as a count.
7. IF no playback state is available for the current plan (for example, no run has produced results), THEN THE Workbench SHALL show the live-status area with an indication that no replay data is available, SHALL NOT show numeric counts of 0 in place of missing data, and SHALL leave the summary area unchanged.

### Requirement 13: Replay controls, timeline and key moments

**User Story:** As a user, I want the replay controls always in the same place, so that I can play, pause and scrub without searching.

#### Acceptance Criteria

1. WHILE the Workbench is in Rehearse or Two Futures, THE Dock SHALL show the play/pause control, reset control, speed selector, replay time and timeline, and SHALL keep each of them at the same on-screen position when a Dock tab or panel opens or closes at an unchanged window size.
2. THE Dock SHALL mark each key moment on the timeline with a Status_Marker that has an icon and an accessible name containing the moment's replay time in minutes and seconds and a text description of the event.
3. WHEN the user activates a key moment marker, THE Workbench SHALL set the replay time to that moment's time, pause playback, and select and locate the related station on the Canvas (the existing `jumpTo`), or leave the selection unchanged if the moment has no related station.
4. WHEN the user drags the timeline, THE Workbench SHALL change only Replay_State (replay time clamped between 0 and the end of Covered_Time, and playback paused) and SHALL NOT change the Statistics_Scope, the observation cutoff, the final summary or the Comparison_Ready condition.
5. THE Dock SHALL show the replay time and the end of Covered_Time as minutes:seconds (the existing `formatTime`: whole seconds, with minutes not converted to hours), and SHALL offer the speed choices 0.5×, 1×, 2×, 4× and 8×, where 1× advances the replay by 30 scenario seconds per real second and the other choices multiply that rate.
6. WHEN the timeline has keyboard focus and the user presses an arrow key, Page Up or Page Down, THE Workbench SHALL move the replay time by the existing step sizes of the timeline control (a native range input with a step of 0.1 scenario second), clamped between 0 and the end of Covered_Time, with playback paused, and THE Workbench SHALL expose the current replay time in minutes and seconds as the accessible value text of the timeline.
7. WHEN playback reaches the end of Covered_Time, THE Workbench SHALL stop playback with the replay time equal to the end of Covered_Time and SHALL show the play control in its not-playing state.
8. WHEN the user activates play while the replay time equals the end of Covered_Time, THE Workbench SHALL set the replay time to 0 and start playback.
9. IF no simulation results are available, THEN THE Dock SHALL show the play/pause control, reset control, timeline and key moment markers as disabled or absent, and SHALL keep the replay time at 0:00.

### Requirement 14: Rehearse detail panels

**User Story:** As a user, I want tidy detail panels that avoid repeating each other, so that I can find queues, events and resources quickly.

#### Acceptance Criteria

1. THE Dock SHALL keep its existing tabs: in Rehearse, Now (longest queues, key moments so far and the Tracked_Visitor), Follow a ghost, Waits and evidence, Resource use and Event log; in Two Futures, One ghost two futures, Waits and evidence, Resource use and Event log. THE Dock SHALL show the full value of each fact (a station's queue length, an event record, a resource figure) in exactly one of them, with other tabs limited to a reference or link to that fact and not a repeated copy.
2. WHEN the user activates the expand control of the Dock or of a Dock detail (full event log, resource tables or station tables), THE Dock SHALL show the full content of that detail, SHALL expose the expanded or collapsed state of the control to assistive technology, and SHALL make the control operable by keyboard.
3. THE Workbench SHALL keep the existing labels "Longest queues now" for the queue list and "Key moments so far" for the event list (and their Chinese equivalents).
4. THE Workbench SHALL NOT use wording, icons or markers that state or imply that a queue length, a display threshold or a "hot" marker shows a proven dangerous capacity or that the marked station is the only bottleneck, and WHERE a "hot" marker is shown, THE Workbench SHALL describe it as based on the display threshold at the current replay time.
5. WHEN the user activates a queue row, THE Canvas SHALL pan and zoom so that the row's station is inside the visible canvas area through the existing focus request, and SHALL NOT change the replay time.
6. THE queue, blocked, service and finished markers in the Dock SHALL use the same text label, icon and shape as the Status_Markers that the Canvas ghosts and cards use for the same states.
7. WHILE a Dock detail is collapsed, THE Dock SHALL show a summary line for it that contains the item count at the current replay time and the name of its first item (the station with the longest queue, or the most recent key event).
8. THE Dock SHALL keep the existing list lengths (currently 4 stations in the longest-queue list and 6 key moments), SHALL order stations by waiting count at the current replay time from largest to smallest, SHALL omit stations whose waiting count is 0, and SHALL list only key moments that occurred at or before the current replay time, ordered from newest to oldest.
9. IF no station has a queue length above 0 at the current replay time, THEN THE Dock SHALL show a text message stating that no one is waiting at that moment in place of the longest-queue rows, and IF no key event has occurred at or before the current replay time, THEN THE Dock SHALL show a text message stating that nothing notable has happened yet in place of the event rows.

### Requirement 15: Tracked visitor

**User Story:** As a user, I want to follow one guest and always find them, so that the crowd view stays meaningful.

#### Acceptance Criteria

1. THE Workbench SHALL allow at most one Tracked_Visitor at a time, chosen through the existing entry points (a ghost on the Canvas, the guest list, a representative guest or a key-moment guest), and SHALL keep those entry points at the same position in Rehearse and in Two Futures.
2. WHILE a Tracked_Visitor is set and located at a station, THE Canvas SHALL draw the Tracked_Visitor first among the guests drawn at that station, SHALL draw its marker larger than any other guest marker, SHALL show its name label (with the full name available on hover or focus), and SHALL show a Status_Marker that differs from the other Status_Markers by shape or text, not by color alone.
3. WHILE a Tracked_Visitor is set and the station that holds the Tracked_Visitor is inside a collapsed Stage_Card, THE Stage_Card SHALL show the Tracked_Visitor first among its ghosts with its name, and THE Dock SHALL show the name of the current station in the tracked status text.
4. WHILE the Canvas draws fewer guests at a station than are present there, THE Canvas SHALL draw the Tracked_Visitor among the drawn guests and SHALL show the number of undrawn guests. THE Canvas SHALL compute both counts from the recorded playback state at the current replay time, so that drawn guests plus undrawn guests equal the guests present at that station.
5. WHEN the user activates "locate" for the Tracked_Visitor, THE Canvas SHALL pan and zoom so that the card of the Tracked_Visitor's current station, or the collapsed Stage_Card that holds it, is inside the visible viewport, and SHALL leave the replay time unchanged.
6. WHILE a Tracked_Visitor is set and is in the system at the current replay time, THE Dock SHALL show the Tracked_Visitor's current station name and state text (the existing status description of not arrived, waiting, in service, moving, left or done), and SHALL update both as the replay time changes.
7. WHILE the mode is Two Futures and a Tracked_Visitor is set, THE Workbench SHALL show the Tracked_Visitor's position, with the marker, name label and Status_Marker from criterion 2, on the canvas of plan A and on the canvas of plan B at the same replay time.
8. IF a Tracked_Visitor is set and has not yet entered or has already left the system at the current replay time, THEN THE Dock SHALL show a text stating that the Tracked_Visitor is not in the system at this time, THE Canvas SHALL NOT draw a Tracked_Visitor marker, and THE Workbench SHALL keep the Tracked_Visitor set.
9. IF the Tracked_Visitor does not exist in the recorded run of a plan, or no recorded run exists, THEN THE Workbench SHALL show the existing prompt to pick a guest, SHALL NOT draw a Tracked_Visitor marker, and SHALL disable the "locate" action until a Tracked_Visitor that exists is chosen.

### Requirement 16: Run states

**User Story:** As a user, I want every situation to say what is happening and what to do next, so that a stopped or failed run never looks like a result.

#### Acceptance Criteria

1. THE Workbench SHALL present each Run_State (not run, computing, run complete, stopped, run failed, result stale, empty roster, no difference, no evidence) with a Status_Marker whose text label is unique to that Run_State, a description of exactly one sentence, and exactly one primary next-action control that is enabled and named for the action it performs.
2. WHILE a run is computing, THE Workbench SHALL show an indeterminate running indicator and an enabled Stop action, and SHALL NOT show a percentage or a progress bar that the worker does not report.
3. IF a run is stopped by the user, THEN THE Workbench SHALL show the stopped Run_State, SHALL keep the plan inputs and any earlier results unchanged under the existing stale rules (a stopped run produces no result), SHALL NOT present any value from the stopped run as a result, and SHALL offer a rerun.
4. IF a run fails, THEN THE Workbench SHALL show the run issues returned by the simulation through the existing notice and checks drawer, SHALL NOT present any comparison from that run as current or as Comparison_Ready, SHALL keep the plan inputs unchanged, and SHALL offer a rerun.
5. WHILE a result is stale because the plan inputs changed after the result was computed, THE Workbench SHALL mark the affected plan with the stale Status_Marker, SHALL NOT use the result as a current comparison or as Comparison_Ready, and SHALL offer a rerun.
6. THE Workbench SHALL display an unknown value as "—" with an explanation that is available by keyboard and touch and not only by hover, an unavailable value as text naming the reason, and a real zero as "0", and SHALL NOT show one for another.
7. WHEN a run reaches the run limit with at least one unfinished or not-arrived guest, THE Workbench SHALL describe the result as a run-limit result, SHALL show the unfinished-guest count and the not-arrived-guest count as two separate whole numbers in people, and SHALL NOT describe it as "everyone finished".
8. IF the roster of a group is empty, THEN THE Workbench SHALL state that the group is empty, SHALL name the active filter and the active search text (or state that none is active), and SHALL offer an action that clears the filter and search when either is active.
9. WHEN no guest differs between A and B under the selected rule, THE Workbench SHALL state that no difference was found under that rule, SHALL name the rule, and SHALL offer an action to choose a different rule.
10. IF the Evidence for a displayed conclusion contains zero records, THEN THE Workbench SHALL show the no-evidence Run_State for that conclusion, SHALL state that zero Evidence records exist, and SHALL NOT present the conclusion as supported.

### Requirement 17: Two Futures overview

**User Story:** As a user, I want the comparison page to answer "what changed and was it worth it" immediately, so that I can read from change to evidence in order.

#### Acceptance Criteria

1. WHEN the user enters Two Futures with Comparison_Ready, THE Workbench SHALL show the Comparison_Snapshot, with the completed-count Delta, the average-wait Delta and the resource cost fully visible in the initial viewport of the report without vertical or horizontal scrolling at Desktop_Compact, and SHALL keep them reachable in the report at Phone and Desktop_Wide.
2. WHEN the Comparison_Snapshot is shown, THE Comparison_Snapshot SHALL display the A plan name, the B plan name, the statement that both plans use the same group of guests, the Statistics_Scope with its time in minutes and seconds, and the Delta direction as "B relative to A" (or its translation in the active interface language).
3. IF the A or B plan name does not fit the available width, THEN THE Comparison_Snapshot SHALL truncate the displayed name with an ellipsis and SHALL make the full name available through an accessible name and a hover or focus tooltip.
4. THE Two Futures report SHALL list its sections in the existing top-to-bottom order: what changed, how the overall results moved, who is affected, where waiting changed, and resource cost. THE Workbench SHALL keep the Visitor_Journey and the evidence entry reachable from the report without leaving Two Futures.
5. THE Two Futures report SHALL present its conclusions in three separate labelled groups for gains, regressions and costs, with each conclusion as one list item, using the Delta classification of Requirement 18.2, and SHALL NOT present the conclusions as a single paragraph.
6. IF a conclusion group has no items, THEN THE Two Futures report SHALL show the group label with the text "none" (or its translation) instead of omitting the group.
7. THE Two Futures report SHALL keep the summary and the three conclusion groups visible at all times, and SHALL place detailed changes, population distributions, station tables and resource details in sections that are collapsed by default and expand when the user activates the section header by pointer or keyboard.
8. WHERE the viewport is Desktop_Compact or narrower, THE Two Futures report SHALL allow the report to be collapsed and expanded with a labelled control, so that the conditions of Requirement 27.2 hold for the canvases while the report is collapsed.

### Requirement 18: Honest delta presentation

**User Story:** As a user, I want the comparison to avoid misleading shortcuts, so that I do not read a loss as a win.

#### Acceptance Criteria

1. THE Workbench SHALL show Plan B with its Plan_Identity_Color and plan name only, and SHALL NOT attach the words "better", "recommended", "winner" or "best" (or their translations) to Plan B in any plan badge, heading or summary. THE Workbench SHALL attach such wording only to an individual metric whose Delta is classified as a gain, and only in that metric's own row or card.
2. THE Workbench SHALL classify each Delta (B minus A) from the unrounded values produced by the engine (waiting as computed, counts as whole numbers) and not from display-rounded text, and SHALL show exactly one of four classifications, each with a Status_Marker consisting of a text label, an icon and a shape:
   - **gain:** a lower waiting time, a lower left-early count, a lower unfinished count, a higher completed count, or a lower headcount, device count, staffed time, device time or overtime.
   - **regression:** a higher waiting time, a higher left-early count, a higher unfinished count, or a lower completed count.
   - **cost:** a higher headcount, device count, staffed time, device time or overtime.
   - **no change:** a Delta of exactly zero.
3. WHEN the average wait decreases, THE Comparison_Snapshot SHALL display the Delta of the completed count, the left-early count and the unfinished count in the same card as the wait Delta, visible without expanding a section or scrolling at Desktop_Compact (and at Desktop_Wide as an additional check), each with its own Status_Marker from criterion 2.
4. WHEN two values displayed for A and B are identical after display rounding and their unrounded Delta is not zero, THE Workbench SHALL show the text "differs below display precision" (or its translation) together with the sign of the Delta, and the classification SHALL follow the unrounded Delta.
5. WHEN a Delta is exactly zero, THE Workbench SHALL show the text "no change" (or its translation) with a Status_Marker that uses a neutral tone and is distinct from the gain, regression and cost Status_Markers. THE Workbench SHALL NOT show this text for a nonzero Delta.
6. THE Workbench SHALL show average waiting and P90 waiting for all arrived guests (including unfinished guests and guests who left early) as the primary waiting statistics. THE Workbench SHALL show the completed-only average and P90 as a secondary statistic with its own text label stating "completed only" (or its translation) and its own sample size, as defined by `comparison-evidence-contract`.
7. THE Workbench SHALL show, in the same card, table or list section as every displayed comparison number, the Statistics_Scope, each side's actual statistics end in minutes and seconds, each side's arrived sample size, each side's not-arrived count, and the count of guests excluded from paired statistics because they are unmatched or did not arrive on both sides.
8. IF a side's completed-only sample contains zero guests, THEN THE Workbench SHALL show text indicating that no guest completed on that side in place of the secondary statistic, SHALL NOT show 0 as its value, and SHALL NOT show a Delta for the secondary statistic. THE Workbench SHALL keep the primary all-arrived statistics and their Deltas unchanged.
9. IF the Statistics_Scope is Final_Statistics and either side has no Final_Statistics, or either run is stale, THEN THE Workbench SHALL NOT show any comparison number or Delta for that scope. THE Workbench SHALL show a message indicating which side is missing final results or is stale, and SHALL NOT substitute observation-cutoff statistics.

### Requirement 19: Two Futures canvases

**User Story:** As a user, I want the two flows side by side or stacked in the way that reads best, so that I can match nodes and people across plans.

#### Acceptance Criteria

1. WHILE the mode is Two Futures, THE Workbench SHALL replay A and B from one shared replay time, so that the replay time shown on both canvases is identical after each play, pause or seek action.
2. WHERE the viewport is wider than a Narrow_Screen, THE Workbench SHALL offer an arrangement control for the two canvases with the options "Auto", "Top-bottom" and "Left-right", with "Auto" as the default, and "Auto" SHALL keep the existing automatic choice that is based on the bounding box of the flow. **New behavior this round.**
3. WHEN the user selects an arrangement manually, THE Workbench SHALL apply it and SHALL keep it as the Arrangement_Preference, without automatic re-selection, through resizing, plan edits, replay and leaving and re-entering Two Futures, until the user selects a different arrangement. **New behavior this round.**
4. WHEN the user expands, collapses or locates a stage or node on one canvas, THE Workbench SHALL apply the same action to the corresponding stage or node on the other canvas, as the existing shared expansion state and focus request do.
5. WHILE the mode is Two Futures, THE Workbench SHALL display on each canvas a marker for each changed node, each corresponding stage and the Tracked_Visitor's position. Markers that refer to the same item on the two canvases SHALL share the same shape and label, and each marker's title SHALL name the plan (A or B) that the marker belongs to.
6. WHEN an event, node or station that belongs to Plan A or Plan B is selected, THE Workbench SHALL open its detail, showing that plan's badge and name and values taken only from that plan, and SHALL NOT show the other plan's data for it.
7. WHILE the mode is Two Futures, THE Workbench SHALL show on each canvas a title that contains the plan badge in Plan_Identity_Color, the plan name and the current replay time. IF the plan name does not fit the title width, THEN THE Workbench SHALL truncate it visibly and make the full name available on hover and keyboard focus. The replay time SHALL follow each change of the replay time.
8. WHILE the mode is Two Futures, THE Canvas SHALL keep both plans read-only by rejecting every edit to nodes, stages and connections (add, delete, move, rename, connect), SHALL display a visible read-only marker on each canvas, and SHALL display an "edit this plan" action on each canvas that reuses the existing enter-Build handler.
9. WHEN the user activates the "edit this plan" action on the canvas of Plan A or Plan B, THE Workbench SHALL switch to Build mode with that plan open for editing and with the other plan unchanged.
10. WHILE the shared replay time is later than the replay end of one plan, THE Workbench SHALL hold that plan's canvas at its final replay state and continue replaying the other plan until the later of the two replay ends.
11. IF the stage, node or Tracked_Visitor targeted by an action in criterion 4 or a marker in criterion 5 has no counterpart on the other canvas at the current replay time, THEN THE Workbench SHALL apply the action or show the marker on the originating canvas only, and SHALL display on the other canvas an indication, whose title names that plan, that no counterpart exists in it. Neither plan's data SHALL change.
12. WHILE the viewport is a Narrow_Screen, THE Workbench SHALL arrange the two canvases top-bottom and SHALL explain in the interface text that the arrangement choice applies at wider viewports. **New behavior this round.**
13. WHEN the viewport becomes wider than a Narrow_Screen again, THE Workbench SHALL restore the user's saved Arrangement_Preference. **New behavior this round.**
14. THE arrangement control SHALL change only the arrangement of the canvas containers, SHALL NOT change any node coordinate, plan data or simulation input, and SHALL NOT mark any result as stale. **New behavior this round.**
15. WHEN the user changes the Arrangement_Preference, THE Workbench SHALL keep the A and B plan identities, the Tracked_Visitor, the replay time and the expanded stages unchanged. **New behavior this round.**

### Requirement 20: Report entry to people and back

**User Story:** As a user, I want a visible path from an affected group to the people behind it, so that I can reach a person in one step and return.

#### Acceptance Criteria

1. THE Two Futures report SHALL show each affected group (waited less, waited more, little change, completed only in A, completed only in B) with its guest count, calculated within the current Statistics_Scope, as a button. A group with a count of 0 SHALL be shown as a disabled button.
2. WHEN the user activates a group button with a count of 1 or more, THE Workbench SHALL open the Visitor_Journey in a single action with the guest roster limited to that group. The number of guests listed SHALL equal the count shown on the button.
3. THE Two Futures report SHALL show each representative guest as one shortcut, labelled with every story that guest represents, and the shortcuts SHALL NOT replace the full roster. The full roster of every guest in the Statistics_Scope SHALL remain reachable in the Visitor_Journey.
4. WHEN the user selects a representative guest shortcut, THE Workbench SHALL open that guest in the Visitor_Journey and SHALL set that guest as the Tracked_Visitor.
5. IF the guest selected from a representative shortcut is not present in the current results, THEN THE Workbench SHALL stay on the Two Futures overview, SHALL show an error message stating that the guest is unavailable, and SHALL keep the previous Tracked_Visitor unchanged.
6. WHILE the Visitor_Journey is open, THE Workbench SHALL keep an action that returns to the overview visible without scrolling in the stage header (the existing comparison focus control), and THE Visitor_Journey SHALL show a "Back to overview" action in its own header.
7. WHEN the user activates a return-to-overview action, THE Workbench SHALL return to the Two Futures overview, and the overview SHALL show the same plans, Statistics_Scope and threshold that were selected before the Visitor_Journey was opened.

### Requirement 21: Resource cost

**User Story:** As a user, I want to see what a plan costs in people and equipment, so that gains are weighed against real cost.

#### Acceptance Criteria

1. WHEN the Two Futures report is displayed or the selected Statistics_Scope changes, THE Two Futures report SHALL show, for the selected Statistics_Scope, the resource changes of B relative to A: the staff headcount difference in people, the device-count difference in devices, the staffed-time and device-time differences in hours, and the overtime difference in the existing duration format, each with an explicit plus or minus sign (zero is shown without a sign).
2. THE Workbench SHALL express resource cost only in people, devices, hours and overtime in the existing duration format (seconds or minutes).
3. THE Workbench SHALL NOT show currency amounts, return on investment or monetary estimates anywhere in the Two Futures report.
4. WHEN the headcount, device count, staffed time, device time and overtime of A equal those of B in the selected Statistics_Scope, THE Workbench SHALL display the text "Resources and scheduled time unchanged" (or its translation in the active language) in place of the difference values.
5. THE Workbench SHALL display summed waiting in person-minutes, headcount in people, device count in devices, staffed and device time in hours, and overtime in the existing duration format, and SHALL NOT mix or convert between these units in any single displayed value.
6. IF the headcount, device count, staffed time, device time or overtime value is unavailable for A or B in the selected Statistics_Scope, THEN THE Two Futures report SHALL show a "not available" indication for that difference instead of a number, SHALL NOT show zero for it, and SHALL still show the differences that can be calculated.

### Requirement 22: Visitor journey hierarchy

**User Story:** As a user, I want the person view to put the person first and the evidence below, so that "same ghost, two futures" is the story.

#### Acceptance Criteria

1. THE Visitor_Journey SHALL arrange its content in the following order from top to bottom: (1) the guest's name or ID, arrival information, and every guest attribute the simulation uses as an input; (2) the A and B replay state and outcome under the selected Statistics_Scope; (3) the First_Divergence summary with a jump action; (4) the A and B timelines on one shared time axis; (5) a per-station table showing wait, service time, and Delta for A and B; (6) the expandable raw event records.
2. WHEN the user opens the Visitor_Journey from Two Futures, THE Workbench SHALL show the overall comparison report in its existing compact form, and the user SHALL be able to return to the full overview with one action.
3. THE Visitor_Journey SHALL show a people list that contains every guest of the selected group, including guests not designated as representative, paginated at the existing 20 guests per page, and this round SHALL NOT change the page size.
4. WHEN the user enters text in the people list search field, THE Visitor_Journey SHALL show only guests whose name or ID contains the text, matched case-insensitively, and SHALL combine this with the selected group filter.
5. THE Visitor_Journey SHALL show the A and B state at the current replay time as an item labeled "replay state", separate from the outcome item.
6. WHEN the Statistics_Scope is a cutoff, THE Visitor_Journey SHALL show the A and B outcome as a separate item labeled "outcome at cutoff"; WHEN the Statistics_Scope is final / run limit, THE Visitor_Journey SHALL label it "outcome at final / run limit".
7. THE Visitor_Journey SHALL keep the raw event records and the station table reachable from the same view with at most one user action, without navigating away from the view and without changing the selected guest.
8. WHEN the user selects another guest, THE Visitor_Journey SHALL update all six sections for that guest and SHALL keep the selected Statistics_Scope and threshold unchanged.
9. IF the search text and group filter match no guest, THEN THE Visitor_Journey SHALL show an empty-list message indicating that no guests match, SHALL keep the search text and filter values, and SHALL keep the currently selected guest displayed.
10. IF the selected guest has no records in A or in B (for example, the guest has not arrived within the Statistics_Scope), THEN THE Visitor_Journey SHALL show an indicator in the affected scenario's state, outcome, timeline, and station sections stating that no data exists for that guest, and SHALL NOT show data from the previously selected guest.

### Requirement 23: Journey timelines

**User Story:** As a user, I want A and B timelines on the same scale, so that I can compare durations by eye.

#### Acceptance Criteria

1. THE Visitor_Journey SHALL draw the A track and the B track on one horizontal time axis with the same start time, the same end time and the same scale.
2. WHEN a segment is drawn, THE Visitor_Journey SHALL set its rendered width to (segment duration ÷ axis time span) × axis pixel width, within a tolerance of ±1 pixel, for both the A track and the B track.
3. WHEN a segment is too narrow to show its text, THE Visitor_Journey SHALL hide the text in the segment. A segment is too narrow when its full text label would be truncated or overflow the segment width. WHEN the pointer hovers over the segment, the segment receives keyboard focus, or the segment is activated, THE Visitor_Journey SHALL show the station, state, start time, end time and duration of that segment. THE Visitor_Journey SHALL remove that display when the pointer leaves the segment, the segment loses focus, or the Escape key is pressed.
4. WHILE a guest's state is still open at the end of the Statistics_Scope, THE Visitor_Journey SHALL draw the last segment ending at the Statistics_Scope end, with an open-ended continuation marker and a visible text label stating that the state continues after the cutoff.
5. WHEN a transition has zero duration, THE Visitor_Journey SHALL draw it as a marker at the transition time that occupies zero time extent on the axis. THE Visitor_Journey SHALL NOT add travel time to the transition or shift the start of the following segment.
6. WHEN the replay time changes, THE Visitor_Journey SHALL move the current-replay-time marker to the new time position on the axis. THE Visitor_Journey SHALL label the marker with text so that it is distinguishable without relying on color.
7. WHERE a First_Divergence exists, THE Visitor_Journey SHALL draw a First_Divergence marker at its time position on the axis. THE Visitor_Journey SHALL label this marker with text so that it is distinguishable from the replay-time marker without relying on color.
8. IF no First_Divergence exists, THEN THE Visitor_Journey SHALL NOT draw a First_Divergence marker.
9. THE Visitor_Journey SHALL make every timeline segment reachable with the Tab key in time order within its track and show a visible focus indicator on the focused segment. WHEN a segment has keyboard focus and the Enter key or Space key is pressed, THE Visitor_Journey SHALL activate that segment with the same result as a pointer activation.

### Requirement 24: First divergence

**User Story:** As a user, I want to see exactly when and where the same guest's two futures split, so that I can understand the cause.

#### Acceptance Criteria

1. WHEN the Visitor_Journey is open in comparison mode for one guest, THE Visitor_Journey SHALL show a First_Divergence card that states the divergence time in the same time format used by the replay clock and, for the A side and for the B side, the station name and the state of the guest, using the existing status description (not arrived, waiting, in service, moving, left or done).
2. WHEN the user activates the card's jump action, THE Workbench SHALL set the replay time to the divergence time, SHALL focus the divergence station on the A canvas and on the B canvas (or on the one canvas whose side has a station, if the other side has none), and SHALL keep the selected guest, both plans, the Statistics_Scope and the wait threshold unchanged.
3. IF the two journeys have no divergence at or before the end of the Statistics_Scope, THEN THE Visitor_Journey SHALL show a message stating that no divergence was found in that scope, SHALL NOT offer an enabled jump action, and SHALL leave the replay time and canvas focus unchanged.
4. THE First_Divergence card SHALL read its time, station and states from the result of `firstDifference` and the recorded journeys of the selected guest, and SHALL NOT contain hardcoded times, guests or station names.
5. WHEN the user activates a station link in the First_Divergence card or in the station table, THE Workbench SHALL open that station in the inspector of the plan that owns it (A-side links open the station in plan A, B-side links open the station in plan B) through the existing station-inspection behavior, and SHALL keep the replay time, selected guest and Statistics_Scope unchanged.
6. IF one side of the divergence has no station at the divergence time (for example the guest has not arrived, has left or is done on that side), THEN THE First_Divergence card SHALL show a text placeholder naming that state in place of the station name for that side and SHALL NOT render a station link for that side.

### Requirement 25: Context kept across navigation

**User Story:** As a user, I want to move between the overview, a person and a station without losing my place.

#### Acceptance Criteria

1. WHEN the user completes the path overview, guest, jump to divergence, view station, back to overview, THE Workbench SHALL show the selected plans, Statistics_Scope, waiting threshold, group filter and selected guest with the same values they had before the path began, and SHALL NOT change any of these values at any step of the path unless the user changes it.
2. WHEN the user returns to the overview, THE Workbench SHALL keep the selected guest set as the Tracked_Visitor.
3. WHEN the user changes the Statistics_Scope, THE Workbench SHALL update the report, both timelines, the per-station times and the resource scope to the new scope, and SHALL NOT rerun the simulation or change the replay time.
4. WHEN the user changes the waiting threshold, THE Workbench SHALL update the group counts, the group lists and the stories, and SHALL NOT rerun the simulation or change the Statistics_Scope.
5. IF a retained value is no longer valid when the user returns to the overview (the page number exceeds the last page of the filtered list, or the selected guest is not in the filtered result), THEN THE Workbench SHALL keep all other retained values and apply the existing adjustment (the page number is clamped to the last available page, and the first guest of the group is selected), and SHALL keep the adjusted guest as the Tracked_Visitor.

### Requirement 26: First-run experience

**User Story:** As a first-time user, I want to know what this tool is and try it in a minute, so that I can see the value before building anything.

#### Acceptance Criteria

1. WHEN the welcome screen or a new-activity screen is displayed, THE Workbench SHALL show, within the first visible content area, one sentence stating that Ghost Rehearsal rehearses an event flow and compares outcomes for the same simulated guests under two plans.
2. WHEN the welcome screen or a new-activity screen is displayed at Desktop_Compact or Phone, THE Workbench SHALL show the "try the two-plan example" action fully inside the initial viewport, with its entire bounding box visible and without scrolling.
3. THE welcome and new-activity screens SHALL present create activity, choose the starting flow (blank or a template) and import project as three separate controls, each with its own label and its own activation target, and each distinct from the "try the two-plan example" action.
4. WHEN the user activates the "try the two-plan example" action, THE Workbench SHALL load the Example_Project and show the Build mode.
5. THE Workbench SHALL create the Example_Project from its built-in definition in memory, without any network request, as the existing implementation does.
6. WHEN the Example_Project loads, THE Workbench SHALL show a notice of no more than two sentences that names the current mode, states the action that runs the rehearsal, and states the action that opens the comparison.
7. THE first-run screens SHALL NOT include a multi-step onboarding tour, which is any sequence of two or more consecutive overlays, coach marks or highlighted steps that the user must advance through.
8. THE Workbench SHALL keep the existing A/B/C guided demo entry and behavior defined in `guided-decision-demo`.
9. WHERE the screen is the welcome screen, THE Workbench SHALL be allowed to show the full festive decorations of Requirement 5.2, and SHALL NOT let the decorations overlap or hide the sentence of criterion 1, the actions of criteria 2 and 3, or their focus indicators.

### Requirement 27: Responsive layout

**User Story:** As a user on a laptop or a phone, I want the workbench to stay usable, so that the flow is never squeezed away.

#### Acceptance Criteria

1. WHILE the viewport is Desktop_Compact or Desktop_Wide, THE Workbench SHALL show the Plan_Navigator, the Canvas, the Inspector or report, the Dock and the status bar together, each with a rendered area and none of them covered by another.
2. WHILE the viewport is Desktop_Compact or Phone, THE Workbench SHALL meet these conditions in each mode and for each panel state (report, Inspector and Dock open or collapsed, and the guest reading state): the main content and key actions are visible and reachable; node titles and key information are readable; the user can locate, pan and zoom on the Canvas; switching between report, guest details and Canvas does not lose state; long tables scroll inside their own area; there is no page-level horizontal overflow; no button is clipped; and no focus enters a hidden area. The guest reading state intentionally hides the Canvas, and no Canvas condition applies while the Canvas is hidden.
3. WHILE the viewport is Desktop_Compact, THE Workbench SHALL show the Plan_Navigator as a rail, and SHALL let the user collapse and expand the report and the Dock with one click or tap on a labelled control.
4. WHILE the viewport is a Narrow_Screen in Two Futures, THE Workbench SHALL provide a labelled switcher with the existing entries (report, flow, guest journey and evidence) and SHALL show exactly one of the views at a time.
5. WHEN the user activates a switcher entry, THE Workbench SHALL show the matching view, hide the other views, and mark the active entry with a visible indicator that does not rely on color alone and with a pressed or selected state exposed to assistive technology.
6. WHILE the viewport is Desktop_Compact, Desktop_Wide or Phone, THE Workbench SHALL keep the document width (`scrollWidth`) at or below the viewport width in Build, Rehearse, Two Futures, Visitor_Journey, the welcome screen and every dialog, in English and in Chinese.
7. IF the content of the Canvas or of a data table is wider than its own area, THEN THE Workbench SHALL provide horizontal panning or scrolling inside that area and SHALL NOT increase the document width.
8. WHEN the interface language changes between English and Chinese, THE Workbench SHALL keep the text of buttons, units, error messages and plan names inside the bounds of their containers by wrapping onto additional lines or by truncating with an ellipsis, and SHALL expose the full untruncated text as the accessible name of any truncated element.
9. WHILE the viewport is a Narrow_Screen, THE Workbench SHALL give key buttons and actions (Top_Bar actions, Mode_Navigation, switcher entries, Dock controls, list item actions and dialog buttons) an effective activation area (Touch_Target) of at least 44×44 CSS px. The Workbench SHALL achieve this by enlarging the hit area and not the icon, without overlapping adjacent Touch_Targets, without causing scrolling or clipping, without enlarging visible buttons in a way that breaks the layout, and without disturbing the keyboard focus order or visible focus indicators. **New behavior this round.**

### Requirement 28: Accessibility

**User Story:** As a keyboard or assistive-technology user, I want to operate every important action and know the state, so that the workbench is usable without a mouse or color vision.

#### Acceptance Criteria

1. WHEN a control receives keyboard focus, THE Workbench SHALL show a focus indicator at least 2 CSS px thick with a contrast ratio of at least 3:1 against its Surface_Level, on every focusable control (Requirement 2.7).
2. WHEN a dialog opens, THE Workbench SHALL move focus to a focusable element inside the dialog and keep Tab and Shift+Tab focus cycling within the dialog until it closes, using the existing `Modal` behavior that this branch SHALL NOT change.
3. WHEN a dialog closes, THE Workbench SHALL return focus to the control that opened it, or to the nearest focusable ancestor of that control if the control no longer exists, using the existing `Modal` behavior that this branch SHALL NOT change.
4. WHEN the user presses Escape while a dialog, menu or drawer is open, THE Workbench SHALL close only the topmost one and return focus to its trigger.
5. THE Workbench SHALL allow play and pause, timeline scrubbing, speed change, guest selection, group filtering, divergence jump and opening and closing of every panel by keyboard alone, with no pointer input.
6. WHEN run state changes to computing, complete, stale or failed, or WHEN a copied or saved notice appears, THE Workbench SHALL announce the change through a live region, using polite politeness for computing, complete, stale, copied and saved, and assertive politeness for failed.
7. THE Workbench SHALL NOT rely on hover alone for any information or action, and SHALL make the same information and action available through keyboard focus and through touch or click.
8. WHILE the Reduced_Motion_Preference is set, THE Workbench SHALL run simulations and display results as usual and SHALL pause replay by default after a run, so that playback does not start automatically after a run or when a mode is entered with current results, and the user SHALL be able to start playback manually with the play control. **New behavior this round.**
9. THE Workbench SHALL give every icon-only control a non-empty accessible name, and SHALL give every chart and timeline a text alternative that states the same numeric values and units shown visually.
10. WHILE the Reduced_Motion_Preference is set, THE Workbench SHALL stop CSS animation and transition, SHALL NOT use smooth scrolling (no CSS `scroll-behavior: smooth`, no `scrollIntoView` with smooth behavior and no programmatic smooth scroll), and SHALL apply canvas pan, zoom and placement changes without animated transitions. **New behavior this round.**
11. WHILE the Reduced_Motion_Preference is not set, THE Workbench SHALL keep the existing normal playback behavior, in which playback starts automatically after a run and when a mode is entered with current results.

### Requirement 29: Bilingual copy

**User Story:** As a Chinese or English reader, I want the same meaning and boundaries in both languages, so that conclusions are not lost in translation.

#### Acceptance Criteria

1. THE Workbench SHALL define every new user-facing string in `src/i18n/messages.ts` in both English and Chinese, with the same message keys and the same interpolation placeholders (names and count) in both languages.
2. WHEN this overhaul is complete, THE Workbench SHALL render all user-facing text in `CompareReport.tsx`, `Journey.tsx` and `comparisonText.ts` from `src/i18n/messages.ts`, with 0 inline English or Chinese string literals remaining in those files.
3. THE Workbench SHALL state each of the following statistics boundaries in both languages, with the same numeric values and the same sample-size placeholders: cutoff versus final, all-arrived versus completed-only, run-limit versus completion, and sample size.
4. IF a message key is defined in one language and missing in the other, THEN THE TypeScript check SHALL fail with a non-zero exit status and an error that names the affected key, through the existing typed catalogue (`const zh: Messages`).
5. WHEN the Workbench renders a list of items, THE Workbench SHALL join the items with ", " in English and "、" in Chinese.
6. WHEN the Workbench renders a number, THE Workbench SHALL show the same digits and the same number of decimals in both languages, using the existing formatting helpers, with any grouping separator applied identically in both languages.

### Requirement 30: Replay and statistics separation

**User Story:** As a user, I want scrubbing the replay never to change my summary, so that I can trust the numbers.

#### Acceptance Criteria

1. THE Workbench SHALL store Replay_State and Statistics_Scope as two independent state values, and SHALL display each under its own visible title in its own distinct panel or region.
2. WHEN the user changes the replay time, THE Workbench SHALL leave the Statistics_Scope selection, the observation cutoff, and every displayed summary value identical (same text, same numeric value) to its value before the change.
3. WHEN the user changes the Statistics_Scope, THE Workbench SHALL leave the replay time identical to its value before the change.
4. WHEN the user changes the Statistics_Scope, THE Workbench SHALL update the displayed summary values and their scope labels.
5. THE Workbench SHALL display, as visible text adjacent to each summary number, a label naming the Statistics_Scope the number belongs to, and SHALL display, as visible text adjacent to each replay-derived number, a label stating the replay time it belongs to.
6. IF a change to the replay time or the Statistics_Scope cannot be applied (for example, the value is outside the valid range or the required data is unavailable), THEN THE Workbench SHALL keep the previous replay time, Statistics_Scope, and summary values, and SHALL display an error message indicating which setting was not changed.

### Requirement 31: Comparison validity and evidence snapshots

**User Story:** As a user, I want a comparison to appear only when it is valid, and old evidence to stay tied to its run, so that no result is mixed with a later configuration.

#### Acceptance Criteria

1. WHILE Comparison_Ready holds, THE Workbench SHALL show Comparison_Snapshot values, group counts, stories and First_Divergence, and SHALL allow comparison export. THE Workbench SHALL NOT show any of these items, or allow comparison export, while Comparison_Ready does not hold.
2. IF Comparison_Ready does not hold, THEN THE Workbench SHALL replace every comparison number, group count, story and First_Divergence previously shown as current with the Run_State that explains why and a control for its next action, SHALL keep both plans and both runs unchanged, SHALL NOT show comparison numbers as current, and SHALL keep the comparison export option disabled so that no comparison numbers are exported.
3. WHERE the Workbench shows evidence from a previous run, THE Workbench SHALL read every value shown from that run's recorded snapshot (its plan, scenario, run mode and observation cutoff), SHALL label the evidence as a previous run, and SHALL NOT combine any of its values with the current plan, scenario or observation cutoff.
4. THE Workbench SHALL set Comparison_Ready to true if and only if all of the following hold. The second plan exists. Both runs exist. `compatibleRuns` holds, meaning both runs succeeded and have the same scenario key, the same model version and the same run mode. Neither run is stale, meaning that neither run's recorded input key differs from the key of its current plan, scenario and run mode.

### Requirement 32: Real data in every visual

**User Story:** As a user, I want every ghost, number and path to come from real simulation records, so that the visuals never overstate the result.

#### Acceptance Criteria

1. THE Canvas SHALL draw each ghost, count, queue length, key event, First_Divergence marker and trajectory point only if it corresponds to at least one recorded simulation event or statistic in the current simulation result.
2. WHEN the Canvas plays a transfer with a recorded duration greater than 0 ms, THE Canvas SHALL animate that transfer from its recorded start time to its recorded end time, with 0 ms of added travel time or animation time.
3. WHEN the Canvas plays a transfer with a recorded duration of 0 ms, THE Canvas SHALL show the guest at the destination at the recorded timestamp, with no intermediate positions and 0 ms of added travel time or animation time.
4. THE Workbench SHALL display only values read from the simulation result in every figure, label and screenshot, and SHALL NOT display constant or placeholder values in their place.
5. THE Workbench SHALL NOT modify, filter or reorder recorded simulation events or statistics after a run completes, so that every displayed value equals the recorded value at the displayed precision.
6. WHEN playback is at time t, THE Workbench SHALL compute, for each station, the total guests as the count of distinct guests with a recorded arrival at that station in the playback scope. It SHALL compute the remaining guests as the count of those guests with no recorded departure from that station at or before t.
7. THE Workbench SHALL count each guest visit once per station and map each stage to its station with no visit counted in more than one stage.
8. THE Workbench SHALL display headcount (guests), pass-throughs (visits) and person-minutes (minutes) as separate figures, each with its own unit label. No displayed figure SHALL equal their sum.
9. IF a record required to draw an element or compute a figure is missing or unreadable, THEN THE Workbench SHALL omit that element and show an indicator that the value is unavailable in place of the figure. It SHALL NOT substitute an estimated, interpolated or default value, and it SHALL keep all other recorded data unchanged.

### Requirement 33: Stale detection and inputs

**User Story:** As a user, I want results marked stale only when real inputs change, so that renaming or arranging does not discard my work.

#### Acceptance Criteria

1. WHEN the user changes any simulation-relevant input of a plan, scenario, or run setting (run mode, maximum steps, maximum events), THE Workbench SHALL mark the results of every plan affected by that change as stale, display the stale indicator on the canvas and in the metrics area within the same render as the change, and keep the stale results visible and unmodified until the user reruns.
2. WHEN the user changes only the name, description, or notes of an activity, plan, scenario or node, or only the layout (position, size, collapse state) of a node, THE Workbench SHALL keep existing results marked valid, SHALL NOT display the stale indicator, and SHALL NOT change the Comparison_Ready state.
3. WHEN the user starts a rerun for a stale plan, THE Workbench SHALL keep the stale indicator displayed until the new run reaches the succeeded state, and SHALL then replace the stale result with the new result and remove the stale indicator for that plan.
4. IF a rerun of a stale plan ends in the failed state, THEN THE Workbench SHALL keep the previous stale result visible with its stale indicator and SHALL display an error indicating that the rerun failed.
5. WHEN both plans in Two Futures have non-stale results in the succeeded state with the same scenario key, model version and run mode, THE Workbench SHALL set Comparison_Ready.
6. THE Workbench SHALL keep `src/schemas/fingerprint.ts` and the existing stale rules unchanged in this overhaul.

### Requirement 34: Editing boundaries and preserved capabilities

**User Story:** As a user, I want Build to stay editable and the other modes to stay safe, so that results cannot be changed by accident.

#### Acceptance Criteria

1. WHILE the mode is Build, THE Workbench SHALL accept modifications to the selected plan and retain each accepted modification in the current project state.
2. WHILE the mode is Rehearse or Two Futures, THE Workbench SHALL keep every displayed plan read-only, and SHALL display an "edit this plan" action for each displayed plan.
3. IF the user attempts to modify a plan while the mode is Rehearse or Two Futures, THEN THE Workbench SHALL leave the plan unchanged and SHALL show an indication that the plan is read-only in the current mode.
4. WHEN the user activates the "edit this plan" action for a plan, THE Workbench SHALL switch the mode to Build, select that plan, and retain all existing plan content and simulation results unchanged by the switch.
5. THE Workbench SHALL keep each of the following capabilities available and behaving the same as before the mode structure was introduced: node and plan templates, the full roster of populations with search and pagination, resource configuration, validation, project import and export, local save and draft recovery, and English/Chinese switching.
6. THE Workbench SHALL keep the observation-cutoff scope, the final-statistics scope, and the waiting-change threshold available, with the same values and results as before the mode structure was introduced for the same project input.

### Requirement 35: Implementation scope and reuse

**User Story:** As a maintainer, I want a bounded change, so that the overhaul does not alter simulation correctness.

#### Acceptance Criteria

1. THE overhaul SHALL be limited to presentation, layout, interaction organization and copy (including the three behaviors marked "New behavior this round"), and, apart from tests, documentation and this Spec, SHALL modify only files in `src/app`, `src/components`, `src/features/stages.ts`, `src/features/viewport.ts` and `src/i18n`, plus new presentation helper modules that contain no simulation or analysis logic.
2. THE overhaul SHALL reuse `src/simulation`, `src/schemas` (including the fingerprint), `src/features/analysis.ts`, `src/features/project.ts` and the saved-project and local-storage data formats without modification, so that the diff against the Baseline_Commit contains 0 changed lines in those files.
3. IF a behavior change in a file listed in criterion 2 is required, THEN THE delivery SHALL explain the cause and the change in a separate section of the delivery notes, and SHALL include at least 1 automated test that fails before the change and passes after it.
4. WHEN the delivery is verified, THE existing automated test suite SHALL pass with 0 failures, and THE overhaul SHALL satisfy this regression rule: With the same simulation input, run configuration, random seed and model version, the events, statistics and comparison results are identical before and after the UI overhaul. The input and scenario keys produced for the bundled Example_Project SHALL also be identical to those produced at the Baseline_Commit.
5. IF the overhaul finds a business-logic problem outside the scope in criterion 1, THEN THE delivery SHALL report it in a separate section that states its cause, its impact and the verification scope needed, and SHALL NOT include a fix for it in this change.
6. THE overhaul SHALL use only the dependencies already listed in `package.json`, `lucide-react` icons and the local Inter, Fraunces and JetBrains Mono fonts, and SHALL NOT add a remote font, icon or image dependency, so that the built application issues 0 requests to any origin other than its own at load time.
7. WHEN a presentational component is extracted, THE extraction SHALL define its props with explicit TypeScript types and no `any`, SHALL pass the existing handlers without changing their behavior, and SHALL leave the TypeScript type check with 0 errors.
8. THE overhaul SHALL keep the following existing behavior unchanged and explicit: waiting-threshold switching, the cutoff and final statistics scopes, the population definitions, the A/B/C guided demo, resource cost, stale handling and plan-ownership logic.
9. THE overhaul SHALL keep the existing simulation, editor, templates, local save and draft recovery, import and export, and Chinese and English capabilities unchanged.
10. THE overhaul SHALL own visuals and the presentation interactions marked "New behavior this round", SHALL NOT overwrite the `Modal`, `Field` or `NumberInput` components or the form-reliability fixes owned by task B (`kiro/dialog-form-reliability`), and SHALL NOT perform the robustness experiments of task C (`kiro/robustness-lab`) or the data import work of task D (`kiro/measured-inputs`).
11. WHERE a change touches a file that `docs/parallel-release/README.md` lists as owned by another task (task A, `kiro/comparison-demo`, owns `src/app/App.tsx`, `src/app/styles.css`, `src/i18n/messages.ts`, `CompareReport.tsx`, `Journey.tsx`, `Results.tsx`, `comparisonText.ts`, `analysis.ts`, `project.ts`, `package.json` and the test configuration), THE overhaul SHALL limit the change to presentation and SHALL re-sync with the integration branch after the owning task's PR (task A: PR #3) is merged. IF the logic of such a file must change, THEN THE delivery SHALL record the minimal interface requirement and handle it through integration instead of overwriting the file from another branch.
12. THE overhaul SHALL limit changes in `src/components/Dialogs.tsx` and `src/components/Inspector.tsx`, which task B owns, to styling and layout, with no change to focus-trap, field or number-input logic.
13. THE overhaul SHALL NOT add restoration of the guest-list page number, the guest-list search text or the overview scroll position when the user returns from the Visitor_Journey, because the Baseline_Commit does not provide it.

### Requirement 36: Verification and acceptance

**User Story:** As a reviewer, I want checkable acceptance, so that I can verify the overhaul by commands and by real interaction.

#### Acceptance Criteria

1. THE delivery SHALL record, for each of `npm run check` (typecheck and unit tests), `npm run build -- --base=/ghost-rehearsal/` and `git diff --check`, the command exactly as typed, a pass or fail result and the exit code, and SHALL mark any of them that was not run as "not run".
2. THE delivery SHALL run `npm run test:browser` against the production build with the real Worker (the Playwright web server builds and previews the production bundle), and SHALL record the command, the pass or fail result, and the count of passed, failed and skipped tests.
3. THE delivery SHALL add automated tests only for behavior where user interaction changes, and SHALL accept color, spacing and typography through before and after screenshots of the same states in Build, Rehearse and Two Futures at Desktop_Compact and Phone (and at Desktop_Wide as an additional check) together with real interaction.
4. THE delivery SHALL NOT cite README verification history as verification of this change.
5. THE acceptance run SHALL cover Build with the Example_Project: open it, select a node, expand the Inspector, edit one parameter, undo, then redo. After each of undo and redo, THE acceptance run SHALL confirm that the edited parameter shows the expected value (original after undo, edited after redo), the same node remains selected, and the Canvas zoom level and pan position are unchanged. At Desktop_Compact, THE acceptance run SHALL confirm that the conditions of Requirement 27.2 hold with the Inspector expanded.
6. THE acceptance run SHALL cover a real rehearsal with the Example_Project: run, play, pause, drag the replay time, switch stages, and track a guest. After each step, THE acceptance run SHALL confirm that the Canvas, the live-status area and the replay time display show the same replay time, that the live-status counts of in flow, queued, in service and completed equal the counts in the Replay_State at that time, and that the tracked guest on the Canvas is at the station named in the live-status area. After pause, THE acceptance run SHALL confirm that the replay time does not change over the next 2 seconds.
7. THE acceptance run SHALL cover Two Futures reading with the Example_Project in the order of Requirement 17.4: find the plan changes, the overall results, the affected groups, one guest's journey and the resource cost, and SHALL confirm that each is reachable from the Two Futures page without leaving it.
8. THE acceptance run SHALL verify, for guest `side-stream:10` of the current Example_Project, that the First_Divergence is displayed as 03:30 with A queueing and B serving, and that after the jump to the divergence the replay time displays 03:30, the tracked guest is `side-stream:10`, and the station shown on the Canvas is the station named in the divergence. THE delivery SHALL keep the values `side-stream:10` and 03:30 only in test files and SHALL NOT include them in UI code.
9. THE acceptance run SHALL verify scope switching: after a run completes, WHEN the Statistics_Scope is switched between observation cutoff and final, the report, the guest timelines, the per-station times and the resource scope SHALL all show the newly selected scope's title and time, no rerun SHALL start, and dragging the replay time to at least 3 different positions SHALL leave every summary value unchanged.
10. THE acceptance run SHALL verify stale handling in two cases. First, after changing one simulation input (such as a station capacity or a service duration), the affected plan SHALL show the stale Status_Marker and SHALL NOT be used as a current comparison, and after a rerun the stale Status_Marker SHALL be gone and the comparison SHALL show as Comparison_Ready. Second, after renaming a plan or a node, or after moving a node (a layout-only change), no stale Status_Marker SHALL appear.
11. THE acceptance run SHALL verify the guest round trip: filter a group, select a guest, jump to the divergence, view the station, and return to the overview. After the return, THE acceptance run SHALL confirm that the selected plans, Statistics_Scope, waiting threshold, group filter and selected guest match their values before the guest was selected, as required by Requirement 25.1 and 25.2.
12. THE acceptance run SHALL verify, in each combination of Desktop_Compact and Phone (and Desktop_Wide as an additional check) with English and Chinese, that:
    - key copy, buttons, drawers and tables show no untranslated text from the other language and no text clipped without a full-text accessible name;
    - the document width does not exceed the viewport width in Build, Rehearse, Two Futures and Visitor_Journey;
    - every interactive control in the drawers and dialogs reached by Tab shows a visible focus indicator, and closing a drawer or dialog returns focus to the control that opened it;
    - with the browser reduced-motion preference enabled, non-essential CSS animations and transitions are disabled, replay is paused after a run, and canvas pan, zoom and placement and scrolling are not animated;
    - at a Narrow_Screen, key buttons and actions have an effective Touch_Target of at least 44×44 CSS px;
    - in Two Futures, the arrangement control offers Auto, Top-bottom and Left-right, forces top-bottom at a Narrow_Screen with an explanatory text, and restores the saved preference when the viewport is wide again.
13. THE acceptance run SHALL verify, for each of the stopped, run failed, result stale and run-limit states of Requirement 16, that the Workbench shows a Status_Marker, a one-sentence description and one next action, and that no Comparison_Snapshot value from that run is presented as current.
14. IF any acceptance run step in criteria 5 to 13 fails or cannot be run, THEN THE delivery SHALL record that step as "failed" or "not run" with the observed result, and SHALL NOT report the overhaul as accepted.
15. THE browser verification SHALL cover at least Desktop_Compact (1366×768) and Phone (390×844), normal motion and the Reduced_Motion_Preference, English and Chinese key paths, and the overview, guest journey, canvas, A/B/C guide and export paths. Existing test selectors MAY be adjusted when the UI changes, but core coverage SHALL NOT be deleted, real statistical expectations SHALL NOT be edited, and assertions SHALL NOT be loosened to hide a regression.
16. IF the shared Playwright configuration (owned by tasks A and E) has no 1366×768 project, THEN THE UI tests SHALL set that viewport inside this branch's own spec files, and THE delivery SHALL record the minimal interface requirement for the shared configuration instead of editing it.

### Requirement 37: Delivery and records

**User Story:** As a reviewer, I want to know what changed, how it was verified and how to run it, so that the review is quick and honest.

#### Acceptance Criteria

1. THE delivery SHALL be made on the branch `kiro/ui-visual-polish`, created from the Baseline_Commit (`origin/codex/comparison-guided-demo` at `40dc58deb073450f10b4d0aa64a79c22dc19d17f`), and SHALL NOT be made directly on `main` or on task A's branch. THE delivery SHALL record both this commit and the commit `cbe1a834431bfe9a24817d64632bd8ec9071fca3` named earlier, which is an ancestor of the Baseline_Commit.
2. IF the Baseline_Commit lacks any of the work that the baseline above relies on (the A/B/C guide, the waiting thresholds, or the real-Worker browser tests), THEN THE delivery SHALL record, in a message to the user before the first implementation file change, the actual base branch name, the base commit hash, and the list of missing items.
3. THE delivery SHALL include a report at `docs/reviews/ui-visual-polish.md` containing: the branch name; a table with one row per changed file giving the path and a one-sentence description of its main change; design notes; each verification command that was run, exactly as typed, with its real exit status and pass, fail and skip counts; and a list of each remaining issue and known limitation, or the statement "no remaining issues" when there are none.
4. THE delivery SHALL include one before screenshot and one after screenshot of the same state for each of six screens: the welcome or new-activity screen, Build with the expanded Inspector, Rehearse with a Tracked_Visitor, the Two Futures overview, the Visitor_Journey with the First_Divergence, and the Phone viewport. That makes 12 screenshots in total, each labelled with its screen name and "before" or "after", and the before screenshots SHALL be the pre-change baseline screenshots.
5. THE delivery SHALL include local run and review steps as a numbered list that starts from a fresh checkout of the branch and covers installing dependencies, starting the application, running the automated tests, and opening each of the six screens in criterion 4. Each step SHALL give the command or action and the observable result that confirms success.
6. THE delivery SHALL record this round in `docs/kiro/ui-visual-polish-usage.md`, following the existing convention in `docs/kiro/`, and SHALL NOT rewrite the history of the root `KIRO_USAGE.md`. The record SHALL name each Kiro feature actually used in this round, list the files changed with Kiro's help, state each verification result with its real outcome, and state the evidence status of each item as "exported" or "pending". THE record SHALL list this round's Kiro work separately from earlier manual work and earlier Codex work. IF the existing Stop Hook appends a genuine entry to `KIRO_USAGE.md`, THEN THE delivery SHALL keep that entry and report it.
7. IF a Kiro session export or a screenshot has not been exported, THEN THE `KIRO_USAGE.md` entry SHALL mark that item with the word "pending".
8. THE delivery SHALL NOT attribute any Codex work or manual work to Kiro. THE delivery SHALL NOT state that a loaded Hook was executed unless the delivery includes a recorded execution output of that Hook from this round.
9. THE delivery SHALL NOT include any commit to `main`, merge into `main`, or push to the remote `main`. THE delivery SHALL open a Draft PR targeting `kiro/release-integration` that states its dependency on PR #3. After task A's work is reviewed and merged into the integration branch, THE delivery SHALL sync the baseline and review the UI increment. The merge into `main` SHALL happen together with the other tasks at the end of the release and not in this round.
10. THE delivery SHALL leave every file that had uncommitted changes before the work began with its content unchanged by any reset, discard or overwrite, and SHALL NOT include those changes in a commit unless the user approves it.
11. IF any of the 12 screenshots required by criterion 4 cannot be captured, THEN THE delivery SHALL list the missing screenshot by screen name and before or after label, with the reason it is missing, in the report from criterion 3.

### Requirement 38: Completion standard

**User Story:** As a first-time user, I want the interface to answer five questions directly, so that I can act without reading documentation.

#### Acceptance Criteria

1. WHILE the Workbench is in any mode, THE Workbench SHALL display the name of the activity being edited and the name of the plan being edited in the Top_Bar, and SHALL mark the plan being edited in the Plan_Navigator, with all three visible without any click, tap or panel opening.
2. WHILE a rehearsal is running in Rehearse or Two Futures, THE Workbench SHALL show the following, refreshed on each replay clock update. The live-status area SHALL show the current number of guests waiting and the current number of guests being served. The longest-queue list SHALL show the stations with the longest current queues in its existing list length, ordered by current queue length from highest to lowest. The Canvas ghost markers SHALL appear at each station that currently has at least one guest waiting or being served, within the level-of-detail limits.
3. WHEN the user enters Two Futures and results exist for both plans, THE Workbench SHALL display the Comparison_Snapshot and the gain, regression and cost lists without further user interaction. A list with no entries SHALL show an indication that it is empty.
4. WHEN the Visitor_Journey is displayed for a guest who appears in both futures, THE Workbench SHALL display in the First_Divergence card the first journey step at which the two futures differ, including the step name and the time of that step in each future.
5. IF the user enters Two Futures and results are missing for plan A, plan B or both, THEN THE Workbench SHALL display a message identifying which plan lacks results, SHALL NOT display the gain, regression and cost lists, and SHALL keep the current plans and edits unchanged.
6. IF the guest shown in the Visitor_Journey has no step at which the two futures differ, THEN THE Workbench SHALL display in the First_Divergence card an indication that the two futures are identical for this guest.
7. THE Workbench SHALL display exactly one evidence entry control in each of the conclusion, the First_Divergence card and the Visitor_Journey. Each control SHALL be visible without scrolling within its container and SHALL be activatable with one click or tap.
8. WHEN the user activates an evidence entry control, THE Workbench SHALL display the raw event records and the station table, and SHALL keep the current mode, plan selection and guest selection unchanged.
