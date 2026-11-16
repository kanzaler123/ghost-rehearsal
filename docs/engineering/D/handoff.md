# D — Worker 生命周期和导入容错

日期：2026-11-16。执行者：Codex。没有使用 Kiro、Kiro CLI 或 Hook；无新增依赖。

## 基线与范围

- 仓库：`https://github.com/kanzaler123/ghost-rehearsal.git`。
- 实际基线：`f8371999e64d25c250699e5cd96f85eabb79bb32`。开始及交付前 fetch `origin/main`，均与审查参考一致。
- 独立 worktree：`C:\Users\kanzaler\Desktop\ghost-rehearsal-runtime-import-recovery`；分支：`fix/runtime-and-import-recovery`。
- 原目录仍为 `feat/ui-creative-redesign`，未提交的 `.kiro/specs/ui-creative-redesign/` 保留。未切换、重置、清理或暂存其他会话工作。
- 阅读仓库开发约定、现有 RobustnessClient、普通 Worker、解析器、上传和应用调用点。复核确认：App 普通 Worker 缺少构造/发送异常、messageerror 及任务身份保护；文件读取没有规模预检，CSV 预览/项目/模板解析同步执行；模板本身已有整批验证，但缺少最新请求和关闭后的失效保护。
- 修改现有文件仅 `src/features/data-sources/index.ts`，新增可选解析预算；新增 `src/simulation/client.ts`、`src/features/imports/`、三份测试和本目录记录。没有修改 App、组件、存储、仿真算法、原 Worker 协议、样式、package.json 或 lockfile。

## 交付状态

| 交付 | 状态 | 当前生产调用路径 |
| --- | --- | --- |
| 普通 SimulationClient | **核心逻辑完成，应用接入待完成** | App 仍直接构造 Worker，尚未获得新生命周期保护 |
| 文件预检、可取消读取和解析 Worker | **核心逻辑完成，应用接入待完成** | 当前上传仍直接 `file.text()`，预览仍同步解析 |
| 分页诊断、预览/应用隔离、模板原子应用 | **核心逻辑完成，应用接入待完成** | 需要下文 App/上传/预览接线与中英文状态 |
| 兼容旧 CSV API | 已完成且原调用兼容 | 不传新增可选预算时保留旧行为；不能据此宣称现有页面已获得边界保护 |

本任务没有可称为“页面生产调用路径已修复”的新功能。浏览器证据来自独立生产构建，验证新模块和真实 Worker，并非 App 已接入的证据。

## 普通仿真客户端

`src/simulation/client.ts`：

```ts
const client = new SimulationClient(onState); // 第二参数可注入 Worker 工厂，测试使用
client.start(requests: RunRequest[]); // 返回当前 SimulationState，同步异常也变成终态
client.getState();
client.cancel();
client.dispose(); // 终止且不再通知 UI；此实例不能重新 start
```

- 状态：`idle → running → succeeded | failed | canceled`；`disposed` 为实例终态。
- 每次 start 复制输入、递增 `requestId`、终止前一 Worker；每个回调同时检查 Worker 对象、请求身份和 running 状态。旧结果、旧 error/messageerror 均无权改变新任务。
- `failure.code` 区分 input_clone、worker_create、worker_post、worker_error、worker_messageerror、worker_response、simulation_failed、simulation_aborted；`message` 保留底层原因。每条失败路径退出 running，可重新 start。
- `runs` 只属于本次任务；传输失败/取消时为空。仿真返回 failed/aborted 时保留本次部分 `runs` 供检查，状态仍是 failed。
- `lastSuccessful: { requestId, runs } | null` 只指向最近一次全部成功的任务；新任务开始、失败、取消均不清除此引用。旧结果可以继续展示，但必须以“上次成功结果”标识，不能转成当前成功。
- 每实例只持有当前请求/结果和上一份成功结果；完成、取消、失败均移除事件处理器并终止 Worker，不缓存全部历史。
- **消息协议不变**：发送 `{ requests }`，接收 `{ runs }` 或 `{ error }`。请求身份在客户端闭包中维护，不改 `src/simulation/worker.ts`，也不改 RobustnessClient。

