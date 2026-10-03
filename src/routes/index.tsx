import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { navigate, getProviders, type CareResult, type Variables, type Provider } from "@/lib/navigator.functions";
import { SiteHeader, CrisisBar } from "@/components/SiteHeader";
import { useAccount } from "@/hooks/useAccount";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "VA Navigator — Find Veteran mental-health care" },
      { name: "description", content: "Describe what you need in plain words and get source-linked VA and community care options." },
      { property: "og:title", content: "VA Navigator — Veteran Mental Health Navigator" },
      { property: "og:description", content: "Plain-language search for VA and community mental-health care, with sources shown." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): { h?: string } => (typeof s["h"] === "string" ? { h: s["h"] } : {}),
  component: Home,
});

type Msg = { role: "user" | "assistant"; content: string };

const VAR_LABELS: { key: keyof Variables; icon: string; label: string }[] = [
  { key: "location", icon: "📍", label: "Location" },
  { key: "distance_miles", icon: "📏", label: "Distance" },
  { key: "care_format", icon: "📡", label: "Format" },
  { key: "care_type", icon: "🗂️", label: "Care type" },
  { key: "need", icon: "🩺", label: "Need" },
  { key: "payment", icon: "💳", label: "Payment" },
  { key: "va_vs_community", icon: "🏥", label: "VA / community" },
];

const KIND_TINT: Record<string, string> = { "VA facility": "bg-minttint", "Vet Center": "bg-minttint" };

