# S1 performance and retention evidence

Measured on 2026-11-17 (Asia/Singapore). The immutable baseline is the UI integration checkpoint `51a7ad30e4b75bed4af308f9454387bc3574fba6`; the candidate product is `445c981361bbae4eb6c09830803844016b4d6e78`. Later S1 verification and delivery commits do not change the measured application.

## Method and reproducibility

- Production builds, `/ghost-rehearsal/`, viewport 1440 × 1000, reduced motion, three new browser contexts per engine/build. Windows 10.0.26200, Intel i7-14650HX, 24 logical CPUs, 33,953,857,536 bytes RAM, Node 24.18.0. Chromium 159.0.8154.6 and Playwright WebKit 27.2.
- Fixture: `f075c9cb513b7e7a3cf81095611cb25027b0ccb8:diagnostics/natural-state/original-fixture.json`, SHA-256 `ba158984f24973c9338d0dad668aebff4b6484076f3f82d648794fa8ee94181b`. It has 200 nodes, 300 visitors, and produces 238,500 events. The project file is 51,905 bytes.
- Import, run, seek to 150 seconds, play for four wall-clock seconds, click Pause and wait for two animation frames, seek to 1800 seconds, then import a replacement with an empty graph. The last measurement waits for the empty canvas, then one second and forced GC in Chromium.
- `measure.mjs` records all samples, errors, exact served JS hashes, welcome resource timings and serialized Worker results. It does not suppress browser errors. No tests/builds ran concurrently with the final candidate and repeated-baseline measurements. Sampling was sequential, not randomized ABBA; three samples do not establish statistical significance or a hardware-wide performance guarantee.
- Reproduce by building checkpoint and candidate into separate directories and serving each with `npm run preview -- --port PORT --strictPort --base=/ghost-rehearsal/ --outDir DIST`. Run `node docs/engineering/S1/measure.mjs PHASE http://127.0.0.1:PORT/ghost-rehearsal/ DIST` from the S1 worktree. Results go to `.s1-evidence/PHASE.json`. Install the Chromium/WebKit versions associated with the lockfile first.

Raw evidence: [initial baseline](./baseline-initial.json), [repeated baseline](./baseline.json), [candidate](./candidate.json). The repeated-baseline JSON records the runner's HEAD as `299d288...`; **the served files remain the immutable `51a7ad3...` build**. Its bundle hashes match the initial-baseline JSON. Do not infer the served product from runner HEAD alone.

## Responsiveness

Primary comparison uses the candidate and repeated baseline. Numbers below are all three samples, in milliseconds, with medians in parentheses.

| Metric | Baseline | Candidate |
| --- | --- | --- |
| Chromium p95 animation-frame interval | 50.1 / 66.7 / 66.7 (66.7) | 50.1 / 66.7 / 50.0 (50.1) |
| Chromium Pause → two frames | 227.5 / 226.4 / 396.4 (227.5) | 224.1 / 418.1 / 215.0 (224.1) |
| WebKit p95 animation-frame interval | 204 / 170 / 204 (204) | 209 / 205 / 213 (209) |
| WebKit Pause → two frames | 505.1 / 450.5 / 482.4 (482.4) | 556.7 / 413.3 / 651.9 (556.7) |

The first baseline run had Chromium p95 50.1 / 50.1 / 50.1 ms and WebKit 365 / 227 / 275 ms. Development work overlapped that earlier run, so it is preserved but not used to claim a speedup. The final comparison shows **no WebKit responsiveness gain**, and dense replay is still visibly slow there. Its sampled Pause median increased from 482.4 to 556.7 ms, so the responsiveness limitation remains open rather than being reported as an optimization success. Chromium improved in this small sequential sample, but the first baseline shows substantial variation; no general percentage speedup is claimed.

Canvas node merging now indexes previous nodes by ID rather than scanning per node. Travelers are indexed in one pass by displayed edge group rather than scanned once per edge. Dragging positions, selection, node type changes, collapsed-stage edges, visitor ordering and progress formulas remain intact. Project text and graph checks are cached by their inputs; inactive story/event panels avoid their full calculations. Reader creation/disposal is separate from per-tick reads. These changes reduce repeated work without imposing a new frame-rate promise.

## Actual heap and result retention

Chromium CDP `HeapProfiler.collectGarbage` + `Runtime.getHeapUsage().usedSize`, median of three contexts. These are observed JS heap bytes for the page after GC, not peak allocations, **not** process RSS, device RAM, total browser memory, or serialized JSON size. Other CDP fields remain in the raw JSON.

| Point | Baseline bytes | Candidate bytes |
| --- | ---: | ---: |
| Welcome | 5,679,032 | 5,691,076 |
| Dense run loaded | 52,170,812 | 51,693,400 |
| After replay/end seek | 54,323,344 | 53,419,828 |
| After empty-project replacement | 41,556,980 | 9,308,352 |

The replacement heap drops by 32,248,628 bytes (77.6%), from 39.63 MiB to 8.88 MiB. Active-run memory changes much less. A WeakRef to the previous run remained live in all three baseline Chromium contexts and was cleared in all three candidate contexts after forced GC. A local heap snapshot identified an old App render retained through a status-notice function. Notices now store translated text, and project replacement resets the Worker client as well as the result Map. Reader effects release their caches on run/input/project changes, Build mode and unmount.

WebKit has no comparable forced-GC/heap API in this harness; its `resultStillReachable: true` is not proof of a leak. No WebKit heap number is reported. The large diagnostic heap snapshot remains local, outside the PR.

No arbitrary result eviction was added. The App retains one result per existing plan, protects both comparison sides, and retains the previous successful attempt for retry/cancel recovery. Deleting a plan removes its result; replacing the project clears the previous project's run state. Very many large plan results can still consume substantial memory; low-memory physical devices and the maximum imported plan count have not been profiled.

## Serialization and network are separate measurements

| Measurement | Baseline bytes | Candidate bytes |
| --- | ---: | ---: |
| Project input JSON | 51,905 | 51,905 |
| Serialized Worker `runs` JSON, UTF-8 | 29,997,377 | 29,997,377 |
| Initial JS source compressed with Node gzip | 301,813 | 296,530 |
| Initial JS actual encoded response body | 301,813 | 296,530 |
| Initial JS ResourceTiming transfer size | 302,113 | 296,830 |
| All six welcome subresources, encoded bodies | 696,047 | 689,364 |
| All six welcome subresources, transfer size | 697,847 | 691,164 |

Serialized run JSON is a diagnostic encoding of the Worker message, not the structured-clone byte count and not a network transfer. Network figures come from browser ResourceTiming against the local Vite preview server with fresh contexts. They include JS/CSS/fonts, exclude the HTML navigation, and use the browser's header accounting rather than packet capture. They do not predict CDN or production network timings.

The robustness panel and its CSS are fetched when opened; its JS is absent from the welcome requests. Its production build reports a separate JS chunk of about 25.09 kB (7.83 kB gzip) and CSS of 8.39 kB (1.95 kB gzip). This reduces initial JS gzip by 5,283 bytes (1.75%). Loading, failure and retry were exercised by blocking and then allowing the real chunk request. The main chunk remains above Vite's 500 kB advisory; no blanket chunk-warning suppression was added.
