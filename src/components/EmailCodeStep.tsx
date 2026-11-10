import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { canResend, formatCountdown, MAX_CODE_TRIES, RESEND_WAIT_S, secondsLeft } from "@/lib/mfa-rules";

/** Sends a one-time code to `email` and calls onVerified once the code creates a fresh session. */
export function EmailCodeStep({ email, onVerified, onCancel, intro, onRecovery }: {
  email: string; onVerified: () => Promise<void> | void; onCancel?: () => void; intro?: string;
  /** When set, offers "use a recovery code" and calls this with the entered code. */
  onRecovery?: (code: string) => Promise<void>;
}) {
  const [code, setCode] = useState("");
  const [tries, setTries] = useState(0);
  const [wait, setWait] = useState(0);
  const [busy, setBusy] = useState(false);
  const [sends, setSends] = useState(0);
  const [sentAt, setSentAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [recovery, setRecovery] = useState(false);
  const [rcode, setRcode] = useState("");

  async function send() {
    if (!canResend(sends)) return;
    const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false, emailRedirectTo: `${window.location.origin}/auth?step=code` } });
    if (error) { toast.error(error.message); return; }
    setTries(0); setWait(RESEND_WAIT_S); setSends((n) => n + 1); setSentAt(Date.now()); setNow(Date.now()); setCode("");
    toast.success(`We emailed a sign-in code to ${email}.`);
  }
  useEffect(() => { void send(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const t = setInterval(() => { setNow(Date.now()); setWait((w) => Math.max(0, w - 1)); }, 1000); return () => clearInterval(t); }, []);

  const left = sentAt ? secondsLeft(sentAt, now) : null;
  const expired = left === 0;
  const outOfResends = !canResend(sends);

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    if (tries >= MAX_CODE_TRIES || expired) return;
    setBusy(true);
    const { error } = await supabase.auth.verifyOtp({ email, token: code.trim(), type: "email" });
    if (error) { setBusy(false); setTries(tries + 1); toast.error(tries + 1 >= MAX_CODE_TRIES ? "Too many tries. Send a new code." : "That code didn't work. Check it and try again."); return; }
    try { await onVerified(); } catch (err) { toast.error(err instanceof Error ? err.message : "Couldn't verify."); }
    setBusy(false);
  }

  async function useRecovery(e: React.FormEvent) {
    e.preventDefault();
    if (!onRecovery) return;
    setBusy(true);
    try { await onRecovery(rcode); } catch (err) { toast.error(err instanceof Error ? err.message : "That recovery code didn't work."); }
    setBusy(false);
  }

  if (recovery && onRecovery) {
    return (
      <form onSubmit={useRecovery} className="space-y-3">
        <p className="text-sm">Enter one of the recovery codes you saved when you turned on sign-in codes. Each code works only once.</p>
        <label className="block text-sm font-bold" htmlFor="rec-code">Recovery code</label>
        <input id="rec-code" autoComplete="off" maxLength={20} value={rcode} onChange={(e) => setRcode(e.target.value)} placeholder="ABCD-EFGH" className="w-full rounded-full border-[3px] border-ink bg-cream px-4 py-2.5 uppercase tracking-widest" />
        <button disabled={busy || rcode.replace(/[^a-z0-9]/gi, "").length < 8} className="w-full rounded-full border-[3px] border-ink bg-navy py-3 font-bold text-cream shadow-hard disabled:opacity-60">Use recovery code</button>
        <div className="flex justify-between text-sm font-semibold">
          <button type="button" onClick={() => setRecovery(false)} className="underline">Back to email code</button>
          {onCancel && <button type="button" onClick={onCancel} className="underline">Cancel</button>}
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={verify} className="space-y-3">
      <p className="text-sm">{intro ?? "Enter the 6-digit code we emailed you."} You can also click the link in that email.</p>
      {left != null && (
        <p role="status" className={`text-sm font-bold ${expired ? "text-destructive" : ""}`}>
          {expired ? "This code has expired. Send a new one." : `Code valid for ${formatCountdown(left)}`}
        </p>
      )}
      {sends > 1 && sentAt && !expired && (
        <p className="text-xs text-ink/60">New code sent at {new Date(sentAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}. Older codes no longer work.</p>
      )}
      <label className="block text-sm font-bold" htmlFor="mfa-code">Sign-in code</label>
      <input id="mfa-code" inputMode="numeric" autoComplete="one-time-code" maxLength={10} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} className="w-full rounded-full border-[3px] border-ink bg-cream px-4 py-2.5 tracking-widest" />
      <button disabled={busy || code.length < 6 || tries >= MAX_CODE_TRIES || expired} className="w-full rounded-full border-[3px] border-ink bg-navy py-3 font-bold text-cream shadow-hard disabled:opacity-60">Verify code</button>
      <div className="rounded-2xl border-2 border-ink/20 p-3 text-sm">
        <p className="font-semibold">Didn't get the email?</p>
        <p className="text-xs text-ink/60">Make sure to check your spam folder. It can take a minute to arrive.</p>
        {outOfResends ? (
          <p className="mt-1 text-xs">You've asked for the most codes allowed for this sign-in.{onRecovery ? " Try a recovery code instead." : " Please try again later."}</p>
        ) : (
          <button type="button" disabled={wait > 0} onClick={send} className="mt-1 font-semibold underline disabled:no-underline disabled:opacity-60">{wait > 0 ? `Send a new code in ${wait}s` : "Send a new code"}</button>
        )}
      </div>
      <div className="flex justify-between text-sm font-semibold">
        {onRecovery ? <button type="button" onClick={() => setRecovery(true)} className="underline">Lost access to your email? Use a recovery code</button> : <span />}
        {onCancel && <button type="button" onClick={onCancel} className="underline">Cancel</button>}
      </div>
    </form>
  );
}
