import { defineConfig } from '@playwright/test';
import base from '../../playwright.config';

const server = base.webServer;
if (!server || Array.isArray(server)) throw new Error('Project import tests require the production preview server.');
export default defineConfig({
  ...base,
  testDir: '..', testMatch: ['**/smoke.spec.ts', '**/project/import.spec.ts', '**/ui/route-keyboard.spec.ts'],
  projects: base.projects!.map(project => ({
    ...project,
    name: project.name!.replace('-', '-webkit-'),
    use: { ...project.use, browserName: 'webkit' },
  })),
  webServer: { ...server, cwd: '../..' },
  outputDir: '../../test-results/import-webkit',
  reporter: [['../release/required-checks.ts'], ['list'], ['html', { outputFolder: '../../test-results/import-webkit-report', open: 'never' }], ['json', { outputFile: '../../test-results/import-webkit-results.json' }]],
});
