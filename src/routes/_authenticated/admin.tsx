import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Manage sources — Care Compass admin" },
      { name: "description", content: "Approve, add, and disable data sources used for care searches." },
      { property: "og:title", content: "Manage sources — Care Compass" },
      { property: "og:description", content: "Admin panel for approved data sources." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Admin,
});

function Admin() {
  const qc = useQueryClient();
  const nav = useNavigate();
  const isAdmin = useQuery({
    queryKey: ["is-admin"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("claim_first_admin");
      if (error) throw error;
      return data as boolean;
    },
  });
  const sources = useQuery({
    queryKey: ["sources"],
    enabled: isAdmin.data === true,
    queryFn: async () => {
      const { data, error } = await supabase.from("data_sources").select("*").order("created_at");
      if (error) throw error;
      return data;
    },
  });
  const [form, setForm] = useState({ name: "", url: "", category: "community", description: "" });
  const refresh = () => qc.invalidateQueries({ queryKey: ["sources"] });

  async function add(e: React.FormEvent) {
    e.preventDefault();
    try {
      new URL(form.url);
    } catch {
      { toast.error("Enter a full website address starting with https://"); return; }
    }
    const { error } = await supabase.from("data_sources").insert(form);
    if (error) { toast.error(error.message); return; }
    setForm({ name: "", url: "", category: "community", description: "" });
    toast.success("Source added");
    refresh();
  }
  async function toggle(id: string, enabled: boolean) {
    const { error } = await supabase.from("data_sources").update({ enabled, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) toast.error(error.message);
    refresh();
  }
  async function remove(id: string) {
    if (!confirm("Remove this source and its records?")) return;
    const { error } = await supabase.from("data_sources").delete().eq("id", id);
    if (error) toast.error(error.message);
    refresh();
  }
  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    nav({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-cream">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-6 py-12">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-4xl font-bold">Approved data sources</h1>
          <button onClick={signOut} className="rounded-full border-[3px] border-ink px-4 py-1.5 text-sm font-semibold">Sign out</button>
        </div>

        {isAdmin.isLoading && <p className="mt-6">Checking access…</p>}
        {isAdmin.data === false && (
          <p className="mt-6 rounded-2xl border-[3px] border-ink bg-soft p-5 font-semibold">This account doesn't have admin access. Ask an existing admin to grant it.</p>
        )}

        {isAdmin.data && (
          <>
            <form onSubmit={add} className="mt-8 grid gap-3 rounded-[26px] border-[3px] border-ink bg-paper p-6 shadow-hard-lg md:grid-cols-2">
              <h2 className="font-display text-xl font-bold md:col-span-2">Add a source</h2>
              <input required placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-full border-[3px] border-ink bg-cream px-4 py-2" />
              <input required placeholder="https://…" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} className="rounded-full border-[3px] border-ink bg-cream px-4 py-2" />
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="rounded-full border-[3px] border-ink bg-cream px-4 py-2">
                <option value="va">VA</option>
                <option value="community">Community</option>
                <option value="licensing">Licensing</option>
                <option value="nonprofit">Nonprofit</option>
              </select>
              <input placeholder="Short description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="rounded-full border-[3px] border-ink bg-cream px-4 py-2" />
              <button className="rounded-full border-[3px] border-ink bg-mint py-2.5 font-bold text-paper shadow-hard md:col-span-2">Add source</button>
            </form>

            <ul className="mt-8 space-y-4">
              {sources.data?.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center gap-4 rounded-[22px] border-[3px] border-ink bg-paper p-5 shadow-hard">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-display text-lg font-bold">{s.name}</span>
                      <span className="rounded-full bg-skytint px-2 py-0.5 text-[10px] font-bold uppercase">{s.category}</span>
                    </div>
                    <a href={s.url} target="_blank" rel="noreferrer" className="block truncate text-sm text-ink/60 underline">{s.url}</a>
                    {s.description && <p className="text-sm text-ink/70">{s.description}</p>}
                  </div>
                  <button onClick={() => toggle(s.id, !s.enabled)} className={`rounded-full border-[3px] border-ink px-4 py-1.5 text-sm font-bold ${s.enabled ? "bg-minttint" : "bg-soft text-ink/50"}`}>
                    {s.enabled ? "Enabled" : "Disabled"}
                  </button>
                  <button onClick={() => remove(s.id)} className="rounded-full border-[3px] border-ink bg-coral px-4 py-1.5 text-sm font-bold text-paper">Remove</button>
                </li>
              ))}
            </ul>
          </>
        )}
      </main>
    </div>
  );
}
