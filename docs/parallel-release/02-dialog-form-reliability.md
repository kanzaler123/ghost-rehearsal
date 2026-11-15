# B：弹窗、键盘与表单编辑可靠性

分支：`kiro/dialog-form-reliability`。先阅读 [公共规则](README.md)，与 A/C/D 并行。此任务的浏览器复现与验证应在实施时真实执行；下列起点来自基线源码审查。

## 目标与文件范围

让首次导入、活动设置、资源/岗位编辑、节点参数和保存对话框在桌面与短窄视口中可以可靠完成。

独占 `src/components/Dialogs.tsx`、`src/components/Inspector.tsx`。可新增表单 helper/hook、`src/components/forms/` 下的局部样式及双语文案、`tests/forms-*.test.ts`、`e2e/forms/`。

不改 App、Canvas、比较算法、全局 CSS/messages、依赖锁和 CI。通过组件自己的根 class 限定 CSS；避免裸 `form` / `input` / `button` 规则影响全站。

## B1：统一叠加弹窗的视觉、焦点与关闭层级

现有 Modal 已有初始焦点、简单 Tab 循环和关闭后恢复，但每个实例都向 document 注册 Escape。多个 Modal 时一次 Escape 会触发多个 close。

复现起点：新浏览器欢迎页→Import→导入 `{}` 这样的无效项目。错误 Modal 与 EventCreator 会同时存在，且统一 z-index 与 DOM 顺序不能表达“最近打开的弹窗优先”。

实现：

1. 通过一致的最上层管理或原生模态能力处理视觉栈、焦点栈和关闭栈。
2. Tab/Shift+Tab 只在当前最上层可见、启用的控件间移动；关闭、隐藏、disabled、inert 的控件不能进入遍历。
3. Escape 一次只关闭最上层；背景与底层弹窗不可交互。
4. 关闭后将焦点恢复到有效触发点；触发点已被删除时提供合理的同层后备位置。
5. 动态删除当前聚焦的资源、班次或到达流后，把焦点放到同一弹窗的相邻操作或新增按钮。
6. 支持内容异步变化后仍保持可用的焦点边界，避免保存一次过期的控件清单。

验收：错误提示在欢迎页上方可见；第一次 Escape 只关闭错误提示且回到 Import；第二次 Escape 才关闭欢迎页。外部工作台的快捷键不能对正在操作的弹窗产生意外编辑。

参考语义与键盘行为：<https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/>。

## B2：修复短屏中的滚动与底部操作可达性

现有 `Modal > form > modal-body + modal-footer` 结构缺少中间 form 的可收缩滚动约束，外层 max-height/overflow:hidden 可能裁切底部操作。

实现统一的高度与 flex/scroll 链：标题、内容、操作区分工明确；中间 form 与 body 正确收缩；内容可内部滚动；背景滚动受控。

真实浏览器检查 390×568、390×844、1280×720：新建活动、场景编辑、资源编辑、JSON 编辑、保存模板、重命名。出现长错误后，Close/Cancel/Apply/Create/Save 仍可通过合理滚动和键盘到达。Tab 到底部按钮时，该按钮必须能进入可视区域。不要以“没有横向溢出”替代这些验收。

## B3：让数字输入支持正常编辑过程

现有 NumberInput 只向外提交有限数，显示完全由外部 number 控制。空串或未完成的小数没有局部草稿，会回填旧值。

实现字符串草稿与有效业务值分离，保持公共接口 `value: number`、`onChange(number)`、`min/max/step/label`。业务层不接收字符串、DOM event、NaN 或 Infinity。

必须明确：

- 可以清空后重新输入，支持合法小数。
- 在 blur/Enter 时采用一致的提交/错误规则；错误不偷偷变成 0 或写回非法数据。
- 无效字段有就近说明、`aria-invalid` 和可关联的错误描述。
- 提交所属表单时不能悄悄用旧业务值替代屏幕上的无效草稿。
- 切换节点/字段、Undo、恢复外部值后正确同步，不能沿用另一个实体的草稿。
- `MinuteInput` 对外仍是秒；1.5 分钟等于 90 秒。既有精度与单位不变。
- 数量类输入正确约束整数，耗时与概率等遵守各自的 step/min/max，不对所有数字做统一取整。

测试至少包含 Backspace 清空、0.5、0.15、1.5分钟、边界值、越界、非法临时串、外部撤销与节点切换。既有未设置/无限制的可选字段语义不得被改成固定 0。

## B4：Resources tabs 与 Field 分组语义

资源/岗位 tabs 已声明 tablist/tab，但缺少对应键盘与 panel 关联。实现 roving tabIndex、方向键/Home/End、明确激活方式、aria-controls/labelledby；切换前填写的草稿保持。

Inspector 的到达流与子流程成员 checkbox 放在外层 Field label 内，形成嵌套 label。提供 FieldGroup 或可选分组模式，使用合适的 fieldset/legend 或 group；每一项文字只切换对应 checkbox，Space 可操作，组名、项名与 hint/error 的关联明确。

## 向后兼容与 D 的接口

- Modal 现有 title/children/onClose/wide/icon 调用继续有效；新增焦点 prop 只能是可选项。
- Field 默认单控件用法继续可用，分组在本文件负责的调用点替换。
- ScenarioEditor/ResourcesEditor 的 Cancel/Escape 不提交草稿，Apply 成功仅提交一次。
- D 在独立目录提供数据编辑组件；B 不提前 import 尚不存在的模块。最终由 E 在已 review 的 Dialogs/Inspector 中嵌入 D，并验证来源与无效草稿行为一致。

## 测试与交付

先写有意义的组件/纯逻辑测试。A 的公共浏览器配置进入集成分支后，同步该配置，在 `e2e/forms/` 实现上述真浏览器路径。现有 hook runner 或静态 HTML 检查不能充当焦点、布局和文件导入的最终证据。

创建 `.kiro/specs/dialog-form-reliability/`、`docs/reviews/dialog-form-reliability.md`、`docs/kiro/dialog-form-reliability-usage.md`。记录修复前后的复现步骤、视口、语言、焦点顺序、验证结果及剩余问题。推送分支，PR 指向集成分支，等待独立 review。
