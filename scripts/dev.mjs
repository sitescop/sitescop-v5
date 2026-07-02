#!/usr/bin/env node
/**
 * SiteScop V5 local development orchestrator.
 * Starts embedded PostgreSQL, runs migrations + seed, then API + web.
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import EmbeddedPostgres from 'embedded-postgres';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const apiDir = path.join(root, 'apps', 'api');
const webDir = path.join(root, 'apps', 'web');
const pgDataDir = path.join(root, '.sitescop', 'pgdata');

const DB_USER = 'sitescop';
const DB_PASSWORD = 'sitescop_dev';
const DB_NAME = 'sitescop_v5';
const DB_PORT = 5433;
const DATABASE_URL = `postgresql://${DB_USER}:${DB_PASSWORD}@localhost:${DB_PORT}/${DB_NAME}`;

const API_URL = 'http://localhost:3001';
const WEB_URL = 'http://localhost:5173';

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
      env: { ...process.env, DATABASE_URL, ...options.env },
      cwd: options.cwd ?? root,
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve(undefined);
      else reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`));
    });
  });
}

function startProcess(name, command, args, cwd, extraEnv = {}) {
  const child = spawn(command, args, {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, DATABASE_URL, ...extraEnv },
    cwd,
  });

  child.on('error', (error) => {
    console.error(`[${name}] failed to start:`, error.message);
  });

  return child;
}

async function startDatabase() {
  console.log('\n[db] Starting embedded PostgreSQL on port', DB_PORT);

  const pg = new EmbeddedPostgres({
    databaseDir: pgDataDir,
    user: DB_USER,
    password: DB_PASSWORD,
    port: DB_PORT,
    persistent: true,
  });

  if (!existsSync(path.join(pgDataDir, 'PG_VERSION'))) {
    await pg.initialise();
  }

  await pg.start();

  try {
    await pg.createDatabase(DB_NAME);
    console.log(`[db] Created database "${DB_NAME}"`);
  } catch {
    console.log(`[db] Database "${DB_NAME}" already exists`);
  }

  return pg;
}

async function prepareDatabase() {
  console.log('[db] Running migrations...');
  await runCommand('npx', ['prisma', 'migrate', 'deploy'], { cwd: apiDir });

  console.log('[db] Seeding demo users...');
  await runCommand('npx', ['tsx', 'prisma/seed.ts'], { cwd: apiDir });
}

function openBrowser(url) {
  const platform = process.platform;
  const command = platform === 'win32' ? 'start' : platform === 'darwin' ? 'open' : 'xdg-open';
  spawn(command, [url], { shell: true, stdio: 'ignore' });
}

async function main() {
  const pg = await startDatabase();

  try {
    await prepareDatabase();
  } catch (error) {
    console.error('[db] Setup failed:', error.message);
    await pg.stop();
    process.exit(1);
  }

  console.log('\n[dev] Starting API and web servers...\n');

  const api = startProcess('api', 'npm', ['run', 'dev'], apiDir, {
    WEB_APP_URL: WEB_URL,
    SESSION_SECRET: process.env.SESSION_SECRET ?? 'sitescop-v5-dev-session-secret-minimum-32-characters-long',
  });

  const web = startProcess('web', 'npm', ['run', 'dev'], webDir, {
    VITE_API_URL: '',
  });

  const shutdown = async (signal) => {
    console.log(`\n[dev] Received ${signal}, shutting down...`);
    api.kill('SIGTERM');
    web.kill('SIGTERM');
    await pg.stop();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));

  setTimeout(() => {
    console.log(`\n[dev] Opening ${WEB_URL}\n`);
    openBrowser(WEB_URL);
  }, 4000);

  setTimeout(async () => {
    try {
      const response = await fetch(`${API_URL}/api/v1/health`);
      const body = await response.json();
      console.log('[dev] API health:', body);
    } catch (error) {
      console.warn('[dev] API health check pending:', error.message);
    }
  }, 6000);
}

main().catch(async (error) => {
  console.error('[dev] Fatal error:', error);
  process.exit(1);
});