### App 精确接线

位置以本基线为准；UI 分支变动后以函数名定位。

1. `src/app/App.tsx:165` 的 Worker ref、`:355` 的 `launch()`、`:379` 的 `stopRun()`、`:555` 的卸载清理改接 SimulationClient。实例在组件生命周期内复用；effect cleanup 调用 dispose。React StrictMode 再次 setup 必须新建实例，不能复用 disposed 实例。
2. 保留 `launch()` 的同场景校验和 requestFor 逻辑，参数仍为：

   ```ts
   const requestId = client.getState().requestId + 1;
   launchContext.current = { requestId, destination, scope, planIds: targets.map(p => p.id) };
   client.start(targets.map(target => ({ ...requestFor(target, document), runMode: scope })));
   ```

   上下文必须在 start **之前**保存，因为构造/克隆失败会同步通知。onState 只消费与上下文 ID 一致的状态；不要在 start 返回后才设置“计算中”。
3. `setBusy(state.status === 'running')` 由状态统一驱动。只在当前 `succeeded` 执行原 onmessage 成功分支（写入 runs、切换 destination、时间归零、播放、selection、完成提示，cutoff 请求才重置 basis）。新任务不能复用旧请求的 destination/scope 闭包。
4. failed 设置 `lastRun.kind = 'failed'`，展示 failure 的本地化说明及原因；对 simulation_failed/aborted，继续使用 `state.runs[*].issues` 定位模型问题。保留 App 原有 runs 映射或单独显示 lastSuccessful，不清空可用历史；停止播放且明确显示本次失败/取消。Compare 仍拒绝 failed/aborted 结果。
5. 原 App 允许非 Compare 的 aborted 结果供部分回放。新客户端将 aborted 明确标成失败但保留其 runs：如保留此体验，应进入“运行中断／部分回放”分支，不执行“成功完成”提示、不更新 lastSuccessful、不提供当前比较。算法和结果字段均未改变。
6. stopRun 调用 cancel，状态 canceled 对应现有 stopped/取消提示；停止播放。新项目/项目替换及组件卸载时取消/销毁运行，防止旧项目的结果写入新项目。
7. 接入验证：注入构造/发送失败以及 error/messageerror；每次立即取消计算状态、保留旧结果、可重试。连续启动 A/B，晚到 A 结果和错误不得改 B。取消/关闭后不更新 UI；正常双方案结果应与原 Worker 完整输出相同。

## 导入 API 与生命周期

`src/features/imports/client.ts` 提供 `ImportClient(onState, createWorker?)`：

```ts
client.startFiles(files, { kind: 'project' });
client.startFiles(files, { kind: 'templates' });
client.startTexts([{ name: fileNameOrPasteLabel, text }], {
  kind: 'arrivals', unit, attributes, observationCutoff, horizon,
});
client.startTexts([{ name: fileNameOrPasteLabel, text }], { kind: 'services', unit });
```

