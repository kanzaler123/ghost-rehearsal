# 双入口开放日示例

`open-house.json` 使用正式输入 Schema，包含场景 `open-house`、基线方案 `baseline` 和由它复制后修改的 `alternative`。全部参数均为合成数据。方案 B 调整了核验通道、终端数量、机动人员岗位与最后一个活动环节；是否改善等待或完成人数须由后续真实仿真判断，本示例不包含运行结果。

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

这些是多项安排的联合调整，不是单变量实验，后续不能把结果差异全部归因于增加设备。示例的输入校验不证明实际活动效果，也未验证后续演示分镜要求的瓶颈现象。Document_Codec 未实现，当前只使用普通 JSON 读取加 Schema 和图校验，尚未完成 Requirement 44.6 中的 Codec 验收部分。

## 产品适用范围

本产品用于运营流程的情景比较，不提供建筑疏散、踩踏风险、物理人群碰撞或现场安全认证。

This product compares operational process scenarios. It does not provide building evacuation analysis, crowd crush risk assessment, physical crowd collision modeling, or on-site safety certification.
