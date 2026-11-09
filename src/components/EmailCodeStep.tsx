import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { MAX_CODE_TRIES } from "@/lib/mfa-rules";

/** Sends a one-time code to `email` and calls onVerified once the code creates a fresh session. */
export function EmailCodeStep({ email, onVerified, onCancel, intro }: { email: string; onVerified: () => Promise<void> | void; onCancel?: () => void; intro?: string }) {
  const [code, setCode] = useState("");
  const [tries, setTries] = useState(0);
  const [wait, setWait] = useState(0);
  const [busy, setBusy] = useState(false);

  async function send() {
    const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false, emailRedirectTo: `${window.location.origin}/auth?step=code` } });
    if (error) { toast.error(error.message); return; }
    setTries(0); setWait(60);
    toast.success(`We emailed a sign-in code to ${email}.`);
  }
  useEffect(() => { void send(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (wait <= 0) return; const t = setTimeout(() => setWait(wait - 1), 1000); return () => clearTimeout(t); }, [wait]);

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    if (tries >= MAX_CODE_TRIES) return;
    setBusy(true);
    const { error } = await supabase.auth.verifyOtp({ email, token: code.trim(), type: "email" });
    if (error) { setBusy(false); setTries(tries + 1); toast.error(tries + 1 >= MAX_CODE_TRIES ? "Too many tries. Send a new code." : "That code didn't work. Check it and try again."); return; }
    try { await onVerified(); } catch (err) { toast.error(err instanceof Error ? err.message : "Couldn't verify."); }
    setBusy(false);
  }

  return (
    <form onSubmit={verify} className="space-y-3">
      <p className="text-sm">{intro ?? "Enter the 6-digit code we emailed you. It expires in 10 minutes."} You can also click the link in that email.</p>
      <label className="block text-sm font-bold" htmlFor="mfa-code">Sign-in code</label>
      <input id="mfa-code" inputMode="numeric" autoComplete="one-time-code" maxLength={10} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} className="w-full rounded-full border-[3px] border-ink bg-cream px-4 py-2.5 tracking-widest" />
      <button disabled={busy || code.length < 6 || tries >= MAX_CODE_TRIES} className="w-full rounded-full border-[3px] border-ink bg-navy py-3 font-bold text-cream shadow-hard disabled:opacity-60">Verify code</button>
      <div className="flex justify-between text-sm font-semibold">
        <button type="button" disabled={wait > 0} onClick={send} className="underline disabled:no-underline disabled:opacity-60">{wait > 0 ? `Resend in ${wait}s` : "Resend code"}</button>
        {onCancel && <button type="button" onClick={onCancel} className="underline">Cancel</button>}
      </div>
    </form>
  );
}