- 两种 start 返回 `Promise<ImportState>`。所有正常失败/取消均 resolve 为对应状态，不让组件漏 catch 后一直等待。onState 只通知当前请求；如使用返回 promise 更新 UI，仍须检查其 requestId 等于 client.getState().requestId 且组件仍挂载。
- 状态：idle、reading、parsing、ready、invalid（内容/资源校验失败）、failed（读取/Worker 等执行失败）、canceled、disposed。busy 仅 reading/parsing；其他状态都可重选和重试，disposed 需新实例。
- start 会复制 options/文本引用、使前次读取或解析失效。每次解析使用独立 Worker，可直接 terminate；JSON/CSV/模板校验、规范化均在 Worker 内完成。Worker 新协议为 `{ requestId, files, options } → { requestId, result }`，只属于新导入模块，不要求现有 Worker 迁移。
- `cancel()` 同时取消读取、终止 Worker、清除预览及诊断，ready 也可被取消；关闭窗口/重置/更改解析参数时调用。`dispose()` 静默清理，结束未完成 promise，不在卸载后回调 UI。
- `getValue(requestId)` 仅在**当前 ID 且 ready**时返回值，否则 null；Apply 必须重新取得，不使用旧闭包的 preview。四种 value 为 project.document、templates.templates、arrivals.preview、services.preview。
- `getIssues(offset, size=50)` 返回 total/items/offset/validationComplete，size 1–500；state.issues 仅首 50 条，issueCount/errorCount 是实际总数；`getAllIssues()` 可取得所有已完成验证的诊断，供完整下载。每条含 file/code/message/severity，保留可用的 path/entityIds/row/column/field。
- 超限/失败的 value 为 null，不返回可应用的半份数据。`validationComplete=false` 表示因格式或资源预算停止，诊断不是文件全部潜在错误；不得显示“其余行有效”。完整验证生成 17,999 错误的测试保留全部明细，超过 errors 预算不会静默裁掉 7,999 条。
- `parseImport()` 是同一纯解析核心，便于测试/Worker 调用；UI 不应直接调用它进行重解析。旧 `parseArrivalData` 第六参数、`parseServiceData` 第三参数新增可选 TableLimits；有预算时超限抛 ImportError，旧省略参数用法不变。
- `readImportFiles(files, signal)` 仅负责有预算的读文件，供当前“先读到文本框、再点预览”流程使用。它在**任何 file.text() 之前**检查整批元数据，并复核实际解码文本的 UTF-8 大小。原生 File.text 本身不可中断，但取消会立即结束等待，丢弃迟到结果且不读下一文件。

### App 项目/模板上传接线

1. 项目：`App.tsx:220 importProject()`、`:768` 文件 input。保留 input.value 立即清空；用专属 projectImportClient.startFiles([file], {kind:'project'}) 替代直接读取和 readProject。
2. ready 仅打开预览/确认；**不要**在 promise 完成时执行原 `commit`。Apply 重新 `getValue(previewRequestId)` 并确认 kind=project，使用 `commit(value.document, currentProject.current)`，然后复用原 planId/secondId/selection/runs/mode/time 重置逻辑。Undo 因而恢复应用瞬间的最新项目。警告可显示但不阻止有效结果，错误禁止 Apply。
3. 关闭导入预览、`:510 startNew()`、打开另一项目、选择新文件时取消该导入；卸载 dispose。确认替换项目时同时取消正在运行的仿真。普通编辑可继续：解析不接收/修改 currentProject，Apply 才替换；不依据读取开始时的旧 project 构造 Undo。
4. 项目问题窗口 `App.tsx:774` 当前 map 全量 documentIssues；改为总数、分页、完整诊断下载，使用 ImportClient 分页接口；关闭同时 cancel，清除旧预览。
5. 模板：`App.tsx:790` 多选 input；用独立 templateImportClient.startFiles(files, {kind:'templates'})，一次提交整批，保留先清空 input.value。ready 时显示整批预览和数量；任一文件错误时无可应用模板，不调用 persistTemplates。
6. 模板 Apply：重新 getValue(id)，取得 **currentTemplates.current**，`appendImportedTemplates(currentTemplates.current, value.templates)`；只调用一次既有 persistTemplates(next)，成功后才设置 tab、数量和 imported 提示。append 会再次检查当前库+新增总数并分配唯一 ID，解析期间新建的模板不会被旧快照覆盖。捕获 ImportError 展示预算原因；持久化失败沿用现有恢复路径，本任务不改存储行为。
7. `App.tsx:804` 模板 Modal 关闭调用 cancel；卸载 dispose；项目导入与模板导入各有实例，不能共享一个会互相覆盖的 client。快速选两批、关闭后迟到、失败后同一文件重选、确认前编辑/创建模板均需验收。

### 上传和 CSV 预览组件接线

