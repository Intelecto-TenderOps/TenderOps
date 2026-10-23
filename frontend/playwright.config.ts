import { defineConfig } from '@playwright/test';
export default defineConfig({ testDir: './e2e', use: { baseURL: 'https://localhost:7043', ignoreHTTPSErrors: true, viewport: { width: 1365, height: 900 } }, reporter: 'list' });
