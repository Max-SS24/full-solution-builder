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
{"reply": string (open with one or two sincere, sympathetic sentences ONLY when the latest message shares feelings, struggles or a hard situation — NOT when they just give practical details like location, format or insurance (then simply say thanks/got it); then gently ask for what is still missing — what they need help with (need), their preferred care format, whether they want VA care or a community/civilian provider (va_vs_community), and whether they prefer one-on-one therapy or a support group (care_type) — at most two short questions per reply; plain language),
 "crisis": boolean (true if any sign of immediate danger, suicide, self-harm),
 "variables": {"location": string|null (city, ST), "distance_miles": number|null, "care_format": "in-person"|"telehealth"|"phone"|null,
  "care_type": "therapy"|"counseling"|"psychiatry"|"group"|"iop"|"residential"|null (use "group" for support groups/group therapy; "therapy" or "counseling" for one-on-one),
  "need": "ptsd"|"depression"|"anxiety"|"mst"|"grief"|"trauma"|"substance use"|null,
  "payment": "va"|"tricare"|"medicaid"|"medicare"|"private"|"self-pay"|null,
  "va_vs_community": "va"|"community"|"either"|null ("va" = VA facility/Vet Center, "community" = civilian therapist or non-VA provider — ALSO use "community" whenever they say they don't want the VA, don't want to deal with the VA or government, or want to avoid VA/government care, "either" = no preference), "urgency": "routine"|"soon"|"urgent"|"crisis"|null}}`;

const CRISIS_RE = /\b(suicid|kill myself|end it|self[- ]harm|hurt myself|don'?t want to live)/i;

function fallbackExtract(text: string): Variables {
  const t = text.toLowerCase();
  const pick = <T extends string>(opts: T[]) => opts.find((o) => t.includes(o)) ?? null;
  const ST = "AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC";
  const re = new RegExp(`([A-Za-z][A-Za-z.]*(?:\\s[A-Za-z][A-Za-z.]*){0,2}),?\\s+(${ST})\\b`, "gi");
  const stop = /^(in|near|around|at|from|live|i|am|im|i'm|the|a|with|and|to|of|for|by|is|me|my)$/i;
  let loc: [string, string] | null = null;
  for (const m of text.matchAll(re)) {
    const all = (m[1] ?? "").split(/\s+/);
    let cut = -1;
    all.forEach((w, i) => { if (stop.test(w)) cut = i; });
    const words = all.slice(cut + 1);
    if (!words.length || ((m[2] ?? "").toUpperCase() === "VA" && !m[0].includes(","))) continue;
    const city = words.map((w) => (w[0] ?? "").toUpperCase() + w.slice(1).toLowerCase()).join(" ");
    loc = [city, (m[2] ?? "").toUpperCase()];
  }
  const dist = t.match(/(\d+)\s*(?:mi|miles)/);
  return {
    location: loc ? `${loc[0]}, ${loc[1]}` : null,
    distance_miles: dist ? Number(dist[1]) : null,
    care_format: t.includes("tele") || t.includes("video") || t.includes("online") ? "telehealth" : t.includes("in person") ? "in-person" : null,
    care_type: t.includes("group") || t.includes("support group") || t.includes("peer") ? "group"
      : t.includes("one on one") || t.includes("one-on-one") || t.includes("1 on 1") || t.includes("individual") ? "therapy"
      : pick(["therapy", "counseling", "psychiatry", "residential"]),
    need: pick(["ptsd", "depression", "anxiety", "mst", "grief", "trauma", "substance use"]),
    payment: pick(["tricare", "medicaid", "medicare", "self-pay"]) ?? (t.includes("insurance") ? "private" : null),
    va_vs_community: t.includes("not the va") || t.includes("community") || t.includes("civilian") || t.includes("private therapist")
        || /don'?t want (to deal with )?(the )?va/.test(t) || /no[n -]?va/.test(t) || /avoid (the )?va/.test(t)
        || /don'?t want (to deal with )?(the )?government/.test(t) || /no[n -]?government/.test(t) || /outside (the )?va/.test(t) ? "community"
      : t.includes("either") || t.includes("no preference") || t.includes("don't care") ? "either"
      : /\bva\b/.test(t) || t.includes("vet center") ? "va" : null,
    urgency: CRISIS_RE.test(t) ? "crisis" : t.includes("soon") || t.includes("asap") ? "soon" : null,
  };
}

export const navigate = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({
      messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4000) })).min(1).max(30),
      prefs: z.record(z.string(), z.union([z.string(), z.number(), z.null()])).optional(),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const { completeJson, activeProvider } = await import("./ai/providers.server");
    const userText = data.messages.filter((m) => m.role === "user").map((m) => m.content).join("\n");

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
    const { data: aiRows } = await sb.rpc("get_ai_settings");
    const aiCfg = (aiRows as { provider: string; model: string | null }[] | null)?.[0];

    let reply = "";
    let crisis = CRISIS_RE.test(userText);
    let variables: Variables = fallbackExtract(userText);
    let aiError: string | null = null;
    let aiUsed = false;

    try {
      const out = (await completeJson([{ role: "system", content: SYSTEM }, ...data.messages], aiCfg)) as
        | { reply?: string; crisis?: boolean; variables?: Partial<Variables> }
        | null;
      if (out) {
        aiUsed = true;
        reply = out.reply ?? "";
        crisis = crisis || !!out.crisis;
        for (const [k, val] of Object.entries(out.variables ?? {})) {
          if (val != null && val !== "") (variables as Record<string, unknown>)[k] = val;
        }
      }
    } catch (e) {
      aiError = e instanceof Error ? e.message : "AI unavailable";
    }

    // Fill gaps with the signed-in user's saved preferences (what they said now wins).
    if (data.prefs) {
      for (const [k, val] of Object.entries(data.prefs)) {
        if (k in variables && (variables as Record<string, unknown>)[k] == null && val != null) (variables as Record<string, unknown>)[k] = val;
      }
    }

    const locationGiven = !!variables.location;
    if (!variables.location) variables.location = "Atlanta, GA";

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

    if (!locationGiven) variables.location = null;
    const missing: string[] = [];
    if (!variables.need) missing.push("what you'd like support with (for example PTSD, depression, anxiety, grief, or substance use)");
    if (!variables.care_type) missing.push("whether you'd prefer one-on-one therapy or a support group");
    if (!variables.va_vs_community) missing.push("whether you'd like care through the VA or from a community provider, like a civilian therapist");
    if (!variables.care_format) missing.push("whether you'd prefer in-person, telehealth, or phone care");
    if (!variables.location) missing.push("your city and state (I'll use Atlanta, GA until you tell me otherwise)");
    const needsMore = missing.length > 0 && !crisis;

    if (!reply) {
      const last = data.messages.filter((m) => m.role === "user").at(-1)?.content ?? "";
      const firstTurn = data.messages.filter((m) => m.role === "user").length === 1;
      const emotional = /\b(struggl|hard|tough|lost|alone|sad|depress|anxi|ptsd|trauma|scared|hurt|can'?t sleep|nightmare|grief|griev|overwhelm|help)/i.test(last);
      const sympathy = firstTurn || emotional
        ? "I'm really sorry you're dealing with this, and thank you for reaching out — that takes strength."
        : "Got it, thanks.";
      reply = needsMore
        ? `${sympathy} To find the right fit, could you tell me ${missing.slice(0, 2).join(" and ")}?`
        : results.length
          ? `${sympathy} Here's what I found from approved sources — each one links back so you can verify.`
          : `${sympathy} I couldn't find a close match yet — could you share a bit more about what you're looking for?`;
    }

    return {
      reply,
      crisis,
      variables,
      results: needsMore ? [] : results,
      needsMore,
      connectorError: error ? "A data source is temporarily unavailable." : null,
      aiNote: aiUsed ? null : aiError ?? `No AI key configured for ${activeProvider(aiCfg).name}; using basic matching.`,
    };
  });
