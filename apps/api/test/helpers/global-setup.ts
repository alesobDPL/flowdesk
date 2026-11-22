import { PostgreSqlContainer } from '@testcontainers/postgresql';
import type { TestProject } from 'vitest/node';
import { runMigrations } from '../../src/db/migrate.js';

export default async function setup(project: TestProject) {
  const container = await new PostgreSqlContainer('postgres:18').start();
  try {
    const databaseUrl = container.getConnectionUri();
    await runMigrations(databaseUrl);
    project.provide('databaseUrl', databaseUrl);
  } catch (error) {
    await container.stop();
    throw error;
  }

  return async () => {
    await container.stop();
  };
}
