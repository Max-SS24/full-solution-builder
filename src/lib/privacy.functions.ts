import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Permanently erases the signed-in user's account and all their data.
export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await supabase.from("search_history").delete().eq("user_id", userId);
    await supabase.from("user_preferences").delete().eq("user_id", userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // These security tables have no cascade from auth users, so erase them explicitly.
    for (const t of ["mfa_recovery_codes", "mfa_recovery_events", "mfa_recovery_attempts", "mfa_proofs", "mfa_sessions", "user_security"] as const) {
      const { error: e } = await supabaseAdmin.from(t).delete().eq("user_id", userId);
      if (e) throw new Error("Could not delete account data");
    }
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw new Error("Could not delete account");
    return { ok: true };
  });
