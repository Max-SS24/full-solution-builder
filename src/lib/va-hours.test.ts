import { describe, expect, it } from "vitest";
import { formatHours } from "./va-hours";

const d = (day: string, opens: string, closes: string) => ({ dayOfWeek: `https://schema.org/${day}`, opens, closes });

describe("formatHours", () => {
  it("groups weekdays and closed weekends", () => {
    const specs = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].map((x) => d(x, "07:30:00", "16:00:00"));
    specs.push(d("Saturday", "", ""), d("Sunday", "", ""));
    expect(formatHours(specs)).toBe("Mon–Fri 7:30 AM–4:00 PM · Sat–Sun Closed");
  });
  it("returns null when every day is blank", () => {
    expect(formatHours([d("Monday", "", "")])).toBeNull();
    expect(formatHours(undefined)).toBeNull();
  });
});
