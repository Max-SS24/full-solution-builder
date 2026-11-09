import { describe, expect, it } from "vitest";
import { communityHomepage, providerHomepage } from "./care-links";
import { toOptionRow } from "./care-rules";

describe("community website links", () => {
  it("links to the provider main page separately from its directory source", () => {
    expect(communityHomepage({ kind: "Treatment center", provider_website: "https://provider.example/locations/atlanta?ref=directory", source_url: "https://findtreatment.gov/locator" })).toBe("https://provider.example/");
  });
  it("supports source-supplied websites without a scheme", () => {
    expect(providerHomepage("www.provider.example/contact")).toBe("https://www.provider.example/");
  });
  it("never substitutes a directory or invented website for a missing clinician website", () => {
    expect(communityHomepage({ kind: "Private practice", source_url: "https://npiregistry.cms.hhs.gov/provider-view/1234567890" })).toBeNull();
  });
  it("recovers provider homepages from older saved results", () => {
    expect(communityHomepage({ kind: "Treatment center", source_url: "https://provider.example/clinic" })).toBe("https://provider.example/");
  });
  it("does not add community website links to VA results", () => {
    expect(communityHomepage({ kind: "VA Clinic", provider_website: "https://provider.example/", source_url: "https://www.va.gov/" })).toBeNull();
  });
  it("rejects unsafe or nonpublic links", () => {
    for (const url of ["javascript:alert(1)", "https://127.0.0.1", "http://localhost", "https://user:pass@provider.example", "https://[::1]/"]) expect(providerHomepage(url)).toBeNull();
  });
  it("persists the provider website without replacing the verification source", () => {
    const row = toOptionRow({ id: "ft-test", name: "Provider", kind: "Treatment center", city: "Atlanta", state: "GA", formats: [], needs: [], care_types: [], payment: [], veteran_focus: false, phone: null, source_url: "https://findtreatment.gov/locator", provider_website: "https://provider.example/contact", verified: true, last_checked: "2026-11-09", source_name: "FindTreatment.gov" }, "source-id");
    expect(row.website).toBe("https://findtreatment.gov/locator");
    expect(row.provider_website).toBe("https://provider.example/");
  });
});