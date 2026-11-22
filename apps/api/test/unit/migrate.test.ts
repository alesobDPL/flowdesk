import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createDb } from '../../src/db/client.js';
import { runMigrations } from '../../src/db/migrate.js';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

vi.mock('../../src/db/client.js', () => ({ createDb: vi.fn() }));
vi.mock('drizzle-orm/node-postgres/migrator', () => ({ migrate: vi.fn() }));

const end = vi.fn<() => Promise<void>>();
const databaseUrl = 'postgresql://demo:example@localhost/demo';

beforeEach(() => {
  vi.mocked(createDb).mockReturnValue({
    db: {} as ReturnType<typeof createDb>['db'],
    pool: { end } as unknown as ReturnType<typeof createDb>['pool'],
  });
});

afterEach(() => vi.resetAllMocks());

it('keeps the one-argument source layout and closes the pool', async () => {
  await runMigrations(databaseUrl);
  expect(createDb).toHaveBeenCalledWith(databaseUrl);
  expect(migrate).toHaveBeenCalledWith(expect.anything(), {
    migrationsFolder: fileURLToPath(new URL('../../drizzle/', import.meta.url)),
  });
  expect(end).toHaveBeenCalledOnce();
});

it('accepts an explicit migrations folder and closes the pool on failure', async () => {
  const failure = new Error('Migration failed.');
  vi.mocked(migrate).mockRejectedValueOnce(failure);
  await expect(runMigrations(databaseUrl, '/custom/drizzle')).rejects.toThrow(
    failure,
  );
  expect(migrate).toHaveBeenCalledWith(expect.anything(), {
    migrationsFolder: '/custom/drizzle',
  });
  expect(end).toHaveBeenCalledOnce();
});
