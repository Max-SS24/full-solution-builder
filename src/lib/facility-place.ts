import { US_AREAS } from "./us-areas";

/** Marker sentence so the next turn knows a numbered facility list was offered. */
export const PICK_MARK = "Which one is yours?";
export type FacilityPlace = { city: string; state: string; zip: null } | { city: ""; state: ""; zip: string };
export type FacilityCandidate = { name: string; address: string | null; distance_miles: number | null };

const NAME_TO_CODE = Object.fromEntries(Object.entries(US_AREAS).map(([k, v]) => [v.toLowerCase(), k]));

/** Reads a place from a facility answer: "near Decatur, GA", "the clinic in Decatur Georgia", "30033". */
export function placeOf(text: string): FacilityPlace | null {
  const t = text.trim();
  const zip = t.match(/\b(\d{5})(?:-\d{4})?\b/)?.[1];
  if (zip) return { city: "", state: "", zip };
  const tail = String.raw`([A-Za-z][A-Za-z .'-]{1,40}?),?\s+([A-Za-z]{2}|[A-Za-z][A-Za-z ]{3,25})\.?\s*$`;
  const m = t.match(new RegExp(String.raw`\b(?:near|in|around|by|close to|outside(?: of)?)\s+` + tail, "i")) ?? t.match(new RegExp("^" + tail, "i"));
  if (!m) return null;
  const raw = m[2]!.trim();
  const code = raw.length === 2 ? raw.toUpperCase() : NAME_TO_CODE[raw.toLowerCase()];
  if (!code || !US_AREAS[code]) return null;
  // A bare "Atlanta VA Medical Center GA"-style name is not a place: require a comma or a place word.
  const hasPlaceWord = /\b(near|in|around|by|close to|outside)\b/i.test(t) || /,/.test(t);
  if (!hasPlaceWord) return null;
  const city = m[1]!.replace(/^(?:the\s+)?(?:va\s+)?(?:clinic|facility|hospital|one)\s+/i, "").trim();
  if (/\b(va|medical|center|clinic|hospital|cboc|vamc)\b/i.test(city)) return null;
  return { city, state: code, zip: null };
}

export function placeLabel(p: FacilityPlace): string {
  return p.zip ?? `${p.city}, ${p.state}`;
}

export function candidatesReply(p: FacilityPlace, list: FacilityCandidate[]): string {
  if (!list.length) return `I couldn't find VA locations near ${placeLabel(p)}. What's the name of the facility or clinic, or another nearby city?`;
  const lines = list.map((c, i) => `${i + 1}. ${c.name}${c.address ? ` — ${c.address}` : ""}${c.distance_miles != null ? ` (${c.distance_miles.toFixed(1)} mi)` : ""}`);
  return `I found these VA locations near ${placeLabel(p)}. ${PICK_MARK}\n${lines.join("\n")}\nReply with the number, or say "none of these".`;
}

/** Names offered in the previous numbered list. */
export function offeredNames(prevBot: string): string[] {
  if (!prevBot.includes(PICK_MARK)) return [];
  return [...prevBot.matchAll(/^\d\.\s+(.+?)(?:\s+—\s+.*|\s+\([\d.]+ mi\))?$/gm)].map((m) => m[1]!.trim());
}

const ORD: Record<string, number> = { first: 1, second: 2, third: 3, fourth: 4, "1st": 1, "2nd": 2, "3rd": 3, "4th": 4, one: 1, two: 2, three: 3, four: 4 };
/** The person's choice from the list: a name, "none", or null when unclear. */
export function pickCandidate(answer: string, names: string[]): string | "none" | null {
  if (!names.length) return null;
  const a = answer.trim().toLowerCase();
  if (/\b(none|neither|not (?:listed|there|any)|no(?:pe)?,? (?:none|not))\b/.test(a) || /^no\b/.test(a)) return "none";
  const num = a.match(/^(?:#|number\s+|it'?s\s+|the\s+)?(\d)\b/)?.[1] ?? Object.entries(ORD).find(([w]) => new RegExp(`\\b${w}\\b`).test(a))?.[0];
  const n = num ? (Number(num) || ORD[num] || 0) : 0;
  if (n >= 1 && n <= names.length) return names[n - 1]!;
  const words = (s: string) => s.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !["the", "va", "clinic", "center", "medical", "health", "care", "one"].includes(w));
  const said = words(answer);
  if (!said.length) return null;
  const hits = names.filter((nm) => { const have = new Set(words(nm)); return said.every((w) => have.has(w)); });
  return hits.length === 1 ? hits[0]! : null;
}
