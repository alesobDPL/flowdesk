import { fileURLToPath } from 'node:url';
import { defineConfig, devices } from '@playwright/test';

const webPort = process.env.E2E_WEB_PORT ?? '3100';
const apiPort = process.env.E2E_API_PORT ?? '4000';
const webOrigin = `http://localhost:${webPort}`;
const apiOrigin = `http://localhost:${apiPort}`;
const externalBaseUrl = process.env.PLAYWRIGHT_BASE_URL;
const screenshots = process.env.E2E_SCREENSHOTS === '1';
const video = process.env.E2E_VIDEO === '1';
const workspaceRoot = fileURLToPath(new URL('../..', import.meta.url));
const databaseUrl =
  process.env.DATABASE_URL ??
  'postgresql://flowdesk:flowdesk_dev_only@127.0.0.1:5432/flowdesk';

export default defineConfig({
  testDir: './e2e',
  testMatch: video
    ? '**/demo-video.spec.ts'
    : screenshots
      ? '**/screenshots.spec.ts'
      : '**/*.spec.ts',
  grepInvert: screenshots || video ? undefined : /@screenshots|@video/,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: video ? 0 : process.env.CI ? 2 : 0,
  workers: video ? 1 : process.env.CI ? 2 : undefined,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: externalBaseUrl ?? webOrigin,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'] } },
    ...(video
      ? []
      : [
          {
            name: 'mobile',
            use: { ...devices['Pixel 7'], browserName: 'chromium' as const },
            testIgnore: '**/a11y.spec.ts',
            grepInvert: screenshots
              ? /@desktop|@video/
              : /@desktop|@screenshots|@video/,
          },
        ]),
  ],
  webServer: externalBaseUrl
    ? undefined
    : [
        {
          command: 'pnpm --filter @flowdesk/api start',
          cwd: workspaceRoot,
          env: {
            NODE_ENV: 'test',
            DATABASE_URL: databaseUrl,
            APP_ORIGIN: webOrigin,
            PORT: apiPort,
            RATE_LIMIT_PER_MIN: '100000',
            RATE_LIMIT_PER_IP_MIN: '100000',
            DEMO_SPACES_PER_IP_HOUR: '10000',
            DEMO_MAX_ACTIVE_SPACES: '10000',
          },
          url: `${apiOrigin}/api/v1/health`,
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
        },
        {
          command: `pnpm --filter @flowdesk/web exec next start -p ${webPort}`,
          cwd: workspaceRoot,
          env: { NODE_ENV: 'production', API_PROXY_URL: apiOrigin },
          url: `${webOrigin}/es`,
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
        },
      ],
});
