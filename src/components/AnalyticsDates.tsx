import { useState } from "react";
import { format, parseISO } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

function DateField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const date = parseISO(value);
  return <div><p className="mb-1 text-sm font-semibold">{label} (UTC)</p><Popover open={open} onOpenChange={setOpen}><PopoverTrigger asChild><Button variant="outline" aria-label={`${label} date`} className="justify-start"><CalendarIcon />{format(date, "MMM d, yyyy")}</Button></PopoverTrigger><PopoverContent align="start" className="w-auto p-0 pointer-events-auto"><Calendar mode="single" selected={date} defaultMonth={date} captionLayout="dropdown" startMonth={new Date(2000, 0)} endMonth={new Date(2100, 11)} onSelect={(d) => { if (d) { onChange(format(d, "yyyy-MM-dd")); setOpen(false); } }} className="pointer-events-auto" /></PopoverContent></Popover></div>;
}
export function AnalyticsDates({ from, to, onChange }: { from: string; to: string; onChange: (from: string, to: string) => void }) {
  function preset(n: number) {
    const end = new Date();
    const start = new Date(end); start.setUTCDate(start.getUTCDate() - n + 1);
    onChange(start.toISOString().slice(0, 10), end.toISOString().slice(0, 10));
  }
  return <fieldset className="my-4 flex flex-wrap items-end gap-3"><legend className="text-sm font-bold">Analytics date range</legend><DateField label="From" value={from} onChange={(v) => onChange(v, to)} /><DateField label="To" value={to} onChange={(v) => onChange(from, v)} /><div className="flex flex-wrap gap-2">{[7, 30, 90].map((n) => <Button key={n} variant="outline" onClick={() => preset(n)}>Last {n} days</Button>)}</div></fieldset>;
}