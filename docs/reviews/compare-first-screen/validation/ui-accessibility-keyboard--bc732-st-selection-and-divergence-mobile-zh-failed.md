# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ui\accessibility.spec.ts >> keyboard replay, menu dismissal, guest selection and divergence
- Location: e2e\ui\accessibility.spec.ts:4:1

# Error details

```
Error: expect(locator).toHaveValue(expected) failed

Locator:  getByLabel('回放时间轴', { exact: true })
Expected: "12.6"
Received: "324.4"
Timeout:  10000ms

Call log:
  - Expect "toHaveValue" getByLabel('回放时间轴', { exact: true }) with timeout 10000ms
  - waiting for getByLabel('回放时间轴', { exact: true })
    - locator resolved to <input min="0" max="7200" step="0.1" type="range" class="scrubber" aria-label="回放时间轴" value="34.056000001430505" aria-valuetext="00:34，共 120:00"/>
    - unexpected value "34.1"
    - locator resolved to <input min="0" max="7200" step="0.1" type="range" class="scrubber" aria-label="回放时间轴" value="36.861000001430504" aria-valuetext="00:36，共 120:00"/>
    - unexpected value "36.9"
    - locator resolved to <input min="0" max="7200" step="0.1" type="range" class="scrubber" aria-label="回放时间轴" value="39.8010000014305" aria-valuetext="00:39，共 120:00"/>
    - unexpected value "39.8"
    - locator resolved to <input min="0" max="7200" step="0.1" type="range" class="scrubber" aria-label="回放时间轴" value="45.28800000071524" aria-valuetext="00:45，共 120:00"/>
    - unexpected value "45.3"
    - locator resolved to <input min="0" max="7200" step="0.1" type="range" class="scrubber" aria-label="回放时间轴" value="48.2460000014305" aria-valuetext="00:48，共 120:00"/>
    - unexpected value "48.2"
    - locator resolved to <input min="0" max="7200" step="0.1" type="range" class="scrubber" aria-label="回放时间轴" value="66.13499999999999" aria-valuetext="01:06，共 120:00"/>
    - unexpected value "66.1"
    - locator resolved to <input min="0" max="7200" step="0.1" type="range" value="84.255" class="scrubber" aria-label="回放时间轴" aria-valuetext="01:24，共 120:00"/>
    - unexpected value "84.3"
    - locator resolved to <input min="0" max="7200" step="0.1" type="range" class="scrubber" aria-label="回放时间轴" value="99.11400000214577" aria-valuetext="01:39，共 120:00"/>
    - unexpected value "99.1"
    - locator resolved to <input min="0" max="7200" step="0.1" type="range" class="scrubber" aria-label="回放时间轴" value="117.35699999928475" aria-valuetext="01:57，共 120:00"/>
    - unexpected value "117.4"
    - locator resolved to <input min="0" max="7200" step="0.1" type="range" class="scrubber" aria-label="回放时间轴" value="135.10199999928477" aria-valuetext="02:15，共 120:00"/>
    - unexpected value "135.1"
    - locator resolved to <input min="0" max="7200" step="0.1" type="range" class="scrubber" aria-label="回放时间轴" value="150.00900000214577" aria-valuetext="02:30，共 120:00"/>
    - unexpected value "150"
    - locator resolved to <input min="0" max="7200" step="0.1" type="range" value="168.18" class="scrubber" aria-label="回放时间轴" aria-valuetext="02:48，共 120:00"/>
    - unexpected value "168.2"
    - locator resolved to <input min="0" max="7200" step="0.1" type="range" class="scrubber" aria-label="回放时间轴" value="186.45000000000002" aria-valuetext="03:06，共 120:00"/>
    - unexpected value "186.5"
    - locator resolved to <input min="0" max="7200" step="0.1" type="range" class="scrubber" aria-label="回放时间轴" value="204.02100000143054" aria-valuetext="03:24，共 120:00"/>
    - unexpected value "204"
    - locator resolved to <input min="0" max="7200" step="0.1" type="range" class="scrubber" aria-label="回放时间轴" value="222.25199999928478" aria-valuetext="03:42，共 120:00"/>
    - unexpected value "222.3"
    - locator resolved to <input min="0" max="7200" step="0.1" type="range" class="scrubber" aria-label="回放时间轴" value="240.40199999928475" aria-valuetext="04:00，共 120:00"/>
    - unexpected value "240.4"
    - locator resolved to <input min="0" max="7200" step="0.1" type="range" class="scrubber" aria-label="回放时间轴" value="258.03900000214577" aria-valuetext="04:18，共 120:00"/>
    - unexpected value "258"
    - locator resolved to <input min="0" max="7200" step="0.1" type="range" class="scrubber" aria-label="回放时间轴" value="273.42600000143057" aria-valuetext="04:33，共 120:00"/>
    - unexpected value "273.4"
    - locator resolved to <input min="0" max="7200" step="0.1" type="range" class="scrubber" aria-label="回放时间轴" value="291.2040000021459" aria-valuetext="04:51，共 120:00"/>
    - unexpected value "291.2"
    - locator resolved to <input min="0" max="7200" step="0.1" type="range" class="scrubber" aria-label="回放时间轴" value="306.09600000143064" aria-valuetext="05:06，共 120:00"/>
    - unexpected value "306.1"
    - locator resolved to <input min="0" max="7200" step="0.1" type="range" class="scrubber" aria-label="回放时间轴" value="324.3690000021459" aria-valuetext="05:24，共 120:00"/>
    - unexpected value "324.4"

```

