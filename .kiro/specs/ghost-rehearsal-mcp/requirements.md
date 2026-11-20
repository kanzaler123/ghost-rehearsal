# Ghost Rehearsal engine MCP server (development-time)
Status: specified 2026-11-20 before implementation. This is a local development tool for Kiro. It is not part of the product, the browser bundle or the deployed site.

## Purpose
Let Kiro call the real discrete-event engine, the plan validator and the fate-card builder through the Model Context Protocol, so that questions about simulation results are answered by running the engine and not by reading code or guessing.

## Boundaries
1. The server is read-only. It never writes project files, never changes simulation state outside its own process and never makes a network request.
2. No change to `src/**`, `examples/**`, `public/**` or `package-lock.json`. No new entry in `package.json` (neither `dependencies` nor `devDependencies`). The six frozen SHA-256 digests in `tests/ui-redesign-equivalence.test.ts` are read, never edited.
3. The only existing files that may change are `tsconfig.json` (to type-check `scripts/mcp/**`) and nothing else outside the new files listed in `design.md`.
4. The browser build (`npm run build -- --base=/ghost-rehearsal/`) contains no MCP code and makes no external runtime request. No file under `src/**` imports from `scripts/**`.
5. The tools reuse the product's own modules (`engine`, `schemas`, `analysis`, `project`, `fateCard`, `messages`, `examples/open-house.json`). They add no second grouping rule, no second digest algorithm and no second SVG layout.

## Tools
6. `verify_simulation_invariants` runs the six real simulations (plans A, B and C, each with run modes `cutoff` and `run_to_completion`) and compares each result digest with the six frozen digests in `tests/ui-redesign-equivalence.test.ts`.
   1. Plan C is created through `createPackingExperiment` from plan B with the English messages, exactly as the equivalence test does. The digest is SHA-256 of `JSON.stringify` of the run without `request`.
   2. The result contains `passed` (true only when all six digests match), one entry per simulation (plan, run mode, expected digest, actual digest, match flag) and the core metrics of A, B and C: `completed`, `unfinished`, `left`, `avgWait`, `p90Wait`.
   3. `left` is rejected + dismissed + diverted + loop_limit, the same definition as the comparison report. Average and P90 waiting include every arrived guest. The `cutoff` scope reports statistics at the observation cutoff and the `run_to_completion` scope reports the final statistics. Each metrics entry also states its actual statistics end, arrived count and not-arrived count.
7. `inspect_guest_divergence` takes `{ visitorId?: string, basis?: "cutoff" | "completion", lang?: "en" | "zh" }` with defaults `side-stream:10`, `cutoff` and `en`. It compares plan A with plan B.
   1. It returns the guest's display name on each side, the first divergence time (seconds and `mm:ss`), the outcome and total waiting time on each side, the waiting difference (B minus A, rounded to a millisecond) and a one-paragraph summary in the requested language.
   2. For the default arguments the first divergence is 210 seconds (03:30). It uses `firstDifference` from `analysis.ts`; it does not implement its own comparison.
   3. It states the basis, each side's actual statistics end, arrived and not-arrived counts, the paired arrived sample size and the guests excluded as unmatched, as the comparison evidence contract requires.
   4. With basis `completion`, both runs are `run_to_completion` runs and use final statistics. If either final result is missing, the tool returns an error. It never falls back to the cutoff.
   5. An unknown guest ID returns an error that names the ID. A guest who exists but has no record on one side (not yet arrived) is reported with a null outcome for that side, not with zero waiting.
8. `validate_event_project` takes `{ filePath?: string, projectJson?: string }`. `projectJson` takes precedence. The default file is `examples/open-house.json`.
   1. It validates with `projectDocumentSchema` and, for each plan whose schema is valid, `validateGraph` against the plan's scenario. It returns `valid` (false when any error-severity issue exists), the error list, the warning list, and per plan the node counts (total and by type), edge count and resource counts (skills, staff, devices, device units, assignments).
   2. Invalid JSON returns `valid: false` with an `invalid_json` error. It does not crash the server and does not use the tool-failure channel.
   3. `filePath` is resolved against the workspace root and must stay inside it after symbolic links are resolved. Absolute paths outside the root, `..` traversal, non-`.json` files, missing files and files over 5 MB are tool errors. The error text never contains file contents.
   4. `projectJson` over 5 MB is a tool error.
