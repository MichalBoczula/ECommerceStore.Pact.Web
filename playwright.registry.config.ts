import { readFileSync } from 'node:fs';
import { defineConfig } from '@playwright/test';

const fixturePath = process.env['PACT_REGISTRY_ACCEPTANCE_FIXTURE'];
if (!fixturePath) throw new Error('Start registry acceptance through node scripts/registry-acceptance.mjs.');
const fixture = JSON.parse(readFileSync(fixturePath, 'utf8'));
const port = (url: string) => { const value = new URL(url); if (value.hostname !== '127.0.0.1' || value.protocol !== 'http:') throw new Error('Acceptance servers must bind loopback.'); return Number(value.port); };
export default defineConfig({
  testDir: './tests/registry', fullyParallel: true, forbidOnly: true, retries: 0, workers: 2,
  reporter: [['list'], ['junit', { outputFile: 'TestResults/registry/acceptance.xml' }], ['html', { outputFolder: 'TestResults/registry/html', open: 'never' }]],
  outputDir: 'TestResults/registry/results', timeout: 45000,
  use: { baseURL: fixture.baseUrl, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [{ name: 'chromium-registry', use: { browserName: 'chromium' } }],
  webServer: [
    { command: `npm start -- --host 127.0.0.1 --port ${port(fixture.baseUrl)}`, env: { PACT_API_URL: fixture.apiUrl }, url: fixture.baseUrl, reuseExistingServer: false, timeout: 120000 },
    { command: `npm start -- --host 127.0.0.1 --port ${port(fixture.unavailableBaseUrl)}`, env: { PACT_API_URL: fixture.unavailableApiUrl }, url: fixture.unavailableBaseUrl, reuseExistingServer: false, timeout: 120000 },
  ],
});
