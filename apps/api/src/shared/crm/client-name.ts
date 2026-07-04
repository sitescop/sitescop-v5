const HONORIFIC_PATTERN = /^(mr|mrs|miss|ms|dr|mx)\.?$/i;

export function stripLeadingHonorifics(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  while (parts.length > 1 && HONORIFIC_PATTERN.test(parts[0] ?? '')) {
    parts.shift();
  }
  return parts.join(' ');
}

export function clientFirstNameFromParts(firstName: string, lastName: string): string {
  const first = firstName.trim();
  const last = lastName.trim();
  if (HONORIFIC_PATTERN.test(first)) {
    const lastParts = last.split(/\s+/).filter(Boolean);
    if (lastParts[0]) return lastParts[0];
    if (last) return last;
    return first;
  }
  if (first) return first;
  if (last) return last;
  return 'Client';
}
