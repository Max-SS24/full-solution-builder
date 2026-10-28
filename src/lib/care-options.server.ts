// Stored "care options sheet": verified listings saved by area → VA/community → insurance.
import type { CareResult, Variables } from "./navigator.functions";
import { nextStatus, toOptionRow, newFacilityUrls, type OptionStatus } from "./care-rules";

/** Save newly found verified listings (privileged write, server only). */
export async function saveOptions(rows: CareResult[], sourceIdByName: Record<string, string>) {
  const uniq = [...new Map(rows.map((r) => [`${r.source_name}|${r.id}`, r])).values()];
  const items = uniq.flatMap((r) => (sourceIdByName[r.source_name] ? [{ ...toOptionRow(r, sourceIdByName[r.source_name]!), status: "active", last_validated: new Date().toISOString().slice(0, 10), updated_at: new Date().toISOString() }] : []));
  if (!items.length) return;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.from("care_options").upsert(items, { onConflict: "source_id,external_id" });
  if (error) console.error("[care_options] save", error.message);
}

type Row = { id: string; source_id: string; external_id: string; city: string | null; state: string | null; status: string; website: string; data_sources: { name: string; connector: string | null } | null };

/** Weekly check every Sunday: re-confirm each saved option against its source. */
export async function validateAll() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { findTreatment } = await import("./connectors.server");
  const { data, error } = await supabaseAdmin.from("care_options")
    .select("id, source_id, external_id, city, state, status, website, data_sources(name, connector)")
    .in("status", ["active", "needs_review"])
    .not("website", "like", "https://www.va.gov/%"); // VA.gov directory rows are checked in batches by validateVaBatch
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
  // VA Facilities API: look each facility up by its VA id.
  const vaKey = process.env["VA_API_KEY"];
  const vaBase = process.env["VA_API_BASE"] || "https://sandbox-api.va.gov/services/va_facilities/v1";
  for (const r of rows) if (r.data_sources?.connector === "va_facilities") {
    if (!vaKey) { found.add(r.id); continue; }
    try {
      const res = await fetch(`${vaBase}/facilities/${encodeURIComponent(r.external_id.replace(/^va-/, ""))}`, { headers: { apikey: vaKey } });
      if (res.status === 404) continue;
      found.add(r.id);
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


type VaRow = { id: string; status: string; website: string; name: string; phone: string | null; city: string | null; state: string | null; bio: string | null; lat: number | null; lon: number | null };

/** Read the address/phone a VA.gov facility page publishes in its structured data. */
export function parseVaPage(html: string) {
  for (const m of html.matchAll(/<script type="application\/ld\+json">([^<]*)<\/script>/g)) {
    try {
      const ld = JSON.parse(m[1]!) as { name?: string; telephone?: string; geo?: { latitude?: number; longitude?: number }; address?: { streetAddress?: string; addressLocality?: string; addressRegion?: string; postalCode?: string } };
      const a = ld.address;
      if (a?.streetAddress && a.addressLocality && a.addressRegion) return { name: ld.name?.trim(), phone: ld.telephone?.trim() || null, street: a.streetAddress.trim(), city: a.addressLocality.trim(), state: a.addressRegion.trim().toUpperCase(), zip: (a.postalCode ?? "").trim(), lat: typeof ld.geo?.latitude === "number" ? ld.geo.latitude : null, lon: typeof ld.geo?.longitude === "number" ? ld.geo.longitude : null };
    } catch { /* skip */ }
  }
  return null;
}

/**
 * Sunday VA.gov directory check, run in small batches (the schedule calls this many times on Sunday morning).
 * Each facility's official VA.gov page is re-read; address/phone are refreshed from it, missing pages follow care-rules.
 */
export async function validateVaBatch(limit = 40) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const cutoff = new Date(Date.now() - 3 * 86400_000).toISOString();
  const { data, error } = await supabaseAdmin.from("care_options")
    .select("id, status, website, name, phone, city, state, bio, lat, lon")
    .in("status", ["active", "needs_review"]).like("website", "https://www.va.gov/%").lt("updated_at", cutoff)
    .order("updated_at").limit(limit);
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as VaRow[];
  const today = new Date().toISOString().slice(0, 10);
  const counts = { active: 0, needs_review: 0, removed: 0, refreshed: 0 };
  await Promise.all(rows.map(async (r) => {
    let ok = true; let page: ReturnType<typeof parseVaPage> = null;
    try {
      const res = await fetch(r.website, { redirect: "follow", headers: { "user-agent": "Mozilla/5.0 (VA-Navigator weekly check)" } });
      if (res.status === 404 || res.status === 410) ok = false;
      else if (res.ok) page = parseVaPage(await res.text());
    } catch { /* VA.gov unreachable: don't penalize */ }
    const status = nextStatus(ok, r.status as OptionStatus);
    counts[status]++;
    const patch: import("@/integrations/supabase/types").TablesUpdate<"care_options"> = { status, updated_at: new Date().toISOString(), review_reason: status === "needs_review" ? "page_missing" : null, ...(status === "active" ? { last_validated: today } : {}) };
    if (page) {
      if (page.lat != null && page.lon != null && (page.lat !== r.lat || page.lon !== r.lon)) Object.assign(patch, { lat: page.lat, lon: page.lon });
      const bio = `${page.street}, ${page.city}, ${page.state} ${page.zip}. Address and phone from this facility's official VA.gov page; re-checked every Sunday.`;
      if (page.phone !== r.phone || page.city !== r.city || page.state !== r.state || bio !== r.bio || (page.name && page.name !== r.name)) {
        const contactChanged = page.phone !== r.phone || page.city !== r.city || page.state !== r.state || bio !== r.bio;
        Object.assign(patch, { phone: page.phone, city: page.city, state: page.state, bio, ...(page.name ? { name: page.name } : {}), ...(contactChanged ? { contact_changed_at: new Date().toISOString(), review_reason: "contact_changed" } : {}) });
        counts.refreshed++;
      }
    }
    await supabaseAdmin.from("care_options").update(patch).eq("id", r.id);
  }));
  if (rows.length) await supabaseAdmin.rpc("log_validation_run", { _details: { va_directory_batch: rows.length, ...counts } });
  return { checked: rows.length, ...counts };
}


const VA_SOURCE_NAME = "VA Mental Health Services";

/** Sunday: read VA.gov's official sitemaps and add any facility / Vet Center page not saved yet (capped per run). */
export async function discoverVaFacilities(cap = 60) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const ua = { "user-agent": "Mozilla/5.0 (VA-Navigator weekly check)" };
  const xml = (await Promise.all(["https://www.va.gov/sitemap-nb.xml", "https://www.va.gov/sitemap-cb.xml"].map(async (u) => {
    try { const r = await fetch(u, { headers: ua }); return r.ok ? await r.text() : ""; } catch { return ""; }
  }))).join("\n");
  if (!xml) return { discovered: 0, candidates: 0 };
  const known = new Set<string>();
  for (let from = 0; ; from += 1000) {
    const { data } = await supabaseAdmin.from("care_options").select("website").like("website", "https://www.va.gov/%").range(from, from + 999);
    for (const d of data ?? []) known.add(d.website.replace(/\/?$/, "/"));
    if (!data || data.length < 1000) break;
  }
  const candidates = newFacilityUrls(xml, known);
  const { data: src } = await supabaseAdmin.from("data_sources").select("id").eq("name", VA_SOURCE_NAME).maybeSingle();
  if (!src || !candidates.length) return { discovered: 0, candidates: candidates.length };
  const today = new Date().toISOString().slice(0, 10);
  const added: string[] = [];
  await Promise.all(candidates.slice(0, cap).map(async (url) => {
    try {
      const res = await fetch(url, { headers: ua });
      if (!res.ok) return;
      const p = parseVaPage(await res.text());
      if (!p?.name) return;
      const vet = url.includes("vet-center");
      const kind = vet ? "Vet Center" : /medical center|campus|health care system|hospital/i.test(p.name) ? "VA Medical Center" : "VA Clinic";
      const slug = url.replace(/^https:\/\/www\.va\.gov\/|\/$/g, "").replace("/locations/", "-").replace(/\//g, "-");
      const { error } = await supabaseAdmin.from("care_options").upsert({
        source_id: src.id, external_id: `vagov-${slug}`, name: p.name, kind, city: p.city, state: p.state,
        formats: ["in-person", "telehealth"], needs: ["ptsd", "depression", "anxiety", "trauma", "grief", ...(vet ? [] : ["substance use"])],
        care_types: ["counseling", "group", "therapy", ...(vet ? [] : ["psychiatry"])], insurance: ["va"], veteran_focus: true,
        phone: p.phone, website: url, lat: p.lat, lon: p.lon, va_vs_community: "va", status: "active", last_validated: today,
        bio: `${p.street}, ${p.city}, ${p.state} ${p.zip}. Address and phone from this facility's official VA.gov page; re-checked every Sunday.`,
      }, { onConflict: "source_id,external_id" });
      if (!error) added.push(p.name);
    } catch { /* skip */ }
  }));
  await supabaseAdmin.rpc("log_validation_run", { _details: { va_discovery: true, candidates: candidates.length, discovered: added.length, added: added.slice(0, 50) } });
  return { discovered: added.length, candidates: candidates.length };
}
