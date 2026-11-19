import { AUDIT_PUBLIC_PAGES, auditHtml, type AuditResult } from "./a11y-audit";

export async function runServerA11yAudit(origin: string) {
  const results: AuditResult[] = [];
  for (const path of AUDIT_PUBLIC_PAGES) {
    try {
      const res = await fetch(new URL(path, origin), { signal: AbortSignal.timeout(15000), headers: { accept: "text/html" } });
      results.push(res.ok ? auditHtml(path, await res.text()) : { path, ok: false, problems: [`Page returned status ${res.status}`] });
    } catch {
      results.push({ path, ok: false, problems: ["Page could not be loaded"] });
    }
  }
  const failed = results.filter((r) => !r.ok).length;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.from("a11y_audit_runs").insert({ kind: "server", ok: failed === 0, passed: results.length - failed, failed, results });
  return { checked: results.length, failed };
}
