import { afterEach, describe, expect, it, vi } from 'vitest';
import config from '../next.config';

afterEach(() => vi.unstubAllEnvs());

it('traces standalone dependencies from the workspace root', () => {
  expect(config.outputFileTracingRoot).toBe(
    resolve(import.meta.dirname, '../../..'),
  );
});

it('keeps production hydration compatible with the security headers', async () => {
  vi.stubEnv('NODE_ENV', 'production');
  const rules = await config.headers?.();
  const headers = rules?.find(({ source }) => source === '/:path*')?.headers;
  expect(headers).toEqual(
    expect.arrayContaining([
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    ]),
  );
  const csp = headers?.find(
    ({ key }) => key === 'Content-Security-Policy',
  )?.value;
  expect(csp).toContain("script-src 'self' 'unsafe-inline'");
  expect(csp).toContain("style-src 'self' 'unsafe-inline'");
  expect(csp).toContain("frame-ancestors 'none'");
  expect(csp).not.toContain('unsafe-eval');
});

describe('API proxy rewrites', () => {
  it('keeps the default development proxy', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('API_PROXY_URL', undefined);
    expect(await config.rewrites?.()).toEqual([
      {
        source: '/api/:path*',
        destination: 'http://localhost:4000/api/:path*',
      },
    ]);
  });

  it('uses the configured proxy in production builds', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('API_PROXY_URL', 'http://localhost:4200');
    expect(await config.rewrites?.()).toEqual([
      {
        source: '/api/:path*',
        destination: 'http://localhost:4200/api/:path*',
      },
    ]);
  });

  it('leaves production routing to Caddy without an explicit proxy', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('API_PROXY_URL', undefined);
    expect(await config.rewrites?.()).toEqual([]);
  });
});
import { resolve } from 'node:path';
