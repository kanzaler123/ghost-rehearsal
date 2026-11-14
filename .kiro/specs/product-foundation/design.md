# Product foundation 实现设计

本文件由 Codex 在 2026-11-14 根据现有 requirements.md 编写，不作为 Kiro 的开发贡献记录。

## 当前交付边界

输入数据层已提供七类节点、连线、Scenario、Plan、参与者、资源、运行请求的类型与结构校验，图与资源引用校验，方案复制、子流程展开，以及双方案 JSON 示例。源码集中在 `src/schemas/`，不依赖界面、仿真器、浏览器或 Node API。

整体预览版进一步提供 `src/app/` 工作台、`src/components/` 画布与配置面板、`src/features/project.ts` 项目操作，以及 `src/simulation/` 确定性离散事件计算和统计。界面通过 Worker 发起运行，回放从实际事件重建状态；方案变更通过输入比较键识别旧结果，移动布局不改变计算结果。

当前事件、统计与运行结果类型属于预览版契约。Workbench_Spec、正式输出契约、完整仿真语义文档、Document_Codec、Fingerprint_Function、完整 Golden_Case_Suite 和 Demo_Storyboard 仍需后续完成；首批 15 项计算测试不代替完整需求验收。

## 数据约定

- TypeScript + Zod，类型由严格的运行时 Schema 推导，拒绝未知字段、不转换错误类型。
- ID 使用小写 ASCII；设备单元 ID 为 `deviceTypeId:序号`，参与者 ID 为 `arrivalStreamId:记录ID或序号`。
- `Scenario` 承载 seed、observationCutoff、horizon、attributes、arrivalStreams、assumptionOverrides、statistics；`Plan` 承载 scenarioId、graph、skills、staff、deviceTypes、assignments、layout。
- 节点使用 `type`，分布、策略和假设使用 `kind` 区分。时间单位为秒，区间为左闭右开；当前校验层不提前进行引擎的毫秒取整。
- 可选参数保持缺省形式；结构校验、方案复制和子流程展开均不补默认值。默认值的正式归一化由后续 Document_Codec 统一处理。
- `ValidationIssue.path` 是从调用对象根部开始的字段段数组，数组元素用数字下标表示。图校验以 `scenario` 或 `plan` 为首段；问题包括稳定 code、中文 message、severity 和 entityIds。
- Schema 校验负责结构、对象内部条件、同一容器 ID 唯一性、Scenario 属性映射及文档内 Scenario 引用。Graph 校验负责单个 Scenario/Plan 的跨对象语义。结构不合法时 Graph 返回空列表，由 Schema 校验报告结构问题，避免不可信结构进入图算法。
- 子流程只负责分组，展开只移除 subflow 节点；边仍引用具体成员。方案复制保留内部 ID 与缺省字段，生成确定性新 Plan ID，不共享可变对象。

## 需求澄清项

1. **42.12、18.1 与 41.1/41.3：默认转移时长的来源统计。** 缺省 Edge 转移时长按 fixed 0 计算且不含 Provenance；但序列化要求显式补全默认值，显式时长又必须带 Provenance。直接补 synthetic 会改变来源计数和指纹。Document_Codec 与 Fingerprint_Function 实现前需要统一这一表示法；当前保留缺省字段，不生成伪造来源。
2. **5.1 与 31.1：Run_Mode 默认值。** 前者提到补全默认值，后者规定必填且未定义默认值。当前按 31.1 要求显式给出 runMode，不私自补 cutoff。
3. **13.7 与 20.3：循环保护事件的随机抽样值。** 前者规定非 probability 路由为 null，后者说不含该值；在正式输出契约实现前统一。预览版在非 probability 路由事件中使用 `draw: null`。

## 验证

`npm run check` 执行严格类型检查、无 DOM/Node 全局的独立 Schema 类型检查、Node 环境单次单元测试和模块边界检查。示例测试逐项检查 Requirement 44 的输入覆盖要求。没有实现的模块不设占位测试、不标记通过。

依赖 API 参考：[Zod](https://zod.dev/api)、[Vitest](https://vitest.dev/guide/)、[TypeScript lib](https://www.typescriptlang.org/tsconfig/lib.html)。版本以 package-lock.json 为准。
