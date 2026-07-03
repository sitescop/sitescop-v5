export const EMAIL_TEMPLATE_KEYS = {
  agreementSent: 'agreementSent',
  agreementSigned: 'agreementSigned',
  invoiceSent: 'invoiceSent',
  paymentReceived: 'paymentReceived',
  jobAssigned: 'jobAssigned',
  jobCompleted: 'jobCompleted',
} as const;

export type EmailTemplateKey = (typeof EMAIL_TEMPLATE_KEYS)[keyof typeof EMAIL_TEMPLATE_KEYS];

export const DEFAULT_EMAIL_TEMPLATES: Record<EmailTemplateKey, string> = {
  agreementSent: `Dear {{clientName}},

Thank you for choosing {{companyName}}.

Please review and sign your inspection agreement for:

{{propertyAddress}}

Agreement: {{agreementNumber}}
Amount (inc. GST): {{totalAmount}}

Sign your agreement securely online:
{{signingUrl}}

If you have any questions, reply to this email or call us on {{companyPhone}}.

{{signature}}`,

  agreementSigned: `Agreement {{agreementNumber}} has been signed by {{clientName}} for {{propertyAddress}}.

Job: {{jobNumber}}
Signed at: {{signedAt}}

{{signature}}`,

  invoiceSent: `Dear {{clientName}},

Please find your tax invoice from {{companyName}}.

Invoice: {{invoiceNumber}}
Description: {{description}}
Amount (inc. GST): {{totalAmount}}
Due date: {{dueDate}}

Property: {{propertyAddress}}

Payment can be made by bank transfer. Please reference invoice {{invoiceNumber}} on your payment.

{{signature}}`,

  paymentReceived: `Payment received for invoice {{invoiceNumber}}.

Client: {{clientName}}
Amount: {{totalAmount}}
Reference: {{paymentReference}}

Job {{jobNumber}} is now ready for inspector assignment.

{{signature}}`,

  jobAssigned: `Hi {{inspectorName}},

You have been assigned to job {{jobNumber}} — {{jobTitle}}.

Property: {{propertyAddress}}
Scheduled: {{scheduledDate}}

Log in to SiteScop to accept the job and begin the inspection.

{{signature}}`,

  jobCompleted: `Job {{jobNumber}} — {{jobTitle}} has been marked complete.

Property: {{propertyAddress}}
Inspector: {{inspectorName}}

You can generate the inspection report from the Reports section.

{{signature}}`,
};

export const EMAIL_SUBJECTS: Record<EmailTemplateKey, string> = {
  agreementSent: 'Inspection Agreement — {{agreementNumber}}',
  agreementSigned: 'Agreement Signed — {{agreementNumber}}',
  invoiceSent: 'Tax Invoice — {{invoiceNumber}}',
  paymentReceived: 'Payment Received — {{invoiceNumber}}',
  jobAssigned: 'Job Assigned — {{jobNumber}}',
  jobCompleted: 'Job Completed — {{jobNumber}}',
};