9. `render_fate_card_svg` takes `{ visitorId?, basis?, lang? }` with the same defaults as requirement 7. It builds the card with `buildFateCardSvg`, from the same inputs the UI export uses (`journeyOf`, `statisticsAt`, `firstDifference`).
   1. It returns `filename` (from `fateCardFilename`), `width` and `height` (1200 and 630), `byteLength` (UTF-8 bytes), `hasScriptOrExternalRef` and the SVG text. The flag is computed from the SVG text and is false for every card the builder produces.
   2. The SVG is self-contained: no script, no event-handler attribute, no `<image>`, no `href`, no `@import`, no `url()` other than a fragment reference, and no `http(s)` URL other than the SVG namespace.
   3. The same unknown-guest and missing-final rules as requirement 7 apply.
10. All four tools are annotated read-only. Arguments are validated: unknown properties, wrong types and values outside the enumerations are tool errors that name the offending field.

## Protocol
11. The server speaks JSON-RPC 2.0 over stdio with no dependency. It reads newline-delimited JSON and `Content-Length` framed messages, including both mixed in one session and messages split across chunks or containing multi-byte characters. It answers in the framing the request used.
12. It handles `initialize` (protocol version negotiation, `tools` capability, server info), `notifications/initialized`, `ping`, `tools/list` and `tools/call`. Other notifications are ignored. Unknown methods with an ID return `-32601`. Malformed JSON returns `-32700` with a null ID. A request that is not a valid JSON-RPC request returns `-32600`. Batch arrays are answered with an array.
13. `tools/call` returns a text content block and `structuredContent` holding the same result. A tool failure returns `isError: true` with a text message. An unknown tool name returns `-32602`.
14. `stdout` carries JSON-RPC responses only. Diagnostics go to `stderr`. The process exits with status 0 when its input closes.

## Launch and registration
15. `node scripts/ghost-rehearsal-mcp.mjs` starts the server on Windows, macOS and Linux with no install step. It compiles `scripts/mcp/server.ts` with the already-installed `rolldown` programmatic API into `node_modules/.cache/ghost-rehearsal-mcp.mjs`, reuses that file while no source module is newer, and rebuilds when any bundled module, the launcher or the rolldown version changes. Build output and warnings go to `stderr`.
16. `.kiro/settings/mcp.json` registers the server as `ghost-rehearsal-engine` (`command: "node"`, `args: ["scripts/ghost-rehearsal-mcp.mjs"]`) and lists the four read-only tools in `autoApprove`.
17. `rolldown` is an existing transitive dependency of `vite`. It is not declared in `package.json`; if it is missing the launcher exits with a message that says so.

## Tests and acceptance
18. `tests/mcp-server.test.ts` covers: all four tools' return values (side-stream:10 diverging at 03:30, six matching digests, invalid JSON, path traversal, SVG well-formedness and size); a guard that the digest constants equal the ones in `tests/ui-redesign-equivalence.test.ts`; the protocol layer (framing, errors, batch); and a real child process started with `node scripts/ghost-rehearsal-mcp.mjs` that answers `initialize`, `tools/list` and two `tools/call` requests and exits cleanly.
19. Acceptance: `npm run check` and `npm run build -- --base=/ghost-rehearsal/` pass. The built `dist` contains no MCP identifiers. The existing equivalence test still passes unchanged. Results are appended to `tasks.md` with the date.
20. Browser acceptance (`npm run test:browser`) is not required because no browser-visible behavior changes. This is stated in the verification record and is not a claim of browser acceptance.
21. The final in-IDE tool call is performed by the user in Kiro IDE. No Kiro session contribution is recorded by this spec.
