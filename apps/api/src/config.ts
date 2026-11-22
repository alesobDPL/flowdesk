import { z } from 'zod';

export type Config = {
  nodeEnv: 'development' | 'test' | 'production';
  port: number;
  databaseUrl: string;
  appOrigin: string;
  trustProxyCidr: string | null;
  logLevel: string;
  demo: {
    spaceTtlMin: number;
    idleMin: number;
    maxRequests: number;
    spacesPerIpHour: number;
    maxActiveSpaces: number;
    rateLimitPerMin: number;
    cleanupIntervalMin: number;
    cleanupGraceMin: number;
    cleanupBatch: number;
  };
  bodyLimitBytes: number;
};

const positiveInteger = z.coerce.number().int().positive();
const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: positiveInteger.max(65535).default(4000),
  DATABASE_URL: z.url(),
  APP_ORIGIN: z.url().default('http://localhost:3000'),
  TRUST_PROXY_CIDR: z.string().trim().min(1).nullable().default(null),
  LOG_LEVEL: z.string().trim().min(1).default('info'),
  DEMO_SPACE_TTL_MIN: positiveInteger.default(120),
  DEMO_IDLE_MIN: positiveInteger.default(30),
  DEMO_MAX_REQUESTS: positiveInteger.default(30),
  DEMO_SPACES_PER_IP_HOUR: positiveInteger.default(10),
  DEMO_MAX_ACTIVE_SPACES: positiveInteger.default(500),
  RATE_LIMIT_PER_MIN: positiveInteger.default(120),
  BODY_LIMIT_BYTES: positiveInteger.default(16384),
  CLEANUP_INTERVAL_MIN: positiveInteger.default(10),
  CLEANUP_GRACE_MIN: positiveInteger.default(15),
  CLEANUP_BATCH: positiveInteger.default(50),
});

export function loadConfig(env: NodeJS.ProcessEnv): Config {
  const parsed = envSchema.parse(env);
  return {
    nodeEnv: parsed.NODE_ENV,
    port: parsed.PORT,
    databaseUrl: parsed.DATABASE_URL,
    appOrigin: parsed.APP_ORIGIN,
    trustProxyCidr: parsed.TRUST_PROXY_CIDR,
    logLevel: parsed.LOG_LEVEL,
    demo: {
      spaceTtlMin: parsed.DEMO_SPACE_TTL_MIN,
      idleMin: parsed.DEMO_IDLE_MIN,
      maxRequests: parsed.DEMO_MAX_REQUESTS,
      spacesPerIpHour: parsed.DEMO_SPACES_PER_IP_HOUR,
      maxActiveSpaces: parsed.DEMO_MAX_ACTIVE_SPACES,
      rateLimitPerMin: parsed.RATE_LIMIT_PER_MIN,
      cleanupIntervalMin: parsed.CLEANUP_INTERVAL_MIN,
      cleanupGraceMin: parsed.CLEANUP_GRACE_MIN,
      cleanupBatch: parsed.CLEANUP_BATCH,
    },
    bodyLimitBytes: parsed.BODY_LIMIT_BYTES,
  };
}
