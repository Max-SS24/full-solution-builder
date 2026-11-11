import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { verifyPrepFacts } from "@/lib/appointment-prep.functions";
import { PREP_DISCLAIMER, PREP_TOPICS, PREP_UNCONFIRMED, applyChecks, factsFor, type PrepTopic, type PrepView } from "@/lib/appointment-prep";
import type { VaStage } from "@/lib/va-guide";
import { PREP_LINKS } from "@/lib/helpful-links";
import { supabase } from "@/integrations/supabase/client";
import { GuidanceReport } from "@/components/GuidanceReport";

const fmt = (d: string) => new Date(d).toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" });

export function PrepDisclaimer() {
  return <p role="note" className="rounded-2xl border-[3px] border-ink bg-sun/40 px-4 py-3 text-sm font-semibold">{PREP_DISCLAIMER}</p>;
}

export function AppointmentPrep({ stage }: { stage: VaStage | null }) {
  const verify = useServerFn(verifyPrepFacts);
  const [views, setViews] = useState<PrepView[] | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    const refresh = () => {
      setViews(null);
      setFailed(false);
      verify().then((r) => { if (active) setViews(applyChecks(factsFor(stage), r.checks)); }).catch(() => { if (active) { setFailed(true); setViews(applyChecks(factsFor(stage), [])); } });
    };
    refresh();
    const timer = window.setInterval(refresh, 60 * 1000);
    return () => { active = false; window.clearInterval(timer); };
  }, [stage, verify]);
  const [links, setLinks] = useState<Record<string, { ok: boolean; checked_at: string }>>({});
  useEffect(() => {
    supabase.from("link_checks").select("url, ok, checked_at").in("url", PREP_LINKS.map((l) => l.url))
      .then(({ data }) => setLinks(Object.fromEntries((data ?? []).map((c) => [c.url, c]))));
  }, []);

  if (!views) return <p className="text-sm font-semibold text-ink/70" aria-live="polite">Checking each fact against the live VA.gov pages…</p>;
  const ok = views.filter((v) => v.verified);
  const topics = Object.keys(PREP_TOPICS) as PrepTopic[];
  return (
    <div className="space-y-8">
      <PrepDisclaimer />
      <p role="note" className="text-sm text-ink/75">Each confirmed item shows when VA Navigator last reviewed its supporting evidence on VA.gov. These are automated source checks, not a human review or VA’s publication date.</p>
      {failed && <p className="text-sm font-semibold text-coral">We couldn't reach VA.gov to confirm the guidance right now, so none of it is shown as current.</p>}
      {topics.map((t) => {
        const list = views.filter((v) => v.fact.topic === t);
        if (!list.length) return null;
        return (
          <section key={t} className="rounded-[22px] border-[3px] border-ink bg-paper p-5 shadow-hard">
            <h2 className="font-display text-2xl font-bold">{PREP_TOPICS[t]}</h2>
            <ul className="mt-4 space-y-5">
              {list.map((v) => v.verified ? (
                <li key={v.fact.id} className="grid gap-2">
                  <p className="text-xs font-bold uppercase tracking-wide text-ink/55">What we found</p>
                  <p>{v.fact.finding}</p>
                  <p className="text-xs font-bold uppercase tracking-wide text-ink/55">What it suggests</p>
                  <p className="text-ink/80">{v.fact.suggests}</p>
                  <p className="rounded-xl border-2 border-ink/20 bg-cream px-3 py-2 text-xs text-ink/70">
                    <span className="font-bold text-ink">Source:</span>{" "}
                    <a href={v.fact.sourceUrl} target="_blank" rel="noreferrer" className="break-all font-bold underline">VA.gov – {v.fact.sourceLabel}<span aria-hidden="true"> ↗</span><span className="sr-only"> (opens in a new tab)</span></a>
                    <span className="block">✓ Guidance last reviewed against VA.gov: <time dateTime={v.checkedAt}>{fmt(v.checkedAt)}</time></span>
                  </p>
                  <GuidanceReport fact={v.fact} />
                </li>
              ) : (
                <li key={v.fact.id} className="rounded-xl border-2 border-coral px-3 py-2 text-sm">
                  {PREP_UNCONFIRMED}{" "}
                  <a href={v.fact.sourceUrl} target="_blank" rel="noreferrer" className="break-all font-bold underline">{v.fact.sourceLabel}<span aria-hidden="true"> ↗</span><span className="sr-only"> (opens in a new tab)</span></a>
                  <GuidanceReport fact={v.fact} />
                </li>
              ))}
            </ul>
          </section>
        );
      })}
      {ok.some((v) => v.fact.askProvider) && (
        <section className="rounded-[22px] border-[3px] border-ink bg-minttint p-5 shadow-hard">
          <h2 className="font-display text-2xl font-bold">Questions you could bring to your VA provider</h2>
          <p className="mt-1 text-sm text-ink/70">Each question comes from a confirmed fact above.</p>
          <ul className="mt-4 space-y-3">
            {ok.filter((v) => v.fact.askProvider).map((v) => (
              <li key={v.fact.id} className="flex gap-3">
                <input type="checkbox" aria-label={v.fact.askProvider} className="mt-1 h-4 w-4" />
                <span>{v.fact.askProvider} <a href={v.fact.sourceUrl} target="_blank" rel="noreferrer" className="text-xs font-bold underline">Source<span aria-hidden="true"> ↗</span><span className="sr-only"> (opens in a new tab)</span></a></span>
              </li>
            ))}
          </ul>
        </section>
      )}
      <section className="rounded-[22px] border-[3px] border-ink bg-paper p-5 shadow-hard">
        <h2 className="font-display text-2xl font-bold">VA.gov sources and weekly checks</h2>
        <p className="mt-1 text-sm text-ink/70">Every Sunday we check these links. A working link alone does not confirm guidance; the facts above require a separate recent evidence check.</p>
        <ul className="mt-4 space-y-3">
          {PREP_LINKS.map((l) => {
            const c = links[l.url];
            return (
              <li key={l.url} className="rounded-xl border-2 border-ink/20 bg-cream px-3 py-2 text-sm">
                <a href={l.url} target="_blank" rel="noreferrer" className="break-all font-bold underline">{l.title}<span aria-hidden="true"> ↗</span><span className="sr-only"> (opens in a new tab)</span></a>
                <span className={`block text-xs font-semibold ${c && !c.ok ? "text-coral" : "text-ink/70"}`}>
                  {!c ? "Not checked yet" : c.ok ? `✓ Verified · ${fmt(c.checked_at)}` : `Needs review: couldn't confirm on ${fmt(c.checked_at)}`}
                </span>
              </li>
            );
          })}
        </ul>
      </section>
      <PrepDisclaimer />
    </div>
  );
}
