import { defineConfig } from '@playwright/test';

// Review-only capture configuration for the ui-creative-redesign branch.
// It serves the existing dist/ build (run `npm run build` first) on port 4191 so it never
// collides with the browser suite (4178) or the dev server (5173).
// Usage: $env:CAPTURE='before'; npx playwright test -c docs/reviews/ui-creative-redesign/playwright.capture.config.ts
export default defineConfig({
  testDir: '.',
  testMatch: /capture\.spec\.ts$/,
  timeout: 240_000,
  expect: { timeout: 15_000 },
  workers: 1,
  retries: 0,
  reporter: [['list']],
  outputDir: '../../../test-results/ui-creative-redesign-capture',
  use: { baseURL: process.env.CAPTURE_URL ?? 'http://127.0.0.1:4191/ghost-rehearsal/', actionTimeout: 15_000, browserName: 'chromium', deviceScaleFactor: 1 },
  projects: process.env.CHECK_VIEWPORTS ? [
    { width: 1920, height: 1080 }, { width: 1280, height: 720 }, { width: 1024, height: 768 }, { width: 768, height: 1024 }, { width: 320, height: 568 },
  ].flatMap(viewport => ['en', 'zh'].map(lang => ({ name: `check-${viewport.width}-${lang}`, use: { viewport } }))) : [
    { name: 'desktop-en', use: { viewport: { width: 1440, height: 900 } } },
    { name: 'laptop-en', use: { viewport: { width: 1366, height: 768 } } },
    { name: 'desktop-zh', use: { viewport: { width: 1440, height: 900 } } },
    { name: 'laptop-zh', use: { viewport: { width: 1366, height: 768 } } },
    { name: 'mobile-zh', use: { viewport: { width: 390, height: 844 } } },
    { name: 'mobile-en', use: { viewport: { width: 390, height: 844 } } },
  ],
  webServer: process.env.CAPTURE_URL ? undefined : {
    command: 'npx vite preview --host 127.0.0.1 --port 4191 --strictPort --base=/ghost-rehearsal/',
    url: 'http://127.0.0.1:4191/ghost-rehearsal/',
    cwd: '../../..',
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
