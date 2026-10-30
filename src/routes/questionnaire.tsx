import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/SiteHeader";
import { useAccount } from "@/hooks/useAccount";

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

type Q = { key: string; label: string; options?: [string, string][]; placeholder?: string; vaOnly?: boolean };
const QUESTIONS: Q[] = [
  { key: "need", label: "What would you like support with?", options: [["ptsd", "PTSD"], ["depression", "Depression"], ["anxiety", "Anxiety"], ["grief", "Grief"], ["trauma", "Trauma"], ["mst", "Military sexual trauma"], ["substance use", "Substance use"]] },
  { key: "location", label: "Where are you? (City, ST or ZIP)", placeholder: "e.g. Atlanta, GA" },
  { key: "va_vs_community", label: "Where would you like care?", options: [["va", "VA care"], ["community", "Community / civilian provider"], ["both", "Show me both"]] },
  { key: "care_type", label: "One-on-one or a group?", options: [["therapy", "One-on-one therapy"], ["group", "Support group"]] },
  { key: "care_format", label: "How would you like to meet?", options: [["in-person", "In person"], ["telehealth", "Video (telehealth)"], ["phone", "Phone"]] },
  { key: "payment", label: "How would you pay?", options: [["va", "VA benefits"], ["tricare", "TRICARE"], ["medicaid", "Medicaid"], ["medicare", "Medicare"], ["private", "Private insurance"], ["self-pay", "Self-pay"]] },
  { key: "va_applied", label: "Have you applied for VA health care?", options: [["yes", "Yes"], ["no", "No"]], vaOnly: true },
  { key: "va_registered", label: "Are you registered as a patient at a VA facility?", options: [["yes", "Yes"], ["no", "No"], ["unsure", "Not sure"]], vaOnly: true },
  { key: "va_facility", label: "Which VA facility are you registered at?", placeholder: "e.g. Atlanta VA Medical Center, or \"unknown\"", vaOnly: true },
];

function Questionnaire() {
  const { user, prefs, savePrefs } = useAccount();
  const nav = useNavigate();
  const [a, setA] = useState<Record<string, string>>({});
  useEffect(() => { try { setA(JSON.parse(sessionStorage.getItem("van_quiz") ?? "{}")); } catch { /* none */ } }, []);
  const set = (k: string, v: string) => setA((p) => { const n = { ...p }; if (v) n[k] = v; else delete n[k]; return n; });
  const wantsVa = a["va_vs_community"] === "va" || a["va_vs_community"] === "both";
  const shown = QUESTIONS.filter((q) => !q.vaOnly || wantsVa)
    .filter((q) => q.key !== "va_registered" || a["va_applied"] === "yes")
    .filter((q) => q.key !== "va_facility" || a["va_registered"] === "yes");

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
