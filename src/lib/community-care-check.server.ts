import type { Variables } from "./navigator.functions";

export type CommunityCareCheck = { status: "listed" | "inactive_registration" | "unconfirmed"; reason: string; checkedAt: string };
type Provider = { external_id: string; city: string | null; state: string | null; data_sources: { name: string; connector: string | null } };

/** A directory listing is evidence of advertised services, not appointment availability. */
export async function checkCommunityCare(row: Provider): Promise<CommunityCareCheck> {
  const checkedAt = new Date().toISOString();
  const result = (status: CommunityCareCheck["status"], reason: string) => ({ status, reason, checkedAt });
  try {
    if (row.data_sources.connector === "npi" && /^npi-\d{10}$/.test(row.external_id)) {
      const response = await fetch(`https://npiregistry.cms.hhs.gov/api/?version=2.1&number=${row.external_id.slice(4)}`, { redirect: "error", signal: AbortSignal.timeout(6000) });
      if (response.ok) {
        const data = await response.json() as { results?: { number: number | string; basic?: { status?: string } }[] };
        const provider = data.results?.find((r) => String(r.number) === row.external_id.slice(4));
        if (provider?.basic?.status === "D") return result("inactive_registration", "CMS reports this provider registration as deactivated; care availability needs manual confirmation.");
        if (provider?.basic?.status === "A") return result("unconfirmed", "CMS registration is active, but does not confirm ongoing care services or appointment availability. Call the provider.");
      }
    } else if (row.data_sources.connector === "findtreatment" && row.city && row.state) {
      const { findTreatment } = await import("./connectors.server");
      const variables: Variables = { location: `${row.city}, ${row.state}`, distance_miles: 100, care_format: null, care_type: null, need: null, payment: null, va_vs_community: "community", urgency: null };
      for (const need of [null, "substance use"]) {
        const candidates = await findTreatment(row.city, row.state, { ...variables, need }, row.data_sources.name, 100);
        if (candidates.some((r) => r.id === row.external_id)) return result("listed", "FindTreatment.gov still lists treatment services for this provider. Call to confirm current services and openings.");
      }
      return result("unconfirmed", "Not found in the current limited directory search; this does not establish that care has stopped. Manual confirmation needed.");
    }
  } catch { /* Errors are uncertainty, never closure evidence. */ }
  return result("unconfirmed", "Current care services could not be confirmed from the official source. Call the provider.");
}