# Unresolved WebKit resize investigation

These diagnostic fixtures are outside the production entry and the normal e2e
suite. They do not suppress browser errors or change application observers.
They are not merge-gate replacements or evidence of physical Safari/iOS support.

Run from the repository root after `npm ci` and installation of the relevant
Playwright browsers and system dependencies:

```sh
npx tsc --noEmit -p diagnostics/resize-observer/tsconfig.json
npx playwright test --config diagnostics/resize-observer/playwright.config.ts
npx playwright test --config diagnostics/resize-observer/playwright.application.config.ts --repeat-each=2
```

The first fixture builds only the real Canvas, its styles and a fixed example
plan. It omits App, Worker, report, replay, comparison header and timeline. It
switches between observed Build/Compare geometries six times, including the
420ms viewport-placement pass, and requires no page errors. The run marker is a
minimal fixture (Canvas only reads its presence), not a simulated result.

The second fixture exercises the actual production application with native,
size-state-deferred and extent-cache-deferred observer variants. It is a
controlled diagnostic, not a production patch: the callback-arity distinction
was checked in pinned @xyflow/react 12.12.1 and its installed @xyflow/system.
The size observer has zero callback parameters; the extent observer takes the
entries parameter. Recheck this assumption before using another library version.
All variants retain the original strict browser-error assertion.

Evidence:

- CI 43764172630: native 1/4 passed, size-state-deferred 4/4 passed,
  extent-cache-deferred 0/4 passed. This narrows the path to the container size
  state publication; it does not identify all downstream causes.
- CI 43764559153: isolated Canvas, native WebKit, both languages repeated twice:
  4/4 passed. Local native Chromium: 2/2 passed. The smaller fixture therefore
  **has not reproduced** the complete application's error.
- Full application errors remain unresolved. Neither application viewport-refit
  deferral nor card-detail deferral fixed them; both changes were removed.

The local environment lacks WebKit system libraries and root authentication;
WebKit evidence comes from hosted CI. No environment permission bypass occurred.
Next step: add the complete app's layout/state transitions back to the isolated
fixture incrementally before choosing a production or dependency patch.
