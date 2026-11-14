# Requirements Document

## Introduction

Ghost Rehearsal（幽灵预演）是面向活动组织者的可视化活动流程编排与离散事件仿真平台，产品基线为仓库根目录 `PLAN.md`。本 Spec（product-foundation）对应 PLAN.md 第 19 节 Task 01，属于 Phase 1“产品结构与体验设计”（2026-11-14 至 2026-11-17）。产品目标、定位与阶段安排保持 PLAN.md 原样。

本 Spec 的交付物：

1. Workbench_Spec：工作台信息架构，以及 Build、Rehearse、Compare 三种画布模式的交互规则和线框图；
2. Schema_Module：节点、连线、参与者、资源、场景与方案的正式数据 Schema（TypeScript 类型与运行时校验）；
3. 只处理数据的纯函数：Schema_Validator、Graph_Validator、Subflow_Flattener、Plan_Duplicator、Fingerprint_Function、Document_Codec；
4. 仿真引擎与界面之间的数据契约（Run_Request、Run_Result、Event_Log、Statistics、Run_Metadata）及仿真语义定义；
5. Example_Scenario：用正式 Schema 表达并通过校验的示例场景（一个 Scenario、两个 Plan）；
6. Golden_Case_Suite：手算金标准用例，供后续引擎实现验证；
7. Demo_Storyboard：核心演示逐镜头分镜。

不在本 Spec 范围：React Flow 编辑器、离散事件仿真引擎、Population_Generator、Metrics_Calculator、幽灵动画、比较界面和导出功能的实现。这些分别属于 workflow-editor、simulation-engine、resource-scheduling、ghost-playback、scenario-comparison、analytics-explanations、export-and-release 等后续 Spec，按 PLAN.md 第 14 节排期。

需求主语与验收方式：

| 主语 | 本 Spec 内的验收方式 | 实现所在 Spec |
|---|---|---|
| Schema_Module、Schema_Validator、Graph_Validator、Subflow_Flattener、Plan_Duplicator、Fingerprint_Function、Document_Codec | 在本 Spec 实现，并通过自动化测试 | product-foundation |
| Example_Scenario、Golden_Case_Suite、Demo_Storyboard、Workbench_Spec、Repository | 在本 Spec 交付，通过校验测试或评审清单 | product-foundation |
| Simulation_Engine、Population_Generator、Metrics_Calculator | 语义在仿真语义文档中有唯一定义；所需字段存在于 Schema_Module；涉及计算结果的条目由 Golden_Case 覆盖 | simulation-engine、resource-scheduling |
| Workbench、Playback | 行为在 Workbench_Spec 中有唯一定义；所需数据存在于契约类型 | workflow-editor、ghost-playback、scenario-comparison、analytics-explanations、export-and-release |

Population_Generator 中间隔方式为 random 的 total_in_window 模型与 preset_profile 各预设形状的到达时刻生成算法由 simulation-engine Spec 定义；本 Spec 只规定 Population_Generator 必须满足的不变量（Requirement 21 第 6 至 8 条、第 10、11 条与 Requirement 22 第 7 条）。

时间约定：Schema 中的时间点均为相对场景时间原点 T0（取值 0）的秒数，持续时间均以秒为单位，时间区间均为左闭右开 [start, end)。

## Glossary

- **Workbench**：工作台界面，由顶部工具栏、左侧节点面板、中央画布、右侧属性面板、底部仿真面板组成。本 Spec 只定义其信息架构与交互规则。
- **Workbench_Spec**：本 Spec 产出的工作台信息架构与交互规格文档（含线框图），后续 Spec 实现 Workbench 时必须遵守。
- **Canvas_Mode**：画布模式，取值为 Build、Rehearse、Compare。
- **Simulation_Relevant_Field**：会影响仿真结果（含 Run_Metadata 的 Provenance 摘要）的字段，确切范围以 Requirement 5 第 1 条为准。
- **Layout_Field**：只用于画布显示、不影响仿真结果的字段，包括 Node 上的坐标、尺寸与 Subflow 折叠状态，画布视觉分组的成员关系，以及按 Plan 存放的画布级视口（视口不存放在 Node 上）。显示名称、描述和备注同样不影响仿真结果。
- **Schema_Module**：`src/schemas/` 下的 TypeScript 类型、运行时校验，以及 Schema_Validator、Graph_Validator、Subflow_Flattener、Plan_Duplicator、Fingerprint_Function、Document_Codec 的实现，是本 Spec 的主要代码交付物。
- **Schema_Validator**：基于 Schema_Module 的结构校验，检查字段类型、必填项、取值范围、ID 格式和单个对象内部的约束；同时为对象类型未定义的字段返回 error（Requirement 42 第 8 条），并检查 Project_Document 内的文档级 ID 唯一性与引用（Requirement 6 第 11 条、Requirement 7 第 10 条）。
- **Graph_Validator**：以一个 (Scenario, Plan) 组合为唯一输入、执行跨对象引用检查与图结构检查的纯函数，不读取 Project_Document 中的其他 Scenario 或 Plan。
- **Validation_Issue**：校验结果条目，包含 code、severity（error 或 warning）、中文 message、相关实体 ID 列表和字段 path。
- **Project_Document**：导入导出的顶层文档，包含格式标识、Schema_Version、一个或多个 Scenario 以及一个或多个 Plan。
- **Document_Codec**：Project_Document 的解析器（JSON 文本 → 校验后的对象）与规范化序列化器（对象 → 稳定格式的 JSON 文本）。
- **Schema_Version**：Project_Document 的结构版本号，为正整数。
- **Model_Version**：仿真语义版本号。仿真语义的任何变化都必须递增 Model_Version。
- **Scenario**：共享场景条件，包括随机种子、Observation_Cutoff、Horizon、Participant_Attribute 定义、Arrival_Stream、Assumption_Override 和统计设置。引用同一 Scenario 的所有 Plan 共享这些条件。
- **Plan**：方案，即一套具体活动安排，包括 Workflow_Graph、Skill 目录、Staff、Device_Type 和 Assignment。每个 Plan 引用一个 Scenario。
- **Plan_Duplicator**：以一个 Plan 和 Project_Document 中已有 Plan ID 的集合为输入、返回该 Plan 副本的纯函数。
- **Workflow_Graph**：Plan 中 Node 与 Edge 的集合。
- **Node**：流程节点，type 取值为 entrance、service、decision、waiting_area、merge、exit、subflow。下文分别称为 Entrance、Service、Decision、Waiting Area、Merge、Exit、Subflow 节点。
- **Edge**：连线，表示 Participant 从源 Node 到目标 Node 的流程转移，不表示画布上的距离。
- **Branch**：Decision 节点的一个出口分支，以 branchKey 标识。
- **Subflow_Flattener**：把含 Subflow 节点的 Plan 转换为不含 Subflow 节点的等价 Plan 的纯函数。
- **Stage_Key**：Service 节点上的跨方案工序标识字符串。两个 Plan 中 Stage_Key 相同的 Service 节点代表同一项可比较工序。
- **Decision_Key**：Decision 节点上的跨方案路由抽取标识字符串。
- **Node_Correspondence**：方案 A 与方案 B 之间的 Node 对应关系，规则见 Requirement 23。
- **Participant**：参与者，画面中以幽灵表示。
- **Participant_Attribute**：Scenario 中定义的分类属性（例如票种），具有有限的取值集合。
- **Arrival_Stream**：Scenario 中的一个到达流，定义一组 Participant 的到达时刻生成方式和属性分布。
- **Base_Population**：由 Scenario 确定性生成的全部 Participant 列表，与 Plan 无关。
- **Population_Generator**：生成 Base_Population 的模块，由 simulation-engine Spec 实现。
- **Keyed_Draw**：取值于 [0, 1) 的随机数，其值仅由（Scenario 种子、用途、主体 ID、键、Visit_Index）决定。
- **Visit_Index**：从 1 开始的计数，具体口径见 Requirement 22。
- **Resource_Unit**：单个可分配资源，即一名 Staff 或一台设备。
- **Staff**：工作人员，具有 ID、Skill 列表、Shift 和 Unavailability_Window。
- **Skill**：Plan 的技能目录条目。Staff 通过所具备的 Skill 满足服务需求。
- **Device_Type**：设备类型，具有数量；每台设备是一个 Resource_Unit。
- **Resource_Requirement**：Service 节点每次服务需要同时占用的资源组合，由若干需求项组成；需求项为“具备某 Skill 的 Staff × 数量”或“某 Device_Type 的设备 × 数量”。
- **可分配 Resource_Unit**：Service 节点在时刻 t 可用于开始新服务的 Resource_Unit，定义见 Requirement 27 第 2 条。
- **可完整满足**：Resource_Requirement 在时刻 t 能以互不相同的可分配 Resource_Unit 满足全部需求项的状态，定义见 Requirement 27 第 2 条。
- **Assignment**：Plan 中某个 Resource_Unit 按时间段可服务的 Node 集合，每个时间段可带交接时长。
- **Handover**：调岗交接时段，期间 Resource_Unit 不可分配。
- **未排岗**：有 Assignment 的 Resource_Unit 不在任何 Assignment 时间段内、或所在时间段可服务 Node ID 列表为空，且不属于忙碌、离岗、不可用或交接中的时刻，定义见 Requirement 38 第 6 条。
- **Shift**：Resource_Unit 的在岗时段 [start, end)。
- **Unavailability_Window**：Resource_Unit 的计划不可用时段 [start, end)。
- **Open_Window**：Service 节点的开放时段 [openAt, closeAt)。
- **Queue_Capacity**：节点可容纳的等候人数上限；取值 null 表示不设上限。
- **Full_Policy**：节点满员时对新到达 Participant 的处理策略，取值为 block、reroute、reject。
- **Close_Policy**：Service 节点最后一个 Open_Window 结束时，对排队者和迟到者的处理策略。
- **可开始服务**：Service 节点在时刻 t 可作为分配轮次候选节点的开放条件，定义见 Requirement 11 第 10 条。
- **关闭后继续服务阶段**：Close_Policy 排队者处理方式为 serve 的 Service 节点在最后一个 Open_Window 结束后继续服务剩余排队者与受阻者的阶段，见 Requirement 29 第 5 条。
- **Loop_Guard**：Decision 节点上的循环终止条件，由 maxVisits 和 exitBranchKey 组成。
- **Max_Steps**：每个 Participant 允许的 Node 到达总次数上限，作为运行时保护。
- **Simulation_Engine**：离散事件仿真引擎，由 simulation-engine 与 resource-scheduling Spec 实现；本 Spec 定义其输入、输出与语义。
- **Metrics_Calculator**：从 Event_Log 与 Run_Request 计算 Statistics 的模块，由 simulation-engine Spec 实现。
- **Run_Request**：一次仿真运行的完整输入。
- **Run_Result**：一次仿真运行的完整输出，包含运行 ID、状态（succeeded、failed 或 aborted）、Run_Metadata、Event_Log、Statistics（状态为 failed 或 aborted 时为 null）和运行问题列表，见 Requirement 31 第 2 条。
- **Run_Metadata**：运行元数据，包含 Model_Version、Schema_Version、Plan ID、Scenario ID、随机种子、Input_Fingerprint、Scenario_Fingerprint、Run_Mode、Max_Steps、maxEvents、Observation_Cutoff、Horizon、覆盖结束时刻、Provenance 摘要和创建时刻，见 Requirement 31 第 3 条。
- **Simulation_Event**：Event_Log 中的单个事件。
- **待处理事项**：已确定在某时刻发生、尚未处理的仿真步骤，分类与排序规则见 Requirement 30 第 4 条。
- **Event_Log**：按 seq 排序的 Simulation_Event 列表。
- **Statistics**：由 Metrics_Calculator 计算的统计结果。
- **Metric_Bucket**：统计用时间桶，时长 b 取自 Scenario 统计设置（缺失时为 900 秒），划分规则见 Requirement 37 第 3 条。
- **Playback**：回放层，包括幽灵动画、时间轴和图表，由 ghost-playback 等 Spec 实现。
- **Run_Mode**：运行模式，取值为 cutoff（运行到 Observation_Cutoff）或 run_to_completion（运行到 Requirement 40 第 1 条的停止时刻，至多到 Horizon）。
- **Observation_Cutoff**：观察截止时刻 T_cut，单位秒，大于 0。
- **Observation_Window**：时间区间 [0, T_cut]。
- **Horizon**：run_to_completion 模式的运行上限时刻 T_max，满足 T_max ≥ T_cut。
- **运行结束时刻**：Simulation_Engine 停止推进仿真的时刻：Run_Mode 为 cutoff 时为 Observation_Cutoff，为 run_to_completion 时为 Requirement 40 第 1 条的停止时刻。
- **覆盖结束时刻**：Run_Metadata 中记录的 Run_Result 覆盖时间范围 [0, 覆盖结束时刻] 的右端，取值见 Requirement 31 第 11 条；completion 口径的时间窗口为 [0, 覆盖结束时刻]。
- **Participant_Outcome**：Participant 的结局，取值为 completed、rejected、dismissed、diverted、loop_limit、unfinished、not_arrived。前五种为终结结局。
- **Waiting_Time**：Participant 的等待时长，口径见 Requirement 36。
- **Participant_Journey**（正文称“Participant 经历记录”）：一位 Participant 在一个 Run_Result 中按访问顺序排列的访问条目列表，定义见 Requirement 35 第 1 条。
- **访问条目**：Participant_Journey 中对应该 Participant 一次 Node 到达的记录，字段见 Requirement 35 第 1 条。
- **受限**：Service 节点可开始服务且排队中与受阻人数之和不小于瓶颈阈值的状态，定义见 Requirement 39 第 1 条。
- **关闭期间积压**：Service 节点不可开始服务且排队中与受阻人数之和不小于 1 的状态，定义见 Requirement 39 第 5 条。
- **Fingerprint_Function**：对规范化序列化后的仿真相关内容计算指纹的纯函数，输出 Input_Fingerprint 与 Scenario_Fingerprint。
- **Input_Fingerprint**：一次 Run_Request 全部 Simulation_Relevant_Field 的指纹。
- **Scenario_Fingerprint**：一个 Scenario 全部 Simulation_Relevant_Field 与 Model_Version 的指纹。
- **Stale_Result**：记录的 Input_Fingerprint 与当前输入不一致的 Run_Result。
- **Comparison**：同一 Scenario 下两个 Plan 的 Run_Result 对照。
- **First_Divergence**：将同一 Participant 在两个 Run_Result 中按 seq 排列、不含 RUN_WARNING 的 Simulation_Event 序列逐位置比较时，首个满足以下任一条件的位置：两侧事件 type 不同；time 不同；两侧 nodeId 所指 Node 既不相同也不按 Node_Correspondence 相互对应；只有一侧在该位置有事件。First_Divergence 的时刻为该位置两侧事件 time 中的较早者，只有一侧有事件时取该事件的 time。
- **Provenance**：数据来源标签，取值为 synthetic（合成）、user_estimate（用户估计）、measured（现场测量）、historical（历史记录）。
- **Assumption_Override**：Scenario 中对所有 Plan 同等生效的假设调整项，包括服务时长系数和资源中断。
- **Example_Scenario**：本 Spec 交付的示例 Project_Document 文件。
- **Golden_Case**：手算金标准用例，包含输入、期望输出和手算过程。
- **Golden_Case_Suite**：全部 Golden_Case 的集合。
- **Demo_Storyboard**：核心演示逐镜头分镜文档。
- **产品声明常量**：Schema_Module 导出的中英文产品适用范围声明，文本见 Requirement 43 第 4 条。
- **仿真结论**：以文字陈述一个 Run_Result 的指标评价，或一次 Comparison 中方案 A 与方案 B 指标比较的语句，定义见 Requirement 43 第 2 条。
- **Repository**：本项目代码仓库。

## Requirements

### Requirement 1: 工作台信息架构

**User Story:** 作为活动组织者，我希望在同一个工作台中完成搭建、预演和比较，以便不必在不同应用界面之间切换。

#### Acceptance Criteria

1. THE Workbench SHALL 在 Build、Rehearse、Compare 三种 Canvas_Mode 下均由顶部工具栏、左侧节点面板、中央画布、右侧属性面板和底部仿真面板五个区域组成，其中 Compare 模式的中央画布分为左右并排的两个画布视图，左侧视图显示方案 A，右侧视图显示方案 B。
2. THE Workbench SHALL 在顶部工具栏提供项目名称、保存状态（取值为“已保存”“有未保存修改”“保存中”“保存失败”之一）、Canvas_Mode 切换、撤销、重做、运行、暂停、重置、运行设置（Run_Mode、Max_Steps、maxEvents）、方案管理和导出入口。
3. THE Workbench SHALL 在左侧节点面板提供按 Entrance、Service、Decision、Waiting Area、Merge、Exit、Subflow 七种 Node 类型分类的列表、从列表拖放到中央画布创建 Node 的操作、内置流程模板入口、可复用组合模块入口和节点搜索；节点搜索只保留名称包含搜索关键字（英文字母不区分大小写）的列表条目，无匹配条目时显示无结果提示。
4. THE Workbench SHALL 在中央画布支持节点拖动、连线、缩放（缩放比例范围 25% 至 400%）、平移、多选、复制、删除、分组、自动布局和小地图导航；其中分组为画布上的视觉分组，区别于 Subflow 节点，分组与自动布局均不修改任何 Simulation_Relevant_Field，小地图显示完整 Workflow_Graph 与当前视口所在范围。
5. WHEN 用户选中恰好一个 Node、Edge、Resource_Unit 或 Participant，THE Workbench SHALL 在右侧属性面板显示该对象的配置；Participant 的配置指其 Participant ID、Arrival_Stream ID、到达时刻和 Participant_Attribute 取值。
6. THE Workbench SHALL 在底部仿真面板提供时间轴、播放速度控制（档位与 Requirement 3 第 7 条一致）、按 seq 顺序列出 Simulation_Event 的事件记录、取自 Statistics 的总体指标，以及按时刻列出选中 Participant 全部 Simulation_Event 的个人时间线。
7. THE Workbench_Spec SHALL 为 Build、Rehearse、Compare 各提供一张标注五个区域的线框图，并以“5 个区域 × 3 种 Canvas_Mode”的表格逐格列出显示内容与可编辑性（取值为“可编辑”“仅 Layout_Field 可编辑”“只读”之一），可编辑性须与 Requirement 2 第 1 条、Requirement 3 第 3 条和 Requirement 4 第 6 条一致；顶部工具栏各格须列出每个入口在该模式下可用或不可用，右侧属性面板各格须说明未选中对象和选中 2 个及以上对象时的显示内容；并规定 Scenario 共享条件（Requirement 7 第 1 条所列字段与显示用起始钟点）和运行设置（Run_Mode、Max_Steps、maxEvents）在五个区域中的编辑位置。
8. THE Workbench_Spec SHALL 为以下九种状态各定义触发条件、呈现位置（五个区域之一或覆盖在 Workbench 上的对话框）、至少一项用户可执行的恢复操作，以及当前项目内容是否保持不变：空状态（当前 Plan 不含 Node，或当前 Plan 没有 Run_Result）；非法连线（Graph_Validator 按 Requirement 18 第 3 至第 7 条返回 error 级 Validation_Issue）；缺失参数（Schema_Validator 返回必填项缺失的 error 级 Validation_Issue）；仿真失败（Run_Result 状态为 failed 或 aborted）；Participant 无法到达出口（Graph_Validator 按 Requirement 19 第 4 条返回 error 级 Validation_Issue，或 Run_Result 中存在 Participant_Outcome 为 loop_limit 的 Participant，或 Run_Mode 为 run_to_completion 的 Run_Result 中存在 Participant_Outcome 为 unfinished 的 Participant）；资源不足（Graph_Validator 按 Requirement 19 第 5 条返回 error 级 Validation_Issue）；大规模场景性能下降（触发阈值由后续性能实测确定，与 Requirement 32 第 6 条一致）；保存与恢复失败（保存失败时保留全部未保存修改，并将保存状态显示为“保存失败”）；导入格式错误（Document_Codec 返回 error 级 Validation_Issue，当前项目内容按 Requirement 42 第 9 条保持不变）。
9. THE Workbench_Spec SHALL 为节点创建、节点选择、连线创建、删除、撤销、重做、Canvas_Mode 切换、播放与暂停各定义至少一种无需指针设备即可完成的键盘操作方式，并保证同一 Canvas_Mode 内每个按键组合只对应一项操作。
10. WHEN 用户切换 Canvas_Mode，THE Workbench SHALL 在同一页面内完成切换，保持五个区域的位置不变，并保留当前项目的未保存修改以及撤销、重做历史。
11. WHILE 当前 Plan 存在 Run_Result，WHEN 用户选中恰好一个 Node、Edge、Resource_Unit 或 Participant，THE Workbench SHALL 在右侧属性面板显示该对象在当前 Plan 最近一次 Run_Result 中的运行指标。
12. WHILE 键盘焦点位于文本输入框，WHEN 用户按下删除、撤销或重做按键，THE Workbench SHALL 只作用于该输入框内的文本，不删除画布对象，也不撤销或重做画布操作。

### Requirement 2: Build 模式

**User Story:** 作为活动组织者，我希望在 Build 模式自由搭建流程并配置资源，以便表达自己的活动安排。

#### Acceptance Criteria

1. WHILE Canvas_Mode 为 Build，THE Workbench SHALL 允许用户新增、删除当前 Plan 的 Node、Edge、Skill、Staff、Device_Type 与 Assignment 并修改其全部字段（含 Node 专属参数、Layout_Field、显示名称与描述），新增、删除和修改当前 Scenario 的 Participant_Attribute、Arrival_Stream 与 Assumption_Override，修改当前 Scenario 的随机种子、Observation_Cutoff、Horizon、显示用起始钟点和统计设置，包括会使内容产生 Validation_Issue 的修改。
2. WHILE Canvas_Mode 为 Build，THE Workbench SHALL 在每个画布节点上显示该 Node 的显示名称与 Node 类型，并在每个 Service 节点上逐项显示其 Resource_Requirement 中每个需求项引用的 Skill 或 Device_Type 及数量，需求项列表为空时显示表示无资源需求的标识。
3. WHILE Canvas_Mode 为 Build，THE Workbench SHALL 把单次用户操作对 Simulation_Relevant_Field、Layout_Field、显示名称、描述或备注产生的全部修改记录为恰好一个可撤销、可重做的操作（一次字段值提交、一次拖动结束、一次多选删除、一次粘贴或一次自动布局各记为一个操作），不把视口的缩放与平移记录为操作，至少保留最近 100 个操作，并在撤销后记录新操作时丢弃全部可重做的操作。
4. WHEN 用户在 Build 模式提交一次修改当前 Scenario 任一 Simulation_Relevant_Field 的操作，THE Workbench SHALL 在写入该修改前列出全部引用该 Scenario 的 Plan（含当前 Plan）的 ID 与显示名称，并请求用户确认或取消。
5. WHEN 用户在 Build 模式完成一次修改当前 Plan 或当前 Scenario 任一字段的操作（包括 Simulation_Relevant_Field、Layout_Field、Subflow 节点成员 Node ID 列表、显示名称、描述与备注的修改，以及撤销与重做；视口的缩放与平移除外；需按第 4 条确认的 Scenario 修改以用户确认时刻为完成时刻）且当前 Plan 含不超过 200 个 Node 与 400 条 Edge，THE Workbench SHALL 在该操作完成后 500 毫秒内显示 Schema_Validator 与 Graph_Validator 对最近一次操作后的当前 (Scenario, Plan) 返回的全部 Validation_Issue。
6. WHILE Canvas_Mode 为 Build，THE Workbench SHALL 在每个画布节点上分别显示相关实体 ID 列表包含该 Node ID 的 error 级与 warning 级 Validation_Issue 数量，以不同图标区分 error 与 warning，两者均为 0 时不显示标记，并在处于折叠状态的 Subflow 节点上计入其全部直接与间接成员 Node 的 Validation_Issue（每条 Validation_Issue 只计一次）。
7. IF 用户对第 4 条的确认请求选择取消或关闭该请求，THEN THE Workbench SHALL 放弃该修改，使当前 Scenario 与修改前深度相等，不记录可撤销操作，并保持所有 Run_Result 的 Stale_Result 状态不变。
8. WHEN 用户在 Build 模式撤销或重做一个操作，THE Workbench SHALL 不请求确认，并使该操作涉及的 Plan 与 Scenario 在撤销后与该操作执行前深度相等、在重做后与该操作执行后深度相等。

### Requirement 3: Rehearse 模式

**User Story:** 作为活动组织者，我希望在搭建流程的同一张画布上运行预演，以便直接看到排队和资源状态。

#### Acceptance Criteria

1. WHEN 用户触发运行入口，或在当前 Plan 没有状态为 succeeded 或 aborted 且不属于 Stale_Result 的 Run_Result 时通过 Canvas_Mode 切换选择 Rehearse（二者统称“请求运行”），且 Schema_Validator 与 Graph_Validator 对当前 (Scenario, Plan) 未返回 severity 为 error 的 Validation_Issue（severity 为 warning 的 Validation_Issue 不阻止运行），THE Workbench SHALL 向 Simulation_Engine 提交当前 Run_Request，并在收到状态为 succeeded 的 Run_Result 后于同一画布进入 Rehearse 模式，从回放时刻 0 起以 1× 速度自动播放该 Run_Result。
2. IF 请求运行时 Schema_Validator 或 Graph_Validator 对当前 (Scenario, Plan) 返回至少一条 severity 为 error 的 Validation_Issue，或 Simulation_Engine 返回状态为 failed 的 Run_Result，THEN THE Workbench SHALL 使画布处于 Build 模式，列出全部 error 级 Validation_Issue（Run_Result 为 failed 时列出其运行问题列表中的全部条目），并保留当前 Plan 已有的 Run_Result 不变。
3. WHILE Canvas_Mode 为 Rehearse，THE Workbench SHALL 仅允许修改 Layout_Field，按 Requirement 2 第 3 条的规则把这些修改记录为可撤销、可重做的操作，并将 Simulation_Relevant_Field 以及显示名称、描述和备注显示为只读。
4. WHILE Canvas_Mode 为 Rehearse，THE Workbench SHALL 在每个 Service 节点上显示回放时刻 t 的排队人数、受阻人数、服务中人数和开放状态（开放或关闭），在每个 Waiting Area 节点上显示回放时刻 t 的等候放行人数和受阻人数，各数值由 Event_Log 中时刻不晚于 t 的全部 Simulation_Event 推导。
5. WHILE Canvas_Mode 为 Rehearse，THE Workbench SHALL 将每个 Resource_Unit 在回放时刻 t 显示为忙碌、空闲、未排岗、交接中、不可用、离岗六种状态中的恰好一种：该 Resource_Unit 处于已记录 SERVICE_START 且尚未记录 SERVICE_COMPLETE 的服务中（含加班期间）为忙碌；否则取该 Resource_Unit 时刻不晚于 t 的最近一条 RESOURCE_CHANGE 事件的新状态，不存在此类事件时取 Requirement 30 第 9 条规定的时刻 0 处理前状态；所取状态为可用时，t 满足 Requirement 38 第 6 条的未排岗条件（该 Resource_Unit 有 Assignment，且 t 不在其任何 Assignment 时间段内或所在时间段的可服务 Node ID 列表为空）则显示为未排岗，否则显示为空闲；所取状态为交接中、不可用或离岗时按该状态显示。
6. WHILE Canvas_Mode 为 Rehearse，THE Workbench SHALL 以位置、动作与图标的组合表达每个显示的幽灵所对应 Participant 在回放时刻 t 的状态，状态取值为转移中、排队中、受阻、等候放行、服务中（口径与 Requirement 34 第 4 条一致）或已结束（已记录 VISITOR_COMPLETE 或 VISITOR_LEAVE），且在灰度显示下任意两种状态至少在位置、动作或图标之一上不同。
7. WHILE Canvas_Mode 为 Rehearse，THE Workbench SHALL 支持暂停、继续、在 0.5×、1×、2×、4×、8× 五档之间切换播放速度，以及把时间轴定位到 [0, T_end] 内的任意时刻；k× 档下每 1 秒墙钟时间回放时刻前进 Workbench_Spec 规定的 1× 基准秒数的 k 倍；T_end 取该 Run_Result 的 Run_Metadata 中的覆盖结束时刻（Requirement 31 第 11 条）。
8. WHEN 用户在 Rehearse 模式请求编辑 Simulation_Relevant_Field、显示名称、描述或备注，THE Workbench SHALL 暂停回放并在同一画布切换到 Build 模式，保留当前视口、选中对象和 Run_Result，且切换本身不修改任何字段。
9. WHEN 用户选中第 2 条所列的一条 Validation_Issue，THE Workbench SHALL 选中该条目实体 ID 列表中的全部 Node、Edge 与 Resource_Unit，调整视口使其中的 Node 与 Edge 全部位于画布可见范围内，并在右侧属性面板显示该条目 path 所指的字段。
10. IF Simulation_Engine 对请求运行返回状态为 aborted 的 Run_Result，THEN THE Workbench SHALL 在同一画布进入 Rehearse 模式，从回放时刻 0 起以 1× 速度自动播放其已生成的 Event_Log，并在底部仿真面板标注该 Run_Result 不完整且无 Statistics。
11. WHEN 用户通过 Canvas_Mode 切换选择 Rehearse 且当前 Plan 存在状态为 succeeded 或 aborted 且不属于 Stale_Result 的 Run_Result，THE Workbench SHALL 不提交新的 Run_Request，并在同一画布以 Rehearse 模式从回放时刻 0 起以 1× 速度自动播放其中创建时刻最晚的一个。

### Requirement 4: Compare 模式

**User Story:** 作为活动组织者，我希望让同一批参与者分别经历两个方案，以便直观比较两种安排的效果。

#### Acceptance Criteria

