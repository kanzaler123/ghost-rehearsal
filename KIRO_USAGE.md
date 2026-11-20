# Ghost Rehearsal — How We Built with Kiro

**Ghost Rehearsal** is our entry for **Kiroween 2026 (Costume Contest)**. Across our visual overhaul, procedural soundscape, interactive Fate Card stage, local engine MCP server, and invariant hooks, we used all four **Kiro** pillars—**Specs**, **always-on Steering**, **Hooks**, and a **custom local MCP server**—to transform a deterministic discrete-event simulator into the **Midnight Haunted Stage** while keeping every simulation output byte-identical.

- **Live Workbench:** https://kanzaler123.github.io/ghost-rehearsal/
- **Tracked `.kiro/` Root:** [`.kiro/`](.kiro/) (12 Specs · 2 Always-On Steering Docs · 2 Hooks · 1 Local Engine MCP Server)
- **Submission Kit & Demo Script:** [`docs/kiroween-submission.md`](docs/kiroween-submission.md)

---

## 1. Kiro Highlights at a Glance

| Kiro Capability | How It Shaped Ghost Rehearsal | Verifiable Proof |
| --- | --- | --- |
| **Spec-Driven Development** (`.kiro/specs/`) | Requirements-first specs froze visual geometry, WCAG contrast, reduced-motion limits, pure-function APIs, and zero-simulation-mutation contracts before implementation | [`haunted-stage-ui`](.kiro/specs/haunted-stage-ui/) (R1–R9) · [`haunted-stage-encore`](.kiro/specs/haunted-stage-encore/) (A1–G4) · [`ghost-rehearsal-mcp`](.kiro/specs/ghost-rehearsal-mcp/) · [`fate-card-stage`](.kiro/specs/fate-card-stage/) · [`ui-creative-redesign`](.kiro/specs/ui-creative-redesign/requirements.md) (22 reqs) · [`rehearsal-studio-ui`](.kiro/specs/rehearsal-studio-ui/) (`eeef1dc`) |
| **Always-On Steering** (`.kiro/steering/`) | Kiro distilled hard-won UI invariants into an `inclusion: always` guardrail file so every subsequent Kiro session inherited them automatically without re-prompting | [`.kiro/steering/haunted-stage.md`](.kiro/steering/haunted-stage.md) (`72ffc63`) · [`.kiro/steering/comparison-evidence.md`](.kiro/steering/comparison-evidence.md) |
| **Agent & Command Hooks** (`.kiro/hooks/`) | Automated evidence logging on session completion (`Stop` Hook) plus a zero-credit local `PostFileSave` invariant guard hardened by Kiro against stdin blocking | [`update-usage-log.json`](.kiro/hooks/update-usage-log.json) (**6 end-to-end auto-logged entries**) · [`guard-haunted-invariants.json`](.kiro/hooks/guard-haunted-invariants.json) + [`scripts/guard-haunted-invariants.mjs`](scripts/guard-haunted-invariants.mjs) + [`tests/guard-haunted-invariants.test.ts`](tests/guard-haunted-invariants.test.ts) |
| **Custom Local Dev-Time MCP** (`.kiro/settings/mcp.json`) | Zero-dependency stdio MCP server exposing Ghost Rehearsal's real DES engine, Zod/graph validator, and Fate Card SVG builder directly to Kiro—keeping the browser bundle 100% zero-backend | [`ghost-rehearsal-engine`](.kiro/settings/mcp.json) · [`scripts/ghost-rehearsal-mcp.mjs`](scripts/ghost-rehearsal-mcp.mjs) · [`scripts/mcp/tools.ts`](scripts/mcp/tools.ts) · [`scripts/mcp/server.ts`](scripts/mcp/server.ts) · 44 tests in [`tests/mcp-server.test.ts`](tests/mcp-server.test.ts) · **called live by Kiro during `fate-card-stage`** |
| **Mathematical & Cross-Browser Safety** | Every Kiro UI, sensory, and export overhaul kept all **6 frozen SHA-256 simulation digests** byte-identical with zero external runtime network requests | [`tests/ui-redesign-equivalence.test.ts`](tests/ui-redesign-equivalence.test.ts) · **671 unit tests (45 files)** · **37 release-gate checks** · zero-warning Vite 8 build (`index-*.js` ~422 kB) |

---

## 2. How Specs, Steering, Hooks, and MCP Work Together

The central engineering challenge of a **Costume Contest** entry built on a real discrete-event simulation engine is **expressiveness without corruption**: making the workbench feel unmistakably atmospheric and memorable while guaranteeing that analytical results, WCAG accessibility, and 390px mobile layouts never regress.

We solved this by organizing `.kiro/` into a **closed four-pillar loop**:

```text
  [1. Requirements-First Specs]  (.kiro/specs/haunted-stage-ui, haunted-stage-encore,
                                  ghost-rehearsal-mcp, fate-card-stage)
      Freeze presentation scope, selector contracts, & acceptance criteria
                         |
                         v
  [2. Always-On Steering]        (.kiro/steering/haunted-stage.md, comparison-evidence.md)
      Carry invariants automatically across sessions—no manual re-prompting
                         |
                         v
  [3. Kiro Build + Playwright Visual Loop + Custom Engine MCP]
      Implement React / Canvas 2D / Web Audio / SVG / PNG -> inspect screenshots
      -> call ghost-rehearsal-engine MCP live to verify 6/6 SHA-256 digests & 03:30 rift
                         |
                         v
  [4. Hooks + Cross-Browser CI]
      PostFileSave invariant guard + Stop Hook auto-logging (6×) -> 14-job CI -> Pages
```

