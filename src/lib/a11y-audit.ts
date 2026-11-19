/** Pages checked by the accessibility audits (server = public SSR pages; browser adds signed-in pages). */
export const AUDIT_PUBLIC_PAGES = ["/", "/accessibility", "/appointment-prep", "/helpful-links", "/privacy", "/terms", "/questionnaire", "/auth", "/reset-password", "/security"] as const;
export const AUDIT_BROWSER_PAGES = [...AUDIT_PUBLIC_PAGES, "/account", "/history", "/admin"] as const;

export type AuditResult = { path: string; ok: boolean; problems: string[] };

/** Checks served HTML for the accessibility basics every page must ship. */
export function auditHtml(path: string, html: string): AuditResult {
  const problems: string[] = [];
  if (!/<html[^>]*\blang="[a-z]/i.test(html)) problems.push("Missing page language");
  if (!/<title>[^<]{3,}<\/title>/i.test(html)) problems.push("Missing page title");
  if (!/localStorage\.getItem\("van_a11y"\)/.test(html)) problems.push("Display-preference startup script missing");
  if (!/Skip to main content/.test(html)) problems.push("Skip-to-main link missing");
  if (!/<main[^>]*\bid="main"/.test(html)) problems.push('Main landmark with id="main" missing');
  if (!/<h1[\s>]/i.test(html)) problems.push("Page heading (h1) missing");
  return { path, ok: problems.length === 0, problems };
}
