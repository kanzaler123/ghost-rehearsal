# A：项目打开与数据可靠性交接

日期：2026-11-16。状态：**模块已完成，App 接入待做；生产调用路径的三个问题仍未解决。**

## 基线、边界与贡献

- 审查参考和实际开发基线均为 `f8371999e64d25c250699e5cd96f85eabb79bb32`。启动时通过 GitHub 的 `git/ref/heads/main` 接口核实远端 main 与本地 `origin/main` 相同。两次直接 fetch 分别遇到连接重置、连接超时；交付前使用本机已有的系统代理完成 fetch，再次确认相同 SHA，没有修改全局 Git/系统代理配置。
- 分支：`fix/project-data-reliability`；独立 worktree：`C:/Users/kanzaler/Desktop/ghost-rehearsal-project-data`。
- 原目录 `C:/Users/kanzaler/Desktop/KIROWWEN` 当时位于 `feat/ui-creative-redesign`，有未跟踪的 UI Spec；未切换其分支或修改其文件。
- 仓库旧 `docs/parallel-release/README.md` 描述的是上一轮 A–E 发布包。本任务采用用户本轮范围及 `docs/engineering/A/` 交接位置，不修改旧汇总文件。
- 仅新增结果索引、持久化模块及独立测试、本交接。没有修改 App、现有组件、样式、公共项目 Schema、依赖或锁文件。
- 工具贡献：Codex 实现、审查、运行 Vitest/TypeScript/Vite/Playwright；没有使用 Kiro 开发或执行 Kiro Hook。不合并 main、不部署。

## 交付状态

| 问题 | 独立模块交付 | 生产调用路径 |
| --- | --- | --- |
| `constructor` 被普通对象原型属性冒充结果 | `ReadonlyMap` 结果索引；真实仿真、读取/更新/复制/删除/恢复测试 | 待替换 App 中的普通对象及全部下标查询 |
| 标签页互相覆盖/删除草稿 | IndexedDB 事务、修订分支、标签页所有权、精确草稿撤下、通知与恢复历史 | 待替换保存/自动保存/恢复/离开保护 |
| 模板失败被当作空库，后续写入覆盖 | 区分空库/损坏/不支持/存储失败，阻止普通写入，提供原文导出及显式恢复 | 待读写及模板交互接线 |

独立浏览器入口没有加载 App。原 App 的 smoke test 只证明现有工作台和 Worker 仍可运行，不能证明以上三个页面缺陷已修复。

## 持久化模型与接口

入口：`src/features/persistence/index.ts`；解析和状态类型：`model.ts`。

- `openPersistence(): Promise<Result<Persistence>>` 打开数据库并完成旧数据迁移。`ok:false` 时显示错误与 `error.recovery`，禁止把它当成成功创建的空项目/空库。
- `newProjectId()` 产生本地项目身份。它标识整个 ProjectDocument，与方案/场景 ID 无关；存储元数据没有写进项目 JSON。
- `readWorkspace()` 返回 `savedRevisionId`、所有项目快照和模板快照。`savedRevisionId` 指向最近一次无冲突手动保存；历史草稿仍可恢复，不能仅凭这个指针跳过冲突检查。
- `readProject(projectId)` / `readTemplates()` 返回 `Result<Snapshot>`。快照含 `heads` 和完整 `history`。只有 `status:'ready'` 有 `current.value`；`empty` 表示没有活动版本，`conflict` 表示有多个分支，`corrupt/unsupported` 表示有无法使用的活动原文。合法空模板数组是 `ready + current.value=[]`，区别于 `empty` 和错误。
- `writeProject(projectId, document, { kind:'draft'|'saved', parents })` 返回精确修订和保存回执。`parents` 是该次编辑基于的修订 ID；新项目传 `[]`。后续本标签页编辑使用上次成功回执的 ID。不要将后台新发现的其他标签页版本自动塞进 `parents`。
- `writeTemplates(templates, parents)` 与项目使用相同的版本关系。当前库损坏/不支持时拒绝普通写入。模板导入、添加、删除都必须等回执，再改变“已保存”状态。
- `recoverTemplates(templates, expectedHeads)` 仅用于用户明确选择的修复/初始化操作；在同一个事务中核对所有当前 head。恢复期间库若发生变化，返回 `conflict`，不写入。原文仍在历史中。
- `exportRaw(revisionId)` 返回 `{id, raw}`，不依赖项目/模板解析成功。以此调用现有 `download`，即能导出损坏原文。读取/迁移/写入失败也携带可取到的 `error.recovery: {source?, id?, raw}[]`，其中写入失败包含本次待保存文本。
- `discardDraft(projectId, revisionId)` 在事务中核对项目、`kind:'draft'`、当前实例的 `tabId` 和当前 head。旧修订返回 `conflict`，其他标签页返回 `not-owner`；只将指定版本标为 dismissed，保留原文。不会删除共享 localStorage 键，也不会清除其他分支。撤下后不会复活祖先草稿；启动时可从 `savedRevisionId` 找到之前的手动保存。
- `subscribe(listener)` 返回取消订阅函数；通知原因包括 `local/external/legacy/refresh/closed`。收到通知重新读取快照，通知本身不是数据或成功凭证。`close()` 关闭连接、频道及窗口监听器；数据库升级/意外关闭也会发出 `closed`。

