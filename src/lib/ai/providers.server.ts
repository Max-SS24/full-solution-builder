// Server-only AI provider registry. Switch providers with the AI_PROVIDER env var
// (grok | openai | gemini). Each provider reads its own API key secret.
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
