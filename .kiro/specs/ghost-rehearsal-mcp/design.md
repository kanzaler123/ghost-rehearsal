# Ghost Rehearsal engine MCP server: design

## Files
| File | Role |
| --- | --- |
| `scripts/mcp/tools.ts` | Four tool implementations, their argument validation and descriptors. Pure TypeScript, no I/O except reading the project file requested by `validate_event_project`. |
| `scripts/mcp/server.ts` | JSON-RPC 2.0 / MCP protocol: frame reader, message dispatch, stdio runner. Exports `runStdioServer`; does nothing when imported. |
| `scripts/ghost-rehearsal-mcp.mjs` | Launcher. Bundles `server.ts` with rolldown, caches the bundle, imports it and calls `runStdioServer`. |
| `.kiro/settings/mcp.json` | Workspace registration, `ghost-rehearsal-engine`. |
| `tests/mcp-server.test.ts` | Unit, protocol and child-process tests. |
| `tsconfig.json` | Only change: `include` gains `scripts/mcp/**/*.ts` so both `tsc` runs check the new code. |

Nothing under `src/**` imports these files. Vite builds from `index.html`, so the browser bundle never reaches `scripts/**`. The browser build is checked for MCP identifiers after the build.

## Reuse of product modules
| Need | Module used |
| --- | --- |
| Parse and validate the example | `projectDocumentSchema`, `validateDocument`, `validateGraph` from `src/schemas` |
| Run the engine | `simulate` from `src/simulation/engine` |
| Plan C | `createPackingExperiment` from `src/features/project`, called with `MESSAGES.en` and the used plan IDs, as in the equivalence test |
| Paired populations, final-or-cutoff statistics, first difference, journeys | `comparisonContext`, `statisticsAt`, `journeyOf`, `firstDifference`, `visitorName` from `src/features/analysis` |
| Time label | `formatTime` from `src/features/project` |
| Card | `buildFateCardSvg`, `fateCardFilename`, `FATE_CARD_SIZE` from `src/features/fateCard` |
| Texts and outcome labels | `MESSAGES` from `src/i18n/messages` |
| English display names of the Chinese example | `localizeDocument` from `src/i18n/example` (type-only imports, no React) |

## Baseline cache
The example is parsed once. Runs are memoised per run mode (`cutoff`, `run_to_completion`) for plans A, B and C. The engine is deterministic, so repeated calls return equal data. Each simulation takes about 50 ms. Simulations always run on the unmodified example. `lang` only changes display names, which are not part of the simulation keys (`localizeDocument` documents this).

## Tool details
### verify_simulation_invariants
Order of digests: run mode outer (`cutoff`, `run_to_completion`), plan inner (A, B, C), the same order as the equivalence test. The digest of a run is `sha256(JSON.stringify(run without request))`. The expected values are constants in `tools.ts`. A test reads `tests/ui-redesign-equivalence.test.ts` and checks that the constants equal the digests in its inline snapshot, so a drift between the two fails the suite instead of passing silently. The tool never writes to that file.

Metrics come from `statisticsAt(run, 'cutoff')` for the cutoff scope and `statisticsAt(run, 'completion')` for the run-to-completion scope. A missing statistics object makes `passed` false and reports `null` metrics for that entry.

### inspect_guest_divergence
1. Resolve the baseline for the requested basis: runs of plans A and B in mode `cutoff` for basis `cutoff`, `run_to_completion` for basis `completion`.
2. Build `comparisonContext(runA, runB, basis)`. Any status other than `ready` is a tool error that names the status. This is where "no silent fallback to cutoff" is enforced.
3. Check the guest ID against the population (`run.population`). Unknown IDs fail with a message that includes a few valid IDs.
4. For each side: `stats = statisticsAt(run, basis)`, `journey = journeyOf(run, id, stats.until)`, `outcome = stats.visitors.find(id)`. This is the same input the Journey view uses.
5. `difference = firstDifference(journeyA, journeyB, planA, planB)`. `null` is reported as "no divergence", not as time zero.
6. Names come from `visitorName(id, localizedPlan, localizedScenario)` for each side.
7. Waiting difference is `round((waitB - waitA) * 1000) / 1000`, with null when either side lacks a record.
8. `evidence` holds the basis, both actual statistics ends, arrived and not-arrived counts per side, the paired sample size and the unpaired counts from the context.
9. The summary sentence is built from `MESSAGES[lang]` labels (`outcomes`, `formatWait`) and states the basis. It makes no claim about cause.

### validate_event_project
```
read text (projectJson, else file inside root)
  -> JSON.parse (BOM stripped)        failure: valid=false, issue invalid_json
  -> validateDocument(parsed)         schema issues + batch_without_timeout warnings
  -> if schema ok: for each plan, validateGraph(scenarioOf(plan), plan)
  -> counts per plan
```
`validateDocument` runs `projectDocumentSchema`. Issues keep the schema's own `code`, `severity`, `message`, `entityIds` and `path`. Graph issues also carry the plan ID in `planId`. Messages are the schema's original (Chinese) text.

Path safety: reject empty strings, NUL bytes and non-`.json` extensions; `resolve(root, filePath)`; `realpath` of the target and of the root; accept only if `relative(realRoot, realTarget)` is not absolute and does not start with `..`. Size is checked with `stat` before reading. Errors mention the requested relative path only.

Resource counts per plan: skills, staff, deviceTypes, deviceUnits (`deviceUnitIds` summed over device types), assignments.

