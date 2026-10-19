// Stored "care options sheet": verified listings saved by area → VA/community → insurance.
import type { CareResult, Variables } from "./navigator.functions";
import { nextStatus, toOptionRow, type OptionStatus } from "./care-rules";

/** Save newly found verified listings (privileged write, server only). */
export async function saveOptions(rows: CareResult[], sourceIdByName: Record<string, string>) {
  const items = rows.flatMap((r) => (sourceIdByName[r.source_name] ? [{ ...toOptionRow(r, sourceIdByName[r.source_name]!), status: "active", last_validated: new Date().toISOString().slice(0, 10), updated_at: new Date().toISOString() }] : []));
  if (!items.length) return;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.from("care_options").upsert(items, { onConflict: "source_id,external_id" });
  if (error) console.error("[care_options] save", error.message);
}

type Row = { id: string; source_id: string; external_id: string; city: string | null; state: string | null; status: string; data_sources: { name: string; connector: string | null } | null };

/** Weekly check every Sunday: re-confirm each saved option against its source. */
export async function validateAll() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { findTreatment } = await import("./connectors.server");
  const { data, error } = await supabaseAdmin.from("care_options")
    .select("id, source_id, external_id, city, state, status, data_sources(name, connector)")
    .in("status", ["active", "needs_review"]);
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as unknown as Row[];
  const found = new Set<string>();

  // FindTreatment: re-run each area (mental health + substance use) and see which listings still appear.
  const areas = new Map<string, Row[]>();
  for (const r of rows) if (r.data_sources?.connector === "findtreatment" && r.city && r.state) {
    const k = `${r.city}|${r.state}`; areas.set(k, [...(areas.get(k) ?? []), r]);
  }
  for (const [k, list] of areas) {
    const [city, state] = k.split("|") as [string, string];
    const name = list[0]!.data_sources!.name;
    try {
      const base: Variables = { location: `${city}, ${state}`, distance_miles: 50, care_format: null, care_type: null, need: null, payment: null, va_vs_community: null, urgency: null };
      const ids = new Set([...(await findTreatment(city, state, base, name, 100)), ...(await findTreatment(city, state, { ...base, need: "substance use" }, name, 100))].map((x) => x.id));
      for (const r of list) if (ids.has(r.external_id)) found.add(r.id);
    } catch (e) { console.error("[validate] ft", k, e); for (const r of list) found.add(r.id); /* source down: don't penalize */ }
  }
  // NPI Registry: look each clinician up by NPI number.
  for (const r of rows) if (r.data_sources?.connector === "npi") {
    try {
      const res = await fetch(`https://npiregistry.cms.hhs.gov/api/?version=2.1&number=${r.external_id.replace("npi-", "")}`);
      if (!res.ok) { found.add(r.id); continue; }
      const j = (await res.json()) as { result_count?: number };
      if ((j.result_count ?? 0) > 0) found.add(r.id);
    } catch { found.add(r.id); }
  }

  const today = new Date().toISOString().slice(0, 10);
  const counts = { active: 0, needs_review: 0, removed: 0 };
  for (const r of rows) {
    const status = nextStatus(found.has(r.id), r.status as OptionStatus);
    counts[status]++;
    await supabaseAdmin.from("care_options").update({ status, updated_at: new Date().toISOString(), ...(status === "active" ? { last_validated: today } : {}) }).eq("id", r.id);
  }
  await supabaseAdmin.rpc("log_validation_run", { _details: { checked: rows.length, ...counts } });
  return { checked: rows.length, ...counts };
}