function Home() {
  const run = useServerFn(navigate);
  const { user, prefs, savePrefs } = useAccount();
  const [focused, setFocused] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "Hi, I'm here to help you find care. Tell me what's going on and where you are — in your own words." },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [vars, setVars] = useState<Variables | null>(null);
  const [results, setResults] = useState<CareResult[] | null>(null);
  const [crisis, setCrisis] = useState(false);
  const [danger, setDanger] = useState<"self" | "others" | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const loadProviders = useServerFn(getProviders);
  const [openRes, setOpenRes] = useState<string | null>(null);
  const [providers, setProviders] = useState<Provider[] | null>(null);
  async function toggleProviders(id: string) {
    if (openRes === id) { setOpenRes(null); return; }
    setOpenRes(id);
    setProviders(null);
    try { setProviders(await loadProviders({ data: { resourceId: id, payment: vars?.payment ?? null } })); }
    catch { setProviders([]); toast.error("Couldn't load providers."); }
  }
  const endRef = useRef<HTMLDivElement>(null);
  const hasRenderedMessages = useRef(false);
  useEffect(() => {
    if (!hasRenderedMessages.current) {
      hasRenderedMessages.current = true;
      return;
    }
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [messages]);
  const { h } = Route.useSearch();
  useEffect(() => {
    if (!h || !user) return;
    supabase.from("search_history").select("*").eq("id", h).maybeSingle().then(({ data }) => {
      if (!data) return;
      setMessages(data.messages as Msg[]);
      setVars(data.variables as Variables);
      setResults(data.results as CareResult[]);
    });
  }, [h, user]);

  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const out = await run({ data: { messages: next.slice(1), prefs: prefs ?? undefined } });
      setMessages([...next, { role: "assistant", content: out.reply }]);
      setVars(out.variables);
      setResults(out.results);
      setCrisis(out.crisis);
      setDanger(out.danger);
      if (out.crisis) window.scrollTo({ top: 0, behavior: "smooth" });
      setNote(out.connectorError ?? out.aiNote);
      // Stay enlarged until we have suitable results (or a crisis needs the full page).
      if (out.crisis || (!out.needsMore && out.results.length > 0)) setFocused(false);
      if (user) {
        await supabase.from("search_history").insert({
          user_id: user.id,
          question: text,
          reply: out.reply,
          messages: [...next, { role: "assistant", content: out.reply }],
          variables: out.variables,
          results: out.results,
        });
      }
    } catch {
      setMessages([...next, { role: "assistant", content: "Sorry — something went wrong. Please try again." }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-cream text-ink">
      <SiteHeader />

      {crisis && (
        <div role="alert" className="border-b-[3px] border-ink bg-coral px-4 py-5 text-paper sm:px-6">
          <div className="mx-auto max-w-4xl">
            <p className="font-display text-xl font-bold">You don't have to go through this alone — help is available right now, 24/7.</p>
            <div className="mt-3 grid gap-2 text-sm font-bold sm:grid-cols-3">
              <a href="tel:988" className="rounded-2xl border-[3px] border-ink bg-paper px-4 py-3 text-ink shadow-hard">📞 Veterans Crisis Line<br />Call 988, then press 1</a>
              <a href="sms:838255" className="rounded-2xl border-[3px] border-ink bg-paper px-4 py-3 text-ink shadow-hard">💬 Text the Crisis Line<br />838255</a>
              <a href="tel:911" className="rounded-2xl border-[3px] border-ink bg-paper px-4 py-3 text-ink shadow-hard">🚨 Emergency Services<br />Call 911 {danger === "others" ? "if anyone is in danger" : "if you're in immediate danger"}</a>
            </div>
            <p className="mt-3 text-sm font-semibold">Your closest care matches are listed below too.</p>
          </div>
        </div>
      )}

      <section className="mx-auto max-w-6xl px-4 pt-8 pb-12 sm:px-6 sm:pt-12 sm:pb-16">
        <div className="grid items-start gap-8 lg:grid-cols-[1.05fr_1fr] lg:gap-10">
          <div className="min-w-0">
            <span className="inline-block rounded-full border-[3px] border-ink bg-skytint px-4 py-1.5 text-xs font-bold uppercase tracking-[0.12em]">Confidential · 24/7 · Free</span>
            <h1 className="mt-5 font-display text-4xl font-bold leading-[0.95] sm:text-5xl md:text-6xl">
              Tell us what you need.<br /><span className="text-coral">We'll find your care.</span>
            </h1>
            <p className="mt-5 max-w-md text-lg leading-relaxed text-ink/70">
              Describe your situation in plain words. We turn it into a clear search — then show you real, source-linked options near you.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <span className="rounded-full border-[3px] border-ink bg-minttint px-4 py-2 text-sm font-semibold">📍 Location &amp; distance</span>
              <span className="rounded-full border-[3px] border-ink bg-skytint px-4 py-2 text-sm font-semibold">💳 Insurance</span>
              <span className="rounded-full border-[3px] border-ink bg-plumtint px-4 py-2 text-sm font-semibold">🏥 VA vs community</span>
              <span className="rounded-full border-[3px] border-ink bg-soft px-4 py-2 text-sm font-semibold">🔗 Provenance</span>
            </div>
            <p className="mt-8 max-w-md text-xs font-semibold text-ink/50">
              VA Navigator helps you find care. It does not diagnose, treat, or decide eligibility.
            </p>
          </div>

          <div id="chat" className="min-w-0 rounded-[22px] border-[3px] border-ink bg-paper shadow-hard-lg sm:rounded-[30px] sm:shadow-[8px_8px_0_var(--ink)]">
            <div className="flex items-center gap-3 border-b-[3px] border-ink px-4 py-4 sm:px-6">
              <span className="grid h-10 w-10 place-items-center rounded-full border-[3px] border-ink bg-coral text-lg font-bold text-paper">N</span>
              <div>
                <div className="font-display text-lg font-bold leading-none">Navigator</div>
                <div className="text-xs font-semibold text-mint">● online</div>
              </div>
            </div>
            <div className="max-h-[min(420px,55dvh)] space-y-4 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6" aria-live="polite">
              {messages.map((m, i) =>
                m.role === "user" ? (
                  <div key={i} className="ml-auto max-w-[85%] rounded-[22px] rounded-br-md border-[3px] border-ink bg-sky px-4 py-3 text-[15px] font-medium text-paper shadow-hard">{m.content}</div>
                ) : (
                  <div key={i} className="max-w-[88%] rounded-[22px] rounded-bl-md border-[3px] border-ink bg-soft px-4 py-3 text-[15px] font-medium shadow-hard">
                    {m.content}
                    {i === messages.length - 1 && vars && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {VAR_LABELS.map(({ key, icon, label }) =>
                          vars[key] != null ? (
                            <span key={key} className="rounded-full border-2 border-ink bg-paper px-3 py-1 text-xs font-bold">
                              {icon} {String(vars[key])}{key === "distance_miles" ? " mi" : ""}
                            </span>
                          ) : (
                            <span key={key} className="rounded-full border-2 border-dashed border-ink/40 px-3 py-1 text-xs font-semibold text-ink/45">{label}: not set</span>
                          ),
                        )}
                      </div>
                    )}
                  </div>
                ),
              )}
              {busy && <div className="w-fit rounded-[22px] border-[3px] border-ink bg-soft px-4 py-3 text-sm font-semibold">Searching sources…</div>}
              <div ref={endRef} />
            </div>
            <form onSubmit={send} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-t-[3px] border-ink px-4 py-4 sm:gap-3 sm:px-6">
              <label htmlFor="msg" className="sr-only">Describe your situation</label>
              <input
                id="msg"
                value={input}
                readOnly
                onFocus={() => setFocused(true)}
                onClick={() => setFocused(true)}
                placeholder="Type your situation…"
                className="min-w-0 cursor-text rounded-full border-[3px] border-ink bg-cream px-4 py-2.5 text-sm placeholder:text-ink/45 focus:outline-none"
              />
               <button disabled={busy} className="shrink-0 rounded-full border-[3px] border-ink bg-mint px-4 py-2.5 text-sm font-bold text-paper shadow-hard disabled:opacity-60 sm:px-5">Send →</button>
            </form>
          </div>
        </div>
      </section>

      <section className="border-t-[3px] border-ink bg-soft">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            <h2 className="min-w-0 font-display text-3xl font-bold sm:text-4xl">
              {results === null ? "Your care options will appear here" : results.length ? `${results.length} care options, ranked for you` : "No matches yet"}
            </h2>
            <div className="flex min-w-0 flex-wrap items-center gap-3 md:justify-end">
              {note && <span className="text-sm font-semibold text-ink/50">{note}</span>}
              {vars && (user ? (
                <button
                  onClick={async () => {
                    try {
                      const { urgency: _u, ...keep } = vars;
                      await savePrefs({ ...(prefs ?? {}), ...keep });
                      toast.success("Saved — we'll use these next time.");
                    } catch { toast.error("Couldn't save preferences."); }
                  }}
                  className="rounded-full border-[3px] border-ink bg-sun px-4 py-1.5 text-sm font-bold shadow-hard"
                >⭐ Save as my preferences</button>
              ) : (
                <Link to="/auth" className="rounded-full border-[3px] border-ink px-4 py-1.5 text-sm font-bold">Sign in to save preferences</Link>
              ))}
            </div>
          </div>
          {results && results.length > 0 && (
             <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {results.map((r) => (
                <article key={r.id} className="flex flex-col rounded-[26px] border-[3px] border-ink bg-paper shadow-hard-lg">
                  <div className="border-b-[3px] border-ink p-5">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${KIND_TINT[r.kind] ?? "bg-plumtint"}`}>{r.kind}</span>
                      <span className={`rounded-full border-2 border-ink px-2 py-0.5 text-[10px] font-bold uppercase ${r.verified ? "bg-minttint" : "bg-soft"}`}>
                        {r.verified ? "Verified" : "Unverified"}
                      </span>
                    </div>
                    <h3 className="mt-3 font-display text-xl font-bold leading-tight">{r.name}</h3>
                  </div>
                  <div className="flex-1 space-y-2 p-5 text-sm font-medium text-ink/75">
                    <p>📍 {r.city}, {r.state} · {r.formats.join(" & ")}</p>
                    <p>🩺 {r.needs.join(", ")} · {r.care_types.join(", ")}</p>
                    <p>💳 {r.payment.join(", ")}</p>
                    {r.veteran_focus && <p>🎖️ Veteran-experienced (per source)</p>}
                    {r.phone && <p>📞 <a className="underline" href={`tel:${r.phone}`}>{r.phone}</a></p>}
                  </div>
                  {!r.kind.includes("VA") && r.kind !== "Vet Center" && (
                    <div className="border-t-[3px] border-ink p-5">
                      <button onClick={() => void toggleProviders(r.id)} className="w-full rounded-full border-[3px] border-ink bg-sun px-4 py-2 text-sm font-bold shadow-hard">
                        {openRes === r.id ? "Hide providers" : "👥 See providers"}
                      </button>
                      {openRes === r.id && (
                        <div className="mt-4 space-y-3">
                          {providers === null && <p className="text-sm text-ink/60">Loading providers…</p>}
                          {providers?.length === 0 && <p className="text-sm text-ink/60">No individual providers listed yet.</p>}
                          {providers?.map((p) => (
                            <div key={p.id} className="rounded-2xl border-2 border-ink bg-cream p-3 text-sm">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="font-bold">{p.name}{p.credentials ? `, ${p.credentials}` : ""}</span>
                                {p.matches && <span className="rounded-full border-2 border-ink bg-minttint px-2 py-0.5 text-[10px] font-bold uppercase">Takes your insurance</span>}
                              </div>
                              <p className="mt-1 text-xs font-semibold text-ink/70">💳 {p.insurance.join(", ")}</p>
                              {p.bio && <p className="mt-2 text-ink/80">{p.bio}</p>}
                              <a href={p.source_url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs font-bold underline">Source ↗</a>
                              {p.is_sample && <span className="ml-2 text-[10px] font-semibold text-ink/50">Sample listing</span>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  <div className="border-t-[3px] border-ink p-5">
                    <a href={r.source_url} target="_blank" rel="noreferrer" className="block rounded-full bg-navy px-4 py-2.5 text-center text-sm font-bold text-cream shadow-hard">View original source ↗</a>
                    <div className="mt-3 flex items-center justify-between text-[11px] font-semibold text-ink/50">
                      <span>🔗 {r.source_name}</span>
                      <span>checked {r.last_checked}</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {focused && (
        <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-ink/60 p-3 backdrop-blur-sm sm:p-6" onClick={() => setFocused(false)}>
          <form
            onSubmit={send}
            onClick={(e) => e.stopPropagation()}
            className="my-auto max-h-[calc(100dvh-1.5rem)] w-full max-w-3xl overflow-y-auto rounded-[22px] border-[3px] border-ink bg-paper p-4 shadow-hard-lg animate-in zoom-in-95 fade-in duration-200 sm:max-h-[calc(100dvh-3rem)] sm:rounded-[30px] sm:p-6 sm:shadow-[10px_10px_0_var(--ink)]"
          >
            <label htmlFor="msg-big" className="font-display text-xl font-bold sm:text-2xl">Tell us what's going on</label>
            <p className="mt-1 text-sm text-ink/60">Where you are, what you need, how you'd like to be seen. Press Enter to send, Shift+Enter for a new line, Esc to close.</p>
            <div className="mt-4 max-h-64 space-y-2 overflow-y-auto">
              {messages.slice(-6).map((m, i) => (
                <p key={i} className={m.role === "user" ? "ml-auto w-fit max-w-[85%] rounded-2xl bg-ink px-4 py-2 text-sm text-paper" : "w-fit max-w-[85%] text-sm text-ink"}>{m.content}</p>
              ))}
              {busy && <p className="text-sm text-ink/50">Thinking…</p>}
            </div>
            <textarea
              id="msg-big"
              key={messages.length}
              autoFocus
              rows={5}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setFocused(false);
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); }
              }}
              placeholder="e.g. I'm a veteran in Atlanta, GA dealing with PTSD. I'd prefer telehealth and have Tricare."
              className="mt-4 w-full resize-none rounded-[18px] border-[3px] border-ink bg-cream p-4 text-base leading-relaxed placeholder:text-ink/40 focus:outline-none sm:rounded-[22px] sm:p-5 sm:text-lg"
            />
            <div className="mt-4 grid grid-cols-2 gap-3 sm:flex sm:justify-end">
              <button type="button" onClick={() => setFocused(false)} className="rounded-full border-[3px] border-ink px-5 py-2.5 text-sm font-bold">Close</button>
              <button disabled={busy || !input.trim()} className="rounded-full border-[3px] border-ink bg-mint px-6 py-2.5 text-sm font-bold text-paper shadow-hard disabled:opacity-60">Send →</button>
            </div>
          </form>
        </div>
      )}

      <CrisisBar />
       <footer className="mx-auto max-w-6xl px-4 py-8 text-center text-xs font-semibold text-ink/40 sm:px-6">
        Every option links to its source and verification date. Nothing here is a substitute for emergency care.
      </footer>
    </div>
  );
}
