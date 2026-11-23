import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { openA11yFailures, type AlertRun } from "@/lib/a11y-audit";

export const A11Y_ALERTS_KEY = ["a11y-alerts"] as const;

export function useA11yAlerts(enabled = true) {
  return useQuery({
    queryKey: A11Y_ALERTS_KEY,
    enabled,
    queryFn: async () => {
      const { data } = await supabase.from("a11y_audit_runs").select("id, kind, ok, failed, ran_at, acknowledged_at, resolved_by_run, results")
        .is("acknowledged_at", null).order("ran_at", { ascending: false }).limit(30);
      // Passing runs are fetched too, so a newer full pass hides an older failure right away.
      return openA11yFailures((data ?? []) as unknown as AlertRun[]);
    },
  });
}

/** Admin-page notice for accessibility checks that found a failure and haven't been reviewed. */
export function A11yAlert({ onOpen }: { onOpen: () => void }) {
  const q = useA11yAlerts();
  const qc = useQueryClient();
  const open = q.data ?? [];
  if (!open.length) return null;
  const latest = open[0]!;
  async function markReviewed() {
    const results = await Promise.all(open.map((r) => supabase.rpc("acknowledge_a11y_run", { _id: r.id })));
    if (results.some((r) => r.error)) toast.error("Couldn't mark these reviewed. Try again.");
    else toast.success("Accessibility alerts marked reviewed.");
    void qc.invalidateQueries({ queryKey: A11Y_ALERTS_KEY });
    void qc.invalidateQueries({ queryKey: ["a11y-runs"] });
  }
  return (
    <div role="alert" className="mt-6 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 border-l-4 border-coral bg-soft p-4 sm:grid-cols-[auto_minmax(0,1fr)_auto]">
      <AlertTriangle className="size-5 shrink-0" aria-hidden="true" />
      <div className="min-w-0">
        <p className="font-bold">Accessibility check failed · {new Date(latest.ran_at).toLocaleString()}</p>
        <p className="text-sm">{latest.kind === "server" ? "Sunday page check" : "In-browser diagnostic"}: {latest.failed} {latest.failed === 1 ? "page needs" : "pages need"} attention{open.length > 1 ? ` · ${open.length} unreviewed failed runs` : ""}</p>
      </div>
      <div className="col-span-2 flex flex-wrap gap-2 sm:col-span-1">
        <Button variant="outline" onClick={onOpen}>Review accessibility checks</Button>
        <Button variant="outline" onClick={markReviewed}>Mark reviewed</Button>
      </div>
    </div>
  );
}
