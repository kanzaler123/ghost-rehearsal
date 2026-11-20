# Ghost Rehearsal — Kiroween 2026 Submission Kit

English submission materials for **Kiroween 2026 (Costume Contest)**. The recording script uses the Haunted Stage Encore build and the synthetic Open House example.

---

## 1. Devpost Entry Copy

### Project Title
**Ghost Rehearsal**

### Tagline (≤ 80 chars)
*Rehearse your event. Follow the same ghosts through two possible futures.*

### Links
- **Live Workbench:** https://kanzaler123.github.io/ghost-rehearsal/
- **Repository:** https://github.com/kanzaler123/ghost-rehearsal
- **Kiro Usage Record:** https://github.com/kanzaler123/ghost-rehearsal/blob/main/KIRO_USAGE.md
- **Demo Video (< 3 min):** `[INSERT PUBLIC YOUTUBE URL BEFORE SUBMITTING]`

### Built With
`typescript` · `react` · `react-flow` · `vite` · `zod` · `vitest` · `playwright` · `web-workers` · `canvas-2d` · `web-audio-api` · `svg` · `mcp` · `kiro`

---

### Devpost Story (Copy & Paste)

#### Inspiration
When you organize an open house, haunted attraction, exhibition, or concert entry, a single staffing mistake—like adding a second check-in desk while leaving kit pickup understaffed—can silently shift bottlenecks downstream and turn queues chaotic. Spreadsheets only show averages; they hide what happens to an individual person caught in a queue.

For **Kiroween's Costume Contest**, we wanted a haunting UI that wasn't just decorative Halloween paint. What if **ghosts** were the exact same 300 simulated guests walking through two alternative event arrangements in parallel—splitting across a spectral rift so organizers can literally see and hear where one person's wait and outcome diverge before the real doors open?

#### What it does
**Ghost Rehearsal** is a zero-backend, browser-based discrete-event simulation (DES) workbench dressed as a **Midnight Haunted Stage**:

