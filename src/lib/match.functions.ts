import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

export type ProviderMatch = { name: string; credentials: string | null; facility: string; insurance: string[]; why: string; fit: "strong" | "good" | "partial" };

const SYSTEM = `You help a veteran choose among LISTED mental-health providers. You are a navigator, never a clinician; never diagnose.
Compare what the veteran says matters most (may contain typos — interpret generously) with each provider's posted bio and accepted insurance.
Only use the providers given; never invent people or facts. Pick up to 3 best matches.
Reply ONLY with JSON: {"summary": string (1-2 warm plain-language sentences), "matches": [{"id": string (provider id from list), "fit": "strong"|"good"|"partial", "why": string (1-2 sentences citing the bio/insurance)}]}`;

export const matchProviders = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({
    priorities: z.string().trim().min(3).max(1500),
    resourceIds: z.array(z.string().uuid()).min(1).max(10),
    payment: z.string().max(40).nullable(),
  }).parse(d))
  .handler(async ({ data }) => {
    const url = process.env["SUPABASE_URL"]!;
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
    const sb = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
    });
    const { data: rows, error } = await sb
      .from("care_providers")
      .select("id, name, credentials, insurance, bio, care_resources(name)")
      .in("resource_id", data.resourceIds);
    if (error) return { summary: "", matches: [] as ProviderMatch[], error: "Providers are temporarily unavailable." };
    if (!rows?.length) return { summary: "", matches: [] as ProviderMatch[], error: "No individual providers are listed for these options yet." };

    const list = rows.map((p) => ({ id: p.id, name: p.name, credentials: p.credentials, insurance: p.insurance, bio: p.bio,
      facility: (p.care_resources as unknown as { name: string } | null)?.name ?? "" }));
    const { gatewayText, parseJson } = await import("./ai/gateway.server");
    try {
      const text = await gatewayText(SYSTEM, [{ role: "user", content:
        `What matters most to me: ${data.priorities}\nMy insurance: ${data.payment ?? "not given"}\nProviders:\n${JSON.stringify(list)}` }]);
      if (text == null) return { summary: "", matches: [] as ProviderMatch[], error: "AI matching isn't set up yet." };
      const out = parseJson(text) as { summary?: string; matches?: { id: string; fit?: string; why?: string }[] };
      const matches: ProviderMatch[] = (out.matches ?? []).slice(0, 3).flatMap((m) => {
        const p = list.find((x) => x.id === m.id);
        if (!p) return [];
        const fit = m.fit === "strong" || m.fit === "good" ? m.fit : "partial";
        return [{ name: p.name, credentials: p.credentials, facility: p.facility, insurance: p.insurance, why: String(m.why ?? "").slice(0, 400), fit }];
      });
      return { summary: String(out.summary ?? "").slice(0, 500), matches, error: null };
    } catch (e) {
      return { summary: "", matches: [] as ProviderMatch[], error: e instanceof Error ? e.message : "AI unavailable" };
    }
  });
