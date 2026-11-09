import type { CareResult, Variables } from "./navigator.functions";
import { applyReopenCheck, checkOutcome, officialCheckUrl, type ReopenCheck } from "./reopened-care";
import { parseVaPage } from "./care-options.server";

/** Redirects must stay on approved official hosts, too. */
async function officialPage(raw: string): Promise<{ status: number; body: string } | null> {
  let url = officialCheckUrl(raw);
  if (!url) return null;
  try {
    for (let hop = 0; hop < 4; hop++) {
      const response = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(8000), headers: { "User-Agent": "VA-Navigator/1.0" } });
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        url = location ? officialCheckUrl(new URL(location, url).href) : null;
        if (!url) return null;
        continue;
      }
      return { status: response.status, body: response.ok ? (await response.text()).slice(0, 2_000_000) : "" };
    }
  } catch { /* timeouts and blocking are not evidence of closure */ }
  return null;
}

export async function recheckCare(row: CareResult, connector: string | null, variables: Variables) {
  const checkedAt = new Date().toISOString();
  let source: ReopenCheck["status"] = "unconfirmed";
  let updated = { ...row };
  const page = await officialPage(row.source_url);
  const link: ReopenCheck["link"] = !page ? "unchecked" : page.status === 404 || page.status === 410 ? "broken" : page.status >= 200 && page.status < 300 ? "working" : "unchecked";
  if (/^vagov-/.test(row.id) && new URL(officialCheckUrl(row.source_url) ?? "https://invalid.example").hostname === "www.va.gov") {
    const p = page?.status === 200 ? parseVaPage(page.body) : null;
    if (p?.name) {
      source = "confirmed";
      updated = { ...row, name: p.name, phone: p.phone, city: p.city, state: p.state, review: null, bio: `${p.street}, ${p.city}, ${p.state} ${p.zip}. Address and phone from this facility's official VA.gov page.` };
    }
  } else if (connector === "npi" && /^npi-\d{10}$/.test(row.id)) {
    const npi = row.id.slice(4);
    const record = await officialPage(`https://npiregistry.cms.hhs.gov/api/?version=2.1&number=${npi}`);
    if (record?.status === 200) {
      try {
        const data = JSON.parse(record.body) as { result_count?: number; results?: { number: number | string; basic?: { status?: string }; addresses?: { address_purpose?: string; telephone_number?: string; city?: string; state?: string }[] }[] };
        const provider = data.results?.find((r) => String(r.number) === npi);
        if (data.result_count === 0 || provider?.basic?.status === "D") source = "unavailable";
        else if (provider?.basic?.status === "A") {
          source = "confirmed";
          const a = provider.addresses?.find((a) => a.address_purpose === "LOCATION");
          updated = { ...row, phone: a?.telephone_number ?? row.phone, city: a?.city ?? row.city, state: a?.state ?? row.state };
        }
      } catch { /* malformed registry response */ }
    }
  } else if (connector === "findtreatment" && row.city && row.state) {
    try {
      const { findTreatment } = await import("./connectors.server");
      const candidates = await findTreatment(row.city, row.state, { ...variables, distance_miles: 100 }, row.source_name, 100);
      const fresh = candidates.find((r) => r.id === row.id);
      // A capped search that doesn't include this row does not prove it closed.
      if (fresh) { source = "confirmed"; updated = { ...row, ...fresh }; }
    } catch { /* source unavailable */ }
  }
  // If the source changed the website, the old page check cannot validate it.
  const freshLink = updated.source_url !== row.source_url ? "unchecked" : link;
  return applyReopenCheck(updated, checkOutcome(source, freshLink, checkedAt));
}