```yaml
- banner:
  - strong: Ghost Rehearsal
  - text: 双入口开放日 · 方案 A · 基线
  - tablist "画布模式":
    - tab "搭建"
    - tab "预演"
    - tab "双未来" [selected]
  - button "撤销（Ctrl+Z）"
  - button "重做（Ctrl+Shift+Z）" [disabled]
  - button "运行预演"
  - button "保存到当前浏览器（Ctrl+S）"
  - text: 草稿已保存
  - group
  - group "界面语言":
    - button "EN"
    - button "中文" [pressed]
- region "A/B/C 决策引导":
  - strong: 1/6 · 比较 A/B
  - paragraph: 合成示例：一起比较结局、等待和成本。
  - button "追踪同一位访客"
  - group: 更多选项
  - button "退出引导"
- text: A · 方案 A · 基线 B · 方案 B · 双核验通道
- group:
  - text: 观察截止 · A 30:00 / B 30:00 统计口径
  - combobox "统计口径":
    - option "观察截止" [selected]
    - option "最终结束 / 运行上限"
  - text: 等待变化规则
  - combobox "等待变化规则":
    - option "至少相差 60 秒" [selected]
    - option "查看任何变化"
  - text: 选择运行到完成后可查看最终统计；达到运行上限时仍可能有人未完成。
- button "此刻 · 05:24"
- navigation "比较阅读重点":
  - button "报告" [pressed]
  - button "流程画布"
  - button "访客旅程"
  - button "查看证据"
- complementary "按顺序读懂两个未来":
  - button "收起报告" [expanded]
  - button "方案与节点": A · 方案 A · 基线
  - button "稳健性实验台"
  - heading "按顺序读懂两个未来" [level=2]
  - paragraph: 两个方案使用同一组访客 · B 相对 A
  - text: 完成人数
  - strong: −2 变差
  - text: A 43 → B 41 人均等待
  - strong: −2.4 秒 改善 差异小于显示精度
  - text: A 17.6 分 → B 17.6 分 中途离开或被拒
  - strong: +2 变差
  - text: A 4 → B 6 尚未完成
  - strong: 0 无变化
  - text: A 253 → B 253 P90 等待
  - strong: 0.0 秒 无变化
  - text: A 25.8 分 → B 25.8 分 全体累计等待
  - strong: −11.9 人·分钟 改善
  - text: A 5288.6 人·分钟 → B 5276.7 人·分钟 资源代价
  - list:
    - listitem: 工作人员 A 3 → B 3
    - listitem: 核验终端 A 1 → B 2 +1 代价
    - listitem: 统计范围内的人员工时 A 1.5 小时 → B 1.5 小时
    - listitem: 统计范围内的设备时长 A 0.5 小时 → B 1.0 小时 +0.5 小时 代价
    - listitem: 加班 A 0.0 秒 → B 0.0 秒
  - button "查看证据"
  - group: 改善 / 退步 / 代价
  - group: 样本 n 300 · 观察截止 · A 30:00 / B 30:00
  - group:
    - heading "1 改了什么 · 13" [level=3]
  - group:
    - heading "2 哪些结果发生变化" [level=3]
    - table:
      - rowgroup:
        - row "指标 A B B − A":
          - columnheader "指标"
          - columnheader "A"
          - columnheader "B"
          - columnheader "B − A"
      - rowgroup:
        - row "完成人数 43 41 −2 变差":
          - rowheader "完成人数"
          - cell "43"
          - cell "41"
          - cell "−2 变差"
        - row "尚未完成 253 253 0 无变化":
          - rowheader "尚未完成"
          - cell "253"
          - cell "253"
          - cell "0 无变化"
        - row "中途离开或被拒 4 6 +2 变差":
          - rowheader "中途离开或被拒"
          - cell "4"
          - cell "6"
          - cell "+2 变差"
        - row "人均等待 17.6 分 17.6 分 −2.4 秒 改善 差异小于显示精度":
          - rowheader "人均等待"
          - cell "17.6 分"
          - cell "17.6 分"
          - cell "−2.4 秒 改善 差异小于显示精度"
        - row "P90 等待 25.8 分 25.8 分 0.0 秒 无变化":
          - rowheader "P90 等待"
          - cell "25.8 分"
          - cell "25.8 分"
          - cell "0.0 秒 无变化"
        - row "全体累计等待 5288.6 人·分钟 5276.7 人·分钟 −11.9 人·分钟 改善":
          - rowheader "全体累计等待"
          - cell "5288.6 人·分钟"
          - cell "5276.7 人·分钟"
          - cell "−11.9 人·分钟 改善"
    - paragraph: 等待需要结合完成和离开人数一起判断；提前离开也可能让等待变短。
  - group:
    - heading "3 哪些人受到影响" [level=3]
    - paragraph: 两个未来中共 300 位已到达参与者
    - button "12 少等 ≥60 秒"
    - button "9 多等 ≥60 秒"
    - button "279 变化不足 60 秒"
    - paragraph: 等待差值为 B − A，按毫秒精度分组；直方图区间单位为分钟。负值表示少等，不一定代表结局更好。
    - group: 每人等待变化，B − A（分钟）
    - button "7 人只在 B 中完成"
    - button "9 人只在 A 中完成"
    - paragraph: 追踪其中一位：
    - 'button "侧入口 #10 只在 B 中完成 · 10:55 在 B 中等待减少最多 · −19.6 分 推荐"':
      - text: "侧入口 #10 只在 B 中完成 · 10:55 在 B 中等待减少最多 · −19.6 分"
      - emphasis
    - 'button "侧入口 #2 在 B 中等待增加最多 · +24.6 分 只在 A 中完成 · 06:40"'
  - group:
    - heading "4 等待变化集中在哪里" [level=3]
  - group:
    - heading "5 付出什么代价" [level=3]
    - term: 工作人员
    - definition: 3 → 3 0 无变化
    - term: 核验终端
    - definition: 1 → 2 +1 代价
    - term: 统计范围内的人员工时
    - definition: 1.5 小时 → 1.5 小时 0.0 小时 无变化
    - term: 统计范围内的设备时长
    - definition: 0.5 小时 → 1.0 小时 +0.5 小时 代价
    - term: 加班
    - definition: 0.0 秒 → 0.0 秒 0.0 秒 无变化
    - text: 可用时间中的忙碌占比
    - term: 核验工作人员
    - definition: 73% → 100%
    - term: 机动工作人员
    - definition: 78% → 98%
    - term: 资料工作人员
    - definition: 94% → 94%
    - term: 核验终端 1
    - definition: 100% → 82%
    - term: 核验终端 2
    - definition: — → 80%
    - text: 人员工时和设备时长按所选统计范围内的班次计算。
- status: 预演完成 · 300 位参与者 · 11,333 条仿真事件
- alert
- contentinfo:
  - text: 本地工作台
  - status: 预演完成 · 300 位参与者 · 11,333 条仿真事件
```

