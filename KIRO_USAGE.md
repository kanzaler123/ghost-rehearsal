# Ghost Rehearsal — Kiro 使用记录

状态：记录模板，尚未填写实际 Kiro 开发记录。本模板由 Codex 准备；模板创建本身不计为 Kiro 的开发贡献。

## English status for reviewers

No actual Kiro development sessions have been verified in this log. The requirements and hook configuration existed before the implementation, but no exported Kiro sessions were available to establish their authorship or execution. The application implementation, tests, UI updates, and repository preparation were completed with Codex.

The tracked `.kiro/` folder contains a requirements-first specification and a hook configured to record substantive Kiro work. Configuration alone is not evidence that the hook ran. The Chinese sections below are a recording template and instructions, not completed usage records.

For each future Kiro task, record its date, problem, Kiro features actually used, concrete contributions, human or other-tool contributions, changed files or commit, verification results, and supporting session export. Raw exports stay in the ignored `kiro-evidence/` directory; prepare appropriate public evidence and an English account of actual Kiro use before submission. Do not attribute Codex work to Kiro.

## 每完成一个关键任务后

1. 项目已配置 `.kiro/hooks/update-usage-log.json`：Kiro 每轮工作结束后检查并按下方模板追加实际任务记录，跳过普通问答、重复记录和记录动作本身。新增配置从在本项目新开的 Kiro 会话起加载，之后无需重复发送记录提示；首次运行后核对实际记录是否生成。自动摘要会使用 Kiro 的模型额度。
2. 导出这次 Kiro 对话，保存到项目内的 `kiro-evidence/` 文件夹。Kiro IDE 1.x 官方说明的操作是右键对话标签页 → **Export Chat**，保存 ZIP。另一份官方聊天指南使用 **Export Conversation** 并导出 Markdown；以安装版本实际提供的选项为准，保留导出文件原格式。
3. 建议命名为 `日期-时间-任务名`，例如 `2026-11-14-2030-product-foundation.zip`。这是命名示例，不代表已经发生的会话。记录时间统一用北京时间／新加坡时间（UTC+8）。
4. 遇到重要结果再保存截图，例如 Spec 任务完成、Hook 实际触发、错误修复及对应验证；放到同一文件夹，在记录中写明文件名。
5. Kiro 生成的需求、设计、任务、Steering、Hooks 和实际代码保留在项目中。建立 Git 仓库后，为每个完成的阶段保存代码版本，并在记录中补充对应提交编号。

自动记录只更新本文件，对话导出和截图仍按上述步骤保存。导出文件是当时会话的存档；继续开发后，需要再次导出。`kiro-evidence/` 已通过项目 `.gitignore` 排除，原始对话留本地；正式提交时选取适合公开的材料。比赛要求保留的 `.kiro/` 目录不在排除范围内。

## 单次记录模板

将以下字段复制到“实际记录”，每次任务追加一条。

- 日期与时间（UTC+8）：
- 任务名称／对应 Spec：
- 本次要解决的问题：
- 实际使用的 Kiro 功能（如 Spec、Steering、Hook；未使用的不填写）：
- Kiro 实际完成的工作：
- 人工／Codex 的修改、审查或决策：
- 产物文件／Git 提交编号（尚无提交时注明）：
- 验证方法与实际结果（区分未运行、失败、通过；写明验证范围）：
- 原始对话文件／相关截图：
- 遇到的问题、纠正过程与尚未完成的事项：

只记录能从会话、文件或验证结果中核实的工作。配置了 Hook 与 Hook 实际运行需要分别记录；提出方案、完成实现和通过验收也应分开描述。尚未保存的证据标记为“待导出”或“待截图”。

## 实际记录

待首次 Kiro 任务后追加。

## 最终参赛汇总

提交前，从实际记录中挑选有证据支持的案例，整理为英文使用说明：

1. 使用了哪些 Kiro 功能，为什么选择它们。
2. 它们分别参与了哪些具体功能的设计、实现或验证。
3. 一个代表性的问题，以及 Kiro、人工和其他工具各自如何参与解决。
4. 对应成果、验证范围和证据位置。

官方要求提交 Kiro 使用说明并在仓库根目录保留 `.kiro/`；本文件的记录频率、截图和存档方式是本项目的工作方法，并非官方规定的次数或格式。

## 官方参考（2026-11-14 核对）

- [Kiroween 2026 项目与提交要求](https://kiroween.devpost.com/rules)
- [Kiro IDE 1.x 会话导出说明](https://kiro.dev/docs/ide/whats-new-v1/#export-sessions)
- [Kiro 聊天指南中的导出说明](https://kiro.dev/docs/ide/chat/)
- [Kiro Hooks 配置与加载方式](https://kiro.dev/docs/hooks/)

## 2026-11-15 本次开发与 Hook 核对（Codex 记录）

本轮从合并后的 main `6309d5f` 接手，在 `codex/comparison-guided-demo` 开发。现状盘点与两个新 Spec 由 Codex 完成（`aef3baf`），比较口径实现与验证由 Codex 完成（`1da5495`）。这些不计入上方 Kiro“实际记录”。后续本轮提交及验证见 [开发验证记录](docs/validation-2026-11-15.md)。历史归属保留。

A/B/C 引导、共享实验构造和画布隐藏状态修复由 Codex 完成（`a38917d`）。新增浏览器测试通过生产 Worker 运行实际方案，并读取实际下载文件；Steering、CI 和最终验证记录也由 Codex 完成，不计为 Kiro 开发或 Hook 自动产物。

本地 Kiro 1.4.178 日志确有 2026-11-15 16:33:39 的 `hooks.reload.loaded`（read=1、registered=1）和 `fs.hooksReload.ok`。这能证明加载/注册，不能证明日志 Hook 执行完成；本次未查到相应执行完成记录，也没有生成实际任务条目。新增 `.kiro/steering/comparison-evidence.md` 由 Codex 编写，其内容约束共享比较规则、C 构造、真实浏览器验收与证据归属；未声称 Kiro 已加载或使用它。

本次已核实的 Kiro 开发贡献：无。Hook 的实际触发、防重复、递归和额度消耗仍未验收；没有虚构会话、截图或自动记录。
