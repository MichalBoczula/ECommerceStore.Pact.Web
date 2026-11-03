import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/smoke',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 1 : 0,
  workers: process.env['CI'] ? 2 : undefined,
  reporter: [['list'], ['junit', { outputFile: 'TestResults/smoke.xml' }], ['html', { outputFolder: 'TestResults/playwright-html', open: 'never' }]],
  outputDir: 'TestResults/playwright-results',
  use: { baseURL: 'http://127.0.0.1:4200', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
  webServer: {
    command: 'npm start -- --host 127.0.0.1 --port 4200',
    env: { PACT_API_URL: 'http://127.0.0.1:5198' },
    url: 'http://127.0.0.1:4200',
    reuseExistingServer: !process.env['CI'],
    timeout: 120_000,
  },
});
