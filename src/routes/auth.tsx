import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Admin sign in — VA Navigator" },
      { name: "description", content: "Sign in to manage approved data sources." },
      { property: "og:title", content: "Admin sign in — VA Navigator" },
      { property: "og:description", content: "Administrator access for VA Navigator." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (error) { toast.error(error.message); return; }
      nav({ to: "/admin" });
    } else {
      const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin + "/admin" } });
      setBusy(false);
      if (error) { toast.error(error.message); return; }
      toast.success("Check your email to confirm your account, then sign in.");
      setMode("in");
    }
  }

  return (
    <div className="min-h-screen bg-cream">
      <SiteHeader />
      <main className="mx-auto max-w-md px-6 py-16">
        <form onSubmit={submit} className="rounded-[30px] border-[3px] border-ink bg-paper p-8 shadow-[8px_8px_0_var(--ink)]">
          <h1 className="font-display text-3xl font-bold">{mode === "in" ? "Admin sign in" : "Create admin account"}</h1>
          <p className="mt-2 text-sm text-ink/60">Only administrators can manage data sources.</p>
          <label className="mt-6 block text-sm font-bold" htmlFor="email">Email</label>
          <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded-full border-[3px] border-ink bg-cream px-4 py-2.5" />
          <label className="mt-4 block text-sm font-bold" htmlFor="pw">Password</label>
          <input id="pw" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full rounded-full border-[3px] border-ink bg-cream px-4 py-2.5" />
          <button disabled={busy} className="mt-6 w-full rounded-full border-[3px] border-ink bg-navy py-3 font-bold text-cream shadow-hard disabled:opacity-60">
            {mode === "in" ? "Sign in" : "Sign up"}
          </button>
          <button type="button" onClick={() => setMode(mode === "in" ? "up" : "in")} className="mt-4 w-full text-sm font-semibold underline">
            {mode === "in" ? "Need an account? Sign up" : "Have an account? Sign in"}
          </button>
        </form>
      </main>
    </div>
  );
}
