import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type Prefs = Record<string, string | number | null>;

export function useAccount() {
  const qc = useQueryClient();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        setUser(session?.user ?? null);
        qc.invalidateQueries({ queryKey: ["account"] });
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [qc]);

  const isAdmin = useQuery({
    queryKey: ["account", "is-admin", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.rpc("is_admin")).data === true,
  });

  const prefs = useQuery({
    queryKey: ["account", "prefs", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("user_preferences").select("prefs").maybeSingle();
      return (data?.prefs ?? {}) as Prefs;
    },
  });

  async function savePrefs(next: Prefs) {
    if (!user) return;
    const clean = Object.fromEntries(Object.entries(next).filter(([, v]) => v != null && v !== ""));
    const { error } = await supabase
      .from("user_preferences")
      .upsert({ user_id: user.id, prefs: clean, updated_at: new Date().toISOString() });
    if (error) throw error;
    qc.invalidateQueries({ queryKey: ["account", "prefs"] });
  }

  return { user, isAdmin: isAdmin.data === true, prefs: prefs.data ?? null, savePrefs };
}
