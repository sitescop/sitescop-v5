import { config as loadEnv } from 'dotenv';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

loadEnv({ path: resolve(__dirname, '../../../.env') });
loadEnv({ path: resolve(__dirname, '../.env') });

function requireEnv(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

const DEV_SESSION_SECRET = 'dev-session-secret-change-in-production-min-32-chars';

function resolveSessionSecret(): string {
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  const secret = process.env.SESSION_SECRET ?? (nodeEnv === 'production' ? undefined : DEV_SESSION_SECRET);
  if (!secret) {
    throw new Error('SESSION_SECRET must be set in production');
  }
  if (nodeEnv === 'production' && secret === DEV_SESSION_SECRET) {
    throw new Error('SESSION_SECRET must not use the development default in production');
  }
  return secret;
}

export const config = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  api: {
    host: process.env.API_HOST ?? '0.0.0.0',
    port: Number(process.env.API_PORT ?? 3001),
  },
  database: {
    url: requireEnv('DATABASE_URL', 'postgresql://sitescop:sitescop_dev@localhost:5432/sitescop_v5'),
  },
  session: {
    secret: resolveSessionSecret(),
    cookieName: process.env.SESSION_COOKIE_NAME ?? 'sitescop_session',
    maxAgeMs: Number(process.env.SESSION_MAX_AGE_MS ?? 7 * 24 * 60 * 60 * 1000),
  },
  passwordReset: {
    expiryMs: Number(process.env.PASSWORD_RESET_EXPIRY_MS ?? 60 * 60 * 1000),
  },
  webAppUrl: process.env.WEB_APP_URL ?? 'http://localhost:5173',
  isProduction: process.env.NODE_ENV === 'production',
  smtp: {
    host: process.env.SMTP_HOST ?? '',
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER ?? '',
    pass: process.env.SMTP_PASS ?? '',
  },
  emailEnabled: (() => {
    const host = process.env.SMTP_HOST?.trim();
    if (!host) return false;
    if (host === 'localhost' || host === '127.0.0.1') return true;
    return Boolean(process.env.SMTP_USER?.trim() && process.env.SMTP_PASS?.trim());
  })(),
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY ?? '',
  },
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID ?? '',
    authToken: process.env.TWILIO_AUTH_TOKEN ?? '',
    fromNumber: process.env.TWILIO_FROM_NUMBER ?? '',
  },
} as const;