### render_fate_card_svg
Builds the same `FateCardInput` as `exportFateCard` in `Journey.tsx`: `cutoff` is the first side's `until` for basis `cutoff` and the larger `until` for basis `completion`. `eventName` is the localized scenario name. The result carries `Buffer.byteLength(svg)`, the width and height from `FATE_CARD_SIZE`, and `hasScriptOrExternalRef` computed by one regular expression over the text (`<script`, `<foreignObject`, `<image`, `href=`, `on...=` attributes, `@import`, `url(` not followed by `#`, `http(s)://` other than the SVG namespace).

### Arguments and errors
Arguments are parsed with strict `zod` objects (zod is already a dependency). Failures and `ToolError` (unknown guest, missing final, path rejected) are returned to the protocol layer as `ToolError`; the protocol layer turns them into `isError: true` results. Unexpected exceptions are also returned as `isError` with the message, and logged to stderr with the stack.

## Protocol layer
```
stdin bytes -> FrameReader -> text frames -> handlePayload -> response text -> frame writer -> stdout
```
- `FrameReader.push(chunk)` keeps a byte buffer. Leading whitespace is skipped. If the next bytes are `Content-Length:` (case-insensitive) it reads headers up to a blank line and then exactly that many bytes. Otherwise it takes bytes up to the next `\n`. Incomplete frames wait for more bytes. Decoding to text happens per whole frame, so multi-byte characters split across chunks are safe. `end()` returns a final unterminated line. A buffer larger than 16 MB without a complete frame is discarded with a parse error.
- Each frame is answered in its own framing (line frame: JSON plus `\n`; header frame: `Content-Length` header plus body).
- `handlePayload(text)`: parse JSON (`-32700` on failure); an array is a batch (empty array: `-32600`); each message goes to `handleMessage`.
- `handleMessage`: objects with `jsonrpc: "2.0"` and a string `method` are accepted. With an `id` they are requests and always get exactly one response. Without an `id` they are notifications and get none.
- Methods: `initialize` echoes the client's `protocolVersion` when it is one of `2025-06-18`, `2025-03-26`, `2024-11-05`, otherwise answers `2025-06-18`. `tools/list` returns descriptors with `readOnlyHint: true`, `destructiveHint: false`, `idempotentHint: true`, `openWorldHint: false`. `tools/call` is described in requirement 13. The server does not enforce the initialization order; Kiro and other clients send `initialize` first anyway.
- `runStdioServer` replaces `console.log`, `console.info` and `console.debug` with stderr writers so a stray log call can never corrupt stdout. It resolves when stdin ends. The process then leaves on its own because no handle remains open; it does not call `process.exit`, so pending stdout writes finish.

## Launcher
1. `root` is `GHOST_REHEARSAL_ROOT` when set, otherwise the parent of the launcher's directory.
2. The cache file is `node_modules/.cache/ghost-rehearsal-mcp.mjs`. A manifest `ghost-rehearsal-mcp.manifest.json` beside it lists the module IDs bundled, the rolldown version and the launcher's own mtime.
3. The cache is fresh when the bundle and manifest exist, the rolldown version is unchanged, and no listed file is missing or newer than the bundle. Entry points that are not in the module list (a newly added import) are covered because the entry `server.ts` is in the list and changes to it make the cache stale.
4. A stale cache is rebuilt with `rolldown({ input, platform: 'node', logLevel: 'silent', onLog })` and `write({ file: <temp>, format: 'esm' })`. Logs from rolldown go to stderr. The temp file is renamed over the cache file. If the rename fails (another process, Windows file lock) the launcher uses the temp file for this run.
5. The launcher imports the bundle with a `file://` URL, calls `runStdioServer({ root })` and sets a non-zero exit code if startup fails.

Windows, macOS and Linux differences are handled by `node:path`, `pathToFileURL` and `fileURLToPath`; no shell features are used.

## Registration
```json
{ "mcpServers": { "ghost-rehearsal-engine": {
  "command": "node", "args": ["scripts/ghost-rehearsal-mcp.mjs"],
  "autoApprove": ["verify_simulation_invariants", "inspect_guest_divergence", "validate_event_project", "render_fate_card_svg"] } } }
```
`args` is relative to the workspace root, which is where Kiro starts workspace servers. The launcher itself does not depend on the working directory.

## Test plan
| Area | Check |
| --- | --- |
| Tools | six digests match; metrics present for A, B, C; side-stream:10 diverges at 210 s (03:30) in both languages; names differ per language; unknown guest and bad arguments fail; `completion` basis uses final ends; invalid JSON gives `invalid_json`; `..`, absolute outside path and non-JSON file are rejected; a schema-invalid plan reports errors; SVG is 1200×630, well-formed, `hasScriptOrExternalRef` false, byte length correct, same text as `buildFateCardSvg` for the same input. |
| Drift | digest constants equal the equivalence test's snapshot. |
| Protocol | line and header framing, chunk splitting, multi-byte characters, notifications get no response, `-32700`, `-32600`, `-32601`, `-32602`, batch, ping, protocol negotiation, stdout contains only JSON-RPC. |
| Process | `node scripts/ghost-rehearsal-mcp.mjs` answers `initialize`, `tools/list` (4 tools), `tools/call` for two tools, stdout lines all parse as JSON-RPC, exit code 0 after stdin closes. |
| Isolation | no file under `src/` mentions `scripts/mcp`; `dist` after build has no MCP identifiers. |

## Risks
- `rolldown` is not a declared dependency. It comes with `vite@8`. If a future Vite stops shipping it, the launcher fails with a clear message and the fix is a dev dependency, which is outside this spec's no-new-dependency rule.
- The first start builds the bundle (about 100 ms on this machine). A cold start with a very slow disk may add a second. The cache removes the cost afterwards.