1. WHEN 用户依次选择两个 Plan 请求比较，且两个 Plan 引用同一 Scenario、均具有状态为 succeeded 且不是 Stale_Result 的 Run_Result、第 2 条所列项目全部一致，THE Workbench SHALL 进入 Compare 模式，在中央画布左半部分显示先选择的 Plan（方案 A），在右半部分显示后选择的 Plan（方案 B）。
2. IF 用户请求比较的两个 Plan 是同一个 Plan、两个 Plan 引用不同 Scenario，或两个用于比较的 Run_Result 的 Scenario_Fingerprint、Model_Version 或 Run_Mode 不一致，THEN THE Workbench SHALL 拒绝进入 Compare 模式，保持当前 Canvas_Mode 不变，并列出每个重复或不一致的项目（Plan ID、Scenario ID、Scenario_Fingerprint、Model_Version 或 Run_Mode）在方案 A 与方案 B 中的取值。
3. WHEN 用户请求比较两个 Plan，且至少一个 Plan 没有状态为 succeeded 且不是 Stale_Result 的 Run_Result，且两个 (Scenario, Plan) 组合均不存在 severity 为 error 的 Validation_Issue，THE Workbench SHALL 以该 Plan 当前的 Run_Request 为每个缺少此类 Run_Result 的 Plan 运行仿真，并在全部运行结束后按第 1、2、12 条判定是否进入 Compare 模式。
4. WHILE Canvas_Mode 为 Compare，THE Workbench SHALL 以同一个回放时钟驱动两侧回放：时间轴范围为两个 Run_Result 各自覆盖时间范围 [0, 覆盖结束时刻]（Requirement 31 第 11 条）的并集，两侧始终显示同一回放时刻的画面状态，暂停、继续、播放速度切换（0.5×、1×、2×、4×、8×）和时间轴定位同时作用于两侧。
5. WHILE Canvas_Mode 为 Compare，THE Workbench SHALL 在两侧以两类可相互区分的差异标记标出 Node、Edge、Staff、Device_Type 和 Assignment：第一类标出 ID 在两个 Plan 中都存在但至少一个 Simulation_Relevant_Field 取值不同的对象，第二类标出 ID 只存在于其中一个 Plan 的对象；Assignment 以所属 Resource_Unit ID 配对；只在 Layout_Field、显示名称、描述或备注上不同的对象不加差异标记。
6. WHILE Canvas_Mode 为 Compare，THE Workbench SHALL 将方案 A、方案 B 及二者所引用 Scenario 的 Simulation_Relevant_Field、显示名称、描述和备注显示为只读，仅允许修改 Layout_Field（含画布级视口），并按 Requirement 2 第 3 条的规则记录这些修改：视口以外的 Layout_Field 修改记录为可撤销、可重做的操作，视口的缩放与平移不记录为操作。
7. WHEN 用户在 Compare 模式中于任一侧选中一个 Participant，THE Workbench SHALL 在两侧同时高亮该 Participant ID 对应的幽灵；若某侧在当前回放时刻未显示该 Participant 的幽灵，则在该侧标注该 Participant 在当前回放时刻尚未到达、已结束，或所在的 Node 或 Edge。
8. WHEN 用户在 Compare 模式中已选中一个 Participant 并请求跳转到差异点，THE Workbench SHALL 将回放时钟定位到该 Participant 的 First_Divergence 时刻（两侧事件 time 中的较早者，只有一侧在该位置有事件时取该事件的 time），并在该位置有 Simulation_Event 的每一侧选中该事件所在的 Node。
9. WHEN 用户在 Compare 模式中选中一侧的 Node，THE Workbench SHALL 在另一侧高亮按 Node_Correspondence 规则（Requirement 23 第 2 条）与该 Node 对应的全部 Node。
10. IF 用户在 Compare 模式中选中的 Node 按 Node_Correspondence 规则在另一侧没有对应 Node，THEN THE Workbench SHALL 在该 Node 上标注“仅存在于方案 A”（该 Node 位于左侧时）或“仅存在于方案 B”（该 Node 位于右侧时），且不在另一侧高亮任何 Node。
11. WHEN 用户在 Compare 模式中请求编辑，THE Workbench SHALL 要求用户选择方案 A 或方案 B，在用户选定后退出 Compare 模式并以所选 Plan 进入单画布 Build 模式；用户取消选择时保持 Compare 模式不变。
12. IF 方案 A 或方案 B 的 (Scenario, Plan) 组合存在 severity 为 error 的 Validation_Issue，或用于比较的任一 Run_Result 状态为 failed 或 aborted，THEN THE Workbench SHALL 拒绝进入 Compare 模式，保持当前 Canvas_Mode 不变，并按方案 A、方案 B 分别列出 error 级 Validation_Issue，或该 Run_Result 的状态与运行问题列表。
13. WHEN 用户在 Compare 模式中选中一个 Participant，THE Workbench SHALL 在底部仿真面板并列显示该 Participant 在方案 A 与方案 B 的 Run_Result 中的个人时间线、各 Node 的 Waiting_Time 分项和完成时刻差；两侧 Participant_Outcome 均为 completed 时，完成时刻差等于方案 B 完成时刻减方案 A 完成时刻（单位秒，负值表示方案 B 更早完成），否则以两侧的 Participant_Outcome 代替完成时刻差。
14. IF 用户在 Compare 模式中请求跳转到差异点时未选中 Participant，或所选 Participant 在两个 Run_Result 中不存在 First_Divergence，THEN THE Workbench SHALL 保持回放时钟与当前选中对象不变，并显示说明原因的提示。

### Requirement 5: 运行结果过期判定

**User Story:** 作为活动组织者，我希望修改参数后旧结果被明确标记，以便不会把过期结论当作当前结论。

#### Acceptance Criteria

1. THE Fingerprint_Function SHALL 以一个 Run_Request 和一个 Model_Version 作为输入，将以下内容作为 Input_Fingerprint 的 Simulation_Relevant_Field：Run_Request 中的 Scenario、Subflow_Flattener 对 Run_Request 中 Plan 的输出、补全默认值后的 Run_Mode、Max_Steps 与 maxEvents，以及 Model_Version；Scenario 与展开后 Plan 的全部字段均计入，但不含 Layout_Field、显示名称、描述、备注、显示用起始钟点、来源 Plan ID、来源 Scenario ID，以及 Provenance 的来源说明与备注（Provenance 的 kind 计入）；Run_Request 的 Schema_Version 不计入。
2. FOR ALL Scenario 的 Simulation_Relevant_Field 相同且 Model_Version 相同的两组输入，THE Fingerprint_Function SHALL 返回相同的 Scenario_Fingerprint，即使二者的 Plan、Run_Mode、Max_Steps 或 maxEvents 不同。
3. THE Fingerprint_Function SHALL 按 Document_Codec 的规范化格式（Requirement 42 第 2 条与第 12 条，缺省字段按默认值显式写出）分别序列化第 1 条所列的 Input_Fingerprint 内容与 Scenario_Fingerprint 内容（Scenario 的 Simulation_Relevant_Field 与 Model_Version），作为二者的规范化序列化文本，并以该文本 UTF-8 编码的 SHA-256 摘要作为指纹，表示为 64 个小写十六进制字符。
4. FOR ALL 仅在 Layout_Field、显示名称、描述或备注上不同的两个 Run_Request，THE Fingerprint_Function SHALL 返回相同的 Input_Fingerprint 和相同的 Scenario_Fingerprint。
5. FOR ALL 仅在对象键顺序、Requirement 42 第 2 条所列无序集合的元素顺序，或已声明默认值的字段是缺省还是显式写为默认值这几方面不同的两个 Run_Request，THE Fingerprint_Function SHALL 返回相同的 Input_Fingerprint 和相同的 Scenario_Fingerprint。
6. FOR ALL 至少一个 Input_Fingerprint 的 Simulation_Relevant_Field 不同的两组输入，THE Fingerprint_Function SHALL 为二者生成不同的 Input_Fingerprint 规范化序列化文本。
7. FOR ALL Scenario 中至少一个 Simulation_Relevant_Field 不同或 Model_Version 不同的两组输入，THE Fingerprint_Function SHALL 为二者生成不同的 Scenario_Fingerprint 规范化序列化文本。
8. WHILE 某个 Run_Result 记录的 Input_Fingerprint 与其所属 Plan 的当前 Input_Fingerprint（由该 Plan 及其引用 Scenario 的当前内容、此刻运行该 Plan 将使用的 Run_Mode、Max_Steps 与 maxEvents，以及当前 Simulation_Engine 的 Model_Version 计算）不同，THE Workbench SHALL 将该 Run_Result 视为 Stale_Result，并在底部仿真面板、右侧属性面板的运行指标区域和回放该 Run_Result 的画布上各显示一个“已过期”标注，对不超过 200 个 Node 的 Plan 须在导致二者不同的修改生效后 500 毫秒内显示。
9. WHILE 某个 Run_Result 记录的 Input_Fingerprint 与其所属 Plan 的当前 Input_Fingerprint 相同（包括撤销修改后恢复相同的情形），THE Workbench SHALL 不为该 Run_Result 显示“已过期”标注，对不超过 200 个 Node 的 Plan 须在恢复相同后 500 毫秒内移除已显示的标注。
10. THE Workbench SHALL 保持每个 Stale_Result 的 Run_Metadata、Event_Log 和 Statistics 不变并允许用户查看和回放，直到用户删除该 Run_Result，或同一 Plan 的新一次运行返回状态为 succeeded 的 Run_Result 并替换它。
11. WHILE 一个 Comparison 中方案 A 或方案 B 的 Run_Result 为 Stale_Result，THE Workbench SHALL 在 Compare 模式中将该 Comparison 标注为“已过期”，并指明过期的是方案 A、方案 B 还是两者的 Run_Result。

### Requirement 6: 标识符、时间单位与版本

**User Story:** 作为开发者，我希望所有实体使用稳定标识和统一时间单位，以便跨方案对应、复现和导入导出都可靠。

#### Acceptance Criteria

1. THE Schema_Module SHALL 要求每个 Scenario、Plan、Node、Edge、Staff、Device_Type、Skill、Participant_Attribute 和 Arrival_Stream 具有字符串 ID，并在以下唯一性范围内保证同类实体 ID 互不相同：Scenario 与 Plan 在同一 Project_Document 内；Node、Edge、Staff、Device_Type 与 Skill 在同一 Plan 内；Participant_Attribute 与 Arrival_Stream 在同一 Scenario 内；不同 Plan 或不同 Scenario 中的同类实体，以及同一范围内的不同类实体，允许使用相同 ID；Assignment 不另设 ID，以其 Resource_Unit ID 标识，该 Resource_Unit ID 在同一 Plan 的 Assignment 列表内互不相同（Requirement 25 第 10 条）。
2. IF 第 1 条所列任一实体的 ID 长度不在 1 至 64 个字符之间、首字符不是 ASCII 小写字母 a–z，或其余任一字符不是 ASCII 小写字母 a–z、数字 0–9、连字符（-）或下划线（_），THEN THE Schema_Validator SHALL 返回 severity 为 error 的 Validation_Issue，并在 path 中指向该 ID 字段。
3. THE Schema_Module SHALL 为数量为 n 的 Device_Type 确定性派生 n 个 Resource_Unit ID（n 为 0 时不派生），第 k 个（k = 1 … n）由该 Device_Type ID、一个不属于第 2 条字符集的固定非空白 ASCII 可打印分隔字符和不带前导零的十进制 k 依次拼接而成，使任一派生 ID 都不等于任一 Staff ID。
4. THE Schema_Module SHALL 以数值类型的秒数（允许小数）表示所有持续时间，以相对 T0 的数值类型秒数表示所有时间点；唯一例外是 Scenario 中可选的显示用起始钟点，其取值为 00:00 至 23:59 的 24 小时制“两位小时:两位分钟”字符串，且不作为仿真时间输入。
5. IF 任一时间点或持续时间的值为负数、NaN、正无穷大或负无穷大，或显示用起始钟点不符合第 4 条规定的格式与取值范围，THEN THE Schema_Validator SHALL 为每个这样的字段返回一条 severity 为 error 的 Validation_Issue，并在 path 中指向该字段。
6. THE Simulation_Engine SHALL 在参与时间运算前，将 Run_Request 中每个时间点与持续时间的值、Base_Population 中每个到达时刻以及每个计算得到的持续时间各取整一次到整数毫秒：以秒计的值 x 取整后的毫秒数为 ⌊x × 1000 + 0.5⌋（乘法、加法与取下整均按 IEEE-754 双精度浮点运算求值），取整后的值为该毫秒数除以 1000；分布参数本身不取整，服务时长在分布抽样值乘以服务时长系数之后取整。
7. THE Schema_Module SHALL 要求 Project_Document 包含格式标识字段与 Schema_Version 字段，其中格式标识的值为 Schema_Module 定义的单一固定字符串常量，Schema_Version 的值为正整数，当前支持的 Schema_Version 为 1。
8. WHERE Scenario 设置了显示用起始钟点，THE Workbench SHALL 将仿真时刻 t 显示为起始钟点加上 ⌊t⌋ 秒后的 24 小时制 HH:MM:SS 钟点，并在结果达到或超过次日 00:00:00 时附加跨日天数标记（例如起始钟点 18:00、t = 25,200.9 时显示 01:00:00 和表示 1 天的跨日标记）。
9. FOR ALL 仅在显示用起始钟点上不同（包括一方未设置）的两个 Scenario，THE Fingerprint_Function SHALL 返回相同的 Scenario_Fingerprint，并为分别引用二者、其余内容相同的两个 Run_Request 返回相同的 Input_Fingerprint。
10. FOR ALL Run_Result，THE Simulation_Engine SHALL 使 Event_Log 中每个 Simulation_Event 的 time 等于某个非负整数毫秒数除以 1000，且连续经过的持续时间按整数毫秒相加（例如自时刻 0 起依次经过 0.1 秒与 0.2 秒两段持续时间后的 Simulation_Event time 等于 0.3）。
11. IF 第 1 条规定的同一唯一性范围内有两个或更多同类实体使用相同 ID，THEN THE Schema_Validator SHALL 对该 ID 的第二次及之后每次出现各返回一条 severity 为 error 的 Validation_Issue，path 指向该次出现的 ID 字段，相关实体 ID 列表包含该重复 ID。
12. THE Schema_Module SHALL 将本 Spec 各 Requirement 中“按 ID 升序”的比较定义为按 ASCII 码逐字符比较的字典序，一个 ID 是另一个 ID 的前缀时较短者在前（例如 staff-10 排在 staff-2 之前，staff 排在 staff-1 之前）。

### Requirement 7: 场景与方案分离

**User Story:** 作为活动组织者，我希望共享条件与方案专属配置明确分开，以便比较时两个方案面对相同的参与者和假设。

#### Acceptance Criteria

1. THE Schema_Module SHALL 在 Scenario 中定义以下必填字段：随机种子（0 至 2^32−1，即 4294967295，的整数）、Observation_Cutoff（大于 0 的秒数）、Horizon（不小于 Observation_Cutoff 的秒数）、Participant_Attribute 列表、Arrival_Stream 列表和 Assumption_Override 列表（三个列表均允许为空）；并在统计设置中定义可选的 Metric_Bucket 时长（大于 0 的秒数，缺失时取 900）和瓶颈阈值（不小于 1 的整数，缺失时取 1）。
2. THE Schema_Module SHALL 在 Plan 中定义必填的显示名称（规则同 Requirement 9 第 2 条的 Node 显示名称）、所引用 Scenario ID、Workflow_Graph、Skill 目录、Staff 列表、Device_Type 列表和 Assignment 列表，以及可选的画布级 Layout_Field 子对象（视口与画布视觉分组的成员关系）和可选的来源 Plan ID；来源 Plan ID 仅记录复制来源，不属于 Simulation_Relevant_Field，指向 Project_Document 中不存在的 Plan 时不产生 Validation_Issue。
3. IF Plan 中出现随机种子、Observation_Cutoff、Horizon、统计设置、Participant_Attribute、Arrival_Stream 或 Assumption_Override 的定义，或 Scenario 中出现 Node、Edge、Skill、Staff、Device_Type 或 Assignment 的定义，THEN THE Schema_Validator SHALL 返回 severity 为 error 的 Validation_Issue，并在 path 中指出该字段；按 ID 引用另一方的实体（例如 Entrance 节点引用 Arrival_Stream ID、Assumption_Override 引用 Device_Type ID）不属于定义。
4. IF Plan 引用的 Scenario ID 与传入 Graph_Validator 的 (Scenario, Plan) 组合中 Scenario 的 ID 不同，THEN THE Graph_Validator SHALL 返回 severity 为 error 的 Validation_Issue，其相关实体 ID 列表包含该 Plan ID，path 指向该 Plan 的 Scenario ID 字段。
5. FOR ALL 仅在 Plan 的 Simulation_Relevant_Field 上不同的两个 Run_Request，THE Fingerprint_Function SHALL 在相同 Model_Version 下返回相同的 Scenario_Fingerprint。
6. FOR ALL 仅在 Scenario 的一个或多个 Simulation_Relevant_Field 上不同、其余内容相同、且 Plan 引用该 Scenario 的两个 Run_Request，THE Fingerprint_Function SHALL 在相同 Model_Version 下返回不同的 Input_Fingerprint；此处 Scenario 的 Simulation_Relevant_Field 指第 1 条所列全部字段（含 Metric_Bucket 时长与瓶颈阈值），不含显示名称、描述、备注和显示用起始钟点。
7. IF Scenario 的随机种子不是 0 至 4294967295 之间的整数，或 Observation_Cutoff 或 Metric_Bucket 时长等于 0，或瓶颈阈值不是不小于 1 的整数，THEN THE Schema_Validator SHALL 返回 severity 为 error 的 Validation_Issue，并在 path 中指出该字段（负数、NaN 和无穷大的时间值按 Requirement 6 第 5 条处理）。
8. FOR ALL 含有引用同一 Scenario 的 Plan P1 与 P2 的 Project_Document，THE Fingerprint_Function SHALL 在修改 P1 的任一 Simulation_Relevant_Field 前后，为由该 Scenario 与 P2 组成、其余内容相同的 Run_Request 返回相同的 Input_Fingerprint。
9. FOR ALL 仅在一个或多个 Simulation_Relevant_Field 上不同的两个 Scenario，THE Fingerprint_Function SHALL 在相同 Model_Version 下返回不同的 Scenario_Fingerprint。
10. IF Project_Document 中某个 Plan 引用的 Scenario ID 不是该 Project_Document 中任一 Scenario 的 ID，THEN THE Schema_Validator SHALL 在校验该 Project_Document 时（包括 Document_Codec 按 Requirement 42 第 1 条执行的校验）为每个这样的 Plan 返回一条 severity 为 error 的 Validation_Issue，其相关实体 ID 列表包含该 Plan ID 与所引用的 Scenario ID，path 指向该 Plan 的 Scenario ID 字段。

### Requirement 8: 方案复制

**User Story:** 作为活动组织者，我希望从当前方案创建副本再修改，以便副本修改不会影响原方案，且两个方案的节点可以对应。

#### Acceptance Criteria

1. WHEN Plan_Duplicator 接收一个通过 Schema_Validator 校验（无 severity 为 error 的 Validation_Issue）的 Plan（无论 Graph_Validator 是否对其返回 Validation_Issue）及 Project_Document 中已有 Plan ID 的集合，THE Plan_Duplicator SHALL 返回一个副本，其 Plan ID 符合 Requirement 6 第 2 条的 ID 格式（包括被复制 Plan 的 ID 长度为 64 个字符时）、不等于被复制 Plan 的 ID 和该集合中的任一 Plan ID，且对相同输入始终相同。
2. WHEN Plan_Duplicator 返回副本，THE Plan_Duplicator SHALL 将副本的来源 Plan ID 设为被复制 Plan 的 Plan ID，不沿用被复制 Plan 自身已有的来源 Plan ID。
3. WHEN Plan_Duplicator 返回副本，THE Plan_Duplicator SHALL 将副本的显示名称设为被复制 Plan 的显示名称加上一个含至少 1 个非空白字符的后缀，且该后缀对所有输入相同；拼接结果超过 Requirement 7 第 2 条规定的 100 个 Unicode 码点时，先从被复制 Plan 的显示名称末尾删去最少数量的码点，使拼接结果恰为 100 个码点。
4. FOR ALL 通过 Schema_Validator 校验的 Plan，THE Plan_Duplicator SHALL 返回除 Plan ID、来源 Plan ID 和显示名称外与原 Plan 深度相等的副本：不增删可选字段，不改变任何列表的元素顺序，不展开 Subflow 节点（保留其成员 Node ID 列表），并保留所引用的 Scenario ID、全部 Node ID、Edge ID、Staff ID、Device_Type ID、Skill ID、Stage_Key、Decision_Key、branchKey、Assignment、Layout_Field、描述、备注和 Provenance。
5. FOR ALL 通过 Schema_Validator 校验的 Plan，THE Plan_Duplicator SHALL 返回不与原 Plan 共享任何对象或数组引用的副本，使调用 Plan_Duplicator 后以及修改副本的任一字段后，原 Plan 均与调用前深度相等。
6. FOR ALL 通过 Schema_Validator 校验的 Plan 及其引用的 Scenario（包括 Graph_Validator 对其返回 error 或 warning 的 Plan），THE Graph_Validator SHALL 对 (Scenario, 副本) 与 (Scenario, 原 Plan) 返回条数和顺序相同的 Validation_Issue 列表，且逐条比较的 code、severity、path 和相关实体 ID 列表相同（相关实体 ID 列表中副本 Plan ID 与原 Plan ID 视为相同）。
7. IF 输入的 Plan 存在 Schema_Validator 返回的 severity 为 error 的 Validation_Issue，THEN THE Plan_Duplicator SHALL 不返回副本，而返回这些 Validation_Issue，并使输入 Plan 与调用前深度相等。

### Requirement 9: 节点通用结构

**User Story:** 作为开发者，我希望所有节点采用统一的数据结构，以便编辑器、校验器和引擎使用同一份定义。

#### Acceptance Criteria

1. THE Schema_Module SHALL 以按 type 字段区分的联合类型定义 Node；在 Schema_Version 1 中，type 的取值集合恰为 entrance、service、decision、waiting_area、merge、exit、subflow 七个区分大小写的字符串。
2. THE Schema_Module SHALL 为每个 Node 定义以下字段：id（遵循 Requirement 6 的 ID 规则）、type、显示名称（必填，长度 1 至 100 个 Unicode 码点，至少含 1 个非空白字符，在同一 Plan 内不要求唯一）、可选描述（长度 0 至 1000 个 Unicode 码点）、存放 Layout_Field 的子对象，以及 Requirement 10 至 17 为该 type 定义的专属参数。
3. THE Schema_Module SHALL 将 Node 的全部 Layout_Field 放在该 Node 的一个独立子对象中，该子对象包含坐标（两个有限数，可为负）、可选尺寸（两个大于 0 的有限数）和可选折叠状态（布尔值），且不包含任何 Simulation_Relevant_Field、显示名称或描述。
4. IF Node 的某个字段缺少必填值（已声明默认值的参数缺省时不算缺少）、类型不符，或取值超出 Requirement 6、Requirement 10 至 17 及本需求规定的范围（包括枚举值不在定义的取值集合内），THEN THE Schema_Validator SHALL 为每个此类字段各返回一条 severity 为 error 的 Validation_Issue，其 path 为从被校验对象根部到该字段的完整路径（数组元素以下标表示），相关实体 ID 列表包含该 Node 的 id（id 缺失或不是字符串时为空列表）。
5. FOR ALL 在当前 Schema_Module 下不产生 error 级 Validation_Issue 的 Scenario 或 Plan，THE Schema_Validator SHALL 在 Node type、分布 kind 或策略类型（Full_Policy、Close_Policy、排队规则）的取值集合新增一个成员且不修改已有成员定义后，对该 Scenario 或 Plan 返回与新增前相同的 Validation_Issue 列表。
6. IF Node 列表中的某个元素不是对象、缺少 type 字段，或 type 值不在本需求第 1 条的取值集合内（包括仅大小写不同的写法），THEN THE Schema_Validator SHALL 返回一条 severity 为 error 的 Validation_Issue，其 path 指向该元素的 type 字段（元素不是对象时指向该元素本身），并且不为该元素返回其他 Validation_Issue。
7. IF Node 含有其 type 未定义的字段（包括仅属于其他 type 的专属参数），THEN THE Schema_Validator SHALL 为每个此类字段各返回一条 severity 为 error 的 Validation_Issue，path 指向该字段。

### Requirement 10: Entrance 节点

**User Story:** 作为活动组织者，我希望设置参与者从哪些入口进入，以便表达多入口活动。

#### Acceptance Criteria

1. THE Schema_Module SHALL 为 Entrance 节点定义必填的 Arrival_Stream ID 列表，列表至少包含 1 个元素，且元素互不重复。
2. WHEN Participant 的到达时刻到来，THE Simulation_Engine SHALL 记录一条 VISITOR_ARRIVAL 事件，其 time 为该 Participant 按 Requirement 6 第 6 条取整到毫秒后的到达时刻，participantId 为该 Participant 的 ID，nodeId 为绑定该 Participant 所属 Arrival_Stream 的 Entrance 节点 ID。
3. IF 在经 Subflow_Flattener 展开后的 Plan 中，绑定 Scenario 某个 Arrival_Stream 的 Entrance 节点数量为 0 或大于 1（该 Arrival_Stream 生成的 Participant 人数为 0 时同样适用），THEN THE Graph_Validator SHALL 为每个这样的 Arrival_Stream 返回一条 severity 为 error 的 Validation_Issue，其相关实体 ID 包含该 Arrival_Stream ID 以及绑定它的全部 Entrance 节点 ID。
4. IF Entrance 节点的 Arrival_Stream ID 列表中某个元素在该 Plan 所引用的 Scenario 中不存在，THEN THE Graph_Validator SHALL 为每个这样的元素返回一条 severity 为 error 的 Validation_Issue，其相关实体 ID 包含该 Entrance 节点 ID 与该 Arrival_Stream ID，path 指出该元素在列表中的序号。
5. IF Entrance 节点缺少 Arrival_Stream ID 列表、列表为空或列表含重复的 Arrival_Stream ID，THEN THE Schema_Validator SHALL 返回 severity 为 error 的 Validation_Issue，path 指向该列表字段；含重复 ID 时 path 指出重复元素在列表中的序号。
6. WHEN Participant 在 Entrance 节点产生 VISITOR_ARRIVAL 事件，THE Simulation_Engine SHALL 在同一时刻让该 Participant 进入该 Entrance 节点唯一的出边并记录 ROUTE_TRANSITION 事件，使该 Participant 在 Entrance 节点的停留时长为 0 秒。
7. FOR ALL 状态为 succeeded 的 Run_Result，Event_Log SHALL 为取整后到达时刻不晚于 Observation_Cutoff 的每位 Participant 恰好包含 1 条 VISITOR_ARRIVAL 事件，为其余 Participant 至多包含 1 条，且每条 VISITOR_ARRIVAL 事件都是对应 Participant 的 Simulation_Event 中 seq 最小的一条。

### Requirement 11: Service 节点

**User Story:** 作为活动组织者，我希望配置每个服务环节的服务时长、资源需求、排队规则和开放时间，以便模拟真实服务窗口。

#### Acceptance Criteria

1. THE Schema_Module SHALL 为 Service 节点定义以下专属参数：Stage_Key（必填，格式与 Requirement 6 第 2 条的用户定义 ID 相同）、服务时长分布（必填，见 Requirement 12）、Resource_Requirement（必填，可为空列表）、排队规则（缺省为 fifo）、Queue_Capacity（不小于 1 的整数或 null，缺省为 null）、Full_Policy（缺省为 block）、Open_Window 列表（可为空）、Close_Policy（缺省值见 Requirement 29 第 4 条）、分配优先级（整数，缺省为 0）和可选的最大并发服务数（不小于 1 的整数）。
2. THE Schema_Module SHALL 以可扩展枚举表示排队规则，并在 Schema_Version 1 中只提供取值 fifo；其他取值按 Requirement 9 第 4 条视为超出取值范围。
3. WHEN 分配轮次（Requirement 27 第 4 条）在时刻 t 选中某个 Service 节点，THE Simulation_Engine SHALL 将该节点的队首 Participant 移出队列，并在时刻 t 为其记录 SERVICE_START 事件，事件的 resourceUnitIds 列出本次占用的全部 Resource_Unit ID（Resource_Requirement 为空时为空列表）。
4. FOR ALL Run_Result 与 Service 节点，该节点按 seq 排列的 SERVICE_START 事件的 Participant 序列 SHALL 等于按 seq 排列的 QUEUE_ENTER 事件的 Participant 序列去掉以下记录后的结果：未开始服务即按 Close_Policy 的 redirect 或 dismiss 离开队列的记录，以及运行结束时仍在排队的记录；即排在后面的 Participant 不越过队首开始服务。
5. WHERE Service 节点设置了最大并发服务数 m，THE Simulation_Engine SHALL 使该节点任一时刻处于服务中（已记录 SERVICE_START、尚未记录 SERVICE_COMPLETE）的 Participant 不超过 m 人；Resource_Requirement 非空时，该上限与 Requirement 27 第 6 条的资源上限同时生效。
6. WHERE Service 节点的 Resource_Requirement 为空且未设置最大并发服务数，THE Simulation_Engine SHALL 不限制该节点的同时服务人数，使每位进入队列的 Participant 的 SERVICE_START 时刻等于其 QUEUE_ENTER 时刻（该时刻节点可开始服务，见第 10 条）或该时刻之后第一个 Open_Window 的 openAt（该时刻节点关闭）。
7. FOR ALL 状态为 succeeded 的 Run_Result 中时刻为 s 的 SERVICE_START 事件，THE Simulation_Engine SHALL 以非抢占方式执行服务：在时刻 s + d 为同一 Participant 与同一 Node 记录恰好一条 SERVICE_COMPLETE 事件，d 为按 Requirement 12 与 Requirement 33 第 2 条确定的服务时长，节点关闭、Unavailability_Window 开始、Shift 结束和 Assignment 时间段切换均不改变该时刻；s + d 晚于运行结束时刻时不记录。
8. IF Service 节点的 Open_Window 列表未按 openAt 严格升序排列，或某个 Open_Window 的 closeAt 不大于 openAt，或相邻两个 Open_Window 中前一个的 closeAt 大于后一个的 openAt，THEN THE Schema_Validator SHALL 返回 severity 为 error 的 Validation_Issue，并在 path 中指出违规的 Open_Window；前一个的 closeAt 等于后一个的 openAt 不视为重叠。
9. WHEN Participant 进入 Service 节点的队列（到达时未按 Full_Policy 受阻、改道或被拒绝，也未按 Close_Policy 的迟到者处理方式被拒绝或改送；或作为受阻 Participant 按 Requirement 28 第 3 条被放入），THE Simulation_Engine SHALL 在进入时刻记录 QUEUE_ENTER 事件并将该 Participant 置于队尾，即使该 Participant 可在同一时刻开始服务。
10. THE Simulation_Engine SHALL 仅在 Service 节点于时刻 t 可开始服务时把它作为分配轮次的候选节点；可开始服务指 Open_Window 列表为空、存在满足 openAt ≤ t < closeAt 的 Open_Window，或该节点处于 Close_Policy 排队者处理方式为 serve 的关闭后继续服务阶段（Requirement 29 第 5 条）。

### Requirement 12: 服务时长分布

**User Story:** 作为活动组织者，我希望用常见分布描述服务时长并能查看这些假设，以便表达服务时长的波动。

#### Acceptance Criteria

1. THE Schema_Module SHALL 以按 kind 区分的联合类型定义服务时长分布，kind 与参数为：fixed（值）、uniform（min、max）、triangular（min、mode、max）、empirical（样本列表），全部参数以秒为单位。
2. IF 服务时长分布的 kind 不在其 Project_Document 的 Schema_Version 所定义的取值内（Schema_Version 1 为 fixed、uniform、triangular、empirical），THEN THE Schema_Validator SHALL 返回 severity 为 error 的 Validation_Issue，并在 path 中指出 kind 字段。
3. IF fixed 分布的值小于 0，或 uniform 分布不满足 0 ≤ min ≤ max，或 triangular 分布不满足 0 ≤ min ≤ mode ≤ max，或 empirical 分布的样本列表为空、多于 10 000 个样本或含负值样本，THEN THE Schema_Validator SHALL 返回 severity 为 error 的 Validation_Issue，path 指向该分布对象；负值样本按每个样本各返回一条，path 指向该样本。
4. WHEN 一位 Participant 在 Service 节点开始服务，THE Simulation_Engine SHALL 取 Keyed_Draw（用途为 service，主体 ID 为该 Participant 的 ID，键为该节点的 Stage_Key，Visit_Index 按 Requirement 22 计算）的值 u，并将服务时长定为 F⁻¹(u) 乘以 Requirement 33 中适用于该 Stage_Key 的服务时长系数（无适用系数时为 1）后按 Requirement 6 第 6 条取整到毫秒的值，其中 F⁻¹ 为该节点服务时长分布的逆累积分布函数。
5. WHERE 服务时长分布为 uniform，THE Simulation_Engine SHALL 取 F⁻¹(u) = min + u·(max − min)。
6. WHERE 服务时长分布为 triangular，THE Simulation_Engine SHALL 在 min = max 时取 F⁻¹(u) = min；在 min < max 时令 c = (mode − min)/(max − min)，u < c 时取 F⁻¹(u) = min + √(u·(max − min)·(mode − min))，u ≥ c 时取 F⁻¹(u) = max − √((1 − u)·(max − min)·(max − mode))。
7. WHERE 服务时长分布为 empirical，THE Simulation_Engine SHALL 将 n 个样本按数值升序排列为 x_1 … x_n（数值相同的样本均保留），并取 F⁻¹(u) = x_k，其中 k = ⌊u·n⌋ + 1。
8. WHEN 用户选中一个 Service 节点，THE Workbench SHALL 在右侧属性面板显示其服务时长分布的 kind、参数（empirical 分布至少显示样本数、最小样本值和最大样本值）、Provenance 和均值；均值按 fixed 取值、uniform 取 (min + max)/2、triangular 取 (min + mode + max)/3、empirical 取样本算术平均计算，不乘服务时长系数，以秒为单位四舍五入到 1 位小数。

