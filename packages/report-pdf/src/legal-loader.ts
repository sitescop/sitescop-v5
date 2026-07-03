import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { LegalReportKind } from './types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const LEGAL_FILES = [
  'inspection-limitations.html',
  'scope.html',
  'terms-conditions.html',
  'privacy-policy.html',
  'client-declaration.html',
] as const;

function extractBody(html: string): string {
  const match = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return match?.[1]?.trim() ?? html;
}

function resolveLegalDir(kind: LegalReportKind): string {
  const candidates = [
    join(__dirname, '..', 'legal', kind),
    join(__dirname, '..', '..', 'legal', kind),
  ];
  for (const dir of candidates) {
    if (existsSync(join(dir, LEGAL_FILES[0]))) return dir;
  }
  return candidates[0]!;
}

export function loadLegalScheduleHtml(kind: LegalReportKind): string {
  const dir = resolveLegalDir(kind);
  const parts: string[] = [];

  for (const file of LEGAL_FILES) {
    const path = join(dir, file);
    if (!existsSync(path)) continue;
    const html = readFileSync(path, 'utf8');
    parts.push(`<div class="legal-doc">${extractBody(html)}</div>`);
  }

  if (!parts.length) {
    return `<section class="legal-section"><h1>Schedule 1 — Terms and Limitations</h1><p>Legal schedule content is not available.</p></section>`;
  }

  return `<section class="legal-section"><h1>Schedule 1 — Terms, Scope and Limitations</h1>${parts.join('\n')}</section>`;
}
