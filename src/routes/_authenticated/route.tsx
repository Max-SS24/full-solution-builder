import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    // Accounts with email sign-in codes stay locked until this session has entered one.
    const { mfaStatus } = await import("@/lib/mfa.functions");
    const mfa = await mfaStatus().catch(() => null);
    if (mfa?.enabled && !mfa.cleared) throw redirect({ to: "/auth", search: { step: "code" } });
    return { user: data.user };
  },
  component: () => <Outlet />,
});
