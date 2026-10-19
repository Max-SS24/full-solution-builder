import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type ProviderMatch = { name: string; credentials: string | null; facility: string; insurance: string[]; why: string; fit: "strong" | "good" | "partial" };

const SYSTEM = `You help a veteran choose among LISTED mental-health providers from verified public registries. You are a navigator, never a clinician; never diagnose.
Compare what the veteran says matters most (may contain typos — interpret generously) with each listing's posted description, specialties and accepted insurance.
Only use the listings given; never invent people, bios or insurance. If insurance is unlisted, say to call and confirm. Pick up to 3 best matches.
Reply ONLY with JSON: {"summary": string (1-2 warm plain-language sentences), "matches": [{"id": string, "fit": "strong"|"good"|"partial", "why": string (1-2 sentences citing the listing)}]}`;

// Lenient: real listings can have long names, bios or insurance lists — trim instead of rejecting.
const str = (n: number) => z.string().nullish().transform((v) => (v ?? "").slice(0, n));
const list = z.array(z.string()).nullish().transform((v) => (v ?? []).slice(0, 20).map((x) => x.slice(0, 60)));
const Candidate = z.object({
  id: z.string().min(1).transform((v) => v.slice(0, 300)), name: str(300), kind: str(80),
  payment: list, bio: str(800), needs: list, care_types: list, veteran_focus: z.boolean().nullish().transform((v) => !!v),
});

export const matchProviders = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({
    priorities: z.string().trim().min(3).max(1500),
    candidates: z.array(Candidate).min(1).transform((v) => v.slice(0, 12)),
    payment: z.string().nullish().transform((v) => (v ? v.slice(0, 60) : null)),
  }).parse(d))
  .handler(async ({ data }) => {
    const { gatewayText, parseJson } = await import("./ai/gateway.server");
    try {
      const text = await gatewayText(SYSTEM, [{ role: "user", content:
        `What matters most to me: ${data.priorities}\nMy insurance: ${data.payment ?? "not given"}\nListings:\n${JSON.stringify(data.candidates)}` }]);
      if (text == null) return { summary: "", matches: [] as ProviderMatch[], error: "AI matching isn't set up yet." };
      const out = parseJson(text) as { summary?: string; matches?: { id: string; fit?: string; why?: string }[] };
      const matches: ProviderMatch[] = (out.matches ?? []).slice(0, 3).flatMap((m) => {
        const p = data.candidates.find((x) => x.id === m.id);
        if (!p) return [];
        const fit = m.fit === "strong" || m.fit === "good" ? m.fit : "partial";
        return [{ name: p.name, credentials: null, facility: p.kind, insurance: p.payment, why: String(m.why ?? "").slice(0, 400), fit }];
      });
      return { summary: String(out.summary ?? "").slice(0, 500), matches, error: null };
    } catch (e) {
      return { summary: "", matches: [] as ProviderMatch[], error: e instanceof Error ? e.message : "AI unavailable" };
    }
  });
