// Live data connectors for approved public sources (no API keys required).
//  - FindTreatment.gov (SAMHSA) locator: treatment facilities, services, payment accepted
//  - NPI Registry (CMS): licensed clinicians, credentials, specialties, addresses
// Each connector only runs when its data_sources row is enabled (admin page).
import type { CareResult, Variables } from "./navigator.functions";

const UA = { "User-Agent": "VA-Navigator/1.0 (capstone; https://va-navigator.lovable.app)" };
const today = () => new Date().toISOString().slice(0, 10);

const NEED_WORDS: [string, RegExp][] = [
  ["ptsd", /ptsd|post-traumatic/i], ["trauma", /trauma/i], ["substance use", /substance|addiction|alcohol|opioid/i],
  ["depression", /depress|mental health/i], ["anxiety", /anxiety|mental health/i], ["grief", /grief|bereave/i], ["mst", /sexual trauma|military sexual/i],
];
const needsFrom = (t: string) => NEED_WORDS.filter(([, re]) => re.test(t)).map(([n]) => n);

async function geocode(city: string, state: string): Promise<{ lat: string; lon: string } | null> {
  const { US_TERRITORIES } = await import("./us-areas");
  const terr = US_TERRITORIES[state.toUpperCase()];
  // Territories are their own country codes in OpenStreetMap, so search them by name.
  const u = terr
    ? `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent([city, terr].filter(Boolean).join(", "))}&countrycodes=${state.toLowerCase()},us&format=json&limit=1`
    : `https://nominatim.openstreetmap.org/search?city=${encodeURIComponent(city)}&state=${encodeURIComponent(state)}&country=US&format=json&limit=1`;
  const r = await fetch(u, { headers: UA });
  if (!r.ok) return null;
  const j = (await r.json()) as { lat: string; lon: string }[];
  return j[0] ?? null;
}

type FtRow = { _irow: number; name1: string; name2?: string; street1?: string; city: string; state: string; zip?: string; phone?: string; website?: string; miles?: number; services?: { f2: string; f3: string }[] };

export async function findTreatment(city: string, state: string, v: Variables, sourceName: string, pageSize = 25): Promise<CareResult[]> {
  const g = await geocode(city, state);
  if (!g) return [];
  const miles = Math.min(Math.max(v.distance_miles ?? 25, 5), 100);
  const u = `https://findtreatment.gov/locator/exportsAsJson/v2?sAddr=${g.lat},${g.lon}&limitType=2&limitValue=${Math.round(miles * 1609)}&sType=${v.need === "substance use" ? "sa" : "mh"}&pageSize=${pageSize}&page=1&sort=0`;
  const r = await fetch(u, { headers: UA });
  if (!r.ok) throw new Error(`FindTreatment ${r.status}`);
  const j = (await r.json()) as { rows?: FtRow[] };
  return (j.rows ?? []).map((row) => {
    const svc = (code: string) => row.services?.find((s) => s.f2 === code)?.f3 ?? "";
    const all = (row.services ?? []).map((s) => s.f3).join("; ");
    const pay = svc("PAY").toLowerCase();
    const payment = [
      pay.includes("medicaid") && "medicaid", pay.includes("medicare") && "medicare", pay.includes("private health") && "private",
      pay.includes("cash") && "self-pay", (pay.includes("tricare") || pay.includes("military")) && "tricare",
      (pay.includes("va ") || pay.includes("veterans affairs") || pay.includes("ihs/tribal/urban")) && "va",
      pay.includes("sliding") && "sliding scale",
    ].filter(Boolean) as string[];
    const tap = svc("TAP").toLowerCase();
    return {
      id: `ft-${row.name1}-${row.zip ?? row._irow}`.replace(/\s+/g, "-").toLowerCase(),
      name: row.name2 ? `${row.name1}, ${row.name2}` : row.name1,
      kind: "Treatment center",
      city: row.city, state: row.state,
      formats: ["in-person", ...(tap.includes("telehealth") ? ["telehealth"] : [])],
      needs: needsFrom(all),
      care_types: [...(tap.includes("individual") ? ["therapy", "counseling"] : []), ...(tap.includes("group") ? ["group"] : []), ...(/residential/i.test(svc("SET")) ? ["residential"] : [])],
      payment,
      veteran_focus: /veteran/i.test(svc("SG")),
      phone: row.phone ?? null,
      source_url: row.website || "https://findtreatment.gov",
      verified: true,
      last_checked: today(),
      source_name: sourceName,
      bio: [svc("FT"), svc("SG") && `Programs: ${svc("SG")}`].filter(Boolean).join(". ").slice(0, 400) || null,
    };
  });
}

type NpiRow = { number: string; enumeration_type: string; basic: { first_name?: string; last_name?: string; credential?: string; organization_name?: string };
  addresses: { address_purpose: string; city: string; state: string; telephone_number?: string }[]; taxonomies: { desc: string; primary: boolean }[] };

const NPI_TAX: Record<string, string> = { therapy: "counselor", counseling: "counselor", psychiatry: "psychiatry", group: "psychologist" };

