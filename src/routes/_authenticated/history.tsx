import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";

export const Route = createFileRoute("/_authenticated/history")({
  head: () => ({
    meta: [
      { title: "My search history — VA Navigator" },
      { name: "description", content: "Reopen your previous private VA Navigator searches and guidance." },
      { property: "og:title", content: "My search history — VA Navigator" },
      { property: "og:description", content: "Your private history of care searches." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: History,
});

function History() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["account", "history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("search_history")
        .select("id, question, reply, results, created_at")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  async function remove(id: string) {
    const { error } = await supabase.from("search_history").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["account", "history"] });
  }

  return (
    <div className="min-h-screen bg-cream">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-6 py-12">
        <h1 className="font-display text-4xl font-bold">My search history</h1>
        <p className="mt-2 text-sm text-ink/60">🔒 Private — only you can see these. Delete any entry at any time.</p>
        {q.isLoading && <p className="mt-6">Loading…</p>}
        {q.data?.length === 0 && (
          <p className="mt-8 rounded-2xl border-[3px] border-ink bg-paper p-5 font-semibold">No searches yet. <Link to="/" className="underline">Start a chat</Link>.</p>
        )}
        <ul className="mt-8 space-y-4">
          {q.data?.map((h) => (
            <li key={h.id} className="rounded-[22px] border-[3px] border-ink bg-paper p-5 shadow-hard">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-ink/50">{new Date(h.created_at).toLocaleString()}</div>
                  <p className="mt-1 font-display text-lg font-bold">“{h.question}”</p>
                  <p className="mt-2 text-sm text-ink/70">{h.reply}</p>
                  <p className="mt-2 text-xs font-semibold text-ink/50">{(h.results as unknown[]).length} care options found</p>
                </div>
                <div className="flex gap-2">
                  <Link to="/" search={{ h: h.id }} className="rounded-full border-[3px] border-ink bg-navy px-4 py-1.5 text-sm font-bold text-cream shadow-hard">Reopen</Link>
                  <button onClick={() => remove(h.id)} className="rounded-full border-[3px] border-ink px-4 py-1.5 text-sm font-bold">Delete</button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
