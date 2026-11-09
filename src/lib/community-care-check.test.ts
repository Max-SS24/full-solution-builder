import { beforeEach, expect, it, vi } from "vitest";
const ft = vi.hoisted(() => vi.fn());
vi.mock("./connectors.server", () => ({ findTreatment: ft }));
import { checkCommunityCare } from "./community-care-check.server";
const provider = { external_id: "npi-1234567890", city: "Atlanta", state: "GA", data_sources: { name: "Registry", connector: "npi" } };
beforeEach(() => { vi.clearAllMocks(); vi.unstubAllGlobals(); });
it("treats active NPI registration as insufficient proof of ongoing care", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ results: [{ number: 1234567890, basic: { status: "A" } }] })));
  expect((await checkCommunityCare(provider)).status).toBe("unconfirmed");
});
it("recognizes explicit deactivated registration", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ results: [{ number: 1234567890, basic: { status: "D" } }] })));
  expect((await checkCommunityCare(provider)).status).toBe("inactive_registration");
});
it("does not call a missing registry record a closure", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ result_count: 0, results: [] })));
  expect((await checkCommunityCare(provider)).status).toBe("unconfirmed");
});
it("returns uncertainty on official source failures", async () => {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("timeout")));
  expect((await checkCommunityCare(provider)).status).toBe("unconfirmed");
});
it("confirms services listed by the treatment directory", async () => {
  ft.mockResolvedValue([{ id: "ft-provider" }]);
  expect((await checkCommunityCare({ ...provider, external_id: "ft-provider", data_sources: { name: "Treatment", connector: "findtreatment" } })).status).toBe("listed");
});
it("does not infer closure from capped treatment search absence", async () => {
  ft.mockResolvedValue([]);
  expect((await checkCommunityCare({ ...provider, external_id: "ft-provider", data_sources: { name: "Treatment", connector: "findtreatment" } })).status).toBe("unconfirmed");
});