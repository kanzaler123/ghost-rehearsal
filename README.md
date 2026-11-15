# Ghost Rehearsal 👻

**Rehearse an event before the real guests arrive.**

Ghost Rehearsal is a visual event planner and discrete-event simulator with a Halloween costume: ghost guests, pumpkin lanterns, a moonlit canvas, and curved routes. Build an event, watch its queues form, and compare two plans under the same arrival conditions.

[Open the live workbench](https://kanzaler123.github.io/ghost-rehearsal/) · [Kiro usage status](KIRO_USAGE.md) · [MIT license](LICENSE)

![The Haunted House example in the Ghost Rehearsal workbench](docs/images/workbench.png)

## What you can do

- **Start with an event:** set its name, guest count, duration, and arrival window. Each event has its own plans; creating another event keeps the existing ones.
- **Build a flow:** entrances, services, decisions, waiting areas, merges, exits, and subflow groups; curved connections, parameter editing, undo/redo, and stage-aware automatic layout. Subflows are drawn as stage frames, and the default view stays zoomed in far enough to read service times. Double-click the canvas to find a node, use right-click menus, or switch between selection and hand tools.
- **Reuse your work:** start with Haunted House, Trick or Treat, Open House, or a blank plan. Save a node or an entire plan as a template. Each plan has its own node list, and applying a saved template creates an independent copy.
- **Run a rehearsal:** deterministic arrivals and sampling, queues, branching, batch release, shared staff and equipment, shifts, handovers, and opening/closing rules.
- **Follow the ghosts:** replay actual simulation events in a stage view that folds each top-level subflow into one card; click a stage to open it. Cards show waiting, service, blocking and one-minute queue trends in one shared colour scheme, and key moments are marked on the timeline. Start following a guest from stories such as “waited longest” or “queuing now”; the followed ghost stays pinned and labelled on the canvas, with an aligned timeline per plan and the raw event log as evidence.
- **Compare Two Futures:** start in **Overview**, with two synchronized canvases and a summary of completions, average waiting, and resource cost. Expand the report sections to inspect concrete input changes, outcomes, affected guests, where waiting changed, and resource use. Both canvases can open and zoom to the same stage. Try a slower-service stress scenario; changed inputs mark previous results as stale.
- **Inspect the people behind the numbers:** click an affected-group count or **Guest journey** to open a dedicated, full-height detail view. Browse the complete guest list with search and pagination, filtering by less waiting, more waiting, little change, or finishing in only one plan. Representative stories combine multiple labels for the same person. Compare the guest's aligned lanes, outcome, first visible divergence, station totals and recorded events, then return to **Overview**. These details all use the same observation cutoff, even when the full simulation continues beyond it.
- **Keep your plans:** save locally, import/export project JSON, and export an operational plan in Markdown. Switch between English and Chinese.

No account, API key, or backend is needed. Simulation runs in a browser worker; project data stays in your browser unless you export it. Fonts and icons are bundled locally.

## Try it in three minutes

1. Open the [live workbench](https://kanzaler123.github.io/ghost-rehearsal/). On a fresh visit, create your own event or choose **Try the two-plan demo** for the walkthrough below.
2. Click **Run rehearsal**, then play or scrub the timeline to inspect queues and guest journeys.
3. Choose **Two Futures** to run the included baseline and alternative plans. They share the same guest scenario but have different service and resource arrangements. Start with the completion, waiting and cost summary in **Overview**.
4. Click a group count to inspect its complete guest list, or open **Guest journey** and choose a representative story. Jump to the first difference, compare the two cutoff records, then use **Back to comparison** to return to the overview.
5. Return to **Build** and open **Templates**. Add **Haunted house** for a smaller Halloween flow, or start a blank plan.
6. Select a node to edit it. Save a node or plan as a template to reuse it later; use the save button to persist the current project.

Templates are stored separately from the current project in the same browser. In **Templates**, choose **Export all** to pack every saved node and plan into one JSON file. On another device, choose **Import templates** and select that backup, multiple individual files, or a mix of both. Each saved template also retains its own download button.

Imports add independent copies without replacing existing templates or the current project. If any selected file is invalid or unsupported, the whole batch is rejected and the library stays unchanged.

Plan template files include the flow, arrivals, and resources. Node template files retain the source plan and scenario as context for resource reuse; applying one adds the selected node and its resource dependencies. Project JSON exports do not include the saved-template library, so export the templates you want to keep separately. Simulation results are recalculated after a reload.

Project files use a canonical JSON format with explicit defaults and unordered collections sorted by ID. Reopening or importing selects the first plan in that order. Invalid imports list every detected issue and preserve the current project, including unsaved edits; files from a newer schema version require an updated application.

The event selector and **Event settings** button sit above the plan list. Only plans belonging to the selected event are shown. The canvas takes interaction cues from [ComfyUI's canvas controls](https://docs.comfy.org/interface/canvas-controls): drag a selection box in Select mode, hold Space or the middle mouse button to pan, scroll to zoom, or use the Hand tool. Shift/Ctrl/Cmd-click selects multiple nodes. Double-click or right-click empty canvas to add a node at that location; right-click a node to edit or delete it. Canvas insertion and opening the inspector preserve the viewport.

## Run locally

Use **Node.js 24 LTS** and npm. The supported Node versions are declared in `package.json`.

```sh
git clone https://github.com/kanzaler123/ghost-rehearsal.git
cd ghost-rehearsal
npm ci
npm run dev
```

Open `http://127.0.0.1:5173` or the address printed by Vite.

```sh
npm run check
npm run build
npm run preview
```

`check` runs both strict TypeScript checks and the automated tests once. `build` produces `dist/`; `preview` serves that build locally. There are no environment variables or external services to configure.

## Deployment and verification

[GitHub Actions](https://github.com/kanzaler123/ghost-rehearsal/actions/workflows/pages.yml) installs the locked dependencies, runs tests and type checks, and builds the site. Successful pushes to `main` deploy to GitHub Pages; pull requests run the checks without deployment.

The Pages build uses `/ghost-rehearsal/` as its base path. If you fork and publish under another repository name, update the build argument in [the workflow](.github/workflows/pages.yml), and select **GitHub Actions** in **Settings → Pages**. A normal local build uses `/`.

Local verification on **2026-11-15**: **235 automated tests across 12 files**, both TypeScript checks, and the production build passed. Automated coverage includes hand-calculated queues, shared resources, shifts and closing rules, unfinished guests and run limits, canonical files and fingerprints, viewport fitting, matching guest groups, cutoff-consistent journeys, and station totals that count each future once.

Desktop browser checks for this revision covered a fresh rehearsal opening with its flow centered, the dual-canvas comparison overview, complete group lists with search and pagination, report links to a key moment and plan rules, and the featured demo guest's first visible divergence at **03:30**: still queuing in A, being served in B. A **390 × 844 CSS-pixel** browser viewport also covered the Report / Flow / Guest navigation, selecting a guest to reveal their detail, resetting panel scroll positions, and keeping wide station tables within their own horizontal scroll area. These were Chromium checks, not a physical-device or cross-browser certification.

## Scope and limitations

This is a working preview. The planning specification describes a broader target; the preview has **not** completed acceptance of all 47 requirements.

- Example parameters are synthetic. Results describe the supplied assumptions, not guaranteed outcomes at a real event. This is an operational process model, not a crowd-safety or evacuation certification tool.
- The 10,000-guest run cap is a protective limit, not a performance certification at that size.
- Subflows group members for display and act as stages in Rehearse and Two Futures; they do not change the simulation. Advanced JSON editing exposes complex distributions, attribute routing, and multi-segment shifts.
- Comparison summaries and guest-journey lanes, outcomes, event evidence and station totals use the observation cutoff. Completion mode can continue the simulation and canvas playback beyond that cutoff; the journey view keeps its cutoff boundary visible and explains when replay has moved past it.
- Stale-result detection uses canonical SHA-256 fingerprints. Display names and layout changes preserve results; simulation inputs and provenance kinds affect the fingerprint. Omitted transfer durations remain omitted, without invented provenance. The codec currently supports schema version 1; historical migrations will need implementation when the format advances.
- The complete output contracts, extended golden cases, large-scale benchmarks, and full keyboard-interaction acceptance remain unfinished.

## Kiroween 2026

Intended category: **Costume Contest**. The Halloween presentation wraps a practical event-planning tool; ghosts represent simulated guests and make queues and individual journeys visible.

The public repository includes the source, examples, setup instructions, an open-source license, and the root [`.kiro/`](.kiro/) directory. English product and testing instructions are above; the original internal planning documents remain in Chinese.

**Submission is not complete.** The existing Kiro usage log has no verified development entries or exported sessions. The current implementation and repository preparation were completed with Codex; the presence of spec and hook files does not establish that Kiro executed them. See [KIRO_USAGE.md](KIRO_USAGE.md) for the evidence status and recording template.

Before submitting, complete substantive work in Kiro and document its actual contribution, provide a public YouTube demo shorter than three minutes, supply English versions of any additional materials used in the submission, and complete the Devpost entry. These are separate from publishing this repository. See the [official competition requirements](https://kiroween.devpost.com/rules).

## Project map

| Location | Contents |
| --- | --- |
| `src/app/`, `src/components/` | React workbench, flow canvas, inspector, and results |
| `src/features/project.ts` | Project operations, built-in examples, and reusable templates |
| `src/simulation/` | Simulation worker, event engine, and metrics |
| `src/schemas/` | Input schemas, graph validation, and plan operations |
| `src/i18n/` | English and Chinese interface text |
| `tests/` | Schema, simulation, comparison, viewport, template, and workbench tests |
| [examples/open-house.json](examples/open-house.json) | Synthetic two-plan Open House example |
| [.kiro/specs/product-foundation/](.kiro/specs/product-foundation/) | Existing requirements, design, and task records |
| [.kiro/hooks/](.kiro/hooks/) | Kiro usage-recording hook configuration |
| [PLAN.md](PLAN.md) | Original product roadmap; planned scope, not a completion report |

Built with React, TypeScript, React Flow, Zod, Vite, and Vitest.

## 中文快速说明

Ghost Rehearsal（幽灵预演）用于搭建活动流程、模拟排队与人员设备安排，并比较不同方案。可直接打开上方在线演示，右上角切换中文；也可使用 Node.js 24，执行 `npm ci`、`npm run dev` 本地运行。

首次使用先创建活动，填写名称、人数、活动时长和入场时间，再选择空白流程或万圣节预设。左侧按“活动 → 方案 → 节点”组织，可新建和切换活动；每个活动有独立方案。画布支持双击搜索节点、右键操作、框选与多选、抓手平移和滚轮缩放。

三个模式的界面重点不同：

- **搭建：** 以可读、可编辑的节点为中心，子流程显示为阶段框。
- **预演：** 默认按阶段折叠流程，左侧收为阶段导航，顶部分开显示“此刻（回放时刻）”与“观察截止（截止汇总）”，底部提供此刻最长队列、关键时刻和幽灵追踪。
- **双未来：** 默认进入“总览”，同时展示两张联动画布和完成、等待、资源代价三项摘要。报告详情可展开，依次查看具体改动、结果变化、受影响的人群、等待变化集中在哪里以及资源使用情况。

点击受影响人数或“访客旅程”，进入独立的全高详情视图。完整名单支持搜索、分页，以及少等、多等、变化不足一分钟、只在 A 完成、只在 B 完成等筛选；同一代表人物的多个故事合并显示。选择一位参与者后，可比较两个未来的时间带、结局、首次差异、逐站用时和事件证据，再通过“返回比较总览”回到整体方案。上述旅程记录统一使用观察截止，时间带和逐站表明确标注范围；即使全程运行及画布回放超过截止，也不会混入截止后的个人记录。累计等待统一写作“人·分钟”。

本轮验证记录（**2026-11-15**）：**12 个测试文件、235 项自动化测试**、两项 TypeScript 检查和生产构建通过。当前桌面浏览器已检查新运行的流程居中、双画布总览、完整筛选名单，以及示例代表人物在 **03:30** 的首次可见差异：A 仍在排队，B 已开始服务。

模板库的“导出全部”将所有节点与方案模板打成一个 JSON 文件。“批量导入”可以一次选择整库备份、多个单独文件或混合选择。导入追加独立副本，不覆盖已有内容；任一文件有误时整批不导入。单个模板仍可单独导出。节点文件保留原方案及场景作为资源上下文。项目 JSON 不包含模板库，需要分别导出。当前是可运行预览版，尚未完成全部规划需求、Kiro 使用证明、演示视频和 Devpost 正式提交。

## License

Original project code is available under the [MIT license](LICENSE). Bundled dependencies and fonts retain their own licenses; their notices are included in [THIRD_PARTY_NOTICES.txt](public/THIRD_PARTY_NOTICES.txt) and distributed with the live build.