### Requirement 13: Decision 节点与分流

**User Story:** 作为活动组织者，我希望按概率或参与者属性分流，以便让不同票种进入不同通道或让部分参与者跳过某些环节。

#### Acceptance Criteria

1. THE Schema_Module SHALL 为 Decision 节点定义以下专属参数：Decision_Key（必填，格式与 Requirement 6 第 2 条的用户定义 ID 相同）、路由模式（必填，取值为 probability 或 attribute）、有序的 Branch 列表（必填，含 1 至 50 个 Branch）和可选的 Loop_Guard（见 Requirement 20）；每个 Branch 含必填的 branchKey（格式与 Requirement 6 第 2 条的用户定义 ID 相同），probability 模式下另含必填的权重（非负有限数），attribute 模式下可含一个条件，条件由一个 Participant_Attribute ID 和非空的取值列表组成；attribute 模式下不含条件的 Branch 称为默认 Branch。
2. IF 路由模式为 probability 的 Decision 节点的全部 Branch 权重均为非负有限数，且按 Branch 声明顺序累加的权重之和与 1 的差的绝对值大于 1e-9，THEN THE Schema_Validator SHALL 返回一条 severity 为 error 的 Validation_Issue，其相关实体 ID 列表包含该 Decision 节点 ID，path 指向该节点的 Branch 列表；差的绝对值恰为 1e-9 时不返回；任一权重为负数、NaN 或无穷大时按 Requirement 9 第 4 条处理，且不做求和检查。
3. WHEN Participant 到达路由模式为 probability 的 Decision 节点，且未按 Requirement 20 第 3 条被送往 exitBranchKey 对应的 Branch，THE Simulation_Engine SHALL 取 Keyed_Draw（用途为 route，主体 ID 为该 Participant 的 ID，键为该节点的 Decision_Key，Visit_Index 按 Requirement 22 第 2 条计算）的值 u，按 Branch 声明顺序累加权重，选择第一个累计权重大于 u 的 Branch；若不存在此 Branch，则选择声明顺序中最后一个权重大于 0 的 Branch。
4. WHEN Participant 到达路由模式为 attribute 的 Decision 节点，且未按 Requirement 20 第 3 条被送往 exitBranchKey 对应的 Branch，THE Simulation_Engine SHALL 按声明顺序评估除默认 Branch 外每个 Branch 的条件，选择第一个条件成立的 Branch，没有条件成立时选择默认 Branch，且不取 Keyed_Draw；条件成立指该 Participant 在条件所引用的 Participant_Attribute 上的取值属于该条件的取值列表，该 Participant 没有该 Participant_Attribute 的取值时条件不成立。
5. IF 路由模式为 attribute 的 Decision 节点中默认 Branch 的数量为 0 或大于 1，THEN THE Schema_Validator SHALL 返回一条 severity 为 error 的 Validation_Issue，其相关实体 ID 列表包含该 Decision 节点 ID，path 指向该节点的 Branch 列表。
6. WHEN Participant 到达 Decision 节点，THE Simulation_Engine SHALL 在到达时刻为其记录恰好一条以该 Decision 节点为源的 ROUTE_TRANSITION 事件，事件的 edgeId 为 branchKey 等于所选 Branch 的出边 ID，使该 Participant 只进入一条出边，且在 Decision 节点的停留时长为 0 秒。
7. THE Simulation_Engine SHALL 在每条以 Decision 节点为源的 ROUTE_TRANSITION 事件的 details 中记录所选 branchKey、路由依据和所用 Keyed_Draw 值：按第 3 条选择时路由依据为 probability，按第 4 条选择时为 attribute，按 Requirement 20 第 3 条选择时为 loop_guard；路由依据为 probability 时 Keyed_Draw 值为第 3 条的 u，其余情况为 null。
8. IF 路由模式为 attribute 的 Decision 节点中某个条件引用的 Participant_Attribute ID 在该 Plan 所引用的 Scenario 中不存在，或该条件取值列表中的某个取值不属于所引用 Participant_Attribute 的取值集合，THEN THE Graph_Validator SHALL 为每个不存在的 Participant_Attribute ID 或不属于取值集合的取值各返回一条 severity 为 error 的 Validation_Issue，其相关实体 ID 列表包含该 Decision 节点 ID 与该 Participant_Attribute ID，path 指向该 ID 或该取值；Participant_Attribute ID 不存在时不再检查该条件的取值。
9. IF 同一 Decision 节点的 Branch 列表中有两个或更多 Branch 使用相同 branchKey，THEN THE Schema_Validator SHALL 对该 branchKey 的第二次及之后每次出现各返回一条 severity 为 error 的 Validation_Issue，path 指向该次出现的 branchKey 字段，相关实体 ID 列表包含该 Decision 节点 ID。
10. IF 路由模式为 probability 的 Decision 节点的某个 Branch 含条件，或路由模式为 attribute 的 Decision 节点的某个 Branch 含权重，THEN THE Schema_Validator SHALL 为每个这样的条件或权重字段各返回一条 severity 为 error 的 Validation_Issue，path 指向该字段，相关实体 ID 列表包含该 Decision 节点 ID。

### Requirement 14: Waiting Area 节点

**User Story:** 作为活动组织者，我希望设置候场区并按时间或批次放行，以便模拟定时开放或分批入场。

#### Acceptance Criteria

1. THE Schema_Module SHALL 为 Waiting Area 节点定义以下专属参数：Queue_Capacity（不小于 1 的整数或 null，缺省为 null）、Full_Policy（缺省为 block，取值见 Requirement 28 第 1 条）和必填的放行模式；放行模式恰为以下两种之一：until_time（必填 releaseAt，取值为时间点）或 batch（必填 batchSize，取值为不小于 1 的整数；可选 maxHoldSec，取值为大于 0 的持续时间）。
2. WHERE 放行模式为 until_time，THE Simulation_Engine SHALL 在时刻 max(releaseAt, 该 Participant 的 HOLD_ENTER 时刻) 的 Waiting Area 放行处理（Requirement 30 第 4 条类别 5）中放行每位进入该节点的 Participant，使 releaseAt 之前进入者在 releaseAt 放行、releaseAt 及之后进入者在进入时刻放行；同一时刻放行的多位 Participant 按 HOLD_ENTER 事件 seq 升序放行。
3. WHERE 放行模式为 batch，WHEN 时刻 t 的 Waiting Area 放行处理（Requirement 30 第 4 条类别 5）开始时等候人数不小于 batchSize，THE Simulation_Engine SHALL 在时刻 t 按 HOLD_ENTER 事件 seq 升序每次放行最早进入的 batchSize 名等候者，重复直到等候人数小于 batchSize，其余等候者继续等候。
4. WHERE 放行模式为 batch 且设置了 maxHoldSec，WHEN 时刻 t 按第 3 条完成批次放行后仍有等候者，且其中 HOLD_ENTER 事件 seq 最小者的 HOLD_ENTER 时刻加 maxHoldSec 等于 t，THE Simulation_Engine SHALL 在时刻 t 按 HOLD_ENTER 事件 seq 升序放行全部剩余等候者（包括在时刻 t 进入的 Participant），即使人数小于 batchSize。
5. WHEN Participant 进入 Waiting Area 节点（到达时未按 Full_Policy 受阻、改道或被拒绝；或作为受阻 Participant 按 Requirement 28 第 3 条被放入），THE Simulation_Engine SHALL 在进入时刻为该 Participant 与该 Node 记录一条 HOLD_ENTER 事件；受阻后被放入者的进入时刻为被放入的时刻，而非其到达时刻。
6. IF 放行模式为 batch、Queue_Capacity 不为 null 且 batchSize 大于 Queue_Capacity，THEN THE Schema_Validator SHALL 返回一条 severity 为 error 的 Validation_Issue，相关实体 ID 列表包含该 Waiting Area 节点的 id，path 指向 batchSize。
7. IF 放行模式为 batch、batchSize 大于 1 且未设置 maxHoldSec，THEN THE Schema_Validator SHALL 返回一条 severity 为 warning 的 Validation_Issue，相关实体 ID 列表包含该 Waiting Area 节点的 id，message 说明人数不足 batchSize 的等候者可能直到运行结束都无法放行，且该 Validation_Issue 不阻止运行。
8. WHEN Simulation_Engine 在时刻 t 放行 Waiting Area 节点中的一位 Participant，THE Simulation_Engine SHALL 在时刻 t 为该 Participant 与该 Node 记录一条 HOLD_RELEASE 事件，其 details 中的放行原因取 until_time（第 2 条）、batch_full（第 3 条）或 max_hold（第 4 条），并紧随该事件让该 Participant 进入该节点唯一的出边、记录 ROUTE_TRANSITION 事件。
9. IF Waiting Area 节点的放行模式含有该模式未定义的参数（例如 until_time 含 batchSize 或 maxHoldSec，batch 含 releaseAt），THEN THE Schema_Validator SHALL 为每个此类参数各返回一条 severity 为 error 的 Validation_Issue，path 指向该参数，相关实体 ID 列表包含该 Node 的 id。
10. THE Golden_Case_Suite SHALL 包含覆盖以下情形的 Golden_Case，并给出期望的 HOLD_ENTER 与 HOLD_RELEASE 事件序列：until_time 模式下分别在 releaseAt 之前、恰在 releaseAt 和 releaseAt 之后进入；batch 模式下同一时刻进入使等候人数超过 batchSize；batch 模式下 maxHoldSec 到期时放行不足一批的等候者；Full_Policy 为 block 的受阻 Participant 在放行腾出空位后被放入。

### Requirement 15: Merge 节点

**User Story:** 作为活动组织者，我希望把多条线路汇合到同一后续环节，以便表达多入口或多通道的汇流。

#### Acceptance Criteria

1. THE Schema_Module SHALL 为 Merge 节点定义唯一的专属参数：必填的入边优先级列表，其元素为 Edge ID，至少包含 1 个元素且互不重复，排在越前的 Edge 优先级越高；因此 Merge 节点不设 Queue_Capacity 与 Full_Policy。
2. WHEN Participant 在时刻 t 经某条入边到达 Merge 节点，THE Simulation_Engine SHALL 在同一时刻 t 让该 Participant 进入该 Merge 节点唯一的出边，并为其记录恰好一条 edgeId 为该出边 ID 的 ROUTE_TRANSITION 事件，使其在 Merge 节点的停留时长为 0 秒；该行为与其他入边上是否有正在转移的 Participant 无关，且 Merge 节点不为其记录 QUEUE_ENTER、QUEUE_BLOCKED、QUEUE_REROUTED、HOLD_ENTER 或 HOLD_RELEASE 事件。
3. WHEN 在同一时刻 t 有多位 Participant 经一条或多条入边到达同一 Merge 节点，且这些到达同时待处理，THE Simulation_Engine SHALL 先按所经入边在入边优先级列表中的位置（越靠前越先）处理，所经入边相同时再按 Participant ID 升序（Requirement 6 第 12 条）处理，使该 Merge 节点出边上这些时刻为 t 的 ROUTE_TRANSITION 事件按 seq 呈现同一顺序；按 Requirement 30 第 5 条在时刻 t 稍后才产生的到达，不排到已处理的到达之前。
4. IF Merge 节点的某条入边（目标 Node 为该 Merge 节点的 Edge）的 ID 未出现在该 Merge 节点的入边优先级列表中，THEN THE Graph_Validator SHALL 为每条这样的入边返回一条 severity 为 error 的 Validation_Issue，其相关实体 ID 包含该 Merge 节点 ID 与该 Edge ID，path 指向该入边优先级列表字段。
5. IF Merge 节点的入边优先级列表中某个元素不是该 Plan 中任一 Edge 的 ID，或所指 Edge 的目标 Node 不是该 Merge 节点，THEN THE Graph_Validator SHALL 为每个这样的元素返回一条 severity 为 error 的 Validation_Issue，其相关实体 ID 包含该 Merge 节点 ID 与该元素的值，path 指出该元素在列表中的序号。
6. IF Merge 节点的入边优先级列表为空或含重复的 Edge ID，THEN THE Schema_Validator SHALL 返回 severity 为 error 的 Validation_Issue：列表为空时返回一条，path 指向该列表字段；含重复 ID 时为第二次及之后的每次出现各返回一条，path 指出该元素在列表中的序号。
7. FOR ALL Run_Result 中在同一时刻离开同一 Merge 节点、又在同一时刻到达其出边目标 Node 的多位 Participant（该目标 Node 不是 Merge 节点；目标为 Merge 节点时按 Requirement 30 第 10 条排序），THE Simulation_Engine SHALL 按他们在该 Merge 节点出边上 ROUTE_TRANSITION 事件的 seq 顺序处理他们在目标 Node 的到达（例如目标为 Service 节点且这些 Participant 均进入队列时，QUEUE_ENTER 事件按同一顺序记录）。

### Requirement 16: Exit 节点

**User Story:** 作为活动组织者，我希望区分正常完成和中途离开的出口，以便统计真实完成人数。

#### Acceptance Criteria

1. THE Schema_Module SHALL 为 Exit 节点定义唯一的专属参数 countsAsCompleted，该参数为可选的布尔字段，缺省时取 true；字符串 "true"、数字 1 或 0 等非布尔取值按 Requirement 9 第 4 条视为类型不符。
2. WHEN Participant 到达 countsAsCompleted 为 true（含缺省）的 Exit 节点（经 Edge 转移时长结束到达，或经 Full_Policy 的 reroute、Close_Policy 的 redirect 或迟到者改送到达），THE Simulation_Engine SHALL 在该到达时刻记录一条 participantId 为该 Participant ID、nodeId 为该 Exit 节点 ID 的 VISITOR_COMPLETE 事件，并将该 Participant 的 Participant_Outcome 设为 completed；该次到达使 Node 到达总次数超过 Max_Steps 时改按 Requirement 20 第 7 条处理，不记录 VISITOR_COMPLETE 事件。
3. WHEN Participant 到达 countsAsCompleted 为 false 的 Exit 节点（到达方式同第 2 条），THE Simulation_Engine SHALL 在该到达时刻记录一条 participantId 为该 Participant ID、nodeId 为该 Exit 节点 ID、details 中 Participant_Outcome 为 diverted 且离开原因为 exit_diverted 的 VISITOR_LEAVE 事件，并将该 Participant 的 Participant_Outcome 设为 diverted；该次到达使 Node 到达总次数超过 Max_Steps 时改按 Requirement 20 第 7 条处理。
4. THE Schema_Validator 与 Graph_Validator SHALL 不因 Plan 含 2 个或更多 Exit 节点（无论这些 Exit 节点的 countsAsCompleted 取值是否相同）而返回任何 Validation_Issue。
5. FOR ALL Run_Result 中 nodeId 为 Exit 节点的 VISITOR_COMPLETE 或 VISITOR_LEAVE 事件，该事件 SHALL 是对应 Participant 的 Simulation_Event（RUN_WARNING 除外）中 seq 最大的一条，且该 Participant 在 Event_Log 中只有这一条 VISITOR_COMPLETE 或 VISITOR_LEAVE 事件。
6. IF 经 Subflow_Flattener 展开后的 Plan 含至少 1 个 Exit 节点，且全部 Exit 节点的 countsAsCompleted 均为 false，THEN THE Graph_Validator SHALL 返回一条 severity 为 warning 的 Validation_Issue，其相关实体 ID 列表包含全部 Exit 节点 ID，message 说明该 Plan 的 completed 人数恒为 0，且该 Validation_Issue 不阻止运行。
7. THE Golden_Case_Suite SHALL 包含至少 1 个 Golden_Case，其 Plan 含 countsAsCompleted 为 true 与 false 的 Exit 节点各至少 1 个，且每类 Exit 节点至少有 1 位 Participant 到达；期望值包含这些 Participant 的 VISITOR_COMPLETE 与 VISITOR_LEAVE 事件、completed 与 diverted 人数，以及只计 VISITOR_COMPLETE 事件的系统吞吐量（Requirement 37 第 1 条）。

### Requirement 17: Subflow 节点

**User Story:** 作为活动组织者，我希望把多个节点组合成子流程，以便整理复杂流程并复用常见组合。

#### Acceptance Criteria

1. THE Schema_Module SHALL 为 Subflow 节点定义必填的成员 Node ID 列表：列表允许为空，元素为同一 Plan 内的 Node ID（可以是其他 Subflow 节点的 ID），列表作为无序集合由 Document_Codec 按 Requirement 42 第 2 条以 ID 升序序列化；除 Requirement 9 第 2 条的通用字段外，Subflow 节点只有这一项专属参数。Subflow 节点 S 的直接成员指 S 的成员列表所列的 Node；间接成员指 S 的直接成员中各 Subflow 节点的直接成员或间接成员。
2. IF 在展开前的 Plan 中，任一 Edge 的源 Node ID 或目标 Node ID 为 Subflow 节点 ID，THEN THE Graph_Validator SHALL 为每个这样的 Edge 端点返回一条 severity 为 error 的 Validation_Issue，其 path 指向该 Edge 的源或目标 Node ID 字段，相关实体 ID 列表包含该 Edge ID 与该 Subflow 节点 ID，message 说明连线必须连接 Subflow 的成员节点；对同一端点不再返回 Requirement 18 第 7 条所述“引用不存在的 Node”的 Validation_Issue。
3. IF 在展开前的 Plan 中出现以下任一情况，THEN THE Graph_Validator SHALL 返回 severity 为 error 的 Validation_Issue：(a) 某个 Node 同时是两个或更多 Subflow 节点的直接成员时，为该 Node 返回一条，相关实体 ID 列表包含该 Node ID 以及按 ID 升序排列的全部直接包含它的 Subflow 节点 ID；(b) 一组 Subflow 节点两两之间相互直接或间接包含（含 Subflow 节点把自身 ID 列为成员）时，为每个不能再扩大的这样一组返回一条，相关实体 ID 列表按 ID 升序包含该组全部 Subflow 节点 ID；(c) 成员列表中的某个 Node ID 在该 Plan 中不存在时，为每个这样的元素返回一条，path 指向该元素在列表中的下标，相关实体 ID 列表包含该 Subflow 节点 ID 与该 Node ID。
4. WHEN Subflow_Flattener 接收一个通过 Schema_Validator 校验的 Plan（无论 Graph_Validator 是否对其返回 Validation_Issue，包括存在第 2、第 3 或第 8 条所述问题的 Plan），THE Subflow_Flattener SHALL 返回这样一个 Plan：其 Node 列表为输入 Node 列表删除全部 type 为 subflow 的元素后、其余元素保持原有相对顺序的结果，Edge 列表与其余全部字段与输入深度相等；并使输入 Plan 与调用前深度相等。
5. FOR ALL 通过 Schema_Validator 校验的 Plan，THE Subflow_Flattener SHALL 满足幂等性：对展开结果再次调用 Subflow_Flattener，返回与第一次展开结果深度相等的 Plan。
6. FOR ALL Run_Request，THE Simulation_Engine SHALL 以 Subflow_Flattener 对其 Plan 的输出作为仿真输入，使 Event_Log 中不出现 nodeId 为 Subflow 节点 ID 的 Simulation_Event，且生成的 Event_Log 与把该 Plan 替换为其展开结果、其余内容相同的 Run_Request 所生成的 Event_Log 相同。
7. IF Subflow 节点的成员 Node ID 列表含重复的 Node ID，THEN THE Schema_Validator SHALL 对该 ID 的第二次及之后每次出现各返回一条 severity 为 error 的 Validation_Issue，path 指向该元素在列表中的下标，相关实体 ID 列表包含该 Subflow 节点 ID 与重复的 Node ID。
8. IF 在展开前的 Plan 中，某个 Full_Policy 的 reroute 目标 Node ID、Close_Policy 排队者或迟到者处理方式的 redirect 目标 Node ID，或 Assignment 时间段可服务 Node ID 列表中的某个元素为 Subflow 节点 ID，THEN THE Graph_Validator SHALL 为每个这样的引用返回一条 severity 为 error 的 Validation_Issue，path 指向该引用字段（列表元素以下标表示），相关实体 ID 列表包含引用方的 Node ID 或 Resource_Unit ID 与该 Subflow 节点 ID，message 说明必须引用 Subflow 的成员节点；对同一引用不再返回 Requirement 19 第 6 条、Requirement 28 第 6 条或 Requirement 29 第 12 条所述“引用不存在的 Node”的 Validation_Issue。
9. FOR ALL 经 Subflow_Flattener 展开后深度相等的两个 Plan，THE Fingerprint_Function SHALL 为分别由同一 Scenario 与这两个 Plan 组成、其余内容相同的两个 Run_Request 返回相同的 Input_Fingerprint。

### Requirement 18: 连线与连接规则

**User Story:** 作为活动组织者，我希望连线规则明确，以便在搭建时就发现非法连接。

#### Acceptance Criteria

1. THE Schema_Module SHALL 为 Edge 定义以下字段：id（遵循 Requirement 6 的 ID 规则）、源 Node ID（必填）、目标 Node ID（必填）、branchKey（源为 Decision 节点时必填，源为其他类型 Node 时不得出现）和转移时长；转移时长为按 kind 区分的分布，kind 取 fixed（值）、uniform（min、max）或 triangular（min、mode、max），全部参数以秒为单位，字段缺省时按 fixed 0 处理。
2. WHEN Participant 在时刻 t 离开一个 Node 进入该 Node 的一条出边，THE Simulation_Engine SHALL 在时刻 t 记录一条 ROUTE_TRANSITION 事件，其 participantId 为该 Participant 的 ID，nodeId 为该 Edge 的源 Node ID，edgeId 为该 Edge 的 ID。
3. IF Entrance 节点的入边数量大于 0，或出边数量不等于 1，THEN THE Graph_Validator SHALL 对每个被违反的条件各返回一条 severity 为 error 的 Validation_Issue，其相关实体 ID 列表包含该 Node ID 以及该条件所计数的全部 Edge ID。
4. IF Service、Waiting Area 或 Merge 节点的入边数量为 0，或出边数量不等于 1，THEN THE Graph_Validator SHALL 对每个被违反的条件各返回一条 severity 为 error 的 Validation_Issue，其相关实体 ID 列表包含该 Node ID 以及该条件所计数的全部 Edge ID。
5. IF Decision 节点的入边数量为 0，或其 Branch 列表中某个 Branch 对应的出边（branchKey 等于该 Branch 的 branchKey 的出边）数量不等于 1，或某条出边缺少 branchKey 或其 branchKey 不属于该 Decision 节点的 Branch 列表，THEN THE Graph_Validator SHALL 对入边条件返回一条、对每个违规 Branch 和每条违规出边各返回一条 severity 为 error 的 Validation_Issue，其相关实体 ID 列表包含该 Node ID 以及所涉及的全部 Edge ID，违规出边对应的 Validation_Issue 的 path 指向该 Edge 的 branchKey 字段。
6. IF Exit 节点的入边数量为 0，或出边数量大于 0，THEN THE Graph_Validator SHALL 对每个被违反的条件各返回一条 severity 为 error 的 Validation_Issue，其相关实体 ID 列表包含该 Node ID 以及该条件所计数的全部 Edge ID。
7. IF Edge 的源 Node ID 与目标 Node ID 相同，或源 Node ID 或目标 Node ID 不在 Plan 的 Node 列表中（Subflow 节点视为存在），或源 Node 存在且不是 Decision 节点而该 Edge 含 branchKey，THEN THE Graph_Validator SHALL 对每项违规各返回一条 severity 为 error 的 Validation_Issue，其相关实体 ID 列表包含该 Edge ID，path 分别指向目标 Node ID 字段（源与目标相同时）、不存在的 Node ID 所在字段或 branchKey 字段；以 Subflow 节点为源或目标的 Edge 只按 Requirement 17 第 2 条报告，本条不为其返回 Validation_Issue。
8. FOR ALL 其余内容相同、所含 Plan 仅在 Layout_Field、显示名称、描述或备注上不同的两个 Run_Request，THE Simulation_Engine SHALL 生成条数、顺序以及每条 Simulation_Event 的全部字段（seq、time、type、participantId、nodeId、edgeId、resourceUnitIds、details）均相同的 Event_Log。
9. WHEN Participant 于时刻 t 进入一条 Edge，THE Simulation_Engine SHALL 使该 Participant 在该 ROUTE_TRANSITION 事件之后的下一条 Simulation_Event 的 time 等于 t + d、nodeId 等于该 Edge 的目标 Node ID；其中 d 的计算方式为：取 Keyed_Draw（用途为 transfer，主体 ID 为该 Participant 的 ID，键为该 Edge ID，Visit_Index 按 Requirement 22 第 2 条计算）的值 u，求转移时长分布的 F⁻¹(u)（fixed 取其值，uniform 与 triangular 按 Requirement 12 第 5、6 条，不乘服务时长系数），再按 Requirement 6 第 6 条取整到毫秒；t + d 晚于运行结束时刻时不记录该次到达。
10. IF Edge 的转移时长 kind 不是 fixed、uniform 或 triangular（包括 empirical），或其参数不满足 Requirement 12 第 3 条对同一 kind 的约束，THEN THE Schema_Validator SHALL 返回 severity 为 error 的 Validation_Issue，其相关实体 ID 列表包含该 Edge ID，path 在 kind 不合法时指向 kind 字段、在参数不合法时指向该分布对象。
11. THE Graph_Validator SHALL 在第 3 至第 6 条中按 Subflow_Flattener 展开后的 Plan 计数：某 Node 的入边为目标 Node ID 等于该 Node ID 的全部 Edge，出边为源 Node ID 等于该 Node ID 的全部 Edge；第 7 条所列的违规 Edge 同样计入，源与目标相同的 Edge 同时计为该 Node 的一条入边和一条出边。

### Requirement 19: 图结构校验

**User Story:** 作为活动组织者，我希望在运行前得到完整、可定位的错误列表，以便修正流程后再预演。

#### Acceptance Criteria

1. WHEN Graph_Validator 接收一个 (Scenario, Plan) 组合，THE Graph_Validator SHALL 对输入 Plan 执行 Requirement 7 第 4 条与 Requirement 17 第 2、3 条的检查，对 Subflow_Flattener 展开后的 Plan 执行本 Spec 分配给 Graph_Validator 的其余全部检查，并在一个列表中返回全部检查发现的 Validation_Issue，不在发现第一条 error 后停止，无问题时返回空列表。
2. IF 展开后 Plan 不含 Entrance 节点或不含 Exit 节点，THEN THE Graph_Validator SHALL 为缺少的每种节点各返回一条 severity 为 error 的 Validation_Issue（二者都缺少时共 2 条，Node 列表为空时同样适用），其相关实体 ID 列表包含该 Plan ID。
3. IF 展开后 Plan 含至少 1 个 Entrance 节点，且某个非 Entrance 的 Node 从任一 Entrance 节点出发均不可达（可达指沿展开后 Plan 的 Edge，以及 Full_Policy 为 reroute 或 Close_Policy 任一处理方式为 redirect 时由该节点指向目标 Node 的转移逐步到达，不考虑 Branch 权重、条件与 Loop_Guard），THEN THE Graph_Validator SHALL 为每个这样的 Node 返回一条 severity 为 warning 的 Validation_Issue，其相关实体 ID 列表包含该 Node ID；该 Validation_Issue 按 Requirement 3 第 1 条不阻止运行。
4. IF 展开后 Plan 含至少 1 个 Exit 节点，且某个 Node 可按第 3 条的可达定义从 Entrance 节点到达，但从该 Node 出发按同一定义无法到达任一 Exit 节点（countsAsCompleted 为 true 或 false 均计入），THEN THE Graph_Validator SHALL 为每个这样的 Node 返回一条 severity 为 error 的 Validation_Issue，其相关实体 ID 列表包含该 Node ID。
5. IF Service 节点 Resource_Requirement 中某个需求项的数量大于该 Plan 中同时满足以下两项的 Resource_Unit 数量：(a) 可满足该需求项，即 Staff 需求项为 Skill ID 列表含该 Skill 的 Staff，设备需求项为该 Device_Type 派生的全部 Resource_Unit；(b) 有资格服务该节点，即没有 Assignment，或至少一个 Assignment 时间段的 Node ID 列表含该节点，THEN THE Graph_Validator SHALL 为每个这样的需求项返回一条 severity 为 error 的 Validation_Issue，说明资源不足，相关实体 ID 列表包含该节点 ID 与该需求项的 Skill ID 或 Device_Type ID；该判断逐需求项独立进行，不考虑 Shift、Unavailability_Window、Handover 与 Assumption_Override，且不适用于第 6 条所述引用不存在的需求项。
6. IF Resource_Requirement 需求项的 Skill ID 或 Device_Type ID 在该 Plan 中不存在，Staff 的 Skill ID 列表含该 Plan 中不存在的 Skill ID，Assignment 的 Resource_Unit ID 既不是该 Plan 的 Staff ID 也不是其 Device_Type 派生的 Resource_Unit ID，或 Assignment 时间段的 Node ID 不是展开后 Plan 中某个 Service 节点的 ID（包括不存在的 ID 与 Subflow 节点 ID），THEN THE Graph_Validator SHALL 为每个这样的引用返回一条 severity 为 error 的 Validation_Issue，path 指向该引用，相关实体 ID 列表包含该引用的 ID 以及引用方的 Node ID、Staff ID 或（引用方为 Assignment 时）其 Resource_Unit ID。
7. IF Service 节点的 Resource_Requirement 非空、第 5 条与第 6 条均未对该节点返回 error，且在其每个 Open_Window [openAt, closeAt) 内（Open_Window 列表为空时视为 [0, Horizon)）都不存在这样的时刻 t：对每个需求项，满足第 5 条 (a)、t 位于其某个 Shift 内、t 不在其任何 Unavailability_Window 内、且没有 Assignment 或有一个包含 t 的 Assignment 时间段 [from, to)（未设 to 时无结束）列出该节点的 Resource_Unit 数量不小于该需求项数量，THEN THE Graph_Validator SHALL 为该节点返回一条 severity 为 warning 的 Validation_Issue，其相关实体 ID 列表包含该节点 ID；该判断不考虑 Handover 与 Assumption_Override。
8. FOR ALL 深度相等的两组 (Scenario, Plan) 输入，THE Graph_Validator SHALL 返回条数相同、顺序相同，且逐条 code、severity、message、相关实体 ID 列表（含元素顺序）与 path 均相同的 Validation_Issue 列表，与调用次数和此前的其他调用无关。
9. WHEN Repository 的自动化测试以同一个通过 Schema_Validator 校验、Plan 含 200 个 Node、400 条 Edge 和不超过 100 个 Resource_Unit 的 (Scenario, Plan) 组合连续调用 Graph_Validator 11 次，THE Graph_Validator SHALL 使第 2 至第 11 次调用的耗时中位数不超过 200 毫秒。
10. THE Graph_Validator SHALL 使每条 Validation_Issue 的 code 为由触发它的检查条件唯一决定的非空字符串（例如第 2 条中缺少 Entrance 与缺少 Exit 使用不同 code），message 为非空中文文本，path 以输入 Scenario 或输入 Plan 为根并可区分二者，且按输入中而非展开后 Plan 中的数组下标指向问题字段；问题不对应单个字段时，path 指向相关的 Node 或 Edge 对象，第 2 条的问题指向 Plan 的 Node 列表。
11. FOR ALL (Scenario, Plan) 输入，包括 Schema_Validator 对其返回 severity 为 error 的 Validation_Issue 的输入，THE Graph_Validator SHALL 返回 Validation_Issue 列表而不抛出异常，且调用后输入的 Scenario 与 Plan 与调用前深度相等。
12. IF 某条 Edge 以 Subflow 节点为源或目标，THEN THE Graph_Validator SHALL 只为该 Edge 返回 Requirement 17 第 2 条的 Validation_Issue，不为其返回 Requirement 18 第 7 条的 Validation_Issue，并在对展开后 Plan 执行的检查中忽略该 Edge。

