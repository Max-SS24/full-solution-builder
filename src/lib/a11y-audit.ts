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

export type AlertRun = { id: string; kind: string; ok: boolean; failed: number; ran_at: string; acknowledged_at: string | null; resolved_by_run?: string | null; results?: AuditResult[] | null };

/** Mirrors a11y_run_covers() in the database: a newer passing run of the same kind clears an older failure
 * only when it passed every page that failed. */
export function resolvesFailure(failure: AlertRun, pass: AlertRun): boolean {
  if (failure.ok || !pass.ok || pass.failed > 0 || pass.kind !== failure.kind) return false;
  if (Date.parse(pass.ran_at) <= Date.parse(failure.ran_at)) return false;
  const passed = new Set((pass.results ?? []).filter((r) => r.ok).map((r) => r.path));
  if (!passed.size) return false;
  return (failure.results ?? []).filter((r) => !r.ok).every((r) => passed.has(r.path));
}

/** Failed runs no admin has reviewed and no newer passing run has resolved, newest first. Passing runs never alert. */
export function openA11yFailures<T extends AlertRun>(runs: T[]): T[] {
  return runs
    .filter((r) => !r.ok && !r.acknowledged_at && !r.resolved_by_run && !runs.some((p) => resolvesFailure(r, p)))
    .sort((a, b) => b.ran_at.localeCompare(a.ran_at));
}
