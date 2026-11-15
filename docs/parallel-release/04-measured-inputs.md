# D：真实参数导入、来源与单位

分支：`kiro/measured-inputs`。先阅读 [公共规则](README.md)。目标是让用户把自己的活动记录用于已有仿真；导入能力和合成测试不等于已经完成真实活动验证。

## 当前基础与增量

现有 Schema 已支持 `records` 到达流、`empirical` 服务样本及 synthetic/user_estimate/measured/historical 来源。Inspector 已有样本文本输入，不能把再加一个文本框视为本任务全部成果。

本任务增加结构化 CSV/粘贴输入、预览与错误定位、显式时间单位、来源编辑和追溯规则，复用已有模型、JSON往返与执行报告。

## 独占范围与可评审入口

- `src/features/data-sources/`：解析、转换、校验、摘要、来源更新 helper。
- `src/components/data-sources/`：受控组件、局部 CSS、双语文案、lab 挂载。
- `labs/data-sources.html`：使用现有 Vite dev server 打开的独立评审页，传入真实示例的类型与对象，展示结果草稿并可导出合法项目。
- `tests/data-sources-*.test.ts`、`tests/fixtures/data-sources/`、`e2e/data-sources/`。
- `docs/data-entry.md`、独立 Spec/review/usage。

不改 App、Dialogs、Inspector、simulation/schema、analysis/project、共享 messages/styles、依赖锁。若解析确实需要新依赖，由 A 统一处理依赖和锁文件；不要另装一套 UI/测试框架。

## D1：受控接口

直接使用 `Scenario['arrivalStreams'][number]`、`ServiceNode['duration']` 及其 provenance 类型。建议接口：

```ts
ArrivalDataEditor({
  stream, attributes, observationCutoff, horizon, lang, onChange,
});
ServiceDataEditor({ duration, lang, onChange });
ProvenanceFields({ value, lang, onChange });
```

每个编辑器维护局部草稿，只有显式应用且验证成功后调用一次 onChange。取消与失败不改变传入对象，不直接写 App、localStorage，不启动仿真。

到达导入替换当前选中的已有 stream，保留其 ID 和合法名称，维持入口引用；需要新群体时使用现有“新增群体”，再导入。属性定义继续由现有 Scenario 提供，不从列名猜测新的业务属性。

最终由 E 将 ArrivalDataEditor 嵌入 B 已完成的 ScenarioEditor，将 ServiceDataEditor/ProvenanceFields 嵌入 Inspector；保存场景的外层 Apply 仍是项目提交点，嵌套编辑不能绕过它提前改项目。

## D2：两类 CSV 与显式单位

到达格式：`id,arrival_time,attr:<当前场景属性ID>...`。属性列统一使用 `attr:` 前缀，映射回原属性ID，避免合法业务属性 id 或 arrival_time 与保留列重名。例如现有示例的属性是 ticket、visit 时，模板可为：

```csv
id,arrival_time,attr:ticket,attr:visit
guest-1,0,regular,full
guest-2,1.5,vip,quick
```

模板必须根据当前 Scenario 的属性ID/允许值生成；不用一个只对某示例成立的固定模板冒充通用模板。用户明确选择秒或分钟；arrival_time 为相对于活动开始的时间。

服务样本格式：

```csv
duration
22
31
18
```

上传 CSV 与粘贴表格文本共用解析和校验。保留重复服务样本，转换为已有 empirical 类型；不擅自去重、拟合成另一分布或用平均数替代样本。

处理 UTF-8 BOM、CRLF、引号/转义字段、空行、缺列/多列、空文件与畸形行。相对时间与单位在预览中清楚显示，不根据数值大小猜单位。

## D3：预览、错误与原子应用

预览显示目标群体/服务节点、总行数、合法行数、错误行列、单位与转换后的秒数。

