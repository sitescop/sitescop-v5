import { config } from '../../config.js';

export interface TwilioConfigStatus {
  configured: boolean;
  fromNumber: string;
  reason: string | null;
}

export function getTwilioConfigStatus(): TwilioConfigStatus {
  const accountSid = config.twilio.accountSid.trim();
  const authToken = config.twilio.authToken.trim();
  const fromNumber = config.twilio.fromNumber.trim();

  if (!accountSid) {
    return {
      configured: false,
      fromNumber: '',
      reason: 'TWILIO_ACCOUNT_SID is not set. Add Twilio credentials to your .env file.',
    };
  }

  if (!authToken) {
    return {
      configured: false,
      fromNumber: '',
      reason: 'TWILIO_AUTH_TOKEN is not set.',
    };
  }

  if (!fromNumber) {
    return {
      configured: false,
      fromNumber: '',
      reason: 'TWILIO_FROM_NUMBER is not set (E.164 format, e.g. +61400000000).',
    };
  }

  return {
    configured: true,
    fromNumber,
    reason: null,
  };
}

export function isTwilioConfigured(): boolean {
  return getTwilioConfigStatus().configured;
}