- **Midnight Opening & Six-Step Feature Tour:** First-time visitors land on a live atmospheric stage previewing Side entrance guest #10's divergence—no worker spin-up required—with one-click entry into a 60-second A/B guide, a six-step spotlight tour, or custom event setup.
- **Visual Flow Builder (`Build`):** Drag entrances, staffed services, probability/attribute decisions, batch-release waiting areas, merges, exits, and foldable subflow stages on a ComfyUI-inspired canvas with undo/redo, stage-aware auto-layout, reusable node/plan templates, and observed CSV/TSV arrival & service-sample import.
- **Deterministic Discrete-Event Rehearsal (`Rehearse`):** Runs entirely inside a local browser Web Worker. Models shared multi-skill staff and devices (via bipartite matching), shifts, handovers, planned unavailability, opening/closing drain rules, queue capacities, and overflow policies. Every guest uses deterministic keyed random draws (`Common Random Numbers`), so the same guest ID experiences identical baseline conditions across alternative plans.
- **Two Futures, Spectral Soundscape & Fate Card Stage (`Compare`)** replays two synchronized haunted-stage canvases side by side on a shared queue gauge scale. Overload cards pulse with ember and crimson ghost flames, and active routes illuminate with trailing traveller orbs. Selecting a guest pins a rotating gold rune spotlight onto both canvases. **Jump to first difference** shows their first visible divergence (`03:30` for **Side entrance #10**) with aligned timelines and station-level evidence.
  - **Spectral Soundscape (optional, muted by default)** uses Web Audio synthesis with zero external audio files and stays silent under `prefers-reduced-motion`. The rift chord and guest completion bell follow the selected statistics basis. A low-frequency ember pulse plays when a station newly overloads, subject to a cooldown.
  - **Spectral Fate Card Stage & Dual Export** opens an interactive **1200×630 preview modal** directly in the workbench showing the tracked guest's aligned A/B timeline bands, two-colour divergence rift, outcomes, signed waiting delta, and assumption footnote—with one-click **Download SVG** (XML-escaped, standalone) and **Download PNG (2×)** (`2400×1260` pure client-side Canvas rasterization).
- **A/B/C Decision Loop & Robustness Lab.** In the synthetic Open House guide, Plan B splits arrivals 50/50 across two check-in lanes and changes several other operating details. At 30 minutes, completions fall from **43 to 41**, and kit pickup remains congested. **Experiment C** adds one packing worker and **0.5 scheduled staff-hours** to B. The simulated results show **72 completions (+31)**, average wait falling from **17.6 to 15.9 minutes**, and **4 more early departures**. **Robustness Lab** sweeps plans across multiple random seeds and slower-service multipliers in a separate Web Worker.
- **Local-First & Bilingual:** Supports English and Chinese, browser draft branch-recovery, canonical JSON import/export with SHA-256 semantic staleness detection, and readable operational plan exports.

#### How we built it
- **Simulation & Schemas (`src/schemas/`, `src/simulation/`):** Strict Zod schemas, pure graph/resource validators, subflow flattener, synchronous pure-JS SHA-256 input fingerprinting (ignoring layout/name edits while catching simulation-semantic changes), and a deterministic min-heap discrete-event engine running in Web Workers.
- **Midnight Haunted Stage UI & Sensory Layer (`src/components/`, `src/features/soundscape.ts`, `src/features/fateCard.ts`, `src/app/styles/`):** React 19, TypeScript, React Flow (`@xyflow/react`), token-enforced CSS (strict 3-surface midnight violet-black palette meeting WCAG ≥4.5:1 / ≥3:1 contrast), local Canvas 2D atmosphere (`SpectralStageBackdrop`), procedural Web Audio synthesis (`soundscape.ts`), pure standalone SVG generation, and 2× PNG Canvas rasterization (`fateCard.ts`, `FateCardModal.tsx`). All fonts, icons, audio, and art are local—zero external runtime requests.
- **Custom Dev-Time Engine MCP Server (`.kiro/settings/mcp.json`, `scripts/mcp/`):** Zero-dependency JSON-RPC 2.0 stdio MCP server exposing our real simulation engine, Zod/graph validator, and fate-card builder directly to Kiro during development without adding a single byte to the browser bundle.
- **Verification Discipline:** 671 Vitest unit tests across 45 files (including 6 frozen SHA-256 simulation digests, 44 MCP server/protocol tests, and 5 guard-hook tests), 37 release-gate tests, and a 14-job cross-browser Playwright CI matrix covering Chromium, Chromium Touch, WebKit (sharded + dedicated import/comparison suites), and Firefox across desktop (1440×1000) and mobile (390×844) in English and Chinese.

#### How we used Kiro
We used all four Kiro pillars—**Specs, always-on Steering, Hooks, and a custom local MCP server**—to drive the Costume Contest transformation while holding the simulation engine mathematically unchanged (full details and commit traceability in [`KIRO_USAGE.md`](https://github.com/kanzaler123/ghost-rehearsal/blob/main/KIRO_USAGE.md)):

- **Spec-Driven UI Overhaul #1 (`.kiro/specs/haunted-stage-ui/`, commit `55ce3c6`):** Kiro authored the full requirements, design, and task list for the **Midnight Haunted Stage** redesign and implemented it end-to-end across 26 files (+1,076 lines)—collapsing three toolbars into a 52px top bar, keeping both canvases visible above the guest journey on desktop, building `SpectralStageBackdrop`, shared queue scales (`queueScale.ts`), rune route labels (`routeLabel.ts`), and card/mobile fixes while keeping all 6 frozen simulation SHA-256 hashes byte-identical.
- **Kiro-Authored Always-On Steering (`.kiro/steering/haunted-stage.md`, commit `72ffc63`):** Kiro distilled the Haunted Stage UI invariants (zero simulation edits, token-only CSS & WCAG contrast, zero external runtime requests, card/selector compatibility) into an `inclusion: always` steering file so every subsequent Kiro session inherited every guardrail automatically alongside `.kiro/steering/comparison-evidence.md`.
- **Spec-Driven Sensory & Export Encore (`.kiro/specs/haunted-stage-encore/`, commit `2c400bb`):** Guided by both always-on steering files, Kiro wrote the Encore spec and delivered **Spectral Soundscape** (`soundscape.ts`, `useSoundscape.ts`) and **Spectral Fate Card SVG export** (`fateCard.ts`) across 13 files (+762 lines), adding 21 unit tests and 12 real-Chromium Playwright cases (`e2e/ui/encore.spec.ts`) and fixing both desktop (`1366×768`) and mobile (`390px`) first-screen regressions via screenshot debugging.
- **Custom Local Engine MCP Server (`.kiro/specs/ghost-rehearsal-mcp/`, `.kiro/settings/mcp.json`):** Kiro designed and built a zero-dependency local stdio MCP server (`ghost-rehearsal-engine`) exposing 4 read-only tools (`verify_simulation_invariants`, `inspect_guest_divergence`, `validate_event_project`, `render_fate_card_svg`) backed directly by our real DES engine and validated by 44 tests—keeping the live browser app 100% zero-backend and zero-external-requests.
- **Spec-Driven Fate Card Stage & Live MCP Self-Verification (`.kiro/specs/fate-card-stage/`):** Kiro built the interactive **Spectral Fate Card Preview Modal** (`FateCardModal.tsx`) with 2× PNG (`2400×1260`) + SVG dual export, tuned `1366×768` modal chrome via screenshot inspection, passed 16/16 Encore/first-screen Playwright checks and 48/48 smoke checks, and **called its own `ghost-rehearsal-engine` MCP tools live** (`verify_simulation_invariants` 6/6 matched; `inspect_guest_divergence` `side-stream:10` at `03:30`) to prove zero simulation drift.
- **Steering-Guided Polish & Foundational UI Specs:** Under `.kiro/steering/haunted-stage.md`, Kiro also removed opening-scene mouse-parallax drift (`b8165f2`) and authored earlier foundational UI specs (`.kiro/specs/rehearsal-studio-ui/`, `.kiro/specs/ui-creative-redesign/requirements.md`).
- **Automated Hooks (`.kiro/hooks/`):** Our `Stop` Hook (`.kiro/hooks/update-usage-log.json`) executed **six times** end-to-end—automatically appending dated engineering records to `KIRO_USAGE.md`. A companion zero-credit `PostFileSave` command Hook (`.kiro/hooks/guard-haunted-invariants.json`), hardened by Kiro with a non-blocking 150ms stdin reader and 5 unit tests (`tests/guard-haunted-invariants.test.ts`), guards UI/style saves against simulation and CSS contract regressions.

#### Challenges we ran into
1. **Atmosphere vs. Headless Browser Performance:** Adding a full-screen animated Canvas 2D backdrop initially starved Web Worker execution in GPU-less headless Chromium, causing 7 Playwright timeouts. Rendering at `0.5×` resolution with pre-baked glow sprites, capping at 30fps, removing per-frame filters, and pausing behind dialogs restored full test speed without losing visual softness.
2. **Protecting First-Screen Real Estate Across Desktop & 390px Mobile:** During the Encore implementation, adding a text button for the fate card squeezed `.ghost-id` and broke `compare-first-screen.spec.ts` at `1366×768` and `390px`. Kiro caught both regressions via Playwright screenshots, switched the control to an accessible `icon-btn`, isolated a single token-safe `flex-basis: 50%` fix in `responsive.css`, and later evolved the same single button into a wide stage preview modal (`--fate-stage-chrome: 290px`) with zero first-screen impact.
3. **Prototype Collision Bug:** Testing edge-case plan IDs like `constructor` crashed object-keyed lookups; switching affected lookups to `Map` eliminated the white screen.
4. **WebKit ResizeObserver Flicker & Layout Races:** React Flow's synchronous `ResizeObserver` callbacks caused layout loops under WebKit; a small fail-fast `postinstall` RAF-batching patch (`scripts/patch-react-flow.mjs`) plus dedicated multi-repeat WebKit CI jobs stabilized cross-browser rendering.
5. **Waiting and Early Departures.** More early departures can make average waits look shorter. The comparison report shows exclusions from paired waiting groups and provides a separate view for guests who completed the flow. The fate card shows one guest's recorded waits and outcomes under the selected statistics basis.

#### Accomplishments that we're proud of
- Turning a serious discrete-event simulation engine into an unforgettable **Costume Contest** experience where every visual, sound cue, and previewable/exportable SVG & 2× PNG fate card directly encodes real simulation events rather than fake animations.
- Leveraging all four Kiro capabilities cleanly together—including building a zero-dependency local engine MCP server that Kiro called live in the following session to verify 6/6 frozen SHA-256 simulation digests.
- Zero-warning Vite 8 production build with a main app chunk of about `422 kB`, separate vendor and i18n chunks, and zero external runtime network requests.
- 671 unit tests (45 files), 37 release-gate checks, and a 14-job multi-browser CI pipeline gating GitHub Pages deployment.

#### What we learned
- Spec-first guardrails (like freezing six SHA-256 simulation digests and codifying them in `.kiro/steering/haunted-stage.md`) let creative Halloween visuals, Web Audio cues, and interactive preview modals ship quickly without silently corrupting analytical correctness.
- Exposing our real simulation engine through a local dev-time MCP server gives Kiro direct analytical feedback without adding any backend or runtime network dependency to the deployed web app.

#### What's next
- Run a real-world field calibration with an event organizer using our built-in [field-validation worksheet](https://github.com/kanzaler123/ghost-rehearsal/blob/main/docs/field-validation.md) and CSV/TSV observed-input importers.
- Benchmark and optimize the simulation engine toward certified performance at the 10,000-guest protective cap.
- Decompose top-level workbench state in `App.tsx` into domain-scoped hooks as the feature set grows.

---

## 2. YouTube Demo Video Script (Target: 2:45 — strictly under 3:00)

### Recording Setup Checklist
- **Resolution:** 1920×1080 (or 1440×900 viewport zoomed cleanly at 100%, dark mode / Midnight theme).
- **Audio capture.** Use Chromium with Web Audio available and reduced motion off. Record tab audio and voiceover so viewers can hear the rift chord at `03:30`.
- **URL:** Live deployed site `https://kanzaler123.github.io/ghost-rehearsal/` in a fresh Incognito/private window so the **Midnight Opening** appears on first load and language is **English**.
- **Pace:** Keep mouse movements deliberate; pause ~1–2 seconds on key numbers (`43 → 41`, `03:30`, `41 → 72`) and when the **Spectral fate card preview** modal opens on stage.

### Timecoded Shot List & Narration

| Time | On-Screen Action (Exact UI Controls) | Voiceover Script (English) |
| :--- | :--- | :--- |
| **0:00 – 0:22** | Open live URL on **Midnight Opening** (`Give your event a midnight rehearsal.`). Let the drifting midnight backdrop wisps, haunted moon/bats, and **Side entrance #10** rift preview breathe for 2 seconds, then scroll down to the **Follow one guest** preview and scrub the mini timeline slider from `03:30` to `10:55`. | *"What happens to the same guest when you change your event plan? Welcome to **Ghost Rehearsal**, a browser-based event simulator dressed as a Midnight Haunted Stage. The same 300 simulated guests walk through two plans so you can see where queues grow before the real doors open."* |
| **0:22 – 0:42** | Scroll back up and click **Try the 60-second A/B guide** (runs real Web Worker on Open House, lands in **Two Futures**). Point to the synchronized Baseline (A) and Comparison (B) canvases and the summary metrics (`43 → 41` completed, `9` less wait, `9` more wait, `276` changed by less than 1 minute, `6` early departures excluded from the waiting groups). | *"The built-in guide runs in your browser. Plan B adds a second check-in lane and changes other parts of the flow. At 30 minutes, 43 guests have finished in A and 41 in B. Kit pickup remains congested."* |
| **0:42 – 1:28** | Click **Follow the same guest**, then **Jump to first difference**. Turn on **Spectral sound**. Scrub to `03:15` and press **Play replay** so viewers hear the rift at `03:30`. Continue to `08:00` and pause to show both queues and the glowing route. Click **Export fate card** to open the **Spectral fate card preview** modal right on stage—pause 2–3 seconds on the 1200×630 card, click **Download PNG (2×)** (or **Download SVG**), then close the modal. | *"At **03:30**, you hear the first difference. Guest #10 is waiting at ID check in A and being served in B. By **08:00**, they're still at ID check in A and waiting at kit pickup in B. Open their Spectral Fate Card right on stage and export it as a sharp 2× PNG or standalone SVG for your team."* |
| **1:28 – 2:02** | Click **Inspect posts and resources**, then open **More options** in the guide and choose **Inspect packing evidence**. Click **Create C and compare**. Show **41 → 72** completions, **17.6 → 15.9 minutes** average wait, **+0.5 staff-hours**, and **4 more early departures**. Click **Prepare C export**, then **Download C arrangement**. | *"We can inspect the packing constraints and try adding one packing worker in **Experiment C**. In this simulation, 72 guests finish instead of 41. Average wait drops, four more guests leave early, and the extra worker costs half a staff-hour. The download includes C's operating plan and the comparison evidence."* |
| **2:02 – 2:24** | Click **Robustness lab** (briefly show multi-seed × slower-service matrix config, then close). Switch to **Build** mode, briefly show the flow canvas + Inspector (mention Haunted House / Trick-or-Treat templates and CSV/TSV observed-sample import). | *"Need to stress-test beyond one run? **Robustness Lab** sweeps random seeds and slower-service scenarios in an isolated worker. In **Build** mode, organizers can start from Haunted House or Open House templates, import real CSV arrival or service samples, and keep all data local."* |
| **2:24 – 2:45** | Quick cut (4–5 sec) to GitHub / Kiro IDE showing `.kiro/specs/`, `.kiro/steering/haunted-stage.md`, `.kiro/hooks/update-usage-log.json`, and `.kiro/settings/mcp.json` (plus Kiro calling `verify_simulation_invariants`), then return to live **Two Futures** Haunted Stage with live URL on screen. | *"We built the Haunted Stage, Encore, Fate Card Stage, and a local engine MCP server using Kiro Specs, Steering, Hooks, and MCP. Six frozen simulation digests stayed identical, backed by 671 unit tests and cross-browser CI. Try Ghost Rehearsal in your browser."* |

---

## 3. Pre-Submission Checklist (Manual Owner Actions)

- [ ] **Commit, push `main`, & verify green 14-job CI deploy:** Push the Fate Card Stage modal, local engine MCP server, hardened guard Hook, refreshed screenshots, and synced docs to `main`, and confirm the GitHub Actions workflow deploys cleanly to https://kanzaler123.github.io/ghost-rehearsal/.
- [ ] **Record & upload YouTube demo (< 3 minutes):** Follow Section 2 above (with tab audio enabled so the `03:30` rift chord is audible!), upload as **Public**, and replace `[INSERT PUBLIC YOUTUBE URL BEFORE SUBMITTING]` if linking from the repo.
- [ ] **Submit Devpost form:** Select **Costume Contest**, paste Section 1, upload gallery screenshots (`docs/images/opening.png`, `docs/images/workbench.png`, `docs/images/fate-card.png`), and attach the live URL, public GitHub repository URL (with `.kiro/` at root), and public YouTube demo URL.
- [ ] *(Optional local backup — not required in Git)* Export raw Kiro IDE sessions into git-ignored `kiro-evidence/` for private archival.
