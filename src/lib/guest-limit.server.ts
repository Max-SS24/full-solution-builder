import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import { GUEST_DAILY_AI_CALLS, GUEST_DAILY_RESULTS, GUEST_NETWORK_AI_CALLS, GUEST_NETWORK_RESULTS } from "./guest-limit";

/** Signed-in user id from the bearer token, or null for guests. */
export async function viewerId(): Promise<string | null> {
  const auth = getRequest()?.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) return null;
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  const sb = createClient(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (i, init) => { const h = new Headers(init?.headers); if (h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization"); h.set("apikey", key); return fetch(i, { ...init, headers: h }); } },
  });
  const { data } = await sb.auth.getUser(token);
  return data.user?.id ?? null;
}

async function sha(s: string) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

/** Uses one guest result. Returns results left today, or -1 when the limit is reached. */
export async function useGuestResult(guestId: string | null | undefined): Promise<{ remaining: number; resetAt: string | null }> {
  const h = getRequest()?.headers;
  const ip = h?.get("cf-connecting-ip") ?? h?.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
  const keys: string[] = [], limits: number[] = [];
  keys.push("g:" + (await sha("guest|" + (guestId || "none") + "|" + ip))); limits.push(GUEST_DAILY_RESULTS);
  if (ip) { keys.push("n:" + (await sha("net|" + ip))); limits.push(GUEST_NETWORK_RESULTS); }
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.rpc("use_guest_result", { _keys: keys, _limits: limits });
  if (error) { console.error("[guest-limit]", error.message); return { remaining: -1, resetAt: null }; }
  const { data: reset } = await supabaseAdmin.rpc("guest_reset_at", { _key: keys[0]! });
  return { remaining: Math.min(Number(data), GUEST_DAILY_RESULTS), resetAt: (reset as string | null) ?? null };
}

/** Uses one guest AI call (chat turn or provider match). False when the guest or their network is over today's budget,
 * so the caller must skip the paid AI call. Fails closed: a counter error also blocks the AI call. */
export async function useGuestAiCall(guestId: string | null | undefined): Promise<boolean> {
  const h = getRequest()?.headers;
  const ip = h?.get("cf-connecting-ip") ?? h?.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
  const keys = ["ga:" + (await sha("guest-ai|" + (guestId || "none") + "|" + ip)), "na:" + (await sha("net-ai|" + (ip || "unknown")))];
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.rpc("use_guest_result", { _keys: keys, _limits: [GUEST_DAILY_AI_CALLS, GUEST_NETWORK_AI_CALLS] });
  if (error) { console.error("[guest-ai-limit]", error.message); return false; }
  return Number(data) >= 0;
}
