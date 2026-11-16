import { defineConfig } from '@playwright/test';
import base from '../playwright.webkit.config';

export default defineConfig({
  ...base,
  testDir: '../../../../e2e/ui',
  testMatch: 'navigation-refinement.spec.ts',
  outputDir: '../../../../test-results/black-theme-webkit',
});
