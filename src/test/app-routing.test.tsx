import { QueryClient } from "@tanstack/react-query";
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock service boundaries only: keep the real route tree, guards, layouts,
// account hook and page components so a missing Outlet or wrong page fails.
const fixtures = vi.hoisted(() => ({
  user: { id: "00000000-0000-4000-8000-000000000001", email: "smoke@example.test" },
  signedIn: true,
  getUser: vi.fn(),
  rpc: vi.fn(),
  from: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getUser: fixtures.getUser,
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    rpc: fixtures.rpc,
    from: fixtures.from,
  },
}));

vi.mock("@/lib/mfa.functions", () => ({
  mfaStatus: vi.fn(async () => ({ enabled: false, cleared: true })),
  recoveryStatus: vi.fn(async () => ({ remaining: 0, lastUsedAt: null, needsFresh: false })),
  recoveryHistory: vi.fn(async () => ({ events: [] })),
  beginMfa: vi.fn(), completeMfa: vi.fn(), setEmailMfa: vi.fn(),
  createRecoveryCodes: vi.fn(), revokeRecoveryCodes: vi.fn(), redeemRecoveryCode: vi.fn(),
}));

vi.mock("@/lib/appointment-prep.functions", () => ({
  verifyPrepFacts: vi.fn(async () => ({ checks: [] })),
}));

import { routeTree } from "@/routeTree.gen";

