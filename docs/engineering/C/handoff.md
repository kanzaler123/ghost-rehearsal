# C：回放计算性能交接

## 基线、范围和状态

- 2026-11-16 核对 `origin/main`：`f8371999e64d25c250699e5cd96f85eabb79bb32`，与审查参考一致。
- 独立 worktree：`C:/Users/kanzaler/Desktop/ghost-rehearsal-incremental-playback`；分支 `perf/incremental-playback`。
- 原目录 `KIROWWEN` 保持 `feat/ui-creative-redesign`，保留其未跟踪的 `.kiro/specs/ui-creative-redesign/`。
- 阅读了仓库 README、测试配置、`.kiro/steering/comparison-evidence.md` 和历史并行约定；本次文件归属、交接目录、基线以本任务要求为准。
- 未修改 `input.ts`、`engine.ts`、`App.tsx`、任何组件、样式、依赖或锁文件。未合并、部署或关闭其他 PR。

| 交付 | 状态 | 当前应用是否受益 |
| --- | --- | --- |
| 节点 ID → 类型索引 | 已在生产调用路径解决逐事件节点线性查找 | 是：现有四处 `playbackAt` 及 Worker 的 `calculateStatistics` 使用索引；此处“生产调用路径”指分支代码，并未部署 |
| 当前/趋势游标、回退/跳转/重播、预算检查点 | 模块完成，应用接入待做 | 否：App 仍调用无状态 `playbackAt` |
| 结果隔离、更新与释放、参考对照测试 | 模块完成并独立验证 | 新读取器接入后生效 |
| 密集 WebKit 暂停、拖拽、Canvas 绘制性能 | 仍未解决/未验收 | 计算层微基准不能证明整页已修复 |

## PR #33 可复用内容与证据边界

