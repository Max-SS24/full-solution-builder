import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { matchProviders, type ProviderMatch } from "@/lib/match.functions";

const FIT: Record<string, string> = { strong: "bg-minttint", good: "bg-skytint", partial: "bg-soft" };

export function ProviderMatcher({ resourceIds, payment }: { resourceIds: string[]; payment: string | null }) {
  const run = useServerFn(matchProviders);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState<{ summary: string; matches: ProviderMatch[]; error: string | null } | null>(null);

  async function go(e: React.FormEvent) {
    e.preventDefault();
    if (text.trim().length < 3 || busy) return;
    setBusy(true);
    try { setOut(await run({ data: { priorities: text, resourceIds, payment } })); }
    catch { setOut({ summary: "", matches: [], error: "Something went wrong. Please try again." }); }
    finally { setBusy(false); }
  }

  return (
    <div className="mt-10 rounded-[26px] border-[3px] border-ink bg-paper p-5 shadow-hard-lg sm:p-6">
      <h3 className="font-display text-2xl font-bold">What matters most in a provider?</h3>
      <p className="mt-1 text-sm text-ink/60">For example: "a veteran who gets it, evenings, takes TRICARE, not too pushy." We'll compare your words to each provider's bio and insurance.</p>
      <form onSubmit={go} className="mt-4 grid gap-3">
        <label htmlFor="prio" className="sr-only">What matters most to you</label>
        <textarea id="prio" rows={3} value={text} onChange={(e) => setText(e.target.value)} maxLength={1500}
          className="w-full resize-none rounded-[18px] border-[3px] border-ink bg-cream p-4 text-base focus:outline-none" />
        <button disabled={busy || text.trim().length < 3} className="justify-self-end rounded-full border-[3px] border-ink bg-mint px-6 py-2.5 text-sm font-bold text-paper shadow-hard disabled:opacity-60">
          {busy ? "Comparing…" : "Find my best matches →"}
        </button>
      </form>
      {out?.error && <p className="mt-4 text-sm font-semibold text-coral">{out.error}</p>}
      {out && !out.error && (
        <div className="mt-5 space-y-3">
          {out.summary && <p className="font-medium">{out.summary}</p>}
          {out.matches.length === 0 && <p className="text-sm text-ink/60">No listed provider clearly fits yet.</p>}
          {out.matches.map((m, i) => (
            <div key={i} className="rounded-2xl border-2 border-ink bg-cream p-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold">{m.name}{m.credentials ? `, ${m.credentials}` : ""} · <span className="font-semibold text-ink/60">{m.facility}</span></span>
                <span className={`rounded-full border-2 border-ink px-2 py-0.5 text-[10px] font-bold uppercase ${FIT[m.fit]}`}>{m.fit} fit</span>
              </div>
              <p className="mt-2 text-ink/80">{m.why}</p>
              <p className="mt-1 text-xs font-semibold text-ink/60">💳 {m.insurance.join(", ")}</p>
            </div>
          ))}
          <p className="text-[11px] font-semibold text-ink/50">AI-generated comparison of posted bios. Always confirm details with the provider.</p>
        </div>
      )}
    </div>
  );
}
