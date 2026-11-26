import { describe, expect, it } from "vitest";
import { cleanMine, hasMine } from "./care-card-mine";

describe("care card details entered by the person", () => {
  it("keeps only known text fields and limits length", () => {
    const v = cleanMine({ facility: "Decatur clinic", phone: 5 as unknown as string, notes: "x".repeat(900) });
    expect(v.facility).toBe("Decatur clinic");
    expect(v.phone).toBe("");
    expect(v.notes.length).toBe(400);
    expect(hasMine(v)).toBe(true);
    expect(hasMine(cleanMine({}))).toBe(false);
  });
});
