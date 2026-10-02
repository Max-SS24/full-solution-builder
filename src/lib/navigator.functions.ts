import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

export type Variables = {
  location: string | null;
  distance_miles: number | null;
  care_format: string | null;
  care_type: string | null;
  need: string | null;
  payment: string | null;
  va_vs_community: string | null;
  urgency: string | null;
};

export type CareResult = {
  id: string;
  name: string;
  kind: string;
  city: string | null;
  state: string | null;
  formats: string[];
  needs: string[];
  care_types: string[];
  payment: string[];
  veteran_focus: boolean;
  phone: string | null;
  source_url: string;
  verified: boolean;
  last_checked: string;
  source_name: string;
};

const SYSTEM = `You are a Veteran mental-health care NAVIGATOR (not a clinician). Never diagnose.
Extract search variables from the whole conversation. Reply ONLY with JSON:
{"reply": string (warm, short, plain language; ask ONE clarifying question only if a missing value materially changes the search),
 "crisis": boolean (true if any sign of immediate danger, suicide, self-harm),
 "variables": {"location": string|null (city, ST), "distance_miles": number|null, "care_format": "in-person"|"telehealth"|"phone"|null,
  "care_type": "therapy"|"counseling"|"psychiatry"|"group"|"iop"|"residential"|null,
  "need": "ptsd"|"depression"|"anxiety"|"mst"|"grief"|"trauma"|"substance use"|null,
  "payment": "va"|"tricare"|"medicaid"|"medicare"|"private"|"self-pay"|null,
  "va_vs_community": "va"|"community"|"either"|null, "urgency": "routine"|"soon"|"urgent"|"crisis"|null}}`;

const CRISIS_RE = /\b(suicid|kill myself|end it|self[- ]harm|hurt myself|don'?t want to live)/i;

function fallbackExtract(text: string): Variables {
  const t = text.toLowerCase();
  const pick = <T extends string>(opts: T[]) => opts.find((o) => t.includes(o)) ?? null;
  const loc = text.match(/\b(?:in|near|around)\s+([A-Z][a-zA-Z .]+,\s*[A-Z]{2})/);
  const dist = t.match(/(\d+)\s*(?:mi|miles)/);
  return {
    location: loc?.[1] ?? null,
    distance_miles: dist ? Number(dist[1]) : null,
    care_format: t.includes("tele") || t.includes("video") || t.includes("online") ? "telehealth" : t.includes("in person") ? "in-person" : null,
    care_type: pick(["therapy", "counseling", "psychiatry", "group", "residential"]),
    need: pick(["ptsd", "depression", "anxiety", "mst", "grief", "trauma", "substance use"]),
    payment: pick(["tricare", "medicaid", "medicare", "self-pay"]) ?? (t.includes("insurance") ? "private" : null),
    va_vs_community: t.includes("not the va") || t.includes("community") ? "community" : t.includes(" va") ? "va" : null,
    urgency: CRISIS_RE.test(t) ? "crisis" : t.includes("soon") || t.includes("asap") ? "soon" : null,
  };
}

export const navigate = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({
      messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4000) })).min(1).max(30),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const { completeJson, activeProvider } = await import("./ai/providers.server");
    const userText = data.messages.filter((m) => m.role === "user").map((m) => m.content).join("\n");

    let reply = "";
    let crisis = CRISIS_RE.test(userText);
    let variables: Variables = fallbackExtract(userText);
    let aiError: string | null = null;
    let aiUsed = false;

    try {
      const out = (await completeJson([{ role: "system", content: SYSTEM }, ...data.messages])) as
        | { reply?: string; crisis?: boolean; variables?: Partial<Variables> }
        | null;
      if (out) {
        aiUsed = true;
        reply = out.reply ?? "";
        crisis = crisis || !!out.crisis;
        variables = { ...variables, ...(out.variables ?? {}) };
      }
    } catch (e) {
      aiError = e instanceof Error ? e.message : "AI unavailable";
    }

    // Query approved sources (public read via RLS: only enabled sources' records).
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
      .from("care_resources")
      .select("*, data_sources!inner(name, enabled)")
      .eq("data_sources.enabled", true);

    let results: CareResult[] = [];
    if (!error && rows) {
      const v = variables;
      const city = v.location?.split(",")[0]?.trim().toLowerCase();
      const state = v.location?.split(",")[1]?.trim().toUpperCase();
      results = rows
        .map((r) => {
          let score = 0;
          if (state && r.state !== state) return null;
          if (city && r.city?.toLowerCase() === city) score += 3;
          if (v.need && r.needs.includes(v.need)) score += 3;
          if (v.care_format && r.formats.includes(v.care_format)) score += 2;
          if (v.care_type && r.care_types.includes(v.care_type)) score += 2;
          if (v.payment && r.payment.includes(v.payment)) score += 2;
          if (v.va_vs_community === "va" && r.kind.includes("VA")) score += 2;
          if (v.va_vs_community === "community" && !r.kind.includes("VA") && r.kind !== "Vet Center") score += 2;
          if (r.veteran_focus) score += 1;
          const { data_sources, ...rest } = r as typeof r & { data_sources: { name: string } };
          return { score, item: { ...rest, source_name: data_sources.name } as CareResult };
        })
        .filter((x): x is { score: number; item: CareResult } => !!x && x.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map((x) => x.item);
    }

    if (!reply) {
      reply = results.length
        ? "Thank you for sharing that. Here's what I found from approved sources — each one links back so you can verify."
        : "Thanks — tell me a bit more, like your city and state and what kind of support you're looking for.";
    }

    return {
      reply,
      crisis,
      variables,
      results,
      connectorError: error ? "A data source is temporarily unavailable." : null,
      aiNote: aiUsed ? null : aiError ?? `No AI key configured for ${activeProvider().name}; using basic matching.`,
    };
  });
