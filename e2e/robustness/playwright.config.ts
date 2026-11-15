import { defineConfig } from '@playwright/test';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export default defineConfig({
  testDir: '.',
  testMatch: '*.browser.ts',
  timeout: 120_000,
  expect: { timeout: 15_000 },
  workers: 1,
  retries: 0,
  reporter: 'list',
  outputDir: join(tmpdir(), 'ghost-rehearsal-robustness-browser'),
  use: {
    baseURL: 'http://127.0.0.1:4189/ghost-rehearsal/',
    browserName: 'chromium',
    actionTimeout: 15_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: ['en', 'zh'].flatMap(lang => [
    { name: `desktop-${lang}`, use: { viewport: { width: 1440, height: 1000 } } },
    { name: `mobile-${lang}`, use: { viewport: { width: 390, height: 844 } } },
  ]),
  webServer: {
    command: 'npm run dev -- --port 4189 --strictPort --base=/ghost-rehearsal/',
    url: 'http://127.0.0.1:4189/ghost-rehearsal/labs/robustness.html',
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
