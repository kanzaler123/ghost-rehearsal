# 双入口开放日示例

`open-house.json` 使用正式输入 Schema，包含场景 `open-house`、基线方案 `baseline` 和由它复制后修改的 `alternative`。全部参数均为合成数据。方案 B 调整了核验通道、终端数量、机动人员岗位与最后一个活动环节；当前引擎的运行结果与后续试验见下方。它不是单变量实验，也不是实测活动。

## 演示：先发现无效调整，再验证新的安排

使用原始共享场景、种子 20261114、观察截止 1800 秒。`npm test` 中的 `analysis.test.ts` 重跑并核对这些结果，数值来自模型版本 `0.1.1-alpha`。

| 指标（观察截止） | A：基线 | B：双核验通道 | C：在 B 上增配资料人员 |
|---|---:|---:|---:|
| 工作人员 | 3 | 3 | 4 |
| 扫描设备 | 1 | 2 | 2 |
| 完成人数 | 43 | 41 | 72 |
| 未完成人数 | 253 | 253 | 218 |
| 中途离开人数 | 4 | 6 | 10 |
| 平均累计等待（分钟） | 17.63 | 17.59 | 15.90 |
| P90 累计等待（分钟） | 25.79 | 25.79 | 24.07 |

1. **原先的想法：** 增加核验通道可能改善活动体验。B 同时改了通道、设备、机动人员岗位和后续环节，因此差异不能归因于一台扫描设备。
2. **实际发现：** B 的平均等待只减少约 2.38 秒，完成反而少 2 人。默认“至少相差 60 秒”下为 12 人少等、9 人多等、279 人变化不足 60 秒；切到“查看任何变化”后，同 ID 配对为 66 人等待更少、26 人更多、208 人不变。7 人从未完成变为完成，9 人从完成变为未完成，2 人从未完成变为中途离开。
3. **看见具体经历：** 点击这些分组可进入个人旅程和每个节点的等待。等待减少的 66 人中，有 3 人在 B 中途离开：2 人是新增的未完成→离开，另 1 人在 A/B 都离开。不能把这组人统称为“改善”。
4. **追查约束：** 点击 B 的第二核验通道，查看积压时刻的岗位与资源记录。核验工作人员只在第一通道，机动人员在 600 秒前只服务资料发放和复检，600 秒后调岗且需交接。B 的资料工作人员在观察窗口内忙碌 1655 秒、空闲 100 秒、不可用 45 秒，利用率约 94.3%（忙碌 / 忙碌加空闲）。这些是可核查的约束与占用记录，不能由此断言只有一个原因。
5. **验证调整：** Insights 的“试验增配资料发放人员”从 B 复制方案，仅增加一位资料发放人员及其岗位。新人员沿用原资料人员的技能、0–7200 秒班次及 400–460 秒不可用时段，岗位从 0 秒起为 packing。它不改变到达、服务时间、路线或已有岗位。C 的结果如表；界面随后比较 B 与 C，显示额外人员成本。

C 是一次有依据的合成试验，不是最优方案，也不是同资源预算下的比较。C 中更多人按原有 quick 路线离开；此退出规则仍需组织者确认是否代表业务上的失败。固定种子只是可复现示例，多种到达/耗时条件与真实活动测量仍待验证。

“已通过”按完成通行人次计：入口、合流、分流计路线离开；服务计服务完成；候场计放行；出口计抵达后结束。重复经过会重复计数。峰值队列按同一时间戳所有事件处理后的状态计算，立即接受服务者不算排队峰值。转移标记只在实际记录的出发至到达区间沿对应边移动，零耗时转移不播放虚构的通行时间。

## Requirement 44 覆盖清单

下表“双方”指 `baseline` 和 `alternative`。共享场景字段适用于双方。

| 条款 | 方案 | 实体与建模能力 |
|---|---|---|
| 2(a) | 双方 | `main` → `main-stream`，`side` → `side-stream`，两个入口互不重复绑定 |
| 2(b) | 双方 | `tickets` 按 `ticket` 属性分流，含默认分支 |
| 2(c) | 双方 | `review` 的 again / forward 都有正权重 |
| 2(d) | 双方 | `checkin`、`recheck`、`packing` 为不同 Stage_Key |
| 2(e) | 双方 | `holding` 为批量放行候场区 |
| 2(f) | 双方 | `intake` 接收 `main-intake`、`side-intake` 两条入边 |
| 2(g) | 双方 | `review` → `recheck` → `review`；循环保护在第二次到达时走 forward |
| 2(h) | 双方 | `finish` 正常完成；`leave` 中途离开 |
| 3(a) | 双方 | `floater` 的首个排岗时段同时允许服务 `packing`、`recheck` |
| 3(b) | 双方 | `checkin` 同时需要 `check` 技能人员和 `scanner` 设备 |
| 3(c) | 双方 | `floater` 具备 `check`、`pack`；由 `checkin`/`recheck` 和 `packing` 实际引用 |
| 3(d) | 双方 | `checkin` 在观察截止前关闭，显式声明排队者继续服务、迟到者拒绝 |
| 3(e) | 双方 | `holding` 有限容量，满员时转送到 `leave` |
| 4(a) | 双方 | `open-house` 定义 `ticket`（regular / vip）、`visit`（full / quick） |
| 4(b) | 双方 | `main-stream` 为时段总人数模型，`side-stream` 为分桶模型，均非空 |
| 4(c) | 双方 | `open-house.observationCutoff` 小于 `open-house.horizon` |
| 10(a) | 双方 | `floater` 在场景时刻 600 秒调岗，交接 30 秒，班次覆盖该时刻 |
| 10(b) | 双方 | `pack-staff` 的不可用区间 [400, 460) 位于其班次和观察窗口内 |
| 11 | 双方 | 共同工序 checkin / recheck / packing；仅 A 为 orientation；仅 B 为 briefing；B 将 checkin 扩展为两个并行节点 |

