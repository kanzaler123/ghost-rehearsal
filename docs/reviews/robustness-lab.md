# C 稳健性实验台 review

状态：独立模块验证通过、已完成内部交叉审阅；等待 Draft PR 独立 review 及 E 集成，不能称为完整产品交付。

## 问题与实现

原工作台的单次比较无法展示种子和服务假设变化下的结果。本模块接收同场景既有方案，默认明确列出 20261114–20261123、原始/额外×1.25/额外×1.5，A/B 共 60 次。单 Worker 顺序调用现有 simulate，始终使用 cutoff，逐次只传紧凑摘要；取消直接 terminate，下一批创建新实例，通过实例身份和 batchId 同时隔离消息。

每个条件、每个候选分别给出有效/计划配对数及全部状态计数，保留不利结果。B 某次失败不会抹去该次 A/C 配对。等待是全部已到达者口径，P90 是每次运行的值，失败不补零。总等待、所有 outcomes、窗口资源时长、issues 和输入指纹均可查阅。完整导出保留输入快照、规则、配置及未筛选的全部记录；单组导出是合法共享场景项目。

接口和计算口径见 [契约](../robustness-contract.md)。

## 改动范围

- `src/experiments/robustness/`：types、conditions、summarize、aggregate、runner、worker、client、export、面板、局部文案/样式和挂载。
- `labs/robustness.html`：开发/独立评审入口。
- `tests/robustness-{core,client,export}.test.ts`：22 项行为测试。
- `e2e/robustness/`：专属浏览器测试及局部运行配置；沿用已安装 Playwright，无新增框架。
- `.kiro/specs/robustness-lab/`、本报告、契约、贡献记录和截图。

所有变更均为 C 独占新文件；App、比较组件、engine、Schema、analysis/project、全局样式/翻译、package/锁、共享配置及 CI 未改。逐个新增文件已检查其与 C1–C5 或交付要求的对应关系。

## 固定结果

真实 simulate，seed=20261114，原始条件，cutoff=1800 秒：

| 指标 | A | B | 测试中的增配人员 C |
| --- | ---: | ---: | ---: |
| 完成 | 43 | 41 | 72 |
| 未完成 | 253 | 253 | 218 |
| 提前离开 | 4 | 6 | 10 |
| 平均等待（秒） | 1057.716666… | 1055.333333… | 954.083333… |
| P90 等待（秒） | 1547.143 | 1547.143 | 1444.286 |
| 工作人员（人） | 3 | 3 | 4 |

B 平均等待下降同时完成减少 2 人、提前离开增加 2 人；这些不利信息没有隐藏。C 只由测试 fixture 构造，产品面板读取已有 C，不增加创建 C 的业务。这些是合成例子的运行证据，不是真实活动观测。

## 验证

实现提交：`c277b3be1ff88dc0ae33104f919987e085c19ea1`。检查代码与该提交对应；后续文档提交不改变运行代码。

| 命令/检查 | 实际结果 |
| --- | --- |
| `npm run check` | 15 个文件、285 项测试通过，含全部 22 项新增测试；类型检查通过 |
| `npm run build -- --base=/ghost-rehearsal/` | 通过；现有主包超过 500 kB 的提示仍在 |
| `npx tsc --noEmit --target ES2022 --module ESNext --moduleResolution Bundler --lib ES2022,DOM --types node --strict --skipLibCheck --resolveJsonModule e2e/robustness/robustness.browser.ts e2e/robustness/playwright.config.ts` | 通过 |
| `git diff --cached --check` | 通过 |
| `npx playwright test --config e2e/robustness/playwright.config.ts` | 最终完整矩阵 16 passed，退出码 0；中英文 × 桌面/390px 各 4 项 |

浏览器配置使用 `/ghost-rehearsal/labs/robustness.html` 的真实开发服务，真实创建 Worker；不 mock 仿真。覆盖默认 60 条、全部配对/不利数据、筛选不改变导出、180-job 批次取消并观察 Worker close、立即重跑隔离、离开页面后的 Worker 关闭、原工作台导入并重跑六项 cutoff 指标，以及导入已有 C、重复种子和非法 JSON/图拒绝替换。

