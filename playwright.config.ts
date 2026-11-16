import { defineConfig } from '@playwright/test';

const basePath = process.env.PLAYWRIGHT_BASE_PATH ?? '/ghost-rehearsal/';
const port = process.env.PLAYWRIGHT_PORT ?? '4178';

export default defineConfig({
  testDir: './e2e',
  timeout: 180_000,
  globalTimeout: 600_000,
  expect: { timeout: 10_000 },
  workers: 2,
  retries: 0,
  forbidOnly: !!process.env.CI,
  reporter: [['./e2e/release/required-checks.ts'], ['list'], ['html', { open: 'never' }], ['json', { outputFile: 'test-results/browser-results.json' }]],
  use: { baseURL: `http://127.0.0.1:${port}${basePath}`, actionTimeout: 15_000, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: ['en', 'zh'].flatMap(lang => [
    { name: `desktop-${lang}`, use: { browserName: 'chromium' as const, viewport: { width: 1440, height: 1000 } } },
    { name: `mobile-${lang}`, use: { browserName: 'chromium' as const, viewport: { width: 390, height: 844 } } },
  ]),
  webServer: {
    command: `npm run build -- --base=${basePath} && npm run preview -- --port ${port} --strictPort --base=${basePath}`,
    url: `http://127.0.0.1:${port}${basePath}`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
