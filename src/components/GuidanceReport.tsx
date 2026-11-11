import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Flag, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { REPORT_REASONS, guidanceReportSchema } from "@/lib/guidance-reports";
import { submitGuidanceReport } from "@/lib/guidance-reports.functions";
import type { PrepFact } from "@/lib/appointment-prep";

export function GuidanceReport({ fact }: { fact: PrepFact }) {
  const submit = useServerFn(submitGuidanceReport);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("outdated");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  async function send(e: React.FormEvent) {
    e.preventDefault();
    const parsed = guidanceReportSchema.safeParse({ factId: fact.id, reason, details });
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? "Check your report."); return; }
    setBusy(true); setError("");
    try { await submit({ data: parsed.data }); setSaved(true); setDetails(""); }
    catch { setError("Your report couldn't be saved. Please try again."); }
    finally { setBusy(false); }
  }
  return <Dialog open={open} onOpenChange={(value) => { if (!busy) setOpen(value); }}>
    <DialogTrigger asChild><Button variant="link" className="justify-self-start px-0 text-ink" aria-label={`Report an issue with guidance: ${fact.id}`}><Flag />Report an issue</Button></DialogTrigger>
    <DialogContent className="max-h-[85dvh] w-[calc(100%-2rem)] overflow-y-auto border-2 border-ink bg-paper text-ink">
      <DialogTitle className="pr-6 font-display">Report appointment guidance</DialogTitle>
      <DialogDescription>This goes to VA Navigator’s admin review inbox, not VA. Please don’t include names, contact details, or medical information.</DialogDescription>
      <p className="text-sm">{fact.finding}</p>
      <a className="break-all text-sm underline" href={fact.sourceUrl} target="_blank" rel="noreferrer">{fact.sourceLabel}<span className="sr-only"> (opens in a new tab)</span></a>
      {saved ? <><p role="status" className="font-semibold">Report saved for review. Thank you for flagging this.</p><Button onClick={() => setOpen(false)}>Done</Button></> : <form onSubmit={send} className="grid gap-4" aria-busy={busy}>
        <label className="grid gap-1 text-sm font-semibold">What seems wrong?
          <select value={reason} onChange={(e) => setReason(e.target.value)} disabled={busy} className="w-full rounded-md border-2 border-ink bg-cream p-2">
            {Object.entries(REPORT_REASONS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-semibold">Details (optional)
          <textarea maxLength={1000} rows={4} value={details} onChange={(e) => setDetails(e.target.value)} disabled={busy} className="w-full resize-y rounded-md border-2 border-ink bg-cream p-2" />
        </label>
        {error && <p role="alert" className="text-sm font-semibold text-coral">{error}</p>}
        <Button type="submit" disabled={busy}><Send />{busy ? "Sending…" : "Send report"}</Button>
      </form>}
    </DialogContent>
  </Dialog>;
}