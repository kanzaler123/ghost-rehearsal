# Ghost Rehearsal — Kiroween 2026 Submission Kit

Ready-to-use English submission materials for **Kiroween 2026 (Category: Costume Contest)**. All numbers, UI labels, commit hashes, and attribution boundaries in this document match the live repository and automated tests.

---

## 1. Devpost Entry Copy

### Project Title
**Ghost Rehearsal**

### Tagline (≤ 60–80 chars)
*Rehearse your event before real guests arrive—follow the same ghosts across two futures.*

### Links
- **Live Workbench:** https://kanzaler123.github.io/ghost-rehearsal/
- **Repository:** https://github.com/kanzaler123/ghost-rehearsal
- **Kiro Usage Record:** https://github.com/kanzaler123/ghost-rehearsal/blob/main/KIRO_USAGE.md
- **Demo Video (< 3 min):** `[INSERT PUBLIC YOUTUBE URL BEFORE SUBMITTING]`

### Built With
`typescript` · `react` · `react-flow` · `vite` · `zod` · `vitest` · `playwright` · `web-workers` · `canvas-2d` · `kiro`

---

### Devpost Story (Copy & Paste)

#### Inspiration
When you organize an open house, haunted attraction, exhibition, or concert entry, a single staffing mistake—like adding a second check-in desk while leaving kit pickup understaffed—can silently shift bottlenecks downstream and turn queues chaotic. Spreadsheets only show averages; they hide what happens to an individual person caught in a queue.

For **Kiroween's Costume Contest**, we wanted a haunting UI that wasn't just decorative Halloween paint. What if **ghosts** were the exact same 300 simulated guests walking through two alternative event arrangements in parallel—splitting across a spectral rift so organizers can literally watch where one person's wait and outcome diverge before the real doors open?

#### What it does
**Ghost Rehearsal** is a zero-backend, browser-based discrete-event simulation (DES) workbench dressed as a **Midnight Haunted Stage**:

