import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './smoke-test',
  timeout: 60000,
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [['list']],
  use: {
    headless: true,
    viewport: { width: 1440, height: 900 },
    ignoreHTTPSErrors: true,
    screenshot: 'only-on-failure',
    video: 'off',
    trace: 'retain-on-failure',
  },
});
