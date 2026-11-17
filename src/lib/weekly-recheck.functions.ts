import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const FAILED_HOMEPAGE = ["unavailable", "unexpected_redirect", "unconfirmed"];
export const RECHECK_LIMIT = 25;

export const recheckFailed = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ week: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), ids: z.array(z.uuid()).max(RECHECK_LIMIT).optional() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { deepCheckHomepage } = await import("./deep-check.server");
    const { checkCommunityCare } = await import("./community-care-check.server");
    let q = supabaseAdmin.from("community_check_history").select("*").eq("week_start", data.week)
      .or(`homepage_status.in.(${FAILED_HOMEPAGE.join(",")}),care_status.neq.listed`);
    if (data.ids) q = q.in("id", data.ids);
    else q = q.is("deep_checked_at", null);
    const { data: rows, error } = await q.order("id").limit(RECHECK_LIMIT);
    if (error) throw new Error(error.message);
    const results: { id: string; homepage_status: string; reason: string }[] = [];
    for (let s = 0; s < (rows ?? []).length; s += 3) await Promise.all(rows!.slice(s, s + 3).map(async (row) => {
      const { data: opt } = await supabaseAdmin.from("care_options")
        .select("id, external_id, city, state, data_sources!inner(name, connector)").eq("id", row.care_option_id).maybeSingle();
      const reasons: string[] = [];
      let homepage = row.homepage_status, redirected = row.redirected_to;
      if (row.homepage_url && FAILED_HOMEPAGE.includes(row.homepage_status)) {
        const c = await deepCheckHomepage(row.homepage_url);
        homepage = c.status; redirected = c.redirectedTo ?? null; reasons.push(`Website: ${c.reason}`);
        // Website outcomes only; care status and verification dates are untouched.
        await supabaseAdmin.from("care_options").update({ homepage_check: { url: row.homepage_url, status: c.status, checkedAt: c.checkedAt, ...(c.redirectedTo ? { redirectedTo: c.redirectedTo } : {}), reason: c.reason, ...(c.blocked ? { blocked: true } : {}) }, homepage_checked_at: c.checkedAt }).eq("id", row.care_option_id);
      }
      let care = { status: row.care_status, reason: row.care_reason };
      if (opt && row.care_status !== "listed") {
        const c = await checkCommunityCare(opt as never);
        care = c; reasons.push(`Listing: ${c.status === "listed" ? "still listed" : "needs confirmation"}`);
        await supabaseAdmin.from("care_options").update({ care_check: c, care_checked_at: c.checkedAt, ...(c.status === "listed" ? { last_validated: c.checkedAt.slice(0, 10) } : {}) }).eq("id", row.care_option_id);
      }
      const reason = reasons.join(" · ") || "Nothing to recheck";
      const { error: e } = await supabaseAdmin.from("community_check_history").update({ homepage_status: homepage, redirected_to: redirected, care_status: care.status, care_reason: care.reason, deep_checked_at: new Date().toISOString(), deep_reason: reason }).eq("id", row.id);
      if (e) throw new Error(e.message);
      results.push({ id: row.id, homepage_status: homepage, reason });
    }));
    return { processed: results.length, results };
  });
