import { useEffect, useState } from "react";
import { GUEST_DAILY_RESULTS, resetText } from "@/lib/guest-limit";
import { currentGuestCounter, GUEST_COUNTER_EVENT, readGuestCounter, type GuestCounter } from "@/lib/guest-counter";

export function GuestSearchCounter() {
  const [quota, setQuota] = useState<GuestCounter | null>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const refresh = () => { setQuota(readGuestCounter()); setLoaded(true); };
    const update = (event: Event) => { setQuota(currentGuestCounter((event as CustomEvent<GuestCounter>).detail)); setLoaded(true); };
    refresh();
    window.addEventListener(GUEST_COUNTER_EVENT, update);
    window.addEventListener("storage", refresh);
    const timer = window.setInterval(() => setQuota((value) => currentGuestCounter(value)), 1000);
    return () => { window.removeEventListener(GUEST_COUNTER_EVENT, update); window.removeEventListener("storage", refresh); window.clearInterval(timer); };
  }, []);
  const when = resetText(quota?.resetAt);
  return (
    <div role="status" aria-live="polite" aria-atomic="true" className={`border-t-2 border-ink px-4 py-3 text-sm sm:px-6 ${quota && quota.remaining <= 1 ? "bg-sun" : "bg-skytint"}`}>
      <p className="font-bold">{quota ? `${quota.remaining} of ${GUEST_DAILY_RESULTS} free searches left` : loaded ? "Free searches left: checking with your next results" : "Checking free searches…"}</p>
      {when && <p className="mt-1 text-xs font-semibold">Free searches reset {when}.</p>}
    </div>
  );
}