import { config } from '../../config.js';

export interface SmtpConfigStatus {
  configured: boolean;
  host: string;
  port: number;
  user: string;
  secure: boolean;
  reason: string | null;
}

function isLocalSmtpHost(host: string): boolean {
  return host === 'localhost' || host === '127.0.0.1';
}

/** Returns whether outbound SMTP is fully configured and ready to send. */
export function getSmtpConfigStatus(): SmtpConfigStatus {
  const host = config.smtp.host.trim();
  const user = config.smtp.user.trim();
  const pass = config.smtp.pass.trim();

  if (!host) {
    return {
      configured: false,
      host: '',
      port: config.smtp.port,
      user: '',
      secure: config.smtp.secure,
      reason: 'SMTP_HOST is not set. Add Zoho SMTP settings to your .env file.',
    };
  }

  if (isLocalSmtpHost(host)) {
    return {
      configured: true,
      host,
      port: config.smtp.port,
      user,
      secure: config.smtp.secure,
      reason: null,
    };
  }

  if (!user) {
    return {
      configured: false,
      host,
      port: config.smtp.port,
      user: '',
      secure: config.smtp.secure,
      reason: 'SMTP_USER is not set. For Zoho use your full mailbox address (e.g. info@sitescop.com.au).',
    };
  }

  if (!pass) {
    return {
      configured: false,
      host,
      port: config.smtp.port,
      user,
      secure: config.smtp.secure,
      reason:
        'SMTP_PASS is not set. Generate a Zoho App Password at accounts.zoho.com → Security → App Passwords and paste it into .env, then restart the API.',
    };
  }

  return {
    configured: true,
    host,
    port: config.smtp.port,
    user,
    secure: config.smtp.secure,
    reason: null,
  };
}

export function isEmailConfigured(): boolean {
  return getSmtpConfigStatus().configured;
}
