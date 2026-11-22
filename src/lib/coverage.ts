import { AREA_CODES, US_STATES, US_TERRITORIES, findNamedArea } from "./us-areas";

/**
 * Coverage notice for locations outside the areas this app searches.
 *
 * Everything here is fixed, deterministic data: a place is "outside" only when the message names a
 * foreign country or city AND names no U.S. state, territory or ZIP. No network call, no guessing.
 */

const STATE_COUNT = Object.keys(US_STATES).filter((c) => c !== "DC").length;
// Two territory names read better with "the" in front of them.
const TERRITORY_DISPLAY: Record<string, string> = {
  "U.S. Virgin Islands": "the U.S. Virgin Islands",
  "Northern Mariana Islands": "the Northern Mariana Islands",
};
const TERRITORY_NAMES = Object.values(US_TERRITORIES).map((n) => TERRITORY_DISPLAY[n] ?? n);
const TERRITORY_LIST =
  TERRITORY_NAMES.length > 1
    ? `${TERRITORY_NAMES.slice(0, -1).join(", ")}, and ${TERRITORY_NAMES.at(-1)}`
    : TERRITORY_NAMES[0] ?? "";

/** Plain statement of what the search covers. */
export const COVERAGE_NOTE =
  `Searches here cover the ${STATE_COUNT} U.S. states, Washington, D.C., and the U.S. territories: ${TERRITORY_LIST}.`;

/** The note shown when the person names a place outside that coverage. */
export function coverageNote(place: string): string {
  const said = place.trim().replace(/\s+/g, " ").slice(0, 60);
  return `${COVERAGE_NOTE} I can't search ${said}, so I can't find care there. If you're somewhere in that area, tell me the city and state (or ZIP).`;
}

// Sovereign countries and major cities abroad. Matching needs location context (see below), and any
// U.S. area named in the same message wins, so "Paris, TX", "New Mexico" and "American Samoa" stay in.
const FOREIGN_COUNTRIES = [
  "afghanistan", "albania", "algeria", "andorra", "angola", "antigua and barbuda", "argentina", "armenia",
  "australia", "austria", "azerbaijan", "bahamas", "bahrain", "bangladesh", "barbados", "belarus", "belgium",
  "belize", "benin", "bhutan", "bolivia", "bosnia", "herzegovina", "botswana", "brazil", "brunei", "bulgaria",
  "burkina faso", "burundi", "cabo verde", "cambodia", "cameroon", "canada", "central african republic",
  "chad", "chile", "china", "colombia", "comoros", "congo", "costa rica", "croatia", "cuba", "cyprus",
  "czechia", "denmark", "djibouti", "dominica", "dominican republic", "east timor", "ecuador", "egypt",
  "el salvador", "equatorial guinea", "eritrea", "estonia", "eswatini", "ethiopia", "fiji", "finland",
  "france", "gabon", "gambia", "georgia", "germany", "ghana", "greece", "grenada", "guatemala", "guinea",
  "guinea-bissau", "guyana", "haiti", "honduras", "hungary", "iceland", "india", "indonesia", "iran", "iraq",
  "ireland", "israel", "italy", "jamaica", "japan", "jordan", "kazakhstan", "kenya", "kiribati", "kuwait",
  "kyrgyzstan", "latvia", "lebanon", "lesotho", "liberia", "libya", "liechtenstein", "lithuania", "luxembourg",
  "madagascar", "malawi", "malaysia", "maldives", "mali", "malta", "marshall islands", "mauritania",
  "mauritius", "mexico", "micronesia", "moldova", "monaco", "mongolia", "montenegro", "morocco", "mozambique",
  "myanmar", "namibia", "nauru", "nepal", "netherlands", "new zealand", "nicaragua", "niger", "nigeria",
  "north korea", "north macedonia", "norway", "oman", "pakistan", "palau", "palestine", "panama",
  "papua new guinea", "paraguay", "peru", "philippines", "poland", "portugal", "qatar", "romania", "russia",
  "rwanda", "saint kitts", "saint lucia", "samoa", "san marino", "sao tome", "saudi arabia", "senegal",
  "serbia", "seychelles", "sierra leone", "singapore", "slovakia", "slovenia", "solomon islands", "somalia",
  "south africa", "south korea", "spain", "sri lanka", "sudan", "suriname", "sweden", "switzerland", "syria",
  "taiwan", "tajikistan", "tanzania", "thailand", "timor-leste", "togo", "tonga", "trinidad and tobago",
  "tunisia", "turkey", "turkmenistan", "tuvalu", "uganda", "ukraine", "emirates", "united kingdom",
  "uruguay", "uzbekistan", "vanuatu", "vatican", "venezuela", "vietnam", "yemen", "zambia", "zimbabwe",
  // Parts of the UK, commonly said instead of "United Kingdom".
  "england", "scotland", "wales", "northern ireland", "britain",
];

