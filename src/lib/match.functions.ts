import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type ProviderMatch = { name: string; credentials: string | null; facility: string; insurance: string[]; why: string; fit: "strong" | "good" | "partial" };

const SYSTEM = `You help a veteran choose among LISTED mental-health providers from verified public registries. You are a navigator, never a clinician; never diagnose.
Compare what the veteran says matters most (may contain typos — interpret generously) with each listing's posted description, specialties and accepted insurance.
Only use the listings given; never invent people, bios or insurance. If insurance is unlisted, say to call and confirm. Pick up to 3 best matches.
Reply ONLY with JSON: {"summary": string (1-2 warm plain-language sentences), "matches": [{"id": string, "fit": "strong"|"good"|"partial", "why": string (1-2 sentences citing the listing)}]}`;

const Candidate = z.object({
  id: z.string().max(200), name: z.string().max(200), kind: z.string().max(60),
  payment: z.array(z.string().max(40)).max(20), bio: z.string().max(600).nullable().optional(),
  needs: z.array(z.string().max(40)).max(20), care_types: z.array(z.string().max(40)).max(20),
  veteran_focus: z.boolean(),
});

export const matchProviders = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({
    priorities: z.string().trim().min(3).max(1500),
    candidates: z.array(Candidate).min(1).max(10),
    payment: z.string().max(40).nullable(),
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
