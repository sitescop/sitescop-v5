#!/usr/bin/env node
/**
 * SiteScop V5 — production go-live helper.
 * Builds and starts Docker Compose production stack.
 */
import { spawn } from 'node:child_process';
import { copyFileSync, existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const envProdPath = path.join(root, '.env.production');
const envExamplePath = path.join(root, '.env.production.example');

const REQUIRED = [
  'APP_DOMAIN',
  'POSTGRES_PASSWORD',
  'SESSION_SECRET',
  'WEB_APP_URL',
  'PROD_ADMIN_EMAIL',
  'PROD_ADMIN_PASSWORD',
];

function parseEnv(content) {
  const values = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    values[key] = value;
  }
  return values;
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
      cwd: root,
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve(undefined);
      else reject(new Error(`${command} exited with code ${code}`));
    });
  });
}

async function main() {
  if (!existsSync(envProdPath)) {
    if (!existsSync(envExamplePath)) {
      console.error('Missing .env.production.example');
      process.exit(1);
    }
    copyFileSync(envExamplePath, envProdPath);
    console.log('Created .env.production from example — edit it, then run again.');
    process.exit(0);
  }

  const env = parseEnv(readFileSync(envProdPath, 'utf8'));
  const missing = REQUIRED.filter((key) => {
    const value = env[key];
    return !value || value.startsWith('CHANGE_ME');
  });

  if (missing.length) {
    console.error('\nUpdate .env.production — these values are missing or still placeholders:\n');
    for (const key of missing) console.error(`  - ${key}`);
    console.error('\nThen run: npm run go-live\n');
    process.exit(1);
  }

  if (!env.WEB_APP_URL.startsWith('https://')) {
    console.warn('Warning: WEB_APP_URL should use https:// in production.');
  }

  console.log('\n[go-live] Building and starting production stack...\n');
  console.log(`  Domain: ${env.APP_DOMAIN}`);
  console.log(`  App URL: ${env.WEB_APP_URL}\n`);

  await run('docker', [
    'compose',
    '--env-file',
    '.env.production',
    '-f',
    'docker-compose.prod.yml',
    'up',
    '-d',
    '--build',
  ]);

  console.log('\n[go-live] Stack is starting. DNS must point to this server for HTTPS to work.');
  console.log('\nNext steps:');
  console.log('  1. Wait ~30s, then open:', env.WEB_APP_URL);
  console.log('  2. Create admin user: npm run db:seed:prod');
  console.log('  3. Log in and complete Settings → Company / Email / SMS');
  console.log('  4. Run post-deploy checks in docs/GO-LIVE.md\n');
}

main().catch((error) => {
  console.error('[go-live] Failed:', error.message);
  process.exit(1);
});
