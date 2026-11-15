# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ui\compare-first-screen.spec.ts >> comparison and guest evidence occupy the first screen
- Location: e2e\ui\compare-first-screen.spec.ts:18:1

# Error details

```
Error: expect(locator).toHaveCount(expected) failed

Locator:  locator('.canvas-pane .react-flow').first().locator('.stage-card')
Expected: 3
Received: 2
Timeout:  10000ms

Call log:
  - Expect "toHaveCount" locator('.canvas-pane .react-flow').first().locator('.stage-card') with timeout 10000ms
  - waiting for locator('.canvas-pane .react-flow').first().locator('.stage-card')
    23 × locator resolved to 2 elements
       - unexpected value "2"

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - banner [ref=e4]:
    - strong [ref=e13]: Ghost Rehearsal
    - generic "双入口开放日 · 方案 A · 基线" [ref=e14]
    - tablist "画布模式" [ref=e15]:
      - tab "搭建" [ref=e16] [cursor=pointer]
      - tab "预演" [ref=e22] [cursor=pointer]
      - tab "双未来" [selected] [ref=e26] [cursor=pointer]
    - generic [ref=e30]:
      - button "撤销（Ctrl+Z）" [ref=e31] [cursor=pointer]
      - button "重做（Ctrl+Shift+Z）" [disabled] [ref=e35]
      - button "运行预演" [ref=e40] [cursor=pointer]
    - generic [ref=e46]:
      - button "保存到当前浏览器（Ctrl+S）" [ref=e47] [cursor=pointer]
      - generic [ref=e52]: 草稿已保存
      - group [ref=e53]:
        - generic "更多选项" [ref=e54] [cursor=pointer]
        - option "运行到观察截止"
        - option "运行到完成 / 上限" [selected]
    - group "界面语言" [ref=e59]:
      - button "EN" [ref=e60] [cursor=pointer]
      - button "中文" [pressed] [ref=e61] [cursor=pointer]
  - region "A/B/C 决策引导" [ref=e62]:
    - generic [ref=e63]:
      - strong [ref=e64]: 3/6 · 首次差异
      - paragraph [ref=e65]: 检查首次可见变化，不能据此断言原因。
    - generic [ref=e66]:
      - button "查看岗位与资源" [ref=e67] [cursor=pointer]
      - group [ref=e68]:
        - generic "更多选项" [ref=e69] [cursor=pointer]
      - button "退出引导" [ref=e70] [cursor=pointer]
  - generic [ref=e71]:
    - generic [ref=e72]:
      - generic [ref=e73]: A · 方案 A · 基线
      - generic [ref=e74]: B · 方案 B · 双核验通道
    - group [ref=e75]:
      - generic "观察截止 · A 30:00 / B 30:00" [ref=e76] [cursor=pointer]
      - option "观察截止" [selected]
      - option "最终结束 / 运行上限"
      - option "至少相差 60 秒" [selected]
      - option "查看任何变化"
    - button "此刻 · 03:30" [ref=e77] [cursor=pointer]
  - generic [ref=e80]:
    - complementary "按顺序读懂两个未来" [ref=e81]:
      - generic [ref=e82]:
        - button "收起报告" [expanded] [ref=e83] [cursor=pointer]
        - button "方案与节点" [ref=e84] [cursor=pointer]:
          - generic [ref=e88]: A · 方案 A · 基线
          - generic "当前编辑目标" [ref=e89]
        - button "稳健性实验台" [ref=e93] [cursor=pointer]
      - generic [ref=e96]:
        - generic [ref=e97]:
          - heading "按顺序读懂两个未来" [level=2] [ref=e98]
          - paragraph [ref=e99]: 两个方案使用同一组访客 · B 相对 A
        - generic "B 相对 A 的变化摘要" [ref=e100]:
          - generic [ref=e101]:
            - generic [ref=e102]: 完成人数
            - strong [ref=e103]:
              - generic [ref=e104]:
                - generic [ref=e105]: −2
                - generic "变差" [ref=e106]
            - generic [ref=e112]: A 43 → B 41
          - generic [ref=e113]:
            - generic [ref=e114]: 人均等待
            - strong [ref=e115]:
              - generic [ref=e116]:
                - generic [ref=e117]: −2.4 秒
                - generic "改善" [ref=e118]
                - generic [ref=e124]: 差异小于显示精度
            - generic [ref=e125]: A 17.6 分 → B 17.6 分
          - generic [ref=e126]:
            - generic [ref=e127]: 中途离开或被拒
            - strong [ref=e128]:
              - generic [ref=e129]:
                - generic [ref=e130]: "+2"
                - generic "变差" [ref=e131]
            - generic [ref=e137]: A 4 → B 6
          - generic [ref=e138]:
            - generic [ref=e139]: 尚未完成
            - strong [ref=e140]:
              - generic [ref=e141]:
                - generic [ref=e142]: "0"
                - generic "无变化" [ref=e143]
            - generic [ref=e147]: A 253 → B 253
          - generic [ref=e148]:
            - generic [ref=e149]: P90 等待
            - strong [ref=e150]:
              - generic [ref=e151]:
                - generic [ref=e152]: 0.0 秒
                - generic "无变化" [ref=e153]
            - generic [ref=e157]: A 25.8 分 → B 25.8 分
          - generic [ref=e158]:
            - generic [ref=e159]: 全体累计等待
            - strong [ref=e160]:
              - generic [ref=e161]:
                - generic [ref=e162]: −11.9 人·分钟
                - generic "改善" [ref=e163]
            - generic [ref=e169]: A 5288.6 人·分钟 → B 5276.7 人·分钟
          - generic [ref=e170]:
            - generic [ref=e171]: 资源代价
            - list [ref=e172]:
              - listitem [ref=e173]:
                - generic [ref=e174]: 工作人员
                - generic [ref=e175]: A 3 → B 3
              - listitem [ref=e176]:
                - generic [ref=e177]: 核验终端
                - generic [ref=e178]:
                  - text: A 1 → B 2
                  - generic [ref=e179]:
                    - generic [ref=e180]: "+1"
                    - generic "代价" [ref=e181]
              - listitem [ref=e189]:
                - generic [ref=e190]: 统计范围内的人员工时
                - generic [ref=e191]: A 1.5 小时 → B 1.5 小时
              - listitem [ref=e192]:
                - generic [ref=e193]: 统计范围内的设备时长
                - generic [ref=e194]:
                  - text: A 0.5 小时 → B 1.0 小时
                  - generic [ref=e195]:
                    - generic [ref=e196]: +0.5 小时
                    - generic "代价" [ref=e197]
              - listitem [ref=e205]:
                - generic [ref=e206]: 加班
                - generic [ref=e207]: A 0.0 秒 → B 0.0 秒
        - generic [ref=e208]:
          - button "查看证据" [ref=e209] [cursor=pointer]
          - group [ref=e210]:
            - generic "改善 / 退步 / 代价" [ref=e211] [cursor=pointer]
        - group [ref=e212]:
          - generic "样本 n 300 · 观察截止 · A 30:00 / B 30:00" [ref=e213] [cursor=pointer]
        - group [ref=e214]:
          - heading "1 改了什么 · 13" [level=3] [ref=e216] [cursor=pointer]:
            - generic [ref=e217]: "1"
            - text: 改了什么 · 13
        - group [ref=e221]:
          - heading "2 哪些结果发生变化" [level=3] [ref=e223] [cursor=pointer]:
            - generic [ref=e224]: "2"
            - text: 哪些结果发生变化
          - generic [ref=e227]:
            - table [ref=e228]:
              - rowgroup [ref=e229]:
                - row [ref=e230]:
                  - columnheader "指标" [ref=e231]
                  - columnheader "A" [ref=e232]
                  - columnheader "B" [ref=e234]
                  - columnheader "B − A" [ref=e236]
              - rowgroup [ref=e237]:
                - row [ref=e238]:
                  - rowheader "完成人数" [ref=e239]
                  - cell "43" [ref=e240]
                  - cell "41" [ref=e241]
                  - cell "−2 变差" [ref=e242]:
                    - generic [ref=e243]:
                      - generic [ref=e244]: −2
                      - generic "变差" [ref=e245]
                - row [ref=e251]:
                  - rowheader "尚未完成" [ref=e252]
                  - cell "253" [ref=e253]
                  - cell "253" [ref=e254]
                  - cell "0 无变化" [ref=e255]:
                    - generic [ref=e256]:
                      - generic [ref=e257]: "0"
                      - generic "无变化" [ref=e258]
                - row [ref=e262]:
                  - rowheader "中途离开或被拒" [ref=e263]
                  - cell "4" [ref=e264]
                  - cell "6" [ref=e265]
                  - cell "+2 变差" [ref=e266]:
                    - generic [ref=e267]:
                      - generic [ref=e268]: "+2"
                      - generic "变差" [ref=e269]
                - row [ref=e275]:
                  - rowheader "人均等待" [ref=e276]
                  - cell "17.6 分" [ref=e277]
                  - cell "17.6 分" [ref=e278]
                  - cell "−2.4 秒 改善 差异小于显示精度" [ref=e279]:
                    - generic [ref=e280]:
                      - generic [ref=e281]: −2.4 秒
                      - generic "改善" [ref=e282]
                      - generic [ref=e288]: 差异小于显示精度
                - row [ref=e289]:
                  - rowheader "P90 等待" [ref=e290]
                  - cell "25.8 分" [ref=e291]
                  - cell "25.8 分" [ref=e292]
                  - cell "0.0 秒 无变化" [ref=e293]:
                    - generic [ref=e294]:
                      - generic [ref=e295]: 0.0 秒
                      - generic "无变化" [ref=e296]
                - row [ref=e300]:
                  - rowheader "全体累计等待" [ref=e301]
                  - cell "5288.6 人·分钟" [ref=e302]
                  - cell "5276.7 人·分钟" [ref=e303]
                  - cell "−11.9 人·分钟 改善" [ref=e304]:
                    - generic [ref=e305]:
                      - generic [ref=e306]: −11.9 人·分钟
                      - generic "改善" [ref=e307]
            - paragraph [ref=e313]: 等待需要结合完成和离开人数一起判断；提前离开也可能让等待变短。
        - group [ref=e314]:
          - heading "3 哪些人受到影响" [level=3] [ref=e316] [cursor=pointer]:
            - generic [ref=e317]: "3"
            - text: 哪些人受到影响
          - generic [ref=e323]:
            - paragraph [ref=e324]: 两个未来中共 300 位已到达参与者
            - generic [ref=e325]:
              - button "12 少等 ≥60 秒" [ref=e326] [cursor=pointer]:
                - generic [ref=e327]: "12"
                - text: 少等 ≥60 秒
              - button "9 多等 ≥60 秒" [ref=e328] [cursor=pointer]:
                - generic [ref=e329]: "9"
                - text: 多等 ≥60 秒
              - button "279 变化不足 60 秒" [ref=e330] [cursor=pointer]:
                - generic [ref=e331]: "279"
                - text: 变化不足 60 秒
            - paragraph [ref=e332]: 等待差值为 B − A，按毫秒精度分组；直方图区间单位为分钟。负值表示少等，不一定代表结局更好。
            - group [ref=e333]:
              - generic "每人等待变化，B − A（分钟）" [ref=e334]
            - generic [ref=e335]:
              - button "7 人只在 B 中完成" [ref=e336] [cursor=pointer]
              - button "9 人只在 A 中完成" [ref=e337] [cursor=pointer]
            - paragraph [ref=e338]: 追踪其中一位：
            - generic [ref=e339]:
              - 'button "侧入口 #10 只在 B 中完成 · 10:55 在 B 中等待减少最多 · −19.6 分 推荐" [ref=e340] [cursor=pointer]':
                - generic [ref=e346]:
                  - text: "侧入口 #10"
                  - generic [ref=e347]: 只在 B 中完成 · 10:55
                  - generic [ref=e348]: 在 B 中等待减少最多 · −19.6 分
                - emphasis [ref=e349]
              - 'button "侧入口 #2 在 B 中等待增加最多 · +24.6 分 只在 A 中完成 · 06:40" [ref=e352] [cursor=pointer]':
                - generic [ref=e358]:
                  - text: "侧入口 #2"
                  - generic [ref=e359]: 在 B 中等待增加最多 · +24.6 分
                  - generic [ref=e360]: 只在 A 中完成 · 06:40
        - group [ref=e361]:
          - heading "4 等待变化集中在哪里" [level=3] [ref=e363] [cursor=pointer]:
            - generic [ref=e364]: "4"
            - text: 等待变化集中在哪里
        - group [ref=e369]:
          - heading "5 付出什么代价" [level=3] [ref=e371] [cursor=pointer]:
            - generic [ref=e372]: "5"
            - text: 付出什么代价
          - generic [ref=e378]:
            - generic [ref=e379]:
              - generic [ref=e380]:
                - term [ref=e381]: 工作人员
                - definition [ref=e382]:
                  - text: 3 → 3
                  - generic [ref=e383]:
                    - generic [ref=e384]: "0"
                    - generic "无变化" [ref=e385]
              - generic [ref=e389]:
                - term [ref=e390]: 核验终端
                - definition [ref=e391]:
                  - text: 1 → 2
                  - generic [ref=e392]:
                    - generic [ref=e393]: "+1"
                    - generic "代价" [ref=e394]
              - generic [ref=e402]:
                - term [ref=e403]: 统计范围内的人员工时
                - definition [ref=e404]:
                  - text: 1.5 小时 → 1.5 小时
                  - generic [ref=e405]:
                    - generic [ref=e406]: 0.0 小时
                    - generic "无变化" [ref=e407]
              - generic [ref=e411]:
                - term [ref=e412]: 统计范围内的设备时长
                - definition [ref=e413]:
                  - text: 0.5 小时 → 1.0 小时
                  - generic [ref=e414]:
                    - generic [ref=e415]: +0.5 小时
                    - generic "代价" [ref=e416]
              - generic [ref=e424]:
                - term [ref=e425]: 加班
                - definition [ref=e426]:
                  - text: 0.0 秒 → 0.0 秒
                  - generic [ref=e427]:
                    - generic [ref=e428]: 0.0 秒
                    - generic "无变化" [ref=e429]
            - generic [ref=e433]: 可用时间中的忙碌占比
            - generic [ref=e435]:
              - generic [ref=e436]:
                - term [ref=e437]: 核验工作人员
                - definition [ref=e438]: 73% → 100%
              - generic [ref=e439]:
                - term [ref=e440]: 机动工作人员
                - definition [ref=e441]: 78% → 98%
              - generic [ref=e442]:
                - term [ref=e443]: 资料工作人员
                - definition [ref=e444]: 94% → 94%
              - generic [ref=e445]:
                - term [ref=e446]: 核验终端 1
                - definition [ref=e447]: 100% → 82%
              - generic [ref=e448]:
                - term [ref=e449]: 核验终端 2
                - definition [ref=e450]: — → 80%
            - generic [ref=e451]: 人员工时和设备时长按所选统计范围内的班次计算。
    - main [ref=e452]:
      - generic [ref=e453]:
        - generic [ref=e454]:
          - heading "同一批参与者 · 两种活动安排" [level=1] [ref=e456]
          - generic "运行完成" [ref=e457]
        - generic [ref=e463]:
          - group "画布排布" [ref=e464]:
            - button "自动" [pressed] [ref=e465] [cursor=pointer]
            - button "上下排列" [ref=e466] [cursor=pointer]
            - button "左右排列" [ref=e467] [cursor=pointer]
          - group "比较阅读重点" [ref=e468]:
            - button "总览" [pressed] [ref=e469] [cursor=pointer]
            - button "访客旅程" [ref=e470] [cursor=pointer]
          - group "画布视图" [ref=e476]:
            - button "分阶段" [pressed] [ref=e477] [cursor=pointer]
            - button "全图" [ref=e489] [cursor=pointer]
          - button "默认视角" [ref=e495] [cursor=pointer]
          - button "全图概览" [ref=e499] [cursor=pointer]
      - generic [ref=e505]:
        - generic [ref=e507]:
          - application [ref=e508]:
            - generic [ref=e510]:
              - generic:
                - generic:
                  - img:
                    - group "Edge from arrival to checked" [ref=e511]
                  - img:
                    - group "Edge from arrival to checkin" [ref=e514]
                  - img:
                    - group "Edge from checkin to checked"
                  - img:
                    - group "Edge from checked to review"
                  - img:
                    - group "Edge from review to recheck" [ref=e517] [cursor=pointer]:
                      - generic [ref=e520]: again
                  - img:
                    - group "Edge from recheck to review" [ref=e522] [cursor=pointer]
                  - img:
                    - group "Edge from review to holding" [ref=e525] [cursor=pointer]:
                      - generic [ref=e528]: forward
                  - img:
                    - group "Edge from holding to packing"
                  - img:
                    - group "Edge from packing to activities" [ref=e530]
                - generic:
                  - generic [ref=e533]:
                    - button "核验与复检 4 个环节" [disabled] [ref=e534]:
                      - generic [ref=e545]: 核验与复检
                      - generic [ref=e546]: 4 个环节
                    - generic [ref=e547]:
                      - generic [ref=e548]: "36"
                      - text: 排队
                    - button "收起阶段 核验与复检" [ref=e549] [cursor=pointer]
                  - group [ref=e553] [cursor=pointer]:
                    - generic [ref=e554]:
                      - strong [ref=e568]: 入场
                      - generic [ref=e569]:
                        - generic [ref=e570]:
                          - generic [ref=e571]: "0"
                          - generic [ref=e572]: 排队
                        - generic [ref=e574]:
                          - generic [ref=e575]: "0"
                          - text: 服务中
                      - button "展开阶段 入场" [ref=e577]
                  - group [ref=e581] [cursor=pointer]:
                    - generic [ref=e582]:
                      - generic "方案差异" [ref=e598]
                      - strong [ref=e605]: 参与活动
                      - generic [ref=e606]:
                        - generic [ref=e607]:
                          - generic [ref=e608]: "0"
                          - generic [ref=e609]: 排队
                        - generic [ref=e610]:
                          - generic [ref=e611]:
                            - generic [ref=e612]: "1"
                            - text: 服务中
                          - generic [ref=e613]:
                            - generic [ref=e614]: "3"
                            - text: 已完成
                      - 'button "追踪 主入口 #1" [ref=e616]':
                        - generic "服务中" [ref=e617]
                      - button "展开阶段 参与活动" [ref=e622]
                  - group [ref=e626] [cursor=pointer]:
                    - generic [ref=e627]:
                      - generic [ref=e629]: 拥堵
                      - strong [ref=e638]: 身份核验
                      - generic [ref=e639]:
                        - generic [ref=e640]:
                          - generic [ref=e641]: "35"
                          - generic "最近 1 分钟（场景时间）排队人数变化" [ref=e642]: +10/分
                          - generic "排队" [ref=e647]
                        - generic [ref=e653]:
                          - generic [ref=e654]: "1"
                          - generic "服务中" [ref=e656]
                        - generic [ref=e662]:
                          - generic [ref=e663]: "7"
                          - generic [ref=e664]: 通过人次
                      - generic [ref=e665]:
                        - 'button "追踪 侧入口 #10" [ref=e666]':
                          - generic "跟随访客" [ref=e672]
                          - generic [ref=e676]: "侧入口 #10"
                        - 'button "追踪 主入口 #5" [ref=e677]':
                          - generic "服务中" [ref=e678]
                        - 'button "追踪 侧入口 #5" [ref=e683]':
                          - generic "等待中" [ref=e684]
                        - 'button "追踪 主入口 #7" [ref=e689]':
                          - generic "等待中" [ref=e690]
                        - 'button "追踪 主入口 #8" [ref=e695]':
                          - generic "等待中" [ref=e696]
                        - generic [ref=e701]: "+31"
                  - group [ref=e703] [cursor=pointer]:
                    - generic [ref=e704]:
                      - strong [ref=e712]: 核验后汇合
                      - generic [ref=e713]:
                        - generic [ref=e714]:
                          - generic [ref=e715]: "0"
                          - generic "排队" [ref=e717]
                        - generic [ref=e723]:
                          - generic [ref=e724]: "0"
                          - generic "服务中" [ref=e726]
                        - generic [ref=e732]:
                          - generic [ref=e733]: "21"
                          - generic [ref=e734]: 通过人次
                  - group [ref=e737] [cursor=pointer]:
                    - generic [ref=e738]:
                      - strong [ref=e744]: 是否复检
                      - generic [ref=e745]:
                        - generic [ref=e746]:
                          - generic [ref=e747]: "0"
                          - generic "排队" [ref=e749]
                        - generic [ref=e755]:
                          - generic [ref=e756]: "0"
                          - generic "服务中" [ref=e758]
                        - generic [ref=e764]:
                          - generic [ref=e765]: "24"
                          - generic [ref=e766]: 通过人次
                      - generic "again" [ref=e768]
                      - generic "forward" [ref=e769]
                  - group [ref=e770] [cursor=pointer]:
                    - generic [ref=e771]:
                      - strong [ref=e778]: 人工复检
                      - generic [ref=e779]:
                        - generic [ref=e780]:
                          - generic [ref=e781]: "1"
                          - generic "排队" [ref=e783]
                        - generic [ref=e789]:
                          - generic [ref=e790]: "0"
                          - generic "服务中" [ref=e792]
                        - generic [ref=e798]:
                          - generic [ref=e799]: "3"
                          - generic [ref=e800]: 通过人次
                      - 'button "追踪 主入口 #16" [ref=e802]':
                        - generic "等待中" [ref=e803]
                  - group [ref=e809] [cursor=pointer]:
                    - generic [ref=e810]:
                      - strong [ref=e817]: 分批等候
                      - generic [ref=e818]:
                        - generic [ref=e819]:
                          - generic [ref=e820]: "0"
                          - generic "最近 1 分钟（场景时间）排队人数变化" [ref=e821]: −4/分
                          - generic "排队" [ref=e826]
                        - generic [ref=e832]:
                          - generic [ref=e833]: "0"
                          - generic "服务中" [ref=e835]
                        - generic [ref=e841]:
                          - generic [ref=e842]: "20"
                          - generic [ref=e843]: 通过人次
                  - group [ref=e846] [cursor=pointer]:
                    - generic [ref=e847]:
                      - generic [ref=e849]: 拥堵
                      - strong [ref=e858]: 领取资料
                      - generic [ref=e859]:
                        - generic [ref=e860]:
                          - generic [ref=e861]: "14"
                          - generic "最近 1 分钟（场景时间）排队人数变化" [ref=e862]: +8/分
                          - generic "排队" [ref=e867]
                        - generic [ref=e873]:
                          - generic [ref=e874]: "2"
                          - generic "服务中" [ref=e876]
                        - generic [ref=e882]:
                          - generic [ref=e883]: "4"
                          - generic [ref=e884]: 通过人次
                      - generic [ref=e885]:
                        - 'button "追踪 主入口 #12" [ref=e886]':
                          - generic "服务中" [ref=e887]
                        - 'button "追踪 侧入口 #1" [ref=e892]':
                          - generic "服务中" [ref=e893]
                        - 'button "追踪 主入口 #14" [ref=e898]':
                          - generic "等待中" [ref=e899]
                        - 'button "追踪 主入口 #2" [ref=e904]':
                          - generic "等待中" [ref=e905]
                        - 'button "追踪 主入口 #15" [ref=e910]':
                          - generic "等待中" [ref=e911]
                        - generic [ref=e916]: "+11"
            - generic "Control Panel" [ref=e918]:
              - button "Zoom In" [ref=e919] [cursor=pointer]
              - button "Zoom Out" [ref=e922] [cursor=pointer]
            - link "React Flow attribution" [ref=e926] [cursor=pointer]:
              - /url: https://reactflow.dev?utm_source=attribution
              - text: React Flow
          - generic [ref=e928]:
            - generic [ref=e929]: A
            - generic "方案 A · 基线" [ref=e930]
            - generic [ref=e931]: 只读
            - generic [ref=e932]: "侧入口 #10 · 在身份核验排队，已等 2.2 分"
        - generic [ref=e939]:
          - application [ref=e940]:
            - generic [ref=e942]:
              - generic:
                - generic:
                  - img:
                    - group "Edge from arrival to checked" [ref=e943]
                  - img:
                    - group "Edge from arrival to lane-choice" [ref=e946]
                  - img:
                    - group "Edge from checkin to checked" [ref=e949] [cursor=pointer]
                  - img:
                    - group "Edge from checked to review"
                  - img:
                    - group "Edge from review to recheck" [ref=e952] [cursor=pointer]:
                      - generic [ref=e955]: again
                  - img:
                    - group "Edge from recheck to review" [ref=e957] [cursor=pointer]
                  - img:
                    - group "Edge from review to holding" [ref=e960] [cursor=pointer]:
                      - generic [ref=e963]: forward
                  - img:
                    - group "Edge from holding to packing"
                  - img:
                    - group "Edge from packing to activities" [ref=e965]
                  - img:
                    - group "Edge from lane-choice to checkin" [ref=e968] [cursor=pointer]:
                      - generic [ref=e971]: first
                  - img:
                    - group "Edge from lane-choice to checkin-extra" [ref=e973] [cursor=pointer]:
                      - generic [ref=e976]: second
                  - img:
                    - group "Edge from checkin-extra to checked" [ref=e978] [cursor=pointer]
                - generic:
                  - generic [ref=e981]:
                    - button "核验与复检 6 个环节" [disabled] [ref=e982]:
                      - generic [ref=e993]: 核验与复检
                      - generic [ref=e994]: 6 个环节
                    - generic [ref=e995]:
                      - generic [ref=e996]: "37"
                      - text: 排队
                    - button "收起阶段 核验与复检" [ref=e997] [cursor=pointer]
                  - group [ref=e1001] [cursor=pointer]:
                    - generic [ref=e1002]:
                      - strong [ref=e1016]: 入场
                      - generic [ref=e1017]:
                        - generic [ref=e1018]:
                          - generic [ref=e1019]: "0"
                          - generic [ref=e1020]: 排队
                        - generic [ref=e1022]:
                          - generic [ref=e1023]: "0"
                          - text: 服务中
                      - button "展开阶段 入场" [ref=e1025]
                  - group [ref=e1029] [cursor=pointer]:
                    - generic [ref=e1030]:
                      - generic "方案差异" [ref=e1046]
                      - strong [ref=e1053]: 参与活动
                      - generic [ref=e1054]:
                        - generic [ref=e1055]:
                          - generic [ref=e1056]: "0"
                          - generic [ref=e1057]: 排队
                        - generic [ref=e1058]:
                          - generic [ref=e1059]:
                            - generic [ref=e1060]: "0"
                            - text: 服务中
                          - generic [ref=e1061]:
                            - generic [ref=e1062]: "4"
                            - text: 已完成
                      - button "展开阶段 参与活动" [ref=e1064]
                  - group [ref=e1068] [cursor=pointer]:
                    - generic [ref=e1069]:
                      - generic [ref=e1071]: 拥堵
                      - strong [ref=e1080]: 身份核验
                      - generic [ref=e1081]:
                        - generic [ref=e1082]:
                          - generic [ref=e1083]: "14"
                          - generic "最近 1 分钟（场景时间）排队人数变化" [ref=e1084]: +4/分
                          - generic "排队" [ref=e1089]
                        - generic [ref=e1095]:
                          - generic [ref=e1096]: "1"
                          - generic "服务中" [ref=e1098]
                        - generic [ref=e1104]:
                          - generic [ref=e1105]: "7"
                          - generic [ref=e1106]: 通过人次
                      - generic [ref=e1107]:
                        - 'button "追踪 侧入口 #10" [ref=e1108]':
                          - generic "跟随访客" [ref=e1114]
                          - generic [ref=e1118]: "侧入口 #10"
                        - 'button "追踪 主入口 #13" [ref=e1119]':
                          - generic "等待中" [ref=e1120]
                        - 'button "追踪 侧入口 #12" [ref=e1125]':
                          - generic "等待中" [ref=e1126]
                        - 'button "追踪 侧入口 #14" [ref=e1131]':
                          - generic "等待中" [ref=e1132]
                        - 'button "追踪 主入口 #18" [ref=e1137]':
                          - generic "等待中" [ref=e1138]
                        - generic [ref=e1143]: "+10"
                  - group [ref=e1145] [cursor=pointer]:
                    - generic [ref=e1146]:
                      - strong [ref=e1154]: 核验后汇合
                      - generic [ref=e1155]:
                        - generic [ref=e1156]:
                          - generic [ref=e1157]: "0"
                          - generic "排队" [ref=e1159]
                        - generic [ref=e1165]:
                          - generic [ref=e1166]: "0"
                          - generic "服务中" [ref=e1168]
                        - generic [ref=e1174]:
                          - generic [ref=e1175]: "21"
                          - generic [ref=e1176]: 通过人次
                  - group [ref=e1179] [cursor=pointer]:
                    - generic [ref=e1180]:
                      - strong [ref=e1186]: 是否复检
                      - generic [ref=e1187]:
                        - generic [ref=e1188]:
                          - generic [ref=e1189]: "0"
                          - generic "排队" [ref=e1191]
                        - generic [ref=e1197]:
                          - generic [ref=e1198]: "0"
                          - generic "服务中" [ref=e1200]
                        - generic [ref=e1206]:
                          - generic [ref=e1207]: "24"
                          - generic [ref=e1208]: 通过人次
                      - generic "again" [ref=e1210]
                      - generic "forward" [ref=e1211]
                  - group [ref=e1212] [cursor=pointer]:
                    - generic [ref=e1213]:
                      - strong [ref=e1220]: 人工复检
                      - generic [ref=e1221]:
                        - generic [ref=e1222]:
                          - generic [ref=e1223]: "2"
                          - generic "最近 1 分钟（场景时间）排队人数变化" [ref=e1224]: +1/分
                          - generic "排队" [ref=e1229]
                        - generic [ref=e1235]:
                          - generic [ref=e1236]: "0"
                          - generic "服务中" [ref=e1238]
                        - generic [ref=e1244]:
                          - generic [ref=e1245]: "3"
                          - generic [ref=e1246]: 通过人次
                      - generic [ref=e1247]:
                        - 'button "追踪 主入口 #16" [ref=e1248]':
                          - generic "等待中" [ref=e1249]
                        - 'button "追踪 主入口 #10" [ref=e1254]':
                          - generic "等待中" [ref=e1255]
                  - group [ref=e1261] [cursor=pointer]:
                    - generic [ref=e1262]:
                      - strong [ref=e1269]: 分批等候
                      - generic [ref=e1270]:
                        - generic [ref=e1271]:
                          - generic [ref=e1272]: "0"
                          - generic "最近 1 分钟（场景时间）排队人数变化" [ref=e1273]: −4/分
                          - generic "排队" [ref=e1278]
                        - generic [ref=e1284]:
                          - generic [ref=e1285]: "0"
                          - generic "服务中" [ref=e1287]
                        - generic [ref=e1293]:
                          - generic [ref=e1294]: "19"
                          - generic [ref=e1295]: 通过人次
                  - group [ref=e1298] [cursor=pointer]:
                    - generic [ref=e1299]:
                      - generic [ref=e1301]: 拥堵
                      - strong [ref=e1310]: 领取资料
                      - generic [ref=e1311]:
                        - generic [ref=e1312]:
                          - generic [ref=e1313]: "13"
                          - generic "最近 1 分钟（场景时间）排队人数变化" [ref=e1314]: +7/分
                          - generic "排队" [ref=e1319]
                        - generic [ref=e1325]:
                          - generic [ref=e1326]: "2"
                          - generic "服务中" [ref=e1328]
                        - generic [ref=e1334]:
                          - generic [ref=e1335]: "4"
                          - generic [ref=e1336]: 通过人次
                      - generic [ref=e1337]:
                        - 'button "追踪 主入口 #12" [ref=e1338]':
                          - generic "服务中" [ref=e1339]
                        - 'button "追踪 侧入口 #1" [ref=e1344]':
                          - generic "服务中" [ref=e1345]
                        - 'button "追踪 主入口 #14" [ref=e1350]':
                          - generic "等待中" [ref=e1351]
                        - 'button "追踪 主入口 #2" [ref=e1356]':
                          - generic "等待中" [ref=e1357]
                        - 'button "追踪 主入口 #15" [ref=e1362]':
                          - generic "等待中" [ref=e1363]
                        - generic [ref=e1368]: "+10"
                  - group [ref=e1370] [cursor=pointer]:
                    - generic [ref=e1371]:
                      - generic "方案差异" [ref=e1379]
                      - strong [ref=e1386]: 核验通道选择
                      - generic [ref=e1387]:
                        - generic [ref=e1388]:
                          - generic [ref=e1389]: "0"
                          - generic "排队" [ref=e1391]
                        - generic [ref=e1397]:
                          - generic [ref=e1398]: "0"
                          - generic "服务中" [ref=e1400]
                        - generic [ref=e1406]:
                          - generic [ref=e1407]: "43"
                          - generic [ref=e1408]: 通过人次
                      - generic "first" [ref=e1410]
                      - generic "second" [ref=e1411]
                  - group [ref=e1412] [cursor=pointer]:
                    - generic [ref=e1413]:
                      - generic [ref=e1420]:
                        - generic "方案差异" [ref=e1422]
                        - generic [ref=e1429]: 拥堵
                      - strong [ref=e1432]: 第二核验通道
                      - generic [ref=e1433]:
                        - generic [ref=e1434]:
                          - generic [ref=e1435]: "21"
                          - generic "最近 1 分钟（场景时间）排队人数变化" [ref=e1436]: +6/分
                          - generic "排队" [ref=e1441]
                        - generic [ref=e1447]:
                          - generic [ref=e1448]: "0"
                          - generic "服务中" [ref=e1450]
                        - generic [ref=e1456]:
                          - generic [ref=e1457]: "0"
                          - generic [ref=e1458]: 通过人次
                      - generic [ref=e1459]:
                        - 'button "追踪 侧入口 #2" [ref=e1460]':
                          - generic "等待中" [ref=e1461]
                        - 'button "追踪 主入口 #3" [ref=e1466]':
                          - generic "等待中" [ref=e1467]
                        - 'button "追踪 主入口 #4" [ref=e1472]':
                          - generic "等待中" [ref=e1473]
                        - 'button "追踪 侧入口 #4" [ref=e1478]':
                          - generic "等待中" [ref=e1479]
                        - 'button "追踪 侧入口 #5" [ref=e1484]':
                          - generic "等待中" [ref=e1485]
                        - generic [ref=e1490]: "+16"
            - generic "Control Panel" [ref=e1492]:
              - button "Zoom In" [ref=e1493] [cursor=pointer]
              - button "Zoom Out" [ref=e1496] [cursor=pointer]
            - link "React Flow attribution" [ref=e1500] [cursor=pointer]:
              - /url: https://reactflow.dev?utm_source=attribution
              - text: React Flow
          - generic [ref=e1502]:
            - generic [ref=e1503]: B
            - generic "方案 B · 双核验通道" [ref=e1504]
            - generic [ref=e1505]: 只读
            - emphasis [ref=e1506]: 13 项安排变化
            - generic [ref=e1507]: "侧入口 #10 · 正在身份核验接受服务"
      - generic [ref=e1513]:
        - generic [ref=e1514]:
          - button "播放回放" [ref=e1515] [cursor=pointer]
          - button "重置回放" [ref=e1518] [cursor=pointer]
          - time [ref=e1522]:
            - generic [ref=e1523]: 回放
            - text: 03:30
          - slider "回放时间轴" [ref=e1525] [cursor=pointer]: "210"
          - time [ref=e1526]: 120:00
          - generic "1×：每秒播放 30 秒场景时间" [ref=e1527]:
            - combobox "回放速度" [ref=e1528] [cursor=pointer]:
              - option "0.5×"
              - option "1×" [selected]
              - option "2×"
              - option "4×"
              - option "8×"
          - generic [ref=e1529]: 1× = 30 秒/秒
        - tablist [ref=e1530]:
          - tab "同一幽灵 · 两个未来" [ref=e1531] [cursor=pointer]
          - tab "等待与证据" [ref=e1537] [cursor=pointer]
          - tab "资源利用" [ref=e1541] [cursor=pointer]
          - tab "事件记录" [ref=e1545] [cursor=pointer]
          - note "画布图例" [ref=e1549]:
            - generic [ref=e1550]: 服务中
            - generic [ref=e1552]: 排队等待
          - button "改变一个假设" [ref=e1554] [cursor=pointer]
          - button "展开面板" [ref=e1557] [cursor=pointer]
    - complementary "检查器" [ref=e1560]:
      - button "展开检查器" [ref=e1561] [cursor=pointer]:
        - generic [ref=e1565]: 检查器
  - generic [ref=e1566]:
    - status [ref=e1567]: 预演完成 · 300 位参与者 · 11,333 条仿真事件
    - alert
  - contentinfo [ref=e1568]:
    - generic [ref=e1569]: 本地工作台
    - status [ref=e1571]: 预演完成 · 300 位参与者 · 11,333 条仿真事件
    - generic [ref=e1572]:
      - text: 活动流程 / 情景比较
      - button "适用范围" [ref=e1573] [cursor=pointer]
```

