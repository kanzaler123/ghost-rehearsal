# Ghost Rehearsal engine MCP server: tasks
Boundaries: see `requirements.md` 1–5. No edits to `src/**`, `examples/**`, `public/**`, `package-lock.json` or `package.json`. No `git commit` or `git push`.

- [x] 1. Write `requirements.md`, `design.md` and this file before any implementation.
- [x] 2. `scripts/mcp/tools.ts`: baseline cache, argument validation, `ToolError`, tool descriptors.
  - [x] 2.1 `verify_simulation_invariants` with the six digest constants and A/B/C metrics.
  - [x] 2.2 `inspect_guest_divergence` with `comparisonContext`, `firstDifference` and evidence fields.
  - [x] 2.3 `validate_event_project` with root-confined path reading and per-plan counts.
  - [x] 2.4 `render_fate_card_svg` with the computed self-contained check.
- [x] 3. `scripts/mcp/server.ts`: frame reader, dispatch, stdio runner, stderr-only diagnostics.
- [x] 4. `scripts/ghost-rehearsal-mcp.mjs`: rolldown build, manifest cache, start.
- [ ] 5. `.kiro/settings/mcp.json` with the four tools in `autoApprove`. **Not written:** the agent's file-write permission rule denies `.kiro/settings/`. Create the file by hand with the content under "Registration to add by hand". `tsconfig.json` include is done.
- [x] 6. `tests/mcp-server.test.ts`: tools, drift guard, protocol, child process, isolation. (The registration test reads `.kiro/settings/mcp.json` only when it exists, so it checks the file once it is created.)
- [x] 7. Run `npm run check`.
- [x] 8. Run `npm run build -- --base=/ghost-rehearsal/` and scan `dist` for MCP identifiers.
- [x] 9. Confirm protected files are unchanged (`git diff` on `src`, `examples`, `public`, `package.json`, `package-lock.json`, equivalence test).
- [x] 10. Append verification results below.
- [ ] 11. User: create `.kiro/settings/mcp.json`, refresh MCP in Kiro IDE and call a tool once (final acceptance, not performed by the implementer).

## Registration to add by hand
Create `.kiro/settings/mcp.json` (the file does not exist in this workspace):
```json
{
  "mcpServers": {
    "ghost-rehearsal-engine": {
      "command": "node",
      "args": ["scripts/ghost-rehearsal-mcp.mjs"],
      "disabled": false,
      "autoApprove": [
        "verify_simulation_invariants",
        "inspect_guest_divergence",
        "validate_event_project",
        "render_fate_card_svg"
      ]
    }
  }
}
```

## Verification log
### 2026-11-20 (UTC+8), Windows, Node v24.18.0, vitest 5.1.0, rolldown 1.2.19
Run by the implementing agent in the working tree. No commit was made. Existing uncommitted changes in the tree before this work (`KIRO_USAGE.md`, `README.md`, `docs/**`, `scripts/guard-haunted-invariants.mjs`, `tests/guard-haunted-invariants.test.ts`) were left as they were.

| Check | Result |
| --- | --- |
| `npm run typecheck` (`tsc --noEmit` and `tsc --noEmit -p tsconfig.schemas.json`) | Pass, no diagnostics. `tsconfig.json` now includes `scripts/mcp/**/*.ts`. |
| `npx vitest run tests/mcp-server.test.ts` | 44 of 44 pass. |
| `npm run check` | Pass. 45 test files, 667 of 667 tests (includes `tests/mcp-server.test.ts` and the unchanged `tests/ui-redesign-equivalence.test.ts`). |
| `npm run build -- --base=/ghost-rehearsal/` | Pass (typecheck, then Vite build). |
| `dist` scan for `ghost-rehearsal-engine`, `ghost-rehearsal-mcp`, the four tool names, `runStdioServer`, `FrameReader`, `notifications/initialized`, `scripts/mcp` | 0 files match. |
| `dist` scan for `http(s)` URLs in `src=`, `href=`, `@import url(` and `url(` | 0 files match. |
| `git diff` on `src`, `examples`, `public`, `package.json`, `package-lock.json`, `tests/ui-redesign-equivalence.test.ts` | Empty. |
| Manual start `node scripts/ghost-rehearsal-mcp.mjs` | Cold build and a full session in 363 ms. Also run with another working directory: the launcher found the workspace root itself, and `filePath: "../package.json"` was rejected. |
| Tool output with default arguments | 6 of 6 digests match. `side-stream:10` first diverges at 210 s (03:30). In plan A the guest is unfinished at the cutoff with 1657.857 s waiting. In plan B the guest completed with 482.857 s waiting. Difference B minus A is −1175 s. |
| `npm run test:browser` | Not run. No browser-visible code changed. This is not a browser acceptance claim. |
| `.kiro/settings/mcp.json` | Not created (permission rule). See task 5. |
| In-IDE tool call in Kiro | Not performed. No Kiro session contribution is recorded here. |