### Requirement 20: 循环与终止

**User Story:** 作为活动组织者，我希望表达“复检”“重新排队”等重复流程，同时保证每位参与者都能结束流程。

#### Acceptance Criteria

1. THE Schema_Module SHALL 为 Loop_Guard 定义必填的 maxVisits（1 至 100 000 的整数）和必填的 exitBranchKey。
2. IF Loop_Guard 的 exitBranchKey 不等于所在 Decision 节点 Branch 列表中任一 Branch 的 branchKey，THEN THE Schema_Validator SHALL 返回 severity 为 error 的 Validation_Issue，其 path 指向该 exitBranchKey 字段，相关实体 ID 列表包含该 Decision 节点 ID。
3. WHEN Participant 到达带 Loop_Guard 的 Decision 节点，且该 Participant 在本次运行中到达该 Node 的累计次数（含本次；经 Edge、Requirement 28 的 Full_Policy reroute 或 Requirement 29 的 Close_Policy redirect 到达均各计 1 次）不小于 maxVisits，THE Simulation_Engine SHALL 不执行 Requirement 13 的路由规则且不抽取 Keyed_Draw，将该 Participant 送往 exitBranchKey 对应的 Branch，并在 ROUTE_TRANSITION 事件中记录所选 branchKey 为 exitBranchKey、路由依据为 loop_guard，且不含 Keyed_Draw 值。
4. THE Graph_Validator SHALL 按以下规则构造终止检查图：节点为 Subflow_Flattener 输出中的全部 Node；边为该输出中的全部 Edge，加上每个 Full_Policy 为 reroute 的 Node 指向其 reroute 目标 Node 的边，以及每个排队者或迟到者处理方式为 redirect 的 Service 节点指向对应目标 Node 的边（目标 Node 不存在时不加边）；再删除每个带 Loop_Guard 的 Decision 节点上 branchKey 不等于 exitBranchKey 的全部出边。
5. IF 终止检查图中存在强连通分量（一组两两相互可达且无法再加入其他 Node 的 Node 集合）含 2 个及以上 Node，或仅含 1 个带指向自身之边的 Node，THEN THE Graph_Validator SHALL 为每个这样的分量返回一条 code 为 unterminated_loop、severity 为 error 的 Validation_Issue，其相关实体 ID 列表按升序列出该分量的全部 Node ID，多条此类 Validation_Issue 按各自最小 Node ID 升序排列；分量从任一 Entrance 节点均不可达时同样返回。
6. THE Schema_Module SHALL 在 Run_Request 中定义 Max_Steps（1 至 100 000 的整数），Run_Request 未给出 Max_Steps 时取默认值 1000。
7. IF Participant 到达某个 Node 时，其在本次运行中的 Node 到达累计次数超过 Max_Steps（VISITOR_ARRIVAL 计为在 Entrance 节点的第 1 次到达，此后经 Edge、Full_Policy reroute 或 Close_Policy redirect 每到达一个 Node 计 1 次），THEN THE Simulation_Engine SHALL 不对本次到达执行该 Node 的任何处理（包括 Decision 路由和 Exit 节点处理），在本次到达时刻记录 nodeId 为该 Node、details 中 Participant_Outcome 为 loop_limit 且离开原因为 max_steps 的 VISITOR_LEAVE 事件，将该 Participant 的 Participant_Outcome 设为 loop_limit，且此后除第 9 条的 RUN_WARNING 外不再为该 Participant 记录任何 Simulation_Event。
8. IF Loop_Guard 的 maxVisits 不是 1 至 100 000 的整数，或 Run_Request 给出的 Max_Steps 不是 1 至 100 000 的整数，THEN THE Schema_Validator SHALL 为每个此类字段返回一条 severity 为 error 的 Validation_Issue，其 path 指向该字段。
9. WHEN Simulation_Engine 按第 7 条将某个 Participant 的 Participant_Outcome 设为 loop_limit，THE Simulation_Engine SHALL 紧随第 7 条的 VISITOR_LEAVE 事件、在同一时刻记录一条 RUN_WARNING 事件（details 的 code 为 max_steps_exceeded，participantId 为该 Participant ID，nodeId 为第 7 条所述 Node ID），并在 Run_Result 的运行问题列表中为该 Participant 加入一条 severity 为 warning 的条目，其相关实体 ID 包含该 Participant ID 与第 7 条所述 Node ID，且不因此将 Run_Result 的状态设为 failed 或 aborted。
10. THE Golden_Case_Suite SHALL 包含标注 Requirement 20 的 Golden_Case，共同覆盖以下两种情况：一位 Participant 的 Node 到达总次数恰为 Max_Steps，其 Participant_Outcome 不为 loop_limit；另一位 Participant 在第 Max_Steps + 1 次到达时记录 VISITOR_LEAVE 事件，并得到 Participant_Outcome loop_limit。

### Requirement 21: 参与者与到达模型

**User Story:** 作为活动组织者，我希望用多种方式描述参与者何时到达、具有哪些属性，以便贴近自己活动的实际情况。

#### Acceptance Criteria

1. THE Schema_Module SHALL 为 Participant 定义 Participant ID、Arrival_Stream ID、到达时刻（相对 T0 的秒数）和 Participant_Attribute 取值映射；该映射为 Scenario 中每个 Participant_Attribute 恰好给出一个属于其取值集合的取值，Scenario 未定义 Participant_Attribute 时为空映射。
2. THE Schema_Module SHALL 要求每个 Arrival_Stream 恰好采用以下四种到达模型之一：total_in_window（非负整数总人数、时间范围 [start, end) 和间隔方式 even 或 random）、preset_profile（非负整数总人数、时间范围 [start, end) 和预设形状 uniform、early_peak、late_peak 或 peak_at，peak_at 另含峰值时刻）、bucketed（时间段列表，每段含 [start, end) 与非负整数人数，列表允许为空）、records（导入的匿名到达记录列表，每条含遵循 Requirement 6 第 2 条 ID 格式的记录 ID、到达时刻和 Participant_Attribute 取值映射，列表允许为空）。
3. THE Schema_Module SHALL 为 total_in_window、preset_profile 与 bucketed 模型的 Arrival_Stream 定义每个 Participant_Attribute 的取值概率分布（由取值与概率组成的有序列表）；records 模型不含该分布，其 Participant 的属性取值等于对应记录中的取值。
4. IF total_in_window 或 preset_profile 模型的总人数不是非负整数、时间范围的 end 不大于 start 或 peak_at 的峰值时刻不在 [start, end) 内，或 bucketed 模型某个时间段的 end 不大于 start、人数不是非负整数或与另一时间段重叠（前一段的 end 等于后一段的 start 不视为重叠），THEN THE Schema_Validator SHALL 为每个违规字段（重叠时为每对重叠的时间段）返回一条 severity 为 error 的 Validation_Issue，path 指向该字段；涉及时间段时 path 含该时间段的下标，重叠时取该对中下标较大者。
5. IF records 模型的某条记录 ID 与同一 Arrival_Stream 中下标更小的记录重复，或某条记录缺少 Scenario 中某个 Participant_Attribute 的取值、含 Scenario 未定义的 Participant_Attribute，或某个取值不属于该属性的取值集合，THEN THE Schema_Validator SHALL 为每条重复记录以及每个缺失、未定义或取值违规的属性各返回一条 severity 为 error 的 Validation_Issue，path 含该记录在列表中的下标；负数、NaN 和无穷大的到达时刻按 Requirement 6 第 5 条处理，本条不重复报告。
6. FOR ALL 两个 Simulation_Relevant_Field 相同的 Scenario（包括仅在 Layout_Field、显示名称、描述、备注、显示用起始钟点、对象键顺序或 Participant_Attribute 与 Arrival_Stream 列表元素顺序上不同的情形），THE Population_Generator SHALL 生成逐字段相同的 Base_Population，且二者均按到达时刻升序排列，到达时刻相同时按 Participant ID 升序（Requirement 6 第 12 条）排列。
7. FOR ALL 引用同一 Scenario 的两个 Plan（无论二者的 Workflow_Graph、Skill 目录、Staff、Device_Type 或 Assignment 是否不同），THE Population_Generator SHALL 生成逐字段相同的 Base_Population。
8. THE Population_Generator SHALL 将 Participant ID 设为所属 Arrival_Stream ID、一个不属于 Requirement 6 第 2 条字符集的固定非空白 ASCII 可打印分隔字符和流内标识依次拼接而成的字符串，使同一 Base_Population 中的 Participant ID 互不相同；records 模型的流内标识为记录 ID，其他模型的流内标识为不带前导零的十进制流内序号 k（k = 1 … n），其中 bucketed 模型按时间段 start 升序、段内按第 11 条的 j 升序连续编号。
9. IF total_in_window、preset_profile 或 bucketed 模型的 Arrival_Stream 缺少 Scenario 中某个 Participant_Attribute 的取值概率分布或含 Scenario 未定义的 Participant_Attribute 的分布，或某个分布含不属于该属性取值集合的取值、重复取值、为负数、NaN 或无穷大的概率，或某个分布的全部概率之和与 1 的差的绝对值超过 1e-9，THEN THE Schema_Validator SHALL 为每个缺失或多余的分布、每个违规元素和每个概率和不满足要求的分布各返回一条 severity 为 error 的 Validation_Issue，path 指向该分布或违规元素；含违规概率的分布不再检查概率和。
10. FOR ALL Schema_Validator 未返回 severity 为 error 的 Validation_Issue 的 Scenario 及其中每个 Arrival_Stream，THE Population_Generator SHALL 按以下规则生成 Participant：total_in_window 与 preset_profile 模型恰好生成总人数位，到达时刻均在时间范围 [start, end) 内；bucketed 模型为每个时间段恰好生成该段人数位，到达时刻均在该段 [start, end) 内；records 模型为每条记录恰好生成一位，到达时刻等于该记录的到达时刻。
11. WHEN Population_Generator 为间隔方式为 even 的 total_in_window 模型的时间范围 [start, end)，或为 bucketed 模型的一个时间段 [start, end)，生成 n 位（n ≥ 1）Participant，THE Population_Generator SHALL 将其中第 j 位（j = 1 … n）的到达时刻设为 start + (j − 1)·(end − start)/n。

### Requirement 22: Keyed_Draw 与公共随机数

**User Story:** 作为活动组织者，我希望两个方案中同一位参与者的随机工作量相同，以便比较结果反映安排差异而不是随机噪声。

#### Acceptance Criteria

1. THE Simulation_Engine SHALL 对每次随机抽取使用一个满足 0 ≤ u < 1 的 Keyed_Draw 值 u，该值仅由 Scenario 随机种子、用途、主体 ID、键和 Visit_Index 五项决定，用途取值为 service、route、transfer、attribute、arrival 之一。
2. THE Simulation_Engine SHALL 按以下口径确定 Keyed_Draw 的主体 ID、键和 Visit_Index（Visit_Index 在单次运行内对该 Participant 计数，从 1 开始且计入本次）：service 用途分别为 Participant ID、Service 节点的 Stage_Key、该 Participant 在 Stage_Key 相同的全部 Service 节点上的 SERVICE_START 次数；route 用途分别为 Participant ID、Decision 节点的 Decision_Key、该 Participant 到达 Decision_Key 相同的全部 Decision 节点的次数（不论路由模式，也不论本次是否触发 Loop_Guard）；transfer 用途分别为 Participant ID、Edge ID、该 Participant 进入该 Edge 的次数（不论转移时长分布是否需要抽取）。
3. FOR ALL Scenario 随机种子相同的两个 Run_Request（二者的 Plan、Run_Mode、Max_Steps、maxEvents、随机种子以外的 Scenario 字段以及事件处理顺序均可不同），THE Simulation_Engine SHALL 对用途、主体 ID、键和 Visit_Index 均相同的两次抽取得到相等的 Keyed_Draw 值，且该值不随其他 Participant 的人数或抽取次数变化。
4. FOR ALL 引用同一 Scenario 的两个 Plan 中 Stage_Key 相同、服务时长分布的 kind 与全部参数均相同（empirical 分布比较升序排列后的样本列表）的 Service 节点，THE Simulation_Engine SHALL 为同一 Participant 在该 Stage_Key 的相同 Visit_Index 生成按 Requirement 12 第 4 条取整后相等的服务时长，即使两个节点的 Node ID、Resource_Requirement、Queue_Capacity、Open_Window 或开始服务时刻不同。
5. FOR ALL 引用同一 Scenario 的两个 Plan 中 Stage_Key 相同、服务时长分布的 kind 或参数不同的 Service 节点，THE Simulation_Engine SHALL 为同一 Participant 在该 Stage_Key 的相同 Visit_Index 使用相等的 Keyed_Draw 值 u，并在各 Plan 中按 Requirement 12 第 4 条以该节点自身分布的 F⁻¹(u) 计算服务时长（例如方案 A 为 uniform(60, 120)、方案 B 为 uniform(30, 60) 时，取整前方案 B 的服务时长恰为方案 A 的一半）。
6. FOR ALL 引用同一 Scenario 的两个 Plan 中 Decision_Key 相同、路由模式均为 probability、Branch 列表的 branchKey 顺序与权重均相同的 Decision 节点，以及同一 Participant 在该 Decision_Key 的相同 Visit_Index 上、在两个 Plan 中均未触发 Loop_Guard（Requirement 20 第 3 条）的到达，THE Simulation_Engine SHALL 在两个 Plan 中选择 branchKey 相同的 Branch。
7. THE Population_Generator SHALL 对 attribute 与 arrival 用途的每次随机抽取使用满足 0 ≤ u < 1 的 Keyed_Draw 值，并按以下口径确定主体 ID、键和 Visit_Index：attribute 用途分别为 Participant ID、Participant_Attribute ID 和 1；arrival 用途分别为 Arrival_Stream ID、同一 Arrival_Stream ID 和该 Arrival_Stream 内的抽取序号（从 1 开始）；records 到达模型不进行这两种抽取。
8. FOR ALL 随机种子 s ∈ {0, 1, 4294967295}，THE Simulation_Engine SHALL 使以下两组各 10 000 个 service 用途的 Keyed_Draw 值在 [0, 0.1)、[0.1, 0.2)、…、[0.9, 1) 十个等宽区间中每个区间各落入 850 至 1150 个：第一组主体 ID 依次为 p-1 至 p-10000、键为 stage-a、Visit_Index 为 1；第二组主体 ID 为 p-1、键为 stage-a、Visit_Index 依次为 1 至 10 000。

### Requirement 23: 跨方案工序对应

**User Story:** 作为活动组织者，我希望在方案 B 增加、删除或拆分环节后，仍能知道哪些环节可以与方案 A 对比。

#### Acceptance Criteria

1. THE Schema_Module SHALL 允许同一 Plan 中两个或更多 Service 节点使用相同 Stage_Key（表示同一工序的并行通道），Stage_Key 不受 Requirement 6 第 1 条的 ID 唯一性约束，且 Schema_Validator 与 Graph_Validator 不因 Stage_Key 重复返回任何 Validation_Issue。
2. THE Workbench SHALL 按以下 Node_Correspondence 规则确定方案 A 与方案 B 的 Node 对应关系：(a) Node ID 相同的两个 Node 相互对应，不比较 type 与其他字段；(b) 在另一 Plan 中不存在相同 Node ID 的 Service 节点，与另一 Plan 中 Stage_Key 逐字符相同的全部 Service 节点相互对应（包括那些按 (a) 已有对应的 Service 节点）；(c) 对应关系对称，一个 Node 的对应 Node 集合为按 (a)、(b) 得到的全部对应 Node 的并集；(d) 不满足 (a)、(b) 的 Node 没有对应 Node。例如方案 A 有 Service 节点 s1（Stage_Key 为 k），方案 B 有 s1 与新增的 s2（Stage_Key 均为 k）时，方案 A 的 s1 对应方案 B 的 s1 与 s2。
3. WHEN Workbench 进入 Compare 模式，THE Workbench SHALL 为方案 A 与方案 B 中至少一个 Service 节点使用的每个 Stage_Key 确定唯一分类：两个 Plan 中均有 Service 节点使用该 Stage_Key 为“可比较”，仅方案 A 有为“仅 A”，仅方案 B 有为“仅 B”；分类只由两个 Plan 的内容决定，与 Run_Result 中是否有 Participant 在该 Stage_Key 的 Service 节点开始服务无关（例如方案 B 把 Stage_Key 为 k 的工序拆分为 Stage_Key 为 k1、k2 的两个串行 Service 节点且不再使用 k 时，k 为“仅 A”，k1 与 k2 为“仅 B”）。
4. THE Metrics_Calculator SHALL 将 Participant 在 Plan 中全部 Service 节点上按 Requirement 36 第 1 条计算的等待时长计入该 Participant 的 Waiting_Time，包括 Stage_Key 按第 3 条为“仅 A”或“仅 B”的 Service 节点（例如方案 B 把一项工序拆分为两个使用新 Stage_Key 的串行 Service 节点时，两个新节点上的等待都计入方案 B 中该 Participant 的 Waiting_Time）。
5. FOR ALL 引用同一 Scenario 的两个 Plan（无论二者之间新增、删除或修改了哪些 Service 节点及其相连 Edge），THE Simulation_Engine SHALL 按 Requirement 22 第 3 条为同一 Participant 在两个 Plan 都使用的同一 Stage_Key 与同一 Visit_Index 上取用相同的 service 用途 Keyed_Draw 值。
6. THE Metrics_Calculator SHALL 在 Statistics 中为 Plan 中至少一个 Service 节点使用的每个 Stage_Key 各输出一条汇总，包括没有 Participant 在其 Service 节点开始服务的 Stage_Key；汇总范围为该 Plan 中使用该 Stage_Key 的全部 Service 节点，内容为 Requirement 36 第 8 条的按 Stage_Key 等待指标、SERVICE_START 事件数、SERVICE_COMPLETE 事件数，以及已完成服务的平均服务时长（各次服务的 SERVICE_COMPLETE 时刻减对应 SERVICE_START 时刻的算术平均，单位秒；SERVICE_COMPLETE 事件数为 0 时为 null）。
7. THE Metrics_Calculator SHALL 在 Statistics 中为 Base_Population 中每位 Participant 输出一条记录，按 Participant ID 升序（Requirement 6 第 12 条）排列，包含 Participant ID、Participant_Outcome、完成时刻（VISITOR_COMPLETE 事件时刻；Participant_Outcome 不是 completed 时为 null）和 Requirement 36 第 2 条的各 Waiting_Time 分项（not_arrived 时各分项为 0），使引用同一 Scenario 的两个 Run_Result 的 Participant 记录具有相同的 Participant ID 序列。
8. WHILE Canvas_Mode 为 Compare，THE Workbench SHALL 按 Stage_Key 升序（Requirement 6 第 12 条）列出第 3 条分类的每个 Stage_Key 及其分类和第 6 条的汇总指标：“可比较”的 Stage_Key 显示方案 A 值、方案 B 值和差值（方案 B 减方案 A，任一侧为 null 时差值显示为“无数据”）；“仅 A”或“仅 B”的 Stage_Key 只显示存在一侧的值，不显示差值。

### Requirement 24: 资源模型

**User Story:** 作为活动组织者，我希望把工作人员和设备作为独立资源配置，以便多个环节引用同一批资源。

#### Acceptance Criteria

1. THE Schema_Module SHALL 为 Staff 定义以下必填字段：ID（遵循 Requirement 6 的 ID 规则）、显示名称（长度 1 至 100 个 Unicode 码点，至少含 1 个非空白字符，与 Requirement 9 第 2 条的 Node 显示名称规则相同）、Skill ID 列表（可为空）、Shift 列表（可为空）、Unavailability_Window 列表（可为空，每项为一个 [start, end) 时段）和 Provenance（结构见 Requirement 41 第 1 条）。
2. THE Schema_Module SHALL 为 Device_Type 定义以下必填字段：ID（遵循 Requirement 6 的 ID 规则）、显示名称（规则同第 1 条）、数量（0 至 1000 的整数）、Shift 列表（可为空，对该 Device_Type 的每台设备同等适用）、Unavailability_Window 列表（可为空，每项由一个 Resource_Unit ID 和一个 [start, end) 时段组成，该 Resource_Unit ID 必须是该 Device_Type 按 Requirement 6 第 3 条派生的 Resource_Unit ID 之一）和 Provenance（结构见 Requirement 41 第 1 条）。
3. THE Schema_Module SHALL 将 Resource_Requirement 定义为有序的需求项列表（可为空，列表顺序即 Requirement 27 第 5 条所称的需求项声明顺序），每个需求项恰好是（Skill ID，数量）的 Staff 需求或（Device_Type ID，数量）的设备需求之一，数量为不小于 1 的整数。
4. THE Schema_Module SHALL 把 Skill 目录、Staff 列表、Device_Type 列表与 Assignment 列表放在 Plan 中，使引用同一 Scenario 的两个 Plan 可以包含不同的 Skill、Staff、Device_Type 与 Assignment（包括同一 ID 在两个 Plan 中取不同内容），且 Schema_Validator 与 Graph_Validator 不因两个 Plan 之间的这些差异返回 Validation_Issue。
5. THE Simulation_Engine SHALL 将 Resource_Unit 可被分配开始新服务的可用时间定义为：其 Shift 的并集（设备取所属 Device_Type 的 Shift 列表），减去适用于它的全部 Unavailability_Window（Staff 取自身列表；设备取所属 Device_Type 列表中 Resource_Unit ID 等于它的条目；另含 Requirement 33 第 2 条按 Unavailability_Window 处理的资源中断）与 Handover 时段的并集，全部时段按 [start, end) 计算；例如 Shift [0, 3600) 与 Unavailability_Window [1200, 1500) 得到可用时间 [0, 1200) ∪ [1500, 3600)，Shift 列表为空的 Resource_Unit 在任何时刻都不可用；已开始的服务按 Requirement 11 第 7 条与 Requirement 26 第 2、3 条继续，该 Resource_Unit 可服务哪些 Node 另按 Requirement 25 限定。
6. IF 某个 Staff 或 Device_Type 的 Shift 列表未按 start 严格升序排列，或其中相邻两个 Shift 的前一个 end 大于后一个 start，或任一 Shift 或 Unavailability_Window 的 end 不大于 start，THEN THE Schema_Validator SHALL 为每个违规时段返回一条 severity 为 error 的 Validation_Issue，path 指向该时段（顺序或重叠违规指向相邻两个时段中的后一个），相关实体 ID 列表包含该 Staff 或 Device_Type 的 ID；前一个 Shift 的 end 等于后一个的 start 不视为重叠，Unavailability_Window 之间相互重叠或超出 Shift 范围不视为违规。
7. IF Staff、Device_Type 或 Resource_Requirement 需求项的某个字段缺少必填值、类型不符，或取值超出第 1 至 3 条规定的范围（包括数量不是整数、Device_Type 数量大于 1000、Device_Type 的 Unavailability_Window 引用的 Resource_Unit ID 不属于该 Device_Type 当前数量派生的 Resource_Unit ID，例如数量由 3 改为 2 后仍引用第 3 台设备），THEN THE Schema_Validator SHALL 为每个此类字段各返回一条 severity 为 error 的 Validation_Issue，path 为从被校验对象根部到该字段的完整路径（数组元素以下标表示），相关实体 ID 列表包含所属 Staff、Device_Type 或 Service 节点的 ID。
8. IF Staff 的 Skill ID 列表中某个元素不是所在 Plan 的 Skill 目录中任一 Skill 的 ID，THEN THE Graph_Validator SHALL 为每个这样的元素返回一条 severity 为 error 的 Validation_Issue，相关实体 ID 列表包含该 Staff ID 与该 Skill ID，path 指出该元素在列表中的序号。
9. WHEN 分配轮次（Requirement 27 第 4 条）为某个 Service 节点开始一次服务，THE Simulation_Engine SHALL 为数量为 q 的每个需求项占用 q 个可满足该需求项的 Resource_Unit，且同一 Resource_Unit 在同一次服务中至多计入一个需求项，使该 SERVICE_START 事件的 resourceUnitIds 恰好包含与全部需求项数量之和相等个数的互不相同的 Resource_Unit ID；Staff 可满足 Staff 需求当且仅当其 Skill ID 列表包含该需求项的 Skill ID，设备可满足设备需求当且仅当它属于该需求项的 Device_Type。

### Requirement 25: Assignment 与调岗交接

**User Story:** 作为活动组织者，我希望在活动中途把工作人员调到其他环节，并计入交接耗时，以便评估动态调岗。

#### Acceptance Criteria

1. THE Schema_Module SHALL 为 Assignment 定义必填的 Resource_Unit ID 和至少含 1 个时间段的时间段列表，每个时间段包含必填的 from（时间点）、可选的 to（时间点，缺失表示该时间段没有结束时刻）、必填的可服务 Node ID 列表（允许为空，为空时该时间段内不可服务任何 Node）和可选的 handoverSec（持续时间，缺失时取 0），每个时间段按 [from, to) 计算。
2. WHERE 某个 Resource_Unit 在 Plan 中没有 Assignment，THE Simulation_Engine SHALL 允许该 Resource_Unit 在其可用时间（Requirement 24 第 5 条）内被分配给展开后 Plan 中任一 Service 节点，条件是该节点的 Resource_Requirement 含该 Resource_Unit 按 Requirement 24 第 9 条可满足的需求项。
3. WHILE 当前时刻 t 位于某个 Resource_Unit 的一个 Assignment 时间段 [from, to) 内，THE Simulation_Engine SHALL 在分配轮次中仅把该 Resource_Unit 分配给该时间段 Node ID 列表所含的 Service 节点开始新服务；t 之前已开始的服务按 Requirement 11 第 7 条继续，不受时间段切换影响。
4. WHERE 某个 Resource_Unit 有 Assignment，WHILE 当前时刻不在其任何 Assignment 时间段内（包括第一个时间段的 from 之前，以及最后一个设置了 to 的时间段的 to 及之后），THE Simulation_Engine SHALL 不把该 Resource_Unit 分配给任何 Service 节点开始新服务，即使该时刻位于其 Shift 内且不在任何 Unavailability_Window 或 Handover 内。
5. WHEN 某个 Resource_Unit 的任一 Assignment 时间段（包括第一个时间段）在时刻 t 开始，且该 Resource_Unit 在 t 时不处于服务中（未处于已记录 SERVICE_START、尚未记录 SERVICE_COMPLETE 的服务；包括处于离岗、不可用或前一个 Handover 的情况），THE Simulation_Engine SHALL 将 [t, t + handoverSec) 记为 Handover，使该 Resource_Unit 最早在时刻 t + handoverSec 被分配给该时间段列出的 Node；handoverSec 为 0 时不产生 Handover。
6. IF 某个 Assignment 时间段在时刻 t 开始时该 Resource_Unit 处于服务中，THEN THE Simulation_Engine SHALL 让该服务在其完成时刻 c 正常结束，并以时刻 c 所在 Assignment 时间段的 handoverSec 将 [c, c + handoverSec) 记为 Handover；该服务期间有多个时间段开始时只记这一次 Handover，c 不在任何 Assignment 时间段内时不记 Handover。
7. THE Simulation_Engine SHALL 将 Handover 的开始与结束作为 Requirement 30 第 4 条类别 2 的资源状态变化处理，并按 Requirement 30 第 9 条记录 RESOURCE_CHANGE：Resource_Unit 的状态因 Handover 开始变为交接中时，记录一条新状态为交接中、原因列表含 handover_start 的事件；因 Handover 结束不再为交接中时，记录一条原状态为交接中、原因列表含 handover_end 的事件；相互衔接或重叠的多个 Handover 按其并集只产生一次开始和一次结束；状态未因此变化（例如 Handover 与离岗或不可用时段重叠的部分）时不记录，时刻晚于运行结束时刻的事件不记录。
8. IF 某个 Assignment 的时间段列表为空，或其时间段未按 from 严格升序排列，或某个时间段设置的 to 不大于其 from，或相邻两个时间段中前一个未设置 to 或其 to 大于后一个的 from，THEN THE Schema_Validator SHALL 为每处违规返回一条 severity 为 error 的 Validation_Issue，path 指向违规的时间段（顺序或重叠违规指向相邻两个时间段中的后一个，列表为空时指向该时间段列表），相关实体 ID 列表包含该 Assignment 的 Resource_Unit ID；前一个时间段的 to 等于后一个的 from 不视为重叠。
9. IF Assignment 时间段的 Node ID 列表中某个元素是展开后 Plan 中一个 Service 节点的 ID，而该节点的 Resource_Requirement 为空，或其中没有该 Assignment 的 Resource_Unit 按 Requirement 24 第 9 条可满足的需求项，THEN THE Graph_Validator SHALL 为每个这样的列表元素返回一条 severity 为 warning 的 Validation_Issue，path 按 Requirement 19 第 10 条指向该元素，相关实体 ID 列表包含该 Resource_Unit ID 与该 Node ID；该判断不考虑 Shift、Unavailability_Window、Handover 与 Assumption_Override，且不适用于已按 Requirement 19 第 6 条或 Requirement 17 第 8 条返回 error 的 Assignment 或引用。
10. IF 同一 Plan 中两个或更多 Assignment 的 Resource_Unit ID 相同，THEN THE Schema_Validator SHALL 对该 Resource_Unit ID 的第二次及之后每次出现各返回一条 severity 为 error 的 Validation_Issue，path 指向该次出现的 Resource_Unit ID 字段，相关实体 ID 列表包含该 Resource_Unit ID。

### Requirement 26: 不可用时段与班次结束

**User Story:** 作为活动组织者，我希望模拟休息、设备故障和下班，以便知道临时缺人缺设备的影响。

#### Acceptance Criteria

1. WHEN 适用于某个 Resource_Unit 的 Unavailability_Window [s, e)（含 Requirement 33 第 2 条按 Unavailability_Window 处理的资源中断）在时刻 s 开始，且该 Resource_Unit 在 s 时未处于服务中（不存在已记录 SERVICE_START 而尚未记录 SERVICE_COMPLETE 的服务；服务恰在 s 完成时按 Requirement 30 第 4 条先完成服务，属于此情况），THE Simulation_Engine SHALL 使该 Resource_Unit 在 [s, e) 内不被任何分配轮次选中开始新服务。
2. IF 适用于某个 Resource_Unit 的 Unavailability_Window [s, e) 在时刻 s 开始时该 Resource_Unit 处于服务中（口径同第 1 条），THEN THE Simulation_Engine SHALL 不中断该服务，以其 SERVICE_COMPLETE 时刻 c（按 Requirement 11 第 7 条确定）为界，将 [s, c) 计为忙碌而非不可用，在 c < e 时使该 Resource_Unit 在 [c, e) 内不被任何分配轮次选中，在 c ≥ e 时不因该 Unavailability_Window 进入不可用状态。
3. IF 某个 Shift 在时刻 s 结束、没有其他 Shift 以 s 为 start，且该 Resource_Unit 在 s 时处于服务中（口径同第 1 条，服务恰在 s 完成不属此情况），THEN THE Simulation_Engine SHALL 不中断该服务，将 [s, c) 中不在任何 Shift 内的部分记为加班时长，其中 c 为该服务的 SERVICE_COMPLETE 时刻，服务在 Requirement 11 第 7 条所称运行结束时刻仍未完成时以运行结束时刻代替 c，并从 c 起按第 5 条确定资源状态（c 不在任何 Shift 内时为离岗）。
4. THE Simulation_Engine SHALL 按 Requirement 30 第 9 条确定每个 Resource_Unit 在时刻 0 的处理前状态（时刻 0 位于某个 Shift 内为可用，否则为离岗）且不为该状态记录事件；此后（含时刻 0）第 5 条确定的资源状态每发生一次净变化，在变化生效时刻（第 2、3 条的情况为 c）为该 Resource_Unit 记录恰好一条 RESOURCE_CHANGE 事件，其原状态、新状态与原因列表按 Requirement 30 第 8、9 条确定（资源中断按 Unavailability_Window 计，其边界记为 unavailability_start 或 unavailability_end）；状态未变化时（例如相邻 Shift 的衔接时刻，或进入与当前 Unavailability_Window 重叠的另一个 Unavailability_Window）不记录。
5. THE Simulation_Engine SHALL 在每个时刻为每个 Resource_Unit 确定恰好一种资源状态，按以下顺序取第一个成立的：不在任何 Shift 内为离岗；位于任一适用的 Unavailability_Window 或资源中断内为不可用；位于 Handover 内为交接中；其余为可用；Resource_Unit 处于服务中时，Shift 结束与 Unavailability_Window 开始引起的变化按第 2、3 条推迟到 c 生效，Handover 时段按 Requirement 25 第 5、6 条确定，且不因与离岗或不可用时段重叠而顺延。
6. THE Schema_Module SHALL 规定 RESOURCE_CHANGE 事件的 resourceUnitIds 恰含 1 个 Resource_Unit ID，details 按 Requirement 30 第 8 条包含原状态、新状态（各取 Requirement 30 第 9 条所列可用、交接中、不可用、离岗之一，且二者不同）和非空的原因列表（元素取自 Requirement 30 第 8 条所列六个取值并按其顺序排列），使不满足其中任一项的 RESOURCE_CHANGE 事件在 Requirement 31 第 9 条的运行时校验中校验失败。
7. THE Golden_Case_Suite SHALL 包含标注 Requirement 26 的 Golden_Case，以期望的 Simulation_Event 序列共同覆盖以下情况：Unavailability_Window 在服务中开始且 c < e；Unavailability_Window 在服务中开始且 c ≥ e，该 Unavailability_Window 不产生 RESOURCE_CHANGE；两个相互重叠的 Unavailability_Window 只产生一条进入不可用和一条离开不可用的 RESOURCE_CHANGE；Shift 在服务中结束，并另以期望统计值给出大于 0 的加班总时长。

