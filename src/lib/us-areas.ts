// All 50 states, DC and the 5 inhabited U.S. territories (code -> name).
export const US_STATES: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California", CO: "Colorado", CT: "Connecticut", DE: "Delaware",
  FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky",
  LA: "Louisiana", ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri",
  MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico", NY: "New York",
  NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island",
  SC: "South Carolina", SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia", WA: "Washington",
  WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming", DC: "District of Columbia",
};
export const US_TERRITORIES: Record<string, string> = {
  PR: "Puerto Rico", GU: "Guam", VI: "U.S. Virgin Islands", AS: "American Samoa", MP: "Northern Mariana Islands",
};
export const US_AREAS: Record<string, string> = { ...US_STATES, ...US_TERRITORIES };
export const AREA_CODES = Object.keys(US_AREAS);
export const isTerritory = (code: string) => code.toUpperCase() in US_TERRITORIES;

const ALIASES: Record<string, string> = {
  "puerto rico": "PR", guam: "GU", "virgin islands": "VI", "us virgin islands": "VI", "u.s. virgin islands": "VI", usvi: "VI",
  "st. thomas": "VI", "st thomas": "VI", "st. croix": "VI", "st croix": "VI", "american samoa": "AS",
  "northern mariana islands": "MP", "mariana islands": "MP", cnmi: "MP", saipan: "MP",
  ...Object.fromEntries(Object.entries(US_STATES).map(([c, n]) => [n.toLowerCase(), c])),
};
/** Find "City, Territory/State name" written out in full, e.g. "San Juan, Puerto Rico". */
export function findNamedArea(text: string): [string, string] | null {
  const names = Object.keys(ALIASES).sort((a, b) => b.length - a.length).map((n) => n.replace(/[.]/g, "\\."));
  const re = new RegExp(`(?:([A-Za-z][A-Za-z.]*(?:\\s[A-Za-z][A-Za-z.]*){0,2}),\\s*)?\\b(${names.join("|")})\\b`, "gi");
  let hit: [string, string] | null = null;
  for (const m of text.matchAll(re)) {
    const code = ALIASES[(m[2] ?? "").toLowerCase()]!;
    const cityRaw = (m[1] ?? "").split(/\s+/).filter((w) => !/^(in|near|around|at|from|live|i|am|im|the|a)$/i.test(w)).join(" ");
    const city = cityRaw || (US_TERRITORIES[code] ? "" : "");
    if (!city && !US_TERRITORIES[code] && !/^(saipan|st\.? thomas|st\.? croix)$/i.test(m[2] ?? "")) continue;
    const c = city || (/(saipan|st\.? thomas|st\.? croix)/i.test(m[2] ?? "") ? m[2]! : "");
    hit = [c.replace(/\b\w/g, (x) => x.toUpperCase()), code];
  }
  return hit;
}