// The root route renders a full <html> document, so mount into `document`
// itself (a <div> container can't hold <html>, which left it empty).
async function renderAt(path: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  const router = createRouter({
    routeTree,
    context: { queryClient },
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  clients.push(queryClient);
  await router.load();
  render(<RouterProvider router={router} />, { container: document as unknown as HTMLElement });
  return router;
}

const clients: QueryClient[] = [];

beforeEach(() => {
  // jsdom has no layout engine; provide the browser observer API used by
  // real chart components without replacing those components.
  vi.stubGlobal("ResizeObserver", class {
    observe() {}
    unobserve() {}
    disconnect() {}
  });
  localStorage.clear();
  sessionStorage.clear();
  fixtures.signedIn = true;
  fixtures.getUser.mockImplementation(async () => ({ data: { user: fixtures.signedIn ? fixtures.user : null }, error: null }));
  fixtures.rpc.mockImplementation(async (name: string) => {
    if (name === "is_admin" || name === "claim_first_admin") return { data: true, error: null };
    if (name === "admin_analytics") return { data: {
      total_users: 1, active_users: 1, new_7d: 0, new_30d: 0,
      searches_total: 0, searches_7d: 0, users_with_prefs: 0,
      care_options: 0, care_options_review: 0, top_needs: [], top_locations: [],
      recovery_daily: [], reported_at: "2026-11-10T00:00:00Z",
      signups_period: 0, searches_period: 0, activity_daily: [],
    }, error: null };
    throw new Error(`Unexpected smoke-test RPC: ${name}`);
  });
  fixtures.from.mockImplementation((table: string) => {
    const rows: Record<string, unknown> = {
      user_preferences: { prefs: {} }, search_history: [{
        id: "smoke-history", question: "Test search", reply: "Test answer", results: [],
        created_at: "2026-11-10T00:00:00Z",
      }],
      data_sources: [], api_settings: { id: 1, provider: "grok" },
      audit_log: [], community_check_history: [], link_checks: [],
    };
    if (!(table in rows)) throw new Error(`Unexpected smoke-test table: ${table}`);
    const result = Promise.resolve({ data: rows[table], error: null });
    const chain = Object.assign(result, {
      select: () => chain, order: () => chain, limit: () => chain,
      eq: () => chain, in: () => chain, gte: () => chain, range: () => chain,
      single: () => chain, maybeSingle: () => chain,
    });
    return chain;
  });
});

afterEach(() => {
  cleanup();
  for (const client of clients.splice(0)) client.clear();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const pages = [
  { path: "/", id: "/", title: "VA Navigator | Find Veteran mental-health care" },
  { path: "/auth", id: "/auth", title: "Sign in | VA Navigator" },
  { path: "/reset-password", id: "/reset-password", title: "Set a new password | VA Navigator" },
  { path: "/questionnaire", id: "/questionnaire", title: "Quick questions | VA Navigator" },
  { path: "/appointment-prep", id: "/appointment-prep", title: "Prepare for your appointment | VA Navigator" },
  { path: "/helpful-links", id: "/helpful-links", title: "Helpful links | VA Navigator" },
  { path: "/security", id: "/security", title: "Data storage & security | VA Navigator" },
  { path: "/account", id: "/_authenticated/account", title: "My account | VA Navigator" },
  { path: "/history", id: "/_authenticated/history", title: "My search history | VA Navigator" },
  { path: "/admin", id: "/_authenticated/admin", title: "Admin | VA Navigator" },
] as const;

// Accessible landmarks establish rendered content; route ID and leaf metadata
// distinguish it from the sign-in page, a fallback, or another valid page.
describe("App routing", () => {
  it.each(pages)("renders $path with its real page and shared navigation", async ({ path, id, title }) => {
    const router = await renderAt(path);
    const main = await screen.findByRole("main", {}, { timeout: 5000 });
    expect(within(main).getByRole("heading", { level: 1 })).toBeVisible();
    expect(screen.getByRole("complementary", { name: "Veterans Crisis Line" })).toBeInTheDocument();
    expect(screen.getByRole("navigation")).toBeInTheDocument();
    await waitFor(() => expect(document.title).toBe(title));
    expect(router.state.location.pathname).toBe(path);
    expect(router.state.matches.at(-1)?.routeId).toBe(id);
    expect(router.state.matches.every((match) => match.status === "success")).toBe(true);

    // Wait for meaningful protected-page content, not just a heading while
    // access or data is still loading.
    if (path === "/admin") {
      expect(await within(main).findByRole("tab", { name: "Analytics", selected: true })).toBeVisible();
      expect(await within(main).findByRole("button", { name: /Export summary/ })).toBeVisible();
    }
    if (path === "/history") {
      expect(await within(main).findByRole("link", { name: "Reopen" })).toHaveAttribute("href", "/?h=smoke-history");
    }
    if (path === "/account") {
      expect(await within(main).findByRole("button", { name: "Turn on sign-in codes" })).toBeVisible();
      expect(within(main).getByRole("button", { name: "Sign out" })).toBeVisible();
    }
    if (path === "/auth") expect(within(main).getByRole("textbox", { name: "Email" })).toBeVisible();
    if (path === "/questionnaire") expect(within(main).getAllByRole("group").length).toBeGreaterThan(0);
    if (path === "/appointment-prep") expect(await within(main).findAllByRole("note")).not.toHaveLength(0);
    expect(main).toBeInTheDocument();
    expect(router.state.matches.every((match) => match.status === "success")).toBe(true);
  });

  it("covers every content route in the generated route tree", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });
    const paths = Object.values(router.routesById)
      .filter((route) => route.id !== "__root__" && route.id !== "/_authenticated" && !route.fullPath.startsWith("/api/"))
      .map((route) => route.fullPath).sort();
    expect(paths).toEqual(pages.map((page) => page.path).sort());
  });

  it.each(["/account", "/history", "/admin"])("renders sign-in after a signed-out visit to %s", async (path) => {
    fixtures.signedIn = false;
    const router = await renderAt(path);
    const main = await screen.findByRole("main", {}, { timeout: 5000 });
    expect(within(main).getByRole("textbox", { name: "Email" })).toBeVisible();
    expect(router.state.location.pathname).toBe("/auth");
    expect(router.state.matches.at(-1)?.routeId).toBe("/auth");
  });

  it("renders the not-found route", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    await renderAt("/this-route-does-not-exist");
    expect(await screen.findByRole("heading", { level: 1, name: "404" }, { timeout: 5000 })).toBeInTheDocument();
  });
});
