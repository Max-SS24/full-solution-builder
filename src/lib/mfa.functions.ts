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

/** Replace this account's recovery codes. Needs a cleared session plus a fresh emailed code, or the first set right after turning codes on. */
export const createRecoveryCodes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const claims = context.claims as Claims;
    const { data: cleared } = await context.supabase.rpc("has_mfa_cleared");
    if (!cleared) throw new Error("Finish signing in first.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count } = await supabaseAdmin.from("mfa_recovery_codes").select("id", { count: "exact", head: true }).eq("user_id", context.userId);
    if ((count ?? 0) > 0 && !recentCode(claims.amr, Date.now())) throw new Error("Enter the code we emailed you to make new recovery codes.");
    const { makeRecoveryCode, RECOVERY_CODE_COUNT } = await import("./mfa-rules");
    const { hashRecoveryCode } = await import("./mfa-recovery.server");
    const codes = Array.from({ length: RECOVERY_CODE_COUNT }, () => makeRecoveryCode(crypto.getRandomValues(new Uint8Array(8))));
    const rows = await Promise.all(codes.map(async (c) => ({ user_id: context.userId, code_hash: await hashRecoveryCode(context.userId, c) })));
    await supabaseAdmin.from("mfa_recovery_codes").delete().eq("user_id", context.userId);
    await supabaseAdmin.from("mfa_recovery_codes").insert(rows);
    await supabaseAdmin.from("mfa_recovery_events").insert({ user_id: context.userId, kind: "regenerated" });
    return { codes };
  });

/** How many unused recovery codes this account has. */
export const recoveryStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count } = await supabaseAdmin.from("mfa_recovery_codes").select("id", { count: "exact", head: true }).eq("user_id", context.userId).is("used_at", null);
    const { data: uses } = await supabaseAdmin.from("mfa_recovery_attempts").select("success, created_at").eq("user_id", context.userId).eq("success", true).order("created_at", { ascending: false }).limit(1);
    const { data: newest } = await supabaseAdmin.from("mfa_recovery_codes").select("created_at").eq("user_id", context.userId).order("created_at", { ascending: false }).limit(1).maybeSingle();
    const { lastRecoveryUse, needsFreshCodes } = await import("./recovery-notice");
    const lastUsedAt = lastRecoveryUse(uses ?? []);
    const codesCreatedAt = (newest?.created_at as string | undefined) ?? null;
    return { remaining: count ?? 0, lastUsedAt, needsFresh: needsFreshCodes(lastUsedAt, codesCreatedAt) };
  });

/** Revoke every recovery code on this account. Needs a cleared session plus a fresh emailed code. */
export const revokeRecoveryCodes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const claims = context.claims as Claims;
    const { data: cleared } = await context.supabase.rpc("has_mfa_cleared");
    if (!cleared) throw new Error("Finish signing in first.");
    if (!recentCode(claims.amr, Date.now())) throw new Error("Enter the code we emailed you to revoke your recovery codes.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("mfa_recovery_codes").delete().eq("user_id", context.userId);
    await supabaseAdmin.from("mfa_recovery_events").insert({ user_id: context.userId, kind: "revoked" });
    return { remaining: 0 };
  });

/** Finish a password sign-in with a one-time recovery code instead of the emailed code. */
export const redeemRecoveryCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { code: string }) => ({ code: String(input?.code ?? "").slice(0, 32) }))
  .handler(async ({ data, context }) => {
    const claims = context.claims as Claims;
    if (!amrMethods(claims.amr).includes("password") || !claims.session_id) throw new Error("Sign in with your password first.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { recoveryLocked, RECOVERY_LOCK_MS } = await import("./mfa-rules");
    const now = Date.now();
    const { data: fails } = await supabaseAdmin.from("mfa_recovery_attempts").select("created_at").eq("user_id", context.userId).eq("success", false).gte("created_at", new Date(now - RECOVERY_LOCK_MS).toISOString());
    if (recoveryLocked((fails ?? []).map((f) => Date.parse(f.created_at)), now)) throw new Error("Too many wrong recovery codes. Try again in 15 minutes.");
    const since = new Date(now - PROOF_WINDOW_MS).toISOString();
    const { data: proof } = await supabaseAdmin.from("mfa_proofs").select("id").eq("user_id", context.userId).gte("created_at", since).limit(1).maybeSingle();
    if (!proof) throw new Error("Your sign-in expired. Please sign in with your password again.");
    const { hashRecoveryCode } = await import("./mfa-recovery.server");
    const hash = await hashRecoveryCode(context.userId, data.code);
    const { data: used } = await supabaseAdmin.from("mfa_recovery_codes").update({ used_at: new Date().toISOString() })
      .eq("user_id", context.userId).eq("code_hash", hash).is("used_at", null).select("id");
    const ok = !!used?.length;
    await supabaseAdmin.from("mfa_recovery_attempts").insert({ user_id: context.userId, success: ok });
    if (!ok) throw new Error("That recovery code didn't work, or it was already used.");
    await supabaseAdmin.from("mfa_proofs").delete().eq("user_id", context.userId);
    await supabaseAdmin.from("mfa_sessions").upsert({ session_id: claims.session_id, user_id: context.userId });
    await supabaseAdmin.from("mfa_recovery_events").insert({ user_id: context.userId, kind: "sign_in" });
    const { notifyRecoveryCodeUsed } = await import("./recovery-alert.server");
    await notifyRecoveryCodeUsed(context.userId).catch(() => {});
    const { count } = await supabaseAdmin.from("mfa_recovery_codes").select("id", { count: "exact", head: true }).eq("user_id", context.userId).is("used_at", null);
    return { remaining: count ?? 0 };
  });

/** This account's recovery-code activity, newest first (sign-ins, revocations, new sets). */
export const recoveryHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin.from("mfa_recovery_events").select("kind, created_at").eq("user_id", context.userId).order("created_at", { ascending: false }).limit(50);
    return { events: (data ?? []).map((e) => ({ kind: e.kind as string, at: e.created_at as string })) };
  });