### Always-On Steering Authored by Kiro (`.kiro/steering/haunted-stage.md`)
Immediately after completing the Midnight Haunted Stage redesign (`55ce3c6`), Kiro codified the project's visual and correctness guardrails into `.kiro/steering/haunted-stage.md` (`inclusion: always`, commit `72ffc63`):

> 1. **Never touch simulation data.** Do not edit `src/simulation/**`, `src/schemas/**` or `examples/open-house.json`. Six frozen SHA-256 digests in `tests/ui-redesign-equivalence.test.ts` guard this. Do not update a digest to make it pass.
> 2. **Style through tokens only.** No literal colours, lengths, durations or inline shadows in non-token CSS. Keep exactly 3 `--surface-*` and 3 `--elev-*` tokens (midnight violet-black), text/tone ≥ 4.5:1 and focus/line ≥ 3:1 contrast on all three. Under `prefers-reduced-motion`, animation and transition durations must be ≤ 0.001s. `tests/ui-styles.test.ts` guards this.
> 3. **Zero external runtime requests.** Icons, fonts and the atmosphere canvas are local: inline SVG, CSS or Canvas 2D. No CDN, remote font or fetch.

Every subsequent Kiro milestone—`haunted-stage-encore`, the opening-scene parallax fix, the Hook hardening, `ghost-rehearsal-mcp`, and `fate-card-stage`—ran directly under both `.kiro/steering/haunted-stage.md` and `.kiro/steering/comparison-evidence.md`.

### Automated Hooks (`.kiro/hooks/`)
- **Evidence-Based Stop Hook ([`.kiro/hooks/update-usage-log.json`](.kiro/hooks/update-usage-log.json)):** Triggers automatically on `Stop` after substantive work, checks existing entries to prevent duplicates or recursion, skips casual Q&A turns, and appends a structured UTC+8 engineering record to the session log below. It has executed end-to-end **six times** across our Haunted Stage, Encore, opening-scene polish, guard-hook fix, MCP server, and Fate Card Stage sessions.
- **Zero-Credit Local Invariant Guard ([`.kiro/hooks/guard-haunted-invariants.json`](.kiro/hooks/guard-haunted-invariants.json)):** A `PostFileSave` command Hook matching `src/components/**` and `src/app/styles/**`, wired to [`scripts/guard-haunted-invariants.mjs`](scripts/guard-haunted-invariants.mjs) to run the 12 frozen SHA-256 simulation-digest and CSS/WCAG contract tests locally without spending model credits. Kiro hardened the script with CLI-arg priority and a 150ms bounded async stdin reader (eliminating pipe-blocking hangs) and added 5 automated tests in [`tests/guard-haunted-invariants.test.ts`](tests/guard-haunted-invariants.test.ts).

### Custom Zero-Dependency Local MCP Server ([`.kiro/settings/mcp.json`](.kiro/settings/mcp.json))
Ghost Rehearsal's **browser app** is deliberately zero-backend with zero external runtime network requests. To give Kiro direct analytical visibility into our discrete-event simulator **without compromising the offline-first browser build**, Kiro designed and built a local dev-time stdio MCP server (`ghost-rehearsal-engine`) compiled on demand via the already-installed `rolldown` bundler (zero new npm dependencies, zero bytes in `dist/`):
1. **`verify_simulation_invariants`** — runs all 6 reference simulations (`A/B/C × cutoff / run_to_completion`), checks all 6 frozen SHA-256 digests, and returns core KPIs (`43 → 41 → 72` completions, waits, departures).
2. **`inspect_guest_divergence`** — compares any guest ID (default `side-stream:10`) across Plans A and B and returns the exact first divergence (`03:30`), outcomes, waiting delta (`−1175 s`), and paired sample evidence.
3. **`validate_event_project`** — validates any workspace-confined `.json` project or inline JSON against `projectDocumentSchema` and `validateGraph` (including symlink escape protection).
4. **`render_fate_card_svg`** — builds the deterministic 1200×630 bilingual SVG poster via `buildFateCardSvg` and verifies zero `<script>` or external references.

In the very next Kiro session (`fate-card-stage`), Kiro called `verify_simulation_invariants` (6/6 digests matched) and `inspect_guest_divergence` (`side-stream:10` diverging at `03:30`) live through MCP to confirm its new UI modal left the simulation untouched.

---

## 3. End-to-End Kiro Engineering Milestones

### Milestone 1 — Midnight Haunted Stage Transformation (`haunted-stage-ui`, `55ce3c6`)
- **Scope:** Full three-file spec (`requirements.md`, `design.md`, `tasks.md`) + end-to-end implementation across **26 files (+1,076 / −219 lines)** with zero edits to simulation or schema files.
- **Deliverables:**
  - Collapsed three stacked header layers into a single `52px` top bar with inline run-scope controls and floating canvas HUD capsules, reclaiming primary viewport space for the stage.
  - Kept both synchronized A/B canvases visible as a side-by-side strip above the guest journey on desktop, wired to live station beacons.
  - Built [`SpectralStageBackdrop.tsx`](src/components/SpectralStageBackdrop.tsx) and [`spectral.ts`](src/components/spectral.ts)—a local Canvas 2D atmosphere layer whose wisp/ember tempo responds to replay speed and falls back to a static frame under `prefers-reduced-motion`.
  - Added glowing active route flows, trailing `ROUTE_TRANSITION` traveller orbs, gold rune branch capsules ([`routeLabel.ts`](src/components/routeLabel.ts)), overload flames (`haunt-pulse`), a tracked-ghost rotating spotlight, dark data-source editors, and cross-plan shared queue gauges ([`queueScale.ts`](src/components/queueScale.ts) + [`tests/ui-queue-scale.test.ts`](tests/ui-queue-scale.test.ts)).
