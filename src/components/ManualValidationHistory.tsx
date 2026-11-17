import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export function ManualValidationHistory({ checkId, provider }: { checkId: string; provider: string }) {
  const [open, setOpen] = useState(false);
  const [limit, setLimit] = useState(20);
  const history = useQuery({
    queryKey: ["manual-validation-history", checkId, limit],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase.from("manual_validation_history").select("*")
        .eq("check_id", checkId).order("created_at", { ascending: false }).order("id").limit(limit + 1);
      if (error) throw error;
      return data;
    },
  });
  return <details className="mt-3 min-w-52 max-w-80" onToggle={(event) => setOpen(event.currentTarget.open)}>
    <summary className="cursor-pointer font-semibold" aria-label={`Validation history for ${provider}`}>Validation history</summary>
    {open && <div className="mt-2 text-sm">
      {history.isPending ? <p role="status">Loading history…</p> : history.isError ? <><p role="alert">History could not be loaded.</p><Button size="sm" variant="outline" onClick={() => history.refetch()}>Try again</Button></> : <>
        {!history.data.length && <p>No manual validation actions recorded.</p>}
        <ol className="space-y-3">{history.data.slice(0, limit).map((event) => <li key={event.id} className="border-l-2 border-ink/20 pl-3">
          <p className="font-bold">{event.action === "validated" ? "Manually validated" : "Manual validation reversed"}</p>
          <p className="break-words">{event.actor_email || `Admin ${event.actor_id}`}</p>
          <time dateTime={event.created_at}>{new Date(event.created_at).toLocaleString(undefined, { timeZoneName: "short" })}</time>
          <p className="whitespace-pre-wrap break-words">{event.note || "No note provided."}</p>
        </li>)}</ol>
        {history.data.length > limit && <Button size="sm" variant="outline" className="mt-3" onClick={() => setLimit(limit + 20)}>Show older actions</Button>}
      </>}
    </div>}
  </details>;
}