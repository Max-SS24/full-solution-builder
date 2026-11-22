import type { ProviderMatch } from "./match.functions";

/** Listing fields the built-in matcher compares (same shape the AI matcher receives). */
export type MatchCandidate = {
  id: string; name: string; kind: string; payment: string[]; bio: string;
  needs: string[]; care_types: string[]; formats: string[]; veteran_focus: boolean;
};

const STOP = new Set("a an and the of to for in on with who that is are be not too my me i im i'm it its at or but just someone something really very want need like would".split(" "));
// Everyday words → the words listings use.
const SYNONYMS: Record<string, string[]> = {
  veteran: ["veteran", "veterans", "military", "service"], vet: ["veteran", "military"], military: ["military", "veteran"],
  video: ["telehealth", "video", "virtual"], online: ["telehealth", "virtual"], virtual: ["telehealth", "virtual"], telehealth: ["telehealth"],
  phone: ["phone", "telephone"], person: ["in-person"], group: ["group"], groups: ["group"],
  ptsd: ["ptsd", "trauma"], trauma: ["trauma", "ptsd"], depression: ["depression"], anxiety: ["anxiety"], grief: ["grief"],
  drinking: ["substance", "alcohol"], alcohol: ["alcohol", "substance"], drugs: ["substance"], substance: ["substance"], mst: ["mst", "sexual"],
  tricare: ["tricare"], medicaid: ["medicaid"], medicare: ["medicare"], insurance: [],
};

function words(s: string): string[] {
  return s.toLowerCase().replace(/[^a-z0-9\s-]/g, " ").split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w));
}

/** Built-in, no-AI provider comparison: scores each listing by how many of the person's words appear in it. */
export function basicMatch(priorities: string, candidates: MatchCandidate[], payment: string | null): { summary: string; matches: ProviderMatch[] } {
  const terms = [...new Set(words(priorities).flatMap((w) => SYNONYMS[w] ?? [w]))];
  const pay = (payment ?? "").toLowerCase();
  const scored = candidates.map((c) => {
    const text = [c.name, c.kind, c.bio, ...c.needs, ...c.care_types, ...c.formats, ...c.payment].join(" ").toLowerCase();
    const hits = terms.filter((t) => text.includes(t));
    let score = hits.length;
    const wantsVet = terms.includes("veteran") || terms.includes("military");
    if (wantsVet && c.veteran_focus) score += 2;
    const takesPay = !!pay && c.payment.some((p) => p.toLowerCase().includes(pay));
    if (takesPay) score += 1;
    const why: string[] = [];
    if (wantsVet && c.veteran_focus) why.push("lists a veteran focus");
    if (hits.length) why.push(`mentions ${hits.slice(0, 4).join(", ")}`);
    if (takesPay) why.push(`lists ${payment}`);
    else if (pay) why.push("doesn't list your insurance, so call and confirm");
    return { c, score, why };
  });
  const top = scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score).slice(0, 3);
  const best = top[0]?.score ?? 0;
  const matches: ProviderMatch[] = top.map(({ c, score, why }) => ({
    name: c.name, credentials: null, facility: c.kind, insurance: c.payment,
    why: `This listing ${why.join("; ")}.`,
    fit: score >= Math.max(3, best) ? "strong" : score >= 2 ? "good" : "partial",
  }));
  const summary = matches.length
    ? "These listings share the most words with what you said matters. This is a simple word match, so read each listing and call to confirm."
    : "None of these listings mention what you described. Try different words, or call a provider to ask.";
  return { summary, matches };
}
