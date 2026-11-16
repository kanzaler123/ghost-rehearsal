import { defineConfig } from '@playwright/test';
import base from '../../playwright.webkit.config';
const server = base.webServer;
if (!server || Array.isArray(server)) throw new Error('The probe requires the single production preview server.');
export default defineConfig({
  ...base, testDir: '.', testMatch: 'application-probe.spec.ts',
  projects: base.projects!.filter(project => project.name!.startsWith('desktop')),
  webServer: { ...server, cwd: '../..' },
  outputDir: '../../test-results/resize-application-probe',
  reporter: [['list']],
});
