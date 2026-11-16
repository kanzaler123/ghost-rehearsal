import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '../../../e2e/ui', testMatch: 'creative-redesign.spec.ts', timeout: 60_000,
  workers: 1, retries: 0, reporter: [['list']],
  outputDir: '../../../test-results/redesign-webkit',
  use: { browserName: 'webkit', baseURL: 'http://127.0.0.1:4193/ghost-rehearsal/', trace: 'retain-on-failure' },
  projects: ['en', 'zh'].flatMap(lang => [
    { name: `desktop-${lang}`, use: { viewport: { width: 1440, height: 900 } } },
    { name: `mobile-${lang}`, use: { viewport: { width: 390, height: 844 } } },
  ]),
});
