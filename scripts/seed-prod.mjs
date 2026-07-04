#!/usr/bin/env node
/** Run production admin seed against the Docker Postgres on localhost:5432 */
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const apiDir = path.join(root, 'apps', 'api');
const envPath = path.join(root, '.env.production');

if (!existsSync(envPath)) {
  console.error('Missing .env.production — copy from .env.production.example first.');
  process.exit(1);
}

const env = { ...process.env };
for (const line of readFileSync(envPath, 'utf8').split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const idx = trimmed.indexOf('=');
  if (idx === -1) continue;
  env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
}

const user = env.POSTGRES_USER ?? 'sitescop';
const pass = env.POSTGRES_PASSWORD ?? '';
const db = 'sitescop_v5';
env.DATABASE_URL = `postgresql://${user}:${pass}@localhost:5432/${db}`;

const child = spawn('npx', ['tsx', 'prisma/seed-production.ts'], {
  stdio: 'inherit',
  shell: true,
  cwd: apiDir,
  env,
});

child.on('close', (code) => process.exit(code ?? 1));
