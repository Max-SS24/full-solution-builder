import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { useAccount, type Prefs } from "@/hooks/useAccount";
import { useServerFn } from "@tanstack/react-start";
import { deleteMyAccount } from "@/lib/privacy.functions";
import { visibleQuestions } from "@/lib/questionnaire";
import { useEffect, useState } from "react";
import { EmailCodeStep } from "@/components/EmailCodeStep";
import { createRecoveryCodes, mfaStatus, recoveryStatus, setEmailMfa } from "@/lib/mfa.functions";

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({
    meta: [
      { title: "My account | VA Navigator" },
      { name: "description", content: "View and manage your saved care search preferences." },
      { property: "og:title", content: "My account | VA Navigator" },
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
  va_applied: "📝 Applied for VA care", va_registered: "🪪 Registered VA patient", va_facility: "🏥 VA facility",
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

  const erase = useServerFn(deleteMyAccount);
  async function eraseAll() {
    if (!confirm("Permanently delete your account, search history and preferences? This can't be undone.")) return;
    try { await erase(); toast.success("Your account and data were deleted"); await signOut(); }
    catch { toast.error("Couldn't delete your account. Please try again."); }
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
        {user?.email && <SignInSecurity email={user.email} />}
        <section className="mt-8 rounded-[22px] border-[3px] border-ink bg-paper p-5 shadow-hard-lg sm:rounded-[26px] sm:p-6">
          <h2 className="font-display text-xl font-bold">Saved preferences</h2>
          <p className="mt-1 text-sm text-ink/60">These fill in automatically on your next search. Anything you say in the chat overrides them.</p>
          {entries.length === 0 ? (
            <p className="mt-4 text-sm font-semibold">Nothing saved yet, after a search, tap "Save as my preferences".</p>
          ) : (
            <div className="mt-4 flex flex-wrap gap-2">
              {entries.map(([k, v]) => (
                <span key={k} className="inline-flex max-w-full items-center gap-2 break-words rounded-full border-2 border-ink bg-soft py-1 pl-3 pr-1 text-sm font-bold">
                  {LABELS[k] ?? k}: {String(v)}
                  <button
                    aria-label={`Remove ${LABELS[k] ?? k}`}
                    onClick={async () => {
                      const { [k]: _gone, ...rest } = prefs ?? {};
                      try { await savePrefs(rest); toast.success("Preference removed"); } catch { toast.error("Couldn't remove that preference."); }
                    }}
                    className="grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 border-ink bg-paper text-xs"
                  >✕</button>
                </span>
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
        <QuizAnswers prefs={prefs ?? {}} savePrefs={savePrefs} />
        <section className="mt-8 rounded-[22px] border-[3px] border-ink bg-paper p-5 shadow-hard-lg sm:rounded-[26px] sm:p-6">
          <h2 className="font-display text-xl font-bold">🔒 Data security & privacy</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink/70">
            <li>Your searches and preferences are locked to your account, no one else, including admins, can read them.</li>
            <li>We never sell or share your information.</li>
            <li>Turn on "Private search" in the chat to search without saving anything.</li>
            <li>You can erase everything at any time below.</li>
          </ul>
          <button onClick={eraseAll} className="mt-6 rounded-full border-[3px] border-ink bg-coral px-4 py-2 text-sm font-bold text-paper">Delete my account & all data</button>
        </section>
      </main>
    </div>
  );
}

function QuizAnswers({ prefs, savePrefs }: { prefs: Prefs; savePrefs: (p: Prefs) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  async function save(k: string, v: string) {
    const next: Prefs = { ...prefs };
    if (v) next[k] = v; else delete next[k];
    // Drop VA follow-ups that no longer apply.
    const keys = new Set(visibleQuestions(next).map((q) => q.key));
    for (const key of ["va_applied", "va_registered", "va_facility"]) if (!keys.has(key)) delete next[key];
    try { await savePrefs(next); toast.success("Answer updated"); } catch { toast.error("Couldn't save that answer."); }
  }
  return (
    <section className="mt-8 rounded-[22px] border-[3px] border-ink bg-paper p-5 shadow-hard-lg sm:rounded-[26px] sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl font-bold">📝 My questionnaire answers</h2>
        <button onClick={() => setOpen(!open)} aria-expanded={open} className="rounded-full border-[3px] border-ink bg-sun px-4 py-1.5 text-sm font-bold">{open ? "Done" : "Review & edit"}</button>
      </div>
      <p className="mt-1 text-sm text-ink/60">Change any single answer, it saves right away. No need to retake the whole questionnaire.</p>
      {open && (
        <div className="mt-4 space-y-4">
          {visibleQuestions(prefs).map((q) => {
            const cur = prefs[q.key] == null ? "" : String(prefs[q.key]);
            return (
              <div key={q.key} className="rounded-[18px] border-2 border-ink bg-cream p-4">
                <label htmlFor={`qa-${q.key}`} className="text-sm font-bold">{q.label}</label>
                {q.options ? (
                  <select id={`qa-${q.key}`} value={cur} onChange={(e) => save(q.key, e.target.value)}
                    className="mt-2 w-full rounded-full border-[3px] border-ink bg-paper px-4 py-2 text-sm">
                    <option value="">Not answered</option>
                    {q.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    {cur && !q.options.some(([v]) => v === cur) && <option value={cur}>{cur}</option>}
                  </select>
                ) : (
                  <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); save(q.key, (draft[q.key] ?? cur).trim()); }}>
                    <input id={`qa-${q.key}`} value={draft[q.key] ?? cur} placeholder={q.placeholder}
                      onChange={(e) => setDraft({ ...draft, [q.key]: e.target.value.slice(0, 120) })}
                      className="min-w-0 flex-1 rounded-full border-[3px] border-ink bg-paper px-4 py-2 text-sm" />
                    <button type="submit" className="shrink-0 rounded-full border-[3px] border-ink bg-mint px-4 py-2 text-sm font-bold text-paper">Save</button>
                  </form>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function SignInSecurity({ email }: { email: string }) {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [confirmOff, setConfirmOff] = useState(false);
  useEffect(() => { mfaStatus().then((s) => setEnabled(s.enabled)).catch(() => setEnabled(null)); }, []);
  async function turnOn() {
    try { await setEmailMfa({ data: { enabled: true } }); setEnabled(true); toast.success("Sign-in codes are on. We'll email you a code each time you log in."); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't turn on sign-in codes."); }
  }
  return (
    <section className="mt-6 rounded-[22px] border-[3px] border-ink bg-paper p-5">
      <h2 className="font-display text-xl font-bold">Sign-in security</h2>
      <p className="mt-1 text-sm">Email me a code each time I log in: <strong>{enabled == null ? "…" : enabled ? "On" : "Off"}</strong></p>
      {enabled === false && <button onClick={turnOn} className="mt-3 rounded-full border-[3px] border-ink bg-navy px-4 py-1.5 text-sm font-bold text-cream">Turn on sign-in codes</button>}
      {enabled === false && <p className="mt-2 text-xs text-ink/60">Make sure to check your spam folder for the code email.</p>}
      {enabled && !confirmOff && <button onClick={() => setConfirmOff(true)} className="mt-3 rounded-full border-[3px] border-ink px-4 py-1.5 text-sm font-semibold">Turn off sign-in codes</button>}
      {enabled && confirmOff && (
        <div className="mt-3">
          <EmailCodeStep email={email} intro="To turn this off, enter the 6-digit code we just emailed you."
            onCancel={() => setConfirmOff(false)}
            onVerified={async () => { await setEmailMfa({ data: { enabled: false } }); setEnabled(false); setConfirmOff(false); toast.success("Sign-in codes are off."); }} />
        </div>
      )}
      {enabled && <RecoveryCodes email={email} />}
    </section>
  );
}

function RecoveryCodes({ email }: { email: string }) {
  const [remaining, setRemaining] = useState<number | null>(null);
  const [codes, setCodes] = useState<string[] | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [lastUsed, setLastUsed] = useState<string | null>(null);
  useEffect(() => { recoveryStatus().then((s) => { setRemaining(s.remaining); setLastUsed(s.lastUsedAt); }).catch(() => setRemaining(null)); }, []);
  async function make() {
    try { const r = await createRecoveryCodes(); setCodes(r.codes); setRemaining(r.codes.length); setConfirm(false); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't make recovery codes."); }
  }
  function download() {
    if (!codes) return;
    const blob = new Blob([`Recovery codes for ${email}\nEach code works once.\n\n${codes.join("\n")}\n`], { type: "text/plain" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "recovery-codes.txt"; a.click(); URL.revokeObjectURL(a.href);
  }
  return (
    <div className="mt-5 border-t-2 border-ink/15 pt-4">
      <h3 className="font-bold">Recovery codes</h3>
      <p className="mt-1 text-sm">If you lose access to your email, you can sign in with one of these instead. {remaining != null && <strong>{remaining} left.</strong>}</p>
      {lastUsed && (
        <div role="alert" className="mt-2 rounded-xl border-2 border-ink bg-cream p-2 text-sm">
          <strong>Security notice:</strong> a recovery code was used to sign in on {new Date(lastUsed).toLocaleString()}. If that wasn't you, change your password and make new recovery codes.
        </div>
      )}
      {remaining === 0 && !codes && <p className="mt-2 rounded-xl bg-cream p-2 text-sm font-semibold">You don't have recovery codes yet. Make them now so you can't get locked out.</p>}
      {codes && (
        <div className="mt-3 rounded-xl border-2 border-ink bg-cream p-3">
          <p className="text-sm font-bold">Save these somewhere safe. You won't see them again.</p>
          <ul className="mt-2 grid grid-cols-2 gap-1 font-mono text-sm">{codes.map((c) => <li key={c}>{c}</li>)}</ul>
          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={() => { void navigator.clipboard.writeText(codes.join("\n")); toast.success("Copied."); }} className="rounded-full border-[3px] border-ink px-3 py-1 text-sm font-semibold">Copy</button>
            <button onClick={download} className="rounded-full border-[3px] border-ink px-3 py-1 text-sm font-semibold">Download</button>
            <button onClick={() => setCodes(null)} className="rounded-full border-[3px] border-ink bg-navy px-3 py-1 text-sm font-bold text-cream">I saved them</button>
          </div>
        </div>
      )}
      {!codes && remaining === 0 && <button onClick={make} className="mt-3 rounded-full border-[3px] border-ink bg-navy px-4 py-1.5 text-sm font-bold text-cream">Make recovery codes</button>}
      {!codes && !!remaining && !confirm && <button onClick={() => setConfirm(true)} className="mt-3 rounded-full border-[3px] border-ink px-4 py-1.5 text-sm font-semibold">Make new recovery codes</button>}
      {confirm && (
        <div className="mt-3">
          <EmailCodeStep email={email} intro="To make new codes, enter the 6-digit code we just emailed you. Your old recovery codes will stop working."
            onCancel={() => setConfirm(false)} onVerified={make} />
        </div>
      )}
    </div>
  );
}