单元测试另外覆盖重跑与顺序不变、空到达、克隆方案零变化、失败候选隔离、全部失败、真实事件上限 aborted、旧回调/重复消息、Worker 创建/传输失败、快照不污染；非默认 seed + 原全局 1.2 + 额外 1.25 + 工序倍率 + 资源中断的三方案导出，经原解析器再 simulate，完整摘要一致。

验证过程中的失败如实保留：最初跨场景测试 fixture 被默认候选筛选为空，修正 fixture 后保留原断言并通过；首次构建因独立 worktree 的 dist 写权限失败，获得对应写权限后原命令通过；首轮浏览器暴露筛选控件可访问名称不明确，后续中文用例又暴露种子 textarea 名称被值污染；均补本地 aria-label，没有改断言绕过。完整矩阵中曾有一次 15 秒等待超时（正常推进至 34/60），数值断言未失败。仅将默认 60 次批次的完成等待设为 90 秒（用例总上限 120 秒）；普通操作和取消仍使用 15 秒等待，没有性能 SLA 被豁免，也未删除数值、状态、取消或完整导出断言。修复控件名称后重新执行完整矩阵，最终结果见上表。初次失败的 trace/error-context 保留在本机 `%TEMP%/ghost-rehearsal-robustness-initial-failures/`，没有用最终成功覆盖掉失败事实。

## 交叉审阅与视觉证据

本会话中，核心实现代理独立检查 client/worker/export/UI，面板实现代理独立检查纯配置、汇总和成对聚合，浏览器代理审阅交互并实际操作。没有剩余阻断发现；发现的导入前图验证、末尾分隔符意外产生 seed=0、partial 单组文件名、可访问控件名称问题均已修复。这是 Codex 内部交叉审阅，不冒充 PR 后的人类/外部独立 review。

截图由真实浏览器测试生成，Codex 已目视检查英文桌面及中英文 390px 截图：配置、按钮和摘要可见，宽表局部滚动，正负变化同列展示。没有声称人类已经手工签收。

- [桌面英文](robustness-lab-assets/desktop-en.png)
- [390px 英文](robustness-lab-assets/mobile-en.png)
- [桌面中文](robustness-lab-assets/desktop-zh.png)
- [390px 中文](robustness-lab-assets/mobile-zh.png)

## 依赖与待完成项

1. 远端集成基线仍为 `ca28c078443b35d49bee6593a5d0dc6a20db12ae`，尚未包含 A 的公共浏览器准备。本机复用现有 node_modules（Playwright 1.65.1），未修改依赖。干净环境执行浏览器测试需先得到 A 的依赖准备；专属配置只是 C 的开发 lab 入口，不替代公共生产 smoke。
2. 正常 Vite 生产构建不会自动发布新 lab HTML；E 负责主站接线及所需部署入口。本任务仅验收独立开发面板和原工作台导入复现。
3. E 仍须处理当前项目快照、主工作台/实验台运行互斥与取消、输入变化后的过期提示及最终部署验收。
4. 项目 codec 按 planId 排序，单组导入后 A/B 位置可能交换；按 ID 匹配并重选基线。自定义 maxEvents 不在 ProjectDocument Schema 中，如需复现该限制，应在 engine API 传入；完整实验 JSON 已记录它。
5. 本机依赖 junction 使原工作台字体请求出现 Vite 403 回退，390px 原工作台比较还出现 SVG NaN 属性 console 警告，桌面原工作台出现 ResizeObserver loop completed with undelivered notifications 错误；六项复现数值通过，实验台使用本地系统字体且无页面异常。共享 App/Canvas 不在 C 所有权内，交 E 复核，不能据数值通过声称主站视觉验收完成。
6. Draft PR 等待独立 review；通过后仍须 E 完成主站接线，才构成完整产品交付。贡献归属见 [记录](../kiro/robustness-lab-usage.md)。
