import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { A11Y_KEY, CRISIS, DEFAULT_PREFS, applyPrefs, readPrefs, type A11yPrefs, type TextSize } from "@/lib/a11y-prefs";

const SIZE_LABEL: Record<TextSize, string> = { normal: "Standard", large: "Large", xlarge: "Extra large" };

/**
 * Always-visible strip at the very top of every page: the Veterans Crisis Line is one tap away,
 * and it sits in the page flow so it never covers the chat box or results.
 */
export function SafetyBar() {
  const [prefs, setPrefs] = useState<A11yPrefs>(DEFAULT_PREFS);
  useEffect(() => { setPrefs(readPrefs(localStorage.getItem(A11Y_KEY))); }, []);
  const update = (p: Partial<A11yPrefs>) => {
    const next = { ...prefs, ...p };
    setPrefs(next); applyPrefs(next);
    try { localStorage.setItem(A11Y_KEY, JSON.stringify(next)); } catch { /* private mode */ }
  };
  const skip = () => {
    const t = document.querySelector<HTMLElement>("main, h1");
    if (t) { t.setAttribute("tabindex", "-1"); t.focus(); }
  };

  return (
    <>
      <button type="button" onClick={skip} className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded-full focus:bg-paper focus:px-4 focus:py-2 focus:font-bold focus:text-ink focus:shadow-hard">
        Skip to main content
      </button>
      <aside aria-label="Veterans Crisis Line" className="border-b-[3px] border-ink bg-navy text-cream">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-1 px-3 py-1.5 text-sm sm:px-6">
          <span className="font-bold">In crisis?</span>
          <a href={CRISIS.call.href} className="inline-flex min-h-11 items-center rounded-full bg-cream px-3 font-bold text-ink underline-offset-2 hover:underline">📞 Dial 988, press 1</a>
          <a href={CRISIS.text.href} className="hidden min-h-11 items-center font-semibold underline sm:inline-flex">Text 838255</a>
          <Sheet>
            <SheetTrigger className="inline-flex min-h-11 items-center font-semibold underline">More ways to get help</SheetTrigger>
            <SheetContent side="right" className="bg-paper text-ink">
              <SheetHeader>
                <SheetTitle className="font-display text-2xl">Veterans Crisis Line</SheetTitle>
                <SheetDescription className="text-ink/80">Free, confidential support 24/7 for Veterans, service members and their families. You don't need to be enrolled in VA benefits or health care.</SheetDescription>
              </SheetHeader>
              <ul className="mt-6 space-y-3">
                {[CRISIS.call, CRISIS.text, CRISIS.chat, CRISIS.tty, CRISIS.emergency].map((c) => (
                  <li key={c.href}>
                    <a href={c.href} {...(c.href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                      className="flex min-h-12 items-center rounded-2xl border-[3px] border-ink bg-cream px-4 py-3 font-bold shadow-hard">
                      {c.label}{c.href.startsWith("http") ? " ↗" : ""}
                    </a>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-xs text-ink/70">Source: <a className="underline" href="https://www.veteranscrisisline.net/" target="_blank" rel="noopener noreferrer">veteranscrisisline.net</a></p>
            </SheetContent>
          </Sheet>
          <Sheet>
            <SheetTrigger className="ml-auto inline-flex min-h-11 items-center gap-1 font-semibold underline" aria-label="Display settings: contrast and text size">Aa Display</SheetTrigger>
            <SheetContent side="right" className="bg-paper text-ink">
              <SheetHeader>
                <SheetTitle className="font-display text-2xl">Display settings</SheetTitle>
                <SheetDescription className="text-ink/80">Saved on this device only.</SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                <label className="flex items-center justify-between gap-4 font-semibold">
                  High contrast
                  <Switch checked={prefs.contrast} onCheckedChange={(v) => update({ contrast: v })} />
                </label>
                <fieldset>
                  <legend className="font-semibold">Text size</legend>
                  <div className="mt-2 grid grid-cols-3 gap-2" role="radiogroup">
                    {(Object.keys(SIZE_LABEL) as TextSize[]).map((s) => (
                      <button key={s} type="button" role="radio" aria-checked={prefs.text === s} onClick={() => update({ text: s })}
                        className={`min-h-11 rounded-xl border-[3px] border-ink px-2 font-bold ${prefs.text === s ? "bg-navy text-cream" : "bg-cream"}`}>
                        {SIZE_LABEL[s]}
                      </button>
                    ))}
                  </div>
                </fieldset>
                <label className="flex items-center justify-between gap-4 font-semibold">
                  Reduce motion
                  <Switch checked={prefs.motion} onCheckedChange={(v) => update({ motion: v })} />
                </label>
                <button type="button" onClick={() => update(DEFAULT_PREFS)} className="text-sm underline">Reset to default</button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </aside>
    </>
  );
}
