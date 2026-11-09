import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { CareResult, Variables } from "./navigator.functions";
import { applyReopenCheck, checkOutcome } from "./reopened-care";

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
      const current: CareResult = { ...saved, name: option.name, kind: option.kind, city: option.city, state: option.state, phone: option.phone, bio: option.bio, formats: option.formats, needs: option.needs, care_types: option.care_types, payment: option.insurance, veteran_focus: option.veteran_focus, source_url: option.website, last_checked: option.last_validated };
      return recheckCare(current, option.data_sources.connector, history.variables as unknown as Variables);
    }));
    return { messages: history.messages, variables: history.variables, results, checkedAt: new Date().toISOString() };
  });