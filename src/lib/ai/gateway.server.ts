// Lovable AI Gateway (built in; uses the LOVABLE_API_KEY secret — never paste keys here).
const GATEWAY = "https://ai.gateway.lovable.dev/v1/responses";
export const GATEWAY_MODEL = "openai/gpt-6-astra";

export class GatewayError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

/** Streams a Responses call and returns the final text. */
export async function gatewayText(system: string, input: { role: "user" | "assistant"; content: string }[]): Promise<string | null> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) return null;
  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "fetch" },
    body: JSON.stringify({
      model: GATEWAY_MODEL,
      instructions: system,
      input: input.map((m) => ({ role: m.role, content: m.content })),
      stream: true,
      store: false,
      reasoning: { effort: "low", summary: "auto" },
      include: ["reasoning.encrypted_content"],
    }),
  });
  if (!res.ok || !res.body) {
    const body = await res.text().catch(() => "");
    console.error("[ai:gateway]", res.status, body.slice(0, 500));
    const msg = res.status === 402 ? "AI credits are used up — add credits in workspace settings."
      : res.status === 429 ? "The AI is busy right now — please try again in a minute."
      : `AI service error (${res.status})`;
    throw new GatewayError(res.status, msg);
  }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "", text = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, i).trim();
      buf = buf.slice(i + 1);
      if (!line.startsWith("data:")) continue;
      const d = line.slice(5).trim();
      if (!d || d === "[DONE]") continue;
      try {
        const ev = JSON.parse(d) as { type?: string; delta?: string; error?: { message?: string }; response?: { error?: { message?: string } } };
        if (ev.type === "response.output_text.delta" && ev.delta) text += ev.delta;
        if (ev.type === "error" || ev.type === "response.failed") throw new GatewayError(500, ev.error?.message ?? ev.response?.error?.message ?? "AI stream failed");
      } catch (e) { if (e instanceof GatewayError) throw e; }
    }
  }
  if (!text.trim()) throw new GatewayError(500, "The AI returned an empty answer.");
  return text;
}

export function parseJson(text: string): unknown {
  try { return JSON.parse(text); } catch {
    const m = text.match(/\{[\s\S]*\}/);
    return m ? JSON.parse(m[0]) : {};
  }
}
