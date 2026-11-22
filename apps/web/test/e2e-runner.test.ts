// @vitest-environment node
import { spawnSync } from 'node:child_process';
import { afterEach, expect, it, vi } from 'vitest';

vi.mock('node:child_process', () => ({
  spawnSync: vi.fn(() => ({ status: 0 })),
}));

const originalArgv = process.argv;

afterEach(() => {
  process.argv = originalArgv;
  vi.unstubAllEnvs();
  vi.clearAllMocks();
  vi.resetModules();
});

it('runs only Playwright against the external URL and forwards the tour filter', async () => {
  vi.stubEnv('PLAYWRIGHT_BASE_URL', 'http://127.0.0.1:8080');
  vi.stubEnv('npm_execpath', '/test/pnpm.cjs');
  process.argv = [process.execPath, 'scripts/e2e.mjs', '--', 'tour'];
  await import('../../../scripts/e2e.mjs');
  expect(spawnSync).toHaveBeenCalledOnce();
  expect(spawnSync).toHaveBeenCalledWith(
    process.execPath,
    [
      '/test/pnpm.cjs',
      '--filter',
      '@flowdesk/web',
      'exec',
      'playwright',
      'test',
      '--config',
      'playwright.config.ts',
      'tour',
    ],
    expect.anything(),
  );
  expect(vi.mocked(spawnSync).mock.calls[0]?.[2]?.env).toMatchObject({
    PLAYWRIGHT_BASE_URL: 'http://127.0.0.1:8080',
    APP_ORIGIN: 'http://127.0.0.1:8080',
  });
});

it('preserves managed preparation and screenshot arguments', async () => {
  vi.stubEnv('PLAYWRIGHT_BASE_URL', undefined);
  vi.stubEnv('npm_execpath', '/test/pnpm.cjs');
  process.argv = [
    process.execPath,
    'scripts/e2e.mjs',
    '--screenshots',
    '--project=desktop-chromium',
  ];
  await import('../../../scripts/e2e.mjs');
  expect(spawnSync).toHaveBeenCalledTimes(4);
  const calls = vi.mocked(spawnSync).mock.calls;
  expect(calls[0]?.slice(0, 2)).toEqual([
    'docker',
    ['compose', '-f', 'compose.dev.yaml', 'up', '-d', '--wait'],
  ]);
  expect(calls[1]?.[1]).toContain('migrate');
  expect(calls[2]?.[1]).toContain('build');
  expect(calls[3]?.[1]).toContain('--project=desktop-chromium');
  expect(calls[3]?.[2]?.env).toMatchObject({ E2E_SCREENSHOTS: '1' });
});

it.each([undefined, 'http://127.0.0.1:8080'])(
  'uses the external URL and omits webServer only when configured: %s',
  async (baseUrl) => {
    vi.stubEnv('PLAYWRIGHT_BASE_URL', baseUrl);
    const { default: config } = await import('../playwright.config');
    if (baseUrl) {
      expect(config.use?.baseURL).toBe(baseUrl);
      expect(config.webServer).toBeUndefined();
    } else {
      expect(config.webServer).toHaveLength(2);
    }
  },
);
