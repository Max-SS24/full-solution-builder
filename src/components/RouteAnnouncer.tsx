import { useEffect, useRef, useState } from "react";
import { useRouter } from "@tanstack/react-router";

/** Announces each client-side page change and moves focus to the new page so screen readers follow it. */
export function pageLabel(title: string) {
  const name = (title.split("|")[0] ?? "").trim() || "New";
  return `${name} page loaded`;
}

export function focusNewPage(doc: Document = document) {
  const main = doc.getElementById("main") ?? doc.querySelector("main");
  const target = (main?.querySelector("h1") as HTMLElement | null) ?? (main as HTMLElement | null);
  if (!target) return null;
  if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
  target.focus();
  return target;
}

export function RouteAnnouncer() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const last = useRef<string | null>(null);

  useEffect(() => {
    last.current = router.state.location.href;
    return router.subscribe("onResolved", (e) => {
      const href = e.toLocation.href;
      if (href === last.current) return;
      const samePath = e.fromLocation?.pathname === e.toLocation.pathname;
      last.current = href;
      if (samePath) return; // search/hash changes on the same page are not page changes
      // Wait for head() title and any closing menu to return focus first.
      window.setTimeout(() => {
        if (typeof document === "undefined") return;
        const main = document.getElementById("main");
        // Don't steal focus if the person already moved into the new page.
        if (!(main && main.contains(document.activeElement))) {
          window.scrollTo(0, 0);
          focusNewPage();
        }
        setMessage("");
        window.setTimeout(() => typeof document !== "undefined" && setMessage(pageLabel(document.title)), 50);
      }, 150);
    });
  }, [router]);

  return (
    <div role="status" aria-live="polite" aria-atomic="true" className="sr-only" data-testid="route-announcer">
      {message}
    </div>
  );
}
