// =====================================================================
// AI PROVIDER SETTINGS  (server-only — never shipped to the browser)
// =====================================================================
// WHERE THE API KEY GOES:
//   Do NOT paste keys into this file or any other file. Keys are stored as
//   project secrets (Lovable Cloud -> Secrets) and read below via process.env.
//
//   Secret name        Provider
//   -----------        --------
//   XAI_API_KEY        Grok (xAI)  <- default
//   OPENAI_API_KEY     OpenAI
//   GEMINI_API_KEY     Google Gemini
//   OPENROUTER_API_KEY OpenRouter (free models end in ":free")
//
// HOW TO SWITCH PROVIDERS (backend only):
//   Admins can pick the provider/model on the Admin page (changes are audit-logged),
//   or add a secret AI_PROVIDER = grok | openai | gemini | openrouter   (default: grok)
//   Optional: AI_MODEL = a specific model id to override the default below.
//
// TO ADD A NEW PROVIDER: add one entry to PROVIDERS (any OpenAI-compatible
//   /chat/completions API works) with its base URL, key secret name and model.
// =====================================================================
type ProviderConfig = { baseURL: string; keyEnv: string; model: string; headers?: Record<string, string> };

const PROVIDERS: Record<string, ProviderConfig> = {
  grok: { baseURL: "https://api.x.ai/v1", keyEnv: "XAI_API_KEY", model: "grok-4" },
  openai: { baseURL: "https://api.openai.com/v1", keyEnv: "OPENAI_API_KEY", model: "gpt-4o-mini" },
  gemini: {
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai",
    keyEnv: "GEMINI_API_KEY",
    model: "gemini-2.5-flash",
  },
  openrouter: {
    baseURL: "https://openrouter.ai/api/v1",
    keyEnv: "OPENROUTER_API_KEY", // <-- OpenRouter key secret name
    model: "meta-llama/llama-3.3-70b-instruct:free",
    headers: { "HTTP-Referer": "https://va-navigator.lovable.app", "X-Title": "VA Navigator" },
  },
  // Built-in Lovable AI Gateway (secret LOVABLE_API_KEY, managed automatically).
  lovable: { baseURL: "https://ai.gateway.lovable.dev/v1", keyEnv: "LOVABLE_API_KEY", model: "openai/gpt-6-astra" },
};

export type ChatMsg = { role: "system" | "user" | "assistant"; content: string };

export function activeProvider(override?: { provider?: string | null; model?: string | null }) {
  // Priority: admin setting (audited, stored in api_settings) -> AI_PROVIDER secret -> grok
  const name = (override?.provider || process.env["AI_PROVIDER"] || "grok").toLowerCase();
  const cfg: ProviderConfig = PROVIDERS[name] ?? PROVIDERS["grok"]!;
  const model = override?.model || process.env["AI_MODEL"] || cfg.model;
  // <-- API KEY IS READ HERE from the secret named in cfg.keyEnv (e.g. XAI_API_KEY)
  const apiKey = process.env[cfg.keyEnv];
  return { name, ...cfg, model, apiKey };
}

/** Built-in Lovable AI: understands typos/irregular wording. Used when chosen ("lovable"),
 *  or automatically when the chosen provider has no key or fails. */
async function viaGateway(messages: ChatMsg[]): Promise<unknown | null> {
  const { gatewayText, parseJson } = await import("./gateway.server");
  const system = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n");
  const rest = messages.filter((m) => m.role !== "system") as { role: "user" | "assistant"; content: string }[];
  const text = await gatewayText(
    system + "\nMessages may contain typos, slang, missing punctuation or irregular wording — interpret the intended meaning generously. Reply with JSON only.",
    rest,
  );
  return text == null ? null : parseJson(text);
}

/** Returns the model's JSON reply, or null if no provider is available. */
export async function completeJson(
  messages: ChatMsg[],
  override?: { provider?: string | null; model?: string | null },
): Promise<unknown | null> {
  const p = activeProvider(override);
  if (p.name === "lovable" || !p.apiKey) return viaGateway(messages);
  try {
    return await completeExternal(messages, p);
  } catch (e) {
    console.error(`[ai:${p.name}] failed, using built-in Lovable AI`, e);
    return viaGateway(messages);
  }
}

async function completeExternal(messages: ChatMsg[], p: ReturnType<typeof activeProvider>): Promise<unknown> {
  const res = await fetch(`${p.baseURL}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${p.apiKey}`, ...(p.headers ?? {}) },
    body: JSON.stringify({ model: p.model, messages, response_format: { type: "json_object" } }),
  });
  if (!res.ok) {
    console.error(`[ai:${p.name}] ${res.status}`, await res.text());
    throw new Error(`AI provider error (${res.status})`);
  }
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const text = json.choices?.[0]?.message?.content ?? "{}";
  try {
    return JSON.parse(text);
  } catch {
    const m = text.match(/\{[\s\S]*\}/);
    return m ? JSON.parse(m[0]) : {};
  }
}
