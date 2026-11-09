import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { CareResult, Variables } from "./navigator.functions";
import { applyReopenCheck, checkOutcome, replacementCandidates } from "./reopened-care";

export const replaceSavedCare = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.uuid(), count: z.number().int().min(1).max(20) }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: history, error } = await context.supabase.from("search_history").select("variables,results").eq("id", data.id).eq("user_id", context.userId).maybeSingle();
    if (error || !history) throw new Error("Saved chat could not be opened.");
    const v = history.variables as unknown as Variables;
    const existing = (Array.isArray(history.results) ? history.results : []) as unknown as CareResult[];
    // Resolve the search area from its saved listings, without accepting arbitrary URLs or query text.
    const states = [...new Set(existing.map((r) => r.state).filter((s): s is string => !!s))];
    if (!states.length) return { replacements: [] };
    const { data: rows, error: readError } = await context.supabase.from("care_options").select("*,data_sources(name,connector,enabled)").in("state", states).eq("status", "active").limit(500);
    if (readError) throw new Error("Replacement search could not be completed.");
    const { milesBetween } = await import("./care-rules");
    const { geocode, geocodeZip } = await import("./connectors.server");
    const zip = v.location?.match(/\b\d{5}\b/)?.[0];
    const city = v.location?.split(",")[0]?.trim();
    let origin: { lat: number; lon: number } | null = null;
    try {
      const g = zip ? await geocodeZip(zip) : city && states[0] ? await geocode(city, states[0]) : null;
      if (g) origin = { lat: Number(g.lat), lon: Number(g.lon) };
    } catch { /* use saved city when coordinates cannot be resolved */ }
    const radius = v.distance_miles ?? 50;
    const options = (rows ?? []).filter((o) => o.data_sources?.enabled).map((o) => ({
      id: o.external_id, name: o.name, kind: o.kind, city: o.city, state: o.state, formats: o.formats, needs: o.needs,
      care_types: o.care_types, payment: o.insurance, veteran_focus: o.veteran_focus, phone: o.phone, source_url: o.website, provider_website: o.provider_website,
      source_name: o.data_sources?.name ?? "", verified: false, last_checked: o.last_validated, bio: o.bio,
      distance_miles: origin && o.lat != null && o.lon != null ? Math.round(milesBetween(origin, { lat: o.lat, lon: o.lon }) * 10) / 10 : null,
    } satisfies CareResult)).filter((r) => r.distance_miles != null ? r.distance_miles <= radius : r.city?.toLowerCase() === city?.toLowerCase());
    const candidates = replacementCandidates(options, existing, v).slice(0, 12);
    const { recheckCare } = await import("./reopened-care.server");
    const checked = await Promise.all(candidates.map((r) => recheckCare(r, rows?.find((o) => o.external_id === r.id && o.data_sources?.name === r.source_name)?.data_sources?.connector ?? null, v)));
    return { replacements: checked.filter((r) => r.reopenCheck?.status === "confirmed").slice(0, data.count) };
  });

export const reopenCareSearch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: history, error } = await context.supabase.from("search_history").select("messages,variables,results").eq("id", data.id).eq("user_id", context.userId).maybeSingle();
    if (error || !history) throw new Error("Saved chat could not be opened.");
    const snapshots = Array.isArray(history.results) ? history.results as unknown as CareResult[] : [];
    const { data: options, error: optionsError } = await context.supabase.from("care_options").select("*,data_sources(name,connector,enabled)").in("external_id", snapshots.slice(0, 20).map((r) => r.id));
    if (optionsError) throw new Error("Care options could not be checked.");
    const { recheckCare } = await import("./reopened-care.server");
    const results = await Promise.all(snapshots.slice(0, 20).map(async (saved) => {
      const option = options?.find((o) => o.external_id === saved.id && o.data_sources?.name === saved.source_name && o.data_sources.enabled);
      // History never overrides current source visibility or removal.
      if (!option || option.status === "removed") return applyReopenCheck(saved, checkOutcome("unavailable", "unchecked", new Date().toISOString()));
      const current: CareResult = { ...saved, name: option.name, kind: option.kind, city: option.city, state: option.state, phone: option.phone, bio: option.bio, formats: option.formats, needs: option.needs, care_types: option.care_types, payment: option.insurance, veteran_focus: option.veteran_focus, source_url: option.website, provider_website: option.provider_website, last_checked: option.last_validated };
      return recheckCare(current, option.data_sources.connector, history.variables as unknown as Variables);
    }));
    return { messages: history.messages, variables: history.variables, results, checkedAt: new Date().toISOString() };
  });