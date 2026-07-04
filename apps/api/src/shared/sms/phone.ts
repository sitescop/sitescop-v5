/** Normalize AU mobile/landline to E.164 (+61…) for Twilio. */
export function normalizePhoneToE164(phone: string | null | undefined): string | null {
  if (!phone?.trim()) return null;

  const trimmed = phone.trim();
  if (trimmed.startsWith('+')) {
    const digits = trimmed.replace(/\D/g, '');
    return digits.length >= 10 ? `+${digits}` : null;
  }

  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return null;

  if (digits.startsWith('61') && digits.length >= 11) {
    return `+${digits}`;
  }

  if (digits.startsWith('0') && digits.length >= 10) {
    return `+61${digits.slice(1)}`;
  }

  if (digits.length >= 9 && digits.length <= 15) {
    return `+${digits}`;
  }

  return null;
}
