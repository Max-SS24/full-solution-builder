import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { amrMethods, PROOF_WINDOW_MS, recentCode } from "./mfa-rules";

type Claims = { amr?: unknown; session_id?: string };

/** Whether email codes are on for this account and whether this session has passed one. */
export const mfaStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.from("user_security").select("email_mfa").eq("user_id", context.userId).maybeSingle();
    const { data: cleared } = await context.supabase.rpc("has_mfa_cleared");
    return { enabled: !!data?.email_mfa, cleared: !!cleared };
  });

/** Called right after a password sign-in: records proof the password was correct. */
export const beginMfa = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.from("user_security").select("email_mfa").eq("user_id", context.userId).maybeSingle();
    if (!data?.email_mfa) return { needed: false };
    if (!amrMethods((context.claims as Claims).amr).includes("password")) throw new Error("Sign in with your password first.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("mfa_proofs").delete().eq("user_id", context.userId);
    await supabaseAdmin.from("mfa_proofs").insert({ user_id: context.userId });
    return { needed: true };
  });

/** Called with the session created by the emailed code; clears it only if a password proof is fresh. */
export const completeMfa = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const claims = context.claims as Claims;
    if (!recentCode(claims.amr, Date.now()) || !claims.session_id) throw new Error("Enter the code from your email.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const since = new Date(Date.now() - PROOF_WINDOW_MS).toISOString();
    const { data: proof } = await supabaseAdmin.from("mfa_proofs").select("id").eq("user_id", context.userId).gte("created_at", since).limit(1).maybeSingle();
    if (!proof) throw new Error("Your sign-in expired. Please sign in with your password again.");
    await supabaseAdmin.from("mfa_proofs").delete().eq("user_id", context.userId);
    await supabaseAdmin.from("mfa_sessions").upsert({ session_id: claims.session_id, user_id: context.userId });
    return { ok: true };
  });

/** Turn email codes on (from a cleared session) or off (only right after entering a fresh code). */
export const setEmailMfa = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { enabled: boolean }) => ({ enabled: input.enabled === true }))
  .handler(async ({ data, context }) => {
    const claims = context.claims as Claims;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.enabled) {
      const { data: cleared } = await context.supabase.rpc("has_mfa_cleared");
      if (!cleared) throw new Error("Finish signing in first.");
      if (claims.session_id) await supabaseAdmin.from("mfa_sessions").upsert({ session_id: claims.session_id, user_id: context.userId });
    } else if (!recentCode(claims.amr, Date.now())) {
      throw new Error("Enter the code we emailed you to turn this off.");
    }
    await supabaseAdmin.from("user_security").upsert({ user_id: context.userId, email_mfa: data.enabled, updated_at: new Date().toISOString() });
    if (!data.enabled && claims.session_id) await supabaseAdmin.from("mfa_sessions").upsert({ session_id: claims.session_id, user_id: context.userId });
    return { enabled: data.enabled };
  });
