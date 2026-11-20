# Kiro Process Notes & Historical Codex Handover Archive

> Archived verbatim from the root [`KIRO_USAGE.md`](../../KIRO_USAGE.md) during pre-submission cleanup on 2026-11-20 so the root document stays focused on the English reviewer summary and verbatim Stop Hook session records, while preserving every historical attribution note and workflow checklist intact.

---

## 每完成一个关键任务后（本地留档流程说明）

1. 项目已配置 `.kiro/hooks/update-usage-log.json`：Kiro 每轮工作结束后检查并按单次记录模板追加实际任务记录，跳过普通问答、重复记录和记录动作本身。新增配置从在本项目新开的 Kiro 会话起加载，之后无需重复发送记录提示；首次运行后核对实际记录是否生成。自动摘要会使用 Kiro 的模型额度。
2. 导出这次 Kiro 对话，保存到项目内的 `kiro-evidence/` 文件夹。Kiro IDE 1.x 官方说明的操作是右键对话标签页 → **Export Chat**，保存 ZIP。另一份官方聊天指南使用 **Export Conversation** 并导出 Markdown；以安装版本实际提供的选项为准，保留导出文件原格式。
3. 建议命名为 `日期-时间-任务名`，例如 `2026-11-14-2030-product-foundation.zip`。这是命名示例，不代表已经发生的会话。记录时间统一用北京时间／新加坡时间（UTC+8）。
4. 遇到重要结果再保存截图，例如 Spec 任务完成、Hook 实际触发、错误修复及对应验证；放到同一文件夹，在记录中写明文件名。
5. Kiro 生成的需求、设计、任务、Steering、Hooks 和实际代码保留在项目中。建立 Git 仓库后，为每个完成的阶段保存代码版本，并在记录中补充对应提交编号。

自动记录只更新 `KIRO_USAGE.md`，对话导出和截图仍按上述步骤保存。导出文件是当时会话的存档；继续开发后，需要再次导出。`kiro-evidence/` 已通过项目 `.gitignore` 排除，原始对话留本地；正式提交时选取适合公开的材料。比赛要求保留的 `.kiro/` 目录不在排除范围内。

## 官方参考（2026-11-14 核对）

- [Kiroween 2026 项目与提交要求](https://kiroween.devpost.com/rules)
- [Kiro IDE 1.x 会话导出说明](https://kiro.dev/docs/ide/whats-new-v1/#export-sessions)
- [Kiro 聊天指南中的导出说明](https://kiro.dev/docs/ide/chat/)
- [Kiro Hooks 配置与加载方式](https://kiro.dev/docs/hooks/)

---

## 2026-11-15 本次开发与 Hook 核对（Codex 记录）

本轮从合并后的 main `6309d5f` 接手，在 `codex/comparison-guided-demo` 开发。现状盘点与两个新 Spec 由 Codex 完成（`aef3baf`），比较口径实现与验证由 Codex 完成（`1da5495`）。这些不计入 `KIRO_USAGE.md` 的 Kiro“实际记录”。后续本轮提交及验证见 [开发验证记录](../validation-2026-11-15.md)。历史归属保留。

A/B/C 引导、共享实验构造和画布隐藏状态修复由 Codex 完成（`a38917d`）。新增浏览器测试通过生产 Worker 运行实际方案，并读取实际下载文件；Steering、CI 和最终验证记录也由 Codex 完成，不计为 Kiro 开发或 Hook 自动产物。

本地 Kiro 1.4.178 日志确有 2026-11-15 16:33:39 的 `hooks.reload.loaded`（read=1、registered=1）和 `fs.hooksReload.ok`。这能证明加载/注册，不能证明日志 Hook 执行完成；本次未查到相应执行完成记录，也没有生成实际任务条目。新增 `.kiro/steering/comparison-evidence.md` 由 Codex 编写，其内容约束共享比较规则、C 构造、真实浏览器验收与证据归属；未声称 Kiro 已加载或使用它。

本次已核实的 Kiro 开发贡献：无。Hook 的实际触发、防重复、递归和额度消耗仍未验收；没有虚构会话、截图或自动记录。

## 2026-11-15 UI 改造接手（Codex 追加）

用户提供的 Kiro 交接说明报告：已完成 rehearsal-studio-ui 规格（`eeef1dc`）和基线记录（`4d22025`），UI 实现及改造前截图未完成；原始 Kiro 会话导出为 **pending**。保留这两次既有提交及历史归属，不把交接说明当作本轮观测到的 Kiro 执行日志。

随后由 Codex 完成改造前截图（`4ef1d01`）、UI 实现及验证工作；这些不计为 Kiro 开发或 Hook 自动产物。具体文件范围、验证结果及尚待集成事项见 [`docs/reviews/ui-visual-polish.md`](../reviews/ui-visual-polish.md)，归属和证据状态见 [`docs/kiro/ui-visual-polish-usage.md`](ui-visual-polish-usage.md)。本次没有声称 Stop Hook 执行完成，也没有补造 Kiro 原始会话；未导出的 Kiro 会话仍为 **pending**。

## 2026-11-16 比较首屏与访客旅程（Codex 追加）

本轮从经 fetch 和远端核实的最新 `origin/main` `626ef47c64bd176b7db690f051ce7b9adcb3c64f` 创建独立 worktree 和 `kiro/compare-first-screen` 分支，处理顶部信息叠加、双画布裁切、结果重复及旅程阅读顺序。用户提供范围与验收条件；Codex 及其协作代理完成基线检查、代码修改、生产 Worker 截图、相关测试与交付记录。实现提交编号及最终验证结果在 [本轮评审记录](../reviews/compare-first-screen.md) 更新。

本轮实际调用或执行的 Kiro 功能：无已核实项。现有 `.kiro` Spec 和 Steering 由 Codex 阅读，不计为 Kiro 运行或开发贡献；本轮没有已核实的 Kiro 代码修改或 Stop Hook 执行输出。历史 Kiro 交接归属保留，原始会话导出继续标记为 **pending**；本轮 Codex 原始会话导出也为 **pending**。

真实截图与逐状态条件已存入 `docs/reviews/compare-first-screen/before/` 和 `after/`；这些是 Codex 生成的浏览器证据。文件范围、贡献归属、验证失败／通过／待运行状态及证据位置见 [本轮使用记录](compare-first-screen-usage.md) 和评审记录。本轮停在 Draft PR 待独立 review，不合并 main、不部署、不提交比赛，也不把实现完成写成用户验收通过。
