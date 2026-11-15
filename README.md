# Ghost Rehearsal 👻

**Rehearse an event before the real guests arrive.**

See how staffing and flow decisions change people’s waiting before real guests arrive. Build an event, rehearse two arrangements with the same simulated guests, then follow the same person across both plans to see where their wait and outcome changed. The ghosts make those individual journeys visible.

[Open the live workbench](https://kanzaler123.github.io/ghost-rehearsal/) · [Kiro usage status](KIRO_USAGE.md) · [MIT license](LICENSE)

![The Haunted House example in the Ghost Rehearsal workbench](docs/images/workbench.png)

## What you can do

- **Start with an event:** set its name, guest count, duration, and arrival window. Each event has its own plans; creating another event keeps the existing ones.
- **Build a flow:** entrances, services, decisions, waiting areas, merges, exits, and subflow groups; curved connections, parameter editing, undo/redo, and stage-aware automatic layout. Subflows are drawn as stage frames, and the default view stays zoomed in far enough to read service times. Double-click the canvas to find a node, use right-click menus, or switch between selection and hand tools.
- **Reuse your work:** start with Haunted House, Trick or Treat, Open House, or a blank plan. Save a node or an entire plan as a template. Each plan has its own node list. When applying a node template, choose shared or copied resources; matching shared posts include the new node, while copies add staff and equipment.
- **Run a rehearsal:** deterministic arrivals and sampling, queues, branching, batch release, shared staff and equipment, shifts, handovers, and opening/closing rules.
- **Follow the ghosts:** replay actual simulation events in a stage view that folds each top-level subflow into one card; click a stage to open it. Cards show waiting, service, blocking and one-minute queue trends in one shared colour scheme, and key moments are marked on the timeline. Start following a guest from stories such as “waited longest” or “queuing now”; the followed ghost stays pinned and labelled on the canvas, with an aligned timeline per plan and the raw event log as evidence. Route markers represent recorded transfers; zero-time transfers have no travel animation.
- **Compare Two Futures:** start in **Overview**, with two synchronized canvases and a summary of completions, average waiting, and resource cost. Expand the report sections to inspect concrete input changes, outcomes, affected guests, where waiting changed, and resource use. Both canvases can open and zoom to the same stage. Try a slower-service stress scenario; changed inputs mark previous results as stale.
- **Inspect the people behind the numbers:** click an affected-group count or **Guest journey** to open a dedicated, full-height detail view. Browse the complete guest list with search and pagination, filtering by less waiting, more waiting, little change, or finishing in only one plan. Representative stories combine multiple labels for the same person. Compare the guest's aligned lanes, outcome, first visible divergence, station totals and recorded events, then return to **Overview**. These details use the selected statistics basis: the observation cutoff by default, or the final/run-limit record after a full run.
- **Keep your plans:** recover browser drafts, save locally, import/export project JSON, and export staff posts, batch rules, routes, closures and parameter sources as a readable operational plan. Switch between English and Chinese.
- **Use observed inputs:** import arrival CSV/TSV in an arrival group's **Event settings**, or service samples in a service node's Inspector. Choose units, preview errors and converted values, and explicitly apply the import. Arrival imports require the outer shared-event Apply; a service import is one undoable edit. Source notes survive manual value changes, which reset the source label to User estimate. See [data entry](docs/data-entry.md).
- **Test robustness:** open **Robustness lab** from Two Futures to run the selected plans across seeds and service multipliers at the displayed observation cutoff. The batch uses a fixed input snapshot; changed settings mark its results as out of date. Cancel or close the panel to stop its worker. Export a single group to reopen and reproduce it in the workbench. See [the experiment contract](docs/robustness-contract.md).

No account, API key, or backend is needed. Simulation runs in a browser worker; project data stays in your browser unless you export it. Fonts and icons are bundled locally.

## Try it in three minutes

1. Start this version locally (instructions below) and choose **Start the A/B/C guide** on the welcome screen or in the Build sidebar. The guide adds independent example plans and preserves existing events. The public deployment updates after a merge to main.
2. Read the A/B results: completed, unfinished, early departures, average/P90 waiting and resource costs. The example is synthetic, and B changes several arrangements at once.
3. Choose **Follow the same guest**, then **Jump to first difference**. Inspect the same ID's two recorded journeys, station table and events.
4. Choose **Inspect posts and resources**, then **Inspect packing evidence**. Check staff eligibility, actual postings and availability; the backlog alone does not establish a unique cause.
5. Choose **Create C and compare**. C adds one packing worker with the original worker's shifts and unavailable periods. Read all B/C outcomes and **View resource costs**; extra completions can accompany extra departures.
6. Choose **Prepare C export**, then **Download C arrangement**. The file includes C's rules, posts, sources and B/C evidence using the selected statistics basis and waiting rule. **Download A/B/C experiment** saves a separate, importable JSON containing only the guide's three plans and shared inputs; it leaves other events in the workbench. Re-import the JSON, open **Two Futures**, and choose **Choose comparison plans**. Select original B on the left and the packing-support experiment C on the right, select **Run to completion**, then run the comparison. This reruns both plans; cancelling the picker preserves the current comparison and guide step. Computed results, guide progress and view settings are not stored in the project file. **Reset guide** reuses its plans, **Rerun this comparison** recalculates them, and **Exit guide** leaves them available for free editing in Build.

The original two-plan example, blank flows, Haunted house and reusable templates remain available. Selecting Build exits the guide; normal project export preserves all its plans, while simulation results are recalculated after import.

Use **More options → Run scope → Run to completion**, rerun, and choose **Statistics basis → Final / run limit** to inspect final summaries, guest waits and resource use. A final run can still contain unfinished guests if it reaches the limit. Statistics are separate from the current replay time. Executing a cutoff run selects the observation-cutoff statistics automatically; a full run keeps your selected statistics basis. Changing only the next run's settings does not change the selected basis.

The comparison's **Waiting change rule** defaults to **At least 60 seconds** (inclusive). Choose **Any change** to include every nonzero change at millisecond resolution. Overview, Insights, guest filters, stories, histogram and comparison-evidence export share this setting. Primary waiting includes all arrived guests; the separate **Completed only** group shows its own n, mean and P90. Each side reports its actual statistics end, arrived/not-arrived counts and exclusions from the paired sample. Final results may end at different times. Missing final results and stale comparisons do not supply current comparison evidence.

比较默认按“至少相差 60 秒”分组（含边界），也可选择“查看任何变化”。总览、Insights、名单、故事、直方图与比较证据导出共用规则。主要等待统计包含全部已到达者；仅 completed 子群另列样本人数、均值和 P90。两侧分别显示实际统计结束、未到达和未配对人数；缺少最终结果或结果过期时不输出当前比较结论。


**Event settings** supports arrival-group additions/removals, arrival patterns and time slots. The Inspector edits routing conditions and service samples; **Staff & devices** edits multiple shifts. Event, opening and shift times are displayed in minutes from the start; short service and handover durations remain in seconds. Plans can be renamed or deleted (with Undo available).

Applied project edits are saved as drafts separately from manual saves when their data format is valid. Apply changes in dialogs before relying on draft recovery. Refresh restores the newest draft; incomplete/invalid edits and unavailable storage trigger leave protection. A browser draft is local to that browser, so export important projects as files. Rehearsal results are recalculated after reloading.

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

For the real Chromium/production-Worker smoke suite, run `npx playwright install chromium`, then `npm run build` and `npm run test:browser`. It starts its own preview server on port 4178 and covers desktop/390px in English/Chinese. Failure traces, screenshots, downloads and a JSON result go to ignored `test-results/`; the HTML report is in `playwright-report/`. CI installs Chromium with its system dependencies and checks the `/ghost-rehearsal/` deployment base path.

## Deployment and verification

[GitHub Actions](https://github.com/kanzaler123/ghost-rehearsal/actions/workflows/pages.yml) installs the locked dependencies, runs tests and type checks, and builds the site. Successful pushes to `main` deploy to GitHub Pages; pull requests run the checks without deployment.

The Pages build uses `/ghost-rehearsal/` as its base path. If you fork and publish under another repository name, update the build argument in [the workflow](.github/workflows/pages.yml), and select **GitHub Actions** in **Settings → Pages**. A normal local build uses `/`.

Local verification on **2026-11-15**: **263 automated tests across 12 files**, both TypeScript checks, and the production build passed. Automated coverage includes hand-calculated queues, shared resources, shifts and closing rules, unfinished guests and run limits, canonical files and fingerprints, viewport fitting, matching guest groups, cutoff-consistent journeys, and station totals that count each future once.

Desktop browser checks for the UI revision covered a fresh rehearsal opening with its flow centered, the dual-canvas comparison overview, complete group lists with search and pagination, report links to a key moment and plan rules, and the featured demo guest's first visible divergence at **03:30**: still queuing in A, being served in B. A **390 × 844 CSS-pixel** browser viewport also covered the Report / Flow / Guest navigation, selecting a guest to reveal their detail, resetting panel scroll positions, and keeping wide station tables within their own horizontal scroll area. These were Chromium checks, not a physical-device or cross-browser certification. Merge checks also covered switching the overview, guest journeys, resource summaries and backlog evidence between cutoff and final results, copying a plan without losing its comparison partner, and a 390 × 844 viewport without page overflow. The merged application reported no browser errors in these checks.

**Post-merge verification update, 2026-11-15:** the two new Specs are implemented. **272 tests across 12 files**, both TypeScript checks and the Pages production build passed. **8 real-Worker Chromium cases passed** across desktop/390px and English/Chinese, including the complete A/B/C guide, threshold and statistics switches, absent/stale results and actual imports/exports. The last suite took **75.972 seconds**, with no retries or skipped cases. The earlier figures above remain historical checkpoints. See the [validation record](docs/validation-2026-11-15.md) for intermediate failures, exact coverage, Hook evidence and remaining work. Remote CI/deployment has not been run for this local branch.

## Scope and limitations

This is a working preview. The planning specification describes a broader target; the preview has **not** completed acceptance of all 47 requirements.

- No real-event calibration or organizer trial has been completed or claimed. Use the [field-validation worksheet](docs/field-validation.md) to collect measured inputs and record whether a real organizer changes their arrangement.
- Example parameters are synthetic. Results describe the supplied assumptions, not guaranteed outcomes at a real event. This is an operational process model, not a crowd-safety or evacuation certification tool.
- The 10,000-guest run cap is a protective limit, not a performance certification at that size.
- Subflows group members for display and act as stages in Rehearse and Two Futures; they do not change the simulation. Advanced JSON editing is still needed for attribute definitions/distributions; per-guest arrival records can be imported through Event settings.
- Comparison summaries and guest-journey lanes, outcomes, event evidence and station totals default to the observation cutoff. After running to completion, select the final/run-limit basis to inspect the full results. The journey view, report and resource summaries follow the selected basis. Backlog evidence describes simultaneous constraints; it does not prove a unique cause.
- Stale-result detection uses canonical SHA-256 fingerprints. Display names and layout changes preserve results; simulation inputs and provenance kinds affect the fingerprint. Omitted transfer durations remain omitted, without invented provenance. The codec currently supports schema version 1; historical migrations will need implementation when the format advances.
- The complete output contracts, extended golden cases, large-scale benchmarks, and full keyboard-interaction acceptance remain unfinished.

## Kiroween 2026

Intended category: **Costume Contest**. Ghosts represent the same simulated guests across alternative arrangements, making queues, individual waiting and outcome changes visible.

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

本分支新增欢迎页和搭建侧栏的“开始 A/B/C 引导演示”：自动运行 A/B → 同一访客 → 首次差异 → 岗位与资源 → 创建 C → 检查 B/C 全部结局及资源代价 → 导出 C 安排与比较证据。引导保留已有活动；可退出、重置和重跑，切回“搭建”可自由编辑。重置后再创建 C 会复用本次引导的 C，不反复添加副本。合并部署前，请本地运行体验。

三个模式的界面重点不同：

- **搭建：** 以可读、可编辑的节点为中心，子流程显示为阶段框。
- **预演：** 默认按阶段折叠流程，左侧收为阶段导航，顶部分开显示“此刻（回放时刻）”与“观察截止（截止汇总）”，底部提供此刻最长队列、关键时刻和幽灵追踪。
- **双未来：** 默认进入“总览”，同时展示两张联动画布和完成、等待、资源代价三项摘要。报告详情可展开，依次查看具体改动、结果变化、受影响的人群、等待变化集中在哪里以及资源使用情况。

点击受影响人数或“访客旅程”，进入独立的全高详情视图。完整名单支持搜索、分页，以及少等、多等、变化不足一分钟、只在 A 完成、只在 B 完成等筛选；同一代表人物的多个故事合并显示。选择一位参与者后，可比较两个未来的时间带、结局、首次差异、逐站用时和事件证据，再通过“返回比较总览”回到整体方案。旅程记录默认使用观察截止；全程运行后可以切换最终统计，报告、时间带、逐站表和资源统计随所选口径更新。累计等待统一写作“人·分钟”。

本轮验证记录（**2026-11-15**）：**12 个测试文件、263 项自动化测试**、两项 TypeScript 检查和生产构建通过。当前桌面浏览器已检查新运行的流程居中、双画布总览、完整筛选名单，以及示例代表人物在 **03:30** 的首次可见差异：A 仍在排队，B 已开始服务。

以上为历史检查点。本次合并后开发最终验证：**272 项测试、两项 TypeScript 检查、Pages 生产构建通过；8 项真实 Worker 浏览器用例全部通过**，覆盖中英文、桌面和 390px、完整 A/B/C、统计切换、未到达/缺少最终结果/过期及导入导出。耗时 **75.972 秒**，无重试或跳过。Kiro Hook 仅核实已加载，实际执行仍未证实；本轮全部按 Codex 贡献记录。详见[验证记录](docs/validation-2026-11-15.md)。

模板库的“导出全部”将所有节点与方案模板打成一个 JSON 文件。“批量导入”可以一次选择整库备份、多个单独文件或混合选择。导入追加独立副本，不覆盖已有内容；任一文件有误时整批不导入。单个模板仍可单独导出。节点文件保留原方案及场景作为资源上下文。项目 JSON 不包含模板库，需要分别导出。当前是可运行预览版，尚未完成全部规划需求、Kiro 使用证明、演示视频和 Devpost 正式提交。

## License

Original project code is available under the [MIT license](LICENSE). Bundled dependencies and fonts retain their own licenses; their notices are included in [THIRD_PARTY_NOTICES.txt](public/THIRD_PARTY_NOTICES.txt) and distributed with the live build.
