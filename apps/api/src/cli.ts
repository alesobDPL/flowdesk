import { loadConfig } from './config.js';
import { runMigrations } from './db/migrate.js';

if (process.argv[2] !== 'migrate') {
  throw new Error('Usage: tsx src/cli.ts migrate');
}
const config = loadConfig(process.env);
await runMigrations(config.databaseUrl);