# Test source

```ts
  1  | import { expect, test } from '@playwright/test';
  2  | import { compareExample, openExample } from './studio';
  3  |
  4  | test('keyboard replay, menu dismissal, guest selection and divergence', async ({ page }, info) => {
  5  |   const t = await openExample(page, info);
  6  |   const menu = page.locator('.workspace-menu > summary');
  7  |   await menu.focus();
  8  |   await menu.press('Enter');
  9  |   await expect(page.locator('.workspace-menu')).toHaveAttribute('open', '');
  10 |   await page.keyboard.press('Escape');
  11 |   await expect(page.locator('.workspace-menu')).not.toHaveAttribute('open');
  12 |   await expect(menu).toBeFocused();
  13 |   const checks = page.locator('.check-chip');
  14 |   await checks.focus();
  15 |   await page.keyboard.press('Enter');
  16 |   await expect(page.getByRole('button', { name: t.stage.closeChecks, exact: true })).toBeFocused();
  17 |   await page.keyboard.press('Escape');
  18 |   await expect(page.locator('.checks-drawer')).toHaveCount(0);
  19 |   await expect(checks).toBeFocused();
  20 |   const addNode = page.locator('.canvas-tools').getByRole('button', { name: t.sidebar.addNode, exact: true });
  21 |   await addNode.focus();
  22 |   await page.keyboard.press('Enter');
  23 |   await expect(page.locator('.canvas-menu').getByRole('textbox', { name: t.canvas.search, exact: true })).toBeFocused();
  24 |   await page.keyboard.press('Escape');
  25 |   await expect(page.locator('.canvas-menu')).toHaveCount(0);
  26 |   await expect(addNode).toBeFocused();
  27 |   await page.getByRole('tab', { name: t.modes.Rehearse, exact: true }).focus();
  28 |   await page.keyboard.press('Enter');
  29 |   const slider = page.getByLabel(t.dock.timeline, { exact: true });
  30 |   await expect(slider).toBeEnabled();
  31 |   const pause = page.getByRole('button', { name: t.dock.pause, exact: true });
  32 |   if (await pause.isVisible()) { await pause.focus(); await page.keyboard.press('Enter'); }
  33 |   await slider.focus();
  34 |   const initial = Number(await slider.inputValue());
  35 |   await slider.press('ArrowRight');
  36 |   expect(Number(await slider.inputValue())).toBeGreaterThan(initial);
  37 |   expect(await slider.evaluate(element => getComputedStyle(element).outlineStyle)).not.toBe('none');
  38 |   await page.getByLabel(t.dock.speed, { exact: true }).focus();
  39 |   await page.keyboard.press('End');
  40 |   await page.keyboard.press('Enter');
  41 |   await expect(page.getByLabel(t.dock.speed, { exact: true })).toHaveValue('8');
  42 |   await page.getByRole('tab', { name: t.modes.Build, exact: true }).click();
  43 |   const guide = await compareExample(page, t);
  44 |   const pauseComparison = page.getByRole('button', { name: t.dock.pause, exact: true });
  45 |   if (await pauseComparison.isVisible()) await pauseComparison.click();
  46 |   const pausedTime = await slider.inputValue();
  47 |   for (const selector of ['.comparison-options', '.guide-options']) {
  48 |     const disclosure = page.locator(selector), summary = disclosure.locator(':scope > summary');
  49 |     await summary.focus();
  50 |     await summary.press('Space');
  51 |     await expect(disclosure).toHaveAttribute('open', '');
> 52 |     await expect(slider).toHaveValue(pausedTime);
     |                          ^ Error: expect(locator).toHaveValue(expected) failed
  53 |     await expect(page.getByRole('button', { name: t.dock.play, exact: true })).toBeVisible();
  54 |     await summary.press('Escape');
  55 |     await expect(disclosure).not.toHaveAttribute('open');
  56 |     await expect(summary).toBeFocused();
  57 |   }
  58 |   await guide.getByRole('button', { name: t.guide.actions[0], exact: true }).focus();
  59 |   await page.keyboard.press('Enter');
  60 |   await guide.getByRole('button', { name: t.guide.actions[1], exact: true }).focus();
  61 |   await page.keyboard.press('Enter');
  62 |   await expect(page.locator('.ghost-id code')).toHaveText('side-stream:10');
  63 |   await expect(page.getByLabel(t.dock.timeline, { exact: true })).toHaveValue('210');
  64 | });
  65 |
```
