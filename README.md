# Ghost Rehearsal 👻

**Rehearse an event before the real guests arrive.**

Ghost Rehearsal is a visual event planner and discrete-event simulator with a Halloween costume: ghost guests, pumpkin lanterns, a moonlit canvas, and curved routes. Build an event, watch its queues form, and compare two plans under the same arrival conditions.

[Open the live workbench](https://kanzaler123.github.io/ghost-rehearsal/) · [Kiro usage status](KIRO_USAGE.md) · [MIT license](LICENSE)

![The Haunted House example in the Ghost Rehearsal workbench](docs/images/workbench.png)

## What you can do

- **Start with an event:** set its name, guest count, duration, and arrival window. Each event has its own plans; creating another event keeps the existing ones.
- **Build a flow:** entrances, services, decisions, waiting areas, merges, exits, and subflow groups; curved connections, parameter editing, undo/redo, and automatic layout. Double-click the canvas to find a node, use right-click menus, or switch between selection and hand tools.
- **Reuse your work:** start with Haunted House, Trick or Treat, Open House, or a blank plan. Save a node or an entire plan as a template. Each plan has its own node list, and applying a saved template creates an independent copy.
- **Run a rehearsal:** deterministic arrivals and sampling, queues, branching, batch release, shared staff and equipment, shifts, handovers, and opening/closing rules.
- **Follow the ghosts:** replay actual simulation events, inspect a guest's journey, and see waiting-time and resource-use summaries.
- **Compare Two Futures:** synchronize two plans, compare the same guests, inspect parameter differences, and try a slower-service stress scenario. Changed inputs mark previous results as stale.
- **Keep your plans:** save locally, import/export project JSON, and export an operational plan in Markdown. Switch between English and Chinese.

No account, API key, or backend is needed. Simulation runs in a browser worker; project data stays in your browser unless you export it. Fonts and icons are bundled locally.

## Try it in three minutes

1. Open the [live workbench](https://kanzaler123.github.io/ghost-rehearsal/). On a fresh visit, create your own event or choose **Try the two-plan demo** for the walkthrough below.
2. Click **Run rehearsal**, then play or scrub the timeline to inspect queues and guest journeys.
3. Choose **Two Futures** to run and compare the included baseline and alternative plans. They share the same guest scenario but have different service and resource arrangements.
4. Return to **Build** and open **Templates**. Add **Haunted house** for a smaller Halloween flow, or start a blank plan.
5. Select a node to edit it. Save a node or plan as a template to reuse it later; use the save button to persist the current project.

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

Local verification on **2026-11-15**: 112 automated tests across five files, both TypeScript checks, and the production build passed. Browser checks covered running and comparing plans, template copies and reload persistence, project import/export, curved connections, and desktop/mobile layouts. Tests include hand-calculated queue cases, shared resources, shift changes, closing policies, incomplete guests, and run limits.

## Scope and limitations

This is a working preview. The planning specification describes a broader target; the preview has **not** completed acceptance of all 47 requirements.

- Example parameters are synthetic. Results describe the supplied assumptions, not guaranteed outcomes at a real event. This is an operational process model, not a crowd-safety or evacuation certification tool.
- The 10,000-guest run cap is a protective limit, not a performance certification at that size.
- Subflows currently group members. Advanced JSON editing exposes complex distributions, attribute routing, and multi-segment shifts.
- Waiting summaries use the observation cutoff; completion mode can continue simulation and event playback beyond that cutoff.
- Stale-result detection uses an input comparison key, not the planned canonical SHA-256 fingerprint. JSON import/export is not acceptance of the full planned document codec.
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
