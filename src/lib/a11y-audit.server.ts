import { AUDIT_PUBLIC_PAGES, auditHtml, type AuditResult } from "./a11y-audit";

type Entry = { fetch: (request: Request, env?: unknown, ctx?: unknown) => Promise<Response> | Response };
type Loader = (path: string, origin: string) => Promise<Response>;

/** Render a page inside this server. The hosting network refuses (403) requests from the app to its own address,
 * so the Sunday audit never fetches itself over the internet. */
export const renderInProcess: Loader = async (path, origin) => {
  const mod = await import("@tanstack/react-start/server-entry") as unknown as { default?: Entry } & Entry;
  const entry = mod.default ?? mod;
  return entry.fetch(new Request(new URL(path, origin), { headers: { accept: "text/html" } }));
};

export async function auditPages(origin: string, load: Loader = renderInProcess): Promise<AuditResult[]> {
  const results: AuditResult[] = [];
  for (const path of AUDIT_PUBLIC_PAGES) {
    try {
      const res = await load(path, origin);
      results.push(res.ok ? auditHtml(path, await res.text()) : { path, ok: false, problems: [`Page returned status ${res.status}`] });
    } catch {
      results.push({ path, ok: false, problems: ["Page could not be loaded"] });
    }
  }
  return results;
}

export async function runServerA11yAudit(origin: string) {
  const results = await auditPages(origin);
  const failed = results.filter((r) => !r.ok).length;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.from("a11y_audit_runs").insert({ kind: "server", ok: failed === 0, passed: results.length - failed, failed, results });
  return { checked: results.length, failed };
}
