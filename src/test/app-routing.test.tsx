import { QueryClient } from "@tanstack/react-query";
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { routeTree } from "@/routeTree.gen";

// The root route renders a full <html> document, so mount into `document`
// itself (a <div> container can't hold <html>, which left it empty).
function renderAt(path: string) {
  const queryClient = new QueryClient();
  const router = createRouter({
    routeTree,
    context: { queryClient },
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  return render(<RouterProvider router={router} />, { container: document as unknown as HTMLElement });
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// Use landmarks and roles, not copy, so routine text edits keep these passing.
describe("App routing", () => {
  it("renders the index route", async () => {
    renderAt("/");
    await new Promise((r) => setTimeout(r, 1500));
    console.log("DBG", document.documentElement.outerHTML.slice(0, 1500));
    expect(await screen.findByRole("main", {}, { timeout: 5000 })).toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: "Veterans Crisis Line" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
  });

  it("renders the not-found route", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    renderAt("/this-route-does-not-exist");
    expect(await screen.findByRole("heading", { level: 1, name: "404" }, { timeout: 5000 })).toBeInTheDocument();
  });
});