const FOREIGN_CITIES = [
  "london", "paris", "tokyo", "berlin", "madrid", "rome", "milan", "venice", "athens", "dublin", "ottawa",
  "montreal", "toronto", "vancouver", "calgary", "mexico city", "bogota", "caracas", "buenos aires",
  "santiago", "lima", "sao paulo", "rio de janeiro", "mumbai", "new delhi", "beijing", "shanghai", "osaka",
  "seoul", "manila", "bangkok", "hanoi", "jakarta", "kuala lumpur", "hong kong", "taipei", "sydney",
  "melbourne", "brisbane", "auckland", "cairo", "lagos", "nairobi", "johannesburg", "cape town", "moscow",
  "st petersburg", "kyiv", "warsaw", "prague", "budapest", "vienna", "amsterdam", "brussels", "lisbon",
  "reykjavik", "oslo", "stockholm", "copenhagen", "helsinki", "istanbul", "ankara", "tehran", "baghdad",
  "riyadh", "jeddah", "dubai", "abu dhabi", "doha", "manama", "muscat", "amman", "beirut", "damascus",
  "jerusalem", "tel aviv", "gaza", "kabul", "islamabad", "rawalpindi", "karachi", "lahore", "dhaka",
  "kathmandu", "colombo", "yangon", "phnom penh", "vientiane", "tbilisi", "yerevan", "baku", "minsk",
  "chisinau", "tirana", "sarajevo", "skopje", "podgorica", "zagreb", "ljubljana", "bratislava", "vilnius",
  "riga", "tallinn", "valletta", "nicosia", "andorra la vella", "vaduz", "algiers", "tunis", "rabat",
  "casablanca", "accra", "cotonou", "abidjan", "dakar", "bamako", "ouagadougou", "niamey", "ndjamena",
  "khartoum", "addis ababa", "mogadishu", "kampala", "kigali", "dar es salaam", "lusaka", "harare",
  "antananarivo", "port louis", "windhoek", "gaborone", "libreville", "conakry", "freetown", "monrovia",
  "banjul", "bissau", "praia", "port moresby", "honiara", "port vila", "apia", "papeete", "noumea", "suva",
  "havanna", "santo domingo", "port-au-prince", "nassau", "bridgetown", "roseau", "castries", "willemstad",
  "paramaribo", "cayenne", "guatemala city", "tegucigalpa", "managua", "belmopan", "basseterre",
];

const FOREIGN = [...new Set([...FOREIGN_COUNTRIES, ...FOREIGN_CITIES])].sort((a, b) => b.length - a.length);
const ESC = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const ALT = FOREIGN.map(ESC).join("|");
const COUNTRY_ALT = [...new Set(FOREIGN_COUNTRIES)].sort((a, b) => b.length - a.length).map(ESC).join("|");

/** "in London", "from Toronto", "living in Berlin" — a place named as where the person is. */
const PRE_RE = new RegExp(`\\b(?:in|at|near|from|around)\\s+(${ALT})\\b`, "i");
const LIVE_RE = new RegExp(`\\b(?:live|lives|living|based|located)\\s+in\\s+(${ALT})\\b`, "i");
/** "Toronto, Canada" — a place written first, ahead of its country or region. */
const POST_RE = new RegExp(`\\b(${ALT})\\s*,`, "i");
/** "Kingston, Jamaica" — the country named last, after a comma. */
const COMMA_RE = new RegExp(`,\\s*(${COUNTRY_ALT})\\b`, "i");

const US_CODE_RE = new RegExp(`\\b[A-Za-z][A-Za-z .']{1,30},\\s*(${AREA_CODES.join("|")})\\b`, "i");
/** State and territory names written out ("I'm in Georgia"), which the code list alone would miss. */
const AREA_NAME_RE = new RegExp(
  `\\b(${[...Object.values(US_STATES), ...Object.values(US_TERRITORIES)].map(ESC).join("|")})\\b`,
  "i",
);

/**
 * Service history is not a location: "I served in Iraq" must not be read as a place to search.
 * When it appears, the coverage note is skipped and the person is simply asked where they live now.
 */
const DEPLOYED_RE = /\b(i (?:served|was stationed|was deployed|was based)|served (?:in|with)|deployed|stationed|came home from|returned from|back from)\b/i;

/** True when the message names a U.S. state, territory or ZIP — those always win over the foreign list. */
export function mentionsUSArea(text: string): boolean {
  return !!findNamedArea(text) || US_CODE_RE.test(text) || AREA_NAME_RE.test(text) || /\b\d{5}(?:-\d{4})?\b/.test(text);
}

/** The place the person named that is outside U.S. coverage, or null when the message is in coverage. */
export function findForeignPlace(text: string): string | null {
  if (mentionsUSArea(text) || DEPLOYED_RE.test(text)) return null;
  for (const re of [PRE_RE, LIVE_RE, POST_RE, COMMA_RE]) {
    const m = re.exec(text);
    if (m?.[1]) return m[1].replace(/\s+/g, " ").trim();
  }
  return null;
}

/** Coverage notice for this message, or null when nothing outside coverage was named. */
export function outOfAreaNotice(text: string): string | null {
  const place = findForeignPlace(text);
  return place ? coverageNote(place) : null;
}

/**
 * Puts a notice before the reply's question so the person reads the limit first, and so
 * firstQuestionOnly() (which cuts everything after the first question) can't drop it.
 */
export function withNotice(text: string, notice: string): string {
  if (!notice) return text;
  if (!text.trim()) return notice;
  const parts = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [text];
  const q = parts.findIndex((p) => /\?\s*["')\]]*$/.test(p));
  const out = q < 0 ? [text, notice] : [...parts.slice(0, q), notice, ...parts.slice(q)];
  return out.join(" ").replace(/\s+/g, " ").trim();
}
