import { defineConfig } from '@playwright/test';
import base from '../../playwright.config';

const server = base.webServer;
if (!server || Array.isArray(server)) throw new Error('Comparison tests require the production preview server.');
export default defineConfig({
  ...base,
  testDir: '..',
  testMatch: ['**/ui/run-statistics-basis.spec.ts', '**/demo/guide-mapping.spec.ts'],
  projects: base.projects!.map(project => ({
    ...project,
    name: project.name!.replace('-', '-webkit-'),
    use: { ...project.use, browserName: 'webkit' },
  })),
  webServer: { ...server, cwd: '../..' },
  outputDir: '../../test-results/comparison-webkit',
  reporter: [['../release/required-checks.ts'], ['list'], ['html', { outputFolder: '../../test-results/comparison-webkit-report', open: 'never' }], ['json', { outputFile: '../../test-results/comparison-webkit-results.json' }]],
});