- **Midnight Opening & Six-Step Feature Tour:** First-time visitors land on a live atmospheric stage previewing Side entrance guest #10's divergence—no worker spin-up required—with one-click entry into a 60-second A/B guide, a six-step spotlight tour, or custom event setup.
- **Visual Flow Builder (`Build`):** Drag entrances, staffed services, probability/attribute decisions, batch-release waiting areas, merges, exits, and foldable subflow stages on a ComfyUI-inspired canvas with undo/redo, stage-aware auto-layout, reusable node/plan templates, and observed CSV/TSV arrival & service-sample import.
- **Deterministic Discrete-Event Rehearsal (`Rehearse`):** Runs entirely inside a local browser Web Worker. Models shared multi-skill staff and devices (via bipartite matching), shifts, handovers, planned unavailability, opening/closing drain rules, queue capacities, and overflow policies. Every guest uses deterministic keyed random draws (`Common Random Numbers`), so the same guest ID experiences identical baseline conditions across alternative plans.
- **Two Futures & Individual Ghost Journeys (`Compare`):** Replays two synchronized haunted-stage canvases side by side on a shared queue gauge scale. Overload cards pulse with ember/crimson ghost flames; active routes illuminate with trailing traveller orbs; clicking any guest (such as **Side entrance #10**) pins a rotating gold rune spotlight onto both canvases and jumps straight to their **first visible divergence** (`03:30`), with aligned timelines and station-level evidence.
- **Honest A/B/C Decision Loop & Robustness Lab:** In the built-in synthetic Open House guide, adding a second check-in lane (Plan B, 50/50 split) *reduces* 30-minute completions from **43 → 41** because kit pickup stays choked. Testing **Experiment C** (+1 packing worker, +0.5 scheduled staff-hours) lifts completions to **72 (+31)** and lowers average wait from **17.6 min → 15.9 min**, while transparently reporting the tradeoff (**+4** early departures) instead of claiming a magic winner. **Robustness Lab** sweeps plans across multiple random seeds and slower-service multipliers in a separate Web Worker.
- **Local-First & Bilingual:** Supports English and Chinese, browser draft branch-recovery, canonical JSON import/export with SHA-256 semantic staleness detection, and readable operational plan exports.

#### How we built it
- **Simulation & Schemas (`src/schemas/`, `src/simulation/`):** Strict Zod schemas, pure graph/resource validators, subflow flattener, synchronous pure-JS SHA-256 input fingerprinting (ignoring layout/name edits while catching simulation-semantic changes), and a deterministic min-heap discrete-event engine running in Web Workers.
- **Midnight Haunted Stage UI (`src/components/`, `src/app/styles/`):** React 19, TypeScript, React Flow (`@xyflow/react`), CSS design tokens (strict 3-surface midnight violet-black palette meeting WCAG contrast), and a local Canvas 2D atmosphere layer (`SpectralStageBackdrop`) that adapts particle tempo to replay speed and renders a static frame under `prefers-reduced-motion`. All fonts, icons, and art are bundled locally—zero external runtime requests.
- **Verification Discipline:** 593 Vitest unit tests (including 6 frozen SHA-256 simulation digests ensuring UI overhauls never altered simulation outputs), 37 release-gate tests, and a cross-browser Playwright CI matrix covering Chromium, Chromium Touch, WebKit (sharded + dedicated import/comparison suites), and Firefox across desktop (1440×1000) and mobile (390×844) in English and Chinese.

#### How we used Kiro
We kept a strict, evidence-based separation between verified Kiro contributions and work done by human review or other tools (documented in full in [`KIRO_USAGE.md`](https://github.com/kanzaler123/ghost-rehearsal/blob/main/KIRO_USAGE.md)):

- **Spec-Driven UI Overhaul (`.kiro/specs/haunted-stage-ui/`):** On November 18, Kiro authored the complete requirements, design, and task list for the **Midnight Haunted Stage** redesign and implemented it end-to-end in commit `55ce3c6`—collapsing three toolbars into a 52px top bar, keeping both canvases visible above the guest journey on desktop, building `SpectralStageBackdrop`, shared queue scales (`queueScale.ts`), rune route labels (`routeLabel.ts`), and card/mobile fixes while keeping all 6 frozen simulation hashes byte-identical.
- **Earlier Specs & Baseline Prep (`.kiro/specs/ui-creative-redesign/`, `.kiro/specs/rehearsal-studio-ui/`):** Kiro authored the 22-requirement UI redesign specification and initial Playwright screenshot baseline (later implemented and verified by Codex).
- **Automated Stop Hook (`.kiro/hooks/update-usage-log.json`):** Configured an evidence-only Stop Hook that fired at the end of Kiro's November 18 Haunted Stage session and automatically appended the verified task log entry to `KIRO_USAGE.md`.
- **Steering Rules (`.kiro/steering/comparison-evidence.md`):** Shared always-on guardrails keeping statistical grouping, sample scope, C-experiment builders, and real-Worker browser verification consistent across sessions.

#### Challenges we ran into
1. **Atmosphere vs. Headless Browser Performance:** Adding a full-screen animated Canvas 2D backdrop initially starved Web Worker execution in GPU-less headless Chromium, causing 7 Playwright timeouts. Rendering at `0.5×` resolution with pre-baked glow sprites, capping at 30fps, removing per-frame filters, and pausing while dialogs cover the stage restored full test speed without losing visual softness.
2. **Prototype Collision Bug:** Testing edge-case plan IDs like `constructor` crashed object-keyed lookups; switching affected lookups to `Map` eliminated the white screen.
3. **WebKit ResizeObserver Flicker & Layout Races:** React Flow's synchronous `ResizeObserver` callbacks caused layout loops and flakiness under WebKit; a small fail-fast `postinstall` RAF-batching patch (`scripts/patch-react-flow.mjs`) plus dedicated multi-repeat WebKit CI jobs stabilized cross-browser rendering.
4. **Honest Statistics Under Cutoffs:** Comparing average waits naively can mislead organizers when early departures shorten apparent waits. We built a single shared analysis engine (`src/features/analysis.ts`) that enforces paired samples, explicit exclusions, completed-only secondary metrics, and observation-cutoff vs. run-to-completion separation everywhere.

#### Accomplishments that we're proud of
- Turning a serious discrete-event simulation engine into a memorable **Costume Contest** experience where every visual effect (glowing routes, ghost flames, dual-door spectral rift, gold tracked spotlight) directly encodes real simulation events rather than fake animations.
- Zero-warning Vite 8 production build (490 kB main app chunk + split vendor chunks) with zero external runtime network dependencies.
- 593 unit tests, 37 release-gate checks, and a multi-browser CI pipeline gating GitHub Pages deployment.

#### What we learned
- Spec-first guardrails (like freezing SHA-256 simulation digests before a major UI redesign) let creative styling move fast without silently corrupting analytical correctness.
- Keeping tool attribution transparent and verifiable makes multi-agent workflows much easier to audit and debug.

#### What's next
- Run a real-world field calibration with an event organizer using our built-in [field-validation worksheet](https://github.com/kanzaler123/ghost-rehearsal/blob/main/docs/field-validation.md) and CSV/TSV observed-input importers.
- Benchmark and optimize the simulation engine toward certified performance at the 10,000-guest protective cap.
- Decompose top-level workbench state in `App.tsx` into domain-scoped hooks as the feature set grows.

---

## 2. YouTube Demo Video Script (Target: 2:40 — strictly under 3:00)

### Recording Setup Checklist
- **Resolution:** 1920×1080 (or 1440×900 viewport zoomed cleanly at 100%, dark mode / Midnight theme).
- **URL:** Live deployed site `https://kanzaler123.github.io/ghost-rehearsal/` in a fresh Incognito/private window so the **Midnight Opening** appears on first load and language is **English**.
- **Audio:** Clear voiceover (no background music overpowering narration; optional subtle dark ambient bed at −24 dB).
- **Pace:** Keep mouse movements deliberate; pause ~1 second on key numbers (`43 → 41`, `03:30`, `41 → 72`).

### Timecoded Shot List & Narration

| Time | On-Screen Action (Exact UI Controls) | Voiceover Script (English) |
| :--- | :--- | :--- |
| **0:00 – 0:22** | Open live URL on **Midnight Opening** (`Give your event a midnight rehearsal.`). Slowly move cursor over the hero stage (parallax glow + drifting wisps). Scroll slightly to show the interactive preview of **Side entrance #10** and scrub the mini timeline slider from `03:30` to `10:55`. | *"Before doors open at a real event, one bad staffing guess can turn queues into chaos—and spreadsheets only show averages, never what happens to one person. Welcome to **Ghost Rehearsal**: a browser-based event simulator dressed as a Midnight Haunted Stage, where the exact same 300 simulated ghosts walk through two alternative plans in parallel."* |
| **0:22 – 0:42** | Scroll back up and click **Try the 60-second A/B guide** (starts the real Web Worker on the Open House example and lands directly in **Two Futures**). Hover over the synchronized Baseline (A) and Comparison (B) canvases and point out the summary metrics (`43 → 41` completed, `9` less wait, `9` more wait, `276` within 1 min, `6` early departures excluded). | *"Let's run the built-in 60-second A/B guide—everything runs deterministically inside a local Web Worker, with zero backend or API keys. Plan B splits arrivals 50/50 across two check-in lanes. Intuitively, two lanes should finish more people. Instead, completions actually **drop** from **43 to 41**."* |
| **0:42 – 1:20** | Click **Follow the same guest** in the guide bar, then click **Jump to first difference**. Highlight the dual-canvas strip staying visible above the timelines: **Side entrance #10** carries the rotating gold rune spotlight in both canvases; the **03:30** divergence rift lights up (`ID check`: waiting in A vs. being served in B). Drag the replay scrubber to **08:00** (or press **Play** briefly at 4×) so viewers watch ghost #10 still waiting at ID check in A while already queuing at Kit pickup in B, with glowing routes, trailing orbs, and amber overload flames on **Kit pickup**. | *"Why? Let's follow one person—**Side entrance #10**—across both futures. Both haunted-stage canvases stay synchronized above their timelines. At **03:30**, the spectral rift marks their very first divergence: still waiting at ID check in A, already being served in B. Scrub forward to **08:00**, and B has moved them downstream—straight into a glowing, overloaded **Kit pickup** bottleneck, shown on one shared queue scale across both plans."* |
| **1:20 – 1:58** | Click **Inspect posts and resources** → **Inspect packing evidence** (briefly show simultaneous resource constraints and honest caveat). Then click **Create C and compare**. Highlight the B → C jump: completions **41 → 72 (+31)**, average wait **17.6 min → 15.9 min**, alongside **+1 staff (+0.5 staff-hours)** and **+4 early departures**. Click **Prepare C export** → **Download C arrangement** (show the downloaded markdown plan). | *"Adding check-in capacity without checking downstream staffing just moves the jam. Let's inspect the packing constraints, then test **Experiment C**: adding one packing worker with matching shifts. Now completions jump from **41 to 72**, and average wait drops by nearly two minutes—while Ghost Rehearsal honestly surfaces the full tradeoff: **+0.5 staff-hours** and **4 more early departures**. One click exports C's complete rules, posts, and B/C evidence for the team."* |
| **1:58 – 2:25** | Click **Robustness lab** (briefly show multi-seed × slower-service matrix config, then close). Switch to **Build** mode, briefly show the Halloween/Open House node canvas + Inspector (mention observed CSV/TSV arrival & service sample import), and open **More options** to show **Feature tour** / **Replay the opening**. | *"Beyond a single run, **Robustness Lab** stress-tests plans across random seeds and slower-service conditions in an isolated worker. In **Build** mode, organizers can start from Haunted House, Trick-or-Treat, or Open House templates, import measured CSV/TSV arrival or service samples, and share canonical JSON projects."* |
| **2:25 – 2:42** | Quick cut (3–4 sec) to VS Code / GitHub showing `.kiro/specs/haunted-stage-ui/` and `.kiro/hooks/update-usage-log.json`, then cut back to the live **Two Futures** Haunted Stage canvas with live URL on screen. | *"Under the hood, we used **Kiro's Spec workflow** to design and implement the Midnight Haunted Stage overhaul (`haunted-stage-ui`) while freezing six SHA-256 simulation digests so the visuals never altered a single simulated event—backed by a **Stop Hook** for verifiable usage logging and 593 unit tests plus cross-browser CI. Try **Ghost Rehearsal** live right now—no sign-up needed."* |

---

## 3. Pre-Submission Checklist (Manual Owner Actions)

- [x] **Verify GitHub Actions Pages deployment of `0d8d400`:** Run [`44429878793`](https://github.com/kanzaler123/ghost-rehearsal/actions/runs/44429878793) passed all 11 browser/quality jobs and deployed to https://kanzaler123.github.io/ghost-rehearsal/ (still open once in an Incognito window before recording to confirm visual playback).
- [ ] **Merge this P0 branch into `main`:** Review the diff on `docs/kiroween-submission-prep`, merge into `main`, and push so GitHub displays the updated `README.md`, `KIRO_USAGE.md`, and `docs/kiroween-submission.md`.
- [ ] **Export raw Kiro IDE sessions (local archive):** Export the 2026-11-16 and 2026-11-18 Kiro sessions (`sess_286db17c-aa87-47be-a7e8-e92b05f746a1` and `sess_114da15d-bf8d-438c-b907-beb37999f9a7`) into the git-ignored `kiro-evidence/` folder (plus a screenshot of Kiro IDE if desired), then update the "pending export" note in `KIRO_USAGE.md` and `README.md`.
- [ ] **Record & upload YouTube demo (< 3 minutes):** Follow Section 2 above, upload as **Public** (or Unlisted if permitted by Devpost rules—public recommended), and replace `[INSERT PUBLIC YOUTUBE URL BEFORE SUBMITTING]` if linking it from the repo.
- [ ] **Submit Devpost form:** Select **Costume Contest**, paste Section 1, attach the live URL, public GitHub repository URL (with `.kiro/` at root), and YouTube demo URL.
