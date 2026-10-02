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
//
// HOW TO SWITCH PROVIDERS (backend only):
//   Add a secret AI_PROVIDER = grok | openai | gemini   (default: grok)
//   Optional: AI_MODEL = a specific model id to override the default below.
//
// TO ADD A NEW PROVIDER: add one entry to PROVIDERS (any OpenAI-compatible
//   /chat/completions API works) with its base URL, key secret name and model.
// =====================================================================
type ProviderConfig = { baseURL: string; keyEnv: string; model: string };

const PROVIDERS: Record<string, ProviderConfig> = {
  grok: { baseURL: "https://api.x.ai/v1", keyEnv: "XAI_API_KEY", model: "grok-4" },
  openai: { baseURL: "https://api.openai.com/v1", keyEnv: "OPENAI_API_KEY", model: "gpt-4o-mini" },
  gemini: {
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai",
    keyEnv: "GEMINI_API_KEY",
    model: "gemini-2.5-flash",
  },
};

export type ChatMsg = { role: "system" | "user" | "assistant"; content: string };

export function activeProvider() {
  const name = (process.env["AI_PROVIDER"] || "grok").toLowerCase();
  const cfg: ProviderConfig = PROVIDERS[name] ?? PROVIDERS["grok"]!;
  const model = process.env["AI_MODEL"] || cfg.model;
  // <-- API KEY IS READ HERE from the secret named in cfg.keyEnv (e.g. XAI_API_KEY)
  const apiKey = process.env[cfg.keyEnv];
  return { name, ...cfg, model, apiKey };
}

/** Returns the model's JSON reply, or null if no provider key is configured. */
export async function completeJson(messages: ChatMsg[]): Promise<unknown | null> {
  const p = activeProvider();
  if (!p.apiKey) return null;
  const res = await fetch(`${p.baseURL}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${p.apiKey}` },
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