# Test source

```ts
  1  | import { expect, test } from '@playwright/test';
  2  | import type { Locator } from '@playwright/test';
  3  | import { compareExample, openExample, pauseAt } from './studio';
  4  |
  5  | async function fullyVisible(locator: Locator) {
  6  |   return locator.evaluate(element => {
  7  |     const rect = element.getBoundingClientRect();
  8  |     let left = 0, top = 0, right = innerWidth, bottom = innerHeight;
  9  |     for (let parent = element.parentElement; parent; parent = parent.parentElement) {
  10 |       const style = getComputedStyle(parent), bounds = parent.getBoundingClientRect();
  11 |       if (/auto|hidden|clip|scroll/.test(style.overflowY)) { top = Math.max(top, bounds.top); bottom = Math.min(bottom, bounds.bottom); }
  12 |       if (/auto|hidden|clip|scroll/.test(style.overflowX)) { left = Math.max(left, bounds.left); right = Math.min(right, bounds.right); }
  13 |     }
  14 |     return rect.width > 0 && rect.height > 0 && rect.left >= left - 1 && rect.right <= right + 1 && rect.top >= top - 1 && rect.bottom <= bottom + 1;
  15 |   });
  16 | }
  17 |
  18 | test('comparison and guest evidence occupy the first screen', async ({ page }, info) => {
  19 |   await page.emulateMedia({ reducedMotion: 'reduce' });
  20 |   const t = await openExample(page, info);
  21 |   const mobile = info.project.name.startsWith('mobile');
  22 |   const guide = await compareExample(page, t);
  23 |   await page.evaluate(() => document.fonts.ready);
  24 |   const noOverflow = async () => expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  25 |   const canvasFits = async () => {
  26 |     await expect(page.locator('.canvas-pane .react-flow')).toHaveCount(2);
  27 |     for (const flow of await page.locator('.canvas-pane .react-flow').all()) {
  28 |       await expect.poll(async () => (await flow.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(180);
  29 |       const stages = flow.locator('.stage-card');
> 30 |       await expect(stages).toHaveCount(3);
     |                            ^ Error: expect(locator).toHaveCount(expected) failed
  31 |       for (const stage of await stages.all()) await expect.poll(() => fullyVisible(stage)).toBe(true);
  32 |     }
  33 |   };
  34 |   if (!mobile) {
  35 |     await pauseAt(page, t, 210);
  36 |     await canvasFits();
  37 |     await page.setViewportSize({ width: 1440, height: 900 });
  38 |     await canvasFits();
  39 |     await page.setViewportSize({ width: 1366, height: 768 });
  40 |     await canvasFits();
  41 |   }
  42 |   await noOverflow();
  43 |   const liveToggle = page.locator('button[aria-controls="comparison-live"]');
  44 |   await liveToggle.click();
  45 |   await expect(page.locator('#comparison-live')).toBeVisible();
  46 |   await guide.getByRole('button', { name: t.guide.actions[0], exact: true }).click();
  47 |   await expect(liveToggle).toHaveAttribute('aria-expanded', 'false');
  48 |   await expect(page.locator('#comparison-live')).toBeHidden();
  49 |   await guide.getByRole('button', { name: t.guide.actions[1], exact: true }).click();
  50 |   await expect(page.locator('.ghost-id code')).toHaveText('side-stream:10');
  51 |   await expect(page.locator('.diff-note')).toContainText('03:30');
  52 |   await expect(page.getByLabel(t.dock.timeline, { exact: true })).toHaveValue('210');
  53 |   const identities = await page.locator('.comparison-identities > span').allTextContents();
  54 |   expect(identities).toHaveLength(2);
  55 |   for (const identity of identities) await expect(page.locator('.ghost-futures')).toContainText(identity.replace(/^[AB] · /, ''));
  56 |   await expect(page.locator('.lane')).toHaveCount(2);
  57 |   if (!mobile) {
  58 |     await expect.poll(() => fullyVisible(page.locator('.ghost-card'))).toBe(true);
  59 |     await expect.poll(() => fullyVisible(page.locator('.diff-note'))).toBe(true);
  60 |     for (const lane of await page.locator('.lane').all()) await expect.poll(() => fullyVisible(lane)).toBe(true);
  61 |     expect(await page.locator('.dock-body').evaluate(element => element.scrollTop)).toBe(0);
  62 |   } else {
  63 |     const identity = await page.locator('.ghost-card').boundingBox();
  64 |     const difference = await page.locator('.diff-note').boundingBox();
  65 |     const roster = await page.locator('.ghost-stories').boundingBox();
  66 |     expect(identity!.y).toBeLessThan(difference!.y);
  67 |     expect(difference!.y).toBeLessThan(roster!.y);
  68 |     await page.locator('.lanes .seg-service').first().click();
  69 |     await expect(page.locator('#journey-segment-detail')).toBeVisible();
  70 |   }
  71 |   await liveToggle.focus();
  72 |   await liveToggle.press('Enter');
  73 |   await expect(page.locator('#comparison-live')).toBeVisible();
  74 |   expect(await liveToggle.evaluate(element => getComputedStyle(element).outlineStyle)).not.toBe('none');
  75 |   await liveToggle.press('Enter');
  76 |   await expect(page.locator('#comparison-live')).toBeHidden();
  77 |   await noOverflow();
  78 |   await page.locator('.journey-header button').first().click();
  79 |   await expect(page.locator('.app')).toHaveClass(/focus-overview/);
  80 |   if (!mobile) await canvasFits();
  81 |   await page.screenshot({ path: info.outputPath('comparison-first-screen.png'), fullPage: false });
  82 | });
  83 |
  84 |
  85 |
```
