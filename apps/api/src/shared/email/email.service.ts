import { EmailDeliveryStatus } from '@prisma/client';
import nodemailer from 'nodemailer';
import type Transporter from 'nodemailer/lib/mailer/index.js';
import { config } from '../../config.js';
import { prisma } from '../database/prisma.js';
import { AppError } from '../http/errors.js';
import {
  DEFAULT_EMAIL_TEMPLATES,
  EMAIL_SUBJECTS,
  type EmailTemplateKey,
} from './templates.js';
import { renderEmailSubject, renderEmailTemplate } from './template-renderer.js';

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (!config.emailEnabled) {
    throw new AppError(
      'Email is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS environment variables.',
      'EMAIL_NOT_CONFIGURED',
    );
  }
  if (!transporter) {
    const auth =
      config.smtp.user && config.smtp.pass
        ? { user: config.smtp.user, pass: config.smtp.pass }
        : undefined;

    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      ...(auth ? { auth } : {}),
    });
  }
  return transporter;
}

export interface CompanyEmailContext {
  companyId: string;
  fromName: string;
  fromAddress: string;
  signature: string;
  customTemplates: Record<string, string>;
}

export interface SendCompanyEmailInput {
  context: CompanyEmailContext;
  toEmail: string;
  templateKey: EmailTemplateKey;
  variables: Record<string, string>;
  attachments?: Array<{ filename: string; content: Buffer; contentType?: string }>;
}

export async function loadCompanyEmailContext(companyId: string): Promise<CompanyEmailContext> {
  const [company, settings] = await Promise.all([
    prisma.company.findUniqueOrThrow({ where: { id: companyId } }),
    prisma.companySettings.findUnique({ where: { companyId } }),
  ]);

  const fromName = settings?.emailFromName ?? company.name;
  const fromAddress = settings?.emailFromAddress ?? company.email ?? '';
  if (!fromAddress) {
    throw new AppError('Company email from address is not configured in Settings', 'EMAIL_NOT_CONFIGURED');
  }

  return {
    companyId,
    fromName,
    fromAddress,
    signature: settings?.emailSignature ?? '',
    customTemplates: (settings?.emailTemplates as Record<string, string>) ?? {},
  };
}

export async function sendCompanyEmail(input: SendCompanyEmailInput): Promise<{ sent: boolean; messageId: string | null }> {
  const { context, toEmail, templateKey, variables, attachments } = input;
  const bodyTemplate = context.customTemplates[templateKey] ?? DEFAULT_EMAIL_TEMPLATES[templateKey];
  const subjectTemplate = EMAIL_SUBJECTS[templateKey];

  const mergedVariables = {
    ...variables,
    signature: context.signature,
  };

  const subject = renderEmailSubject(subjectTemplate, mergedVariables);
  const text = renderEmailTemplate(bodyTemplate, mergedVariables);
  const html = text
    .split('\n\n')
    .map((paragraph) => `<p>${paragraph.replace(/\n/g, '<br>')}</p>`)
    .join('');

  const record = await prisma.emailMessage.create({
    data: {
      companyId: context.companyId,
      toEmail: toEmail.toLowerCase(),
      subject,
      templateKey,
      status: EmailDeliveryStatus.PENDING,
      metadata: { variables: mergedVariables },
    },
  });

  try {
    const mailer = getTransporter();
    const result = await mailer.sendMail({
      from: `"${context.fromName}" <${context.fromAddress}>`,
      to: toEmail,
      subject,
      text,
      html,
      attachments: attachments?.map((attachment) => ({
        filename: attachment.filename,
        content: attachment.content,
        contentType: attachment.contentType ?? 'application/pdf',
      })),
    });

    await prisma.emailMessage.update({
      where: { id: record.id },
      data: {
        status: EmailDeliveryStatus.SENT,
        sentAt: new Date(),
      },
    });

    return { sent: true, messageId: result.messageId ?? null };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown email error';
    await prisma.emailMessage.update({
      where: { id: record.id },
      data: {
        status: EmailDeliveryStatus.FAILED,
        errorMessage,
      },
    });
    throw new AppError(`Failed to send email: ${errorMessage}`, 'EMAIL_SEND_FAILED');
  }
}

export async function trySendCompanyEmail(
  input: SendCompanyEmailInput,
): Promise<{ sent: boolean; error?: string }> {
  try {
    const result = await sendCompanyEmail(input);
    return { sent: result.sent };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Email send failed';
    return { sent: false, error: message };
  }
}