- **Hard Problems Kiro Diagnosed & Fixed Live:**
  1. **Card geometry vs. tidy-layout tests:** Upgrading run cards to `232×220` broke `tests/stages.test.ts`; Kiro decoupled `arrangeLayout` onto its own `ARRANGE_CELL` grid pitch so existing layouts stayed crisp.
  2. **Prototype-collision white screen:** Running the full browser suite exposed a crash when a test plan ID named `constructor` collided with `Object.prototype` on a plain lookup object; Kiro migrated beacon lookups to `Map`.
  3. **Headless GPU-less Chromium starvation:** The animated Canvas 2D backdrop initially starved Web Worker execution under software rendering, causing 7 Playwright timeouts. Kiro isolated the bottleneck by toggling the animation loop, then engineered `0.5×` resolution scaling, pre-baked glow sprites, a 30fps (15fps slow-frame) cap, automatic pause behind open dialogs, and zero per-frame CSS filters—bringing those 28 tests back down to 1.1 minutes without sacrificing visual softness.

### Milestone 2 — Always-On Steering (`72ffc63`) → Haunted Stage Encore (`haunted-stage-encore`, `2c400bb`)
- **Scope:** Kiro authored `.kiro/steering/haunted-stage.md`, then wrote `.kiro/specs/haunted-stage-encore/` and delivered two signature Costume Contest features across **13 files (+762 / −4 lines)** with zero edits to simulation, schemas, or `TopBar.tsx`.
- **Deliverables:**
  - **Spectral Soundscape ([`src/features/soundscape.ts`](src/features/soundscape.ts), [`src/app/useSoundscape.ts`](src/app/useSoundscape.ts)):** Pure DOM-free cue planner (`planCues`, `hauntedStations`) paired with procedural Web Audio synthesis (muted by default, zero audio files or network requests, disabled under `prefers-reduced-motion`). Synthesizes a soft `[311.13, 440]` Hz tritone rift chord at `firstDifference`, rate-limited `55` Hz ember pulses on newly crowded stations, and a `[1318.51, 2637.02]` Hz completion bell.
  - **Spectral Fate Card ([`src/features/fateCard.ts`](src/features/fateCard.ts)):** Pure bilingual, XML-escaped standalone `1200×630` SVG poster comparing aligned A/B timeline bands, the two-colour divergence rift, outcomes, signed waiting delta, and an assumption footnote.
  - **Tests ([`tests/soundscape.test.ts`](tests/soundscape.test.ts), [`tests/fate-card.test.ts`](tests/fate-card.test.ts), [`e2e/ui/encore.spec.ts`](e2e/ui/encore.spec.ts)):** 21 unit tests and 12 real-Chromium Playwright tests (EN/ZH × desktop/390px) spying on real `AudioContext` oscillator frequencies, verifying zero external requests, and rendering the downloaded `1200×630` SVG in browser.
- **Screenshot-Driven Layout Debugging by Kiro:**
  - When the first Playwright run failed `compare-first-screen.spec.ts` at `1366×768`, Kiro inspected the failure screenshot, saw that a text label on the export button squeezed `.ghost-id`, and refactored it to an accessible `icon-btn`.
  - When a second pass failed at `390×844` mobile, Kiro isolated the exact flex wrap trigger and resolved it with a single token-safe `flex-basis: 50%` rule in `responsive.css`—passing **144/144 UI Playwright tests** and **40/40 smoke checks**.

### Milestone 3 — Steering-Guided Opening Polish (`b8165f2`) & Hook Hardening
- **Opening-Scene Regression Fix (`b8165f2`):** Guided by `.kiro/steering/haunted-stage.md`, Kiro removed unwanted mouse-driven `--stage-x`/`--stage-y` parallax drift from [`OpeningPage.tsx`](src/components/OpeningPage.tsx) and [`layout.css`](src/app/styles/layout.css) while preserving ambient bat/flame/mist/rift animations and reduced-motion rules, adding the `opening scene does not follow the mouse` Playwright regression test in [`e2e/ui/welcome.spec.ts`](e2e/ui/welcome.spec.ts) and confirming red→green failure/pass via `git stash`.
- **Non-Blocking `PostFileSave` Guard Hook:** Kiro replaced synchronous `readFileSync(0)` in [`scripts/guard-haunted-invariants.mjs`](scripts/guard-haunted-invariants.mjs) with CLI-argument priority plus a 150ms bounded async stdin reader and added 5 regression tests in [`tests/guard-haunted-invariants.test.ts`](tests/guard-haunted-invariants.test.ts) covering open pipes, JSON stdin, and path skipping.

### Milestone 4 — Zero-Dependency Local Engine MCP Server (`ghost-rehearsal-mcp`)
- **Scope:** Full three-file spec ([`.kiro/specs/ghost-rehearsal-mcp/`](.kiro/specs/ghost-rehearsal-mcp/)) + TypeScript protocol/tools layer (`scripts/mcp/tools.ts`, `scripts/mcp/server.ts`) + `rolldown`-cached launcher (`scripts/ghost-rehearsal-mcp.mjs`) + **44 automated tests** (`tests/mcp-server.test.ts`).
- **Engineering Highlights:**
  - Supports mixed newline-delimited JSON and `Content-Length` MCP framing across protocol versions `2025-06-18` / `2025-03-26` / `2024-11-05`, redirecting `console.log` to `stderr` so `stdout` carries pure JSON-RPC only.
  - Enforces symlink-safe workspace root confinement (`realpathSync`), 5 MB caps, non-echoing JSON parse errors, and drift guards against `tests/ui-redesign-equivalence.test.ts`.
  - Cold-compiles in ~360 ms via installed `rolldown` with atomic manifest caching in `node_modules/.cache`; verified **0 MCP identifiers and 0 external URLs** in `dist/`.

