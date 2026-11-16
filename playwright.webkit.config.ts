import { defineConfig } from '@playwright/test';
import base from './playwright.config';

// Linux WebKit engine coverage, not a physical iOS/Safari certification.
export default defineConfig({
  ...base,
  testMatch: [
    '**/smoke.spec.ts',
    '**/demo/comparison.spec.ts',
    '**/robustness/integration.spec.ts',
    '**/ui/accessibility.spec.ts',
    '**/ui/mobile-navigation.spec.ts',
    '**/ui/timeline-touch.spec.ts',
  ],
  projects: base.projects!.map(project => ({
    ...project,
    name: project.name!.replace('-', '-webkit-'),
    use: { ...project.use, browserName: 'webkit' },
  })),
  outputDir: 'test-results/webkit',
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report/webkit' }],
    ['json', { outputFile: 'test-results/webkit-results.json' }],
  ],
});
