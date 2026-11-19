# Ghost Rehearsal — Kiroween 2026 Submission Kit

Ready-to-use English submission materials for **Kiroween 2026 (Category: Costume Contest)**. All numbers, UI labels, commit hashes, and attribution boundaries in this document match the live repository and automated tests.

---

## 1. Devpost Entry Copy

### Project Title
**Ghost Rehearsal**

### Tagline (≤ 80 chars)
*Rehearse your event before real guests arrive—follow the same ghosts across two futures.*

### Links
- **Live Workbench:** https://kanzaler123.github.io/ghost-rehearsal/
- **Repository:** https://github.com/kanzaler123/ghost-rehearsal
- **Kiro Usage Record:** https://github.com/kanzaler123/ghost-rehearsal/blob/main/KIRO_USAGE.md
- **Demo Video (< 3 min):** `[INSERT PUBLIC YOUTUBE URL BEFORE SUBMITTING]`

### Built With
`typescript` · `react` · `react-flow` · `vite` · `zod` · `vitest` · `playwright` · `web-workers` · `canvas-2d` · `web-audio-api` · `svg` · `kiro`

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
- **Two Futures, Spectral Soundscape & Fate Cards (`Compare`):** Replays two synchronized haunted-stage canvases side by side on a shared queue gauge scale. Overload cards pulse with ember/crimson ghost flames; active routes illuminate with trailing traveller orbs; clicking any guest (such as **Side entrance #10**) pins a rotating gold rune spotlight onto both canvases and jumps straight to their **first visible divergence** (`03:30`), with aligned timelines and station-level evidence.
  - **Spectral Soundscape (optional, muted by default):** Pure Web Audio API synthesis (zero external audio files, silent under `prefers-reduced-motion`) fires a soft two-tone rift chord when playback crosses `firstDifference`, low-frequency ember pulses when stations enter overload, and a bright lantern bell on guest completion.
  - **Spectral Fate Card Export:** One click inside any tracked guest's card downloads a standalone, XML-escaped bilingual **1200×630 SVG poster** displaying the guest's aligned A/B timeline bands, two-colour divergence rift, outcomes, signed waiting delta, and honest assumption footnotes—ready to share with an event team.
- **Honest A/B/C Decision Loop & Robustness Lab:** In the built-in synthetic Open House guide, adding a second check-in lane (Plan B, 50/50 split) *reduces* 30-minute completions from **43 → 41** because kit pickup stays choked. Testing **Experiment C** (+1 packing worker, +0.5 scheduled staff-hours) lifts completions to **72 (+31)** and lowers average wait from **17.6 min → 15.9 min**, while transparently reporting the tradeoff (**+4** early departures) instead of claiming a magic winner. **Robustness Lab** sweeps plans across multiple random seeds and slower-service multipliers in a separate Web Worker.
- **Local-First & Bilingual:** Supports English and Chinese, browser draft branch-recovery, canonical JSON import/export with SHA-256 semantic staleness detection, and readable operational plan exports.

#### How we built it
- **Simulation & Schemas (`src/schemas/`, `src/simulation/`):** Strict Zod schemas, pure graph/resource validators, subflow flattener, synchronous pure-JS SHA-256 input fingerprinting (ignoring layout/name edits while catching simulation-semantic changes), and a deterministic min-heap discrete-event engine running in Web Workers.
- **Midnight Haunted Stage UI & Sensory Layer (`src/components/`, `src/features/soundscape.ts`, `src/features/fateCard.ts`, `src/app/styles/`):** React 19, TypeScript, React Flow (`@xyflow/react`), token-enforced CSS (strict 3-surface midnight violet-black palette meeting WCAG ≥4.5:1 / ≥3:1 contrast), local Canvas 2D atmosphere (`SpectralStageBackdrop`), procedural Web Audio synthesis (`soundscape.ts`), and pure standalone SVG generation (`fateCard.ts`). All fonts, icons, audio, and art are local—zero external runtime requests.
- **Verification Discipline:** 616 Vitest unit tests (including 6 frozen SHA-256 simulation digests ensuring UI overhauls never altered simulation outputs), 37 release-gate tests, and a cross-browser Playwright CI matrix covering Chromium, Chromium Touch, WebKit (sharded + dedicated import/comparison suites), and Firefox across desktop (1440×1000) and mobile (390×844) in English and Chinese.

#### How we used Kiro
We kept a strict, evidence-based separation between verified Kiro contributions and work completed by human review or other tools (documented in full in [`KIRO_USAGE.md`](https://github.com/kanzaler123/ghost-rehearsal/blob/main/KIRO_USAGE.md)):

- **Spec-Driven UI Overhaul #1 (`.kiro/specs/haunted-stage-ui/`, commit `55ce3c6`):** On November 18, Kiro authored the full requirements, design, and task list for the **Midnight Haunted Stage** redesign and implemented it end-to-end—collapsing three toolbars into a 52px top bar, keeping both canvases visible above the guest journey on desktop, building `SpectralStageBackdrop`, shared queue scales (`queueScale.ts`), rune route labels (`routeLabel.ts`), and card/mobile fixes while keeping all 6 frozen simulation SHA-256 hashes byte-identical.
- **Kiro-Authored Always-On Steering (`.kiro/steering/haunted-stage.md`, commit `72ffc63`):** On November 19, Kiro distilled the Haunted Stage UI invariants (no simulation edits, token-only CSS & WCAG contrast, zero external runtime requests, card/selector compatibility) into an `inclusion: always` steering file, alongside our existing `.kiro/steering/comparison-evidence.md` guardrails.
- **Spec-Driven Sensory & Export Encore (`.kiro/specs/haunted-stage-encore/`, commit `2c400bb`):** Guided by both steering files, Kiro wrote the Encore spec and implemented both **Spectral Soundscape** (`soundscape.ts`, `useSoundscape.ts`) and **Spectral Fate Card SVG export** (`fateCard.ts`) plus 21 unit tests and 12 cross-viewport Playwright assertions (`e2e/ui/encore.spec.ts`), without touching `src/simulation/**`, `src/schemas/**`, or `TopBar.tsx`.
- **Earlier Specs & Baseline Prep (`.kiro/specs/ui-creative-redesign/`, `.kiro/specs/rehearsal-studio-ui/`):** Kiro authored the 22-requirement UI redesign specification and initial Playwright screenshot baseline (later implemented and verified by Codex).
- **Automated Stop Hook (`.kiro/hooks/update-usage-log.json`):** Executed twice end-to-end—automatically appending verified, non-duplicate task logs to `KIRO_USAGE.md` after both the November 18 Haunted Stage session and the November 19 Haunted Stage Encore session (`6d68e4a`). *(Because Ghost Rehearsal is deliberately zero-backend with zero external runtime requests, we focused Kiro on Specs, always-on Steering, and Hooks rather than forcing an artificial MCP dependency.)*

#### Challenges we ran into
1. **Atmosphere vs. Headless Browser Performance:** Adding a full-screen animated Canvas 2D backdrop initially starved Web Worker execution in GPU-less headless Chromium, causing 7 Playwright timeouts. Rendering at `0.5×` resolution with pre-baked glow sprites, capping at 30fps, removing per-frame filters, and pausing behind dialogs restored full test speed without losing visual softness.
2. **Protecting First-Screen Real Estate Across Desktop & 390px Mobile:** During the Encore implementation, adding a text button for the fate card squeezed `.ghost-id` and broke `compare-first-screen.spec.ts` at `1366×768` and `390px`. Kiro caught both regressions via Playwright screenshots, switched the control to an accessible `icon-btn`, and isolated a single token-safe `flex-basis: 50%` fix in `responsive.css` to pass all 144 UI browser tests.
3. **Prototype Collision Bug:** Testing edge-case plan IDs like `constructor` crashed object-keyed lookups; switching affected lookups to `Map` eliminated the white screen.
4. **WebKit ResizeObserver Flicker & Layout Races:** React Flow's synchronous `ResizeObserver` callbacks caused layout loops under WebKit; a small fail-fast `postinstall` RAF-batching patch (`scripts/patch-react-flow.mjs`) plus dedicated multi-repeat WebKit CI jobs stabilized cross-browser rendering.
5. **Honest Statistics Under Cutoffs:** Comparing average waits naively can mislead organizers when early departures shorten apparent waits. Our shared analysis engine (`src/features/analysis.ts`) enforces paired samples, explicit exclusions, completed-only secondary metrics, and observation-cutoff vs. run-to-completion separation everywhere—including inside the exported SVG fate card.

#### Accomplishments that we're proud of
- Turning a serious discrete-event simulation engine into an unforgettable **Costume Contest** experience where every visual, sound cue, and exported SVG fate card directly encodes real simulation events rather than fake animations.
- Zero-warning Vite 8 production build (`412 kB` main app chunk + clean split vendor & i18n chunks) with zero external runtime network requests.
- 616 unit tests, 37 release-gate checks, and a multi-browser CI pipeline gating GitHub Pages deployment.

#### What we learned
- Spec-first guardrails (like freezing six SHA-256 simulation digests and codifying them in `.kiro/steering/haunted-stage.md`) let creative Halloween visuals and Web Audio cues ship quickly without silently corrupting analytical correctness.
- Keeping tool attribution transparent and verifiable makes multi-session, multi-tool engineering easy to audit and trust.

#### What's next
- Run a real-world field calibration with an event organizer using our built-in [field-validation worksheet](https://github.com/kanzaler123/ghost-rehearsal/blob/main/docs/field-validation.md) and CSV/TSV observed-input importers.
- Benchmark and optimize the simulation engine toward certified performance at the 10,000-guest protective cap.
- Decompose top-level workbench state in `App.tsx` into domain-scoped hooks as the feature set grows.

---

## 2. YouTube Demo Video Script (Target: 2:45 — strictly under 3:00)

### Recording Setup Checklist
- **Resolution:** 1920×1080 (or 1440×900 viewport zoomed cleanly at 100%, dark mode / Midnight theme).
- **Audio Capture:** Enable **system/tab audio recording** alongside microphone voiceover so viewers can actually hear the subtle **Spectral Soundscape** two-tone rift chord at `03:30`!
- **URL:** Live deployed site `https://kanzaler123.github.io/ghost-rehearsal/` in a fresh Incognito/private window so the **Midnight Opening** appears on first load and language is **English**.
- **Pace:** Keep mouse movements deliberate; pause ~1 second on key numbers (`43 → 41`, `03:30`, `41 → 72`) and when opening the downloaded SVG fate card.

### Timecoded Shot List & Narration

| Time | On-Screen Action (Exact UI Controls) | Voiceover Script (English) |
| :--- | :--- | :--- |
| **0:00 – 0:22** | Open live URL on **Midnight Opening** (`Give your event a midnight rehearsal.`). Slowly move cursor over the hero stage (parallax glow + drifting wisps). Scroll slightly to show the interactive preview of **Side entrance #10** and scrub the mini timeline slider from `03:30` to `10:55`. | *"Imagine doubling your event's check-in desks—only to watch **fewer** people finish. Spreadsheets show averages, never what happens to one person caught in a queue. Welcome to **Ghost Rehearsal**: a browser-based event simulator dressed as a Midnight Haunted Stage, where the exact same 300 simulated ghosts walk through two alternative plans in parallel."* |
| **0:22 – 0:42** | Scroll back up and click **Try the 60-second A/B guide** (runs real Web Worker on Open House, lands in **Two Futures**). Point to the synchronized Baseline (A) and Comparison (B) canvases and the summary metrics (`43 → 41` completed, `9` less wait, `9` more wait, `276` within 1 min, `6` early departures excluded). | *"Let's open the built-in 60-second A/B guide—everything runs deterministically inside a local Web Worker, with zero backend or API keys. Plan B splits arrivals 50/50 across two check-in lanes. Yet completions actually **fall** from **43 to 41**."* |
| **0:42 – 1:28** | Click **Follow the same guest** → click the **Spectral sound** (`VolumeX → Volume2`) toggle in the timeline bar to unmute → scrub slightly before `03:30` (around `03:15`) and click **Play** so viewers see AND hear the soft two-tone rift chord right as **Side entrance #10** crosses **03:30** (`ID check`: waiting in A vs. being served in B). Let playback run past **08:00** (or jump/play at 4×) showing glowing routes, trailing orbs, rotating gold spotlight, and amber overload flames on **Kit pickup** (shared queue scale). Pause, then click the **Export fate card** download icon in `.ghost-card` and briefly open the downloaded `ghost-fate-card-side-stream-10.svg` in a tab (2–3 sec) to show the 1200×630 midnight poster! | *"Why? Let's follow **Side entrance #10** across both futures—and turn on **Spectral Sound**, synthesized locally with Web Audio. Watch and listen as we cross **03:30**: that soft two-tone chord marks the exact spectral rift where guest #10 is still waiting at ID check in A, but already being served in B. By **08:00**, B has pushed them downstream straight into a glowing, overloaded **Kit pickup** bottleneck—and one click exports their standalone **Spectral Fate Card** SVG to share with your team."* |
| **1:28 – 2:02** | Return to workbench tab. Click **Inspect posts and resources** → **Inspect packing evidence** (show simultaneous constraints & honest caveat). Click **Create C and compare**. Highlight B → C: completions **41 → 72 (+31)**, average wait **17.6 min → 15.9 min**, alongside **+1 staff (+0.5 staff-hours)** and **+4 early departures**. Click **Prepare C export** → **Download C arrangement**. | *"Let's inspect the packing constraints, then test **Experiment C**: adding one packing worker with matching shifts. Now completions jump from **41 to 72**, and average wait drops by nearly two minutes—while Ghost Rehearsal honestly reports the tradeoff: **+0.5 staff-hours** and **4 more early departures**. One click exports C's complete operating plan and B/C evidence."* |
| **2:02 – 2:24** | Click **Robustness lab** (briefly show multi-seed × slower-service matrix config, then close). Switch to **Build** mode, briefly show the flow canvas + Inspector (mention Haunted House / Trick-or-Treat templates and CSV/TSV observed-sample import). | *"Need to stress-test beyond one run? **Robustness Lab** sweeps random seeds and slower-service scenarios in an isolated worker. In **Build** mode, organizers can start from Haunted House or Open House templates, import real CSV arrival or service samples, and keep all data local."* |
| **2:24 – 2:45** | Quick cut (4 sec) to GitHub / IDE showing `.kiro/specs/haunted-stage-ui/`, `.kiro/specs/haunted-stage-encore/`, `.kiro/steering/haunted-stage.md`, and `.kiro/hooks/update-usage-log.json`, then return to live **Two Futures** Haunted Stage with live URL on screen. | *"We used **Kiro's Spec workflow**, always-on **Steering** (`haunted-stage.md`), and a **Stop Hook** to build both the Midnight Haunted Stage overhaul and this Encore sensory-and-export layer—while freezing six SHA-256 simulation digests and verifying 616 unit tests plus cross-browser CI. Try **Ghost Rehearsal** live right now—no sign-up needed."* |

---

## 3. Pre-Submission Checklist (Manual Owner Actions)

- [ ] **Merge `docs/kiroween-submission-prep` into `main` & verify live deployment:** Push/merge this branch so GitHub Actions deploys **Haunted Stage Encore** (Spectral Soundscape + Spectral Fate Card) plus the updated `README.md`, `KIRO_USAGE.md`, and `docs/kiroween-submission.md` to https://kanzaler123.github.io/ghost-rehearsal/.
- [ ] **Export raw Kiro IDE sessions & screenshots (local archive):** Export the 2026-11-16 (`sess_286db17c-aa87-47be-a7e8-e92b05f746a1`), 2026-11-18 (`sess_114da15d-bf8d-438c-b907-beb37999f9a7`), and 2026-11-19 (`sess_c8ef18f5-67ca-4040-9cec-2e690d222045`) Kiro sessions plus Kiro IDE screenshots (`Included Steering` / `Ask Kiro Hook`) into the git-ignored `kiro-evidence/` folder, then update the "pending export" note if desired.
- [ ] **Record & upload YouTube demo (< 3 minutes):** Follow Section 2 above (with tab audio enabled so the `03:30` rift chord is audible!), upload as **Public**, and replace `[INSERT PUBLIC YOUTUBE URL BEFORE SUBMITTING]` if linking from the repo.
- [ ] **Submit Devpost form:** Select **Costume Contest**, paste Section 1, attach the live URL, public GitHub repository URL (with `.kiro/` at root), and YouTube demo URL.
