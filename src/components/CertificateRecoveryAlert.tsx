import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

const KEY = ["certificate-recoveries"] as const;

/** Admin notice: a provider hidden for an unverifiable certificate passed a later check and can show in search again. */
export function CertificateRecoveryAlert({ onOpen }: { onOpen: () => void }) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const { data } = await supabase.from("certificate_recoveries").select("id, provider_name, city, state, homepage_url, new_status, recovered_at")
        .is("acknowledged_at", null).order("recovered_at", { ascending: false }).limit(50);
      return data ?? [];
    },
    refetchInterval: 60000,
  });
  const open = q.data ?? [];
  if (!open.length) return null;
  async function markReviewed() {
    const res = await Promise.all(open.map((r) => supabase.rpc("acknowledge_certificate_recovery", { _id: r.id })));
    if (res.some((r) => r.error)) toast.error("Couldn't mark these reviewed. Try again.");
    else toast.success("Certificate notices marked reviewed.");
    void qc.invalidateQueries({ queryKey: KEY });
  }
  return (
    <div role="status" className="mt-6 grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3 border-l-4 border-mint bg-minttint p-4 sm:grid-cols-[auto_minmax(0,1fr)_auto]">
      <ShieldCheck className="size-5 shrink-0" aria-hidden="true" />
      <div className="min-w-0">
        <p className="font-bold">{open.length === 1 ? "A provider's security certificate can be verified again" : `${open.length} providers' security certificates can be verified again`}</p>
        <p className="text-sm">These providers are eligible to return to search results.</p>
        <ul className="mt-2 list-disc pl-5 text-sm">
          {open.slice(0, 5).map((r) => (
            <li key={r.id}>
              <span className="font-semibold">{r.provider_name}</span>{r.city ? ` · ${r.city}, ${r.state ?? ""}` : ""} · checked {new Date(r.recovered_at).toLocaleString()}
              {r.new_status !== "working" && " · website still needs a look"}
              {r.homepage_url && <> · <a className="underline" href={r.homepage_url} target="_blank" rel="noreferrer">Website<span className="sr-only"> (opens in a new tab)</span></a></>}
            </li>
          ))}
          {open.length > 5 && <li>and {open.length - 5} more</li>}
        </ul>
      </div>
      <div className="col-span-2 flex flex-wrap gap-2 sm:col-span-1">
        <Button variant="outline" onClick={onOpen}>Review weekly checks</Button>
        <Button variant="outline" onClick={markReviewed}>Mark reviewed</Button>
      </div>
    </div>
  );
}