审阅 [PR #33](https://github.com/kanzaler123/ghost-rehearsal/pull/33)，候选 `634d1eecaddf8f06810699a70ea70374154e13d5`。采用其非 UI 的节点类型 Map 思路，包括统计扫描的查找替换。将原事件归约器和无状态回放移入 `src/simulation/playback.ts`，让旧接口和新读取器共用一个归约器，`metrics.ts` 原路径继续导出 `playbackAt`。未整合该 PR 的 Inspector 缓存、Canvas 回调、UI 或浏览器测试改动。

同时阅读了 [冻结性能诊断协议](https://github.com/kanzaler123/ghost-rehearsal/blob/f075c9cb513b7e7a3cf81095611cb25027b0ccb8/diagnostics/natural-state/README.md) 和 PR 的最新诊断说明：原始 200 节点/300 人 WebKit 场景在 18 次尝试中有 17 次未在观察窗口内获得后续两帧，正式 8 组配对均缺少有效原始场景观测，整体性能验收失败。单独 cohort 对照的改善、全功能测试通过，均不能替代原始密集场景。早先不利样本仍有效；本任务不改变该结论，也不宣称当前合成链式微基准等同于那个浏览器场景。

## 接口与语义

```ts
import { playbackAt } from './src/simulation/metrics'; // 原签名/返回类型兼容
import { createPlaybackReader } from './src/simulation/playback';

const a = createPlaybackReader(runA.events, runA.request.plan, {
  checkpointInterval: 2048,
  checkpointBudgetBytes: 4 * 1024 * 1024,
  maxCheckpoints: 32,
});
const b = createPlaybackReader(runB.events, runB.request.plan);
const viewA = a.at(time); // 默认 lane='current'
const viewB = b.at(time, 'current');
const previousA = a.at(time - 60, 'trend');
const previousB = b.at(time - 60, 'trend');
// 后退、跳转、重播：继续 at(newTime)，不需要重建读取器。
a.update(newRun.events, newRun.request.plan); // 即使传入相同引用，也清除两路游标和全部检查点
const diagnostics = a.diagnostics(); // 计数/预算的数值副本，不暴露内部状态
a.dispose(); b.dispose(); // 可重复；释放内部引用。之后 at/update 抛出错误。
```

- 时间单位仍为秒，保留原始毫秒数值；负时间得到未开始状态，超出日志末尾得到最后记录状态。不按帧、整秒或访客采样，不删事件。与旧函数一样，`NaN`/正无穷纳入全部事件，负无穷不纳入有限时刻事件。
- 输入是引擎按时间升序写出的不可变事件日志。按数组原顺序应用同刻事件，不按 `seq` 重排。查询包含 `event.time <= time` 的整个已有前缀；被中断的同刻事件组只读取实际保留下来的部分，不能推断未记录事件。
- 当前和趋势各有自己的游标/工作状态。二分找到目标事件位置，前进只处理新增事件；跳转可恢复不超过目标的最近保留检查点。
- 检查点只存每位访客最后事件的数组下标和每节点通过计数；恢复时按事件数组下标重建队列、阻塞、候场和服务顺序。`Float64Array` 保存计数，不降低计数精度。
- `at()` 每次返回独立快照：节点对象、四种占用数组、访客事件、资源数组、details 对象及其中数组均复制。后续计算及调用者修改已返回结果，不会污染其他读取器、趋势、源日志或检查点。旧 `playbackAt` 保留原有事件引用语义，后续调用不修改之前的状态；不要把修改其事件对象当成受支持的日志编辑接口。
- 借用源日志避免复制整个 trace；读取器存活期间调用者不得原地改写它。追加、截断、编辑或更换日志后必须 `update`，或销毁重建；没有全局缓存，也不会逐帧重新计算输入哈希。

### 内存与成本

每个读取器的检查点默认最多 32 个、定长数组缓冲区合计不超过 4 MiB。单个检查点准确计费 `4 × 已出现访客数 + 8 × 节点数` 字节；先淘汰最久未使用的检查点再分配，预算不足以放一个时跳过保存。`diagnostics().checkpointBytes` 是存活缓冲区总字节数，不是 JavaScript 堆测量；Map/对象/TypedArray 头部由数量上限约束。两路工作状态、借用的源日志、恢复时的临时排序数组、调用者持有的结果快照不计入检查点预算。两个 A/B 读取器分别预算，合计默认最多 8 MiB 检查点缓冲区。

事件索引和游标不消除所有成本：原来的队列移除仍扫描当前队列；快照复制与节点/已出现访客数成正比；检查点恢复含访客索引排序。淘汰区域、零预算、日志短于检查点间隔时可能从零重建，不能保证任意跳转都只处理固定数量的事件。可用预算/间隔选项针对集成负载调节，不能取消内存上限换取表面速度。

## App / Canvas 精确接线清单

以下行号对应基线 `f837199`，UI 改版后按符号重新定位。

| 当前位置 | 最小接线与参数 | 生命周期/状态要求 |
| --- | --- | --- |
| `App.tsx:36`、`:188–189`，`view` / `secondView` | 引入 `createPlaybackReader`；分别使用 A/B 的 `reader.at(time, 'current')` | 每个可见方案长期持有一个读取器；源必须为 `run.events` 和 `run.request.plan`，不能把旧日志配上新编辑图 |
| `App.tsx:199–200`，`previousView` / `secondPrevious` | 同一 A/B 读取器分别 `at(time - TREND_WINDOW, 'trend')` | 保留当前 `Build`、无 run、非 comparing 时返回 `undefined` 的条件；不要用 current lane 轮流读当前与过去 |
| `App.tsx:355–380`，`launch` / Worker 结果接收 | 仅在现有逻辑接受新 run 后调用 `update(result.events, result.request.plan)` 或替换读取器 | 即使 inputKey 相同，新 run/新 events 也要失效；失败、取消不能误把上次成功结果标成新结果 |
| `App.tsx:216–246`、`:781–788`，提交编辑/undo/redo/场景编辑 | 在仿真输入版本变化时清除旧游标/检查点。若继续展示历史结果，重新绑定原 `run.events/run.request.plan` 并保持 stale 标记 | 使用现有 freshness 计算对应的输入身份（计划、场景、runMode）；必要时在该 memo 内暴露 key，不能每个 tick 再 hash。不能只观察 stale 布尔值，否则连续过期编辑无法区分 |
| `App.tsx:238–242`，项目导入替换 | 在 `setRuns({})` 同步失效全部读取器并释放引用 | 即使导入复用了相同项目/方案 ID 也要释放；文档普通编辑与“替换整个项目”应区分 |
| `App.tsx:248`、`:675`，选择/删除方案；A/B 选择 | 仅保留可见两侧的读取器，切换时释放被替换的一侧；删除方案立即 dispose | 不按 plan ID 无限积累缓存。删方案时同步清理相关 run 引用由集成负责人处理 |
| `App.tsx:291–301`，语言切换 | 新 run 对象/新 request.plan 可保守 update；或者经身份检查后仅复用同一不可变日志和节点 ID/type 的绑定 | 名称/布局不影响归约语义；任何节点 ID/type 或日志变化都必须 update |
| App 卸载/项目关闭 | 销毁 A/B，清空 ref | cleanup 后不能重用 disposed 实例；StrictMode effect 再次 setup 必须创建新实例 |
| `App.tsx:612–621`，`canvasProps`；`Canvas.tsx:222`、`:255–290` | 继续传 `view`、`previous`、`run`、`time`、`stale`，类型不变 | 本模块不要求修改 Canvas。绘制、拖动、节点发布频率及稳定回调仍由 UI 会话另行评估 |

React 适配要点：创建/更新/销毁放在提交阶段的 effect（需要防止错帧可用 layout effect），把本次 source 身份、time 与四路快照作为一个批次发布，确保 render 不把旧 source/time 的结果配给新参数。实例放 ref 中，不在每个 tick 创建。不要在可重入 render/useMemo 中对跨 render 共享的读取器执行 `update/dispose`。也不要用 `useMemo(createReader)` 再在 effect cleanup 中永久 dispose 同一实例：StrictMode 的 setup→cleanup→setup 会复用已销毁对象。每次 setup 都创建/绑定正确实例，cleanup 释放对应实例；tick effect 保持实例，仅执行 `at`。无 run 时可继续 `playbackAt([], fallbackPlan, time)`。

错误状态：非法预算参数抛 `RangeError`，已销毁实例读取/更新抛 `Error`；应作为适配缺陷处理并停止发布该批次，不能静默混用另一个方案。部分/aborted 日志可以回放，但 `lastRun`、stale、`comparisonReady` 与统计可用性仍遵循现有业务规则，读取器不生成统计、不把部分日志升级为成功结果。

接线后的验证：复用现有真实 Worker 的 `e2e/ui/canvas-playback.spec.ts`，加 A/B 当前/60 秒前多路对照；覆盖新 run、同输入重跑、输入修改/撤销、换项目、删方案、两侧互换、reset/End/Home、语言切换、StrictMode 和卸载。确认错误附件完整保留，所有旧断言仍执行。另在原始密集 WebKit 场景进行真实暂停/拖动/绘制测量；不能用 Node 测量或当前 Chromium 功能回归替代。

## 验证与可复现产物

- 独立参考：`tests/playback-reference.ts` 从基线逐字保留原状态重建逻辑（仅改函数导出名和类型导入）；不复用新归约器。
- `tests/playback.test.ts`：前进只处理增量、回退/重播、随机 A/B 交错、60 秒趋势、毫秒边界、同刻数组顺序、完整/部分记录、预算淘汰、重复查询与外部修改隔离、update/dispose；还有真实引擎的候场/阻塞/服务记录。
- `tests/fixtures/playback.ts`：小型、确定性合成输入生成器，普通与密集测试共用；不是实际活动数据。
- `node docs/engineering/C/benchmark.mjs`：相同进程、输入和查询，比较基线重建、仅节点索引、完整读取器；含预热、全部重复、轮换测量顺序、每次耗时、请求/日志/源码哈希和深度相等校验。见 [微基准记录](benchmark.md)。
- 大日志与计时 CSV 放在已忽略的 `test-results/playback-benchmark/`；源码仓库仅提交小型 fixture、脚本、紧凑测量表和摘要。浏览器测试会清空整个 `test-results/`：本次全部计时和元数据已经保存在交接目录，日志在浏览器结束后按原输入重新生成并核对四组请求/事件 SHA-256，均与测量时一致；没有重建或补造计时。详细说明见微基准记录。
- 首轮新增测试曾发现测试本身使用 ES2023 `toReversed` 与当前 ES2022 配置不符，以及把无新增事件的查询错误要求为一次检查点恢复；已改为 ES2022 数组反转和确实跨事件前缀的查询。未删减既有测试、未改重试、未过滤页面错误。
- 最终 `npm run check`：两项 TypeScript 检查通过；33 个测试文件、482 项测试通过（含本任务 19 项），Vitest 耗时 3.64 秒。
- `npm run build -- --base=/ghost-rehearsal/`：通过。保留既有大 chunk 提示，未修改告警阈值。
- `npm run test:browser -- e2e/ui/canvas-playback.spec.ts`：命令退出 0，4/4 通过，1.1 分钟；现有真实 Worker、Chromium、中英文、1440×1000 / 390×844、End/Home/再次 End 的计数及访客断言、严格 pageerror 断言均保留；无重试或跳过。只证明既有无状态调用的兼容性，不是新读取器的 UI 接入验证。
- 未执行完整浏览器套件、WebKit 或物理设备性能验收。微基准深度比较全部通过，144 次测量已保存。
- 逐项审阅最终差异，`git diff --cached --check` 通过；源文件哈希与实际测量相符，独立参考的状态重建逻辑与基线逐字相符。提交前再次核对 `origin/main` 未变化，原 UI 目录分支和未跟踪文件未改变。

## 实际工具贡献

实现、测试、微基准和交接由 Codex 完成，使用 Git/GitHub、Node、TypeScript、Vitest、Vite 和 Playwright。未使用 Kiro 开发或运行 Hook，不记录为 Kiro 工作。
