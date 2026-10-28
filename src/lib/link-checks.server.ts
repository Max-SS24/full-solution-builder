import { ALL_LINKS, isLinkCurrent } from "./helpful-links";

export async function checkHelpfulLinks() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const rows = await Promise.all(ALL_LINKS.map(async (l) => {
    let status = 0, body = "";
    try {
      const r = await fetch(l.url, { redirect: "follow", headers: { "User-Agent": "VA-Navigator-LinkCheck" } });
      status = r.status; body = await r.text();
    } catch { /* unreachable counts as failed */ }
    return { url: l.url, ok: isLinkCurrent(status, body, l.expect), http_status: status || null, checked_at: new Date().toISOString() };
  }));
  await supabaseAdmin.from("link_checks").upsert(rows);
  return { links_checked: rows.length, links_failed: rows.filter((r) => !r.ok).length };
}
