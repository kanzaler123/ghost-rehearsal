import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: '.', testMatch: 'repro.spec.ts', workers: 1, retries: 0,
  timeout: 60_000, globalTimeout: 240_000,
  projects: (['chromium', 'webkit'] as const).flatMap(browserName => ['en', 'zh'].map(lang => ({ name: `${browserName}-${lang}`, use: { browserName, viewport: { width: 1440, height: 1000 } } }))),
  use: { baseURL: 'http://127.0.0.1:4180', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  outputDir: '../../test-results/resize-repro',
  reporter: [['list'], ['json', { outputFile: '../../test-results/resize-repro-results.json' }]],
  webServer: {
    command: 'npx vite build --config diagnostics/resize-observer/vite.config.ts && npx vite preview --config diagnostics/resize-observer/vite.config.ts --host 127.0.0.1 --port 4180 --strictPort',
    cwd: '../..', url: 'http://127.0.0.1:4180', timeout: 120_000,
  },
});
