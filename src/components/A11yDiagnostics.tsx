import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { A11Y_ALERTS_KEY } from "@/components/A11yAlert";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { A11Y_KEY, TEXT_SIZES } from "@/lib/a11y-prefs";
import { AUDIT_BROWSER_PAGES, type AuditResult } from "@/lib/a11y-audit";

type Run = { id: string; kind: string; ok: boolean; passed: number; failed: number; results: AuditResult[]; ran_at: string; acknowledged_at: string | null; resolved_by_run: string | null };

function loadFrame(frame: HTMLIFrameElement, path: string) {
  return new Promise<Document>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout")), 20000);
    frame.onload = () => {
      // let the page render its heading
      setTimeout(() => { clearTimeout(t); frame.contentDocument ? resolve(frame.contentDocument) : reject(new Error("blocked")); }, 1500);
    };
    frame.src = path;
  });
}

/** Admin-run in-browser check: each display preference must stay applied on every page. */
export function A11yDiagnostics({ focusSignal = 0 }: { focusSignal?: number }) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!focusSignal) return;
    const t = setTimeout(() => { const h = document.getElementById("a11y-checks"); h?.scrollIntoView({ behavior: "smooth", block: "start" }); h?.focus(); }, 50);
    return () => clearTimeout(t);
  }, [focusSignal]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const load = () => supabase.from("a11y_audit_runs").select("*").order("ran_at", { ascending: false }).limit(10)
    .then(({ data }) => setRuns((data ?? []) as unknown as Run[]));
  useEffect(() => { void load(); }, []);

  async function run() {
    setBusy(true);
    const saved = localStorage.getItem(A11Y_KEY);
    const frame = document.createElement("iframe");
    frame.setAttribute("aria-hidden", "true"); frame.tabIndex = -1;
    frame.style.cssText = "position:fixed;left:-10000px;width:1024px;height:768px";
    document.body.appendChild(frame);
    const results: AuditResult[] = [];
    try {
      for (const path of AUDIT_BROWSER_PAGES) {
        setStatus(`Checking ${path}…`);
        const problems: string[] = [];
        for (const contrast of [false, true]) for (const text of TEXT_SIZES) {
          localStorage.setItem(A11Y_KEY, JSON.stringify({ contrast, text, motion: false }));
          try {
            const d = await loadFrame(frame, path);
            const el = d.documentElement;
            if (el.dataset["contrast"] !== (contrast ? "high" : "normal") || el.dataset["text"] !== text)
              problems.push(`${contrast ? "High contrast" : "Normal contrast"} + ${text} text not kept`);
            if (contrast && text === "normal" && !d.querySelector("main#main h1, main#main [role=heading]")) problems.push("Page heading not found");
          } catch { problems.push("Page could not be loaded"); break; }
        }
        results.push({ path, ok: problems.length === 0, problems: [...new Set(problems)] });
      }
    } finally {
      frame.remove();
      saved === null ? localStorage.removeItem(A11Y_KEY) : localStorage.setItem(A11Y_KEY, saved);
    }
    const failed = results.filter((r) => !r.ok).length;
    const { data: u } = await supabase.auth.getUser();
    await supabase.from("a11y_audit_runs").insert({ kind: "browser", ok: failed === 0, passed: results.length - failed, failed, results, ran_by: u.user?.id ?? null });
    setStatus(failed ? `Finished: ${failed} of ${results.length} pages need attention.` : `Finished: all ${results.length} pages passed.`);
    setBusy(false); void load(); void qc.invalidateQueries({ queryKey: A11Y_ALERTS_KEY });
  }

  return (
    <section className="mt-8 rounded-[22px] border-[3px] border-ink bg-paper p-5 shadow-hard">
      <h2 id="a11y-checks" tabIndex={-1} className="font-display text-2xl font-bold">Accessibility checks</h2>
      <p className="mt-1 text-sm text-ink/70">Every Sunday the app checks each public page for headings, landmarks, skip link and display-setting support. Run the in-browser diagnostic to confirm high contrast and text sizes stay applied on every page.</p>
      <Button className="mt-3" onClick={run} disabled={busy}>{busy ? "Running…" : "Run accessibility diagnostic"}</Button>
      <p role="status" aria-live="polite" className="mt-2 text-sm">{status}</p>
      <ul className="mt-4 divide-y-2 divide-ink/10 text-sm">
        {runs.length === 0 && <li className="py-2">No checks have run yet.</li>}
        {runs.map((r) => (
          <li key={r.id} className="py-2">
            <details>
              <summary className="cursor-pointer">
                <span className="font-semibold">{r.kind === "server" ? "Sunday page check" : "In-browser diagnostic"}</span> · {new Date(r.ran_at).toLocaleString()} · <span className={r.ok ? "font-bold" : "font-bold text-coral"}>{r.ok ? `✓ ${r.passed} passed` : `${r.failed} need attention`}</span>{!r.ok && (r.resolved_by_run ? " · resolved by a later passing check" : r.acknowledged_at ? " · reviewed" : " · not reviewed")}
              </summary>
              <ul className="ml-4 mt-1 list-disc">
                {r.results.map((p) => <li key={p.path}>{p.path}: {p.ok ? "passed" : p.problems.join("; ")}</li>)}
              </ul>
            </details>
          </li>
        ))}
      </ul>
    </section>
  );
}
