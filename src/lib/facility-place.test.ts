import { describe, expect, it } from "vitest";
import { candidatesReply, offeredNames, pickCandidate, placeOf } from "./facility-place";

describe("registered facility given as a place", () => {
  it("reads 'near Decatur, GA' as a place, not a facility name", () => {
    expect(placeOf("my clinic is near Decatur, GA")).toEqual({ city: "Decatur", state: "GA", zip: null });
    expect(placeOf("Decatur, Georgia")).toEqual({ city: "Decatur", state: "GA", zip: null });
    expect(placeOf("the one in 30033")).toEqual({ city: "", state: "", zip: "30033" });
  });
  it("does not treat a facility name as a place", () => {
    expect(placeOf("Atlanta VA Medical Center")).toBeNull();
    expect(placeOf("James A. Haley")).toBeNull();
  });
  it("asks the person to confirm from a numbered list and resolves their pick", () => {
    const reply = candidatesReply({ city: "Decatur", state: "GA", zip: null }, [
      { name: "Atlanta VA Medical Center", address: "1670 Clairmont Road, Decatur, GA 30033", distance_miles: 1.2 },
      { name: "Decatur Vet Center", address: null, distance_miles: 3.4 },
    ]);
    expect(reply).toContain("Which one is yours?");
    const names = offeredNames(reply);
    expect(names).toEqual(["Atlanta VA Medical Center", "Decatur Vet Center"]);
    expect(pickCandidate("2", names)).toBe("Decatur Vet Center");
    expect(pickCandidate("the first one", names)).toBe("Atlanta VA Medical Center");
    expect(pickCandidate("Vet Center", names)).toBe("Decatur Vet Center");
    expect(pickCandidate("none of these", names)).toBe("none");
    expect(pickCandidate("hmm", names)).toBeNull();
  });
});