### Requirement 27: 共享资源竞争与分配

**User Story:** 作为活动组织者，我希望多个环节争用同一批人员或设备时结果确定且符合实际，以便信任资源相关的结论。

#### Acceptance Criteria

1. THE Simulation_Engine SHALL 保证任一时刻每个 Resource_Unit 至多被一个服务占用：一次服务对其 SERVICE_START 事件 resourceUnitIds 中每个 Resource_Unit 的占用区间为 [该 SERVICE_START 时刻, 其后第一条同一 Participant 与同一 Node 的 SERVICE_COMPLETE 时刻)，未记录该 SERVICE_COMPLETE 时右端取运行结束时刻（Requirement 11 第 7 条）；任意两条含相同 Resource_Unit ID 的 SERVICE_START 事件的占用区间互不相交，前一次服务的 SERVICE_COMPLETE 时刻等于后一次的 SERVICE_START 时刻不视为相交。
2. THE Simulation_Engine SHALL 以全有或全无方式获取 Resource_Requirement：仅当 Service 节点 N 的 Resource_Requirement 在时刻 t 可完整满足时才在 t 为 N 开始服务，并在该次服务的 SERVICE_START 事件中一次性占用全部所需 Resource_Unit；排队或受阻等候的 Participant 不占用任何 Resource_Unit。N 在时刻 t 的可分配 Resource_Unit 指同时满足以下三项的 Resource_Unit：不在任何已记录 SERVICE_START、尚未记录对应 SERVICE_COMPLETE 的服务中；t 位于其可用时间（Requirement 24 第 5 条）内；按 Requirement 25 第 2 至 4 条允许服务 N。可完整满足指存在一种分配方式，把互不相同的可分配 Resource_Unit 分给各需求项，使数量为 q 的每个需求项恰好分得 q 个可满足它的 Resource_Unit（可满足关系见 Requirement 24 第 9 条），且每个 Resource_Unit 至多分给一个需求项；Resource_Requirement 为空列表时恒为可完整满足。例如 Staff X 具备 Skill a 与 b、Staff Y 只具备 Skill a、需求项依次为 (a, 1)、(b, 1) 时，X 与 Y 均可分配即为可完整满足，仅 X 可分配时不可完整满足。
3. WHEN 一次服务在时刻 c 记录 SERVICE_COMPLETE 事件，THE Simulation_Engine SHALL 在时刻 c 释放该服务占用的全部 Resource_Unit，使其中在 c 满足第 2 条可分配条件的 Resource_Unit 可在时刻 c 的分配轮次中被再次占用；在 c 处于 Unavailability_Window、离岗或 Handover 的 Resource_Unit 按 Requirement 26 第 2、3 条与 Requirement 25 第 6 条在 c 不可分配。
4. WHEN 某个时刻 t 的类别 1 至 5 事件（Requirement 30 第 4 条）全部处理完毕，且 t 为记录了任一 Simulation_Event 的时刻或任一 Assignment 时间段的 from，THE Simulation_Engine SHALL 在时刻 t 执行分配轮次。候选节点为同时满足以下条件的 Service 节点：时刻 t 可开始服务（Requirement 11 第 10 条，含 Close_Policy 排队者处理方式为 serve 的关闭后继续服务阶段）；队列非空；设置了最大并发服务数 m 时服务中人数小于 m（Requirement 11 第 5 条）；Resource_Requirement 可完整满足（第 2 条）。每次按分配优先级降序、队首 Participant 的 QUEUE_ENTER 时刻升序、Node ID 升序（Requirement 6 第 12 条）选出一个候选节点，为其队首 Participant 开始一次服务（Requirement 11 第 3 条），再按更新后的状态重新确定候选节点，直到没有候选节点；不可完整满足的节点不为自己保留任何 Resource_Unit，分配优先级更低的候选节点可在同一轮次占用这些 Resource_Unit。
5. WHEN 分配轮次为选中的节点开始一次服务，THE Simulation_Engine SHALL 按需求项声明顺序（Requirement 24 第 3 条）逐项、每项逐个名额选择 Resource_Unit：把可满足该需求项、且尚未在本次服务中选中的可分配 Resource_Unit 按最近一次释放时刻升序、相同时按 Resource_Unit ID 升序排列，选择其中第一个满足以下条件的 Resource_Unit：选中后，本次服务的剩余名额以其余未选中的可分配 Resource_Unit 计仍可完整满足（第 2 条）。最近一次释放时刻为该 Resource_Unit 最近一次被占用的服务的 SERVICE_COMPLETE 时刻，从未被占用的取其可用时间（Requirement 24 第 5 条）的最早时刻；SERVICE_START 事件的 resourceUnitIds 按选择顺序列出。例如第 2 条示例中 X 与 Y 均可分配且 X 的最近一次释放时刻早于 Y 时，(a, 1) 跳过 X（选 X 后 (b, 1) 没有可分配 Resource_Unit）而选 Y，(b, 1) 选 X，resourceUnitIds 为 [Y 的 ID, X 的 ID]。
6. FOR ALL Run_Result、Resource_Requirement 非空的 Service 节点 N 与时刻 t，THE Simulation_Engine SHALL 使 N 在 t 的服务中人数（满足 SERVICE_START 时刻 ≤ t < 对应 SERVICE_COMPLETE 时刻、或已开始且未记录 SERVICE_COMPLETE 的服务数）不超过各需求项 i 的 ⌊|U_i| ÷ q_i⌋ 中的最小值，其中 q_i 为需求项 i 的数量，U_i 为可满足需求项 i、且在 t 为 N 的可分配 Resource_Unit 或正被 N 的服务占用的 Resource_Unit 集合；例如需求项为 (Device_Type d, 1) 且 d 的数量为 2 时，无论 Staff 有多少，N 的服务中人数都不超过 2。Resource_Requirement 为空的节点不受本条约束（见 Requirement 11 第 5、6 条）。
7. FOR ALL Run_Result，THE Simulation_Engine SHALL 使 Participant P 在时刻 t 占用 Resource_Unit u 当且仅当 t 位于 P 某次服务的占用区间（第 1 条）内且 u 在该次服务 SERVICE_START 事件的 resourceUnitIds 中；排队、受阻等候、位于 Waiting Area 或沿 Edge 转移的 Participant 不占用任何 Resource_Unit。
8. THE Golden_Case_Suite SHALL 包含标注 Requirement 27、满足 Requirement 45 第 4 条的 Golden_Case，共同覆盖以下两种情形，并给出期望的 SERVICE_START 事件（含 time 与 resourceUnitIds）：(1) Staff X 具备 Skill a 与 b、Staff Y 只具备 Skill a，某 Service 节点需求项依次为 (a, 1)、(b, 1)，X 的释放时刻早于 Y，期望仅 X 空闲期间该节点不开始服务且 X 不被占用，在 Y 释放的时刻开始服务且 resourceUnitIds 为 [Y 的 ID, X 的 ID]；(2) 同一时刻分配优先级较高但不可完整满足的节点，不阻止分配优先级较低、可完整满足的节点开始服务。
9. IF 某个 Service 节点的 Resource_Requirement 非空，且以所在 Plan 中 Shift 列表非空的全部 Staff、以及所属 Device_Type 的 Shift 列表非空的全部设备 Resource_Unit 作为可分配 Resource_Unit（不考虑时刻、占用、Unavailability_Window 与 Assignment）时仍不可完整满足（例如需求项为 (Device_Type d, 3) 而 d 的数量为 2），THEN THE Graph_Validator SHALL 为该节点返回一条 severity 为 warning 的 Validation_Issue，相关实体 ID 列表包含该 Service 节点 ID，path 指向该节点的 Resource_Requirement。
10. IF 分配轮次在时刻 t 开始的某次服务的服务时长为 0，THEN THE Simulation_Engine SHALL 先把该轮次执行到没有候选节点（期间该服务的 Resource_Unit 按第 2 条仍视为被占用），再按 Requirement 30 第 5 条处理由此在时刻 t 产生的 SERVICE_COMPLETE 及其后续事件，处理完毕后在时刻 t 再执行一次分配轮次。

### Requirement 28: 队列满员

**User Story:** 作为活动组织者，我希望明确队列满员时参与者的去向，以便发现容量不足造成的外溢和流失。

#### Acceptance Criteria

1. THE Schema_Module SHALL 为 Service 与 Waiting Area 节点定义 Full_Policy，其类型恰为 block（缺省值）、reroute 或 reject 之一；类型为 reroute 时必须带一个目标 Node ID，类型为 block 或 reject 时不带目标 Node ID。
2. WHEN Participant 到达 Service 或 Waiting Area 节点（经 Edge、其他节点的 Full_Policy reroute 或 Close_Policy redirect 到达；不含按 Requirement 20 第 7 条不予处理的到达、按 Requirement 29 第 8 条作为迟到者处理的到达，以及受阻 Participant 按第 9 条被放入），THE Simulation_Engine SHALL 在处理该到达时判定节点是否满员：Queue_Capacity 为 null 时始终不满员；否则以下人数不小于 Queue_Capacity 即为满员。Service 节点计排队中的 Participant，即已记录 QUEUE_ENTER、尚未记录 SERVICE_START 且未按 Close_Policy 离开队列者，包括同一时刻先于本次到达入队者，不含服务中与受阻者。Waiting Area 节点计已记录 HOLD_ENTER 且尚未记录 HOLD_RELEASE 的 Participant，不含受阻者。
3. WHERE Full_Policy 为 block，WHEN Participant 在时刻 t 到达满员节点，或到达时该节点已有受阻 Participant，THE Simulation_Engine SHALL 在时刻 t 为该 Participant 与该 Node 记录一条 QUEUE_BLOCKED 事件，并使该 Participant 在节点入口处受阻等候：不进入队列或等候区，不计入第 2 条的满员人数，不占用任何 Resource_Unit；受阻人数不设上限。
4. WHERE Full_Policy 为 reroute，WHEN Participant 在时刻 t 到达满员节点，THE Simulation_Engine SHALL 在时刻 t 为该 Participant 与该 Node 记录一条 details 含目标 Node ID 且改道原因为 queue_full 的 QUEUE_REROUTED 事件，不经任何 Edge、不记录 ROUTE_TRANSITION 事件，使该 Participant 在同一时刻 t 到达目标 Node，并由目标 Node 按自身规则（含其 Full_Policy 与 Close_Policy）处理。该到达按 Requirement 20 第 3、7 条计 1 次 Node 到达，按 Requirement 30 第 4、5 条作为时刻 t 新产生的到达事件排序。该 Participant 在 QUEUE_REROUTED 之后的下一条 Simulation_Event 的 time 为 t，nodeId 为目标 Node ID。
5. WHERE Full_Policy 为 reject，WHEN Participant 在时刻 t 到达满员节点，THE Simulation_Engine SHALL 在时刻 t 记录一条 participantId 为该 Participant ID、nodeId 为该 Node ID 的 VISITOR_LEAVE 事件，其 details 中记录的 Participant_Outcome 为 rejected、离开原因为 queue_full；同时将该 Participant 的 Participant_Outcome 设为 rejected，此后不再为该 Participant 记录任何 Simulation_Event。
6. IF Full_Policy 为 reroute 的 Node 的目标 Node ID 不是展开后 Plan 中任一 Node 的 ID、是 Entrance 节点的 ID，或等于该 Node 自身的 ID，THEN THE Graph_Validator SHALL 为每个这样的目标返回一条 severity 为 error 的 Validation_Issue，path 指向该目标 Node ID 字段，相关实体 ID 列表包含该 Node ID 与目标 Node ID；目标为 Subflow 节点 ID 时只按 Requirement 17 第 8 条报告。Exit 与 Merge 节点均为允许的目标：经 reroute 到达 Merge 节点的 Participant 按 Requirement 30 第 10 条排序，到达 Exit 节点的 Participant 按 Requirement 16 第 2、3 条得到该 Exit 节点对应的结局。
7. THE Metrics_Calculator SHALL 为每个 Service 与 Waiting Area 节点输出以下四项指标，无对应事件时输出 0：受阻人次，即 nodeId 为该 Node 的 QUEUE_BLOCKED 事件数；受阻总时长（秒），即每条 QUEUE_BLOCKED 事件从其时刻到该 Participant 结束此次受阻的时长之和，结束指按第 9 条被放入、按 Close_Policy 被改送或记录 VISITOR_LEAVE；改道人次，即 nodeId 为该 Node 的 QUEUE_REROUTED 事件数，只计入改道来源 Node；拒绝人数，即该 Node 按第 5 条记录的 VISITOR_LEAVE 事件数，不含 Close_Policy 迟到者拒绝与 loop_limit 离开。cutoff 口径只计时刻不晚于 Observation_Cutoff 的事件，尚未结束的受阻时长截止到 Observation_Cutoff；completion 口径计时刻不晚于覆盖结束时刻（Requirement 31 第 11 条）的全部事件，尚未结束的受阻时长截止到覆盖结束时刻。
8. IF Full_Policy 类型为 reroute 但缺少目标 Node ID 或目标 Node ID 不是字符串，或类型为 block 或 reject 却带有目标 Node ID，THEN THE Schema_Validator SHALL 返回一条 severity 为 error 的 Validation_Issue，path 指向该目标 Node ID 字段（缺少时指向该 Full_Policy 对象），相关实体 ID 列表包含该 Node 的 id。
9. WHERE Full_Policy 为 block，WHEN 有受阻 Participant 的节点在时刻 t 记录一条使第 2 条人数减少的 Simulation_Event（Service 节点为 SERVICE_START；Waiting Area 节点为 HOLD_RELEASE 之后紧随的 ROUTE_TRANSITION），THE Simulation_Engine SHALL 紧随该事件、在时刻 t 按受阻开始时刻升序（相同时按 Participant ID 升序，见 Requirement 6 第 12 条）逐一放入受阻 Participant，直到该节点再次满员或不再有受阻 Participant，并为每位被放入者记录 QUEUE_ENTER（Service 节点）或 HOLD_ENTER（Waiting Area 节点）事件；放入不计为新的 Node 到达，也不再次判定满员。
10. THE Golden_Case_Suite SHALL 包含标注 Requirement 28 的 Golden_Case，并给出期望的 Simulation_Event 序列与第 7 条四项指标的期望值，共同覆盖以下情形：(a) Queue_Capacity 为 1、资源空闲的 Service 节点在同一时刻有 2 位 Participant 到达，第 2 位按 Full_Policy 处理；(b) block 下受阻 Participant 在队首记录 SERVICE_START 的同一时刻被放入并记录 QUEUE_ENTER；(c) reroute 的目标 Node 同样满员，并按其自身 Full_Policy 处理；(d) reject 下 Participant 得到 Participant_Outcome rejected，且同一 Run_Result 中按 Requirement 29 第 8 条被拒绝的迟到者不计入拒绝人数。

### Requirement 29: 节点开放与关闭

**User Story:** 作为活动组织者，我希望设置窗口的开放与关闭时间，并明确关闭时排队者和迟到者的去向，以便安排人手与开放时段。

#### Acceptance Criteria

1. WHERE Service 节点的 Open_Window 列表为空，THE Simulation_Engine SHALL 将该节点在整个运行期间视为开放：不为其记录 NODE_SCHEDULE_CHANGE 事件，不把到达该节点的 Participant 视为迟到者，也不对其执行第 5 至第 7 条的排队者处理方式（该节点不存在最后一个 Open_Window 的结束，无论 Close_Policy 取何值）。
2. WHILE Open_Window 列表非空的 Service 节点处于关闭状态，且存在 openAt 大于当前时刻的 Open_Window，THE Simulation_Engine SHALL 按 Requirement 28 的 Full_Policy 与 Requirement 11 第 9 条处理到达该节点的 Participant（不适用第 8 条与第 10 条），保留已在队列中与受阻的 Participant 及其顺序，且在下一个 Open_Window 的 openAt 之前不为该节点记录 SERVICE_START 事件。
3. WHEN Service 节点的某个 Open_Window（含最后一个）在 closeAt 结束，THE Simulation_Engine SHALL 让 closeAt 时刻处于服务中（已记录 SERVICE_START、尚未记录 SERVICE_COMPLETE）的每位 Participant 按 Requirement 11 第 7 条在原定时刻记录 SERVICE_COMPLETE 并继续其流程，且不对这些 Participant 执行第 5 至第 7 条的排队者处理方式。
4. THE Schema_Module SHALL 为 Service 节点的 Close_Policy 定义排队者处理方式（取值 serve、redirect、dismiss，缺省为 serve）与迟到者处理方式（取值 reject、redirect，缺省为 reject），Close_Policy 整体缺省时两项均取缺省值；处理方式为 redirect 时含必填的目标 Node ID（遵循 Requirement 6 的 ID 格式），为其他取值时不含目标 Node ID，缺少目标 Node ID 的 redirect 与含目标 Node ID 的其他取值均按 Requirement 9 第 4 条视为超出取值范围。
5. WHERE Close_Policy 的排队者处理方式为 serve（含缺省），WHEN 该节点最后一个 Open_Window 在 closeAt 结束，THE Simulation_Engine SHALL 使该节点进入关闭后继续服务阶段：closeAt 时刻在队列中与受阻的 Participant 保持原有顺序，按 Requirement 11 第 3、4 条与 Requirement 28 第 3 条继续入队和开始服务；该节点的队列与受阻 Participant 均为空时该阶段结束（closeAt 时二者均为空则立即结束），此后该节点不再开始任何服务。
6. WHERE Close_Policy 的排队者处理方式为 redirect，WHEN 该节点最后一个 Open_Window 在 closeAt 结束，THE Simulation_Engine SHALL 在时刻 closeAt、该节点方向为 close 的 NODE_SCHEDULE_CHANGE 事件之后，先按队列顺序（队首在前）、再按受阻顺序（受阻开始时刻升序，相同时 Participant ID 升序）为此刻每位排队与受阻的 Participant 依次记录一条 nodeId 为该节点、details 中原因为 close_redirect 且含目标 Node ID 的 QUEUE_REROUTED 事件，并使其在同一时刻 closeAt 到达目标 Node（按 Requirement 20 第 3、7 条计入到达次数），目标 Node 按这些 QUEUE_REROUTED 事件的 seq 顺序处理这些到达。
7. WHERE Close_Policy 的排队者处理方式为 dismiss，WHEN 该节点最后一个 Open_Window 在 closeAt 结束，THE Simulation_Engine SHALL 在时刻 closeAt、该节点方向为 close 的 NODE_SCHEDULE_CHANGE 事件之后，按第 6 条的顺序为此刻每位排队与受阻的 Participant 记录一条 nodeId 为该节点、details 中 Participant_Outcome 为 dismissed 且原因为 close_dismiss 的 VISITOR_LEAVE 事件，将其 Participant_Outcome 设为 dismissed，且此后不再为其记录任何 Simulation_Event。
8. WHERE Close_Policy 的迟到者处理方式为 reject（含缺省），WHEN Participant 在时刻 t 到达 Open_Window 列表非空的 Service 节点且 t 不小于该节点最后一个 Open_Window 的 closeAt（即该 Participant 为迟到者；经 Edge、Full_Policy reroute 或 Close_Policy redirect 到达均适用，与排队者处理方式及该节点是否处于关闭后继续服务阶段无关），THE Simulation_Engine SHALL 不按 Full_Policy 处理该到达、不记录 QUEUE_ENTER，在时刻 t 记录一条 nodeId 为该节点、details 中 Participant_Outcome 为 rejected 且原因为 late_arrival 的 VISITOR_LEAVE 事件，并将其 Participant_Outcome 设为 rejected；该次到达使 Node 到达总次数超过 Max_Steps 时改按 Requirement 20 第 7 条处理。
9. WHEN Open_Window 列表非空的 Service 节点在时刻 t（t > 0）由关闭变为开放或由开放变为关闭，THE Simulation_Engine SHALL 在时刻 t 记录恰好一条 nodeId 为该节点、details 中方向为 open 或 close 的 NODE_SCHEDULE_CHANGE 事件；前一个 Open_Window 的 closeAt 等于后一个的 openAt 时，该节点在该时刻保持开放，不记录事件。
10. WHERE Close_Policy 的迟到者处理方式为 redirect，WHEN Participant 按第 8 条的判定在时刻 t 作为迟到者到达 Service 节点，THE Simulation_Engine SHALL 不按 Full_Policy 处理该到达、不记录 QUEUE_ENTER，在时刻 t 记录一条 nodeId 为该节点、details 中原因为 late_redirect 且含目标 Node ID 的 QUEUE_REROUTED 事件，并使该 Participant 在同一时刻 t 到达目标 Node（按 Requirement 20 第 3、7 条计入到达次数），由目标 Node 按自身规则处理；到达该 Service 节点使 Node 到达总次数超过 Max_Steps 时改按 Requirement 20 第 7 条处理。
11. WHEN 运行在时刻 0 开始，THE Simulation_Engine SHALL 将 Open_Window 列表非空的每个 Service 节点的初始状态设为开放（存在满足 openAt ≤ 0 < closeAt 的 Open_Window 时）或关闭（其余情况），并只为初始状态为关闭的节点在时刻 0 记录一条 details 中方向为 close 的 NODE_SCHEDULE_CHANGE 事件，使任一 Service 节点在时刻 t 的开放状态等于 Event_Log 中时刻不晚于 t、nodeId 为该节点的最近一条 NODE_SCHEDULE_CHANGE 事件的方向（不存在此类事件时为开放）。
12. IF Service 节点 Close_Policy 的排队者处理方式或迟到者处理方式为 redirect，且其目标 Node ID 不是 Subflow_Flattener 展开后 Plan 中任一 Node 的 ID、是 Entrance 节点的 ID，或等于该 Service 节点自身的 ID，THEN THE Graph_Validator SHALL 为每个这样的目标 Node ID 字段返回一条 severity 为 error 的 Validation_Issue，path 指向该字段，相关实体 ID 列表包含该 Service 节点 ID 与该目标 Node ID，三种情形使用不同的 code；目标 Node ID 为展开前 Plan 中 Subflow 节点的 ID 时只按 Requirement 17 第 8 条报告，本条不返回 Validation_Issue。Exit 与 Merge 节点均为允许的目标：经 redirect 到达 Merge 节点的 Participant 按 Requirement 30 第 10 条排序，到达 Exit 节点的 Participant 按 Requirement 16 第 2、3 条得到该 Exit 节点对应的结局。

### Requirement 30: 事件模型与同时事件排序

**User Story:** 作为开发者，我希望事件类型和同一时刻事件的处理顺序完全确定，以便结果可复现、可逐事件核查。

#### Acceptance Criteria

1. THE Schema_Module SHALL 为 Simulation_Event 定义必填的 seq（从 0 开始的连续整数）、time（时间点）与 type，并按 type 规定其余字段：participantId 对 NODE_SCHEDULE_CHANGE、RESOURCE_CHANGE、RUN_WARNING 以外的每种类型必填；nodeId 对 RESOURCE_CHANGE、RUN_WARNING 以外的每种类型必填，其中 ROUTE_TRANSITION 的 nodeId 为所进入 Edge 的源 Node ID；edgeId 仅对 ROUTE_TRANSITION 必填；resourceUnitIds 对 SERVICE_START 与 SERVICE_COMPLETE 必填（可为空列表，SERVICE_COMPLETE 的取值与同一次服务的 SERVICE_START 相同），对 RESOURCE_CHANGE 必填且恰含 1 个 Resource_Unit ID；RUN_WARNING 的 participantId 与 nodeId 可选；details 按第 8 条；除此之外的字段不得出现，且 Requirement 31 第 9 条的运行时校验拒绝缺少必填字段或含不得出现字段的 Simulation_Event。
2. THE Schema_Module SHALL 将 Simulation_Event 的 type 限定为以下取值：VISITOR_ARRIVAL、ROUTE_TRANSITION、QUEUE_ENTER、QUEUE_BLOCKED、QUEUE_REROUTED、HOLD_ENTER、HOLD_RELEASE、SERVICE_START、SERVICE_COMPLETE、NODE_SCHEDULE_CHANGE、RESOURCE_CHANGE、VISITOR_COMPLETE、VISITOR_LEAVE、RUN_WARNING，且 Requirement 31 第 9 条的运行时校验拒绝 type 为其他值的 Simulation_Event。
3. THE Simulation_Engine SHALL 使每个 Run_Result 的 Event_Log 满足：第 i 条（i 从 0 开始）Simulation_Event 的 seq 等于 i；i ≥ 1 时其 time 不小于第 i − 1 条的 time；每条的 time 不晚于运行结束时刻。
4. THE Simulation_Engine SHALL 在每个时刻按（类别序号，主体 ID，类内次序）升序逐项处理该时刻的待处理事项（已确定在该时刻发生、尚未处理的仿真步骤），主体 ID 按 Requirement 6 第 12 条比较，各类别的主体与类内次序为：1 服务完成与资源释放，主体为完成服务的 Participant ID；2 资源状态变化，主体为 Resource_Unit ID，同一 Resource_Unit 同时待处理的全部变化合并为一项并按第 9 条记录；3 节点开放与关闭，主体为 Node ID，同一 Node 先处理关闭再处理开放；4 Participant 到达节点，主体为被到达的 Node ID，类内次序为该 Participant 前一条 Simulation_Event 的 seq，在 Entrance 节点的到达（记录 VISITOR_ARRIVAL）没有前一条事件，按 Participant ID 升序，目标为 Merge 节点时按第 10 条；5 Waiting Area 放行，主体为该 Waiting Area 节点 ID，同一节点同时待处理的放行合并为一项；6 分配轮次与服务开始，不分主体，轮次内顺序按 Requirement 27 第 4、5 条；处理一项时直接记录的全部 Simulation_Event 在 Event_Log 中连续出现（例如 SERVICE_COMPLETE 紧接其后的 ROUTE_TRANSITION）。
5. WHEN 处理时刻 t 的待处理事项产生了时刻同为 t 的新待处理事项，THE Simulation_Engine SHALL 把新事项与时刻 t 尚未处理的事项一并按第 4 条排序，并继续每次处理排在最前的一项（新事项可排到尚未处理的事项之前，已处理的事项不重新处理）；时刻 t 不再有类别 1 至 5 的待处理事项时执行一次分配轮次，该轮次产生时刻为 t 的新事项时重复本条，否则推进到下一个存在待处理事项的时刻。
6. FOR ALL 仅在对象键顺序或 Requirement 42 第 2 条所称无序集合的元素顺序上不同的两个 Run_Request，THE Simulation_Engine SHALL 生成条数、顺序与每条 Simulation_Event 全部字段均相同的 Event_Log。
7. THE Simulation_Engine SHALL 在以下每次状态变化发生的时刻记录对应的 Simulation_Event：Participant 在 Entrance 节点到达（VISITOR_ARRIVAL）、进入 Edge（ROUTE_TRANSITION）、进入队列（QUEUE_ENTER，含受阻后被放入）、在节点入口受阻（QUEUE_BLOCKED）、因满员改道（QUEUE_REROUTED）、进入与离开 Waiting Area（HOLD_ENTER、HOLD_RELEASE）、开始与完成服务（SERVICE_START、SERVICE_COMPLETE）、结束流程（VISITOR_COMPLETE 或 VISITOR_LEAVE）、因 Node 到达次数超过 Max_Steps 离开后紧随 VISITOR_LEAVE 的运行警告（RUN_WARNING，Requirement 20 第 9 条）；Resource_Unit 在第 9 条所列状态之间变化（RESOURCE_CHANGE；忙碌与否由 SERVICE_START 与 SERVICE_COMPLETE 表示）；Service 节点开放与关闭（NODE_SCHEDULE_CHANGE）。
8. THE Schema_Module SHALL 为以下类型定义必填的 details，并使其余类型（含以非 Decision 节点为源的 ROUTE_TRANSITION）不含 details：HOLD_RELEASE 含放行原因（until_time、batch_full 或 max_hold，见 Requirement 14 第 8 条）；以 Decision 节点为源的 ROUTE_TRANSITION 含所选 branchKey、路由依据（probability、attribute 或 loop_guard）与 Keyed_Draw 值（路由依据为 probability 时为满足 0 ≤ u < 1 的数，否则为 null，见 Requirement 13 第 7 条）；QUEUE_REROUTED 含目标 Node ID 与改道原因（queue_full、close_redirect 或 late_redirect）；VISITOR_LEAVE 含 Participant_Outcome（rejected、dismissed、diverted 或 loop_limit）与离开原因（queue_full、late_arrival、close_dismiss、exit_diverted 或 max_steps；queue_full 与 late_arrival 对应 rejected，close_dismiss 对应 dismissed，exit_diverted 对应 diverted，max_steps 对应 loop_limit）；RESOURCE_CHANGE 含原状态、新状态（各取第 9 条所列四种状态之一，且二者不同）和非空的原因列表（元素按以下顺序排列并取自：shift_start、shift_end、unavailability_start、unavailability_end、handover_start、handover_end）；NODE_SCHEDULE_CHANGE 含变化方向（open 或 close）；RUN_WARNING 含非空的 code。
9. WHEN 处理某个 Resource_Unit 在时刻 t 的类别 2 事项后其状态与处理前不同，THE Simulation_Engine SHALL 为该 Resource_Unit 在时刻 t 记录恰好一条 RESOURCE_CHANGE，原状态与新状态分别为处理前与处理后的状态，原因列表列出在时刻 t 对其生效的全部边界；状态取可用、交接中、不可用、离岗之一（忙碌只由 SERVICE_START 与 SERVICE_COMPLETE 表示，Workbench 按 Requirement 3 第 5 条将可用显示为空闲或未排岗），多种状态同时成立时按离岗、不可用、交接中、可用的顺序取第一个；Assumption_Override 的资源中断按 Unavailability_Window 计；服务进行中到来的 Shift 结束、Unavailability_Window 开始和 Assignment 时间段开始，推迟到该服务的 SERVICE_COMPLETE 时刻生效（Requirement 25 第 6 条，Requirement 26 第 2、3 条）；时刻 0 的处理前状态为：时刻 0 位于其某个 Shift 内时取可用，否则取离岗；处理前后状态相同时不记录 RESOURCE_CHANGE。
10. WHEN 时刻 t 有两项或更多以同一 Merge 节点为目标的类别 4 事项同时待处理，THE Simulation_Engine SHALL 用 Requirement 15 第 3 条的顺序代替第 4 条的类内次序处理这些事项：先按所经入边在该 Merge 节点入边优先级列表中的位置排序，所经入边相同时按 Participant ID 升序；不经入边到达者（经 Full_Policy 的 reroute 或 Close_Policy 的 redirect）排在最后，并按 Participant ID 升序；目标不是 Merge 节点的到达（包括同一时刻经同一 Merge 节点出边到达其目标 Node 的 Participant）仍按第 4 条的类内次序处理，使其处理顺序与该出边上 ROUTE_TRANSITION 事件的 seq 顺序一致（Requirement 15 第 7 条）。

