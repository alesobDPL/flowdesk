import type { Pool } from 'pg';
import { afterAll, inject } from 'vitest';
import { createDb } from '../../src/db/client.js';
import type { Db } from '../../src/db/client.js';

declare module 'vitest' {
  export interface ProvidedContext {
    databaseUrl: string;
  }
}

let connection: { db: Db; pool: Pool } | undefined;

export function getTestDb(): Db {
  connection ??= createDb(inject('databaseUrl'));
  return connection.db;
}

afterAll(async () => {
  await connection?.pool.end();
  connection = undefined;
});
