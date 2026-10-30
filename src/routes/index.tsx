import type { TerritoryHelp } from "@/lib/territory-guidance";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { navigate, getProviders, type VaStatus, type CareResult, type Variables, type Provider } from "@/lib/navigator.functions";
import { SiteHeader, CrisisBar } from "@/components/SiteHeader";
import { useAccount } from "@/hooks/useAccount";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { ProviderMatcher } from "@/components/ProviderMatcher";
import { VA_GUIDE_CHECKED, guideFor, type VaStage } from "@/lib/va-guide";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "VA Navigator | Find Veteran mental-health care" },
      { name: "description", content: "Describe what you need in plain words and get source-linked VA and community care options." },
      { property: "og:title", content: "VA Navigator | Veteran Mental Health Navigator" },
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
const VA_LABELS: { key: keyof Variables; label: string }[] = [
  { key: "va_applied", label: "Applied for VA care" },
  { key: "va_registered", label: "Registered VA patient" },
  { key: "va_facility", label: "VA facility" },
];
const YES_RE = /^\s*(yes|yeah|yep|yup|sure|ok|okay|please|show|ready|go ahead)\b|show (me )?(my )?results/i;
const NO_RE = /^\s*(no|nope|nah|not yet|wait|hold on)\b/i;
type NavOut = Awaited<ReturnType<typeof navigate>>;

const KIND_TINT: Record<string, string> = { "VA facility": "bg-minttint", "Vet Center": "bg-minttint" };