1. `DataInput.tsx:25–46`：保留当前请求代数保护和 input.value 清空；每次选择先 abort 上次控制器，创建 AbortController，改为 `const [loaded] = await readImportFiles([file], controller.signal)`，仅当前 generation 执行 onTextChange(loaded.text)。catch 区分已取消与 ImportFailure（通过 importFailure(error)）；失败保留旧文本，不展示成功。
2. `DataInput.tsx:23` 卸载、`:45` 手工改文本、`:51` 更改单位及父级 reset：abort 读取并递增 generation；旧 finally 不得清掉新请求的 reading 状态。选文件开始即使父级旧 preview 失效，等待时禁用 Preview/Apply；失败不修改已应用项目。
3. `ArrivalDataEditor.tsx:62` Preview：用 arrivals startTexts，传当前 text、unit、attributes、observationCutoff、horizon。`:35` candidate / Apply 改为从 getValue(currentPreviewId) 取得 arrivals.preview，再调用**原** buildArrivalStream(stream, preview, provenance)。保留来源编辑及 requireApply/外层场景 Apply 约定。
4. `ServiceDataEditor.tsx:57` Preview：services startTexts，传 text、unit。`:31` candidate / Apply 从 getValue 取 services.preview，再用**原** buildServiceDuration(preview, provenance)，调用一次既有 onChange，保留原单次 Undo 行为。
5. 每个 Draft 实例拥有自己的 ImportClient；invalidate/reset/取消/关闭调用 cancel，卸载 dispose；text/unit/attributes/cutoff/horizon/目标节点或来源模型换新时使旧预览无效。来源 source/notes/kind 可以继续在预览后编辑，在明确 Apply 时传最新 provenance；不由解析器猜测“实测”来源。
6. Preview/Apply 按 reading 或 parsing 禁用；cancel 始终可用。ready 才显示可应用摘要；invalid 独立显示诊断（其 value 为空），不要继续依赖 `preview.errors` 作为错误面板的唯一入口。
7. Arrival `:82`、Service `:74` 的错误表不要全量 map；显示 errorCount/issueCount、当前页、下一页及完整下载入口。保留原合法数据前 20 条的预览规则，不能把首屏错误数说成总数。
8. 验证：原 BOM/CRLF、引号内逗号、秒/分钟换算、0 和重复服务样本、属性校验、来源及 builders 结果相同；大文件在读取前拒绝；损坏内容/读取失败/取消后项目不变；新选择优先；同名同文件失败重试；关闭后不触发 onChange；Apply 使用当前有效请求且只触发一次。

## 资源限制和测量依据

定义集中在 `src/features/imports/limits.ts`。MiB = 1,048,576 字节。JSON 的数量预算是**整批文件总和**，不是每个模板重新领取；所有上限含等号。字段名计数同时覆盖嵌套模板文档。原 schema 业务校验仍执行，预算并不放宽业务限制。

| 预算 | 上限及单位 | 依据与边界 |
| --- | --- | --- |
| fileBytes / batchBytes / files | 4 MiB/文件，16 MiB/批，20 文件/批 | 支持约 1.15 MB 的 10,000 访客+60,000 服务样本项目；批量保留 20 文件余量；避免读入任意大文件。项目/CSV 另限 1 文件 |
| tableRows / tableCells | 10,000 数据行，不含表头；200,000 单元格，含表头/空白行产生的格 | 与现有每分布 10,000 样本、引擎每运行 10,000 人对齐；格数另防超宽 CSV |
| nodes / edges | 2,000 节点 / 8,000 连线，批量累计 | 为多方案/模板提供余量，限制图结构及后续校验工作量；不是引擎性能承诺 |
| plans / scenarios / templates | 各 50 个；模板应用后当前库也不超过 50 | 可覆盖当前多方案、模板库功能；小文件不能靠极多小对象绕过字节预算 |
| records / samples | 各 100,000 项，JSON 整批累计 | 多方案/场景共享总预算；单一 empirical 的 10,000 schema 上限保持不变；导入 100,000 records 不代表一次能运行 100,000 人 |
| values / depth | 250,000 个 JSON 值（包括容器/原始值）；根深度 0，上限 64 | 防大量额外字段、小元素和极深嵌套进入 schema/规范化；迭代遍历，先查大数组预算 |
| syntaxIssues / errors | 10,000 CSV 词法错误；10,000 完整验证错误 | 词法异常膨胀会提前拒绝并标验证未完成；完整验证错误即便超过 10,000 也保留全部诊断，结果不可应用 |
| issuePage / maxIssuePage | 首页 50；请求页最多 500 条 | 限制渲染量，保留总数和完整错误获取，不假装只有首屏错误 |