### Requirement 31: 引擎与界面的数据契约

**User Story:** 作为开发者，我希望引擎的输入输出有固定契约，以便编辑器、引擎和回放可以分别开发并相互验证。

#### Acceptance Criteria

1. THE Schema_Module SHALL 将 Run_Request 定义为以下字段的组合：Schema_Version（必填）、Scenario（必填）、Plan（必填）、Run_Mode（必填，取值为 cutoff 或 run_to_completion）、Max_Steps（可选，取值范围与默认值按 Requirement 20 第 6 条）和事件数上限 maxEvents（可选，1 至 10 000 000 的整数，Run_Request 未给出 maxEvents 时取默认值 1 000 000）。
2. THE Schema_Module SHALL 将 Run_Result 定义为运行 ID（字符串）、状态（succeeded、failed 或 aborted 之一，满足第 6 条时为 failed，满足第 7 条时为 aborted，其余为 succeeded）、Run_Metadata、Event_Log、Statistics（状态为 succeeded 时必填，状态为 failed 或 aborted 时为 null）和运行问题列表（每个条目与 Validation_Issue 具有相同字段）的组合。
3. THE Schema_Module SHALL 在 Run_Metadata 中定义 Model_Version、Schema_Version、Plan ID、Scenario ID、随机种子、Input_Fingerprint、Scenario_Fingerprint、Run_Mode、Max_Steps、maxEvents、Observation_Cutoff、Horizon、覆盖结束时刻（取值见第 11 条）、Provenance 摘要和创建时刻；创建时刻为精确到毫秒的 UTC 墙钟时刻，不是相对 T0 的仿真时刻。
4. FOR ALL Run_Request，THE Simulation_Engine SHALL 在两次执行中生成除运行 ID 与创建时刻外深度相等的 Run_Result，包括状态为 failed 或 aborted 的 Run_Result，以及两次执行时的系统时钟或界面状态不同的情形。
5. THE Simulation_Engine SHALL 仅以 Run_Request 与自身的 Model_Version 作为输入，不读取界面状态、系统时钟或非 Keyed_Draw 的随机源；Run_Result 的运行 ID 与 Run_Metadata 的创建时刻由提交该 Run_Request 的 Workbench 在收到 Simulation_Engine 的输出后写入。
6. IF Schema_Validator 或 Graph_Validator 对 Run_Request（包括其 (Scenario, Plan) 组合，以及 Schema_Version、Run_Mode、Max_Steps 与 maxEvents 字段）返回至少一条 severity 为 error 的 Validation_Issue，THEN THE Simulation_Engine SHALL 不生成任何 Simulation_Event，并返回状态为 failed 的 Run_Result：Event_Log 为空列表，Statistics 为 null，运行问题列表恰好包含两者返回的全部 Validation_Issue（含 severity 为 warning 的条目），Run_Metadata 中无法从 Run_Request 取得合法值的字段为 null。
7. IF Simulation_Engine 在 Event_Log 已含 maxEvents 条 Simulation_Event 时还需记录下一条 Simulation_Event，THEN THE Simulation_Engine SHALL 停止运行并返回状态为 aborted 的 Run_Result：Event_Log 恰为 seq 0 至 maxEvents − 1 的 maxEvents 条 Simulation_Event，且与仅 maxEvents 更大的同一 Run_Request 所生成 Event_Log 的前 maxEvents 条深度相等；Statistics 为 null；运行问题列表含一条 severity 为 error、说明事件数超过 maxEvents 的条目。事件总数恰为 maxEvents 的运行不中止。
8. THE Metrics_Calculator SHALL 仅以状态为 succeeded 的 Run_Result 的 Event_Log 与生成该 Run_Result 的 Run_Request 作为输入计算 Statistics，并对深度相等的两组输入返回深度相等的 Statistics。
9. THE Schema_Validator SHALL 对 Run_Request 与 Run_Result（包括加载已保存的 Run_Result 时）执行运行时校验，为以下每处违规返回一条 severity 为 error 的 Validation_Issue，path 指向违规字段：缺少第 1 至第 3 条定义的必填字段或字段类型不符（第 10 条所列字段只按第 10 条报告）；状态不是 succeeded、failed、aborted 之一；状态为 succeeded 而 Statistics 为 null，或状态为 failed 或 aborted 而 Statistics 不为 null；状态为 failed 而 Event_Log 非空；状态为 aborted 而 Event_Log 条数不等于 Run_Metadata 的 maxEvents；Event_Log 的 seq 不是从 0 开始的连续整数。对无上述违规的输入，THE Schema_Validator SHALL 返回零条 severity 为 error 的 Validation_Issue。
10. IF Run_Request 给出的 maxEvents 不是 1 至 10 000 000 的整数，或 Run_Mode 不是 cutoff 或 run_to_completion，或 Schema_Version 不是 Schema_Module 当前支持的 Schema_Version（Requirement 6 第 7 条），THEN THE Schema_Validator SHALL 为每个此类字段返回一条 severity 为 error 的 Validation_Issue，其 path 指向该字段。
11. THE Simulation_Engine SHALL 按以下规则设置 Run_Metadata 的覆盖结束时刻，并以闭区间 [0, 覆盖结束时刻] 作为该 Run_Result 的覆盖时间范围：状态为 succeeded 且 Run_Mode 为 cutoff 时取 Observation_Cutoff；状态为 succeeded 且 Run_Mode 为 run_to_completion 时取 Requirement 40 第 1 条的停止时刻（不小于 Observation_Cutoff，不大于 Horizon）；状态为 aborted 时取 Event_Log 中最后一个 Simulation_Event 的 time；状态为 failed 时为 null。状态为 succeeded 时该值只由 Run_Request 与 Event_Log 决定，Metrics_Calculator 按同一规则使用。
12. FOR ALL Run_Result，THE Simulation_Engine SHALL 使 Run_Metadata 的字段取以下值（第 6 条规定为 null 的字段除外）：Plan ID 与 Scenario ID 分别等于 Run_Request 中 Plan 与 Scenario 的 ID；随机种子、Run_Mode、Observation_Cutoff、Horizon 与 Schema_Version 等于 Run_Request 中的对应值；Max_Steps 与 maxEvents 等于 Run_Request 给出的值，未给出时等于默认值；Model_Version 等于 Simulation_Engine 自身的 Model_Version；Input_Fingerprint 与 Scenario_Fingerprint 等于 Fingerprint_Function 以该 Run_Request 和该 Model_Version 计算的结果。

### Requirement 32: 回放契约

**User Story:** 作为活动组织者，我希望看到的幽灵动画严格对应计算结果，以便画面不会误导决策。

#### Acceptance Criteria

1. THE Playback SHALL 仅以一个 Run_Result 和生成该 Run_Result 的 Run_Request（由 Workbench 与该 Run_Result 一并保存）作为输入，并从该 Run_Request 的 Plan 中只读取 Layout_Field、显示名称、Node 与 Edge 的 ID、Edge 的源与目标 Node ID、Subflow 节点的成员 Node ID 列表、Service 节点的 Open_Window 列表与 Close_Policy，以及 Requirement 3 第 5 条所需的 Resource_Unit ID、Shift 与 Assignment；对当前 Plan 中仍存在的 Node ID 与 Edge ID，Layout_Field 可取自当前 Plan。该 Run_Result 为 Stale_Result 时同样可以回放（Requirement 5 第 10 条），并按 Requirement 5 第 8 条显示“已过期”标注。
2. THE Playback SHALL 将回放时刻 t（0 ≤ t ≤ T_end，T_end 按 Requirement 3 第 7 条）的画面状态（各幽灵是否显示、所在 Node 或 Edge 与状态，以及 Requirement 3 第 4、第 5 条的 Node 人数、开放状态与 Resource_Unit 状态）定义为按 seq 升序应用 Event_Log 中全部 time ≤ t 的 Simulation_Event 后的结果；除第 5 条插值所用的 t1 外不使用 time 大于 t 的 Simulation_Event，使同一 t 的画面状态与到达 t 的方式（连续播放、向前或向后定位、任一档播放速度）无关。
3. FOR ALL 暂停、继续、播放速度切换、时间轴定位、三级显示之间的切换、选中幽灵、缩放、视口移动、Node 位置移动和 Subflow 折叠状态切换，THE Playback SHALL 使 Run_Result 与操作前深度相等，不提交新的 Run_Request，且不改变该 Run_Result 是否属于 Stale_Result。
4. THE Playback SHALL 为每个显示的幽灵绑定恰好一个 Participant ID，使任一回放时刻 t 每个 Participant ID 至多对应一个幽灵，并只由该 Participant 的 Simulation_Event（RUN_WARNING 除外）中 time ≤ t 且 seq 最大的一条确定幽灵的位置与状态（状态取值见 Requirement 3 第 6 条）：该事件为 ROUTE_TRANSITION 时幽灵位于其 edgeId 所指 Edge 上（位置按第 5 条或第 8 条），否则位于其 nodeId 所指 Node（该 Node 位于折叠的 Subflow 节点内时按第 10 条）；该 Participant 没有 time ≤ t 的 Simulation_Event 时不显示其幽灵。
5. WHILE 回放时刻 t 满足 t0 ≤ t < t1（t0 为某 Participant 一条 ROUTE_TRANSITION 事件的 time，t1 为该 Participant 在该事件之后 seq 最小的 Simulation_Event 的 time），THE Playback SHALL 将其幽灵显示在该事件 edgeId 所指 Edge 的画布路径上、自源 Node 端起路径长度占比为 (t − t0)/(t1 − t0) 的位置；t1 = t0 时该区间为空，幽灵不在该 Edge 上显示。
6. THE Workbench_Spec SHALL 为单个幽灵、部分幽灵加队列计数、节点流量与拥堵摘要三级显示分别定义所绘制的幽灵范围以及 Node 与 Edge 上显示的数值，并规定：部分幽灵加队列计数一级的幽灵选取只由 Run_Result、回放时刻 t 和 Participant ID 决定；三级显示下 Node 上的人数均等于 Requirement 3 第 4 条推导的完整人数；三级之间按一个只由 Run_Result 与 t 计算的指定度量切换，其阈值标注为由后续性能实测确定，并与 Requirement 2 第 8 条“大规模场景性能下降”状态的触发阈值一致。
7. THE Playback SHALL 将 Run_Result 的 Statistics 中的人数（包括 Requirement 34 第 3 条的各 Participant_Outcome 人数与 Requirement 36 第 4 条的统计人数）原样显示为统计人数，不由 Event_Log 或画面上的幽灵另行计算，并在另一位置单独显示回放时刻 t 按当前一级显示所绘制的幽灵数量（含位于视口之外的幽灵）；统计人数不随回放时刻、播放速度、三级显示之间的切换或视口变化。
8. IF 某 Participant 的一条 ROUTE_TRANSITION 事件之后 Event_Log 中再无该 Participant 的 Simulation_Event（Run_Mode 为 cutoff 且其到达目标 Node 的时刻晚于 Observation_Cutoff、运行在 Horizon 停止，或 Run_Result 状态为 aborted 时出现），THEN THE Playback SHALL 在该事件 time 至 T_end 的回放时刻将其幽灵固定显示在该 Edge 的源 Node 端、状态为转移中，且不推算其到达时刻。
9. IF Run_Result 不含 Statistics（例如状态为 aborted），THEN THE Playback SHALL 不显示统计人数，也不由 Event_Log 推算替代值；第 2 条所述的 Node 人数、开放状态与 Resource_Unit 状态照常显示。
10. WHILE 幽灵按第 4 条所在的 Node 是某个处于折叠状态的 Subflow 节点的直接或间接成员，THE Playback SHALL 将该幽灵显示在包含该 Node 的最外层折叠 Subflow 节点的位置；第 5 条中 Edge 的源或目标 Node 属于此情形时，以该 Subflow 节点位置作为相应端点，两端映射到同一位置时幽灵停在该位置。

### Requirement 33: 假设覆盖与压力情景

**User Story:** 作为活动组织者，我希望修改一个关键假设后重新运行两个方案，以便检验结论在不利条件下是否仍然成立。

#### Acceptance Criteria

1. THE Schema_Module SHALL 在 Scenario 中定义可选的来源 Scenario ID（仅记录复制来源，不属于 Simulation_Relevant_Field，指向 Project_Document 中不存在的 Scenario 时不产生 Validation_Issue）和 Assumption_Override 列表，列表每项恰好是以下两类之一：服务时长系数，由系数（大于 0 且不大于 100 的有限数）和可选的 Stage_Key（缺失表示全局系数）组成；资源中断，由资源类别（取值 staff 或 device_type）、资源 ID（资源类别为 staff 时为 Staff ID，为 device_type 时为 Device_Type ID）、数量（仅在资源类别为 device_type 时出现且必填，为 1 至 1000 的整数）和一个 [start, end) 时段组成。
2. THE Simulation_Engine SHALL 对引用该 Scenario 的每个 Plan 以相同规则应用该 Scenario 的全部 Assumption_Override：服务时长等于按 Requirement 12 第 4 条抽样的 F⁻¹(u) 乘以第 5 条确定的有效服务时长系数；资源中断为第 6 条确定的每个受影响 Resource_Unit 各增加一个时段与该资源中断相同的 Unavailability_Window，并按 Requirement 24 第 5 条与 Requirement 26 第 1、2 条处理。
3. IF 资源中断的资源 ID 不在某个 Plan 中与其资源类别对应的列表（staff 对应 Staff 列表，device_type 对应 Device_Type 列表）中，或资源类别为 device_type 的资源中断的数量大于该 Plan 中该 Device_Type 的数量，THEN THE Graph_Validator SHALL 对该 (Scenario, Plan) 组合为每个这样的资源中断返回一条 severity 为 warning 的 Validation_Issue，相关实体 ID 列表包含该 Plan ID 与该资源 ID，path 在资源不存在时指向该资源中断的资源 ID 字段，在数量超出时指向其数量字段。
4. THE Workbench_Spec SHALL 定义压力情景的创建流程，并至少规定：复制所得 Scenario 获得一个在 Project_Document 内唯一的新 Scenario ID，其来源 Scenario ID 等于被复制 Scenario 的 ID，其余 Simulation_Relevant_Field 与被复制 Scenario 相同；用户可随后修改其 Arrival_Stream（到达时刻生成方式与属性分布）和 Assumption_Override；引用来源 Scenario 的 Plan 在新 Scenario 下运行的方式，且整个流程不修改来源 Scenario 及引用它的 Plan；差异列表按字段路径列出该 Scenario 与来源 Scenario 取值不同的每个 Simulation_Relevant_Field 及两侧取值（Participant_Attribute 与 Arrival_Stream 按 ID 配对，Assumption_Override 按列表位置配对，仅一侧存在的条目标为新增或删除），无差异时显示无差异标识，来源 Scenario 不在 Project_Document 中时显示来源不可用标识。
5. THE Simulation_Engine SHALL 将 Service 节点的有效服务时长系数定为 g × s，其中 g 为 Scenario 中未指定 Stage_Key 的服务时长系数，s 为 Stage_Key 等于该节点 Stage_Key 的服务时长系数，不存在的一方取 1，并先计算 g × s 再与 F⁻¹(u) 相乘（例如 g = 2、s = 1.5 时有效系数为 3，仅有 g = 2 时为 2，二者都不存在时为 1）。
6. THE Simulation_Engine SHALL 按以下规则确定资源中断在某个 Plan 中的受影响 Resource_Unit：资源类别为 staff 时，为该 Plan 中 ID 等于资源 ID 的 Staff；资源类别为 device_type 且数量为 q 时，为该 Plan 中 ID 等于资源 ID、数量为 n 的 Device_Type 按 Requirement 6 第 3 条派生的第 1 至第 min(q, n) 个 Resource_Unit（按派生序号 k 选取，不按 ID 字典序，例如 q = 2、n = 12 时为第 1、2 台）；该 Plan 中不存在被引用的 Staff 或 Device_Type，或 n 为 0 时，受影响 Resource_Unit 为空，该资源中断不影响该 Plan 的仿真结果。
7. IF 服务时长系数的系数不是大于 0 且不大于 100 的有限数，或服务时长系数的 Stage_Key 或资源中断的资源 ID 不符合 Requirement 6 第 2 条的 ID 格式，或资源中断的资源类别缺失或不是 staff、device_type 之一，或资源类别为 device_type 的资源中断缺少数量或数量不是 1 至 1000 的整数，或资源类别为 staff 的资源中断含有数量，或资源中断时段的 end 不大于 start，或同一 Scenario 中出现第二个及之后的全局服务时长系数或 Stage_Key 相同的服务时长系数，THEN THE Schema_Validator SHALL 为每个违规字段（重复系数按第二次及之后的每次出现）各返回一条 severity 为 error 的 Validation_Issue，path 指向该字段、时段或重复出现的系数项，相关实体 ID 列表包含所属 Scenario 的 ID。

### Requirement 34: 观察窗口与参与者分类

**User Story:** 作为活动组织者，我希望每个指标都有明确的观察时刻和统计对象，以便不同方案的数字可以直接对比。

#### Acceptance Criteria

1. WHERE Run_Mode 为 cutoff，THE Simulation_Engine SHALL 处理 time 不晚于 Observation_Cutoff 的全部事件（含 Observation_Cutoff 时刻按 Requirement 30 第 5 条新产生的同一时刻事件），在该时刻没有待处理事件后停止，且不记录 time 大于 Observation_Cutoff 的任何 Simulation_Event。
2. THE Metrics_Calculator SHALL 在两种 Run_Mode 下为 cutoff 口径仅依据 time 不晚于 Observation_Cutoff 的 Simulation_Event，为 Base_Population 中每位 Participant 确定恰好一个 Participant_Outcome，按以下顺序取第一条成立的规则：(a) 按 Requirement 6 第 6 条取整到毫秒后的到达时刻晚于 Observation_Cutoff 为 not_arrived；(b) 该 Participant 存在 VISITOR_COMPLETE 或 VISITOR_LEAVE 事件时取其中 seq 最小的一条，VISITOR_COMPLETE 为 completed，VISITOR_LEAVE 为该事件 details 中记录的 Participant_Outcome；(c) 其余为 unfinished。
3. FOR ALL 状态为 succeeded 的 Run_Result 及其 Statistics 中的每个口径，completed、rejected、dismissed、diverted、loop_limit 与 unfinished 人数之和 SHALL 等于该口径的已到达人数（cutoff 口径为 Event_Log 中 time 不晚于 Observation_Cutoff 的 VISITOR_ARRIVAL 事件数，completion 口径为 time 不晚于覆盖结束时刻的 VISITOR_ARRIVAL 事件数），且 Base_Population 人数 SHALL 等于该口径的已到达人数与 not_arrived 人数之和。
4. THE Metrics_Calculator SHALL 为 cutoff 口径下每位 unfinished Participant 输出一条记录，包含 Participant ID、所在位置（恰好一个 Node ID 或一个 Edge ID）和状态；位置与状态由该 Participant time 不晚于 Observation_Cutoff 的 Simulation_Event 中 seq 最大的一条确定：QUEUE_ENTER 为排队中、QUEUE_BLOCKED 为受阻、HOLD_ENTER 为等候放行、SERVICE_START 为服务中，位置取该事件的 nodeId；ROUTE_TRANSITION 为转移中，位置取该事件的 edgeId；记录按 Participant ID 升序排列，条数等于 cutoff 口径的 unfinished 人数；Requirement 40 第 3 条在 completion 口径下输出的位置与状态以覆盖结束时刻代替 Observation_Cutoff，采用同一规则。
5. THE Metrics_Calculator SHALL 在 Statistics 的每个统计值上标注统计口径（cutoff 或 completion）和时间窗口（cutoff 口径为 [0, Observation_Cutoff]，completion 口径为 [0, 覆盖结束时刻]（Requirement 31 第 11 条），均以秒数表示），且 Run_Mode 为 cutoff 时全部统计值的口径均为 cutoff。
6. WHERE Run_Mode 为 run_to_completion，THE Metrics_Calculator SHALL 为 completion 口径按第 2 条的规则与顺序、以覆盖结束时刻代替 Observation_Cutoff、仅依据 time 不晚于覆盖结束时刻的 Simulation_Event，为 Base_Population 中每位 Participant 确定恰好一个 Participant_Outcome。
7. IF Run_Result 中某条 VISITOR_LEAVE 事件的 details 未记录 Participant_Outcome，或所记录的值不是 rejected、dismissed、diverted、loop_limit 之一，THEN THE Schema_Validator SHALL 为每条这样的事件返回一条 severity 为 error 的 Validation_Issue，其相关实体 ID 列表包含该事件的 participantId，path 指向该事件 details 中记录 Participant_Outcome 的字段。
8. THE Golden_Case_Suite SHALL 包含标注 Requirement 34、Run_Mode 为 cutoff 的 Golden_Case，共同覆盖以下情况：取整后到达时刻等于 Observation_Cutoff 的 Participant；取整后到达时刻晚于 Observation_Cutoff 的 Participant；VISITOR_COMPLETE 时刻等于 Observation_Cutoff 的 Participant；SERVICE_START 早于 Observation_Cutoff 而服务结束时刻晚于 Observation_Cutoff 的 Participant；状态为排队中、受阻、等候放行、转移中的 unfinished Participant 各至少 1 位。期望值包含每位 Participant 的 cutoff 口径 Participant_Outcome、各 Participant_Outcome 人数、已到达人数和第 4 条的 unfinished 记录列表；其中至少 1 个 Golden_Case 还须给出同一输入以 run_to_completion 模式运行时 completion 口径的 Participant_Outcome。

### Requirement 35: 参与者经历

**User Story:** 作为活动组织者，我希望查看某位参与者的完整经历，以便理解总体指标背后的个体差异。

#### Acceptance Criteria

1. THE Schema_Module SHALL 定义 Participant 经历记录，包含 Participant ID 和访问条目列表：该 Participant 的每一次 Node 到达（计数口径同 Requirement 20 第 7 条，同一 Node 的多次到达各对应一条）对应一条访问条目，条目按本次访问中该 Participant 第一条 Simulation_Event 的 seq 升序排列；每条访问条目包含 Node ID、到达时刻、入队时刻（本次访问的 QUEUE_ENTER 或 HOLD_ENTER 事件时刻）、开始服务时刻（本次访问的 SERVICE_START 事件时刻）、结束时刻（该 Participant 进入该 Node 的出边、经 Full_Policy reroute 或 Close_Policy redirect 被送往其他 Node，或在该 Node 记录 VISITOR_COMPLETE 或 VISITOR_LEAVE 的时刻）、Requirement 36 第 2 条的排队等待、受阻等待、等候放行三个分项及排队等待中节点关闭期间的部分（取值按第 4 条，各为非负秒数或 null），以及本次访问 SERVICE_START 事件 resourceUnitIds 所列的 Resource_Unit ID 列表（保持事件中的顺序，无 SERVICE_START 事件时为空列表）；入队时刻、开始服务时刻或结束时刻所对应的情形在 Event_Log 中未发生时，该字段为 null。
2. THE Playback SHALL 仅由以下内容生成某 Participant 的 Participant 经历记录，不读取 Statistics：Run_Result 的 Event_Log 中 participantId 为该 Participant ID 的 Simulation_Event、该 Participant 所访问 Service 节点的 NODE_SCHEDULE_CHANGE 事件、Run_Metadata 中的 Observation_Cutoff，以及生成该 Run_Result 的 Run_Request 中这些 Service 节点的 Open_Window 列表与 Close_Policy（用于按第 4 条判定节点是否可开始服务），使同一 Run_Result、同一 Run_Request 与同一 Participant ID 生成的记录深度相等。
3. FOR ALL 状态为 succeeded 的 Run_Result 与 Base_Population 中的每位 Participant，该 Participant 的 Participant 经历记录中全部访问条目的排队等待之和、受阻等待之和、等候放行之和与节点关闭期间部分之和 SHALL 在按 Requirement 6 第 6 条取整到毫秒后，分别等于 Statistics 中该 Participant 记录（Requirement 23 第 7 条）在 cutoff 口径下的对应分项。
4. THE Playback SHALL 将每条访问条目的各 Waiting_Time 分项计算为本次访问中对应时段与 Observation_Window 交集的长度（单位秒；本次访问未出现对应时段时为 0）：受阻等待自 QUEUE_BLOCKED 事件时刻至 QUEUE_ENTER 或 HOLD_ENTER 事件时刻；排队等待自 QUEUE_ENTER 事件时刻至 SERVICE_START 事件时刻；等候放行自 HOLD_ENTER 事件时刻至 HOLD_RELEASE 事件时刻；节点关闭期间的部分为排队等待时段中该 Service 节点不可开始服务的部分，定义与 Requirement 36 第 9 条相同（不满足 Requirement 11 第 10 条的时段；关闭后继续服务阶段不计入）；上述终点事件在本次访问中不存在时，终点取该访问条目的结束时刻，结束时刻为 null 时取 Observation_Cutoff。
5. IF Run_Result 状态为 aborted，THEN THE Playback SHALL 仍按第 1 条从已生成的 Event_Log 生成 Participant 经历记录，并将每条访问条目的四项 Waiting_Time 分项均设为 null。
6. THE Golden_Case_Suite SHALL 包含至少 1 个标注 Requirement 35、Run_Mode 为 cutoff 的 Golden_Case，给出若干 Participant 的期望 Participant 经历记录（含每条访问条目的全部字段）和 Statistics 中这些 Participant 的期望 Waiting_Time 分项，且这些 Participant 共同覆盖以下情形：同一 Node 到达 2 次及以上；在 Service 节点受阻后入队；在 Service 节点关闭期间排队；在 Waiting Area 节点等候放行；Observation_Cutoff 时仍在排队的 unfinished Participant；访问条目列表为空的 not_arrived Participant。

### Requirement 36: 等待时间口径

**User Story:** 作为活动组织者，我希望等待时间的计算方式明确，并包含尚未完成的参与者，以便不会因遗漏排队者而低估等待。

#### Acceptance Criteria

1. THE Metrics_Calculator SHALL 将 Participant 的 Waiting_Time（单位秒）定义为其排队中、受阻、等候放行区间与计算区间 [到达时刻, 上界) 交集的长度之和：排队中区间始于该 Participant 的 QUEUE_ENTER 事件，受阻区间始于其 QUEUE_BLOCKED 事件，等候放行区间始于其 HOLD_ENTER 事件，每个区间止于该 Participant 按 seq 排列的下一条 Simulation_Event（RUN_WARNING 除外）的时刻，不存在下一条时止于上界；到达时刻为其 VISITOR_ARRIVAL 事件时刻；上界在 cutoff 口径下为 min(终结时刻, Observation_Cutoff)，在 completion 口径（Requirement 40）下为 min(终结时刻, 覆盖结束时刻)；终结时刻为其 VISITOR_COMPLETE 或 VISITOR_LEAVE 事件时刻，没有此类事件时按 +∞ 计。
2. THE Metrics_Calculator SHALL 为每位 Participant 输出排队等待、受阻等待、等候放行三个分项（分别为其排队中、受阻、等候放行区间按第 1 条截断后的长度之和）以及排队等待中节点关闭期间的部分（第 9 条）；三个分项之和等于该 Participant 的 Waiting_Time，节点关闭期间的部分是排队等待分项的子项，不另计入该和。
3. THE Metrics_Calculator SHALL 不将服务中时长（SERVICE_START 至同一 Participant 在同一 Node 的 SERVICE_COMPLETE）与转移中时长（ROUTE_TRANSITION 至该 Participant 的下一条 Simulation_Event）计入 Waiting_Time 或第 2 条的任一分项。
4. THE Metrics_Calculator SHALL 在 cutoff 口径下以全部已到达 Participant（Participant_Outcome 为 completed、rejected、dismissed、diverted、loop_limit 或 unfinished，不含 not_arrived）为统计对象，输出其 Waiting_Time 的算术平均作为 Average Waiting（单位秒，Statistics 中不取整），同时输出统计人数 n，并将统计对象标注为“全部已到达”。
5. THE Metrics_Calculator SHALL 以最近秩法计算 P90 Waiting：将统计对象的 Waiting_Time 升序排列（位次从 1 开始，相等值各占一个位次），取第 ⌈0.9·n⌉ 位的值，n 为统计人数（例如 n = 1 取唯一值，n = 10 取第 9 位，n = 11 取第 10 位）。
6. IF 第 4、第 7 或第 8 条中某一组等待指标的统计人数为 0，THEN THE Metrics_Calculator SHALL 将该组的 Average Waiting 与 P90 Waiting 输出为 null，并将该组统计人数输出为 0。
7. THE Metrics_Calculator SHALL 在 cutoff 口径下另外以 Participant_Outcome 为 completed 的 Participant 为统计对象，按第 4、第 5 条的方法输出一组 Average Waiting、P90 Waiting 与统计人数，并将该组的统计对象标注为“仅 completed”。
8. THE Metrics_Calculator SHALL 为按 Subflow_Flattener 展开后的 Plan 中每个 Service 节点与每个 Waiting Area 节点，以及这些 Service 节点使用的每个 Stage_Key，各输出一组 cutoff 口径的 Average Waiting、P90 Waiting 与统计人数（包括没有 Participant 到达的 Node 与 Stage_Key），计算方法与第 4 至第 6 条相同，统计对象与取值按第 10 条确定。
9. THE Metrics_Calculator SHALL 将 Participant 的排队等待中节点关闭期间的部分计算为其排队中区间按第 1 条截断后、落在所在 Service 节点不可开始服务时段（即不满足 Requirement 11 第 10 条的时段）内的总长度；据此 Open_Window 列表为空的 Service 节点上该部分为 0，Close_Policy 排队者处理方式为 serve 的关闭后继续服务阶段不计入该部分。
10. THE Metrics_Calculator SHALL 在第 8 条中以至少有一条 nodeId 属于该组 Node（按 Stage_Key 时为使用该 Stage_Key 的全部 Service 节点）且 time 不晚于 Observation_Cutoff 的 Simulation_Event 的已到达 Participant 为该组统计对象，并以其在该组 Node 上全部访问中排队中、受阻、等候放行区间按第 1 条截断后的长度之和为其取值；每个区间计入其起始事件 nodeId 所指的 Node（例如到达即被 Full_Policy 拒绝或改道的 Participant 计入统计对象，取值为 0）。
11. THE Golden_Case_Suite SHALL 包含标注 Requirement 36 的 Golden_Case，其期望统计值共同覆盖：在 Service 节点第一个 Open_Window 的 openAt 之前进入队列的 Participant 的排队等待及其节点关闭期间的部分；受阻后被放入队列的 Participant 的受阻等待与排队等待分项；同一 Participant 两次访问同一 Service 节点时该 Node 的等待取值；没有 Participant 到达的 Service 节点输出 null 与统计人数 0。

### Requirement 37: 吞吐量与队列长度口径

**User Story:** 作为活动组织者，我希望吞吐量和队列长度有统一单位和计算方式，以便识别拥堵时段。

#### Acceptance Criteria