### Milestone 5 — Spectral Fate Card Stage Preview & 2× PNG/SVG Dual Export (`fate-card-stage`)
- **Scope:** Full three-file spec ([`.kiro/specs/fate-card-stage/`](.kiro/specs/fate-card-stage/)) + [`FateCardModal.tsx`](src/components/FateCardModal.tsx) + pure browser SVG→2× PNG rasterizer (`renderFateCardPngBlob`, `2400×1260`) in [`src/features/fateCard.ts`](src/features/fateCard.ts) + token-only styling (`tokens.css`, `components.css`) + bilingual copy (`messages.ts`).
- **Engineering & Visual Polish:**
  - Reuses the single `.ghost-card` `icon-btn` (zero first-screen layout impact) to open an atmospheric wide `Modal` rendering the 1200×630 card via a safe, lifecycle-managed Blob URL `<img>` (no `dangerouslySetInnerHTML`, all Blob URLs revoked on close/change/unmount).
  - Offers one-click **Download SVG** and **Download PNG (2×)** with double-click protection, graceful `role="alert"` fallback on encode failure (preserving SVG download), and full focus restoration on Escape/Close.
  - Kiro visually inspected `1366×768`, `1440×900`, and `390×844` screenshots, caught a 2px body scroll at `1366×768`, tuned `--fate-stage-chrome` from `280px` to `290px`, passed **16/16 Encore & first-screen Playwright tests** and **48/48 smoke tests**, and **invoked its own `ghost-rehearsal-engine` MCP tools live** (`verify_simulation_invariants` 6/6 matched; `inspect_guest_divergence` `side-stream:10` at `03:30`).

### Foundational UI Specifications
- Earlier in the build, Kiro authored the full specification for [`rehearsal-studio-ui`](.kiro/specs/rehearsal-studio-ui/) (`eeef1dc`, +2,107 lines) and the 22-requirement creative redesign specification ([`.kiro/specs/ui-creative-redesign/requirements.md`](.kiro/specs/ui-creative-redesign/requirements.md)) along with the initial Playwright visual-capture baseline that laid the groundwork for the Midnight Haunted Stage.

---

## 4. Verifiable Artifact Map

