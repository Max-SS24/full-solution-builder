import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { checkPassword } from "@/lib/password-rules";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set a new password | VA Navigator" },
      { name: "description", content: "Choose a new, strong password for your VA Navigator account." },
      { property: "og:title", content: "Set a new password | VA Navigator" },
      { property: "og:description", content: "Reset your VA Navigator password." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPage,
});

function ResetPage() {
  const nav = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const pw = checkPassword(password);

  useEffect(() => {
    if (window.location.hash.includes("type=recovery")) setReady(true);
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!pw.valid) return;
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Your password has been updated.");
    nav({ to: "/" });
  }

  return (
    <div className="min-h-screen bg-cream">
      <SiteHeader />
      <main className="mx-auto max-w-md px-4 py-10 sm:px-6 sm:py-16">
        <form onSubmit={submit} className="rounded-[22px] border-[3px] border-ink bg-paper p-5 shadow-hard-lg sm:p-8">
          <h1 className="font-display text-3xl font-bold">Set a new password</h1>
          {!ready ? (
            <p className="mt-3 text-sm text-ink/70">Open this page from the reset link in your email. If the link expired, request a new one from the Sign in page.</p>
          ) : (
            <>
              <label className="mt-6 block text-sm font-bold" htmlFor="pw">New password</label>
              <input id="pw" type="password" required maxLength={72} value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full rounded-full border-[3px] border-ink bg-cream px-4 py-2.5" />
              <ul className="mt-3 space-y-1 text-sm" aria-label="Password rules">
                {pw.results.filter((r) => r.id !== "email").map((r) => (
                  <li key={r.id} className={r.ok ? "font-semibold text-navy" : "text-ink/60"}>{r.ok ? "✓" : "○"} {r.label}</li>
                ))}
              </ul>
              <button disabled={busy || !pw.valid} className="mt-6 w-full rounded-full border-[3px] border-ink bg-navy py-3 font-bold text-cream shadow-hard disabled:opacity-60">Save new password</button>
            </>
          )}
        </form>
      </main>
    </div>
  );
}