## 节点与资源

| Node ID | 所在方案 | type | 建模能力 |
|---|---|---|---|
| main | 双方 | entrance | 主到达流 |
| side | 双方 | entrance | 侧到达流 |
| intake | 双方 | merge | 多入口汇流及入边优先级 |
| tickets | 双方 | decision | 票种条件与默认路径 |
| checkin | 双方 | service | 人员设备组合、开放窗口与关闭策略 |
| checked | 双方 | merge | 核验或免核验路径汇合 |
| review | 双方 | decision | 概率路由与有限次复检 |
| recheck | 双方 | service | 与其他服务共享多技能人员 |
| holding | 双方 | waiting_area | 批次、最长等候和容量溢出 |
| packing | 双方 | service | 资料发放及共享工作人员 |
| visit-choice | 双方 | decision | 按参与方式决定继续或中途离开 |
| finish | 双方 | exit | 正常完成出口 |
| leave | 双方 | exit | 非正常完成出口、容量溢出去向 |
| arrival | 双方 | subflow | “入场”阶段：两个入口、入口汇合与票种分流 |
| verification | 双方 | subflow | “核验与复检”阶段；连线仍连接成员 |
| activities | 双方 | subflow | “参与活动”阶段：参与方式、活动环节与两个出口 |
| orientation | baseline | service | A 独有工序，有限并发且无资源需求 |
| lane-choice | alternative | decision | 并行核验通道的概率分流 |
| checkin-extra | alternative | service | 相同 Stage_Key 的第二条核验通道 |
| briefing | alternative | service | B 独有工序，独立的服务时长与并发参数 |

| 资源 ID | 方案 | 有资格服务的 Service 节点（受排岗约束） |
|---|---|---|
| check-staff | 双方 | checkin |
| pack-staff | 双方 | packing |
| floater | baseline | 首段 packing、recheck；后段 checkin、recheck |
| floater | alternative | 首段 packing、recheck；后段 checkin、checkin-extra、recheck |
| scanner | baseline | checkin，派生单元 scanner:1 |
| scanner | alternative | checkin、checkin-extra，派生单元 scanner:1、scanner:2 |

## B 相对 A 的逐项变化

| 类别 | 新增 | 删除 | 修改 |
|---|---|---|---|
| Node | lane-choice、checkin-extra、briefing | orientation | checked.incomingPriority 增加 extra-checked；verification.memberNodeIds 增加 lane-choice、checkin-extra；activities.memberNodeIds 以 briefing 替换 orientation |
| Edge | lane-first、lane-second、extra-checked、briefing-finish | orientation-finish | regular-checkin.target 从 checkin 改为 lane-choice；full-activity.target 从 orientation 改为 briefing |
| Staff | 无 | 无 | 无 |
| Device_Type | 无 | 无 | scanner.quantity 从 1 改为 2 |
| Assignment | 无 | 无 | floater 的第二个时段增加 checkin-extra；调岗时刻和交接时长不变 |

这些是多项安排的联合调整，不是单变量实验，后续不能把结果差异全部归因于增加设备。上述运行与证据不证明真实活动效果，也不代表完整正式验收。Document_Codec 已实现规范化读写，并有示例往返测试；这不代表其余正式验收项目全部完成。

## 产品适用范围

本产品用于运营流程的情景比较，不提供建筑疏散、踩踏风险、物理人群碰撞或现场安全认证。

This product compares operational process scenarios. It does not provide building evacuation analysis, crowd crush risk assessment, physical crowd collision modeling, or on-site safety certification.

## 比较口径 / Comparison basis（2026-11-15 重新运行）

主要等待指标在 cutoff 与 final 均包含全部已到达者，不排除未完成和提前离开。等待配对仅包括两侧均已到达的同 ID；未到达和未配对人数另外列出。默认阈值包含恰好 ±60 秒；任何变化按毫秒精度分组。名单、人数、故事、直方图与比较证据导出共用规则。

本例两侧 cutoff 均为 1800 秒、已到达样本均为 300。仅 completed 子群的 n 为 A 43 / B 41，平均等待为 622.718721 / 626.515683 秒，P90 为 1143.571 / 1205 秒。最终两侧都在 7200 秒达到上限；主要平均等待为 4490.55 / 4490.95 秒；仅 completed 子群均 n=149，平均为 3016.531148 / 3042.285711 秒。子群成员可能不同，不能把两均值之差解释为同一批人的效果。达到上限不代表全部完成；界面会保留未完成结局。

The primary mean/P90 includes **all arrived guests** at either cutoff or final, including unfinished and early departures. Paired waiting requires the same ID to have arrived in both plans; missing/not-arrived guests are reported separately. The default inclusive ±60-second rule gives **12 less / 9 more / 279 little change**. “Any change”, at millisecond resolution, gives **66 less / 26 more / 208 unchanged**. Counts, lists, stories, histogram and comparison export use the selected rule. Final statistics use each side's actual end and never substitute a missing final result with cutoff. This example reaches 7200 seconds on both sides with unfinished guests. The separately labelled completed-only sample preserves original Requirement 40; it is not a matched cohort.
