export const SMS_TEMPLATE_KEYS = {
  agreementSent: 'agreementSent',
  invoiceSent: 'invoiceSent',
  reportReady: 'reportReady',
  jobReminder: 'jobReminder',
} as const;

export type SmsTemplateKey = (typeof SMS_TEMPLATE_KEYS)[keyof typeof SMS_TEMPLATE_KEYS];

export const DEFAULT_SMS_TEMPLATES: Record<SmsTemplateKey, string> = {
  agreementSent:
    'Hi {{clientName}}, please sign your inspection agreement for {{propertyAddress}}: {{signingUrl}} — {{companyName}}',
  invoiceSent:
    'Invoice {{invoiceNumber}} for {{totalAmount}} from {{companyName}}. Due {{dueDate}}. Questions? Call {{companyPhone}}',
  reportReady:
    'Hi {{clientName}}, your inspection report for {{propertyAddress}} is ready. Sign in to your client portal to download it. — {{companyName}}',
  jobReminder:
    'Reminder: your inspection ({{jobNumber}}) at {{propertyAddress}} is scheduled for {{scheduledDate}}. — {{companyName}}',
};
