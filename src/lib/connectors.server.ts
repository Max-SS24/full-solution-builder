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
  const u = `https://nominatim.openstreetmap.org/search?city=${encodeURIComponent(city)}&state=${encodeURIComponent(state)}&country=US&format=json&limit=1`;
  const r = await fetch(u, { headers: UA });
  if (!r.ok) return null;
  const j = (await r.json()) as { lat: string; lon: string }[];
  return j[0] ?? null;
}

type FtRow = { _irow: number; name1: string; name2?: string; street1?: string; city: string; state: string; zip?: string; phone?: string; website?: string; miles?: number; services?: { f2: string; f3: string }[] };

export async function findTreatment(city: string, state: string, v: Variables, sourceName: string): Promise<CareResult[]> {
  const g = await geocode(city, state);
  if (!g) return [];
  const miles = Math.min(Math.max(v.distance_miles ?? 25, 5), 100);
  const u = `https://findtreatment.gov/locator/exportsAsJson/v2?sAddr=${g.lat},${g.lon}&limitType=2&limitValue=${Math.round(miles * 1609)}&sType=${v.need === "substance use" ? "sa" : "mh"}&pageSize=25&page=1&sort=0`;
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
      name: row.name2 ? `${row.name1} — ${row.name2}` : row.name1,
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
      bio: `Licensed ${tax?.desc ?? "clinician"} (NPI ${p.number}). Insurance not listed in the registry — call to confirm.`,
    };
  });
}
