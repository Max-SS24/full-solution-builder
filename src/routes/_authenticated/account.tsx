import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { useAccount } from "@/hooks/useAccount";

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({
    meta: [
      { title: "My account — VA Navigator" },
      { name: "description", content: "View and manage your saved care search preferences." },
      { property: "og:title", content: "My account — VA Navigator" },
      { property: "og:description", content: "Your saved VA Navigator preferences." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Account,
});

const LABELS: Record<string, string> = {
  location: "📍 Location", distance_miles: "📏 Distance (mi)", care_format: "📡 Format", care_type: "🗂️ Care type",
  need: "🩺 Need", payment: "💳 Payment", va_vs_community: "🏥 VA / community",
};

function Account() {
  const { user, prefs, savePrefs } = useAccount();
  const qc = useQueryClient();
  const nav = useNavigate();
  const entries = Object.entries(prefs ?? {});

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    nav({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-cream">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <h1 className="min-w-0 font-display text-3xl font-bold sm:text-4xl">My account</h1>
          <button onClick={signOut} className="shrink-0 rounded-full border-[3px] border-ink px-4 py-1.5 text-sm font-semibold">Sign out</button>
        </div>
        <p className="mt-2 break-all text-sm text-ink/60">{user?.email}</p>
        <section className="mt-8 rounded-[22px] border-[3px] border-ink bg-paper p-5 shadow-hard-lg sm:rounded-[26px] sm:p-6">
          <h2 className="font-display text-xl font-bold">Saved preferences</h2>
          <p className="mt-1 text-sm text-ink/60">These fill in automatically on your next search. Anything you say in the chat overrides them.</p>
          {entries.length === 0 ? (
            <p className="mt-4 text-sm font-semibold">Nothing saved yet — after a search, tap "Save as my preferences".</p>
          ) : (
            <div className="mt-4 flex flex-wrap gap-2">
              {entries.map(([k, v]) => (
                <span key={k} className="max-w-full break-words rounded-full border-2 border-ink bg-soft px-3 py-1 text-sm font-bold">{LABELS[k] ?? k}: {String(v)}</span>
              ))}
            </div>
          )}
          {entries.length > 0 && (
            <button
              onClick={async () => { await savePrefs({}); toast.success("Preferences cleared"); }}
              className="mt-6 rounded-full border-[3px] border-ink bg-coral px-4 py-2 text-sm font-bold text-paper"
            >Clear preferences</button>
          )}
        </section>
      </main>
    </div>
  );
}
