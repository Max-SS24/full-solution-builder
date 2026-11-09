import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn() }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: mocks }));
import { validateCommunityHomepageBatch } from "./weekly-homepage-checks.server";

type Row = { id: string; kind: string; website: string; provider_website: string | null };
function setup(rows: Row[]) {
  const query = { select: vi.fn(), eq: vi.fn(), in: vi.fn(), or: vi.fn(), order: vi.fn(), limit: vi.fn() };
  for (const fn of [query.select, query.eq, query.in, query.or, query.order]) fn.mockReturnValue(query);
  query.limit.mockResolvedValue({ data: rows, error: null });
  const writes: { id: string; patch: Record<string, unknown> }[] = [];
  mocks.from.mockImplementation(() => ({ ...query, update: (patch: Record<string, unknown>) => ({ eq: async (_: string, id: string) => { writes.push({ id, patch }); return { error: null }; } }) }));
  mocks.rpc.mockResolvedValue({ error: null });
  const fetcher = vi.fn<typeof fetch>(async (input) => {
    const url = String(input);
    if (url.startsWith("https://dns.google/")) return Response.json({ Answer: [{ type: 1, data: "93.184.216.34" }] });
    if (url.includes("redirect.example")) return new Response(null, { status: 302, headers: { location: "https://foreign.example/" } });
    return new Response(null, { status: url.includes("missing.example") ? 404 : 200 });
  });
  vi.stubGlobal("fetch", fetcher);
  return { query, writes, fetcher };
}
const row = (id: string, provider_website: string | null): Row => ({ id, kind: "Community Clinic", website: "https://findtreatment.gov/", provider_website });

beforeEach(() => { vi.clearAllMocks(); vi.unstubAllGlobals(); });
describe("weekly community homepage verification", () => {
  it("persists working and unavailable website outcomes without changing care availability", async () => {
    const { writes } = setup([row("working", "https://working.example"), row("missing", "https://missing.example")]);
    expect(await validateCommunityHomepageBatch()).toMatchObject({ homepages_checked: 2, working: 1, unavailable: 1 });
    expect(writes.find((w) => w.id === "missing")?.patch.homepage_check).toMatchObject({ url: "https://missing.example/", status: "unavailable" });
    for (const { patch } of writes) expect(Object.keys(patch).sort()).toEqual(["homepage_check", "homepage_checked_at"]);
  });
  it("persists unexpected redirects without visiting foreign websites", async () => {
    const { writes, fetcher } = setup([row("redirect", "https://redirect.example")]);
    expect(await validateCommunityHomepageBatch()).toMatchObject({ unexpected_redirect: 1 });
    expect(writes[0]?.patch.homepage_check).toMatchObject({ status: "unexpected_redirect", redirectedTo: "foreign.example" });
    expect(fetcher.mock.calls.some(([url]) => String(url).startsWith("https://foreign.example"))).toBe(false);
  });
  it("uses Sunday boundaries, enabled sources, active/review rows and bounded batches", async () => {
    const { query } = setup([]);
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-09T03:45:00Z"));
    try {
      await validateCommunityHomepageBatch();
      expect(query.or).toHaveBeenCalledWith("homepage_checked_at.is.null,homepage_checked_at.lt.2026-11-08T00:00:00.000Z");
      expect(query.eq).toHaveBeenCalledWith("data_sources.enabled", true);
      expect(query.in).toHaveBeenCalledWith("status", ["active", "needs_review"]);
      expect(query.limit).toHaveBeenCalledWith(40);
    } finally { vi.useRealTimers(); }
  });
  it("never invents a missing homepage and checks shared websites only once", async () => {
    const { fetcher, writes } = setup([row("none", null), row("a", "https://working.example"), row("b", "https://working.example")]);
    expect(await validateCommunityHomepageBatch()).toMatchObject({ processed: 3, no_homepage: 1, working: 2 });
    expect(fetcher).toHaveBeenCalledTimes(2); // One DNS lookup and one homepage request.
    expect(writes.find((w) => w.id === "none")?.patch.homepage_check).toBeNull();
  });
});