function Home() {
  const run = useServerFn(navigate);
  const { user, prefs, savePrefs } = useAccount();
  const [focused, setFocused] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "Hi, I'm here to help you find care. Tell me what's going on and where you are, in your own words." },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [vars, setVars] = useState<Variables | null>(null);
  const [results, setResults] = useState<CareResult[] | null>(null);
  const [crisis, setCrisis] = useState(false);
  const [danger, setDanger] = useState<"self" | "others" | null>(null);
  const [vaGuide, setVaGuide] = useState(false);
  const [vaStage, setVaStage] = useState<VaStage | null>(null);
  const [facilityUnknown, setFacilityUnknown] = useState(false);
  const [myFacility, setMyFacility] = useState<NavOut["myFacility"]>(null);
  const [pending, setPending] = useState<NavOut | null>(null);
  const [quiz, setQuiz] = useState<Record<string, string>>({});
  useEffect(() => { try { setQuiz(JSON.parse(sessionStorage.getItem("van_quiz") ?? "{}")); } catch { /* none */ } }, []);
  const [tHelp, setTHelp] = useState<TerritoryHelp | null>(null);
  const [vaStatus, setVaStatus] = useState<VaStatus>(null);
  const [vaCheckedAt, setVaCheckedAt] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [privateMode, setPrivateMode] = useState(false);
  useEffect(() => { setPrivateMode(localStorage.getItem("van_private") === "1"); }, []);
  function setPrivate(v: boolean) { setPrivateMode(v); localStorage.setItem("van_private", v ? "1" : "0"); }
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

  function showResults(out: NavOut) {
    setResults(out.results);
    setCrisis(out.crisis);
    setDanger(out.danger);
    setVaGuide(out.vaGuide);
    setVaStage((out.vaStage ?? null) as VaStage | null);
    setFacilityUnknown(!!out.facilityUnknown);
    setMyFacility(out.myFacility ?? null);
    setVaStatus(out.vaStatus);
    setTHelp(out.territoryHelp ?? null);
    setVaCheckedAt(out.vaCheckedAt);
    setPending(null);
    setFocused(false);
  }

  function reveal() {
    if (!pending) return;
    setMessages((m) => [...m, { role: "assistant", content: "Here are your results. You can keep chatting anytime to change your search." }]);
    showResults(pending);
  }

  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    // Answering "Would you like to see your results now?"
    if (pending && YES_RE.test(text)) {
      setMessages([...next, { role: "assistant", content: "Here are your results. You can keep chatting anytime to change your search." }]);
      showResults(pending);
      return;
    }
    if (pending && NO_RE.test(text) && text.split(/\s+/).length <= 3) {
      setMessages([...next, { role: "assistant", content: "Okay, is there anything else I can help with? Just say \"show results\" whenever you're ready." }]);
      return;
    }
    setBusy(true);
    try {
      const out = await run({ data: { messages: next.slice(1), prefs: { ...(prefs ?? {}), ...quiz } } });
      // Corrected their VA facility after seeing results: refresh the results right away, no extra question.
      const newFac = out.variables.va_facility;
      const facilityFixed = results !== null && !out.needsMore && !out.crisis && !!newFac && newFac !== "unknown" && newFac !== vars?.va_facility;
      if (facilityFixed) {
        out.reply = out.reply.replace(/\s*I have some options ready\. Would you like to see your results now\?\s*$/, "").trim()
          + `\n\nI've updated your results with ${out.myFacility?.found ? out.myFacility.name : newFac} as your VA facility.`;
      }
      setMessages([...next, { role: "assistant", content: out.reply }]);
      // Switched between VA and community: drop results of the other kind right away.
      if (vars?.va_vs_community && out.variables.va_vs_community && vars.va_vs_community !== out.variables.va_vs_community) {
        setResults(null); setVaGuide(false); setTHelp(null);
      }
      setVars(out.variables);
      setNote(out.connectorError ?? out.aiNote);
      if (out.crisis) { showResults(out); window.scrollTo({ top: 0, behavior: "smooth" }); }
      else if (facilityFixed) showResults(out);
      else setPending(out.readyToShow ? out : null);
      if (user && !privateMode) {
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
      setMessages([...next, { role: "assistant", content: "Sorry, something went wrong. Please try again." }]);
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
            <p className="font-display text-xl font-bold">
              {danger === "others"
                ? "Life is precious, and everyone's safety, including yours, is the priority right now."
                : "Your life is precious, and your safety is the priority right now."}
            </p>
            <p className="mt-1 font-semibold">You don't have to go through this alone, please reach out to one of these right now. They're free, confidential and open 24/7.</p>
            <div className="mt-3 grid gap-2 text-sm font-bold sm:grid-cols-2 lg:grid-cols-3">
              <a href="tel:988" className="rounded-2xl border-[3px] border-ink bg-paper px-4 py-3 text-ink shadow-hard">📞 Veterans Crisis Line<br />Call 988, then press 1</a>
              <a href="sms:838255" className="rounded-2xl border-[3px] border-ink bg-paper px-4 py-3 text-ink shadow-hard">💬 Text the Veterans Crisis Line<br />838255</a>
              <a href="https://www.veteranscrisisline.net/get-help-now/chat/" target="_blank" rel="noreferrer" className="rounded-2xl border-[3px] border-ink bg-paper px-4 py-3 text-ink shadow-hard">🖥️ Veterans Crisis Line chat<br />Chat online now</a>
              <a href="tel:988" className="rounded-2xl border-[3px] border-ink bg-paper px-4 py-3 text-ink shadow-hard">☎️ 988 Suicide &amp; Crisis Lifeline<br />Call or text 988</a>
              <a href="sms:741741?&body=HOME" className="rounded-2xl border-[3px] border-ink bg-paper px-4 py-3 text-ink shadow-hard">✉️ Crisis Text Line<br />Text HOME to 741741</a>
              <a href="tel:911" className="rounded-2xl border-[3px] border-ink bg-paper px-4 py-3 text-ink shadow-hard">🚨 Emergency Services<br />Call 911 or go to the nearest ER{danger === "others" ? " if anyone is in danger" : ""}</a>
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
              Describe your situation in plain words. We turn it into a clear search, then show you real, source-linked options near you.
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
                  <div key={i} className="max-w-[88%] whitespace-pre-line rounded-[22px] rounded-bl-md border-[3px] border-ink bg-soft px-4 py-3 text-[15px] font-medium shadow-hard">
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
                        {VA_LABELS.map(({ key, label }) => vars[key] ? (
                          <span key={key} className="rounded-full border-2 border-ink bg-minttint px-3 py-1 text-xs font-bold">{label}: {String(vars[key])}</span>
                        ) : null)}
                      </div>
                    )}
                  </div>
                ),
              )}
              {pending && !busy && (
                <button type="button" onClick={reveal} className="rounded-full border-[3px] border-ink bg-sun px-4 py-2 text-sm font-bold shadow-hard">👀 Show my results</button>
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
            {user && (
              <label className="flex cursor-pointer items-center gap-2 px-4 py-3 text-sm font-semibold sm:px-6">
                <input type="checkbox" checked={privateMode} onChange={(e) => setPrivate(e.target.checked)} className="h-4 w-4 accent-current" />
                🕶️ Private search, don't save to my history
              </label>
            )}
            <p className="px-4 pb-4 text-sm font-semibold sm:px-6">
              {Object.keys(quiz).length ? "✅ Using your quick-question answers. " : "Want fewer questions? "}
              <Link to="/questionnaire" className="underline">{Object.keys(quiz).length ? "Edit answers" : "Answer a few quick questions first"}</Link>
            </p>
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
                      toast.success("Saved, we'll use these next time.");
                    } catch { toast.error("Couldn't save preferences."); }
                  }}
                  className="rounded-full border-[3px] border-ink bg-sun px-4 py-1.5 text-sm font-bold shadow-hard"
                >⭐ Save as my preferences</button>
              ) : (
                <Link to="/auth" className="rounded-full border-[3px] border-ink px-4 py-1.5 text-sm font-bold">Sign in to save preferences</Link>
              ))}
            </div>
          </div>
          {myFacility && (
            <section aria-label="Your VA facility" className="mt-8 rounded-[26px] border-[3px] border-ink bg-minttint p-5 shadow-hard-lg sm:p-7">
              <p className="text-xs font-bold uppercase tracking-wide text-ink/60">Your VA facility</p>
              <h3 className="mt-1 font-display text-2xl font-bold">{myFacility.name}</h3>
              {myFacility.found ? (
                <div className="mt-2 space-y-1 text-sm">
                  {myFacility.address && <p>📍 {myFacility.address}</p>}
                  {myFacility.phone && <p>📞 <a className="font-semibold underline" href={`tel:${myFacility.phone}`}>{myFacility.phone}</a></p>}
                  {myFacility.url && <p><a className="font-bold underline" href={myFacility.url} target="_blank" rel="noreferrer">Official VA.gov page ↗</a></p>}
                </div>
              ) : (
                <p className="mt-2 text-sm text-ink/75">We couldn't match this name to a VA.gov listing near you, so we can't show its address or phone yet. Try the full name, or tell us the city it's in.</p>
              )}
              <button
                type="button"
                onClick={() => { setInput("My VA facility is actually "); setFocused(true); }}
                className="mt-4 rounded-full border-[3px] border-ink bg-paper px-4 py-1.5 text-sm font-bold shadow-hard"
              >✏️ Not my facility? Change it</button>
            </section>
          )}
          {vaGuide && (
            <section aria-label="VA care step-by-step guide" className="mt-8 rounded-[26px] border-[3px] border-ink bg-paper p-5 shadow-hard-lg sm:p-7">
              <h3 className="font-display text-2xl font-bold">🇺🇸 Your step-by-step guide to VA care</h3>
              <p className="mt-1 text-sm text-ink/65">{vaStage === "registered" ? "Since you're already a VA patient, we skipped the application steps. " : vaStage === "applied" ? "Since you've already applied, we skipped the application step. " : ""}Every step comes from official VA.gov pages. Tap a link to read the full details.</p>
              <ol className="mt-5 space-y-4">
                {guideFor(vaStage, facilityUnknown).map((s, i) => (
                  <li key={s.title} className="grid grid-cols-[auto_minmax(0,1fr)] gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full border-[3px] border-ink bg-sun font-bold">{i + 1}</span>
                    <div className="min-w-0">
                      <p className="font-bold">{s.title}</p>
                      <p className="mt-1 text-sm text-ink/75">{s.detail}</p>
                      <p className="mt-2 rounded-xl border-2 border-ink/20 bg-cream px-3 py-2 text-xs text-ink/70">
                        <span className="font-bold text-ink">Source:</span>{" "}
                        <a href={s.url} target="_blank" rel="noreferrer" className="break-all font-bold underline">{s.linkLabel}, {s.url.replace("https://www.", "")} ↗</a>
                        <span className="block sm:inline sm:before:content-['_·_']">Last verified {new Date(s.checked + "T12:00:00").toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}</span>
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
              <VaAvailability status={vaStatus} checkedAt={vaCheckedAt} location={vars?.location ?? null}
                vaResults={(results ?? []).filter((r) => r.kind.includes("VA") || r.kind === "Vet Center")} />
              <p className="mt-4 text-xs font-semibold text-ink/55">Source: VA.gov, checked {new Date(VA_GUIDE_CHECKED + "T12:00:00").toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}</p>
            </section>
          )}
          {tHelp && (
            <section className="mt-8 rounded-2xl border-2 border-ink bg-card p-5">
              <h2 className="font-display text-xl font-bold">Next steps for {tHelp.area}</h2>
              <p className="mt-1 text-sm text-ink/70">We couldn't find listed providers here yet. These official services serve the area:</p>
              <ul className="mt-3 space-y-2 text-sm">
                {tHelp.steps.map((s) => (
                  <li key={s.text} className="flex flex-wrap gap-x-2">
                    <span>• {s.text}</span>
                    {s.phone && <a className="font-semibold underline" href={`tel:${s.phone}`}>{s.phone}</a>}
                    {s.url && <a className="underline text-ink/70" href={s.url} target="_blank" rel="noreferrer">Official page</a>}
                  </li>
                ))}
              </ul>
            </section>
          )}
          {results && results.length > 0 && (
             <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {results.map((r) => (
                <article key={r.id} className="flex flex-col rounded-[26px] border-[3px] border-ink bg-paper shadow-hard-lg">
                  <div className="border-b-[3px] border-ink p-5">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${KIND_TINT[r.kind] ?? "bg-plumtint"}`}>{r.kind}</span>
                      <span className="flex flex-wrap justify-end gap-1">
                        {r.freshness && <FreshnessBadge freshness={r.freshness} lastChecked={r.last_checked} />}
                        <span className={`rounded-full border-2 border-ink px-2 py-0.5 text-[10px] font-bold uppercase ${r.verified ? "bg-minttint" : "bg-soft"}`}>
                          {r.verified ? "Verified" : "Unverified"}
                        </span>
                      </span>
                    </div>
                    <h3 className="mt-3 font-display text-xl font-bold leading-tight">{r.name}</h3>
                  </div>
                  <div className="flex-1 space-y-2 p-5 text-sm font-medium text-ink/75">
                    <p>📍 {r.city}, {r.state}{r.distance_miles != null && <strong> · {r.distance_miles.toFixed(1)} miles away</strong>} · {r.formats.join(" & ")}</p>
                    {r.review !== undefined && r.freshness === "saved" && (
                      <p className={`rounded-xl border-2 border-ink px-2 py-1 text-xs font-bold ${r.review ? "bg-sun" : "bg-minttint"}`}>
                        Last verified on VA.gov: {fmtDay(r.last_checked)} · {r.review === "page_missing" ? "⚠️ VA.gov page needs review, call to confirm" : r.review === "contact_changed" ? "⚠️ Contact details recently changed on VA.gov, review" : "✅ Page and contact details verified"}
                      </p>
                    )}
                    <p>🩺 {r.needs.join(", ")} · {r.care_types.join(", ")}</p>
                    <p>💳 {r.payment.length ? r.payment.join(", ") : "Insurance not listed by the source"}</p>
                    {r.veteran_focus && <p>🎖️ Veteran-experienced (per source)</p>}
                    {r.bio && <p className="text-ink/65">📝 {r.bio}</p>}
                    {r.phone && <p>📞 <a className="underline" href={`tel:${r.phone}`}>{r.phone}</a></p>}
                  </div>
                  {r.payment.length === 0 && (
                    <div className="border-t-[3px] border-ink bg-sun/20 p-5 text-sm">
                      <p className="font-bold">✅ How to confirm your insurance</p>
                      <ol className="mt-2 list-decimal space-y-1 pl-5 text-ink/80">
                        <li>Call {r.phone ? <a className="font-bold underline" href={`tel:${r.phone}`}>{r.phone}</a> : "the office"} and ask: “Are you in-network for my plan?” Have your member ID ready.</li>
                        <li>Call the member-services number on the back of your insurance card, or use your plan’s online provider search.</li>
                        <li>TRICARE: check <a className="font-bold underline" href="https://tricare.mil/FindDoctor" target="_blank" rel="noreferrer">tricare.mil/FindDoctor</a>. VA Community Care: ask the VA to confirm the provider is in the network.</li>
                      </ol>
                      {r.source_url.includes("npiregistry") && (
                        <a className="mt-3 block rounded-full border-[3px] border-ink bg-paper px-4 py-2 text-center text-xs font-bold shadow-hard" target="_blank" rel="noreferrer"
                          href={`https://www.google.com/search?q=${encodeURIComponent(`${r.name} ${r.city ?? ""} ${r.state ?? ""} insurance accepted`)}`}>
                          🔎 Look up this clinician’s practice ↗
                        </a>
                      )}
                    </div>
                  )}
                  <div className="border-t-[3px] border-ink p-5">
                    <a href={r.source_url} target="_blank" rel="noreferrer" className="block rounded-full bg-navy px-4 py-2.5 text-center text-sm font-bold text-cream shadow-hard">View original source ↗</a>
                    <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-[11px] font-semibold text-ink/60">
                      <dt>Verified by:</dt><dd className="text-ink">{r.source_name}</dd>
                      <dt>Last checked:</dt><dd className="text-ink">{new Date(r.last_checked + "T12:00:00").toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}</dd>
                    </dl>
                  </div>
                </article>
              ))}
            </div>
          )}
          {results && results.some((r) => !r.kind.includes("VA") && r.kind !== "Vet Center") && (
            <ProviderMatcher
              candidates={results.filter((r) => !r.kind.includes("VA") && r.kind !== "Vet Center")}
              payment={vars?.payment ?? null}
            />
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
              {pending && !busy && (
                <button type="button" onClick={reveal} className="col-span-2 rounded-full border-[3px] border-ink bg-sun px-5 py-2.5 text-sm font-bold shadow-hard">👀 Show my results</button>
              )}
              <button type="button" onClick={() => setFocused(false)} className="rounded-full border-[3px] border-ink px-5 py-2.5 text-sm font-bold">Close</button>
              <button disabled={busy || !input.trim()} className="rounded-full border-[3px] border-ink bg-mint px-6 py-2.5 text-sm font-bold text-paper shadow-hard disabled:opacity-60">Send →</button>
            </div>
          </form>
        </div>
      )}

      <CrisisBar />
       <footer className="mx-auto max-w-6xl px-4 py-8 text-center text-xs font-semibold text-ink/40 sm:px-6">
        Every option links to its source and verification date. Nothing here is a substitute for emergency care. <Link to="/security" className="underline">How we store and protect your data</Link>
      </footer>
    </div>
  );
}

