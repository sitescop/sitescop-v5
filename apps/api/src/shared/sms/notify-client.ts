import type { SmsTemplateKey } from './templates.js';
import {
  loadCompanySmsContext,
  resolveContactPhone,
  trySendCompanySms,
} from './sms.service.js';

export async function notifyClientSms(
  companyId: string,
  recipient: { phone?: string | null; contactId?: string | null },
  templateKey: SmsTemplateKey,
  variables: Record<string, string>,
): Promise<{ sent: boolean; error?: string }> {
  const context = await loadCompanySmsContext(companyId);
  const toPhone = await resolveContactPhone(companyId, recipient);
  if (!toPhone) {
    return { sent: false, error: 'No valid mobile number for recipient.' };
  }

  return trySendCompanySms({
    context,
    toPhone,
    templateKey,
    variables,
  });
}
