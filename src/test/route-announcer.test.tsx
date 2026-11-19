import { act, render, screen, waitFor } from "@testing-library/react";
import { createMemoryHistory, createRootRoute, createRoute, createRouter, Link, Outlet, RouterProvider } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";
import { RouteAnnouncer, pageLabel } from "@/components/RouteAnnouncer";

function setup() {
  const root = createRootRoute({ component: () => (<><RouteAnnouncer /><Link to="/helpful-links">Go B</Link><Outlet /></>) });
  const a = createRoute({ getParentRoute: () => root, path: "/", component: () => <main id="main"><h1>Page A</h1></main> });
  const b = createRoute({ getParentRoute: () => root, path: "/helpful-links", component: () => { document.title = "Helpful links | VA Navigator"; return <main id="main"><h1>Page B</h1></main>; } });
  const router = createRouter({ routeTree: root.addChildren([a, b]), history: createMemoryHistory({ initialEntries: ["/"] }) });
  render(<RouterProvider router={router} />);
  return router;
}

describe("route announcer", () => {
  it("labels pages from the title", () => {
    expect(pageLabel("Helpful links | VA Navigator")).toBe("Helpful links page loaded");
  });

  it("announces and focuses the new page after navigation, and on back", async () => {
    const router = setup();
    await screen.findByText("Page A");
    expect(screen.getByTestId("route-announcer").textContent).toBe("");
    await act(async () => { screen.getByText("Go B").click(); });
    await waitFor(() => expect(screen.getByTestId("route-announcer").textContent).toBe("Helpful links page loaded"));
    expect(document.activeElement?.textContent).toBe("Page B");
    document.title = "Home | VA Navigator";
    await act(async () => { router.history.back(); });
    await waitFor(() => expect(document.activeElement?.textContent).toBe("Page A"));
  });
});
