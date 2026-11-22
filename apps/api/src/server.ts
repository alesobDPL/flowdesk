import { loadConfig } from './config.js';
import { createDb } from './db/client.js';
import { buildApp } from './http/app.js';

const config = loadConfig(process.env);
const { db, pool } = createDb(config.databaseUrl);
const app = await buildApp({ config, db, startScheduler: true });
app.addHook('onClose', async () => {
  await pool.end();
});

let closing = false;
async function shutdown(): Promise<void> {
  if (closing) return;
  closing = true;
  try {
    await app.close();
  } catch (err) {
    app.log.error({ err }, 'Graceful shutdown failed.');
    process.exitCode = 1;
  }
}
process.once('SIGTERM', () => {
  void shutdown();
});
process.once('SIGINT', () => {
  void shutdown();
});

try {
  await app.listen({ host: '0.0.0.0', port: config.port });
} catch (err) {
  app.log.error({ err }, 'Server startup failed.');
  process.exitCode = 1;
  await shutdown();
}
