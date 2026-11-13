import { PREP_CACHE_MS, PREP_FACTS, factStillValid, isPrepUrl, pageText, type PrepCheck } from "./appointment-prep";

async function fetchPage(url: string): Promise<{ status: number; text: string }> {
  if (!isPrepUrl(url)) return { status: 0, text: "" };
  try {
    // Manual redirects: a moved page counts as unconfirmed until the source is reviewed.
    const r = await fetch(url, { redirect: "manual", headers: { "User-Agent": "VA-Navigator-GuidanceCheck" }, signal: AbortSignal.timeout(15000) });
    return { status: r.status, text: r.status >= 200 && r.status < 300 ? pageText(await r.text()) : "" };
  } catch { return { status: 0, text: "" }; }
}

/** Re-check every fact against its live VA.gov page and store the outcome. */
export async function checkPrepFacts() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const urls = [...new Set(PREP_FACTS.map((f) => f.sourceUrl))];
  const pages = new Map(await Promise.all(urls.map(async (u) => [u, await fetchPage(u)] as const)));
  const now = new Date().toISOString();
  const rows = PREP_FACTS.map((f) => {
    const p = pages.get(f.sourceUrl)!;
    return { fact_id: f.id, source_url: f.sourceUrl, ok: factStillValid(f, p.status, p.text), http_status: p.status || null, checked_at: now };
  });
  await supabaseAdmin.from("prep_fact_checks").upsert(rows);
  return { prep_facts_checked: rows.length, prep_facts_failed: rows.filter((r) => !r.ok).length };
}

/** Returns recent checks, re-checking live when any is missing or older than the cache window. */
/** Minimum gap between visitor-requested live re-checks. */
export const FORCE_MIN_GAP_MS = 30 * 1000;

export async function currentPrepChecks(force = false): Promise<PrepCheck[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const read = async () => (await supabaseAdmin.from("prep_fact_checks").select("fact_id, ok, checked_at")).data ?? [];
  let rows = await read();
  const fresh = rows.length >= PREP_FACTS.length && rows.every((r) => Date.now() - new Date(r.checked_at).getTime() < PREP_CACHE_MS);
  const newest = Math.max(0, ...rows.map((r) => new Date(r.checked_at).getTime()));
  const forceNow = force && (rows.some((r) => !r.ok) || !fresh) && Date.now() - newest >= FORCE_MIN_GAP_MS;
  if (!fresh || forceNow) { await checkPrepFacts(); rows = await read(); }
  return rows
    .filter((r) => Date.now() - new Date(r.checked_at).getTime() < PREP_CACHE_MS)
    .map((r) => ({ id: r.fact_id, ok: r.ok, checkedAt: r.checked_at }));
}
