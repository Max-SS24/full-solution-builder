import { communityHomepage } from "./care-links";
import { checkHomepage } from "./homepage-check.server";

/** Each Sunday, attempt every saved community homepage once, in bounded batches.
 * Website failures never change the care listing's status or last_validated date.
 */
export async function validateCommunityHomepageBatch(limit = 40) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const week = new Date();
  week.setUTCDate(week.getUTCDate() - week.getUTCDay());
  week.setUTCHours(0, 0, 0, 0);
  const { data, error } = await supabaseAdmin.from("care_options")
    .select("id, kind, website, provider_website, data_sources!inner(enabled)")
    .eq("va_vs_community", "community").eq("data_sources.enabled", true)
    .in("status", ["active", "needs_review"])
    .or(`homepage_checked_at.is.null,homepage_checked_at.lt.${week.toISOString()}`)
    .order("homepage_checked_at", { nullsFirst: true }).order("id").limit(limit);
  if (error) throw new Error(error.message);

  const checks = new Map<string, ReturnType<typeof checkHomepage>>();
  const counts = { homepages_checked: 0, working: 0, unavailable: 0, unexpected_redirect: 0, unconfirmed: 0, no_homepage: 0 };
  await Promise.all((data ?? []).map(async (row) => {
    const url = communityHomepage({ ...row, source_url: row.website });
    let outcome = null;
    if (url) {
      let pending = checks.get(url);
      if (!pending) { pending = checkHomepage(url); checks.set(url, pending); }
      const check = await pending;
      counts.homepages_checked++;
      counts[check.status]++;
      outcome = { url, ...check };
    } else counts.no_homepage++;
    const { error: writeError } = await supabaseAdmin.from("care_options").update({
      homepage_check: outcome,
      homepage_checked_at: outcome?.checkedAt ?? new Date().toISOString(),
    }).eq("id", row.id);
    if (writeError) throw new Error(writeError.message);
  }));
  if (data?.length) {
    const { error: logError } = await supabaseAdmin.rpc("log_validation_run", { _details: { community_homepage_batch: data.length, ...counts } });
    if (logError) throw new Error(logError.message);
  }
  return { processed: data?.length ?? 0, ...counts };
}