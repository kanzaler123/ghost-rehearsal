# Product foundation 实现设计

本文件由 Codex 在 2026-11-14 根据现有 requirements.md 编写，不作为 Kiro 的开发贡献记录。

## 当前交付边界

输入数据层已提供七类节点、连线、Scenario、Plan、参与者、资源、运行请求的类型与结构校验，图与资源引用校验，方案复制、子流程展开，以及双方案 JSON 示例。源码集中在 `src/schemas/`，不依赖界面、仿真器、浏览器或 Node API。

整体预览版进一步提供 `src/app/` 工作台、`src/components/` 画布与配置面板、`src/features/project.ts` 项目操作，以及 `src/simulation/` 确定性离散事件计算和统计。界面通过 Worker 发起运行，回放从实际事件重建状态；方案变更通过输入比较键识别旧结果，移动布局不改变计算结果。

当前事件、统计与运行结果类型属于预览版契约。Document_Codec 与同步 SHA-256 Fingerprint_Function 已接入保存、导入导出与过期判定。Workbench_Spec、正式输出契约、完整仿真语义文档、完整 Golden_Case_Suite 和 Demo_Storyboard 仍需后续完成；首批计算测试不代替完整需求验收。

## 数据约定

- TypeScript + Zod，类型由严格的运行时 Schema 推导，拒绝未知字段、不转换错误类型。
- ID 使用小写 ASCII；设备单元 ID 为 `deviceTypeId:序号`，参与者 ID 为 `arrivalStreamId:记录ID或序号`。
- `Scenario` 承载 seed、observationCutoff、horizon、attributes、arrivalStreams、assumptionOverrides、statistics；`Plan` 承载 scenarioId、graph、skills、staff、deviceTypes、assignments、layout。
- 节点使用 `type`，分布、策略和假设使用 `kind` 区分。时间单位为秒，区间为左闭右开；当前校验层不提前进行引擎的毫秒取整。
- 结构校验、方案复制和子流程展开保留可选参数的缺省形式。Document_Codec 在解析与序列化时补齐已声明的默认值，并按 Requirement 42 排序无序集合；有序列表保留顺序。缺省转移时长的例外见下文。
- `ValidationIssue.path` 是从调用对象根部开始的字段段数组，数组元素用数字下标表示。图校验以 `scenario` 或 `plan` 为首段；问题包括稳定 code、中文 message、severity 和 entityIds。
- Schema 校验负责结构、对象内部条件、同一容器 ID 唯一性、Scenario 属性映射及文档内 Scenario 引用。Graph 校验负责单个 Scenario/Plan 的跨对象语义。结构不合法时 Graph 返回空列表，由 Schema 校验报告结构问题，避免不可信结构进入图算法。
- 子流程只负责分组，展开只移除 subflow 节点；边仍引用具体成员。方案复制保留内部 ID 与缺省字段，生成确定性新 Plan ID，不共享可变对象。

## 统一后的契约

1. **42.12、18.1 与 41.1/41.3：默认转移时长的来源统计。** 缺省 Edge 转移时长按 fixed 0 计算，文档与指纹保留缺省字段，不生成 Provenance。显式给出的 fixed 0 仍要求 Provenance，保留其来源种类；二者的来源计数与指纹允许不同。42.12 已加入此例外。
2. **5.1 与 31.1：Run_Mode。** runMode 必填，不补 cutoff；只对 maxSteps 与 maxEvents 补默认值。5.1 已与 31.1 对齐。
3. **13.7 与 20.3：循环保护事件的随机抽样值。** 非 probability 路由统一使用 `draw: null`，20.3 已与 13.7 对齐。

`src/schemas/codec.ts` 返回规范化项目、完整问题列表与迁移列表，不执行图校验，因此结构合法但尚未连好的草稿可以保存。当前支持版本为 1，没有可迁移的更早正整数版本；迁移列表为空，未来版本直接拒绝。版本升级时须同时登记实际迁移。

`src/schemas/fingerprint.ts` 使用同一规范化格式，排除显示字段后同步计算输入与场景的 SHA-256，并返回相应文本供核对。参与者属性映射中的 `name`、`layout` 等用户字段保留；Provenance 只排除来源说明与备注。实现只使用 ECMAScript 标准对象，算法参考 [FIPS 180-4](https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.180-4.pdf)，测试以 Node crypto 独立对照。

## 验证

`npm run check` 执行严格类型检查、无 DOM/Node 全局的独立 Schema 类型检查、Node 环境单次单元测试和模块边界检查。示例测试逐项检查 Requirement 44 的输入覆盖要求。没有实现的模块不设占位测试、不标记通过。

依赖 API 参考：[Zod](https://zod.dev/api)、[Vitest](https://vitest.dev/guide/)、[TypeScript lib](https://www.typescriptlang.org/tsconfig/lib.html)。版本以 package-lock.json 为准。
