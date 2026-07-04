const HONORIFIC_PATTERN = /^(mr|mrs|miss|ms|dr|mx)\.?$/i;

/** First name only — strips Mr/Mrs/Miss/Ms/Dr if stored in the name. */
export function calendarClientFirstName(
  clientFirstName: string | null | undefined,
  clientName: string | null | undefined,
): string | null {
  if (clientFirstName?.trim() && !HONORIFIC_PATTERN.test(clientFirstName.trim())) {
    return clientFirstName.trim();
  }

  if (!clientName?.trim()) return null;

  const parts = clientName.trim().split(/\s+/).filter(Boolean);
  const withoutHonorific = parts.filter((part) => !HONORIFIC_PATTERN.test(part));
  return withoutHonorific[0] ?? null;
}