复现：`node docs/engineering/D/measure-imports.mjs`。环境及五次原始数据在 [import-measurements.json](./import-measurements.json)。Windows 10.0.26200，Node 24.18.0，Intel i7-14650HX，24 逻辑核心，约 31.62 GiB RAM；Vite 8.3.8。每种合成负载预热一次、测五次，计纯 parseImport（含预算与既有校验），不含磁盘读取、Worker 启动/传输和 UI：

| 工作量 | 输入字节 | 中位数 ms | 结果 |
| --- | ---: | ---: | --- |
| 10,000 服务样本 | 40,008 | 4.66 | 完整接受 |
| 近 4 MiB、10,000 服务样本 | 4,190,008 | 135.92 | 完整接受 |
| 10,000 到达记录 | 165,805 | 9.75 | 完整接受 |
| 6,000 错误行产生 17,999 错误 | 60,015 | 16.62 | 拒绝，明细全保留 |
| 项目：10,000 记录+60,000 样本 | 1,153,590 | 270.28 | 完整接受 |
| 20 文件、40 模板，近 16 MiB | 16,393,880 | 456.32 | 完整接受 |
| 10,001 服务行 | 20,010 | 6.99 | 拒绝，不返回半份数据 |
| 深度 65 | 131 | 0.33 | 进入 schema 前拒绝 |

这些是本机负载测量，不是全应用加速比、硬件通用阈值或最坏时间保证。项目原始测量 149–580 ms 波动较大。测量进程峰值 RSS 995,272 KiB，包含 Vite、全部构造夹具、多次解析及 GC，**不能解释成单次导入峰值或硬性内存上限**。字节限制也不等于 JS 对象内存；更低内存设备仍需集成阶段压力验证。独立浏览器近 4 MiB CSV（含 Worker 启动/传输）约 1,554 ms，期间主线程计时器推进 105 次，证明异步路径可响应，而非 UI 已接入。

## 中英文状态与错误接线

本任务未改组件或翻译文件。新增文案由 UI 集成写入现有 `i18n/messages.ts` / `components/data-sources/text.ts`，显示稳定 code 对应的说明，并在详情中保留原 message、文件、actual/limit；不要只显示未翻译的技术异常。

