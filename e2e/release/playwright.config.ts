import { defineConfig } from '@playwright/test';
import base from '../../playwright.config';

const server = base.webServer;
if (!server || Array.isArray(server)) throw new Error('Release tests require the production preview server.');
const critical = ['**/release/critical.spec.ts', '**/release/s1.spec.ts', '**/release/run-navigation.spec.ts', '**/persistence/app.spec.ts'];
const webkit = [...critical, '**/demo/comparison.spec.ts', '**/robustness/integration.spec.ts', '**/data-sources/integration.spec.ts', '**/ui/accessibility.spec.ts', '**/ui/run-states.spec.ts', '**/ui/mobile-navigation.spec.ts', '**/ui/timeline-touch.spec.ts'];
const touch = [...critical, '**/ui/mobile-navigation.spec.ts', '**/ui/timeline-touch.spec.ts'];

export default defineConfig({
  ...base,
  testDir: '..',
  projects: ['en', 'zh'].flatMap(lang => [
    { name: `desktop-webkit-${lang}`, testMatch: webkit, use: { browserName: 'webkit' as const, viewport: { width: 1440, height: 1000 } } },
    { name: `mobile-webkit-${lang}`, testMatch: webkit, use: { browserName: 'webkit' as const, viewport: { width: 390, height: 844 }, hasTouch: true } },
    { name: `desktop-firefox-${lang}`, testMatch: critical, use: { browserName: 'firefox' as const, viewport: { width: 1440, height: 1000 } } },
    { name: `mobile-touch-${lang}`, testMatch: touch, use: { browserName: 'chromium' as const, viewport: { width: 390, height: 844 }, hasTouch: true } },
  ]),
  webServer: { ...server, cwd: '../..' },
  outputDir: '../../test-results/release',
  reporter: [['./required-checks.ts'], ['list'], ['html', { outputFolder: '../../test-results/release-report', open: 'never' }], ['json', { outputFile: '../../test-results/release-results.json' }]],
});
