# C：稳健性实验台的 Kiro 使用与贡献记录

日期：2026-11-15（Asia/Singapore，UTC+8）。任务分支：`kiro/robustness-lab`；集成目标：`kiro/release-integration`。

## 实际归属

本次任务由 **Codex** 执行。本轮没有调用 Kiro 的可核实记录，也未观察到 Kiro Stop Hook 执行。因此本次 Kiro 实际贡献记为“无可核实条目”，不能因分支名以 kiro 开头、Spec 文件存在或 Hook 已配置，就将实现和验证归为 Kiro。

- 用户：提出任务 C、独立 worktree、文件所有权、cutoff/配对/取消/完整保留不利结果以及 Draft PR 目标等约束。
- Codex 主代理：全文读取任务包、创建独立 worktree、协调接口、实现专用 Worker/client/export 及客户端测试、检查最终差异、维护 Spec/契约/review 和本记录、执行项目级验证与 Git 发布。
- Codex 核心子代理：实现纯配置/变换、紧凑摘要、逐次运行及成对聚合；真实 A/B/C 与边界测试；独立检查 client/Worker/导出/UI。
- Codex 面板子代理：局部中英文面板/样式/lab 入口及导入交互；独立检查核心模块。
- Codex 浏览器子代理：复用已安装 Playwright，操作真实 Worker 与既有工作台，生成截图并报告实际失败；不将自动化检查冒充人类验收。
- 既有模板、Schema、simulate、原工作台均为复用的基线代码，本轮未修改，不重复归为新增贡献。

## 产物与证据

实现提交：`c277b3be1ff88dc0ae33104f919987e085c19ea1`。本记录单独提交，只补验证和归属事实，不改运行代码。

- Spec：`.kiro/specs/robustness-lab/{requirements,design,tasks}.md`。
- 代码：`src/experiments/robustness/` 与 `labs/robustness.html`。
- 测试：`tests/robustness-*.test.ts` 与 `e2e/robustness/`。
- [接口契约](../robustness-contract.md)、[review 报告和截图](../reviews/robustness-lab.md)。
- 本地会话证据：`%USERPROFILE%/.codex/sessions/2026/11/15/rollout-2026-11-15T18-16-20-01a1deb5-34c1-73d3-b060-82e8a17bf342.jsonl`。此文件路径已在本机核实；未将私有会话日志上传到仓库，也未声称有 Kiro 会话导出。
- 本次没有改写根 `KIRO_USAGE.md`，没有补写未发生的 Kiro 操作或提效比例。

## 验证与限制

实际命令、测试数量、失败与修复、真实 Worker 证据及主工作台复现记录以 [review 报告](../reviews/robustness-lab.md) 为准。已有通过记录包含真实固定值、全部失败保留、事件上限中止、取消/迟到消息隔离，以及非默认条件/种子三方案完整导出复现。

本模块独立可评审不等于产品任务全部完成：PR 后独立 review、公共浏览器准备合入、E 的主站接线/生命周期协调/过期提示与部署验收仍待完成。原工作台小屏图形警告与本机字体回退亦已交接记录；不因数值复现通过而隐藏这些限制。
