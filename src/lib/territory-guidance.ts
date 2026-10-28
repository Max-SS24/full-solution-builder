// Fixed fallback guidance for U.S. territories when no community providers are found.
// Phone numbers and links are copied from official VA.gov / SAMHSA pages (checked Oct 2026).
export type TerritoryHelp = { area: string; steps: { text: string; phone?: string; url?: string }[] };

const SAMHSA = { text: "SAMHSA National Helpline (free, 24/7, can point you to local and telehealth treatment)", phone: "1-800-662-4357", url: "https://www.samhsa.gov/find-help/helplines/national-helpline" };
const FINDTX = { text: "Search FindTreatment.gov for telehealth providers that serve your territory", url: "https://findtreatment.gov/" };
const PACIFIC = { text: "VA Pacific Islands Health Care (covers Guam, Saipan and American Samoa)", phone: "800-214-1306", url: "https://www.va.gov/pacific-islands-health-care/" };

const HELP: Record<string, TerritoryHelp> = {
  AS: { area: "American Samoa", steps: [
    { text: "American Samoa Vet Center: free counseling, no VA enrollment needed", phone: "684-699-3760", url: "https://www.va.gov/american-samoa-vet-center/" },
    { text: "Faleomavaega Eni Fa'aua'a Hunkin VA Clinic (Pago Pago)", phone: "800-214-1306", url: "https://www.va.gov/pacific-islands-health-care/locations/faleomavaega-eni-faauaa-hunkin-va-clinic/" },
    PACIFIC, SAMHSA, FINDTX,
  ] },
  MP: { area: "the Northern Mariana Islands", steps: [
    { text: "Saipan VA Clinic", phone: "800-214-1306", url: "https://www.va.gov/pacific-islands-health-care/locations/saipan-va-clinic/" },
    { text: "Guam Vet Center also supports veterans in the CNMI: free counseling", phone: "671-472-7161", url: "https://www.va.gov/guam-vet-center/" },
    PACIFIC, SAMHSA, FINDTX,
  ] },
  GU: { area: "Guam", steps: [
    { text: "Guam Vet Center: free counseling, no VA enrollment needed", phone: "671-472-7161", url: "https://www.va.gov/guam-vet-center/" },
    { text: "Guam VA Clinic", phone: "800-214-1306", url: "https://www.va.gov/pacific-islands-health-care/locations/guam-va-clinic/" },
    PACIFIC, SAMHSA, FINDTX,
  ] },
  VI: { area: "the U.S. Virgin Islands", steps: [
    { text: "U.S. Virgin Islands Vet Center: free counseling", phone: "340-774-5384", url: "https://www.va.gov/us-virgin-islands-vet-center/" },
    { text: "Saint Thomas VA Clinic", phone: "340-774-6674", url: "https://www.va.gov/caribbean-health-care/locations/saint-thomas-va-clinic/" },
    { text: "Saint Croix VA Clinic", phone: "340-778-5553", url: "https://www.va.gov/caribbean-health-care/locations/saint-croix-va-clinic/" },
    SAMHSA, FINDTX,
  ] },
  PR: { area: "Puerto Rico", steps: [
    { text: "San Juan Vet Center: free counseling", phone: "787-749-4409", url: "https://www.va.gov/san-juan-vet-center/" },
    { text: "San Juan VA Medical Center", phone: "787-641-7582", url: "https://www.va.gov/caribbean-health-care/locations/san-juan-va-medical-center/" },
    SAMHSA, FINDTX,
  ] },
};

/** Guidance for a territory; community-only seekers get only the non-VA steps. */
export function territoryHelp(code: string, communityOnly: boolean): TerritoryHelp | null {
  const h = HELP[code.toUpperCase()];
  if (!h) return null;
  return communityOnly ? { ...h, steps: h.steps.filter((s) => !/va\.gov/.test(s.url ?? "")) } : h;
}
