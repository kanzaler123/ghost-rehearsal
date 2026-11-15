# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ui\compare-first-screen.spec.ts >> comparison and guest evidence occupy the first screen
- Location: e2e\ui\compare-first-screen.spec.ts:18:1

# Error details

```
TimeoutError: locator.click: Timeout 15000ms exceeded.
Call log:
  - waiting for locator('.lanes .seg-service').first()
    - locator resolved to <button type="button" class="seg seg-service" aria-label="身份核验 · 服务 · 08:00–08:30 · 30.0 秒"></button>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <i class="seg-mark" aria-label="沿路线转移 · 08:30"></i> intercepts pointer events
    - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <i class="seg-mark" aria-label="沿路线转移 · 08:30"></i> intercepts pointer events
    - retrying click action
      - waiting 100ms
    26 × waiting for element to be visible, enabled and stable
       - element is visible, enabled and stable
       - scrolling into view if needed
       - done scrolling
       - <i class="seg-mark" aria-label="沿路线转移 · 08:30"></i> intercepts pointer events
     - retrying click action
       - waiting 500ms

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
      - button "运行预演" [ref=e39] [cursor=pointer]
    - generic [ref=e45]:
      - button "保存到当前浏览器（Ctrl+S）" [ref=e46] [cursor=pointer]
      - generic [ref=e51]: 草稿已保存
      - group [ref=e52]:
        - generic "更多选项" [ref=e53] [cursor=pointer]
        - option "运行到观察截止"
        - option "运行到完成 / 上限" [selected]
    - group "界面语言" [ref=e58]:
      - button "EN" [ref=e59] [cursor=pointer]
      - button "中文" [pressed] [ref=e60] [cursor=pointer]
  - region "A/B/C 决策引导" [ref=e61]:
    - generic [ref=e62]:
      - strong [ref=e63]: 3/6 · 首次差异
      - paragraph [ref=e64]: 检查首次可见变化，不能据此断言原因。
    - generic [ref=e65]:
      - button "查看岗位与资源" [active] [ref=e66] [cursor=pointer]
      - group [ref=e67]:
        - generic "更多选项" [ref=e68] [cursor=pointer]
      - button "退出引导" [ref=e69] [cursor=pointer]
  - generic [ref=e70]:
    - group [ref=e71]:
      - generic "观察截止 · A 30:00 / B 30:00" [ref=e72] [cursor=pointer]
      - option "观察截止" [selected]
      - option "最终结束 / 运行上限"
      - option "至少相差 60 秒" [selected]
      - option "查看任何变化"
    - button "此刻 · 03:30" [ref=e73] [cursor=pointer]
  - navigation "比较阅读重点" [ref=e76]:
    - button "报告" [ref=e77] [cursor=pointer]
    - button "流程画布" [ref=e78] [cursor=pointer]
    - button "访客旅程" [pressed] [ref=e79] [cursor=pointer]
    - button "查看证据" [ref=e80] [cursor=pointer]
  - main [ref=e82]:
    - generic [ref=e83]:
      - generic [ref=e84]:
        - button "播放回放" [ref=e85] [cursor=pointer]
        - button "重置回放" [ref=e88] [cursor=pointer]
        - time [ref=e92]:
          - generic [ref=e93]: 回放
          - text: 03:30
        - slider "回放时间轴" [ref=e95] [cursor=pointer]: "210"
        - generic "1×：每秒播放 30 秒场景时间" [ref=e96]:
          - combobox "回放速度" [ref=e97] [cursor=pointer]:
            - option "0.5×"
            - option "1×" [selected]
            - option "2×"
            - option "4×"
            - option "8×"
      - generic [ref=e99]:
        - generic [ref=e100]:
          - button "返回比较总览" [ref=e102] [cursor=pointer]
          - button "查看证据" [ref=e105] [cursor=pointer]
          - group [ref=e106]:
            - generic "比较证据" [ref=e107] [cursor=pointer]
        - generic [ref=e108]:
          - generic [ref=e109]:
            - generic [ref=e116]:
              - generic [ref=e117]: "侧入口 #10"
              - code [ref=e118]: side-stream:10
              - paragraph [ref=e119]: 01:17 从侧入口到达
              - generic [ref=e120]:
                - generic [ref=e121]:
                  - text: 票种
                  - generic [ref=e122]: regular
                - generic [ref=e123]:
                  - text: 参与方式
                  - generic [ref=e124]: full
            - button "在画布中定位" [ref=e125] [cursor=pointer]
          - generic [ref=e128]:
            - generic [ref=e129]:
              - strong [ref=e130]:
                - generic [ref=e131]: A
                - text: 方案 A · 基线
              - generic [ref=e132]:
                - generic [ref=e133]: 回放状态 · 03:30
                - text: 在身份核验排队，已等 2.2 分
              - generic [ref=e134]:
                - generic [ref=e135]: 观察截止结局 · 30:00
                - text: 尚未完成 · 累计等待 27.6 分
            - generic [ref=e136]:
              - strong [ref=e137]:
                - generic [ref=e138]: B
                - text: 方案 B · 双核验通道
              - generic [ref=e139]:
                - generic [ref=e140]: 回放状态 · 03:30
                - text: 正在身份核验接受服务
              - generic [ref=e141]:
                - generic [ref=e142]: 观察截止结局 · 30:00
                - text: 已完成 · 累计等待 8.0 分
          - region "首次差异" [ref=e143]:
            - generic [ref=e144]:
              - generic [ref=e145]:
                - text: 首次差异 ·
                - time [ref=e146]: 03:30
              - generic [ref=e147]:
                - button "跳到首次差异" [ref=e148] [cursor=pointer]
                - button "查看证据" [ref=e152] [cursor=pointer]
            - generic [ref=e153]:
              - generic [ref=e154]:
                - generic [ref=e155]: A
                - button "身份核验" [ref=e156] [cursor=pointer]
                - time [ref=e157]: 01:17
                - paragraph [ref=e158]: 在身份核验排队，已等 2.2 分
              - generic [ref=e159]:
                - generic [ref=e160]: B
                - button "身份核验" [ref=e161] [cursor=pointer]
                - time [ref=e162]: 03:30
                - paragraph [ref=e163]: 正在身份核验接受服务
          - generic "时间花在哪里 · 观察截止 · 时间带、结局与逐站等待均截至 30:00" [ref=e164]:
            - generic [ref=e166]:
              - generic [ref=e167]: 00:00
              - generic [ref=e168]: 05:00
              - generic [ref=e169]: 10:00
              - generic [ref=e170]: 15:00
              - generic [ref=e171]: 20:00
              - generic [ref=e172]: 25:00
              - generic [ref=e173]: 30:00
            - generic [ref=e174]:
              - generic [ref=e175]: A
              - generic [ref=e176]:
                - button "身份核验 · 排队 · 01:17–08:00 · 6.7 分" [ref=e177] [cursor=pointer]:
                  - generic [ref=e178]: 身份核验
                - button "身份核验 · 服务 · 08:00–08:30 · 30.0 秒" [ref=e179] [cursor=pointer]
                - button "分批等候 · 候场 · 08:30–09:30 · 1.0 分" [ref=e180] [cursor=pointer]
                - button "领取资料 · 排队 · 09:30–29:25 · 19.9 分" [ref=e181] [cursor=pointer]:
                  - generic [ref=e182]: 领取资料
                - button "领取资料 · 服务 · 29:25–30:00 · 35.0 秒 · 观察截止后仍在继续" [ref=e183] [cursor=pointer]
                - generic "沿路线转移 · 01:17" [ref=e184]
                - generic "沿路线转移 · 01:17" [ref=e185]
                - generic "沿路线转移 · 01:17" [ref=e186]
                - generic "沿路线转移 · 08:30" [ref=e187]
                - generic "沿路线转移 · 08:30" [ref=e188]
                - generic "沿路线转移 · 08:30" [ref=e189]
                - generic "沿路线转移 · 09:30" [ref=e190]
                - 'generic "实际统计结束时间: 30:00" [ref=e191]'
            - generic [ref=e192]:
              - generic [ref=e193]: B
              - generic [ref=e194]:
                - button "身份核验 · 排队 · 01:17–03:30 · 2.2 分" [ref=e195] [cursor=pointer]
                - button "身份核验 · 服务 · 03:30–04:00 · 30.0 秒" [ref=e196] [cursor=pointer]
                - button "分批等候 · 候场 · 04:00–04:40 · 40.0 秒" [ref=e197] [cursor=pointer]
                - button "领取资料 · 排队 · 04:40–09:50 · 5.2 分" [ref=e198] [cursor=pointer]
                - button "领取资料 · 服务 · 09:50–10:35 · 45.0 秒" [ref=e199] [cursor=pointer]
                - button "自助说明 · 排队 · 10:35–10:35 · 0.0 秒" [ref=e200] [cursor=pointer]
                - button "自助说明 · 服务 · 10:35–10:55 · 20.0 秒" [ref=e201] [cursor=pointer]
                - generic "沿路线转移 · 01:17" [ref=e202]
                - generic "沿路线转移 · 01:17" [ref=e203]
                - generic "沿路线转移 · 01:17" [ref=e204]
                - generic "沿路线转移 · 01:17" [ref=e205]
                - generic "沿路线转移 · 04:00" [ref=e206]
                - generic "沿路线转移 · 04:00" [ref=e207]
                - generic "沿路线转移 · 04:00" [ref=e208]
                - generic "沿路线转移 · 04:40" [ref=e209]
                - generic "沿路线转移 · 10:35" [ref=e210]
                - generic "沿路线转移 · 10:35" [ref=e211]
                - generic "沿路线转移 · 10:55" [ref=e212]
                - 'generic "实际统计结束时间: 30:00" [ref=e214]'
            - generic "观察截止 · 30:00"
            - generic [ref=e215]: 回放 · 03:30
            - generic: 首次差异 · 03:30
            - paragraph [ref=e216]: 观察截止后仍在继续
            - generic [ref=e217]:
              - list "方案 A · 基线" [ref=e218]:
                - listitem: 身份核验 · 排队 · 01:17–08:00 · 6.7 分
                - listitem: 身份核验 · 服务 · 08:00–08:30 · 30.0 秒
                - listitem: 分批等候 · 候场 · 08:30–09:30 · 1.0 分
                - listitem: 领取资料 · 排队 · 09:30–29:25 · 19.9 分
                - listitem: 领取资料 · 服务 · 29:25–30:00 · 35.0 秒
              - list "方案 B · 双核验通道" [ref=e219]:
                - listitem: 身份核验 · 排队 · 01:17–03:30 · 2.2 分
                - listitem: 身份核验 · 服务 · 03:30–04:00 · 30.0 秒
                - listitem: 分批等候 · 候场 · 04:00–04:40 · 40.0 秒
                - listitem: 领取资料 · 排队 · 04:40–09:50 · 5.2 分
                - listitem: 领取资料 · 服务 · 09:50–10:35 · 45.0 秒
                - listitem: 自助说明 · 排队 · 10:35–10:35 · 0.0 秒
                - listitem: 自助说明 · 服务 · 10:35–10:55 · 20.0 秒
            - generic [ref=e220]:
              - generic [ref=e221]: 排队
              - generic [ref=e223]: 候场
              - generic [ref=e225]: 受阻
              - generic [ref=e227]: 服务
          - group [ref=e229]:
            - generic "观察截止 · 站点 · 原始事件记录 · 39 条" [ref=e230] [cursor=pointer]
        - group [ref=e231]:
          - generic "参与者名单" [ref=e232] [cursor=pointer]
          - generic [ref=e233]:
            - generic [ref=e234]: 参与者名单
            - combobox "参与者名单" [ref=e235] [cursor=pointer]:
              - option "全部 · 300" [selected]
              - option "少等 ≥60 秒 · 12"
              - option "多等 ≥60 秒 · 9"
              - option "变化不足 60 秒 · 279"
              - option "只在 B 中完成 · 7"
              - option "只在 A 中完成 · 9"
          - searchbox "搜索本组姓名或编号" [ref=e237]
          - paragraph [ref=e238]: 300 位参与者
          - generic "参与者名单" [ref=e239]:
            - 'button "主入口 #1 A: 已完成 · B: 已完成 0" [ref=e240] [cursor=pointer]':
              - generic [ref=e246]:
                - generic [ref=e247]: "主入口 #1"
                - generic [ref=e248]: "A: 已完成 · B: 已完成"
              - generic [ref=e249]: "0"
            - 'button "侧入口 #1 A: 中途离开 · B: 中途离开 0" [ref=e250] [cursor=pointer]':
              - generic [ref=e256]:
                - generic [ref=e257]: "侧入口 #1"
                - generic [ref=e258]: "A: 中途离开 · B: 中途离开"
              - generic [ref=e259]: "0"
            - 'button "主入口 #2 A: 已完成 · B: 已完成 0" [ref=e260] [cursor=pointer]':
              - generic [ref=e266]:
                - generic [ref=e267]: "主入口 #2"
                - generic [ref=e268]: "A: 已完成 · B: 已完成"
              - generic [ref=e269]: "0"
            - 'button "侧入口 #2 A: 已完成 · B: 尚未完成 +24.6 分" [ref=e270] [cursor=pointer]':
              - generic [ref=e276]:
                - generic [ref=e277]: "侧入口 #2"
                - generic [ref=e278]: "A: 已完成 · B: 尚未完成"
              - generic [ref=e279]: +24.6 分
            - 'button "主入口 #3 A: 已完成 · B: 尚未完成 +23.5 分" [ref=e280] [cursor=pointer]':
              - generic [ref=e286]:
                - generic [ref=e287]: "主入口 #3"
                - generic [ref=e288]: "A: 已完成 · B: 尚未完成"
              - generic [ref=e289]: +23.5 分
            - 'button "侧入口 #3 A: 已完成 · B: 已完成 0" [ref=e290] [cursor=pointer]':
              - generic [ref=e296]:
                - generic [ref=e297]: "侧入口 #3"
                - generic [ref=e298]: "A: 已完成 · B: 已完成"
              - generic [ref=e299]: "0"
            - 'button "主入口 #4 A: 已完成 · B: 尚未完成 +22.0 分" [ref=e300] [cursor=pointer]':
              - generic [ref=e306]:
                - generic [ref=e307]: "主入口 #4"
                - generic [ref=e308]: "A: 已完成 · B: 尚未完成"
              - generic [ref=e309]: +22.0 分
            - 'button "侧入口 #4 A: 已完成 · B: 尚未完成 +20.8 分" [ref=e310] [cursor=pointer]':
              - generic [ref=e316]:
                - generic [ref=e317]: "侧入口 #4"
                - generic [ref=e318]: "A: 已完成 · B: 尚未完成"
              - generic [ref=e319]: +20.8 分
            - 'button "主入口 #5 A: 已完成 · B: 已完成 −4.5 分" [ref=e320] [cursor=pointer]':
              - generic [ref=e326]:
                - generic [ref=e327]: "主入口 #5"
                - generic [ref=e328]: "A: 已完成 · B: 已完成"
              - generic [ref=e329]: −4.5 分
            - 'button "主入口 #6 A: 已完成 · B: 已完成 0" [ref=e330] [cursor=pointer]':
              - generic [ref=e336]:
                - generic [ref=e337]: "主入口 #6"
                - generic [ref=e338]: "A: 已完成 · B: 已完成"
              - generic [ref=e339]: "0"
            - 'button "侧入口 #5 A: 已完成 · B: 尚未完成 +16.3 分" [ref=e340] [cursor=pointer]':
              - generic [ref=e346]:
                - generic [ref=e347]: "侧入口 #5"
                - generic [ref=e348]: "A: 已完成 · B: 尚未完成"
              - generic [ref=e349]: +16.3 分
            - 'button "主入口 #7 A: 已完成 · B: 尚未完成 +11.8 分" [ref=e350] [cursor=pointer]':
              - generic [ref=e356]:
                - generic [ref=e357]: "主入口 #7"
                - generic [ref=e358]: "A: 已完成 · B: 尚未完成"
              - generic [ref=e359]: +11.8 分
            - 'button "侧入口 #6 A: 中途离开 · B: 中途离开 0" [ref=e360] [cursor=pointer]':
              - generic [ref=e366]:
                - generic [ref=e367]: "侧入口 #6"
                - generic [ref=e368]: "A: 中途离开 · B: 中途离开"
              - generic [ref=e369]: "0"
            - 'button "主入口 #8 A: 已完成 · B: 尚未完成 +11.1 分" [ref=e370] [cursor=pointer]':
              - generic [ref=e376]:
                - generic [ref=e377]: "主入口 #8"
                - generic [ref=e378]: "A: 已完成 · B: 尚未完成"
              - generic [ref=e379]: +11.1 分
            - 'button "侧入口 #7 A: 已完成 · B: 尚未完成 +9.6 分" [ref=e380] [cursor=pointer]':
              - generic [ref=e386]:
                - generic [ref=e387]: "侧入口 #7"
                - generic [ref=e388]: "A: 已完成 · B: 尚未完成"
              - generic [ref=e389]: +9.6 分
            - 'button "主入口 #9 A: 中途离开 · B: 中途离开 −17.3 分" [ref=e390] [cursor=pointer]':
              - generic [ref=e396]:
                - generic [ref=e397]: "主入口 #9"
                - generic [ref=e398]: "A: 中途离开 · B: 中途离开"
              - generic [ref=e399]: −17.3 分
            - 'button "主入口 #10 A: 尚未完成 · B: 已完成 −8.1 分" [ref=e400] [cursor=pointer]':
              - generic [ref=e406]:
                - generic [ref=e407]: "主入口 #10"
                - generic [ref=e408]: "A: 尚未完成 · B: 已完成"
              - generic [ref=e409]: −8.1 分
            - 'button "侧入口 #8 A: 已完成 · B: 已完成 −18.1 分" [ref=e410] [cursor=pointer]':
              - generic [ref=e416]:
                - generic [ref=e417]: "侧入口 #8"
                - generic [ref=e418]: "A: 已完成 · B: 已完成"
              - generic [ref=e419]: −18.1 分
            - 'button "主入口 #11 A: 已完成 · B: 已完成 0" [ref=e420] [cursor=pointer]':
              - generic [ref=e426]:
                - generic [ref=e427]: "主入口 #11"
                - generic [ref=e428]: "A: 已完成 · B: 已完成"
              - generic [ref=e429]: "0"
            - 'button "侧入口 #9 A: 已完成 · B: 尚未完成 +1.3 分" [ref=e430] [cursor=pointer]':
              - generic [ref=e436]:
                - generic [ref=e437]: "侧入口 #9"
                - generic [ref=e438]: "A: 已完成 · B: 尚未完成"
              - generic [ref=e439]: +1.3 分
          - navigation "参与者名单" [ref=e440]:
            - button "上一页" [disabled] [ref=e441]
            - generic [ref=e442]: 1 / 15
            - button "下一页" [ref=e443] [cursor=pointer]
          - group [ref=e444]:
            - generic "从故事开始" [ref=e445] [cursor=pointer]
  - generic [ref=e446]:
    - status [ref=e447]: 预演完成 · 300 位参与者 · 11,333 条仿真事件
    - alert
  - contentinfo [ref=e448]:
    - generic [ref=e449]: 本地工作台
    - status [ref=e451]: 预演完成 · 300 位参与者 · 11,333 条仿真事件
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
  30 |       await expect(stages).toHaveCount(3);
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
> 68 |     await page.locator('.lanes .seg-service').first().click();
     |                                                       ^ TimeoutError: locator.click: Timeout 15000ms exceeded.
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