const fmtDay = (d: string) => new Date(d.length === 10 ? d + "T12:00:00" : d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
/** Days since a listing was last verified (date-only or ISO string). */
function ageDays(d: string) { return Math.floor((Date.now() - new Date(d.length === 10 ? d + "T12:00:00" : d).getTime()) / 86400000); }

function FreshnessBadge({ freshness, lastChecked }: { freshness: "live" | "saved"; lastChecked: string }) {
  if (freshness === "live") return <span className="rounded-full border-2 border-ink bg-minttint px-2 py-0.5 text-[10px] font-bold uppercase">Live · checked today</span>;
  const old = ageDays(lastChecked) > 7;
  return (
    <span className={`rounded-full border-2 border-ink px-2 py-0.5 text-[10px] font-bold uppercase ${old ? "bg-sun" : "bg-soft"}`}>
      {old ? "May be out of date" : "Saved"} · {fmtDay(lastChecked)}
    </span>
  );
}

function VaAvailability({ status, checkedAt, location, vaResults }: { status: VaStatus; checkedAt: string | null; location: string | null; vaResults: CareResult[] }) {
  const live = vaResults.filter((r) => r.freshness === "live").length;
  const saved = vaResults.filter((r) => r.freshness === "saved");
  const oldest = saved.map((r) => r.last_checked).sort()[0];
  const locator = `https://www.va.gov/find-locations/?address=${encodeURIComponent(location ?? "")}&facilityType=health`;
  const time = checkedAt ? new Date(checkedAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "";
  const ok = status === "live" || (status === "directory" && saved.length > 0);
  const msg = status === "live"
    ? live ? `Live VA facility data: ${live} result${live === 1 ? "" : "s"} confirmed with VA just now (${time}).` : `VA's facility service answered at ${time} but found no VA locations near ${location ?? "you"}.`
    : status === "unavailable" ? "The live VA facility service isn't responding right now, so we couldn't confirm nearby VA locations."
    : saved.length ? `Official VA.gov directory active: ${saved.length} VA location${saved.length === 1 ? "" : "s"} near ${location ?? "you"}, each checked against its VA.gov page every Sunday.`
    : `Official VA.gov directory active. We don't have verified VA locations saved for ${location ?? "your area"} yet, so use VA.gov's locator below.`;
  return (
    <div role="status" aria-label="VA facility availability" className={`mt-6 rounded-2xl border-[3px] border-ink p-4 text-sm ${ok ? "bg-minttint" : "bg-sun/30"}`}>
      <p className="font-bold">{ok ? "🟢" : "🟠"} {msg}</p>
      {saved.length > 0 && <p className="mt-1 text-ink/75">{saved.length} VA listing{saved.length === 1 ? "" : "s"} from VA.gov, last verified {oldest ? fmtDay(oldest) : "recently"}. Call before you go to confirm hours and services.</p>}
      {(status !== "live" || live === 0) && (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <a href={locator} target="_blank" rel="noreferrer" className="rounded-full border-[3px] border-ink bg-navy px-4 py-2.5 text-center font-bold text-cream shadow-hard">
            Find VA locations near {location ?? "you"} on VA.gov ↗
          </a>
          <a href="tel:8772228387" className="rounded-full border-[3px] border-ink bg-paper px-4 py-2.5 text-center font-bold shadow-hard">📞 Call VA: 877-222-8387</a>
        </div>
      )}
    </div>
  );
}
