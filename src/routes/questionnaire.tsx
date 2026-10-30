import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/SiteHeader";
import { useAccount } from "@/hooks/useAccount";
import { visibleQuestions } from "@/lib/questionnaire";

export const Route = createFileRoute("/questionnaire")({
  head: () => ({
    meta: [
      { title: "Quick questions | VA Navigator" },
      { name: "description", content: "Answer a few optional questions so VA Navigator can find the right care with fewer chat questions." },
      { property: "og:title", content: "Quick questions | VA Navigator" },
      { property: "og:description", content: "Optional questions that help VA Navigator find veteran mental-health care faster." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Questionnaire,
});

function Questionnaire() {
  const { user, prefs, savePrefs } = useAccount();
  const nav = useNavigate();
  const [a, setA] = useState<Record<string, string>>({});
  useEffect(() => { try { setA(JSON.parse(sessionStorage.getItem("van_quiz") ?? "{}")); } catch { /* none */ } }, []);
  const set = (k: string, v: string) => setA((p) => { const n = { ...p }; if (v) n[k] = v; else delete n[k]; return n; });
  const shown = visibleQuestions(a);

  async function done(save: boolean) {
    const keep = Object.fromEntries(Object.entries(a).filter(([k]) => shown.some((q) => q.key === k)));
    sessionStorage.setItem("van_quiz", JSON.stringify(keep));
    if (save && user) {
      try { await savePrefs({ ...(prefs ?? {}), ...keep }); toast.success("Saved to your preferences"); }
      catch { toast.error("Couldn't save preferences."); }
    }
    nav({ to: "/" });
  }

  return (
    <div className="min-h-screen bg-cream text-ink">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        <h1 className="font-display text-3xl font-bold sm:text-4xl">Quick questions</h1>
        <p className="mt-2 text-ink/70">All optional. Skip anything you'd rather not answer, the chat will use what you share so it asks fewer questions.</p>
        <div className="mt-8 space-y-5">
          {shown.map((q) => (
            <fieldset key={q.key} className="rounded-[22px] border-[3px] border-ink bg-paper p-5 shadow-hard">
              <legend className="sr-only">{q.label}</legend>
              <p className="font-bold">{q.label}</p>
              {q.options ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {q.options.map(([v, l]) => (
                    <button key={v} type="button" onClick={() => set(q.key, a[q.key] === v ? "" : v)} aria-pressed={a[q.key] === v}
                      className={`rounded-full border-[3px] border-ink px-4 py-1.5 text-sm font-semibold ${a[q.key] === v ? "bg-mint text-paper" : "bg-cream"}`}>{l}</button>
                  ))}
                  <button type="button" onClick={() => set(q.key, "")} className="rounded-full border-2 border-dashed border-ink/40 px-4 py-1.5 text-sm font-semibold text-ink/60">Skip</button>
                </div>
              ) : (
                <input value={a[q.key] ?? ""} onChange={(e) => set(q.key, e.target.value.slice(0, 120))} placeholder={q.placeholder}
                  className="mt-3 w-full rounded-full border-[3px] border-ink bg-cream px-4 py-2 text-sm focus:outline-none" />
              )}
            </fieldset>
          ))}
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <button onClick={() => done(false)} className="rounded-full border-[3px] border-ink bg-mint px-5 py-2.5 font-bold text-paper shadow-hard">Start chatting →</button>
          {user && <button onClick={() => done(true)} className="rounded-full border-[3px] border-ink bg-sun px-5 py-2.5 font-bold shadow-hard">⭐ Save & start chatting</button>}
          <button onClick={() => { sessionStorage.removeItem("van_quiz"); setA({}); }} className="rounded-full border-[3px] border-ink px-5 py-2.5 font-semibold">Clear answers</button>
        </div>
      </main>
    </div>
  );
}
