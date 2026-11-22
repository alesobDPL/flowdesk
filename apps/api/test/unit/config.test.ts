import { expect, it } from 'vitest';
import { loadConfig } from '../../src/config.js';

const databaseUrl = 'postgresql://demo:example@localhost:5432/demo';

it('applies design defaults', () => {
  expect(loadConfig({ DATABASE_URL: databaseUrl })).toEqual({
    nodeEnv: 'development',
    port: 4000,
    databaseUrl,
    appOrigin: 'http://localhost:3000',
    trustProxyCidr: null,
    logLevel: 'info',
    bodyLimitBytes: 16384,
    demo: {
      spaceTtlMin: 120,
      idleMin: 30,
      maxRequests: 30,
      spacesPerIpHour: 10,
      maxActiveSpaces: 500,
      rateLimitPerMin: 120,
      cleanupIntervalMin: 10,
      cleanupGraceMin: 15,
      cleanupBatch: 50,
    },
  });
});

it('rejects missing DATABASE_URL', () => {
  expect(() => loadConfig({})).toThrow();
});

it('reads overrides without mutating the environment', () => {
  const env = {
    DATABASE_URL: databaseUrl,
    NODE_ENV: 'production',
    PORT: '4100',
    APP_ORIGIN: 'https://demo.example.com',
    TRUST_PROXY_CIDR: '172.30.0.1/32',
    LOG_LEVEL: 'warn',
    BODY_LIMIT_BYTES: '2048',
    DEMO_SPACE_TTL_MIN: '60',
    DEMO_IDLE_MIN: '15',
    DEMO_MAX_REQUESTS: '12',
    DEMO_SPACES_PER_IP_HOUR: '4',
    DEMO_MAX_ACTIVE_SPACES: '20',
    RATE_LIMIT_PER_MIN: '40',
    CLEANUP_INTERVAL_MIN: '5',
    CLEANUP_GRACE_MIN: '7',
    CLEANUP_BATCH: '8',
  };
  const before = { ...env };
  expect(loadConfig(env)).toEqual({
    nodeEnv: 'production',
    port: 4100,
    databaseUrl,
    appOrigin: 'https://demo.example.com',
    trustProxyCidr: '172.30.0.1/32',
    logLevel: 'warn',
    bodyLimitBytes: 2048,
    demo: {
      spaceTtlMin: 60,
      idleMin: 15,
      maxRequests: 12,
      spacesPerIpHour: 4,
      maxActiveSpaces: 20,
      rateLimitPerMin: 40,
      cleanupIntervalMin: 5,
      cleanupGraceMin: 7,
      cleanupBatch: 8,
    },
  });
  expect(env).toEqual(before);
});

it.each([
  'DEMO_SPACE_TTL_MIN',
  'DEMO_IDLE_MIN',
  'DEMO_MAX_REQUESTS',
  'DEMO_SPACES_PER_IP_HOUR',
  'DEMO_MAX_ACTIVE_SPACES',
  'RATE_LIMIT_PER_MIN',
  'BODY_LIMIT_BYTES',
  'CLEANUP_INTERVAL_MIN',
  'CLEANUP_GRACE_MIN',
  'CLEANUP_BATCH',
  'PORT',
])('rejects invalid positive integer %s', (key) => {
  for (const value of ['0', '-1', '1.5', '', 'invalid', 'Infinity']) {
    expect(() =>
      loadConfig({ DATABASE_URL: databaseUrl, [key]: value }),
    ).toThrow();
  }
});

it.each([
  { NODE_ENV: 'staging' },
  { DATABASE_URL: '' },
  { DATABASE_URL: 'invalid' },
  { APP_ORIGIN: 'invalid' },
  { PORT: '65536' },
])('rejects invalid configuration %j', (override) => {
  expect(() =>
    loadConfig({ DATABASE_URL: databaseUrl, ...override }),
  ).toThrow();
});
