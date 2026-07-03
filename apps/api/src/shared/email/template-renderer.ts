export function renderEmailTemplate(template: string, variables: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => variables[key] ?? '');
}

export function renderEmailSubject(template: string, variables: Record<string, string>): string {
  return renderEmailTemplate(template, variables).replace(/\s+/g, ' ').trim();
}
