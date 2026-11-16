# B：仿真抽样与统计口径一致性

日期：2026-11-16（Asia/Singapore）。本轮实施与验证工具：Codex、Git、Node/npm、Vitest、Vite、Playwright；未使用 Kiro，未声称 Kiro 开发或 Hook 执行。

## 基线与隔离

- 参考提交、实际起点及远端 main 均为 `f8371999e64d25c250699e5cd96f85eabb79bb32`。本机直连 `git fetch origin main` 因 github.com:443 连接失败；先通过 GitHub 连接器确认，随后使用本机已启用的系统代理完成 fetch，再次确认 SHA 一致。未修改仓库或全局代理配置。
- 分支：`fix/sampling-and-statistics`。独立 worktree：`C:/Users/kanzaler/Desktop/ghost-rehearsal-sampling-statistics`。
- 实现、测试及微基准提交：`098f1f502edf852da7c3eaa39a73d49afb678d17`，已推送同名远端分支；本交接记录另作提交。
- [Draft PR #34](https://github.com/kanzaler123/ghost-rehearsal/pull/34)，目标 main；待独立评审及 UI 接线，没有合并或部署。
- 原目录 `C:/Users/kanzaler/Desktop/KIROWWEN` 保持 `feat/ui-creative-redesign`；开始时有未跟踪的 `.kiro/specs/ui-creative-redesign/`，未处理该会话内容。
- 已阅读 README、package.json、测试/构建配置、`.kiro/steering/comparison-evidence.md` 及其引用的两个需求文件。旧 `docs/parallel-release/README.md` 描述的是此前的 A–E 发布包；本轮 B 的范围及交付位置以本次任务为准。
- 仅改 `input.ts`、`engine.ts`、`analysis.ts`、对应单元测试及本目录。未改 metrics、回放、App、组件、样式、翻译、依赖或锁文件。

## 交付状态

| 项目 | 状态 | 证据 / 未完成项 |
| --- | --- | --- |
| 实测服务抽样预排序 | **问题已在生产调用路径解决（本分支代码）** | 正常 Worker、稳健性 Worker 均调用 `simulate()`；服务启动已经使用本次运行的预排序抽样器。无需 App 接线。未合并、未部署，线上版本不在此声明范围内。 |
| 单方案故事统计口径 | **核心逻辑完成，应用接入待完成** | 新增第五参数接收所选 `Statistics`；单元测试覆盖截止/最终等待和结局。App 仍保持原来的三参数调用，所以本分支的整页故事问题尚未解决。 |
| 中英文故事标题 | **仍未解决，交由 UI 接入** | 现有“截止时尚未完成 / Not finished at cutoff”不适用于最终口径；准确替换清单见下。 |

## 抽样实现与生命周期

原 `sample(duration, u)` 在 empirical 分支按数值升序复制排序，并以 `floor(u * n)` 取样。保留该公共接口及其直接调用行为；可变输入的单次调用不使用隐式长期缓存。

新增 `prepareSampler(duration): (u: number) => number`。empirical 分支创建一份独立的已排序样本快照；返回的闭包只做下标选择。`simulate()` 在校验通过、展开子流程之后，为每个服务节点创建一次抽样器，随后所有服务访问复用它。非 empirical 分布仍委托原 `sample()`；路段分布的调用保持原样（路段 schema 不允许 empirical）。

- 原请求和样本顺序不变。`keyedDraw`、调用次数/顺序、stage key、visit、服务倍率以及倍率后毫秒取整保持原样。MODEL_VERSION、指纹计算和输入格式未变。
- 快照与抽样器 Map 仅由一次同步 `simulate()` 的局部变量持有；不写入结果、不使用模块级缓存或项目注册表。成功、事件上限中止、异常退出后均无跨运行的持有者，随后可由 GC 回收；Worker 取消也不保留缓存。
- 下一次运行无条件重建，包括原地修改样本元素、改变长度、替换数组、重新导入、改变种子或倍率。不会按旧数组身份复用缓存。
- 直接使用新工厂的调用者拿到的是明确的 empirical **快照**；编辑原分布后应重新 `prepareSampler()`。旧闭包继续代表旧快照，并非可变分布的实时视图。生产调用在每次运行内完成此生命周期，无需 UI 管理。
- 代价：每个服务节点额外保存一份排序数组；每次运行仍需一次排序。本实现预先准备所有服务节点，包括运行中未访问的节点；小样本或少访客场景不保证收益。

## 一致性与定向微基准

复现（使用现有依赖，无新增安装项）：

```sh
node docs/engineering/B/benchmark.mjs
```

默认写入忽略的 `test-results/sampling-benchmark.json`。本轮原始记录为 [benchmark-results.json](benchmark-results.json)，命令为 `node docs/engineering/B/benchmark.mjs docs/engineering/B/benchmark-results.json`。复测请用新的结果路径，保留本轮记录。

脚本直接从 Git 提取参考提交的完整 schemas/simulation 代码，和当前源码分别由 Vite SSR 加载；没有把简化公式假装成旧引擎。提取目录仅在本 worktree 的 `test-results/`，结束后删除。计时前，逐一严格比较 2,000 次抽样及 20 个完整 SimulationRun（请求、人口、所有事件、结局、截止/最终统计、实际结束时间、指纹、issues），并检查输入未变。每轮计时还核对结果校验和。

环境：Windows 10.0.26200 x64；Intel Core i7-14650HX，24 逻辑 CPU，31.62 GiB RAM；Node 24.18.0，V8 13.6.233.17-node.50，Vite 8.3.8。记录时间为本地 18:28（JSON 使用 UTC）。计时时未同时启动本任务测试/构建，但没有隔离系统上其他会话或控制 CPU 频率。

工作量：10,000 条 empirical 格式样本，公式 `((index * 7919) % 997) / 100 + 0.00049`，包含重复值及亚毫秒值。它们是**合成基准数据，不是实地观测证据**。抽样阶段使用同一组 2,000 个 keyedDraw 随机数，并将一次预排序计入新实现时间。批量阶段为 10 个种子（42–51）× 2 个服务倍率（1、1.25）× 100 位同时到达访客，共 20 次完整仿真、2,000 次服务、14,000 条事件；单节点并发 4，截止 50 秒、运行上限 2,000 秒。

每组先预热一对，再测量五对，交替新旧执行顺序。原始时间、顺序、校验和全部保留；下表单位 ms，汇总使用五次正式测量中位数。

| 工作量 | 旧实现正式原始测量 | 新实现正式原始测量 | 中位数（旧 → 新） | 本机观测比值 |
| --- | --- | --- | --- | --- |
| 2,000 次抽样（含新实现准备） | 2159.330, 2149.192, 2157.803, 2212.016, 2193.285 | 1.138, 1.315, 1.137, 1.165, 1.396 | 2159.330 → 1.165 | 1853.03× |
| 20 次同步仿真 | 16380.495, 16500.751, 15284.830, 15948.164, 16756.787 | 1747.730, 1559.197, 1567.825, 1654.415, 1512.466 | 16380.495 → 1567.825 | 10.45× |

预热时间分别为抽样 2158.154 / 1.384 ms、批量 3016.849 / 1790.708 ms。尤其旧引擎的批量预热与后续测量差异明显；可能受 JIT、GC 或系统竞争影响，本轮未进一步归因，不能把单机比值当稳定承诺。**两组都是限定工作量的局部测量，不能称整页或整个应用同等加速**。批量计时包含校验、指纹、事件与统计计算，未覆盖 Worker 通信、回放、渲染或稳健性汇总。

测量发生在提交前，JSON 的 `candidateHead` 因而仍是起点提交；`candidateSourceSha256` 标识实际测量的两份修改后源码，供与交付内容核对。

## App 接线清单（未实施）

### 位置、接口和参数

基线 `src/app/App.tsx:210` 已有 `selectedStats = statisticsAt(run, basis)`；`:212–213` 的 `picks` useMemo 仍调用 `rehearsePicks(run, view, time)`。

新接口：

```ts
rehearsePicks(
  run: SimulationRun,
  view: PlaybackState,
  time: number,
  size = 3,
  stats: Statistics | null = run.statistics,
): PickGroup[]
```

建议把原 memo 改成以下内容（由 UI 会话实施）：

```tsx
const selectedStats = statisticsAt(run, basis), selectedSecondStats = statisticsAt(secondRun, basis);
const picks = useMemo(() => !run ? [] : comparing ? comparison.picks()
  : rehearsePicks(run, view, time, 3, selectedStats),
[run, comparing, comparison, view, time, selectedStats]);
```

第四参数仍然是条数。传 `undefined` 作为第四参数也可保留默认三条；**不要把 basis 或 Statistics 放入第四参数**。新接口接收 Statistics，不接收 basis 字符串；如调用处没有 selectedStats，使用 `rehearsePicks(run, view, time, 3, statisticsAt(run, basis))`。

### 生命周期与不可用状态

- 切换口径只重新派生 picks，不重新运行仿真。memo 必须依赖 `selectedStats`；替换运行、换方案、拖动/倒退回放都按现有 `run/view/time` 更新。
- `queuedNow` 只读当前 `view` 和 `time`，包括排队、阻塞和等待区；它的值是本次当前等待状态已持续的秒数。`longest/unfinished/left` 的累计等待、人数、结局只读传入的统计，不受回放滑块限制。
- `statisticsAt()` 在缺少最终结果、failed、aborted 时返回 `null`。必须原样传 null；不要写 `selectedStats ?? run.statistics`，也不要传 `undefined`，否则会恢复兼容默认值。显式 null 只保留可用的 `queuedNow`，不生成历史统计故事。
- 新函数不负责检测 stale、标记错误或决定旧结果是否可继续回看。App 保留现有 RunStateCard/过期提示和取消语义；如果某状态不允许展示历史结论，应显式传 null。不能将旧记录的故事描述成当前输入的结论。
- 既有三参数、第四参数 size 调用完全兼容，默认仍读 run.statistics。因此**未接线时问题继续存在**。

### 现有消费者和中英文文案

App `:746` 把 picks 传给 `NowPanel`，`:750–751` 传给 `GhostJourney`。两者继续接收相同 PickGroup 结构，不需要更改数据协议。显示标题的位置是 `src/components/Rehearse.tsx:71` 和 `src/components/Journey.tsx:287`，均直接使用 `t.journey.picks[key]`；文案定义在 `src/i18n/messages.ts:268`、`:734`。

最低限度采用不限定“截止”的中英文标题，无需为此新增组件参数：

| key | 英文建议 | 中文建议 | 语义 |
| --- | --- | --- | --- |
| queuedNow | Queuing right now（保持） | 此刻正在排队（保持） | 回放时刻，不跟随统计口径 |
| longest | Longest total wait (selected basis) | 累计等待最久（所选统计口径） | 全部已到达者；包括尚未完成者 |
| unfinished | Not finished by statistics end | 统计结束时尚未完成 | **替换 Not finished at cutoff / 截止时尚未完成**；最终到达运行上限时仍可能存在 |
| left | Other endings by statistics end | 统计结束前的其他结局 | rejected、dismissed、diverted、loop_limit；不含 completed、unfinished、not_arrived |

如果 UI 选择分口径标题，cutoff 可继续使用原“截止时尚未完成”；completion 必须为“最终记录结束时尚未完成 / Not finished by final record end”，不能笼统写“所有人已完成”。实际结束值取 selectedStats.until，不能固定取 horizon 或当前回放 time。

### 接入后验收

1. 三位访客在 0 秒同时到达，单人服务 10 秒，截止 15 秒，全程结束 30 秒。在回放 5 秒时切换口径，历史等待按访客顺序为截止 0/10/15、最终 0/10/20；最长等待故事为第三位 15 → 20 秒。截止 unfinished 为两人，最终为空。
2. 同一回放 5 秒时 queuedNow 始终是第二、第三位，各等待 5 秒；切换口径不应改变它。回放到 25 秒时没有 queuedNow；切回截止仍保留截止的两位 unfinished。
3. horizon 设为 25 秒时，最终仍有第三位 unfinished，累计等待 20 秒；此时标题不得说“截止时”或“全员完成”。晚于 horizon 才到达者不进入 longest/unfinished/left。
4. 只运行 cutoff 后选择不可用最终统计、failed、aborted 时不得出现截止历史故事冒充最终；显式 null 的单元测试已经覆盖。验证切换口径不用重新运行，旧 size 调用仍限制条数。
5. 对照服务关闭后被遣散的访客：截止前没有 left、最终有 left，等待值来自最终统计。中英文、桌面/窄屏同时检查 NowPanel 与 GhostJourney 标题、值及回放独立性。

## 验证记录

- 基线：32 个测试文件、463 项测试通过。
- 新增针对样本分位、重复/零值、10,000 条样本、毫秒舍入、准备次数、编辑失效、三个种子、完整事件/统计、截止/最终故事与缺失统计的测试；未删除或削弱原有断言。
- 首轮开发测试：5 项新增测试失败，类型检查暴露 fixture 使用了不支持的 `observed` provenance，以及关闭时段遗漏 provenance；只修正测试输入为合法 schema。随后定向 3 文件、78 项测试及两项类型检查通过。
- 微基准初次执行因访客 ID 为数字开头被 schema 拒绝，未产生有效测量；修正为 `p` 前缀后，上述严格一致性检查与完整测量通过。
- `npm run check`：两项 TypeScript 检查及 33 文件、479 项单元测试通过。
- `npm run build -- --base=/ghost-rehearsal/`：通过；Vite 保留现有大于 500 kB 的 chunk 提示，未为本任务修改分包。
- `git diff --check`、提交前 `git diff --cached --check`：通过。已复查每个改动，仅保留上述需求所需的代码、测试及证据；源码 SHA256 与微基准记录吻合。
- 浏览器首轮 `npm run test:browser` 未执行用例：4178 端口被其他会话占用，未终止或复用其他进程。随后运行 `npm run test:browser -- --config=test-results/task-b.playwright.config.ts`：临时配置继承全部原配置，只更换预览端口为 4189、明确相同 e2e 目录及独立产物路径；保留四个项目、两个 worker、全部 284 项用例、原超时、零重试和所有错误断言。
- **本地浏览器整套未通过**：600 秒总时限触发，退出码 1，105 passed、1 skipped、178 did not run；另有 suite/teardown 两条全局超时错误，不能写成 105 项即整套通过。原始报告保留在本 worktree 的 `test-results/test-results/b-browser-results.json`，HTML 在 `test-results/playwright-report/b-browser/index.html`。未过滤 pageerror/ResizeObserver、增加重试、缩小范围或调整总超时。结束后未发现本任务目录对应的 preview/Playwright 进程残留。
- **实现提交的远端 Chromium 全量分片通过**：[Actions 43850111546](https://github.com/kanzaler123/ghost-rehearsal/actions/runs/43850111546)，两个原有分片各 140 passed、2 skipped，合计 **280 passed、4 skipped**；英文分片 5.3 分钟，中文分片 4.3 分钟。四项跳过均为仓库已有的可选 UI 截图用例。build 汇总成功，deploy skipped。
- **实现提交的远端 WebKit 工作流通过**：[Actions 43850111439](https://github.com/kanzaler123/ghost-rehearsal/actions/runs/43850111439)，import-webkit 与 comparison-webkit 均成功。上述远端证据对应 `098f1f502edf852da7c3eaa39a73d49afb678d17`，之后仅提交本 handoff，不改实现、测试或配置；不将该记录冒充后续提交的新 CI 结果。
- 交付前再次 fetch 核对 origin/main，仍为上述基线。最终保留 Draft PR 等待评审；没有合并或部署。

## 剩余边界

- 不修改 metrics 或回放；不改变统计计算定义。本次故事修复属于选择已有 Statistics 的逻辑。
- 对可变输入直接调用 `sample()` 仍执行原始单次排序，避免隐式陈旧缓存；生产服务热点已迁移到 prepareSampler。如果将来新增高频调用，应在明确的运行/快照生命周期准备一次。
- 新增算法不会自动修复 UI 文案或 App memo。完成上述接线并验证后，才能把单方案页面问题标为已解决。
- 没有新增依赖、合并、部署、自动合并或处理其他草稿 PR。
