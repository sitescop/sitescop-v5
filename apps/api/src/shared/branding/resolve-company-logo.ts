import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SITESCOP_LOGO_PATH } from '@sitescop/shared-types';

const BRANDING_DIR = join(dirname(fileURLToPath(import.meta.url)), '../../../assets/branding');

function toDataUrl(buffer: Buffer, filename: string): string {
  const mime = filename.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
  return `data:${mime};base64,${buffer.toString('base64')}`;
}

async function readLogoFile(filename: string): Promise<string | null> {
  try {
    const buffer = await readFile(join(BRANDING_DIR, filename));
    return toDataUrl(buffer, filename);
  } catch {
    return null;
  }
}

function logoFilenameFromUrl(logoUrl: string): string {
  const normalized = logoUrl.trim().replace(/^\//, '');
  if (normalized.startsWith('branding/')) {
    return normalized.slice('branding/'.length);
  }
  return normalized;
}

/** Resolve a stored logo URL to a value Puppeteer can embed in PDF HTML. */
export async function resolveCompanyLogoForPdf(
  logoUrl: string | null | undefined,
): Promise<string | null> {
  if (logoUrl?.startsWith('data:')) return logoUrl;
  if (logoUrl && /^https?:\/\//i.test(logoUrl)) return logoUrl;

  const filename = logoUrl ? logoFilenameFromUrl(logoUrl) : logoFilenameFromUrl(SITESCOP_LOGO_PATH);
  const resolved = await readLogoFile(filename);
  if (resolved) return resolved;

  const defaultFilename = logoFilenameFromUrl(SITESCOP_LOGO_PATH);
  if (filename !== defaultFilename) {
    return readLogoFile(defaultFilename);
  }

  return null;
}
