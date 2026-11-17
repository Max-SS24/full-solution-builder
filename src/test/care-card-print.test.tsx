import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CareCard } from "@/components/CareCard";
import { PREP_FACTS } from "@/lib/appointment-prep";

const { verify } = vi.hoisted(() => ({ verify: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/lib/appointment-prep.functions", () => ({ verifyPrepFacts: verify }));
afterEach(() => { cleanup(); vi.restoreAllMocks(); verify.mockReset(); });

describe("care card printing", () => {
  it("rechecks guidance before printing a card with facility contact details", async () => {
    verify.mockResolvedValue({ checks: PREP_FACTS.map((fact) => ({ id: fact.id, ok: true, checkedAt: new Date().toISOString() })) });
    const print = vi.spyOn(window, "print").mockImplementation(() => {});
    render(<CareCard facility={{ name: "Test VA facility", address: "123 Test Road", phone: "555-0100", url: "https://www.va.gov/", found: true }} results={[]} stage={"registered"} facilityUnknown={false} />);
    await waitFor(() => expect(verify).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole("button", { name: "Print or save as PDF" }));
    await waitFor(() => expect(print).toHaveBeenCalledTimes(1));
    expect(verify).toHaveBeenCalledTimes(2);
    expect(screen.getByText("123 Test Road")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "555-0100" })).toHaveAttribute("href", "tel:555-0100");
  });

  it("withholds guidance when the pre-print evidence check fails", async () => {
    verify.mockResolvedValueOnce({ checks: PREP_FACTS.map((fact) => ({ id: fact.id, ok: true, checkedAt: new Date().toISOString() })) }).mockRejectedValueOnce(new Error("Unavailable"));
    const print = vi.spyOn(window, "print").mockImplementation(() => {});
    render(<CareCard facility={null} results={[]} stage={null} facilityUnknown={false} />);
    await waitFor(() => expect(verify).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole("button", { name: "Print or save as PDF" }));
    await waitFor(() => expect(print).toHaveBeenCalledTimes(1));
    expect(screen.getByText(/Current appointment steps are not confirmed/)).toBeInTheDocument();
    for (const fact of PREP_FACTS.filter((fact) => fact.topic === "referral")) expect(screen.queryByText(fact.finding)).not.toBeInTheDocument();
  });
});