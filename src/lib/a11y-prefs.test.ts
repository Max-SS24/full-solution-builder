import { describe, expect, it } from "vitest";
import { CRISIS, readPrefs } from "./a11y-prefs";

describe("display preferences", () => {
  it("falls back to defaults for bad saved values", () => {
    expect(readPrefs('{"text":"huge","contrast":"yes"}')).toEqual({ contrast: false, text: "normal", motion: false });
    expect(readPrefs("not json")).toEqual({ contrast: false, text: "normal", motion: false });
  });
  it("keeps valid saved values", () => {
    expect(readPrefs('{"text":"xlarge","contrast":true}').text).toBe("xlarge");
  });
});

describe("crisis contacts", () => {
  it("uses the official Veterans Crisis Line numbers", () => {
    expect(CRISIS.call.href).toBe("tel:988");
    expect(CRISIS.text.href).toBe("sms:838255");
  });
});
