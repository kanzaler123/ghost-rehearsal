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
    - generic "Two-Entrance Open House · Plan A · Baseline" [ref=e14]
    - tablist "Canvas mode" [ref=e15]:
      - tab "Build" [ref=e16] [cursor=pointer]
      - tab "Rehearse" [ref=e22] [cursor=pointer]
      - tab "Two Futures" [selected] [ref=e26] [cursor=pointer]
    - generic [ref=e30]:
      - button "Undo (Ctrl+Z)" [ref=e31] [cursor=pointer]
      - button "Redo (Ctrl+Shift+Z)" [disabled] [ref=e35]
      - button "Run rehearsal" [ref=e40] [cursor=pointer]
    - generic [ref=e46]:
      - button "Save in this browser (Ctrl+S)" [ref=e47] [cursor=pointer]
      - generic [ref=e52]: Draft saved
      - group [ref=e53]:
        - generic "More options" [ref=e54] [cursor=pointer]
        - option "Stop at cutoff"
        - option "Run to completion" [selected]
    - group "Interface language" [ref=e59]:
      - button "EN" [pressed] [ref=e60] [cursor=pointer]
      - button "中文" [ref=e61] [cursor=pointer]
  - region "A/B/C decision guide" [ref=e62]:
    - generic [ref=e63]:
      - strong [ref=e64]: 3/6 · First difference
      - paragraph [ref=e65]: Inspect the first visible change; it does not establish a cause.
    - generic [ref=e66]:
      - button "Inspect posts and resources" [ref=e67] [cursor=pointer]
      - group [ref=e68]:
        - generic "More options" [ref=e69] [cursor=pointer]
      - button "Exit guide" [ref=e70] [cursor=pointer]
  - generic [ref=e71]:
    - generic [ref=e72]:
      - generic [ref=e73]: A · Plan A · Baseline
      - generic [ref=e74]: B · Plan B · Two check-in lanes
    - group [ref=e75]:
      - generic "Observation cutoff · A 30:00 / B 30:00" [ref=e76] [cursor=pointer]
      - option "Observation cutoff" [selected]
      - option "Final / run limit"
      - option "At least 60 seconds" [selected]
      - option "Any change"
    - button "Now · 03:30" [ref=e77] [cursor=pointer]
  - generic [ref=e80]:
    - complementary "Read the two futures" [ref=e81]:
      - generic [ref=e82]:
        - button "Collapse report" [expanded] [ref=e83] [cursor=pointer]
        - button "Plans & nodes" [ref=e84] [cursor=pointer]:
          - generic [ref=e88]: A · Plan A · Baseline
          - generic "Current edit target" [ref=e89]
        - button "Robustness lab" [ref=e93] [cursor=pointer]
      - generic [ref=e96]:
        - generic [ref=e97]:
          - heading "Read the two futures" [level=2] [ref=e98]
          - paragraph [ref=e99]: Both plans use the same group of guests · B relative to A
        - generic "Changes from A to B" [ref=e100]:
          - generic [ref=e101]:
            - generic [ref=e102]: Finished
            - strong [ref=e103]:
              - generic [ref=e104]:
                - generic [ref=e105]: −2
                - generic "Regression" [ref=e106]
            - generic [ref=e112]: A 43 → B 41
          - generic [ref=e113]:
            - generic [ref=e114]: Average wait per guest
            - strong [ref=e115]:
              - generic [ref=e116]:
                - generic [ref=e117]: −2.4 s
                - generic "Gain" [ref=e118]
                - generic [ref=e124]: Differs below display precision
            - generic [ref=e125]: A 17.6 min → B 17.6 min
          - generic [ref=e126]:
            - generic [ref=e127]: Left early or turned away
            - strong [ref=e128]:
              - generic [ref=e129]:
                - generic [ref=e130]: "+2"
                - generic "Regression" [ref=e131]
            - generic [ref=e137]: A 4 → B 6
          - generic [ref=e138]:
            - generic [ref=e139]: Not finished
            - strong [ref=e140]:
              - generic [ref=e141]:
                - generic [ref=e142]: "0"
                - generic "No change" [ref=e143]
            - generic [ref=e147]: A 253 → B 253
          - generic [ref=e148]:
            - generic [ref=e149]: P90 wait
            - strong [ref=e150]:
              - generic [ref=e151]:
                - generic [ref=e152]: 0.0 s
                - generic "No change" [ref=e153]
            - generic [ref=e157]: A 25.8 min → B 25.8 min
          - generic [ref=e158]:
            - generic [ref=e159]: Total waiting, all guests
            - strong [ref=e160]:
              - generic [ref=e161]:
                - generic [ref=e162]: −11.9 person-min
                - generic "Gain" [ref=e163]
            - generic [ref=e169]: A 5,288.6 person-min → B 5,276.7 person-min
          - generic [ref=e170]:
            - generic [ref=e171]: Resource cost
            - list [ref=e172]:
              - listitem [ref=e173]:
                - generic [ref=e174]: Staff
                - generic [ref=e175]: A 3 → B 3
              - listitem [ref=e176]:
                - generic [ref=e177]: ID scanner
                - generic [ref=e178]:
                  - text: A 1 → B 2
                  - generic [ref=e179]:
                    - generic [ref=e180]: "+1"
                    - generic "Cost" [ref=e181]
              - listitem [ref=e189]:
                - generic [ref=e190]: Staffed time in the window
                - generic [ref=e191]: A 1.5 h → B 1.5 h
              - listitem [ref=e192]:
                - generic [ref=e193]: Device time in the window
                - generic [ref=e194]:
                  - text: A 0.5 h → B 1.0 h
                  - generic [ref=e195]:
                    - generic [ref=e196]: +0.5 h
                    - generic "Cost" [ref=e197]
              - listitem [ref=e205]:
                - generic [ref=e206]: Overtime
                - generic [ref=e207]: A 0.0 s → B 0.0 s
        - generic [ref=e208]:
          - button "Inspect the evidence" [ref=e209] [cursor=pointer]
          - group [ref=e210]:
            - generic "Gains / Regressions / Costs" [ref=e211] [cursor=pointer]
        - group [ref=e212]:
          - generic "Sample n 300 · Observation cutoff · A 30:00 / B 30:00" [ref=e213] [cursor=pointer]
        - group [ref=e214]:
          - heading "1 What changed · 13" [level=3] [ref=e216] [cursor=pointer]:
            - generic [ref=e217]: "1"
            - text: What changed · 13
        - group [ref=e221]:
          - heading "2 What the results did" [level=3] [ref=e223] [cursor=pointer]:
            - generic [ref=e224]: "2"
            - text: What the results did
          - generic [ref=e227]:
            - table [ref=e228]:
              - rowgroup [ref=e229]:
                - row [ref=e230]:
                  - columnheader "Measure" [ref=e231]
                  - columnheader "A" [ref=e232]
                  - columnheader "B" [ref=e234]
                  - columnheader "B − A" [ref=e236]
              - rowgroup [ref=e237]:
                - row [ref=e238]:
                  - rowheader "Finished" [ref=e239]
                  - cell "43" [ref=e240]
                  - cell "41" [ref=e241]
                  - cell "−2 Regression" [ref=e242]:
                    - generic [ref=e243]:
                      - generic [ref=e244]: −2
                      - generic "Regression" [ref=e245]
                - row [ref=e251]:
                  - rowheader "Not finished" [ref=e252]
                  - cell "253" [ref=e253]
                  - cell "253" [ref=e254]
                  - cell "0 No change" [ref=e255]:
                    - generic [ref=e256]:
                      - generic [ref=e257]: "0"
                      - generic "No change" [ref=e258]
                - row [ref=e262]:
                  - rowheader "Left early or turned away" [ref=e263]
                  - cell "4" [ref=e264]
                  - cell "6" [ref=e265]
                  - cell "+2 Regression" [ref=e266]:
                    - generic [ref=e267]:
                      - generic [ref=e268]: "+2"
                      - generic "Regression" [ref=e269]
                - row [ref=e275]:
                  - rowheader "Average wait per guest" [ref=e276]
                  - cell "17.6 min" [ref=e277]
                  - cell "17.6 min" [ref=e278]
                  - cell "−2.4 s Gain Differs below display precision" [ref=e279]:
                    - generic [ref=e280]:
                      - generic [ref=e281]: −2.4 s
                      - generic "Gain" [ref=e282]
                      - generic [ref=e288]: Differs below display precision
                - row [ref=e289]:
                  - rowheader "P90 wait" [ref=e290]
                  - cell "25.8 min" [ref=e291]
                  - cell "25.8 min" [ref=e292]
                  - cell "0.0 s No change" [ref=e293]:
                    - generic [ref=e294]:
                      - generic [ref=e295]: 0.0 s
                      - generic "No change" [ref=e296]
                - row [ref=e300]:
                  - rowheader "Total waiting, all guests" [ref=e301]
                  - cell "5,288.6 person-min" [ref=e302]
                  - cell "5,276.7 person-min" [ref=e303]
                  - cell "−11.9 person-min Gain" [ref=e304]:
                    - generic [ref=e305]:
                      - generic [ref=e306]: −11.9 person-min
                      - generic "Gain" [ref=e307]
            - paragraph [ref=e313]: Read waiting alongside completions and departures; leaving early can also shorten a wait.
        - group [ref=e314]:
          - heading "3 Who was affected" [level=3] [ref=e316] [cursor=pointer]:
            - generic [ref=e317]: "3"
            - text: Who was affected
          - generic [ref=e323]:
            - paragraph [ref=e324]: 300 arrived guests in both futures
            - generic [ref=e325]:
              - button "12 Waited ≥60 s less" [ref=e326] [cursor=pointer]:
                - generic [ref=e327]: "12"
                - text: Waited ≥60 s less
              - button "9 Waited ≥60 s more" [ref=e328] [cursor=pointer]:
                - generic [ref=e329]: "9"
                - text: Waited ≥60 s more
              - button "279 Changed by <60 s" [ref=e330] [cursor=pointer]:
                - generic [ref=e331]: "279"
                - text: Changed by <60 s
            - paragraph [ref=e332]: B − A waiting, at millisecond resolution; bins are in minutes. Negative means less waiting, not necessarily a better outcome.
            - group [ref=e333]:
              - generic "Change in each guest’s wait, B − A (minutes)" [ref=e334]
            - generic [ref=e335]:
              - button "7 finished only in B" [ref=e336] [cursor=pointer]
              - button "9 finished only in A" [ref=e337] [cursor=pointer]
            - paragraph [ref=e338]: "Follow one of them:"
            - generic [ref=e339]:
              - 'button "Side entrance #10 Finished only in B · 10:55 Waited less in B · −19.6 min Featured" [ref=e340] [cursor=pointer]':
                - generic [ref=e346]:
                  - text: "Side entrance #10"
                  - generic [ref=e347]: Finished only in B · 10:55
                  - generic [ref=e348]: Waited less in B · −19.6 min
                - emphasis [ref=e349]
              - 'button "Side entrance #2 Waited more in B · +24.6 min Finished only in A · 06:40" [ref=e352] [cursor=pointer]':
                - generic [ref=e358]:
                  - text: "Side entrance #2"
                  - generic [ref=e359]: Waited more in B · +24.6 min
                  - generic [ref=e360]: Finished only in A · 06:40
        - group [ref=e361]:
          - heading "4 Where waiting changed" [level=3] [ref=e363] [cursor=pointer]:
            - generic [ref=e364]: "4"
            - text: Where waiting changed
        - group [ref=e369]:
          - heading "5 What it costs" [level=3] [ref=e371] [cursor=pointer]:
            - generic [ref=e372]: "5"
            - text: What it costs
          - generic [ref=e378]:
            - generic [ref=e379]:
              - generic [ref=e380]:
                - term [ref=e381]: Staff
                - definition [ref=e382]:
                  - text: 3 → 3
                  - generic [ref=e383]:
                    - generic [ref=e384]: "0"
                    - generic "No change" [ref=e385]
              - generic [ref=e389]:
                - term [ref=e390]: ID scanner
                - definition [ref=e391]:
                  - text: 1 → 2
                  - generic [ref=e392]:
                    - generic [ref=e393]: "+1"
                    - generic "Cost" [ref=e394]
              - generic [ref=e402]:
                - term [ref=e403]: Staffed time in the window
                - definition [ref=e404]:
                  - text: 1.5 h → 1.5 h
                  - generic [ref=e405]:
                    - generic [ref=e406]: 0.0 h
                    - generic "No change" [ref=e407]
              - generic [ref=e411]:
                - term [ref=e412]: Device time in the window
                - definition [ref=e413]:
                  - text: 0.5 h → 1.0 h
                  - generic [ref=e414]:
                    - generic [ref=e415]: +0.5 h
                    - generic "Cost" [ref=e416]
              - generic [ref=e424]:
                - term [ref=e425]: Overtime
                - definition [ref=e426]:
                  - text: 0.0 s → 0.0 s
                  - generic [ref=e427]:
                    - generic [ref=e428]: 0.0 s
                    - generic "No change" [ref=e429]
            - generic [ref=e433]: Busy share of available time
            - generic [ref=e435]:
              - generic [ref=e436]:
                - term [ref=e437]: Check-in staff
                - definition [ref=e438]: 73% → 100%
              - generic [ref=e439]:
                - term [ref=e440]: Floater
                - definition [ref=e441]: 78% → 98%
              - generic [ref=e442]:
                - term [ref=e443]: Kit staff
                - definition [ref=e444]: 94% → 94%
              - generic [ref=e445]:
                - term [ref=e446]: ID scanner 1
                - definition [ref=e447]: 100% → 82%
              - generic [ref=e448]:
                - term [ref=e449]: ID scanner 2
                - definition [ref=e450]: — → 80%
            - generic [ref=e451]: Staffed and device time come from shifts inside the selected statistics window.
    - main [ref=e452]:
      - generic [ref=e453]:
        - generic [ref=e454]:
          - heading "Same guests · two arrangements" [level=1] [ref=e456]
          - generic "Run complete" [ref=e457]
        - generic [ref=e463]:
          - group "Canvas arrangement" [ref=e464]:
            - button "Auto" [pressed] [ref=e465] [cursor=pointer]
            - button "Top-bottom" [ref=e466] [cursor=pointer]
            - button "Left-right" [ref=e467] [cursor=pointer]
          - group "Comparison focus" [ref=e468]:
            - button "Overview" [pressed] [ref=e469] [cursor=pointer]
            - button "Guest journey" [ref=e470] [cursor=pointer]
          - group "Canvas view" [ref=e476]:
            - button "Stages" [pressed] [ref=e477] [cursor=pointer]
            - button "Full map" [ref=e489] [cursor=pointer]
          - button "Reset view" [ref=e495] [cursor=pointer]
          - button "Whole flow" [ref=e499] [cursor=pointer]
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
                    - group "Edge from checkin to checked" [ref=e517] [cursor=pointer]
                  - img:
                    - group "Edge from checked to review" [ref=e520] [cursor=pointer]
                  - img:
                    - group "Edge from review to recheck" [ref=e523] [cursor=pointer]:
                      - generic [ref=e526]: again
                  - img:
                    - group "Edge from recheck to review" [ref=e528] [cursor=pointer]
                  - img:
                    - group "Edge from review to holding" [ref=e531] [cursor=pointer]:
                      - generic [ref=e534]: forward
                  - img:
                    - group "Edge from holding to packing"
                  - img:
                    - group "Edge from packing to activities" [ref=e536]
                - generic:
                  - generic [ref=e539]:
                    - button "Check & recheck 4 steps" [disabled] [ref=e540]:
                      - generic [ref=e551]: Check & recheck
                      - generic [ref=e552]: 4 steps
                    - generic [ref=e553]:
                      - generic [ref=e554]: "36"
                      - text: waiting
                    - button "Fold stage Check & recheck" [ref=e555] [cursor=pointer]
                  - group [ref=e559] [cursor=pointer]:
                    - generic [ref=e560]:
                      - strong [ref=e574]: Arrival
                      - generic [ref=e575]:
                        - generic [ref=e576]:
                          - generic [ref=e577]: "0"
                          - generic [ref=e578]: waiting
                        - generic [ref=e580]:
                          - generic [ref=e581]: "0"
                          - text: serving
                      - button "Open stage Arrival" [ref=e583]
                  - group [ref=e587] [cursor=pointer]:
                    - generic [ref=e588]:
                      - generic "Plan difference" [ref=e604]
                      - strong [ref=e611]: Activities
                      - generic [ref=e612]:
                        - generic [ref=e613]:
                          - generic [ref=e614]: "0"
                          - generic [ref=e615]: waiting
                        - generic [ref=e616]:
                          - generic [ref=e617]:
                            - generic [ref=e618]: "1"
                            - text: serving
                          - generic [ref=e619]:
                            - generic [ref=e620]: "3"
                            - text: finished
                      - 'button "Follow Main entrance #1" [ref=e622]':
                        - generic "Being served" [ref=e623]
                      - button "Open stage Activities" [ref=e628]
                  - group [ref=e632] [cursor=pointer]:
                    - generic [ref=e633]:
                      - generic [ref=e635]: Crowded
                      - strong [ref=e644]: ID check
                      - generic [ref=e645]:
                        - generic [ref=e646]:
                          - generic [ref=e647]: "35"
                          - generic "Change in waiting over the last scenario minute" [ref=e648]: +10/min
                          - generic "waiting" [ref=e653]
                        - generic [ref=e659]:
                          - generic [ref=e660]: "1"
                          - generic "serving" [ref=e662]
                        - generic [ref=e668]:
                          - generic [ref=e669]: "7"
                          - generic [ref=e670]: passages
                      - generic [ref=e671]:
                        - 'button "Follow Side entrance #10" [ref=e672]':
                          - generic "Tracked guest" [ref=e678]
                          - generic [ref=e682]: "Side entrance #10"
                        - 'button "Follow Main entrance #5" [ref=e683]':
                          - generic "Being served" [ref=e684]
                        - 'button "Follow Side entrance #5" [ref=e689]':
                          - generic "Waiting" [ref=e690]
                        - 'button "Follow Main entrance #7" [ref=e695]':
                          - generic "Waiting" [ref=e696]
                        - 'button "Follow Main entrance #8" [ref=e701]':
                          - generic "Waiting" [ref=e702]
                        - generic [ref=e707]: "+31"
                  - group [ref=e709] [cursor=pointer]:
                    - generic [ref=e710]:
                      - strong [ref=e718]: After-check merge
                      - generic [ref=e719]:
                        - generic [ref=e720]:
                          - generic [ref=e721]: "0"
                          - generic "waiting" [ref=e723]
                        - generic [ref=e729]:
                          - generic [ref=e730]: "0"
                          - generic "serving" [ref=e732]
                        - generic [ref=e738]:
                          - generic [ref=e739]: "21"
                          - generic [ref=e740]: passages
                  - group [ref=e743] [cursor=pointer]:
                    - generic [ref=e744]:
                      - strong [ref=e750]: Needs recheck?
                      - generic [ref=e751]:
                        - generic [ref=e752]:
                          - generic [ref=e753]: "0"
                          - generic "waiting" [ref=e755]
                        - generic [ref=e761]:
                          - generic [ref=e762]: "0"
                          - generic "serving" [ref=e764]
                        - generic [ref=e770]:
                          - generic [ref=e771]: "24"
                          - generic [ref=e772]: passages
                      - generic "again" [ref=e774]
                      - generic "forward" [ref=e775]
                  - group [ref=e776] [cursor=pointer]:
                    - generic [ref=e777]:
                      - strong [ref=e784]: Manual recheck
                      - generic [ref=e785]:
                        - generic [ref=e786]:
                          - generic [ref=e787]: "1"
                          - generic "waiting" [ref=e789]
                        - generic [ref=e795]:
                          - generic [ref=e796]: "0"
                          - generic "serving" [ref=e798]
                        - generic [ref=e804]:
                          - generic [ref=e805]: "3"
                          - generic [ref=e806]: passages
                      - 'button "Follow Main entrance #16" [ref=e808]':
                        - generic "Waiting" [ref=e809]
                  - group [ref=e815] [cursor=pointer]:
                    - generic [ref=e816]:
                      - strong [ref=e823]: Batch holding
                      - generic [ref=e824]:
                        - generic [ref=e825]:
                          - generic [ref=e826]: "0"
                          - generic "Change in waiting over the last scenario minute" [ref=e827]: −4/min
                          - generic "waiting" [ref=e832]
                        - generic [ref=e838]:
                          - generic [ref=e839]: "0"
                          - generic "serving" [ref=e841]
                        - generic [ref=e847]:
                          - generic [ref=e848]: "20"
                          - generic [ref=e849]: passages
                  - group [ref=e852] [cursor=pointer]:
                    - generic [ref=e853]:
                      - generic [ref=e855]: Crowded
                      - strong [ref=e864]: Kit pickup
                      - generic [ref=e865]:
                        - generic [ref=e866]:
                          - generic [ref=e867]: "14"
                          - generic "Change in waiting over the last scenario minute" [ref=e868]: +8/min
                          - generic "waiting" [ref=e873]
                        - generic [ref=e879]:
                          - generic [ref=e880]: "2"
                          - generic "serving" [ref=e882]
                        - generic [ref=e888]:
                          - generic [ref=e889]: "4"
                          - generic [ref=e890]: passages
                      - generic [ref=e891]:
                        - 'button "Follow Main entrance #12" [ref=e892]':
                          - generic "Being served" [ref=e893]
                        - 'button "Follow Side entrance #1" [ref=e898]':
                          - generic "Being served" [ref=e899]
                        - 'button "Follow Main entrance #14" [ref=e904]':
                          - generic "Waiting" [ref=e905]
                        - 'button "Follow Main entrance #2" [ref=e910]':
                          - generic "Waiting" [ref=e911]
                        - 'button "Follow Main entrance #15" [ref=e916]':
                          - generic "Waiting" [ref=e917]
                        - generic [ref=e922]: "+11"
            - generic "Control Panel" [ref=e924]:
              - button "Zoom In" [ref=e925] [cursor=pointer]
              - button "Zoom Out" [ref=e928] [cursor=pointer]
            - link "React Flow attribution" [ref=e932] [cursor=pointer]:
              - /url: https://reactflow.dev?utm_source=attribution
              - text: React Flow
          - generic [ref=e934]:
            - generic [ref=e935]: A
            - generic "Plan A · Baseline" [ref=e936]
            - generic [ref=e937]: Read-only
            - generic [ref=e938]: "Side entrance #10 · Queuing at ID check for 2.2 min"
        - generic [ref=e945]:
          - application [ref=e946]:
            - generic [ref=e948]:
              - generic:
                - generic:
                  - img:
                    - group "Edge from arrival to checked" [ref=e949]
                  - img:
                    - group "Edge from arrival to lane-choice" [ref=e952]
                  - img:
                    - group "Edge from checkin to checked" [ref=e955] [cursor=pointer]
                  - img:
                    - group "Edge from checked to review" [ref=e958] [cursor=pointer]
                  - img:
                    - group "Edge from review to recheck" [ref=e961] [cursor=pointer]:
                      - generic [ref=e964]: again
                  - img:
                    - group "Edge from recheck to review" [ref=e966] [cursor=pointer]
                  - img:
                    - group "Edge from review to holding" [ref=e969] [cursor=pointer]:
                      - generic [ref=e972]: forward
                  - img:
                    - group "Edge from holding to packing"
                  - img:
                    - group "Edge from packing to activities" [ref=e974]
                  - img:
                    - group "Edge from lane-choice to checkin" [ref=e977] [cursor=pointer]:
                      - generic [ref=e980]: first
                  - img:
                    - group "Edge from lane-choice to checkin-extra" [ref=e982] [cursor=pointer]:
                      - generic [ref=e985]: second
                  - img:
                    - group "Edge from checkin-extra to checked" [ref=e987] [cursor=pointer]
                - generic:
                  - generic [ref=e990]:
                    - button "Check & recheck 6 steps" [disabled] [ref=e991]:
                      - generic [ref=e1002]: Check & recheck
                      - generic [ref=e1003]: 6 steps
                    - generic [ref=e1004]:
                      - generic [ref=e1005]: "37"
                      - text: waiting
                    - button "Fold stage Check & recheck" [ref=e1006] [cursor=pointer]
                  - group [ref=e1010] [cursor=pointer]:
                    - generic [ref=e1011]:
                      - strong [ref=e1025]: Arrival
                      - generic [ref=e1026]:
                        - generic [ref=e1027]:
                          - generic [ref=e1028]: "0"
                          - generic [ref=e1029]: waiting
                        - generic [ref=e1031]:
                          - generic [ref=e1032]: "0"
                          - text: serving
                      - button "Open stage Arrival" [ref=e1034]
                  - group [ref=e1038] [cursor=pointer]:
                    - generic [ref=e1039]:
                      - generic "Plan difference" [ref=e1055]
                      - strong [ref=e1062]: Activities
                      - generic [ref=e1063]:
                        - generic [ref=e1064]:
                          - generic [ref=e1065]: "0"
                          - generic [ref=e1066]: waiting
                        - generic [ref=e1067]:
                          - generic [ref=e1068]:
                            - generic [ref=e1069]: "0"
                            - text: serving
                          - generic [ref=e1070]:
                            - generic [ref=e1071]: "4"
                            - text: finished
                      - button "Open stage Activities" [ref=e1073]
                  - group [ref=e1077] [cursor=pointer]:
                    - generic [ref=e1078]:
                      - generic [ref=e1080]: Crowded
                      - strong [ref=e1089]: ID check
                      - generic [ref=e1090]:
                        - generic [ref=e1091]:
                          - generic [ref=e1092]: "14"
                          - generic "Change in waiting over the last scenario minute" [ref=e1093]: +4/min
                          - generic "waiting" [ref=e1098]
                        - generic [ref=e1104]:
                          - generic [ref=e1105]: "1"
                          - generic "serving" [ref=e1107]
                        - generic [ref=e1113]:
                          - generic [ref=e1114]: "7"
                          - generic [ref=e1115]: passages
                      - generic [ref=e1116]:
                        - 'button "Follow Side entrance #10" [ref=e1117]':
                          - generic "Tracked guest" [ref=e1123]
                          - generic [ref=e1127]: "Side entrance #10"
                        - 'button "Follow Main entrance #13" [ref=e1128]':
                          - generic "Waiting" [ref=e1129]
                        - 'button "Follow Side entrance #12" [ref=e1134]':
                          - generic "Waiting" [ref=e1135]
                        - 'button "Follow Side entrance #14" [ref=e1140]':
                          - generic "Waiting" [ref=e1141]
                        - 'button "Follow Main entrance #18" [ref=e1146]':
                          - generic "Waiting" [ref=e1147]
                        - generic [ref=e1152]: "+10"
                  - group [ref=e1154] [cursor=pointer]:
                    - generic [ref=e1155]:
                      - strong [ref=e1163]: After-check merge
                      - generic [ref=e1164]:
                        - generic [ref=e1165]:
                          - generic [ref=e1166]: "0"
                          - generic "waiting" [ref=e1168]
                        - generic [ref=e1174]:
                          - generic [ref=e1175]: "0"
                          - generic "serving" [ref=e1177]
                        - generic [ref=e1183]:
                          - generic [ref=e1184]: "21"
                          - generic [ref=e1185]: passages
                  - group [ref=e1188] [cursor=pointer]:
                    - generic [ref=e1189]:
                      - strong [ref=e1195]: Needs recheck?
                      - generic [ref=e1196]:
                        - generic [ref=e1197]:
                          - generic [ref=e1198]: "0"
                          - generic "waiting" [ref=e1200]
                        - generic [ref=e1206]:
                          - generic [ref=e1207]: "0"
                          - generic "serving" [ref=e1209]
                        - generic [ref=e1215]:
                          - generic [ref=e1216]: "24"
                          - generic [ref=e1217]: passages
                      - generic "again" [ref=e1219]
                      - generic "forward" [ref=e1220]
                  - group [ref=e1221] [cursor=pointer]:
                    - generic [ref=e1222]:
                      - strong [ref=e1229]: Manual recheck
                      - generic [ref=e1230]:
                        - generic [ref=e1231]:
                          - generic [ref=e1232]: "2"
                          - generic "Change in waiting over the last scenario minute" [ref=e1233]: +1/min
                          - generic "waiting" [ref=e1238]
                        - generic [ref=e1244]:
                          - generic [ref=e1245]: "0"
                          - generic "serving" [ref=e1247]
                        - generic [ref=e1253]:
                          - generic [ref=e1254]: "3"
                          - generic [ref=e1255]: passages
                      - generic [ref=e1256]:
                        - 'button "Follow Main entrance #16" [ref=e1257]':
                          - generic "Waiting" [ref=e1258]
                        - 'button "Follow Main entrance #10" [ref=e1263]':
                          - generic "Waiting" [ref=e1264]
                  - group [ref=e1270] [cursor=pointer]:
                    - generic [ref=e1271]:
                      - strong [ref=e1278]: Batch holding
                      - generic [ref=e1279]:
                        - generic [ref=e1280]:
                          - generic [ref=e1281]: "0"
                          - generic "Change in waiting over the last scenario minute" [ref=e1282]: −4/min
                          - generic "waiting" [ref=e1287]
                        - generic [ref=e1293]:
                          - generic [ref=e1294]: "0"
                          - generic "serving" [ref=e1296]
                        - generic [ref=e1302]:
                          - generic [ref=e1303]: "19"
                          - generic [ref=e1304]: passages
                  - group [ref=e1307] [cursor=pointer]:
                    - generic [ref=e1308]:
                      - generic [ref=e1310]: Crowded
                      - strong [ref=e1319]: Kit pickup
                      - generic [ref=e1320]:
                        - generic [ref=e1321]:
                          - generic [ref=e1322]: "13"
                          - generic "Change in waiting over the last scenario minute" [ref=e1323]: +7/min
                          - generic "waiting" [ref=e1328]
                        - generic [ref=e1334]:
                          - generic [ref=e1335]: "2"
                          - generic "serving" [ref=e1337]
                        - generic [ref=e1343]:
                          - generic [ref=e1344]: "4"
                          - generic [ref=e1345]: passages
                      - generic [ref=e1346]:
                        - 'button "Follow Main entrance #12" [ref=e1347]':
                          - generic "Being served" [ref=e1348]
                        - 'button "Follow Side entrance #1" [ref=e1353]':
                          - generic "Being served" [ref=e1354]
                        - 'button "Follow Main entrance #14" [ref=e1359]':
                          - generic "Waiting" [ref=e1360]
                        - 'button "Follow Main entrance #2" [ref=e1365]':
                          - generic "Waiting" [ref=e1366]
                        - 'button "Follow Main entrance #15" [ref=e1371]':
                          - generic "Waiting" [ref=e1372]
                        - generic [ref=e1377]: "+10"
                  - group [ref=e1379] [cursor=pointer]:
                    - generic [ref=e1380]:
                      - generic "Plan difference" [ref=e1388]
                      - strong [ref=e1395]: Pick a check lane
                      - generic [ref=e1396]:
                        - generic [ref=e1397]:
                          - generic [ref=e1398]: "0"
                          - generic "waiting" [ref=e1400]
                        - generic [ref=e1406]:
                          - generic [ref=e1407]: "0"
                          - generic "serving" [ref=e1409]
                        - generic [ref=e1415]:
                          - generic [ref=e1416]: "43"
                          - generic [ref=e1417]: passages
                      - generic "first" [ref=e1419]
                      - generic "second" [ref=e1420]
                  - group [ref=e1421] [cursor=pointer]:
                    - generic [ref=e1422]:
                      - generic [ref=e1429]:
                        - generic "Plan difference" [ref=e1431]
                        - generic [ref=e1438]: Crowded
                      - strong [ref=e1441]: Second check lane
                      - generic [ref=e1442]:
                        - generic [ref=e1443]:
                          - generic [ref=e1444]: "21"
                          - generic "Change in waiting over the last scenario minute" [ref=e1445]: +6/min
                          - generic "waiting" [ref=e1450]
                        - generic [ref=e1456]:
                          - generic [ref=e1457]: "0"
                          - generic "serving" [ref=e1459]
                        - generic [ref=e1465]:
                          - generic [ref=e1466]: "0"
                          - generic [ref=e1467]: passages
                      - generic [ref=e1468]:
                        - 'button "Follow Side entrance #2" [ref=e1469]':
                          - generic "Waiting" [ref=e1470]
                        - 'button "Follow Main entrance #3" [ref=e1475]':
                          - generic "Waiting" [ref=e1476]
                        - 'button "Follow Main entrance #4" [ref=e1481]':
                          - generic "Waiting" [ref=e1482]
                        - 'button "Follow Side entrance #4" [ref=e1487]':
                          - generic "Waiting" [ref=e1488]
                        - 'button "Follow Side entrance #5" [ref=e1493]':
                          - generic "Waiting" [ref=e1494]
                        - generic [ref=e1499]: "+16"
            - generic "Control Panel" [ref=e1501]:
              - button "Zoom In" [ref=e1502] [cursor=pointer]
              - button "Zoom Out" [ref=e1505] [cursor=pointer]
            - link "React Flow attribution" [ref=e1509] [cursor=pointer]:
              - /url: https://reactflow.dev?utm_source=attribution
              - text: React Flow
          - generic [ref=e1511]:
            - generic [ref=e1512]: B
            - generic "Plan B · Two check-in lanes" [ref=e1513]
            - generic [ref=e1514]: Read-only
            - emphasis [ref=e1515]: 13 changes
            - generic [ref=e1516]: "Side entrance #10 · Being served at ID check"
      - generic [ref=e1522]:
        - generic [ref=e1523]:
          - button "Play replay" [ref=e1524] [cursor=pointer]
          - button "Reset replay" [ref=e1527] [cursor=pointer]
          - time [ref=e1531]:
            - generic [ref=e1532]: Replay
            - text: 03:30
          - slider "Replay timeline" [ref=e1534] [cursor=pointer]: "210"
          - time [ref=e1535]: 120:00
          - generic "1× plays 30 scenario seconds per second" [ref=e1536]:
            - combobox "Replay speed" [ref=e1537] [cursor=pointer]:
              - option "0.5×"
              - option "1×" [selected]
              - option "2×"
              - option "4×"
              - option "8×"
          - generic [ref=e1538]: 1× = 30 s/s
        - tablist [ref=e1539]:
          - tab "One ghost, two futures" [ref=e1540] [cursor=pointer]
          - tab "Waits and evidence" [ref=e1546] [cursor=pointer]
          - tab "Resource use" [ref=e1550] [cursor=pointer]
          - tab "Event log" [ref=e1554] [cursor=pointer]
          - note "How to read the canvas" [ref=e1558]:
            - generic [ref=e1559]: Being served
            - generic [ref=e1561]: Waiting
          - button "Change an assumption" [ref=e1563] [cursor=pointer]
          - button "Expand panel" [ref=e1566] [cursor=pointer]
    - complementary "Inspector" [ref=e1569]:
      - button "Show inspector" [ref=e1570] [cursor=pointer]:
        - generic [ref=e1574]: Inspector
  - generic [ref=e1575]:
    - status [ref=e1576]: Rehearsal complete · 300 guests · 11,333 simulation events
    - alert
  - contentinfo [ref=e1577]:
    - generic [ref=e1578]: Local workbench
    - status [ref=e1580]: Rehearsal complete · 300 guests · 11,333 simulation events
    - generic [ref=e1581]:
      - text: Event flows · scenario comparison
      - button "Scope" [ref=e1582] [cursor=pointer]
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
