import { spawnSync } from 'node:child_process';
import process from 'node:process';
import { fileURLToPath, URL } from 'node:url';

const workspaceRoot = fileURLToPath(new URL('..', import.meta.url));
const webPort = process.env.E2E_WEB_PORT ?? '3100';
const apiPort = process.env.E2E_API_PORT ?? '4000';
const args = process.argv.slice(2);
// pnpm passes the script separator through; do not forward it to pnpm exec.
if (args[0] === '--') args.shift();
const screenshots = args[0] === '--screenshots';
const video = args[0] === '--video';
if (screenshots || video) args.shift();
if (args[0] === '--') args.shift();
const env = {
  ...process.env,
  DATABASE_URL:
    process.env.DATABASE_URL ??
    'postgresql://flowdesk:flowdesk_dev_only@127.0.0.1:5432/flowdesk',
  APP_ORIGIN: process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${webPort}`,
  API_PROXY_URL: `http://localhost:${apiPort}`,
  E2E_SCREENSHOTS: screenshots ? '1' : '0',
  E2E_VIDEO: video ? '1' : '0',
};

function run(command, args, commandEnv = env) {
  const result = spawnSync(command, args, {
    cwd: workspaceRoot,
    env: commandEnv,
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

// Corepack may expose pnpm as a JS entry point or as the pnpm 12 native binary.
// Invoke either directly without shell quoting or Windows-only .cmd commands.
const pnpmEntry = process.env.npm_execpath;
if (!pnpmEntry) throw new Error('Run this script through pnpm test:e2e.');
const pnpm = (args, commandEnv = env) =>
  /\.(?:c?js|mjs)$/i.test(pnpmEntry)
    ? run(process.execPath, [pnpmEntry, ...args], commandEnv)
    : run(pnpmEntry, args, commandEnv);

// Listing tests never needs Docker, a build, servers or a browser.
if (!process.env.PLAYWRIGHT_BASE_URL && !args.includes('--list')) {
  run('docker', ['compose', '-f', 'compose.dev.yaml', 'up', '-d', '--wait']);
  pnpm(['--filter', '@flowdesk/api', 'migrate'], { ...env, NODE_ENV: 'test' });
  pnpm(['--filter', '@flowdesk/web', 'build'], {
    ...env,
    NODE_ENV: 'production',
  });
}
pnpm([
  '--filter',
  '@flowdesk/web',
  'exec',
  'playwright',
  'test',
  '--config',
  'playwright.config.ts',
  ...args,
]);
