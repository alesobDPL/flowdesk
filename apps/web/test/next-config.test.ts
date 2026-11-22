import { afterEach, describe, expect, it, vi } from 'vitest';
import config from '../next.config';

afterEach(() => vi.unstubAllEnvs());

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