到达预览显示最早/最晚时间、cutoff 前后人数、horizon 后人数。晚于 cutoff 和 horizon 的非负有限相对时间在现有记录 Schema 中均可合法；提示它们不会在对应运行范围内到达，不额外禁止，也不默默丢弃。

服务预览显示样本数、最小/最大、算术平均值。不要把这组导入样本的摘要误叫仿真结果。

以下情况必须有具体行列错误：重复 arrival ID、非法 ID、负数、非有限数、缺少必需属性、未知属性列/值、格式错误。重复服务耗时有效；Schema 允许的零值有效。samples 上限复用既有约束。

有错误则整个应用不发生；取消也不写入。预览中的内容与将应用的内容必须是同一份快照，不能先显示有效内容再应用另一个未验证版本。

## D4：来源说明与手工修改规则

提供四类来源及中英文解释，source/notes 使用已有字段和长度限制。上传文件本身不证明数据实测。导入新文件或替换数值默认改为 user_estimate，并保留可追溯的说明；只有用户在同一份已验证草稿中明确重选 measured/historical 时才采用该标签。不能因为目标原来标为实测就把新文件自动继承为实测。

制定并实现统一 helper：手动修改参数值时默认转为 user_estimate，保留已有 source/notes，并提示标签变化；用户确认属于测量纠错时，可显式重新选择 measured。只修改名称、source/notes 时，不应改变数值或来源种类。

不要无声保留已不代表当前值的 measured 标签，也不要无声丢弃原来源说明。必要的既有 Inspector/ScenarioEditor 接线由 E 统一完成；D 提供纯 helper 和完整测试。

就近解释：服务耗时从开始服务到结束服务，不包含排队；到达相对活动开始；cutoff 与 horizon 的区别；empirical 从输入样本抽样；共享 Scenario 的改动影响所有使用它的方案，应用后旧结果会过期。

## D5：模块验收

- 秒与分钟输入转换后的模型一致；1.5分钟为90秒。
- 上述 CSV 边界、属性、ID、数值错误均定位到行列；不存在隐式丢行。
- 属性ID为 id、arrival_time、source、notes 等合法业务键时，通过 attr: 前缀正确映射，不能与保留列或元数据混淆，也不能增加业务属性禁用规则。
- 重复服务样本保留，重复到达ID拒绝。
- 失败或取消不会修改任何输入引用；应用仅返回合法对象。
- 替换 arrival stream 保留引用身份；其他 stream、属性、Plan和图不变。
- provenance 三个字段正确保存；来源变更 helper 覆盖数值改动、纯说明改动和明确重选。
- 向原来为 measured/historical 的目标导入另一份 CSV，未明确重选来源时必须变为 user_estimate；纯名称/source/notes修改保留原kind。
- 所有测试 fixture 标为合成测试资料。
- 独立 lab 可真实导入、预览、取消、应用并输出合法项目，在390px与桌面均可操作。

## D6：统一集成后必须完成的验收

1. 从工作台普通 UI 向已有到达流导入记录，外层 Apply 后运行成功。
2. 给服务节点导入样本，预览与保存一致。
3. A/B 仍使用同一共享 Scenario；输入改动使旧结果过期，重新运行更新。
4. JSON 导出、刷新、重新导入后，输入和来源保持，重跑可复现。
5. 现有 Markdown 执行报告中的样本/来源与 UI 一致。
6. 错误导入能够定位；取消后模型和结果状态不被错误改变。
7. 使用 B 的焦点/字段行为，键盘和短窄视口可完成，不自己另造一套 Modal。

独立模块通过后可以申请 review；只有这些真实 UI 接线和验收完成，D 的产品交付才算完成。

## 交付

`.kiro/specs/measured-inputs/`、解析和组件、模板与测试、`docs/data-entry.md`、`docs/reviews/measured-inputs.md`、`docs/kiro/measured-inputs-usage.md`。文档说明既有 Schema/引擎/导出为复用能力，Kiro本次贡献为实际新增与修复。PR base为集成分支。
