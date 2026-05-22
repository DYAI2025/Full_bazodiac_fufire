// playwright.config.mjs
// Live-Browser-Gate für jede Iteration. Startet npm start automatisch.
import { defineConfig, devices } from '@playwright/test';

const BASE_URL = process.env.APP_BASE_URL || 'http://127.0.0.1:4100';
const PORT = Number(new URL(BASE_URL).port || 3000);

export default defineConfig({
  testDir: 'test/e2e',
  testMatch: /.*\.spec\.(js|mjs|ts)$/,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  reporter: [
    ['list'],
    ['html', { outputFolder: 'docs/qa/playwright-report', open: 'never' }],
  ],
  use: {
    baseURL: BASE_URL,
    headless: true,
    viewport: { width: 1440, height: 900 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'off',
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
  },
  projects: [
    {
      name: 'chromium-desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'chromium-mobile',
      use: { ...devices['Pixel 7'] },
    },
  ],
  webServer: {
    command: `PORT=${PORT} npm start`,
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 30_000,
    stdout: 'pipe',
    stderr: 'pipe',
    env: { PORT: String(PORT) },
  },
});