| Artifact | Location / Commit |
| --- | --- |
| Haunted Stage Spec & Implementation (26 files, +1,076 lines) | [`.kiro/specs/haunted-stage-ui/`](.kiro/specs/haunted-stage-ui/) · `55ce3c6` |
| Always-On Haunted Stage Steering | [`.kiro/steering/haunted-stage.md`](.kiro/steering/haunted-stage.md) (`72ffc63`) |
| Haunted Stage Encore Spec & Implementation (13 files, +762 lines) | [`.kiro/specs/haunted-stage-encore/`](.kiro/specs/haunted-stage-encore/) · `2c400bb` |
| Opening-Scene Mouse-Parallax Fix & Regression Test | `b8165f2` (`OpeningPage.tsx`, `layout.css`, `e2e/ui/welcome.spec.ts`) |
| Local Dev-Time Engine MCP Server (4 tools, 44 tests) | [`.kiro/specs/ghost-rehearsal-mcp/`](.kiro/specs/ghost-rehearsal-mcp/) · [`.kiro/settings/mcp.json`](.kiro/settings/mcp.json) · [`scripts/ghost-rehearsal-mcp.mjs`](scripts/ghost-rehearsal-mcp.mjs) · [`scripts/mcp/`](scripts/mcp/) · [`tests/mcp-server.test.ts`](tests/mcp-server.test.ts) |
| Spectral Fate Card Stage Modal & 2× PNG/SVG Export | [`.kiro/specs/fate-card-stage/`](.kiro/specs/fate-card-stage/) · [`src/components/FateCardModal.tsx`](src/components/FateCardModal.tsx) · [`src/features/fateCard.ts`](src/features/fateCard.ts) · [`e2e/ui/encore.spec.ts`](e2e/ui/encore.spec.ts) |
| Automated Stop Hook (6 end-to-end auto-logged entries) | [`.kiro/hooks/update-usage-log.json`](.kiro/hooks/update-usage-log.json) · [Appendix below](#实际记录) |
| Hardened `PostFileSave` UI Invariant Hook (5 unit tests) | [`.kiro/hooks/guard-haunted-invariants.json`](.kiro/hooks/guard-haunted-invariants.json) · [`scripts/guard-haunted-invariants.mjs`](scripts/guard-haunted-invariants.mjs) · [`tests/guard-haunted-invariants.test.ts`](tests/guard-haunted-invariants.test.ts) |
| Earlier UI Redesign Specs | [`.kiro/specs/rehearsal-studio-ui/`](.kiro/specs/rehearsal-studio-ui/) (`eeef1dc`) · [`.kiro/specs/ui-creative-redesign/requirements.md`](.kiro/specs/ui-creative-redesign/requirements.md) |
| 6 Frozen SHA-256 Digests & 671 Unit Tests | [`tests/ui-redesign-equivalence.test.ts`](tests/ui-redesign-equivalence.test.ts) · `npm run check` (45 files, 671 tests) |

---

<details>
<summary>Appendix: Verbatim Kiro Stop Hook Session Log (中文原始自动记录与历史归档链接)</summary>

> 注：本附录原样保留 Kiro Stop Hook（`.kiro/hooks/update-usage-log.json`）在会话结束后自动写入的中文记录，以供核验；早期阶段的历史交接明细与工作流模板归档在 [`docs/kiro/process-log-archive.md`](docs/kiro/process-log-archive.md)。

## 实际记录

### 2026-11-16：UI 创意改版需求与接手实现

- 日期与时间（UTC+8）：2026-11-16；Kiro 会话约 17:00–21:48，随后由 Codex 接手。
- 任务名称／对应 Spec：`ui-creative-redesign`。
- 本次要解决的问题：需求讨论耗时后仍没有应用界面交付；按已形成的需求推进真实界面与验收。
- 实际使用的 Kiro 功能：Spec 需求工作流、需求细化子执行、代码与文件读取、初始截图准备；Hook 执行未核实。
- Kiro 实际完成的工作：22 项需求文档、初始 Playwright 截图脚本与一批改版前图片；接手时应用仍在基线提交。
- 人工／Codex 的修改、审查或决策：用户决定接手；Codex 选择 Ghostlight 方向，完成界面、测试、截图脚本修正和检查记录。仿真实现不归为 Kiro 本轮贡献。
- 产物文件／Git 提交编号：`.kiro/specs/ui-creative-redesign/requirements.md`；Codex 实现 `af34260`；设计、截图、接口清单及后续证据见 `docs/reviews/ui-creative-redesign.md`。
- 验证方法与实际结果：基线单元检查 463 通过；基线浏览器整套超时且有失败，未计为通过；实现后 464 项单元检查通过，24 项 WebKit 新交互测试通过。最终交付检查、后续修正及完整运行结果以追加式 `verification.md` 为准。
- 原始对话文件／相关截图：本机 Kiro `sess_286db17c-aa87-47be-a7e8-e92b05f746a1` 的 `messages.jsonl` 和子执行被读取核实；改版前后产品截图保存在 review 目录。
- 遇到的问题、纠正过程与尚未完成的事项：需求细化反复执行；初始截图基路径、手机导航和选择器需修正；界面裁切与测试夹具问题已逐次记录。

### 2026-11-18：Midnight Haunted Stage 工作台改版（Kiro 实现）

- 日期与时间（UTC+8）：2026-11-18 约 14:51–20:10；Kiro IDE 会话 `sess_114da15d-bf8d-438c-b907-beb37999f9a7`。
- 任务名称／对应 Spec：`haunted-stage-ui`（Kiroween Costume Contest 前端改版）。
- 本次要解决的问题：顶部多层工具栏挤压画布；进入访客旅程时双画布消失；节点卡数字与趋势重叠、标签截断；队列条按全天人数归一化导致不可见；数据来源编辑器白底与黑底黑字；整体缺少万圣节舞台氛围。
- 实际使用的 Kiro 功能：Spec 工作流（requirements／design／tasks）、代码读取与编辑、终端执行（类型检查、单测、构建、Playwright）、浏览器截图读取用于视觉核对；本条记录由项目 Stop Hook 在本会话触发后写入。
- Kiro 实际完成的工作：编写 `.kiro/specs/haunted-stage-ui/` 三份文档；顶栏三合一与运行范围内联、画布悬浮胶囊 HUD、Rehearse 完成态改为紧凑状态胶囊；访客旅程桌面端保留双画布条带与站点信标联动；新增 Canvas 2D 舞台氛围层 `SpectralStageBackdrop`（减少动态时只画静帧）；路线能量流、旅客光球拖尾、分支符文标签；拥堵／受阻辉光与幽灵火苗、被追踪幽灵聚光灯与旋转符文；欢迎页双门分身场景与首次差异裂隙光束；卡片尺寸 232×220／248×220 并同步 `stages.ts` 与 tokens；共享队列刻度 `queueScale`；数据来源暗色面板；390px 细节修复；午夜紫黑表面色。
- 人工／Codex 的修改、审查或决策：用户提供完整需求、护栏与验证范围；本轮未观察到 Codex 参与。
- 产物文件／Git 提交编号：分支 `kiro/haunted-stage-ui`，提交 `55ce3c6`。新增 `src/components/SpectralStageBackdrop.tsx`、`spectral.ts`、`queueScale.ts`、`routeLabel.ts`、`tests/ui-queue-scale.test.ts`；修改 `App.tsx`、`Canvas.tsx`、`Icons.tsx`、`Dialogs.tsx`、`TopBar.tsx`、`stages.ts`、`src/app/styles/*`、`data-sources.css`，以及测试断言 `tests/ui-styles.test.ts`、`tests/ui-shell.test.ts`、`e2e/robustness/theme.spec.ts`、`e2e/ui/creative-redesign.spec.ts`。未改动 `src/simulation/**`、`src/schemas/**`、`examples/open-house.json`。
- 验证方法与实际结果：`npm run check` 通过（41 文件、592 项，含 `ui-redesign-equivalence`）；`npm run build` 通过。指定浏览器子集 22 项通过；完整浏览器套件 `--global-timeout=0` 运行 515 通过、4 跳过、1 失败（`demo/comparison.spec.ts:24` 单独 `--repeat-each=3` 三次通过）。
- 遇到的问题、纠正过程与尚未完成的事项：卡片尺寸变化使 `stages.test` 失败，改为 `arrangeLayout` 保留原网格 `ARRANGE_CELL`；修复 390px 溢出、计划 ID `constructor` 原型碰撞（改用 `Map`）、Rehearse 标题可见性以及无头软件渲染下 Canvas 背景拖慢 Worker 致超时问题（0.5× 分辨率、30fps 上限、对话框打开暂停、去除逐帧滤镜）。

### 2026-11-19：Haunted Stage Encore（午夜声景与幽灵命运卡）

- 日期与时间（UTC+8）：2026-11-19 上午；Kiro IDE 会话 `sess_c8ef18f5-67ca-4040-9cec-2e690d222045`。
- 任务名称／对应 Spec：`haunted-stage-encore`（Kiroween Costume Contest 两个轻量亮点功能）。
- 本次要解决的问题：为比较与回放加入默认静音的合成氛围提示音，并让用户把同一访客在 A/B 两个未来中的经历导出为独立 SVG 命运卡；不得改动 `TopBar.tsx`、仿真、schema，也不得在 CSS 中引入字面量或孤儿 class。
- 实际使用的 Kiro 功能：Spec 工作流（requirements／design／tasks）、Steering（`haunted-stage.md`、`comparison-evidence.md`）、代码读取与编辑、终端执行（类型检查、单测、构建、Playwright）、截图读取用于定位首屏失败；本条由 Stop Hook 触发后写入。
- Kiro 实际完成的工作：编写 `.kiro/specs/haunted-stage-encore/` 三份文档；`soundscape.ts`、`useSoundscape.ts` 与 `App.tsx` `.timeline` 内的 `Volume2`／`VolumeX` 开关；`fateCard.ts` 与 `Journey.tsx` `.ghost-card` 内的导出按钮；`messages.ts` 新增 `encore` 分组；`tests/soundscape.test.ts`、`tests/fate-card.test.ts`、`e2e/ui/encore.spec.ts`。
- 产物文件／Git 提交编号：提交 `2c400bb`（Stop Hook 记录见 `6d68e4a`）。未改动 `src/simulation/**`、`src/schemas/**`、`examples/open-house.json`、`TopBar.tsx`。
- 验证方法与实际结果：`npm run check` 通过（43 文件、614 项）；`npm run build -- --base=/ghost-rehearsal/` 通过；`npm run test:browser:smoke` 40 项通过；`npx playwright test e2e/ui` 144 通过、4 跳过（含新增 `encore.spec.ts` 12 项与 `compare-first-screen.spec.ts`）。
- 遇到的问题与纠正过程：带文字导出按钮挤窄 `.ghost-id` 致 desktop-en 首屏失败，改为 `icon-btn`；随后通过移动端 `flex-basis: 50%` 修复 mobile-en 首屏。

### 2026-11-19：开场页鼠标视差 bug 修复

- 日期与时间（UTC+8）：2026-11-19 约 23:25–23:46；Kiro IDE 会话 `sess_9779c7f9-503d-4f10-ab56-20b4ee0424e1`。
- 任务名称／对应 Spec：开场页（`OpeningPage`）鼠标视差移除；受 `haunted-stage-ui` 常驻 Steering 护栏约束。
- 实际使用的 Kiro 功能：Steering（`haunted-stage.md`、`comparison-evidence.md`）、代码读取与编辑、终端执行（类型检查、单测、构建、Playwright）；本条由 Stop Hook 触发后写入。
- Kiro 实际完成的工作：删除 `OpeningPage.tsx` 中的 `shiftScene`／`onPointerMove`／`onPointerLeave` 与 `layout.css` 中依赖 `--stage-x`／`--stage-y` 的三条 `translate`，保留其余全部开场动效与减少动态约束；在 `e2e/ui/welcome.spec.ts` 新增回归测试 `opening scene does not follow the mouse` 并以 `git stash` 红绿验证。
- 产物文件／Git 提交编号：提交 `b8165f2`（修改 `OpeningPage.tsx`、`layout.css`、`e2e/ui/welcome.spec.ts`；复核期间收紧测试断言）。未改动 `src/simulation/**`、`src/schemas/**`、`examples/open-house.json`。
- 验证方法与实际结果：`npm run check` 618 项通过，`welcome.spec.ts` + `reduced-motion.spec.ts` 28 项通过；推送 `main` 后通过 GitHub Actions 全部 14 项跨浏览器检查（run `44668793382`）并部署 GitHub Pages。

### 2026-11-20：修复 PostFileSave 命令 Hook 的 stdin 阻塞
- 日期与时间（UTC+8）：2026-11-20 约 14:20–14:34；Kiro IDE 会话 `sess_2768652e-cd4f-4885-8ce4-1cadca1bd2d1`。
- 任务名称／对应 Spec：无独立 Spec；受 `haunted-stage.md` 与 `comparison-evidence.md` 常驻 Steering 约束的小型工程任务（不改业务代码）。
- 本次要解决的问题：`scripts/guard-haunted-invariants.mjs` 在非 TTY 时用同步 `readFileSync(0)` 读 stdin，调用方不关闭管道就会永久阻塞，无法可靠观察 Hook 输出。
- 实际使用的 Kiro 功能：代码读取与编辑、终端执行（脚本多场景实测、`npm run check`）；Steering 规则作为约束加载；本条由 Stop Hook 触发后写入。
- Kiro 实际完成的工作：脚本改为优先读 `process.argv.slice(2)`，无参数时用最长 150ms 的异步 stdin 读取，到时自动继续；保留 UI 路径过滤（非 UI 路径打印 skipped 并退出 0，不跑 vitest；UI 路径或无路径信息时运行 `vitest run tests/ui-redesign-equivalence.test.ts tests/ui-styles.test.ts --environment node`）；子进程 stdin 设为 ignore，退出码与输出透传；新增 `tests/guard-haunted-invariants.test.ts`（5 个用例，通过 `GUARD_HAUNTED_DRY_RUN=1` 只打印将运行的命令，避免嵌套 vitest）。`.kiro/hooks/guard-haunted-invariants.json` 未改动：现有 matcher 正确，且未能核实 Kiro 是否支持 `{{filePath}}`，故未添加。
- 人工／其他工具的修改、审查或决策：用户给出修改范围、约束与验收要求；本轮未观察到 Codex 参与。
- 产物文件／Git 提交编号（尚无提交时注明）：`scripts/guard-haunted-invariants.mjs`（修改）、`tests/guard-haunted-invariants.test.ts`（新增）；尚无 Git 提交，按用户要求未 commit/push。未改动 `src/**`、`examples/**`、`tests/ui-redesign-equivalence.test.ts`。
- 验证方法与实际结果（区分未运行、失败、通过；写明验证范围）：真实脚本（非 dry-run）六种场景均不阻塞、退出码 0：UI 路径参数＋stdin 未关（约 1.5s，12 项通过）、README.md 参数＋stdin 未关（约 0.07s，跳过）、空且已关闭 stdin（约 1.4s，12 项通过）、打开但无数据的 stdin（约 1.6s，12 项通过）、未关闭 stdin 写入 UI 路径 JSON（约 1.8s，12 项通过）、未关闭 stdin 写入 README.md JSON（约 0.3s，跳过）。用返回 7 的假 `npx.cmd` 确认退出码 7 与输出被如实透传。`npm run check` 通过（typecheck 通过；44 文件、623 项测试通过）。`npm run build`、`npm run test:browser` 未运行（本轮不涉及产品代码）。
- 原始对话文件／相关截图：待导出；无截图。
- 遇到的问题、纠正过程与尚未完成的事项：Hook 在 Kiro IDE 内的真实触发与命令输出尚未核验，需用户对 `src/app/styles/tokens.css` 做一次无改动保存后，再追加带日期的验证记录；在此之前不得将该 Hook 记为已在 Kiro 内验证。验证期间工具终端对部分长输出捕获不全，改为写入临时文件后读取，结果以文件内容为准。
### 2026-11-20：Ghost Rehearsal 开发期 MCP Server（`ghost-rehearsal-mcp`）
- 日期与时间（UTC+8）：2026-11-20 约 14:55–15:15；Kiro IDE 会话 `sess_76aaaeaf-efcc-4fc3-9dcd-6ed122375d87`。
- 任务名称／对应 Spec：`.kiro/specs/ghost-rehearsal-mcp/`（requirements-first，本轮新建）；受 `comparison-evidence.md` 与 `haunted-stage.md` 常驻 Steering 约束。
- 本次要解决的问题：让 Kiro 能直接调用真实仿真引擎、方案校验器与命运卡生成器；不改 `src/**`、`examples/**`、`public/**`、`package-lock.json`，不新增依赖，浏览器构建不含 MCP 代码。
- 实际使用的 Kiro 功能：Spec 工作流（先写 requirements/design/tasks 再实现）、代码读取与编辑、终端执行、Steering 规则作为约束加载；本条由 Stop Hook 触发后写入。
- Kiro 实际完成的工作：新增 `scripts/mcp/tools.ts`（4 个只读工具：`verify_simulation_invariants`、`inspect_guest_divergence`、`validate_event_project`、`render_fate_card_svg`，复用 `engine`、`analysis`、`project`、`fateCard`、`messages`、schemas）；`scripts/mcp/server.ts`（零依赖 JSON-RPC 2.0 over stdio，支持按行 JSON 与 Content-Length 帧）；`scripts/ghost-rehearsal-mcp.mjs`（rolldown 编译并按 manifest 缓存到 `node_modules/.cache`）；`tests/mcp-server.test.ts`（44 项）；`tsconfig.json` 的 `include` 增加 `scripts/mcp/**/*.ts`。`validate_event_project` 将路径限制在工作区根目录内（含符号链接解析）。
- 人工／其他工具的修改、审查或决策：用户给出范围、约束与验收要求；本轮未观察到 Codex 参与。
- 产物文件／Git 提交编号（尚无提交时注明）：`.kiro/specs/ghost-rehearsal-mcp/{requirements,design,tasks}.md`、`.config.kiro`、`scripts/mcp/tools.ts`、`scripts/mcp/server.ts`、`scripts/ghost-rehearsal-mcp.mjs`、`tests/mcp-server.test.ts`（均新增）、`tsconfig.json`（修改）；尚无 Git 提交，按用户要求未 commit/push。
- 验证方法与实际结果（区分未运行、失败、通过；写明验证范围）：`npm run check` 通过（两次 tsc 无报错；45 文件、667 项测试通过，含新增 44 项与未改动的 `tests/ui-redesign-equivalence.test.ts`）。`npm run build -- --base=/ghost-rehearsal/` 通过；`dist` 中未发现 MCP 标识符与外部 URL 引用。对 `src`、`examples`、`public`、`package.json`、`package-lock.json`、冻结摘要测试的 `git diff` 为空。手动启动：6/6 摘要匹配，`side-stream:10` 在 03:30 分叉。`npm run test:browser` 未运行（无浏览器可见改动，不构成浏览器验收）。
- 原始对话文件／相关截图：待导出；无截图。
- 遇到的问题、纠正过程与尚未完成的事项：`.kiro/settings/mcp.json` 被文件写入权限规则拦截，未创建；配置内容已写入 `tasks.md`，需用户手动创建。在 Kiro IDE 中刷新 MCP 并调用工具的最终验收尚未进行，在此之前不得记为已在 Kiro 内验证。
### 2026-11-20：Spectral Fate Card 舞台预览弹窗与 PNG/SVG 双格式导出（`fate-card-stage`）
- 日期与时间（UTC+8）：2026-11-20 约 15:20–16:08；Kiro IDE 会话 `sess_76aaaeaf-efcc-4fc3-9dcd-6ed122375d87`。
- 任务名称／对应 Spec：`.kiro/specs/fate-card-stage/`（requirements-first，本轮新建）；受 `haunted-stage.md` 与 `comparison-evidence.md` 常驻 Steering 约束。
- 本次要解决的问题：`Journey.tsx` 中命运卡 icon-btn 直接静默下载 SVG，页面内看不到命运卡，也没有 PNG；要求改为打开预览弹窗并提供 SVG/PNG 下载，同时不改仿真/Schema、不新增首屏按钮、样式只用 token、文案进 i18n。
- 实际使用的 Kiro 功能：Spec 工作流（先写 requirements/design/tasks 再实现）、代码读取与编辑、终端执行、真实浏览器 Playwright 测试与截图检查、`ghost-rehearsal-engine` MCP 工具（`verify_simulation_invariants`、`inspect_guest_divergence`）、Steering 规则作为约束加载；本条由 Stop Hook 触发后写入。
- Kiro 实际完成的工作：`src/features/fateCard.ts` 新增 `fateCardPngFilename`、`renderFateCardPngBlob`（离屏 Image + Canvas 2D，2400×1260，临时 URL 全路径释放）、`saveBlob`；新增 `src/components/FateCardModal.tsx`（复用 `Modal` wide、Blob URL `<img>` 预览、PNG 导出防重复点击、失败时 `role="alert"` 提示且 SVG 仍可下载）；`Journey.tsx` 触发按钮改为打开弹窗（按钮名称、title、图标与位置不变，另加 `aria-haspopup="dialog"`），指南/口径/运行变化时关闭；`messages.ts` 增加中英文键；`tokens.css` 增加 3 个 token、`components.css` 增加 3 条规则；更新 `tests/fate-card.test.ts` 与 `e2e/ui/encore.spec.ts`。根据 1366×768 截图把 `--fate-stage-chrome` 从 280px 调到 290px，消除 2px 滚动。
- 人工／其他工具的修改、审查或决策：用户给出范围、约束与验收命令；本轮未观察到 Codex 参与。
- 产物文件／Git 提交编号（尚无提交时注明）：`.kiro/specs/fate-card-stage/{requirements,design,tasks}.md`、`.config.kiro`、`src/components/FateCardModal.tsx`（新增）；`src/features/fateCard.ts`、`src/components/Journey.tsx`、`src/i18n/messages.ts`、`src/app/styles/tokens.css`、`src/app/styles/components.css`、`tests/fate-card.test.ts`、`e2e/ui/encore.spec.ts`（修改）；尚无 Git 提交，按用户要求未 commit/push。
- 验证方法与实际结果（区分未运行、失败、通过；写明验证范围）：`npm run check` 通过（45 文件、671 项测试）。`npm run build -- --base=/ghost-rehearsal/` 通过，`dist` 无外部引用。`npx playwright test e2e/ui/encore.spec.ts e2e/ui/compare-first-screen.spec.ts` 在 desktop/mobile × 中英文共 16/16 通过（最终 CSS 后重跑一次仍通过），新用例核验预览自然尺寸 1200×630、两种下载文件名、SVG 渲染、PNG 签名与 IHDR 2400×1260 及可解码、防重复点击、编码失败提示、Escape/关闭后焦点回到触发按钮、Blob URL 全部释放、无横向溢出、零外部请求。`npm run test:browser:smoke` 首次运行因配置的 600 秒 `globalTimeout` 到期而 39 通过、1 失败（进行中的 `critical.spec.ts` 键盘菜单用例）、8 未运行；加 `--global-timeout=1700000` 重跑 48/48 通过，未修改配置。MCP 两个工具各调用一次：6/6 摘要匹配，`side-stream:10` 在 03:30 分叉。受保护文件（`src/simulation`、`src/schemas`、`examples`、`TopBar.tsx`、冻结摘要测试、`package*.json`）`git diff` 为空。WebKit 套件未运行；未在 Kiro IDE 中手动点击验证。
- 原始对话文件／相关截图：待导出；验证期截图为临时文件，已删除，未保存为证据。
- 遇到的问题、纠正过程与尚未完成的事项：smoke 首次运行的失败源自全局超时而非用例断言，重跑通过，不等同于默认配置下一次通过。`README.md` 与 `docs/kiroween-submission.md` 仍写“直接下载 SVG”，未更新。PNG 文字使用 SVG 自带回退字体（页面网页字体在图片上下文中不可用）。
## 最终参赛汇总

上方英文主报告（Section 1–4）即为面向 Kiroween 评委的最终参赛汇总。本节保留作 Stop Hook 追加锚点。

## 单次记录模板

- 日期与时间（UTC+8）：
- 任务名称／对应 Spec：
- 本次要解决的问题：
- 实际使用的 Kiro 功能（如 Spec、Steering、Hook；未使用的不填写）：
- Kiro 实际完成的工作：
- 人工／其他工具的修改、审查或决策：
- 产物文件／Git 提交编号（尚无提交时注明）：
- 验证方法与实际结果（区分未运行、失败、通过；写明验证范围）：
- 原始对话文件／相关截图：
- 遇到的问题、纠正过程与尚未完成的事项：

</details>