1. THE Metrics_Calculator SHALL 将 cutoff 口径的系统吞吐量计算为 Event_Log 中 time 不晚于 Observation_Cutoff（即落在 Observation_Window [0, Observation_Cutoff] 内）的 VISITOR_COMPLETE 事件数除以 Observation_Cutoff / 3600，单位为人/小时，Statistics 中不取整；VISITOR_LEAVE 事件不计入（例如 Observation_Cutoff 为 5400、此类 VISITOR_COMPLETE 事件为 30 条时，系统吞吐量为 20）。
2. THE Metrics_Calculator SHALL 为按 Subflow_Flattener 展开后的 Plan 中每个 Service 节点，将 cutoff 口径的节点吞吐量计算为 nodeId 为该节点且 time 不晚于 Observation_Cutoff 的 SERVICE_COMPLETE 事件数除以 Observation_Cutoff / 3600，单位为人次/小时，Statistics 中不取整；同一 Participant 在该节点的每次服务各计 1 人次，没有此类事件的 Service 节点输出 0。
3. THE Metrics_Calculator SHALL 以 Scenario 统计设置中的 Metric_Bucket 时长 b（缺失时取 900 秒）将 Observation_Window 划分为 ⌈Observation_Cutoff / b⌉ 个时间桶，第 k 个（k 从 0 开始）为 [k·b, min((k+1)·b, Observation_Cutoff))，最后一个时间桶另含 Observation_Cutoff 时刻本身；并为每个时间桶输出 cutoff 口径的开始时刻、结束时刻、time 落在该桶内的 VISITOR_COMPLETE 事件数，以及展开后 Plan 中每个 Service 节点 time 落在该桶内的 SERVICE_COMPLETE 事件数（无事件时为 0），使各时间桶的计数之和分别等于第 1 条与第 2 条所用的事件数（例如 Observation_Cutoff 为 2000、b 为 900 时，时间桶为 [0, 900)、[900, 1800)、[1800, 2000]）。
4. THE Metrics_Calculator SHALL 将按 Subflow_Flattener 展开后的 Plan 中 Service 节点在时刻 t 的队列长度 L(t) 定义为以下 Participant 的人数：其 time 不晚于 t 的 Simulation_Event（RUN_WARNING 除外）中 seq 最大的一条是 nodeId 为该节点的 QUEUE_ENTER；据此 L(t) 取时刻 t 全部 Simulation_Event 记录完成后的值，服务中、受阻与已按 Close_Policy 离开队列的 Participant 不计入，在同一时刻记录 QUEUE_ENTER 与 SERVICE_START 的 Participant 不计入任何时刻的 L(t)。
5. THE Metrics_Calculator SHALL 为展开后 Plan 中每个 Service 节点输出 cutoff 口径的时间加权平均队列长度 (1/T_cut)·∫₀^T_cut L(t) dt（单位为人，Statistics 中不取整）与最大队列长度 max{L(t) | 0 ≤ t ≤ T_cut}（整数），L(t) 按第 4 条；没有 Participant 到达的 Service 节点两项均为 0（例如 T_cut 为 1800、L(t) 在 [0, 600) 为 3、在 [600, 1800] 为 0 时，平均队列长度为 1，最大队列长度为 3）。
6. THE Metrics_Calculator SHALL 为展开后 Plan 中每个 Service 节点输出 cutoff 口径的队列长度变化点序列，并为每个 Service 与 Waiting Area 节点输出 cutoff 口径的受阻人数变化点序列；时刻 t 的受阻人数为 time 不晚于 t 的 Simulation_Event（RUN_WARNING 除外）中 seq 最大的一条是 nodeId 为该节点的 QUEUE_BLOCKED 的 Participant 人数；每个序列由（时刻，人数）点组成，首点为时刻 0 及该时刻的人数，此后在 (0, Observation_Cutoff] 内人数与前一点不同的每个时刻各有一点，按时刻严格升序排列，使同一时刻至多一个点且相邻两点人数不同。
7. WHERE Run_Mode 为 run_to_completion，THE Metrics_Calculator SHALL 另按 completion 口径输出第 1、第 2、第 3、第 5 和第 6 条的全部指标，计算方法不变，但仅依据 time 不晚于覆盖结束时刻 T_cov（Requirement 31 第 11 条）的 Simulation_Event 并以 T_cov 代替 Observation_Cutoff：吞吐量除以 T_cov / 3600，时间桶为 ⌈T_cov / b⌉ 个且最后一个含 T_cov 时刻，时间加权平均队列长度为 (1/T_cov)·∫₀^T_cov L(t) dt；全部 Participant 在 Horizon 之前获得终结结局时，T_cov 为 Requirement 40 第 1 条的停止时刻。
8. THE Golden_Case_Suite SHALL 包含标注 Requirement 37 的 Golden_Case，给出第 1 至第 6 条全部指标的期望值，共同覆盖以下情形：Observation_Cutoff 为 Metric_Bucket 时长的整数倍且有 VISITOR_COMPLETE 事件的 time 等于 Observation_Cutoff（该事件计入最后一个时间桶）；Observation_Cutoff 不是 Metric_Bucket 时长的整数倍（最后一个时间桶短于 Metric_Bucket 时长）；同一时刻记录 QUEUE_ENTER 与 SERVICE_START 的 Participant；按 Close_Policy 的 dismiss 离开队列的 Participant；Waiting Area 节点上的受阻 Participant；没有 Participant 到达的 Service 节点。其中至少 1 个 Golden_Case 还须给出同一输入以 run_to_completion 模式运行、全部 Participant 在 Horizon 之前获得终结结局时第 7 条 completion 口径的期望值，且该输入含 SERVICE_START 早于 Observation_Cutoff 而 SERVICE_COMPLETE 晚于 Observation_Cutoff 的服务。

### Requirement 38: 资源利用率口径

**User Story:** 作为活动组织者，我希望资源利用率排除不在岗和不可用时间，以便公平判断人手和设备是否闲置。

#### Acceptance Criteria

1. THE Metrics_Calculator SHALL 为 Plan 中每个 Staff 以及每个 Device_Type 按 Requirement 6 第 3 条派生的每个 Resource_Unit，在 cutoff 口径（Run_Mode 为 run_to_completion 时另在 completion 口径）下输出利用率，定义为该口径时间窗口内忙碌时长 ÷（忙碌时长 + 可用且空闲时长），取值为 0 至 1 之间的数且不取整；时间窗口在 cutoff 口径为 [0, Observation_Cutoff]，在 completion 口径为 [0, Run_Metadata 的覆盖结束时刻]（Requirement 31 第 11 条），本 Requirement 中各时长均为对应时刻集合与时间窗口交集的长度（秒）。
2. THE Metrics_Calculator SHALL 将时间窗口内的每个时刻 t 按以下顺序归入第一个成立的类别，使每个时刻恰好属于一类：忙碌，即 t 位于 resourceUnitIds 含该 Resource_Unit 的某次服务的占用区间（Requirement 27 第 1 条）内，包括加班期间以及 Requirement 26 第 2 条计为忙碌的 [s, c)；离岗、不可用或交接中，即该 Resource_Unit time 不晚于 t 的最近一条 RESOURCE_CHANGE 事件的新状态为其中之一，不存在此类事件时取 Requirement 30 第 9 条规定的时刻 0 处理前状态；未排岗（第 6 条）；其余为可用且空闲（包括其可服务的 Service 节点均关闭或队列为空的时刻）；只有忙碌与可用且空闲计入利用率分母。
3. IF 某个 Resource_Unit 在某口径下的利用率分母为 0（例如其 Shift 列表为空，或时间窗口内全部时刻均归为离岗、不可用、交接中或未排岗），THEN THE Metrics_Calculator SHALL 将该 Resource_Unit 在该口径下的利用率输出为 null，并照常输出第 5 条的四项时长。
4. THE Metrics_Calculator SHALL 在每个口径下为 Plan 中每个 Device_Type 和 Skill 目录中每个 Skill 输出汇总利用率，取值为组内各 Resource_Unit 忙碌时长之和 ÷ 组内（忙碌时长 + 可用且空闲时长）之和，不取整；Device_Type 组为该 Device_Type 派生的全部 Resource_Unit，Skill 组为 Skill ID 列表含该 Skill ID 的全部 Staff（具备多个 Skill 的 Staff 以其全部时长计入每个所属组，不区分其服务占用的是哪个需求项）；组内没有 Resource_Unit 或分母之和为 0 时输出 null。
5. THE Metrics_Calculator SHALL 在每个口径下为每个 Resource_Unit 输出以下四项时长（单位秒，不存在对应时刻时为 0）：Handover 总时长，即第 2 条归为交接中的时长（Handover 与离岗或不可用重叠的部分不计入）；不可用总时长，即归为不可用的时长（Requirement 26 第 2 条计为忙碌的 [s, c) 不计入）；加班总时长，即归为忙碌且不在该 Resource_Unit 任何 Shift 内（设备取所属 Device_Type 的 Shift 列表）的时长；未排岗时长，即归为未排岗的时长。
6. THE Metrics_Calculator SHALL 将同时满足以下条件的时刻 t 归为未排岗：t 不属于第 2 条的忙碌、离岗、不可用或交接中；该 Resource_Unit 在 Plan 中有 Assignment；t 不在该 Assignment 的任何时间段 [from, to) 内（Requirement 25 第 4 条，未设置 to 的时间段没有结束时刻），或 t 所在时间段的可服务 Node ID 列表为空。没有 Assignment 的 Resource_Unit 不产生未排岗时刻；可服务 Node ID 列表非空的时间段内也不产生未排岗时刻，即使所列 Node 都不含该 Resource_Unit 可满足的需求项。
7. THE Golden_Case_Suite SHALL 包含标注 Requirement 38、满足 Requirement 45 第 4 条的 Golden_Case，给出每个 Resource_Unit 的期望利用率与第 5 条四项时长，以及第 4 条的期望汇总利用率，并共同覆盖以下情形：Unavailability_Window 在服务中开始；Shift 在服务中结束且加班总时长大于 0；Handover 与离岗或不可用时段重叠；两个 Assignment 时间段之间存在未排岗时段；利用率分母为 0 时输出 null；具备 2 个 Skill 的 Staff 同时计入两个 Skill 组；Run_Mode 为 run_to_completion 时 cutoff 口径与 completion 口径的利用率不同。

### Requirement 39: 瓶颈时长口径

**User Story:** 作为活动组织者，我希望知道每个环节持续受限的时长和时段，以便定位问题并追溯到具体事件。

#### Acceptance Criteria

1. THE Metrics_Calculator SHALL 判定 Service 节点 N 在应用至 seq k 后的状态（按 seq 升序应用 seq 不大于 k 的全部 Simulation_Event 后的状态；未应用任何事件时为初始状态）下受限，当且仅当同时满足以下两项：(a) N 可开始服务（Requirement 11 第 10 条），其中开放与否取已应用的 nodeId 为 N 的最近一条 NODE_SCHEDULE_CHANGE 的方向，不存在此类事件时为开放（Requirement 29 第 11 条），Close_Policy 排队者处理方式为 serve 的关闭后继续服务阶段（Requirement 29 第 5 条）计为可开始服务；(b) N 的排队中人数与受阻人数之和不小于 Scenario 统计设置中的瓶颈阈值（Requirement 7 第 1 条，缺失时取 1）。排队中与受阻的 Participant 分别指：该 Participant 已应用的 Simulation_Event（RUN_WARNING 除外）中 seq 最大的一条为 nodeId 等于 N 的 QUEUE_ENTER（排队中）或 QUEUE_BLOCKED（受阻）；服务中的 Participant 不计入。N 在时刻 t 受限，指应用 time 不晚于 t 的全部 Simulation_Event 后的状态受限；据此，在同一时刻先记录 QUEUE_ENTER、再记录 SERVICE_START 的 Participant 不使 N 在该时刻受限。
2. THE Metrics_Calculator SHALL 为按 Subflow_Flattener 展开后的 Plan 中每个 Service 节点输出受限总时长（秒）和受限区间列表；没有受限区间的节点输出 0 与空列表。受限区间取 N 按第 1 条在时刻上受限的极大时段 [s, e)，与该统计值所属时间窗口求交集：cutoff 口径的窗口为 Observation_Window，completion 口径的窗口为 [0, 覆盖结束时刻]（Requirement 34 第 5 条）。长度为 0 的交集不输出。列表按 s 升序排列，受限总时长等于各区间长度之和。每个区间记录 s、e、开始 seq 和结束 seq：开始 seq 为 time 等于 s 的 Simulation_Event 中、应用后使状态由不受限变为受限的 seq 最大的一条；结束 seq 为 time 等于 e 的 Simulation_Event 中、应用后使状态由受限变为不受限的 seq 最大的一条。N 在窗口右端时刻仍受限、区间因此止于窗口右端时，结束 seq 为 null。
3. THE Metrics_Calculator SHALL 为第 2 条的每个受限区间（Service 节点 N，开始时刻 s）输出资源不足需求项列表和可完整满足标志，二者均按应用 time 不晚于 s 的全部 Simulation_Event 后的状态判定。资源不足需求项列表按需求项声明顺序（Requirement 24 第 3 条），列出满足以下条件的需求项在 Resource_Requirement 中的序号（从 0 开始）：可满足该需求项（Requirement 24 第 9 条）、且为 N 在 s 的可分配 Resource_Unit（Requirement 27 第 2 条）的 Resource_Unit 个数，小于该需求项的数量。可完整满足标志表示 N 的 Resource_Requirement 在 s 是否可完整满足（Requirement 27 第 2 条）。Resource_Requirement 为空列表时，列表为空且标志为 true。例如 Requirement 27 第 2 条示例中仅 X 可分配时，列表为空且标志为 false。
4. THE Metrics_Calculator SHALL 为按 Subflow_Flattener 展开后的 Plan 中每个 Waiting Area 节点 W 输出满员总时长（秒）和满员区间列表。W 在应用至某个 seq 后的状态下满员，当且仅当其 Queue_Capacity 不为 null，且满足以下条件的 Participant 人数不小于 Queue_Capacity（Requirement 28 第 2 条，不含受阻者）：该 Participant 已应用的 Simulation_Event（RUN_WARNING 除外）中 seq 最大的一条为 nodeId 等于 W 的 HOLD_ENTER。区间的时间窗口、截断、排序、总时长、开始 seq 与结束 seq 规则与第 2 条相同，以满员代替受限。Queue_Capacity 为 null 的节点输出 0 与空列表。
5. THE Metrics_Calculator SHALL 为按 Subflow_Flattener 展开后的 Plan 中每个 Service 节点输出关闭期间积压总时长（秒）和关闭期间积压区间列表。N 在应用至某个 seq 后的状态下处于关闭期间积压，当且仅当 N 不可开始服务（不满足第 1 条 (a)），且其排队中人数与受阻人数之和不小于 1（人数口径同第 1 条，不使用瓶颈阈值）。区间规则与第 2 条相同，以关闭期间积压代替受限。据此，Open_Window 列表为空的节点、以及 Close_Policy 排队者处理方式为 serve 的关闭后继续服务阶段，均不产生关闭期间积压；同一 Service 节点的受限区间与关闭期间积压区间互不相交。
6. THE Golden_Case_Suite SHALL 包含标注 Requirement 39、Run_Mode 为 cutoff 的 Golden_Case，给出第 2 至第 5 条的期望输出（含每个区间的 s、e、开始 seq 与结束 seq），共同覆盖以下情形：(a) 至少 2 位 Participant 在 Service 节点第一个 Open_Window 的 openAt 之前入队，且 openAt 时只有 1 位能开始服务，openAt 之前的时段只计入关闭期间积压，自 openAt 起的时段只计入受限；(b) Close_Policy 排队者处理方式为 serve 的节点在最后一个 Open_Window 的 closeAt 仍有排队者，受限区间跨过 closeAt，止于该节点排队中与受阻人数均为 0 的时刻；(c) 资源空闲时 Participant 在同一时刻记录 QUEUE_ENTER 与 SERVICE_START，不产生受限区间；(d) 瓶颈阈值为 2 时，排队中与受阻人数之和为 1 的时段不计入受限；(e) 在 Observation_Cutoff 时仍受限的区间，其 e 为 Observation_Cutoff 且结束 seq 为 null；(f) 资源不足需求项列表非空的受限区间，以及 Requirement 27 第 2 条示例中仅 X 可分配、列表为空且可完整满足标志为 false 的受限区间；(g) Queue_Capacity 不为 null 的 Waiting Area 节点的满员区间。

### Requirement 40: 运行到完成模式

**User Story:** 作为活动组织者，我希望在截止时刻统计之外，还能看到全部参与者完成流程后的最终结果，并区分两种口径。

#### Acceptance Criteria

1. WHERE Run_Mode 为 run_to_completion，THE Simulation_Engine SHALL 按 Requirement 30 第 4、5 条处理事件，在停止时刻的全部待处理事项（含该时刻按 Requirement 30 第 5 条新产生的同一时刻事项）处理完毕后停止，且不记录 time 大于停止时刻的任何 Simulation_Event；停止时刻取 Observation_Cutoff 与“Base_Population 中每位 Participant 都已记录 VISITOR_COMPLETE 或 VISITOR_LEAVE 事件的最早时刻”（Base_Population 为空时该时刻为 0）中的较大者；处理完 Horizon 时刻的待处理事项后仍有 Participant 未记录这两类事件时，停止时刻取 Horizon。
2. WHERE Run_Mode 为 run_to_completion，THE Metrics_Calculator SHALL 在 Statistics 中同时输出 cutoff 口径与 completion 口径两组统计值，并按 Requirement 34 第 5 条标注每个统计值的口径与时间窗口：cutoff 口径包含 Run_Mode 为 cutoff 时 Statistics 所含的全部统计值（取值按第 6 条）；completion 口径只包含 Requirement 34 第 3 条的各 Participant_Outcome 人数与已到达人数、Requirement 23 第 7 条的每位 Participant 记录（Participant_Outcome 按 Requirement 34 第 6 条，Waiting_Time 分项按 Requirement 36 第 1、2 条的 completion 口径上界）、第 3 条所列统计值，以及 Requirement 28 第 7 条、Requirement 37 第 7 条、Requirement 38 第 1、4、5 条与 Requirement 39 第 2 至 5 条为 completion 口径规定的统计值；其余统计值（包括 Requirement 36 第 4、7、8 条的等待指标）只按 cutoff 口径输出。
3. WHERE Run_Mode 为 run_to_completion，THE Metrics_Calculator SHALL 在 completion 口径下输出：(a) 以 completion 口径 Participant_Outcome 为 completed 的 Participant 为统计对象、Waiting_Time 按 Requirement 36 第 1 条以 min(终结时刻, 覆盖结束时刻) 为上界、按 Requirement 36 第 4 至第 6 条方法计算的 Average Waiting、P90 Waiting 与统计人数，统计对象标注为“仅 completed”；(b) Event_Log 中 VISITOR_COMPLETE 事件的最大 time（不存在 VISITOR_COMPLETE 时为 null）；(c) completion 口径下每位 unfinished Participant 的一条记录，含 Participant ID 以及按 Requirement 34 第 4 条、以覆盖结束时刻代替 Observation_Cutoff 确定的所在位置与状态，记录按 Participant ID 升序排列，条数等于 completion 口径的 unfinished 人数（没有 unfinished Participant 时为空列表）。
4. FOR ALL 仅 Run_Mode 不同的两个 Run_Request（含任一次运行状态为 aborted 的情形），以 cutoff 模式生成的 Event_Log SHALL 与以 run_to_completion 模式生成的 Event_Log 中 time 不晚于 Observation_Cutoff 的全部 Simulation_Event 条数相同、顺序相同，且逐条 seq、time、type、participantId、nodeId、edgeId、resourceUnitIds 与 details 均相同。
5. IF Scenario 的 Horizon 小于 Observation_Cutoff（按取整前的数值比较；两者任一已按 Requirement 6 第 5 条或 Requirement 7 第 7 条返回 error 时不执行本检查），THEN THE Schema_Validator SHALL 返回一条 severity 为 error 的 Validation_Issue，path 指向该 Scenario 的 Horizon 字段，相关实体 ID 列表包含该 Scenario ID；本检查对 Run_Mode 为 cutoff 的 Run_Request 同样执行，Horizon 等于 Observation_Cutoff 时不返回 Validation_Issue。
6. FOR ALL 仅 Run_Mode 不同、两次运行状态均为 succeeded 的两个 Run_Request，以 run_to_completion 模式所得 Statistics 中 cutoff 口径的全部统计值（含口径与时间窗口标注）SHALL 与以 cutoff 模式所得 Statistics 的全部统计值深度相等。
7. THE Golden_Case_Suite SHALL 包含标注 Requirement 40、Run_Mode 为 run_to_completion 的 Golden_Case，共同覆盖以下情形：(a) 全部 Participant 在 Observation_Cutoff 之后、Horizon 之前结束，且该时刻之后、Horizon 之前另有一个 Shift 结束（期望 Event_Log 不含对应的 RESOURCE_CHANGE）；(b) 全部 Participant 在 Observation_Cutoff 之前结束，且结束时刻至 Observation_Cutoff 之间有 NODE_SCHEDULE_CHANGE 或 RESOURCE_CHANGE 事件；(c) Horizon 时刻仍有 Participant 处于排队中，且至少 1 位 Participant 的到达时刻晚于 Horizon；(d) 到达时刻晚于 Observation_Cutoff 且不晚于 Horizon、completion 口径为 completed 的 Participant；(e) Observation_Cutoff 时处于排队中、之后 completed 的 Participant，其两种口径的 Waiting_Time 不同。期望值包含期望的 Simulation_Event 序列、Run_Metadata 的覆盖结束时刻、两种口径的各 Participant_Outcome 人数以及第 3 条的全部统计值。

### Requirement 41: 数据来源标签

**User Story:** 作为活动组织者，我希望知道哪些参数来自估计、哪些来自实测，以便在实际使用前确认关键假设。

#### Acceptance Criteria

1. THE Schema_Module SHALL 为以下对象各定义一个必填的 Provenance：Arrival_Stream；total_in_window、preset_profile 与 bucketed 模型 Arrival_Stream 中每个 Participant_Attribute 的取值概率分布（Requirement 21 第 3 条）；Service 节点的服务时长分布；Edge 的转移时长（Edge 未给出转移时长时不含 Provenance）；Staff；Device_Type；每个 Open_Window。Provenance 由必填的 kind（synthetic、user_estimate、measured、historical 之一）、可选来源说明和可选备注组成，来源说明与备注均为长度 0 至 1000 个 Unicode 码点的字符串；kind 属于 Simulation_Relevant_Field，来源说明与备注不属于 Simulation_Relevant_Field。
2. WHEN 用户在 Workbench 中创建第 1 条所列的对象（包括为原本缺省转移时长的 Edge 设置转移时长），THE Workbench SHALL 按创建方式设置其 Provenance：通过内置流程模板创建时 kind 为 synthetic，用户直接新建时 kind 为 user_estimate，两种方式均不设置来源说明与备注；通过画布复制或 Plan_Duplicator 产生的对象保留被复制对象的 Provenance（Requirement 8 第 4 条），Example_Scenario 中的对象按 Requirement 44 第 7 条均为 synthetic。
3. THE Simulation_Engine SHALL 仅根据 Run_Request 中的 Scenario 与 Subflow_Flattener 对 Run_Request 中 Plan 的输出（下称展开后 Plan）计算 Run_Metadata 的 Provenance 摘要，计入二者中第 1 条所列的全部对象（不论对象是否被 Entrance 节点、Assignment 或 Resource_Requirement 引用）：摘要包含 synthetic、user_estimate、measured、historical 四种 kind 各自的数量（非负整数，未出现的 kind 取 0，四者之和等于计入的对象数），以及 kind 为 synthetic 或 user_estimate 的每个 Provenance 的路径；路径与 Validation_Issue 的 path 格式相同（数组元素以下标表示，指向该 Provenance 字段），以 Run_Request 为根，但其中的 Plan 取展开后 Plan，且 Scenario 与展开后 Plan 均取按 Requirement 42 第 2 条将无序集合规范化排序后的形式，下标为该规范化、展开后形式中的位置；路径列表无重复，并在首个不同的路径段处按下标数值升序、按字段名以 Requirement 6 第 12 条的规则升序排列；Schema_Validator 对该 Run_Request 返回至少一条 severity 为 error 的 Validation_Issue 时，Provenance 摘要为 null（仅 Graph_Validator 返回 error 时照常计算）；据此使 Schema_Validator 均未返回 severity 为 error 的 Validation_Issue 且 Input_Fingerprint 相同的两个 Run_Request 具有深度相等的 Provenance 摘要。
4. WHILE 右侧属性面板显示第 1 条所列某个对象的配置（选中 Resource_Unit 时，Staff 显示其自身的 Provenance，设备显示所属 Device_Type 的 Provenance），THE Workbench SHALL 在该对象的参数旁显示其 Provenance kind 的中文名称：synthetic 为“合成”，user_estimate 为“用户估计”，measured 为“现场测量”，historical 为“历史记录”。
5. WHEN 用户请求导出某个 Plan 的执行安排，且按第 3 条规则对该 Plan 及其引用的 Scenario 得到的路径列表非空，THE Workbench SHALL 在生成导出文件前按该路径列表的顺序逐项列出这些参数（每项显示参数类别即第 1 条所列七类之一、所属 Arrival_Stream、Node、Edge、Staff 或 Device_Type 的 ID，以及 kind 的中文名称），并仅在用户确认后生成导出文件；用户取消时不生成导出文件。
6. IF 第 1 条所列的某个对象缺少 Provenance，或其 Provenance 缺少 kind、kind 不是 synthetic、user_estimate、measured、historical 之一（区分大小写），或来源说明或备注不是长度 0 至 1000 个 Unicode 码点的字符串，THEN THE Schema_Validator SHALL 为每个此类字段各返回一条 severity 为 error 的 Validation_Issue，path 为从被校验对象根部到该字段的完整路径（数组元素以下标表示），相关实体 ID 列表包含所属 Arrival_Stream、Node 或 Edge 的 ID；Staff 与 Device_Type 的 Provenance 只按 Requirement 24 第 7 条报告，本条不重复返回。
7. FOR ALL 其余内容相同、仅在一个或多个 Provenance 的 kind、来源说明或备注上不同的两个 Run_Request，THE Simulation_Engine SHALL 返回状态相同、Event_Log 深度相等且 Statistics 深度相等的 Run_Result。
8. THE Golden_Case_Suite SHALL 包含至少 1 个标注 Requirement 41 的 Golden_Case，其 Run_Request 含 kind 为 synthetic、user_estimate、measured、historical 的 Provenance 各至少 1 个、1 条未给出转移时长的 Edge、1 个位于 Subflow 节点成员 Node ID 列表中的 Service 节点和 1 个 records 模型的 Arrival_Stream，并在期望值中给出完整的 Provenance 摘要。

### Requirement 42: 文档解析、序列化与版本

**User Story:** 作为活动组织者，我希望导出的场景文件能被他人完整导入并重新运行，以便共享的是可复现的模型而不是截图。

#### Acceptance Criteria

1. WHEN Document_Codec 接收一段 JSON 文本，THE Document_Codec SHALL 在解析全过程未产生 severity 为 error 的 Validation_Issue 时，返回通过 Schema_Validator 校验的 Project_Document（其中缺省的、Schema_Module 已声明默认值的字段已补为默认值）、全部 severity 为 warning 的 Validation_Issue，以及按执行顺序排列的迁移列表（未执行迁移时为空列表）；否则不返回 Project_Document，只返回至少含一条 error 的 Validation_Issue 列表。每条 Validation_Issue 含中文 message 和从文档根部起的完整 path（数组元素以下标表示），且解析过程不执行 Graph_Validator。
2. THE Document_Codec SHALL 以如下规范化格式序列化 Project_Document：文本为不含 BOM 的 UTF-8，缩进为 2 个空格，换行符为 LF，键名与值之间为一个冒号加一个空格，空列表写为 []，空对象写为 {}，文本以恰好一个 LF 结尾，数值写为能还原同一双精度浮点值的最短十进制表示；对象键按 UTF-16 码元逐个比较的字典序升序排列；以下无序集合按 ID 升序（Requirement 6 第 12 条）排列：Project_Document 的 Scenario 列表与 Plan 列表，Plan 的 Node、Edge、Staff、Device_Type、Skill 列表，Assignment 列表（按各 Assignment 的 Resource_Unit ID），Scenario 的 Participant_Attribute 与 Arrival_Stream 列表，Entrance 节点的 Arrival_Stream ID 列表，Subflow 节点的成员 Node ID 列表，Staff 的 Skill ID 列表，Assignment 时间段的可服务 Node ID 列表；元素为非 ID 字符串的无序集合（当前仅有 Decision 节点 Branch 条件的取值列表）按 UTF-16 码元逐个比较的字典序升序排列，与对象键的排序规则相同，上述 ID 列表仍按 Requirement 6 第 12 条排列；其余全部列表保持原有顺序，包括 Branch 列表、Resource_Requirement 的需求项、Open_Window 列表、Shift 列表、Assignment 的时间段列表、Merge 节点的入边优先级列表、empirical 分布的样本列表、records 模型的到达记录列表和 bucketed 模型的时间段列表。
3. FOR ALL 合法 Project_Document d（Schema_Version 等于当前支持版本，且 Schema_Validator 不对其返回 severity 为 error 的 Validation_Issue），Document_Codec 解析 d 的序列化文本 SHALL 不返回 error 级 Validation_Issue，并得到一个 Project_Document；它与 d 在补全缺省字段的默认值、并把第 2 条所列无序集合按 ID 升序重排之后深度相等（往返性质）。
4. FOR ALL 合法 Project_Document d（定义同第 3 条），记 d 的序列化文本为 s，Document_Codec 解析 s 后再序列化 SHALL 得到与 s 逐字节相同的文本。
5. IF JSON 文本存在 JSON 语法错误（包括空文本）、顶层值不是 JSON 对象、顶层对象缺少格式标识字段，或格式标识的值不等于 Schema_Module 定义的格式标识常量（Requirement 6 第 7 条，区分大小写），THEN THE Document_Codec SHALL 为该问题返回一条 severity 为 error 的 Validation_Issue（前两种情况 path 指向文档根部，后两种情况 path 指向格式标识字段），不执行迁移与 Schema_Validator，且不返回 Project_Document。
6. IF Schema_Version 是大于当前支持版本（Requirement 6 第 7 条规定为 1）的正整数，THEN THE Document_Codec SHALL 返回一条 severity 为 error 的 Validation_Issue，其 path 指向 Schema_Version 字段，message 给出文档的 Schema_Version 与当前支持的 Schema_Version，并说明需要更新版本的 Ghost Rehearsal；同时不执行迁移与 Schema_Validator，且不返回 Project_Document。
7. IF 格式标识有效，且 Schema_Version 是小于当前支持版本 N 的正整数 v，THEN THE Document_Codec SHALL 在执行 Schema_Validator 之前，按版本号升序依次应用已登记的 v → v+1、…、N−1 → N 共 N − v 个迁移函数，再对迁移结果执行 Schema_Validator（Validation_Issue 的 path 以迁移结果为准），并在解析成功的结果中按执行顺序列出每个迁移的起始与目标 Schema_Version。
8. IF 迁移后的 Project_Document 中任一对象（包括顶层对象）含有 Schema_Module 未为该对象类型定义的字段（包括 Requirement 9 第 7 条所述仅属于其他 Node type 的专属参数），THEN THE Document_Codec SHALL 返回 Schema_Validator 为该字段生成的一条 severity 为 error 的 Validation_Issue，其 path 指向该字段，且返回的列表中该字段只对应这一条 Validation_Issue。
9. IF Document_Codec 对用户导入的 JSON 文本返回至少一条 severity 为 error 的 Validation_Issue，THEN THE Workbench SHALL 保持当前项目内容（含未保存修改）不变，并列出 Document_Codec 返回的全部 Validation_Issue，每条显示 severity、中文 message 与 path。
10. IF 顶层对象缺少 Schema_Version 字段，或 Schema_Version 的值不是正整数（包括 0、负数、带小数部分的数、"1" 等字符串、布尔值与 null），THEN THE Document_Codec SHALL 返回一条 severity 为 error 的 Validation_Issue，其 path 指向 Schema_Version 字段，不执行迁移与 Schema_Validator，且不返回 Project_Document；格式标识同时有误时，另按第 5 条为格式标识返回一条 Validation_Issue。
11. FOR ALL 仅因 Node type、分布 kind 或策略类型（Full_Policy、Close_Policy、排队规则）的取值集合新增成员而由 v 递增为 v+1 的 Schema_Version，以及任一 Schema_Version 为 v 的 Project_Document d，Document_Codec 为 v → v+1 登记的迁移函数 SHALL 返回 Schema_Version 为 v+1、其余内容与 d 深度相等的文档。
12. THE Document_Codec SHALL 在序列化文本中为每个缺省的、Schema_Module 已声明默认值的字段写出其默认值（例如缺省的 Full_Policy 写为 block，缺省的 Queue_Capacity 写为 null，缺省的 Assignment 时间段 handoverSec 写为 0），并省略未给出值且未声明默认值的可选字段（例如未设置 to 的 Assignment 时间段不写出 to 字段，也不写为 null）。
13. FOR ALL 仅在对象键顺序、第 2 条所列无序集合的元素顺序，或已声明默认值的字段是缺省还是显式写为默认值这几方面不同的两个合法 Project_Document（定义同第 3 条），THE Document_Codec SHALL 生成逐字节相同的序列化文本。

