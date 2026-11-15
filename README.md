# Ghost Rehearsal 👻

**Rehearse an event before the real guests arrive.**

See how staffing and flow decisions change people’s waiting before real guests arrive. Build an event, rehearse two arrangements with the same simulated guests, then follow the same person across both plans to see where their wait and outcome changed. The ghosts make those individual journeys visible.

[Open the live workbench](https://kanzaler123.github.io/ghost-rehearsal/) · [Kiro usage status](KIRO_USAGE.md) · [MIT license](LICENSE)

![The Haunted House example in the Ghost Rehearsal workbench](docs/images/workbench.png)

## What you can do

- **Start with an event:** set its name, guest count, duration, and arrival window. Each event has its own plans; creating another event keeps the existing ones.
- **Build a flow:** entrances, services, decisions, waiting areas, merges, exits, and subflow groups; curved connections, parameter editing, undo/redo, and automatic layout. Double-click the canvas to find a node, use right-click menus, or switch between selection and hand tools.
- **Reuse your work:** start with Haunted House, Trick or Treat, Open House, or a blank plan. Save a node or an entire plan as a template. Each plan has its own node list. When applying a node template, choose shared or copied resources; matching shared posts include the new node, while copies add staff and equipment.
- **Run a rehearsal:** deterministic arrivals and sampling, queues, branching, batch release, shared staff and equipment, shifts, handovers, and opening/closing rules.
- **Follow the ghosts:** replay actual simulation events, inspect a guest's journey, and inspect backlog evidence, resource states and operating rules. Route markers represent recorded transfers; zero-time transfers have no travel animation.
- **Compare Two Futures:** synchronize two plans, open groups of guests with less/more/unchanged waiting, compare outcomes and node waits, and inspect parameter and resource-cost differences. Changed inputs mark previous results as stale.
- **Keep your plans:** recover browser drafts, save locally, import/export project JSON, and export staff posts, batch rules, routes, closures and parameter sources as a readable operational plan. Switch between English and Chinese.

No account, API key, or backend is needed. Simulation runs in a browser worker; project data stays in your browser unless you export it. Fonts and icons are bundled locally.

## Try it in three minutes

1. Open the [live workbench](https://kanzaler123.github.io/ghost-rehearsal/) or a local preview and choose **Try the two-plan demo**. Its parameters are synthetic.
2. Choose **Two Futures**. At the default 30-minute cutoff, A completes 43 guests and B completes 41, despite B adding a scanner. The point of this rehearsal is to discover why a plausible change has not helped overall.
3. Click **66 Less waiting**, **26 More waiting**, or **208 Unchanged**, then select a guest. Inspect both outcomes and their waits by node. Shorter waits can also result from leaving early; unfinished guests can keep waiting beyond the cutoff.
4. Click either plan’s waiting bar. The Inspector opens that plan’s node. The evidence card shows a backlog interval, rules, resource states and guest/event links. In B, the extra lane has no posted worker before the floater moves; packing remains heavily occupied. These observations motivate a new test, not a claim of one proven cause.
5. Inspect **Resource use** for A/B counts, scheduled hours, busy time, overtime and optional headcount/device limits. Then use **Try a packing-support plan** in Insights: this copies B and adds one packing worker with the same skill, shifts and unavailability as its existing packing worker. It compares the new plan against B and leaves the originals intact.
6. The extra-worker trial completes 72 guests at the same cutoff, with 218 unfinished and 10 leaving early; average wait is 15.90 minutes. This costs one additional worker, is not an equal-budget ranking, and is not a real-event forecast. [Inputs, results and interpretation](examples/README.md).

Use **More options → Run scope → Run to completion**, rerun, and choose **Statistics basis → Final / run limit** to inspect final summaries, guest waits and resource use. A final run can still contain unfinished guests if it reaches the limit. Statistics are separate from the current replay time.

**Event settings** supports arrival-group additions/removals, arrival patterns and time slots. The Inspector edits routing conditions and service samples; **Staff & devices** edits multiple shifts. Event, opening and shift times are displayed in minutes from the start; short service and handover durations remain in seconds. Plans can be renamed or deleted (with Undo available).

Applied project edits are saved as drafts separately from manual saves when their data format is valid. Apply changes in dialogs before relying on draft recovery. Refresh restores the newest draft; incomplete/invalid edits and unavailable storage trigger leave protection. A browser draft is local to that browser, so export important projects as files. Rehearsal results are recalculated after reloading.

Templates are stored separately from the current project in the same browser. In **Templates**, choose **Export all** to pack every saved node and plan into one JSON file. On another device, choose **Import templates** and select that backup, multiple individual files, or a mix of both. Each saved template also retains its own download button.

Imports add independent copies without replacing existing templates or the current project. If any selected file is invalid or unsupported, the whole batch is rejected and the library stays unchanged.

Plan template files include the flow, arrivals, and resources. Node template files retain the source plan and scenario as context for resource reuse; applying one adds the selected node and its resource dependencies. Project JSON exports do not include the saved-template library, so export the templates you want to keep separately. Simulation results are recalculated after a reload.

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

Local verification on **2026-11-15**: 148 automated tests across six files, both TypeScript checks, and the production build passed. Regression cases cover same-time queue peaks, node passage counts, template posts and copied device pools, legal attribute dictionary keys, paired outcomes, evidence windows and readable execution reports. Browser checks on the production preview covered A/B groups and journeys, B-only node inspection, resource limits, cutoff/final switching, the extra-worker trial, template resource sharing, arrival/branch/sample/shift editing, stale Inspector statistics, plan rename/delete/undo and draft recovery. A timed route marker was checked at half its recorded transfer duration; a zero-duration route showed no travel marker. Leave protection was checked with an invalid applied service time. This is local software verification, not real-event validation.

## Scope and limitations

This is a working preview. The planning specification describes a broader target; the preview has **not** completed acceptance of all 47 requirements.

- No real-event calibration or organizer trial has been completed or claimed. Use the [field-validation worksheet](docs/field-validation.md) to collect measured inputs and record whether a real organizer changes their arrangement.
- Example parameters are synthetic. Results describe the supplied assumptions, not guaranteed outcomes at a real event. This is an operational process model, not a crowd-safety or evacuation certification tool.
- The 10,000-guest run cap is a protective limit, not a performance certification at that size.
- Subflows currently group members. Advanced JSON editing is still needed for attribute definitions/distributions and imported per-guest arrival records.
- Statistics can use the observation cutoff or final/run-limit basis. Both plans must use the same scenario and fresh runs to enable paired comparison. Backlog evidence describes simultaneous constraints; it does not prove a unique cause.
- Stale-result detection uses an input comparison key, not the planned canonical SHA-256 fingerprint. JSON import/export is not acceptance of the full planned document codec.
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
| `tests/` | Schema, simulation, example, boundary, and template tests |
| [examples/open-house.json](examples/open-house.json) | Synthetic two-plan Open House example |
| [.kiro/specs/product-foundation/](.kiro/specs/product-foundation/) | Existing requirements, design, and task records |
| [.kiro/hooks/](.kiro/hooks/) | Kiro usage-recording hook configuration |
| [PLAN.md](PLAN.md) | Original product roadmap; planned scope, not a completion report |

Built with React, TypeScript, React Flow, Zod, Vite, and Vitest.

## 中文快速说明

Ghost Rehearsal（幽灵预演）用于搭建活动流程、模拟排队与人员设备安排，并比较不同方案。可直接打开上方在线演示，右上角切换中文；也可使用 Node.js 24，执行 `npm ci`、`npm run dev` 本地运行。

首次使用先创建活动，填写名称、人数、活动时长和入场时间，再选择空白流程或万圣节预设。左侧按“活动 → 方案 → 节点”组织，可新建和切换活动；每个活动有独立方案。画布支持双击搜索节点、右键操作、框选与多选、抓手平移和滚轮缩放。

模板库的“导出全部”将所有节点与方案模板打成一个 JSON 文件。“批量导入”可以一次选择整库备份、多个单独文件或混合选择。导入追加独立副本，不覆盖已有内容；任一文件有误时整批不导入。单个模板仍可单独导出。节点文件保留原方案及场景作为资源上下文。项目 JSON 不包含模板库，需要分别导出。当前是可运行预览版，尚未完成全部规划需求、Kiro 使用证明、演示视频和 Devpost 正式提交。

## License

Original project code is available under the [MIT license](LICENSE). Bundled dependencies and fonts retain their own licenses; their notices are included in [THIRD_PARTY_NOTICES.txt](public/THIRD_PARTY_NOTICES.txt) and distributed with the live build.