回执的 `status` 为 `saved`、`draft-saved` 或 `conflict`。`ok:true + conflict` 表示内容已经作为恢复版本保存，但不能宣告冲突已解决。错误码包括 `quota/unavailable/blocked/unsupported/corrupt/invalid/conflict/not-owner/not-found`；存储层消息供诊断，UI 按码映射现有语言文案。

### 并发保证与恢复

所有修订写入、父版本核对、草稿撤下、保存指针变更均在覆盖同一对象存储的 IndexedDB `readwrite` 事务内完成，只在 `complete` 后确认成功。两个标签页从同一版本编辑时，会新增两个独立 ID 的分支；后来的事务返回冲突，先提交的标签页由通知/下次读取获知冲突。没有使用 localStorage 的读后写来模拟事务。[事务机制参考](https://developer.mozilla.org/en-US/docs/Web/API/IDBTransaction)。

项目恢复：展示 `heads/history` 的来源、标签页、时间和原文；用户选择恢复版本后，用它的 `value` 写一个属于当前标签页的新草稿。若只继续一个分支，`parents:[selected.id]`；若用户明确决定以选定内容解决全部冲突，传入其已审阅的全部 head ID。期间出现的新分支仍保留，回执再次显示冲突。恢复不修改或删除旧版本。

每次打开实例生成新的 `tabId`，不复用可能被“复制标签页”克隆的 sessionStorage 值。刷新后旧草稿仍在历史中，但新实例不能直接撤下旧实例的草稿；可用上面的显式恢复流程继续它。

使用 BroadcastChannel 通知同源标签页；窗口 focus/pageshow 也会要求刷新。若频道不可用，`notifications:'focus'` 明确表示只有重新聚焦/读取时检测变化。通知可能延迟，写入正确性由事务保证，不依赖通知先到。[通知机制参考](https://developer.mozilla.org/en-US/docs/Web/API/BroadcastChannel)。

### 旧存储兼容与失败

迁移读取以下旧键，但从不写入或删除它们：

| 旧键 | 迁移结果 |
| --- | --- |
| `ghost-rehearsal.project.v1` | 原文保存版本和独立本地项目 ID |
| `ghost-rehearsal.draft.v1` | 原文草稿恢复候选和独立本地项目 ID |
| `ghost-rehearsal.templates.v1` | 原始数组文本的模板版本；损坏文本同样保留 |

迁移 ID 由“源键类别 + 原文 SHA-256”确定；去重和新增在同一个事务中，因此重复启动/并发迁移不会复制记录。迁移过程中任一步失败会回滚全部新增及保存指针，旧键原文保持不变；重试没有半迁移标记。每次模块读写都会重新检查旧键，旧客户端的新内容会成为额外恢复版本。旧键被删除不触发新版历史删除。

旧 JSON 没有本地项目身份，不能证明共享草稿属于当前已保存项目。迁移故意保留为独立恢复候选，`source` 标明来源，由用户决定恢复哪一个；不按相同方案 ID 或内容相似度猜配。新建/导入后的身份仅保存在存储封装中。

兼容含义：接受现有 v1 项目和模板库，项目及模板导出格式不变；既有公共函数和 Schema 不变。新版持久化是异步的，必须按下面清单迁移调用。它不反向更新旧 localStorage 快照，因此旧客户端不能看到新版写入，也无法保护尚未被新版读取、就已被旧客户端自行覆盖的旧草稿。集成时必须一次移除 App 的旧读写路径。

## App 精确接线清单

位置以基线 `f8371999...` 的 `src/app/App.tsx` 行号为准；UI 分支变化后按函数名复核。

| 当前位置 | 接入方式、参数与生命周期 | 错误/验证要求 |
| --- | --- | --- |
| 120 行 `runs` 初始状态；173–174 行主/副结果 | `useState<RunResults>(() => createRunResults())`；用 `runs.get(plan.id)` / `runs.get(second.id)` | 缺失结果为 `undefined`；合法 `constructor` 不加黑名单、不改 Schema |
| 241 行导入时 `setRuns({})`；370 行 Worker 回执 | 导入/切换整个项目时 `setRuns(createRunResults())`；Worker 成功路径 `setRuns(previous => updateRunResults(previous, results))` | 保留现有失败/中止、过期检查；没有结果的复制方案不能继承源方案结果 |
| 297–301 行 `switchLanguage` | 用 `mapRunResults(previous, result => ...)`，复用现有本地化 request 的逻辑，返回 SimulationRun，不再 Object.entries/fromEntries | 切换语言后仍是 Map；结果 ID 与 request.plan.id 一致 |
| 449 行实验导出；758 行 Inspector | 所有 `runs[id]` 改为 `.get(id)`；Inspector 先取 `ownerRun`，用 `!!ownerRun && ownerRun.inputKey !== ...` | 导出、Inspector 的 constructor/无结果/过期行为都要测 |
| 403 行 `copyPlan`；675 行删除方案；505 行压力方案复制 | 复制后无新 ID 的运行结果；删除时调用 `removeRunResults(previous,[deletedId])`；整项目恢复清空索引 | 防止删除后重用 ID 取到旧运行；Undo 恢复方案后可重新仿真 |
| 60–62 行常量、74–89 行 `loadProject`、103–105 行同步初始化 | 改成异步启动：等待 `openPersistence()` 和 `readWorkspace()`；加载期间禁用自动保存。先展示冲突/草稿候选，再按用户选择取 `current.value` 或 `history` 中的 `savedRevisionId`。保存本地 `projectId`、编辑基线 parents、已确认修订及对应文本 | `ok:false` 不当作 empty；恢复确认前不可写示例/空项目。保留原文导出入口；不要自动选冲突分支 |
| 220–244 行 `importProject`；509 行 `startNew` | 替换整个文档的导入成功后使用 `newProjectId()`、空 parents，并重置本页面保存确认/结果索引；仅追加活动/方案仍用原 projectId。离开旧项目前让已有保存队列完成或保留离开保护 | 仍保留文件读取序号、校验失败不覆盖现项目。项目切换增加 generation，忽略旧项目的延迟回执 |
| 263–268 行手动 `save`；键盘 Ctrl/Cmd+S 入口 | `await writeProject(projectId, capturedDocument,{kind:'saved',parents: editorParents})`；与自动保存串行。成功后将 parents 更新为回执 revision.id；仅回执为 saved 且当前编辑仍匹配提交快照时更新 `savedText`/已保存提示 | conflict 要展示恢复分支；配额/关闭/读取失败保持脏状态和导出原文入口。不得再 removeItem(DRAFT_KEY) |
| 557–564 行自动保存 effect | 按文档内容变动触发并做合并等待；欢迎页未创建项目、启动/恢复未确定、没有编辑时不写。排队写入时用本标签页最后确认的 parents，`kind:'draft'`，等事务完成才更新确认版本 | 仅关闭/打开对话框不写、不删除。异步旧回执不能给新编辑标记 draftSaved；失败后保留待保存文本，不无限重试 |
| 原 `!unsaved` 分支和手动保存后的草稿清理 | `!unsaved` 只更新显示，无删除副作用。手动保存新增版本已消费指定父版本，不需要额外删草稿。显式“丢弃草稿”才调用 `discardDraft(projectId, exactRevisionId)` | not-owner/conflict 要刷新并解释；不得更换 ID 重试删除；验证旧标签页保存及切弹窗都不撤下他人草稿 |
| 141–143 行模板初始化；277–279 行 `persistTemplates` | 使用 `readTemplates` 的完整状态；仅 ready 使用 current.value，empty 才初始化编辑用空数组。`persistTemplates` 改为 async，传已加载的父修订；回执成功后更新模板确认状态 | corrupt/unsupported/unavailable 不提供可写空数组；显示 exportRaw、重试、显式 recoverTemplates；conflict 保留双方列表供选择 |
| 790–802 行模板批量导入、831 行删除、838 行保存模板 | 三处均 `await persistTemplates(next)`，提交前捕获同一库快照和 parents，异步文件读取期间不要用新收到的版本冒充此次编辑的基线；串行处理本页面写入 | 数据损坏时禁用普通变更按钮；不要用 Promise 的真值提前关闭弹窗或提示成功；保留现有整批验证断言 |
| 566–569 行 `beforeunload` | 用当前编辑是否有匹配的持久化确认来判断。仍有修改且正在保存、确认文本不匹配、失败或冲突时保留保护；只有匹配的无冲突提交完成后才解除。不得在 beforeunload 才启动异步写入 | 测试输入后立即离开、保存中离开、失败后离开、保存后再次编辑；对话框状态不是持久化凭证 |
| App 挂载/卸载与项目切换 | 一个页面生命周期保留一个 Persistence 实例；subscribe 后异步重读状态，不能自动替换脏编辑或其 parents。使用读取序号丢弃过期刷新；卸载取消订阅并 close，异步打开若晚于卸载完成也立刻 close。closed 后保留离开保护并提示重试 | React StrictMode 双挂载、标签页刷新、复制标签页、跨标签页广播、后台再聚焦都要验证；notifications=focus 时显示通知能力受限 |

保存队列仅串行本页面的项目/模板写入；跨标签页由模块事务处理。提交时捕获的文档不可在等待期间继续原地修改。项目切换后必须将回执归属与新页面 generation 分开；语言切换保留现有显示名称处理，但不能把旧回执的文本确认为新编辑已保存。UI 不应简单用一个 `draftSaved` 布尔值跨项目沿用。

## 验证与待验收

验证记录（最终检查退出码均为 0，最终提交只在这些检查后完善交接文字）：

- 新增 Vitest：2 个文件、9 项通过。覆盖合法 constructor、实际运行三种状态、索引复制/更新/移除/恢复，以及空库、损坏/未来版本和分支状态。
- 实现期首次类型检查曾发现 TS2367（已缩窄类型上的冗余比较）；移除该比较后，后续类型检查均通过。
- 最终 `npm run check`：34 个文件、472 项单元测试通过，两项 TypeScript 检查通过。
- 首轮 Chromium desktop-en：10 项独立持久化用例和 1 项既有生产子路径真实 Worker smoke，共 11 项通过，39.5 秒，零重试/跳过。生产构建由 Playwright webServer 实际执行成功。
- 独立用例使用当前模块通过 Vite 打包的测试入口，在真实 IndexedDB 和同一 BrowserContext 的两个 Page 上执行，没有模拟事务实现或修改 App。配额/读取异常通过浏览器 API 注入；这证明失败处理和事务回滚，不等同于真实填满磁盘的设备测试。
- 追加元数据损坏/循环祖先、IDB 读取中止和订阅释放后，第二轮 13 项通过（2.6 分钟）。最终补齐同步读取异常和重复保存更新启动指针的验证后：**12 项独立持久化用例 + 1 项既有 smoke，13 项通过，102.5 秒，零重试/跳过/失败，记录到的 pageerror/console error 为零**。
- Pages 子路径构建通过；保留现有大于 500 kB 的包体提示，没有更改构建规则。最终 diff 检查通过；共 8 个新增文件，既有文件零修改。完成自审，独立评审和 App 接入验收仍待做。

最终运行命令：`npm run check`；`npm run build -- --base=/ghost-rehearsal/`；`npm run test:browser -- e2e/persistence/reliability.spec.ts e2e/smoke.spec.ts --project=desktop-en`；`git diff --check`。不增加重试，不过滤 pageerror、console error 或 ResizeObserver 错误，不缩小既有测试断言。

集成阶段必须运行真实 App 双标签页流程：A 编辑后 B 开关对话框/手动保存/继续编辑；同时自动保存；A/B 冲突选择及再次恢复；两标签页重新加载；导入 constructor 项目后打开 Inspector、运行/比较/复制/删除/Undo/重新导入；损坏模板首次打开及导入/添加/删除；原文下载；保存状态与离开保护。还须覆盖中文/英文、窄屏、StrictMode 生命周期及 WebKit/Firefox 存储限制。当前没有宣称这些 App 行为或这些其他浏览器通过。

剩余成本：为保留所有恢复版本，本轮不做自动历史淘汰；完整文档修订会消耗容量，读取会解析历史，长期高频编辑可能变慢或达到配额。接入时合并自动保存频率、跳过未变内容，并提供导出；后续历史管理应另行评审，不能静默删除恢复版本。浏览器清除站点数据、设备故障和用户主动删除存储不在本地事务能够保证的范围内。