### Requirement 43: 产品声明与结论表述

**User Story:** 作为活动组织者，我希望清楚了解产品的适用范围，以便不把情景比较结果误用为安全评估。

#### Acceptance Criteria

1. THE Workbench SHALL 在关于页面和首次使用引导的第一个页面中显示第 4 条产品声明常量的中文声明与英文声明，并在 Workbench 生成的每份导出文件（Project_Document 除外）中包含这两段文本；显示或包含的文本与该常量逐字相同，不截断、不改写。
2. WHEN Workbench 显示或导出一条仿真结论（以文字陈述一个 Run_Result 的指标评价，或一次 Comparison 中方案 A 与方案 B 指标比较的语句；只列出指标数值的表格与图表不属于仿真结论），THE Workbench SHALL 在该仿真结论所在的同一面板或同一导出文件章节内显示一个假设标注，包含：逐字为“在所列假设下的情景比较结果”的标签；所依赖 Run_Result 的 Run_Metadata 中的 Scenario ID；该 Scenario 的 Assumption_Override 条目（列表为空时显示表示无假设覆盖的标识）；每个所依赖 Run_Result 的 Run_Metadata 中的 Provenance 摘要（Requirement 41 第 3 条），Comparison 的两份 Provenance 摘要分别标明方案 A 与方案 B。
3. WHEN Workbench 生成仿真结论，THE Workbench SHALL 使其中每个数值在按 Workbench_Spec 规定的显示精度取整前，等于所依赖 Run_Result 的 Statistics 中的某项指标值，或等于由这些指标值按 Workbench_Spec 列明的公式计算的值（例如 Comparison 中同一指标的方案 B 值减方案 A 值）；所依赖的任一 Run_Result 状态为 failed 或 aborted（Statistics 为 null）时，不生成该仿真结论。
4. THE Schema_Module SHALL 导出一个产品声明常量，包含中文声明与英文声明两个字符串：中文声明逐字为“本产品用于运营流程的情景比较，不提供建筑疏散、踩踏风险、物理人群碰撞或现场安全认证。”，英文声明逐字为“This product compares operational process scenarios. It does not provide building evacuation analysis, crowd crush risk assessment, physical crowd collision modeling, or on-site safety certification.”
5. THE Repository SHALL 提供单次执行（非监听模式）的自动化测试；Workbench_Spec 或 Example_Scenario 的说明文档（Requirement 44 第 9 条）未逐字包含第 4 条常量的中文声明与英文声明时，该测试失败。
6. THE Workbench SHALL 不在仿真结论中给出现实活动成功、达标或安全的概率或置信度，也不给出模型对现实结果的预测准确率；Statistics 中的人数占比等指标值同样不得被称为上述概率或准确率。

### Requirement 44: 示例场景

**User Story:** 作为产品团队，我希望有一份用正式 Schema 表达的示例场景，以便验证数据模型足以描述复杂活动，并作为演示模板。

#### Acceptance Criteria

1. THE Example_Scenario SHALL 以 JSON 文本文件存放一个 Schema_Version 等于当前支持版本（Requirement 6 第 7 条）的 Project_Document，其中恰含 1 个 Scenario 和 2 个 Plan（方案 A 为基线，方案 B 为改进方案），且两个 Plan 引用的 Scenario ID 均等于该 Scenario 的 ID。
2. THE Example_Scenario SHALL 在每个 Plan 经 Subflow_Flattener 展开后的结果中包含：(a) 至少 2 个 Entrance 节点，任意两个的 Arrival_Stream ID 列表无共同元素；(b) 至少 1 个路由模式为 attribute 且至少 1 个 Branch 含条件的 Decision 节点；(c) 至少 1 个路由模式为 probability 且至少 2 个 Branch 权重大于 0 的 Decision 节点；(d) Service 节点共使用至少 3 个不同的 Stage_Key；(e) 至少 1 个 Waiting Area 节点；(f) 至少 1 个入边不少于 2 条（按 Requirement 18 第 11 条计数）的 Merge 节点；(g) 至少 1 个带 Loop_Guard 且 maxVisits 不小于 2 的 Decision 节点 D，并存在一条从 D 的某条 branchKey 不等于 exitBranchKey 的出边出发、沿 Edge 方向经过至少 1 个 Service 节点后回到 D 的路径，D 的路由模式为 probability 时该出边对应 Branch 的权重大于 0；(h) 至少 2 个 Exit 节点，其中 countsAsCompleted 为 true（含缺省）与为 false 的各至少 1 个。
3. THE Example_Scenario SHALL 在每个 Plan 中包含：(a) 至少 1 个 Resource_Unit，存在 2 个及以上 Service 节点，其 Resource_Requirement 各含该 Resource_Unit 按 Requirement 24 第 9 条可满足的需求项，且该 Resource_Unit 没有 Assignment，或其某一个 Assignment 时间段的可服务 Node ID 列表同时包含这些 Service 节点；(b) 至少 1 个同时含 Staff 需求项与设备需求项的 Resource_Requirement；(c) 至少 1 个 Skill ID 列表含 2 个及以上 Skill ID 的 Staff，其中至少 2 个 Skill ID 各被该 Plan 中至少 1 个 Staff 需求项引用；(d) 至少 1 个 Service 节点，其 Open_Window 列表非空、最后一个 Open_Window 的 closeAt 小于 Observation_Cutoff，且在文件中显式给出 Close_Policy 字段；(e) 至少 1 个 Service 或 Waiting Area 节点，其 Queue_Capacity 为整数（非 null）且 Full_Policy 为 reroute 或 reject。
4. THE Example_Scenario SHALL 在 Scenario 中定义：(a) 至少 2 个 Participant_Attribute，每个的取值集合至少含 2 个取值；(b) 至少 2 个 Arrival_Stream，每个至少生成 1 位 Participant（total_in_window 与 preset_profile 模型的总人数不小于 1，bucketed 模型各时间段人数之和不小于 1，records 模型至少含 1 条记录）；(c) 严格小于 Horizon 的 Observation_Cutoff，使 cutoff 口径与 completion 口径的时间窗口不同。
5. FOR ALL 同时出现在方案 A 与方案 B 中的 Node ID，THE Example_Scenario SHALL 使该 ID 在两个 Plan 中的 Node type 相同，type 为 service 时 Stage_Key 相同，type 为 decision 时 Decision_Key 相同。
6. WHEN Repository 的自动化测试（Requirement 47 第 4 条）校验 Example_Scenario，THE Document_Codec、Schema_Validator 与 Graph_Validator SHALL 均返回零条 Validation_Issue（severity 为 error 与 warning 的条目均为零）：Document_Codec 针对该文件文本，Schema_Validator 针对解析所得 Project_Document，Graph_Validator 分别针对 (Scenario, 方案 A) 与 (Scenario, 方案 B)。
7. THE Example_Scenario SHALL 使文件中每个 Provenance 的 kind 均为 synthetic，并为文件中出现的每个 Arrival_Stream、属性分布、服务时长分布、显式给出的 Edge 转移时长、Staff、Device_Type 与 Open_Window 给出 Provenance（Requirement 41 第 1 条）。
8. THE Example_Scenario SHALL 只包含 Project_Document 的字段，不包含 Run_Request 专属字段（例如 Run_Mode、Max_Steps、maxEvents）、Run_Result、Event_Log、Statistics 或 Run_Metadata；文件中的显示名称、描述、备注以及第 9 条的说明文档可以说明方案 B 相对方案 A 改了什么，但不写任何仿真指标数值，也不断言某个 Plan 的指标更好。
9. THE Example_Scenario SHALL 附带一份说明文档，包含：(a) 第 2、3、4、10、11 条每个覆盖项对应的 Plan ID，以及满足该项的实体 ID；(b) 每个 Plan 中每个 Node 的 Node ID、type 及其演示的建模能力，以及每个 Staff 与 Device_Type 的 ID 和它可服务的 Service 节点 ID；(c) 按 ID 逐项列出方案 B 相对方案 A 新增、删除或修改的 Node、Edge、Staff、Device_Type 与 Assignment。
10. THE Example_Scenario SHALL 在每个 Plan 中包含：(a) 至少 1 个 Staff，其 Assignment 含 2 个及以上时间段，且某个非首个时间段同时满足以下条件：handoverSec 大于 0；from 小于 Observation_Cutoff 且位于该 Staff 的某个 Shift [start, end) 内；可服务 Node ID 列表非空，且作为集合与前一个时间段的列表不相等；(b) 至少 1 个 Unavailability_Window（属于某个 Staff 或某台设备），其 start 小于 Observation_Cutoff，且与该 Resource_Unit 的某个 Shift 的交集时长大于 0。
11. THE Example_Scenario SHALL 使方案 A 与方案 B 的 Stage_Key 按 Requirement 23 第 3 条分类后，“可比较”“仅 A”“仅 B”各至少有 1 个；并使至少 1 个“可比较”的 Stage_Key 在方案 A 中恰被 1 个 Service 节点使用、在方案 B 中被 2 个及以上 Service 节点使用（并行通道），其中至少 1 个节点的 Node ID 不在方案 A 中。
12. THE Example_Scenario SHALL 使方案 A 不含来源 Plan ID，方案 B 的来源 Plan ID 等于方案 A 的 Plan ID（Requirement 8 第 2 条），以表示方案 B 由 Plan_Duplicator 复制方案 A 后修改得到。
13. WHEN Repository 的自动化测试（Requirement 47 第 4 条）检查 Example_Scenario，THE Repository SHALL 逐项判定第 1、2、3、4、5、7、10、11、12 条的条件；任一项不满足时测试失败，失败信息指出未满足的条目编号与覆盖项字母。

### Requirement 45: 金标准用例

**User Story:** 作为开发者，我希望有手算的金标准用例，以便后续引擎实现能被逐事件、逐指标地核对。

#### Acceptance Criteria

1. THE Golden_Case_Suite SHALL 将每个 Golden_Case 存为一个 JSON 文本文件，包含：用例 ID（符合 Requirement 6 第 2 条的 ID 格式，在 Golden_Case_Suite 内互不相同）；一个 Run_Request（Requirement 31 第 1 条）；期望 error 级 Validation_Issue code 列表（列表为空的 Golden_Case 下称合法输入用例）；非空的中文手算过程说明，逐项写出各期望值的推导并引用所依据的 Requirement 编号与条款号。合法输入用例另含至少 1 组期望结果，每组标明适用的 Run_Mode（与 Run_Request 中的 Run_Mode 不同时，表示仅替换 Run_Mode 后运行的期望）和第 4 条所述的 k 组合（不适用时省略），并包含期望的 Run_Result 状态，以及期望的 Simulation_Event 列表、期望统计值（Statistics 中的值及其统计口径）和期望 Participant 经历记录（Requirement 35 第 1 条）中的至少一项；同一 Golden_Case 中 Run_Mode 与 k 组合均相同的期望结果至多 1 组。
2. THE Golden_Case_Suite SHALL 在第 7 条所列条款之外，以期望的 Simulation_Event 列表覆盖以下每一项：(1) 只有 1 个可满足其 Resource_Requirement 的 Resource_Unit 的 Service 节点上同时有至少 3 位 Participant 排队，SERVICE_START 的 Participant 顺序与 QUEUE_ENTER 顺序相同（Requirement 11 第 4 条）；(2) 同一时刻同时待处理 Requirement 30 第 4 条中至少 3 个不同类别的事项，且处理其中一项时产生同一时刻的新待处理事项（Requirement 30 第 5 条）；(3) 两个 Service 节点在同一时刻争用同一个 Resource_Unit，分别覆盖分配优先级不同、分配优先级相同而队首 QUEUE_ENTER 时刻不同、二者均相同而按 Node ID 升序决定三种情况（Requirement 27 第 4 条）；(4) Resource_Requirement 同时含 Staff 与设备需求项时，只有其中一类可满足的时段内该节点不开始服务，且该类 Resource_Unit 不被该节点占用（Requirement 27 第 2 条）；(5) 需求项为一个 Staff 需求项与一个数量为 1 的设备需求项、可满足的 Staff 多于该 Device_Type 数量时，服务中人数不超过该 Device_Type 数量（Requirement 27 第 6 条）；(6) Close_Policy 排队者处理方式 serve、redirect、dismiss 各至少 1 例，迟到者处理方式 redirect 至少 1 例，并含恰在最后一个 Open_Window 的 closeAt 到达而按迟到者处理的 Participant（Requirement 29 第 5 至 8、10 条；迟到者 reject 由 Requirement 28 第 10 条覆盖）；(7) Assignment 时间段开始时 Resource_Unit 空闲与处于服务中两种情况下的 Handover，以期望的 RESOURCE_CHANGE 事件给出（Requirement 25 第 5 至 7 条）；(8) Participant 第 maxVisits 次到达带 Loop_Guard 的 Decision 节点时被送往 exitBranchKey 对应的 Branch，路由依据为 loop_guard（Requirement 20 第 3 条）；(9) attribute 路由中至少 1 位 Participant 命中带条件的 Branch、至少 1 位落入默认 Branch（Requirement 13 第 4 条）；(10) probability 路由中权重为 0 的 Branch 声明在权重为 1 的 Branch 之前（Requirement 13 第 3 条）；(11) 样本不全相等且声明顺序不是升序的 empirical 服务时长分布，期望结果按第 4 条给出（Requirement 12 第 7 条）；(12) Merge 节点不同步汇合：两条入边上的 Participant 在不同时刻到达，各自在到达时刻进入出边，不等待另一条入边上的 Participant（Requirement 15 第 2 条）；(13) 两位 Participant 在同一时刻分别经两条入边到达同一 Merge 节点，所经入边优先级较高者的 Participant ID 较大，期望其出边 ROUTE_TRANSITION 排在另一位之前（Requirement 15 第 3 条）；(14) Decision 节点不复制 Participant：每次到达只记录一条以该节点为源的 ROUTE_TRANSITION（Requirement 13 第 6 条）；(15) 毫秒取整：Run_Request 中至少一个时间点和一个持续时间不是 0.001 秒的整数倍，其中至少一个值的毫秒数小数部分恰为 0.5 且可被二进制浮点数精确表示（例如 0.0625 秒，期望取整为 0.063 秒）（Requirement 6 第 6 条）；(16) 自时刻 0 起依次经过 0.1 秒与 0.2 秒两段持续时间后记录的 Simulation_Event 的 time 等于 0.3（Requirement 6 第 10 条）；(17) NODE_SCHEDULE_CHANGE 初始状态：第一个 openAt 大于 0 的节点在时刻 0 记录一条方向为 close 的事件，第一个 openAt 等于 0 的节点在时刻 0 不记录事件，前一个 closeAt 等于后一个 openAt 的时刻不记录事件（Requirement 29 第 9、11 条）。
3. THE Golden_Case_Suite SHALL 在第 7 条所列条款之外，以期望统计值覆盖以下每一项（第 (6) 项以期望的 Simulation_Event 列表覆盖）：(1) cutoff 口径下“全部已到达”组的 Average Waiting 与 P90 Waiting 计入 unfinished Participant 截断到 Observation_Cutoff 的 Waiting_Time，“仅 completed”组不计入（Requirement 36 第 1、4、7 条）；(2) 最近秩法 P90：至少一组等待指标的统计人数 n ≥ 11 且不是 10 的倍数，并含至少两个相等的 Waiting_Time（Requirement 36 第 5 条）；(3) Observation_Cutoff 时队列仍非空的 Node 的时间加权平均队列长度，积分截止于 Observation_Cutoff（Requirement 37 第 5 条）；(4) Observation_Window 内含离岗、不可用与 Handover 时段的 Resource_Unit 利用率，以及分母为 0 时输出 null（Requirement 38 第 1 至 3 条）；(5) 瓶颈阈值不小于 2 的 Service 节点的受限总时长与受限区间列表，其中排队中与受阻人数之和为 1 的时段和节点关闭期间均不计为受限（Requirement 39 第 1、2 条）；(6) 前缀一致性：同一 Golden_Case 给出 cutoff 与 run_to_completion 两组期望结果，两组均为完整 Event_Log，且 run_to_completion 组中 time 不晚于 Observation_Cutoff 的期望 Simulation_Event 与 cutoff 组逐条相同（Requirement 40 第 4 条）。
4. THE Golden_Case_Suite SHALL 使每个合法输入用例的期望值无需知道 Keyed_Draw 的具体取值即可手算：Arrival_Stream 只使用 records 模型、间隔方式为 even 的 total_in_window 模型或 bucketed 模型（到达时刻按 Requirement 21 第 11 条确定），不使用间隔方式为 random 的 total_in_window 模型和 preset_profile 模型；非 records 模型的每个 Participant_Attribute 取值概率分布恰有一个取值的概率为 1；Edge 转移时长只使用 fixed 分布（含缺省）；服务时长只使用 fixed 分布或 empirical 分布，empirical 分布须全部样本相等，或由该用例为该分布各次抽样可能取到的 k（Requirement 12 第 7 条，k = 1 … n）的每种组合各给出一组期望结果；probability 模式 Decision 节点的 Branch 权重只取 1 或 0；期望的 Simulation_Event 不列出以 probability 为路由依据的 ROUTE_TRANSITION 的 Keyed_Draw 值。
5. WHEN Repository 的自动化测试校验 Golden_Case_Suite，THE Schema_Validator 与 Graph_Validator SHALL 对每个 Golden_Case 的 Run_Request（Schema_Validator 按 Requirement 31 第 9、10 条校验该 Run_Request 及其 Scenario 与 Plan，Graph_Validator 校验其 (Scenario, Plan) 组合）合计返回 severity 为 error 的 Validation_Issue，其 code 集合等于该 Golden_Case 声明的期望 error 级 Validation_Issue code 集合（合法输入用例为空集）；severity 为 warning 的 Validation_Issue 不参与比较。
6. THE Golden_Case_Suite SHALL 为每个 Golden_Case 标注至少 1 个所验证的 Requirement 编号，每个编号为本文档中存在的 Requirement 编号（当前为 1 至 47），可附该 Requirement 中存在的条款号。
7. THE Golden_Case_Suite SHALL 在第 2、3 条之外满足本文档其他 Requirement 中主语为 Golden_Case_Suite 的全部条款，当前为 Requirement 14 第 10 条（Waiting Area 放行）、Requirement 16 第 7 条（两类 Exit 节点）、Requirement 20 第 10 条（Max_Steps 边界）、Requirement 26 第 7 条（服务中开始的 Unavailability_Window 与 Shift 结束）、Requirement 27 第 8 条（多技能 Staff 分配与分配优先级不阻塞）、Requirement 28 第 10 条（Full_Policy 的 block、reroute、reject）、Requirement 34 第 8 条（cutoff 口径参与者分类）、Requirement 35 第 6 条（Participant 经历记录）、Requirement 36 第 11 条（等待时间口径）、Requirement 37 第 8 条（吞吐量与队列长度）、Requirement 38 第 7 条（资源利用率）、Requirement 39 第 6 条（瓶颈时长）、Requirement 40 第 7 条（运行到完成）与 Requirement 41 第 8 条（Provenance 摘要）；并附带一份覆盖清单，为第 2、3 条的每一项和上述每条条款各列出至少 1 个 Golden_Case ID，所列 Golden_Case 须标注所覆盖条款或项目括注的 Requirement 编号。
8. THE Repository SHALL 在本 Spec 的自动化测试中只对 Golden_Case_Suite 执行以下有效性检查：每个 Golden_Case 符合第 1 条格式且用例 ID 互不相同；第 5 条的 code 集合比较；第 6 条所标注的编号为本文档中存在的 Requirement 编号；覆盖清单含第 2、3 条的每一项与第 7 条所列的每条条款，且所列 Golden_Case ID 均存在并标注了相应 Requirement 编号。本 Spec 不运行 Simulation_Engine、Metrics_Calculator 或 Playback，也不比对期望的 Simulation_Event、统计值与 Participant 经历记录；这些比对由 simulation-engine、resource-scheduling 与 ghost-playback Spec 的自动化测试按第 9 条执行。
9. THE Golden_Case_Suite SHALL 按以下规则定义期望结果的通过条件，供第 8 条所述后续 Spec 的自动化测试使用：期望 Simulation_Event 列表声明为完整 Event_Log，或声明按 type、participantId、nodeId 中一项或多项筛选；实际 Event_Log 按同一条件筛选并按 seq 升序排列后，须与期望列表条数相同，且逐条在期望中列出的每个字段上相等，未列出的字段不比较，筛选列表不比较 seq；Simulation_Event 的各字段以及全部 ID、枚举值与 null 按值精确比较，期望统计值与 Participant 经历记录中的数值与实际值之差的绝对值不大于 1e-9 即为相等；按第 4 条列出多个 k 组合时，以 Requirement 22 第 2 条口径的 service 用途 Keyed_Draw 值按 Requirement 12 第 7 条求出各次抽样的实际 k，只与该 k 组合的期望结果比对。

### Requirement 46: 演示分镜

**User Story:** 作为参赛团队，我希望有逐镜头的演示分镜，以便录制展示真实操作和真实计算结果的演示视频。

#### Acceptance Criteria

1. THE Demo_Storyboard SHALL 使每个镜头恰好属于 Build、Rehearse、Reveal、Split the Future、Follow a Ghost、Challenge the Result、Take Action 七个场景之一，每个场景至少含 1 个镜头，且按镜头编号排列时同一场景的镜头连续出现、各场景按上述 PLAN.md 第 11 节顺序出现。
2. THE Demo_Storyboard SHALL 以机器可读格式存放，每个镜头一条记录，包含以下字段：所属场景（第 1 条七个场景名称之一）；编号（从 1 开始、按镜头顺序逐个加 1 的整数）；时长（1 至 180 的整数秒）；Canvas_Mode（Build、Rehearse、Compare 之一）；用户操作（非空文本）；画面内容（非空文本）；所依赖的 Run_Result 字段列表（不显示仿真结果的镜头为空列表；每项由来源与字段路径组成，来源指明 Plan、Scenario 与 Run_Mode，其中演示以 Example_Scenario 的方案 A 作为初始当前 Plan，方案 A 为 Build 场景在其上操作后、Build 场景结束时的当前 Plan，方案 B 为 Split the Future 场景复制该当前 Plan 并修改所得的 Plan（Example_Scenario 中的方案 B 只作为模板与测试夹具，不要求与该副本相同），Scenario 为 Example_Scenario 中的 Scenario 或 Challenge the Result 场景按 Requirement 33 第 4 条复制所得的 Scenario；字段路径须能在 Schema_Module 的 Run_Result 类型中解析）；英文旁白或字幕（可为空，英文单词数不超过该镜头时长秒数的 2.5 倍）。
3. THE Demo_Storyboard SHALL 使全部镜头的时长字段之和不超过 180 秒。
4. THE Demo_Storyboard SHALL 在画面内容与英文旁白或字幕中以占位符表示全部取决于仿真结果的数值与结论（包括指标值、差值、方案优劣或增减方向、瓶颈所在的 Node 或需求项、被选中的 Participant ID），每个占位符引用该镜头所依赖 Run_Result 字段列表中的一项，或为注明计算式、所引用字段和所依据 Requirement 编号的派生值（例如 Requirement 4 第 13 条的完成时刻差）；这两个字段中占位符以外的文本不含阿拉伯数字（指标名称 P90 除外）。
5. THE Demo_Storyboard SHALL 包含录制前核对预案，规定以下步骤：在 Workbench 中以 Example_Scenario 按全部镜头的用户操作完整执行一遍，并逐条判定第 8 条的预期现象条件；对任一不成立的条件，只修改 Example_Scenario 的 Scenario 或 Plan 参数（不修改预期现象条件、Run_Result、Simulation_Engine 或录制画面），确认修改后的 Example_Scenario 仍满足 Requirement 44 全部验收条件，再从第 1 个镜头起重新执行并判定全部条件；全部条件成立之前不开始录制；每项参数修改在 Demo_Storyboard 的修改记录中登记字段路径、修改前取值、修改后取值和触发修改的条件。
6. THE Demo_Storyboard SHALL 为每个场景列出至少 1 个在本 requirements 文档中存在的 Requirement 编号，以及至少 1 个负责实现的后续 Spec 名称，Spec 名称取自 Introduction 所列的 workflow-editor、simulation-engine、resource-scheduling、ghost-playback、scenario-comparison、analytics-explanations、export-and-release。
7. THE Demo_Storyboard SHALL 使各场景镜头的用户操作至少包含以下操作：Build——选中 1 个 Service 节点并在右侧属性面板显示其配置，以及新增或修改至少 1 个 Resource_Requirement 需求项或 Assignment；Rehearse——触发运行入口（Requirement 3 第 1 条）；Reveal——选中按第 9 条确定的 Node；Split the Future——通过方案管理入口复制当前 Plan，修改副本的至少 1 个 Simulation_Relevant_Field（逐项写明字段路径、修改前取值和修改后取值），并以方案 A、方案 B 进入 Compare 模式（Requirement 4 第 1 条）；Follow a Ghost——在 Compare 模式中选中按第 9 条确定的 Participant（Requirement 4 第 7、13 条）；Challenge the Result——按 Requirement 33 第 4 条复制当前 Scenario，修改所得 Scenario 使其差异列表恰好含 1 个条目，并在该 Scenario 下重新运行方案 A 与方案 B；Take Action——触发导出入口，并确认 Requirement 41 第 5 条列出的参数。
8. THE Demo_Storyboard SHALL 为 Rehearse、Reveal、Split the Future、Follow a Ghost、Challenge the Result 五个场景各列出至少 1 条只引用该场景镜头所依赖 Run_Result 字段的预期现象条件，且至少包含以下条件：Rehearse——方案 A 的 Run_Result 中至少 1 个 Service 节点的受限总时长（Requirement 39 第 2 条）大于 0，且该节点某个受限区间内至少有 1 个时刻存在按 Requirement 3 第 5 条处于空闲的 Resource_Unit；Reveal——按第 9 条确定的 Node 至少有 1 个受限区间列出了至少 1 个需求项（Requirement 39 第 3 条）；Split the Future——方案 A 与方案 B 的 Run_Result 状态均为 succeeded，且两者 cutoff 口径的 Average Waiting（Requirement 36 第 4 条）与 Participant_Outcome 为 completed 的人数至少一项不同；Follow a Ghost——按第 9 条确定的 Participant 在两个 Run_Result 之间存在 First_Divergence，且两侧 Waiting_Time 不同；Challenge the Result——第 7 条重新运行所得的两个 Run_Result 状态均为 succeeded。
9. THE Demo_Storyboard SHALL 以选取规则指定 Reveal 场景选中的 Node 与 Follow a Ghost 场景选中的 Participant，不写入预设的 Node ID 或 Participant ID；每条规则只引用所在镜头所依赖的 Run_Result 字段，多个对象取值相同时按 ID 升序（Requirement 6 第 12 条）取第一个，使同一组 Run_Result 恰好确定 1 个 Node 或 1 个 Participant；没有候选对象时，第 8 条中该场景的条件判定为不成立。

### Requirement 47: 模块边界与工程基础

**User Story:** 作为开发者，我希望数据契约独立于界面框架，以便编辑器、引擎和回放保持清楚的模块边界。

#### Acceptance Criteria

1. THE Schema_Module（含 Schema_Validator、Graph_Validator、Subflow_Flattener、Plan_Duplicator、Fingerprint_Function 与 Document_Codec 的实现，均位于 `src/schemas/` 下）SHALL 只导入解析后位于 `src/schemas/` 内的模块和至多一个第三方运行时校验库，不导入 React、@xyflow/react、Zustand、其他第三方包或 Node.js 内置模块，且只使用 ECMAScript 标准内置对象，不使用浏览器 DOM API 或其他宿主环境全局对象（例如 window、document、navigator、localStorage、indexedDB、fetch、crypto、TextEncoder、Buffer、process、console）。
2. THE Schema_Module SHALL 以 Requirement 9 至 Requirement 17 定义的 Node 字段与 Requirement 18 第 1 条定义的 Edge 字段定义 Workflow_Graph 中的 Node 与 Edge，不从 @xyflow/react 导入或派生任何类型，且不为 Node 或 Edge 定义选中状态、拖动状态、渲染后测量尺寸或连接点句柄 ID 等 React Flow 画布交互状态字段。
3. THE Repository SHALL 提供一项自动化检查，扫描 `src/schemas/` 下的全部文件（测试文件不放在该目录下），在出现以下任一情形时使检查失败，并报告每处违规的文件路径与被引用的模块说明符或违规文件名：以 import、import type、export … from、动态 import() 或 require() 引用 react、@xyflow/react、zustand 或其任一子路径（例如 react/jsx-runtime、zustand/middleware），带或不带 node: 前缀的 Node.js 内置模块，或第 1 条允许范围以外的任何其他模块；以三斜线指令引用 DOM 类型库或任何类型声明包；存在扩展名为 .tsx 或 .jsx 的文件。
4. THE Repository SHALL 提供一条单次执行（非监听模式）的测试命令，在不模拟 DOM（运行环境中不存在 window 与 document 全局对象）的 Node.js 环境中运行以下测试，并在全部执行完后自行退出：Schema_Validator、Graph_Validator、Subflow_Flattener、Plan_Duplicator、Fingerprint_Function、Document_Codec 各至少 1 个测试用例，Example_Scenario 校验（Requirement 44 第 6 条），Golden_Case_Suite 校验（Requirement 45 第 5 条），以及第 3 条的检查；全部通过时退出码为 0，任一测试失败或未找到任何测试文件时退出码非 0。
5. THE Repository SHALL 提供一条单次执行的类型检查命令，以启用 TypeScript strict 模式且未单独关闭 strict 所含任一检查项的配置，检查 Repository 中的全部 TypeScript 源文件与测试文件；存在任一类型错误时以非零退出码结束，无类型错误时以退出码 0 结束。
6. THE Repository SHALL 在第 5 条的类型检查命令中，以只加载 ECMAScript 标准库类型、不加载 DOM 类型库和 Node.js 类型声明的配置另行检查 `src/schemas/` 下的全部文件，使其中任一处使用第 1 条禁止的全局对象时该命令以非零退出码结束；第三方运行时校验库自身的类型声明文件不在此项检查范围内。
7. FOR ALL 通过 Schema_Validator 校验的 Run_Request 与任一 Model_Version，THE Fingerprint_Function SHALL 同步返回（返回值不是 Promise）Input_Fingerprint 与 Scenario_Fingerprint，且二者分别等于测试中由 Node.js 内置 crypto 模块对 Requirement 5 第 3 条相应规范化序列化文本的 UTF-8 编码计算的 SHA-256 摘要的 64 位小写十六进制表示；该对照测试的输入至少包括由 Example_Scenario 的 Scenario 与每个 Plan 组成的 Run_Request、每个通过 Schema_Validator 校验的 Golden_Case 的 Run_Request，以及 100 个由测试生成的 Run_Request。
