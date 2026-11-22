import { describe, expect, it } from "vitest";
import { basicMatch, type MatchCandidate } from "./basic-match";

const c = (id: string, o: Partial<MatchCandidate>): MatchCandidate => ({ id, name: id, kind: "Counselor", payment: [], bio: "", needs: [], care_types: [], formats: [], veteran_focus: false, ...o });

describe("basicMatch (guest provider comparison without AI)", () => {
  const list = [
    c("A", { bio: "Works with veterans on PTSD and trauma.", veteran_focus: true, payment: ["TRICARE"] }),
    c("B", { bio: "Couples counseling.", payment: ["Medicaid"] }),
    c("C", { needs: ["anxiety"], formats: ["telehealth"] }),
  ];
  it("ranks the listing that mentions what matters most first", () => {
    const r = basicMatch("a veteran who gets PTSD, takes tricare", list, "TRICARE");
    expect(r.matches[0]?.name).toBe("A");
    expect(r.matches[0]?.fit).toBe("strong");
    expect(r.matches[0]?.why).toMatch(/veteran focus/);
  });
  it("maps everyday words like video to listing words", () => {
    expect(basicMatch("video visits for anxiety", list, null).matches[0]?.name).toBe("C");
  });
  it("never invents matches when nothing overlaps", () => {
    const r = basicMatch("horseback riding", list, null);
    expect(r.matches).toHaveLength(0);
    expect(r.summary).toMatch(/None of these listings/);
  });
  it("tells people to confirm unlisted insurance", () => {
    expect(basicMatch("anxiety", list, "Medicare").matches[0]?.why).toMatch(/call and confirm/);
  });
});