| 状态/code | 中文 | English |
| --- | --- | --- |
| reading / parsing / ready | 正在读取文件／正在验证导入／预览就绪，尚未应用 | Reading files / Validating import / Preview ready; not applied |
| invalid / failed / canceled | 导入未通过验证／操作失败，可重试／已取消 | Import validation failed / Operation failed; retry available / Canceled |
| disposed | 已关闭 | Closed |
| input_clone | 无法准备本次输入，请重新选择或运行 | Could not prepare this input. Select it again or retry. |
| worker_create | 无法启动计算进程，请重试 | Could not start the worker. Please retry. |
| worker_post | 无法发送本次输入，请重试 | Could not send this input. Please retry. |
| worker_error | 计算进程发生错误，请重试 | The worker failed. Please retry. |
| worker_messageerror | 无法读取计算结果，请重试 | Could not read the worker response. Please retry. |
| worker_response | 计算结果缺失或无效，请重试 | The worker response is missing or invalid. Please retry. |
| simulation_failed | 本次预演失败，查看模型问题 | This rehearsal failed. Review model issues. |
| simulation_aborted | 本次预演中断；仅有部分结果 | This rehearsal stopped early; only partial results are available. |
| lastSuccessful | 上次成功结果；本次未成功 | Previous successful result; this attempt did not succeed |
| empty_selection | 请至少选择一个文件 | Choose at least one file. |
| read_failed | 无法读取“{file}”；可重选同一文件重试 | Could not read “{file}”. Select the same file to retry. |
| invalid_json / parse_failed | 文件不是有效 JSON／无法解析导入内容 | File is not valid JSON / Could not parse the import |
| file_bytes_limit | “{file}”超过单文件上限 {limitMiB} MiB | “{file}” exceeds the {limitMiB} MiB file limit |
| batch_bytes_limit / files_limit | 本批超过 {limitMiB} MiB／最多可选 {limit} 个文件 | Batch exceeds {limitMiB} MiB / Select at most {limit} files |
| *_limit（数量） | {资源}有 {actual} 项，上限为 {limit}；未应用 | {Resource} contains {actual} items; limit {limit}. Nothing applied. |
| depth_limit / values_limit | JSON 结构过深／JSON 值数量过多；未应用 | JSON is too deeply nested / Too many JSON values; nothing applied |
| errors_limit | 发现 {actual} 个错误，超过 {limit}；完整诊断仍可查看 | Found {actual} errors, above {limit}; all diagnostics remain available |
| validationComplete=false | 验证提前停止，未检查其余内容；没有应用数据 | Validation stopped early; remaining content was not checked. Nothing applied. |
| 诊断分页 | 共 {total} 条，显示 {from}–{to} 条／下载完整诊断 | {total} diagnostics; showing {from}–{to} / Download all diagnostics |

数量 code/资源映射：nodes=节点/Nodes，edges=连线/Edges，plans=方案/Plans，scenarios=场景/Scenarios，templates=模板/Templates，records=到达记录/Arrival records，samples=服务样本/Service samples，table_rows=数据行/Data rows，table_cells=单元格/Cells，csv_syntax_issues=CSV 格式错误/CSV syntax errors。沿用现有 schema/CSV 错误本地化，不能丢失行列、属性名、问题路径和文件名。

## 验证与交接门槛

- 基线 `npm run check`：32 文件、463 测试通过。
- 本分支 `npm run check`：双 TypeScript 检查通过；35 文件、518 测试通过。新增 55 项，覆盖普通 Worker 五类异常、引擎 failed/aborted、取消/重启/迟到、不可克隆输入，以及文件规模预检、解析预算、17,999 错误、原子模板、单位/来源一致、读取/Worker 失败与重试。
- `npm run build -- --base=/ghost-rehearsal/`：通过；既有大 chunk 提示仍在，未为本任务做无关拆包。
- `node docs/engineering/D/verify-runtime.mjs`：15 项真实 Chromium 检查通过，命令退出 0；两个不同 production Worker 资源、12 次 Worker 实例；pageerror=0、console error=0。记录见 [runtime-validation.json](./runtime-validation.json)。脚本不隐藏或过滤浏览器错误，不重试。
- 验证脚本调试记录：初次夹具误把换行写为字面反斜杠，触发合法小文件断言失败；修正夹具后保留同一断言通过。Windows 浏览器清理有明显延迟；最终等待正常清理完成，未把未退出的运行算通过。未改生产逻辑来规避断言。
- 原有完整 `npm run test:browser` 已启动，最终结果及远端 CI 在交付更新中追加；不能用独立模块 15 项取代现有整页验收。
- 接入后仍需在双语言桌面/390px 真正的 App、上传、预览窗口执行上述交互验收。当前页面未接线、中英文状态尚未应用，是明确剩余工作。
- 提交/Draft PR/完整浏览器结果在最终交付记录追加。不会合并 main、部署、自动合并或关闭其他 Draft PR。