export async function npiClinicians(city: string, state: string, v: Variables, sourceName: string): Promise<CareResult[]> {
  const terms = v.care_type && NPI_TAX[v.care_type] ? [NPI_TAX[v.care_type]!] : ["psychologist", "counselor", "social worker"];
  const lists = await Promise.all(terms.map(async (t) => {
    const u = `https://npiregistry.cms.hhs.gov/api/?version=2.1&enumeration_type=NPI-1&city=${encodeURIComponent(city)}&state=${state}&taxonomy_description=${encodeURIComponent(t)}&limit=15`;
    const r = await fetch(u, { headers: UA });
    if (!r.ok) return [] as NpiRow[];
    return ((await r.json()) as { results?: NpiRow[] }).results ?? [];
  }));
  return lists.flat().map((p) => {
    const loc = p.addresses.find((a) => a.address_purpose === "LOCATION") ?? p.addresses[0];
    const tax = p.taxonomies.find((t) => t.primary) ?? p.taxonomies[0];
    const desc = p.taxonomies.map((t) => t.desc).join("; ");
    const name = [p.basic.first_name, p.basic.last_name].filter(Boolean).map((w) => w![0] + w!.slice(1).toLowerCase()).join(" ");
    return {
      id: `npi-${p.number}`,
      name: p.basic.credential ? `${name}, ${p.basic.credential}` : name,
      kind: "Private practice",
      city: loc ? loc.city[0] + loc.city.slice(1).toLowerCase() : city,
      state: loc?.state ?? state,
      formats: ["in-person"],
      needs: needsFrom(desc),
      care_types: /psychiatr/i.test(desc) ? ["psychiatry"] : ["therapy", "counseling"],
      payment: [],
      veteran_focus: false,
      phone: loc?.telephone_number ?? null,
      source_url: `https://npiregistry.cms.hhs.gov/provider-view/${p.number}`,
      verified: true,
      last_checked: today(),
      source_name: sourceName,
      bio: `Licensed ${tax?.desc ?? "clinician"} (NPI ${p.number}). Insurance not listed in the registry, call to confirm.`,
    };
  });
}

// VA Lighthouse Facilities API (official VA.gov data). Needs the VA_API_KEY secret;
// VA_API_BASE defaults to the sandbox host and can be switched to production.
type VaFacility = {
  id: string;
  attributes: {
    name: string; facilityType?: string; classification?: string; website?: string | null;
    address?: { physical?: { address1?: string; city?: string; state?: string; zip?: string } };
    phone?: { main?: string; mentalHealthClinic?: string };
    services?: { health?: ({ name?: string; serviceId?: string } | string)[] };
  };
};

export async function vaFacilities(city: string, state: string, v: Variables, sourceName: string): Promise<CareResult[]> {
  const key = process.env["VA_API_KEY"];
  if (!key) return [];
  const g = await geocode(city, state);
  if (!g) return [];
  const base = process.env["VA_API_BASE"] || "https://sandbox-api.va.gov/services/va_facilities/v1";
  const radius = Math.min(Math.max(v.distance_miles ?? 50, 10), 100);
  const get = async (type: string) => {
    const u = `${base}/facilities?lat=${g.lat}&long=${g.lon}&radius=${radius}&type=${type}&per_page=10`;
    const r = await fetch(u, { headers: { apikey: key, Accept: "application/json" } });
    if (!r.ok) throw new Error(`VA Facilities ${r.status}`);
    const j = (await r.json()) as { data?: VaFacility[]; meta?: { distances?: { id: string; distance: number }[] } };
    const dist = new Map((j.meta?.distances ?? []).map((d) => [d.id, d.distance]));
    return (j.data ?? []).map((f) => ({ f, miles: dist.get(f.id) }));
  };
  const rows = (await Promise.all([get("health"), get("vet_center")])).flat();
  return rows.map(({ f, miles }) => {
    const a = f.attributes;
    const p = a.address?.physical ?? {};
    const services = (a.services?.health ?? []).map((s) => (typeof s === "string" ? s : s.name ?? s.serviceId ?? "")).filter(Boolean);
    const isVet = a.facilityType === "vet_center";
    const mental = services.some((s) => /mental|ptsd|psych/i.test(s)) || isVet;
    const address = [p.address1, p.city, p.state, p.zip].filter(Boolean).join(", ");
    return {
      id: `va-${f.id}`,
      name: a.name,
      kind: isVet ? "Vet Center" : "VA Medical Center",
      city: p.city ?? null, state: p.state ?? null,
      formats: ["in-person", "phone"],
      needs: mental ? ["ptsd", "depression", "anxiety", "grief", "trauma"] : [],
      care_types: isVet ? ["counseling", "group"] : ["therapy", "group"],
      payment: ["va"],
      veteran_focus: true,
      phone: a.phone?.mentalHealthClinic || a.phone?.main || null,
      source_url: a.website || `https://www.va.gov/find-locations/facility/${f.id}`,
      verified: true,
      last_checked: today(),
      source_name: sourceName,
      bio: [address && `Address: ${address}`, miles != null && `${miles.toFixed(1)} miles away`, services.length && `Services: ${services.slice(0, 12).join(", ")}`]
        .filter(Boolean).join(". ").slice(0, 500) || null,
    } satisfies CareResult;
  });
}
