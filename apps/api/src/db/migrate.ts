import { fileURLToPath } from 'node:url';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { createDb } from './client.js';

export async function runMigrations(
  databaseUrl: string,
  migrationsFolder = fileURLToPath(
    new URL(
      // esbuild places both entry points directly in dist/.
      new URL('.', import.meta.url).pathname.endsWith('/dist/')
        ? '../drizzle/'
        : '../../drizzle/',
      import.meta.url,
    ),
  ),
): Promise<void> {
  const { db, pool } = createDb(databaseUrl);
  try {
    await migrate(db, {
      migrationsFolder,
    });
  } finally {
    await pool.end();
  }
}
