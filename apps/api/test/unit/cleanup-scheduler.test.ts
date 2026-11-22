import type { FastifyBaseLogger } from 'fastify';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { loadConfig } from '../../src/config.js';
import type { Db } from '../../src/db/client.js';
import { startCleanupScheduler } from '../../src/demo/cleanup/cleanup.js';

const config = loadConfig({
  DATABASE_URL: 'postgresql://demo:example@localhost/demo',
});
const interval = config.demo.cleanupIntervalMin * 60_000;
const transaction = vi.fn<Db['transaction']>();
const db = { transaction } as unknown as Db;
const info = vi.fn();
const error = vi.fn();
const logger = { info, error } as unknown as FastifyBaseLogger;

beforeEach(() => {
  vi.useFakeTimers();
  vi.resetAllMocks();
});
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
});

it('schedules cleanup, logs its result and duration, and stops the timer', async () => {
  transaction.mockResolvedValue({ deletedSpaces: 3, skipped: false });
  const stop = startCleanupScheduler(db, config, logger);
  expect(transaction).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(interval);
  expect(transaction).toHaveBeenCalledTimes(1);
  expect(info).toHaveBeenCalledWith(
    expect.objectContaining({ deletedSpaces: 3, skipped: false }),
    expect.any(String),
  );
  const entry: unknown = info.mock.calls[0]?.[0];
  expect(entry).toHaveProperty('durationMs');
  if (typeof entry !== 'object' || entry === null || !('durationMs' in entry))
    throw new Error('Missing cleanup duration.');
  expect(typeof entry.durationMs).toBe('number');
  expect(entry.durationMs).toBeGreaterThanOrEqual(0);
  stop();
  await vi.advanceTimersByTimeAsync(interval * 2);
  expect(transaction).toHaveBeenCalledTimes(1);
});

it('logs cleanup errors and continues on the next interval', async () => {
  const failure = new Error('Database unavailable.');
  transaction
    .mockRejectedValueOnce(failure)
    .mockResolvedValue({ deletedSpaces: 0, skipped: true });
  const stop = startCleanupScheduler(db, config, logger);
  await vi.advanceTimersByTimeAsync(interval);
  expect(error).toHaveBeenCalledWith({ err: failure }, expect.any(String));
  expect(info).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(interval);
  expect(transaction).toHaveBeenCalledTimes(2);
  expect(info).toHaveBeenCalledWith(
    expect.objectContaining({ deletedSpaces: 0, skipped: true }),
    expect.any(String),
  );
  stop();
});
