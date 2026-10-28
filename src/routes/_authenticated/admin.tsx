import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin — VA Navigator" },
      { name: "description", content: "Approve, add, and disable data sources used for care searches." },
      { property: "og:title", content: "Manage sources — VA Navigator" },
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
  const [tab, setTab] = useState<"analytics" | "options" | "sources" | "admins" | "ai" | "audit">("analytics");
  const [form, setForm] = useState({ name: "", url: "", category: "community", description: "" });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["sources"] });
    qc.invalidateQueries({ queryKey: ["audit"] });
  };
  const api = useQuery({
    queryKey: ["api-settings"],
    enabled: isAdmin.data === true,
    queryFn: async () => {
      const { data, error } = await supabase.from("api_settings").select("*").eq("id", 1).single();
      if (error) throw error;
      return data;
    },
  });
  const audit = useQuery({
    queryKey: ["audit"],
    enabled: isAdmin.data === true,
    queryFn: async () => {
      const { data, error } = await supabase.from("audit_log").select("*").order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return data;
    },
  });
  async function saveApi(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const provider = String(fd.get("provider"));
    const model = String(fd.get("model") || "").trim() || null;
    const { error } = await supabase.from("api_settings").update({ provider, model, updated_at: new Date().toISOString() }).eq("id", 1);
    if (error) { toast.error(error.message); return; }
    toast.success("AI settings saved");
    qc.invalidateQueries({ queryKey: ["api-settings"] });
    refresh();
  }

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
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <h1 className="min-w-0 font-display text-3xl font-bold sm:text-4xl">Admin</h1>
          <button onClick={signOut} className="shrink-0 rounded-full border-[3px] border-ink px-4 py-1.5 text-sm font-semibold">Sign out</button>
        </div>

        {isAdmin.isLoading && <p className="mt-6">Checking access…</p>}
        {isAdmin.data === false && (
          <p className="mt-6 rounded-2xl border-[3px] border-ink bg-soft p-5 font-semibold">This account doesn't have admin access. Ask an existing admin to grant it.</p>
        )}

        {isAdmin.data && (
          <>
            <div role="tablist" className="mt-6 flex gap-2 overflow-x-auto pb-1">
              {([["analytics", "Analytics"], ["options", "Care options"], ["sources", "Sources"], ["admins", "Admins"], ["ai", "AI service"], ["audit", "Audit log"]] as const).map(([k, l]) => (
                <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
                  className={`shrink-0 rounded-full border-[3px] border-ink px-4 py-1.5 text-sm font-bold ${tab === k ? "bg-sun shadow-hard" : "bg-paper"}`}>{l}</button>
              ))}
            </div>
            {tab === "analytics" && <Analytics />}
            {tab === "options" && <CareOptions />}
            {tab === "sources" && <>
             <form onSubmit={add} className="mt-8 grid min-w-0 gap-3 rounded-[22px] border-[3px] border-ink bg-paper p-4 shadow-hard-lg sm:p-6 md:grid-cols-2 md:rounded-[26px]">
              <h2 className="font-display text-xl font-bold md:col-span-2">Add a source</h2>
               <input required placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="min-w-0 rounded-full border-[3px] border-ink bg-cream px-4 py-2" />
               <input required placeholder="https://…" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} className="min-w-0 rounded-full border-[3px] border-ink bg-cream px-4 py-2" />
               <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="min-w-0 rounded-full border-[3px] border-ink bg-cream px-4 py-2">
                <option value="va">VA</option>
                <option value="community">Community</option>
                <option value="licensing">Licensing</option>
                <option value="nonprofit">Nonprofit</option>
              </select>
               <input placeholder="Short description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="min-w-0 rounded-full border-[3px] border-ink bg-cream px-4 py-2" />
              <button className="rounded-full border-[3px] border-ink bg-mint py-2.5 font-bold text-paper shadow-hard md:col-span-2">Add source</button>
            </form>

            <ul className="mt-8 space-y-4">
              {sources.data?.map((s) => (
                 <li key={s.id} className="grid gap-4 rounded-[22px] border-[3px] border-ink bg-paper p-4 shadow-hard sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center sm:p-5">
                  <div className="min-w-0 flex-1">
                     <div className="flex min-w-0 flex-wrap items-center gap-2">
                       <span className="min-w-0 break-words font-display text-lg font-bold">{s.name}</span>
                       <span className="shrink-0 rounded-full bg-skytint px-2 py-0.5 text-[10px] font-bold uppercase">{s.category}</span>
                    </div>
                    <a href={s.url} target="_blank" rel="noreferrer" className="block truncate text-sm text-ink/60 underline">{s.url}</a>
                    {s.description && <p className="text-sm text-ink/70">{s.description}</p>}
                  </div>
                   <button onClick={() => toggle(s.id, !s.enabled)} className={`w-full rounded-full border-[3px] border-ink px-4 py-1.5 text-sm font-bold sm:w-auto ${s.enabled ? "bg-minttint" : "bg-soft text-ink/50"}`}>
                    {s.enabled ? "Enabled" : "Disabled"}
                  </button>
                   <button onClick={() => remove(s.id)} className="w-full rounded-full border-[3px] border-ink bg-coral px-4 py-1.5 text-sm font-bold text-paper sm:w-auto">Remove</button>
                </li>
              ))}
            </ul>

            </>}
            {tab === "admins" && <AdminManager onChange={refresh} />}
            {tab === "ai" && (

             <section className="mt-12 rounded-[22px] border-[3px] border-ink bg-paper p-4 shadow-hard-lg sm:rounded-[26px] sm:p-6">
              <h2 className="font-display text-2xl font-bold">AI service</h2>
              <p className="mt-1 text-sm text-ink/60">Visitors never see this. API keys stay in protected secrets — only the provider choice is set here.</p>
              {api.data && (
                 <form onSubmit={saveApi} key={api.data.updated_at} className="mt-4 grid min-w-0 gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
                   <label className="min-w-0 text-sm font-bold">Provider
                     <select name="provider" defaultValue={api.data.provider} className="mt-1 block w-full min-w-0 rounded-full border-[3px] border-ink bg-cream px-4 py-2">
                      <option value="grok">Grok (XAI_API_KEY)</option>
                      <option value="openai">OpenAI (OPENAI_API_KEY)</option>
                      <option value="gemini">Gemini (GEMINI_API_KEY)</option>
                     <option value="openrouter">OpenRouter (OPENROUTER_API_KEY)</option>
                     <option value="lovable">Lovable AI (built in, no key needed)</option>
                    </select>
                  </label>
                   <label className="min-w-0 text-sm font-bold">Model (optional)
                     <input name="model" defaultValue={api.data.model ?? ""} placeholder="e.g. meta-llama/llama-3.3-70b-instruct:free" className="mt-1 block w-full min-w-0 rounded-full border-[3px] border-ink bg-cream px-4 py-2" />
                  </label>
                  <button className="rounded-full border-[3px] border-ink bg-mint px-5 py-2.5 font-bold text-paper shadow-hard">Save</button>
                </form>
              )}
            </section>
            )}

            {tab === "audit" && (
            <section className="mt-12">
              <h2 className="font-display text-2xl font-bold">Audit log</h2>
              <p className="mt-1 text-sm text-ink/60">Every change to data sources and AI settings, with who made it and when.</p>
               <div className="mt-4 max-w-full overflow-x-auto rounded-[22px] border-[3px] border-ink bg-paper">
                 <table className="min-w-[760px] w-full text-left text-sm">
                  <thead className="border-b-[3px] border-ink bg-soft">
                    <tr><th className="p-3">When</th><th className="p-3">Who</th><th className="p-3">Action</th><th className="p-3">What</th><th className="p-3">Change</th></tr>
                  </thead>
                  <tbody>
                    {audit.data?.map((a) => <AuditRow key={a.id} a={a} />)}
                    {audit.data?.length === 0 && <tr><td colSpan={5} className="p-4 text-ink/50">No changes recorded yet.</td></tr>}
                  </tbody>
                </table>
              </div>
            </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}

type Stats = {
  total_users: number; active_users: number; new_7d: number; new_30d: number; searches_total: number; searches_7d: number;
  users_with_prefs: number; care_options: number; care_options_review: number;
  top_needs: { label: string; count: number }[]; top_locations: { label: string; count: number }[];
};

function Analytics() {
  const q = useQuery({
    queryKey: ["admin-analytics"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_analytics");
      if (error) throw error;
      return data as unknown as Stats;
    },
  });
  if (q.isLoading) return <p className="mt-8">Loading numbers…</p>;
  if (q.error || !q.data) return <p className="mt-8 font-semibold text-coral">Couldn't load analytics.</p>;
  const d = q.data;
  const cards: [string, number, string][] = [
    ["Registered users", d.total_users, "bg-paper"],
    ["Active users", d.active_users, "bg-minttint"],
    ["Inactive users", d.total_users - d.active_users, "bg-soft"],
    ["New sign-ups (7 days)", d.new_7d, "bg-skytint"],
    ["New sign-ups (30 days)", d.new_30d, "bg-skytint"],
    ["Saved searches", d.searches_total, "bg-paper"],
    ["Searches (7 days)", d.searches_7d, "bg-paper"],
    ["Users with saved preferences", d.users_with_prefs, "bg-paper"],
    ["Care options on file", d.care_options, "bg-minttint"],
    ["Options needing review", d.care_options_review, "bg-soft"],
  ];
  const List = ({ title, rows }: { title: string; rows: { label: string; count: number }[] }) => (
    <div className="rounded-[22px] border-[3px] border-ink bg-paper p-5 shadow-hard">
      <h3 className="font-display text-lg font-bold">{title}</h3>
      {rows.length === 0 ? <p className="mt-2 text-sm text-ink/60">No data yet.</p> : (
        <ol className="mt-2 space-y-1 text-sm">{rows.map((r) => <li key={r.label} className="flex justify-between gap-3"><span className="min-w-0 break-words capitalize">{r.label}</span><span className="font-bold">{r.count}</span></li>)}</ol>
      )}
    </div>
  );
  return (
    <section className="mt-8">
      <p className="text-sm text-ink/60">"Active" means signed in during the last 30 days. Only totals are shown — no names or emails.</p>
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
        {cards.map(([l, n, bg]) => (
          <div key={l} className={`rounded-[18px] border-[3px] border-ink p-4 shadow-hard ${bg}`}>
            <div className="font-display text-3xl font-bold">{n}</div>
            <div className="mt-1 text-xs font-bold text-ink/70">{l}</div>
          </div>
        ))}
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <List title="Most requested needs" rows={d.top_needs} />
        <List title="Most searched locations" rows={d.top_locations} />
      </div>
    </section>
  );
}

function CareOptions() {
  const [area, setArea] = useState("");
  const [type, setType] = useState("");
  const [ins, setIns] = useState("");
  const q = useQuery({
    queryKey: ["care-options-admin"],
    queryFn: async () => {
      const { data, error } = await supabase.from("care_options").select("*, data_sources(name)")
        .order("state").order("city").order("va_vs_community").order("name").limit(2000);
      if (error) throw error;
      return data;
    },
  });
  const rows = (q.data ?? []).filter((r) =>
    (!area || `${r.city ?? ""}, ${r.state ?? ""}`.toLowerCase().includes(area.toLowerCase())) &&
    (!type || r.va_vs_community === type) &&
    (!ins || r.insurance.some((i) => i.includes(ins.toLowerCase()))));
  function exportCsv() {
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const head = ["State", "City", "VA or community", "Insurance", "Name", "Kind", "Phone", "Website", "Source", "Status", "Last validated"];
    const body = rows.map((r) => [r.state, r.city, r.va_vs_community, r.insurance.join("; "), r.name, r.kind, r.phone, r.website, (r.data_sources as { name: string } | null)?.name, r.status, r.last_validated].map(esc).join(","));
    const url = URL.createObjectURL(new Blob([[head.join(","), ...body].join("\n")], { type: "text/csv" }));
    const a = document.createElement("a"); a.href = url; a.download = "care-options.csv"; a.click(); URL.revokeObjectURL(url);
  }
  const inputCls = "min-w-0 rounded-full border-[3px] border-ink bg-cream px-4 py-2 text-sm";
  return (
    <section className="mt-8">
      <p className="text-sm text-ink/60">Verified listings saved from searches, sorted by area, then VA or community care, then insurance. Re-checked against their source every Sunday morning; listings that disappear are flagged for review, then removed.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_1fr_auto]">
        <input placeholder="Area (e.g. Atlanta or GA)" value={area} onChange={(e) => setArea(e.target.value)} className={inputCls} />
        <select value={type} onChange={(e) => setType(e.target.value)} className={inputCls}>
          <option value="">VA & community</option><option value="va">VA</option><option value="community">Community</option>
        </select>
        <input placeholder="Insurance (e.g. tricare)" value={ins} onChange={(e) => setIns(e.target.value)} className={inputCls} />
        <button onClick={exportCsv} disabled={!rows.length} className="rounded-full border-[3px] border-ink bg-mint px-4 py-2 text-sm font-bold text-paper shadow-hard disabled:opacity-60">Export CSV</button>
      </div>
      <p className="mt-3 text-xs font-semibold text-ink/60">{rows.length} options</p>
      <div className="mt-2 max-w-full overflow-x-auto rounded-[22px] border-[3px] border-ink bg-paper">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead className="border-b-[3px] border-ink bg-soft"><tr>
            <th className="p-3">Area</th><th className="p-3">Type</th><th className="p-3">Insurance</th><th className="p-3">Name</th><th className="p-3">Source</th><th className="min-w-[120px] whitespace-nowrap p-3">Status</th><th className="p-3">Last validated</th>
          </tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-ink/15 align-top">
                <td className="p-3 whitespace-nowrap">{r.city}, {r.state}</td>
                <td className="p-3 font-bold uppercase">{r.va_vs_community}</td>
                <td className="p-3">{r.insurance.length ? r.insurance.join(", ") : "Not listed"}</td>
                <td className="p-3"><a href={r.website} target="_blank" rel="noreferrer" className="underline">{r.name}</a>{r.phone && <div className="text-xs text-ink/60">{r.phone}</div>}</td>
                <td className="p-3">{(r.data_sources as { name: string } | null)?.name}</td>
                <td className="min-w-[120px] whitespace-nowrap p-3"><span className={`inline-block whitespace-nowrap rounded-full border-2 border-ink px-2 py-0.5 text-[10px] font-bold uppercase ${r.status === "active" ? "bg-minttint" : "bg-soft"}`}>{r.status.replace("_", " ")}</span></td>
                <td className="p-3 whitespace-nowrap">{r.last_validated}</td>
              </tr>
            ))}
            {!q.isLoading && rows.length === 0 && <tr><td colSpan={7} className="p-4 text-ink/50">No saved options yet — they're added automatically as people search.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function AdminManager({ onChange }: { onChange: () => void }) {
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const admins = useQuery({
    queryKey: ["admins"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_admins");
      if (error) throw error;
      return data;
    },
  });
  const me = useQuery({ queryKey: ["me-id"], queryFn: async () => (await supabase.auth.getUser()).data.user?.id ?? null });
  const reload = () => { qc.invalidateQueries({ queryKey: ["admins"] }); onChange(); };
  async function grant(e: React.FormEvent) {
    e.preventDefault();
    const { data, error } = await supabase.rpc("grant_admin", { _email: email });
    if (error) { toast.error(error.message); return; }
    toast.success(data === "already" ? "That person is already an admin" : "Admin access granted");
    setEmail("");
    reload();
  }
  async function revoke(id: string, em: string | null) {
    if (!confirm(`Remove admin access for ${em ?? "this user"}?`)) return;
    const { error } = await supabase.rpc("revoke_admin", { _user_id: id });
    if (error) { toast.error(error.message); return; }
    toast.success("Admin access removed");
    reload();
  }
  return (
    <section className="mt-12 rounded-[22px] border-[3px] border-ink bg-paper p-4 shadow-hard-lg sm:rounded-[26px] sm:p-6">
      <h2 className="font-display text-2xl font-bold">Admins</h2>
      <p className="mt-1 text-sm text-ink/60">The person must create an account first. Then enter their email to give them admin access.</p>
      <form onSubmit={grant} className="mt-4 grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <input type="email" required placeholder="their@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className="min-w-0 rounded-full border-[3px] border-ink bg-cream px-4 py-2" />
        <button className="rounded-full border-[3px] border-ink bg-mint px-5 py-2.5 font-bold text-paper shadow-hard">Grant admin</button>
      </form>
      <ul className="mt-4 space-y-2">
        {admins.data?.map((a) => (
          <li key={a.user_id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border-[3px] border-ink bg-cream px-4 py-2">
            <span className="min-w-0 break-words font-semibold">{a.email}{a.user_id === me.data && <span className="ml-2 text-xs text-ink/50">(you)</span>}</span>
            {a.user_id !== me.data && (
              <button onClick={() => revoke(a.user_id, a.email)} className="rounded-full border-[3px] border-ink bg-coral px-3 py-1 text-sm font-bold text-paper">Remove</button>
            )}
          </li>
        ))}
      </ul>
      <PasswordReset />
    </section>
  );
}

function PasswordReset() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  async function send(e: React.FormEvent) {
    e.preventDefault();
    const clean = email.trim().toLowerCase();
    setBusy(true);
    const { error: logErr } = await supabase.rpc("log_password_reset", { _email: clean });
    if (logErr) { setBusy(false); toast.error(logErr.message); return; }
    const { error } = await supabase.auth.resetPasswordForEmail(clean, { redirectTo: `${window.location.origin}/reset-password` });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Reset link sent to ${clean}`);
    setEmail("");
  }
  return (
    <div className="mt-8 border-t-[3px] border-ink pt-6">
      <h3 className="font-display text-xl font-bold">Password reset</h3>
      <p className="mt-1 text-sm text-ink/60">Email a user a link to set a new password. You never see or choose their password. Each reset is recorded in the audit log.</p>
      <form onSubmit={send} className="mt-4 grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <input type="email" required maxLength={255} placeholder="user@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className="min-w-0 rounded-full border-[3px] border-ink bg-cream px-4 py-2" />
        <button disabled={busy} className="rounded-full border-[3px] border-ink bg-sun px-5 py-2.5 font-bold shadow-hard disabled:opacity-60">Send reset link</button>
      </form>
    </div>
  );
}

type AuditEntry = { id: number; actor_email: string | null; action: string; entity: string; details: unknown; created_at: string };

function AuditRow({ a }: { a: AuditEntry }) {
  const d = (a.details ?? {}) as { old?: Record<string, unknown>; new?: Record<string, unknown> };
  const rec = d.new ?? d.old ?? {};
  const oldValues = d.old;
  const newValues = d.new;
  const label = a.entity === "api_settings" ? "AI settings" : a.entity === "admin_roles" ? `Admin: ${String(rec["name"] ?? "")}` : a.entity === "password_reset" ? `Password reset sent: ${String(rec["name"] ?? "")}` : String(rec["name"] ?? "Data source");
  const changed =
    oldValues && newValues
      ? Object.keys(newValues)
          .filter((k) => k !== "updated_at" && JSON.stringify(oldValues[k]) !== JSON.stringify(newValues[k]))
          .map((k) => `${k}: ${String(oldValues[k] ?? "—")} → ${String(newValues[k] ?? "—")}`)
          .join("; ")
      : a.action === "insert" ? "added" : "removed";
  return (
    <tr className="border-b border-ink/15 align-top">
      <td className="p-3 whitespace-nowrap">{new Date(a.created_at).toLocaleString()}</td>
      <td className="p-3">{a.actor_email ?? "system"}</td>
      <td className="p-3 font-bold uppercase">{a.action}</td>
      <td className="p-3">{label}</td>
      <td className="p-3 text-ink/70">{changed || "—"}</td>
    </tr>
  );
}
