import { EmailDeliveryStatus } from '@prisma/client';
import twilio from 'twilio';
import { config } from '../../config.js';
import { prisma } from '../database/prisma.js';
import { AppError } from '../http/errors.js';
import { renderEmailTemplate } from '../email/template-renderer.js';
import { normalizePhoneToE164 } from './phone.js';
import { getTwilioConfigStatus, isTwilioConfigured } from './sms-config.js';
import { DEFAULT_SMS_TEMPLATES, type SmsTemplateKey } from './templates.js';

let twilioClient: ReturnType<typeof twilio> | null = null;

export { getTwilioConfigStatus, isTwilioConfigured };

export interface CompanySmsContext {
  companyId: string;
  enabled: boolean;
  fromNumber: string;
  customTemplates: Record<string, string>;
}

export interface SendCompanySmsInput {
  context: CompanySmsContext;
  toPhone: string;
  templateKey: SmsTemplateKey;
  variables: Record<string, string>;
}

function getTwilioClient() {
  const status = getTwilioConfigStatus();
  if (!status.configured) {
    throw new AppError(status.reason ?? 'SMS is not configured.', 'SMS_NOT_CONFIGURED');
  }
  if (!twilioClient) {
    twilioClient = twilio(config.twilio.accountSid, config.twilio.authToken);
  }
  return twilioClient;
}

export async function loadCompanySmsContext(companyId: string): Promise<CompanySmsContext> {
  const settings = await prisma.companySettings.findUnique({ where: { companyId } });
  const twilioStatus = getTwilioConfigStatus();

  return {
    companyId,
    enabled: settings?.smsEnabled ?? false,
    fromNumber: twilioStatus.fromNumber,
    customTemplates: (settings?.smsTemplates as Record<string, string>) ?? {},
  };
}

export async function resolveContactPhone(
  companyId: string,
  options: { contactId?: string | null; phone?: string | null },
): Promise<string | null> {
  const direct = normalizePhoneToE164(options.phone);
  if (direct) return direct;

  if (!options.contactId) return null;

  const contact = await prisma.contact.findFirst({
    where: { id: options.contactId, companyId },
    select: { phone: true },
  });
  return normalizePhoneToE164(contact?.phone);
}

function renderSmsBody(context: CompanySmsContext, templateKey: SmsTemplateKey, variables: Record<string, string>) {
  const template = context.customTemplates[templateKey] ?? DEFAULT_SMS_TEMPLATES[templateKey];
  return renderEmailTemplate(template, variables).trim();
}

export async function sendCompanySms(
  input: SendCompanySmsInput,
): Promise<{ sent: boolean; messageSid: string | null }> {
  const { context, templateKey, variables } = input;
  const toPhone = normalizePhoneToE164(input.toPhone);
  if (!toPhone) {
    throw new AppError('Invalid phone number', 'SMS_INVALID_PHONE');
  }

  const body = renderSmsBody(context, templateKey, variables);

  const record = await prisma.smsMessage.create({
    data: {
      companyId: context.companyId,
      toPhone,
      templateKey,
      status: EmailDeliveryStatus.PENDING,
      metadata: { variables, bodyPreview: body.slice(0, 160) },
    },
  });

  try {
    const client = getTwilioClient();
    const message = await client.messages.create({
      body,
      from: context.fromNumber,
      to: toPhone,
    });

    await prisma.smsMessage.update({
      where: { id: record.id },
      data: {
        status: EmailDeliveryStatus.SENT,
        sentAt: new Date(),
      },
    });

    return { sent: true, messageSid: message.sid ?? null };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown SMS error';
    await prisma.smsMessage.update({
      where: { id: record.id },
      data: {
        status: EmailDeliveryStatus.FAILED,
        errorMessage,
      },
    });
    throw new AppError(`Failed to send SMS: ${errorMessage}`, 'SMS_SEND_FAILED');
  }
}

export async function trySendCompanySms(
  input: SendCompanySmsInput,
): Promise<{ sent: boolean; error?: string }> {
  if (!input.context.enabled) {
    return { sent: false, error: 'SMS notifications are disabled for this company.' };
  }
  if (!isTwilioConfigured()) {
    return { sent: false, error: getTwilioConfigStatus().reason ?? 'Twilio is not configured.' };
  }

  const toPhone = normalizePhoneToE164(input.toPhone);
  if (!toPhone) {
    return { sent: false, error: 'No valid mobile number for recipient.' };
  }

  try {
    const result = await sendCompanySms({ ...input, toPhone });
    return { sent: result.sent };
  } catch (error) {
    if (error instanceof AppError) {
      return { sent: false, error: error.message };
    }
    const message = error instanceof Error ? error.message : 'SMS send failed';
    return { sent: false, error: message };
  }
}

export async function sendTwilioTestSms(
  companyId: string,
  toPhone: string,
): Promise<{ sent: boolean; error?: string }> {
  const context = await loadCompanySmsContext(companyId);
  const company = await prisma.company.findUniqueOrThrow({ where: { id: companyId } });

  return trySendCompanySms({
    context: { ...context, enabled: true },
    toPhone,
    templateKey: 'jobReminder',
    variables: {
      clientName: 'SMS Test',
      jobNumber: 'TEST-0001',
      propertyAddress: 'Test message — Twilio configuration verified',
      scheduledDate: new Date().toLocaleDateString('en-AU'),
      companyName: company.name,
    },
  });
}
