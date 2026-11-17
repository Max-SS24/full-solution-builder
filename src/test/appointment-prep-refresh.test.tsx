import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppointmentPrep } from "@/components/AppointmentPrep";
import { PREP_FACTS, type PrepCheck } from "@/lib/appointment-prep";

const { verify } = vi.hoisted(() => ({ verify: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/lib/appointment-prep.functions", () => ({ verifyPrepFacts: verify }));
vi.mock("@/lib/guidance-reports.functions", () => ({ submitGuidanceReport: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: () => ({ select: () => ({ in: async () => ({ data: [] }) }) }) } }));

describe("appointment prep background refresh", () => {
  const now = new Date("2026-11-17T19:00:00Z");
  const checks = (checkedAt = now.toISOString()): PrepCheck[] => PREP_FACTS.map((fact) => ({ id: fact.id, ok: true, checkedAt }));
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(now); verify.mockReset(); });
  afterEach(() => { cleanup(); vi.useRealTimers(); });

  it("keeps checked questions and an open report draft during and after the minute refresh", async () => {
    verify.mockResolvedValueOnce({ checks: checks() });
    let finish: ((value: { checks: PrepCheck[] }) => void) | undefined;
    verify.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    await act(async () => { render(<AppointmentPrep stage={null} />); });
    const question = screen.getByRole("checkbox", { name: "Can you review whether I meet the requirements for community care?" });
    fireEvent.click(question);
    fireEvent.click(screen.getByRole("button", { name: "Report an issue with guidance: elig-basic" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Details (optional)" }), { target: { value: "Please review this guidance." } });
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
    expect(verify).toHaveBeenCalledTimes(2);
    expect(question).toBeChecked();
    expect(screen.getByRole("dialog", { name: "Report appointment guidance" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Details (optional)" })).toHaveValue("Please review this guidance.");
    await act(async () => { finish?.({ checks: checks(new Date().toISOString()) }); });
    expect(question).toBeChecked();
    expect(screen.getByRole("textbox", { name: "Details (optional)" })).toHaveValue("Please review this guidance.");
  });

  it("withholds expired evidence during refresh and restores the selected question after confirmation", async () => {
    verify.mockResolvedValueOnce({ checks: checks(new Date(now.getTime() - 59.5 * 60_000).toISOString()) });
    let finish: ((value: { checks: PrepCheck[] }) => void) | undefined;
    verify.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    await act(async () => { render(<AppointmentPrep stage={null} />); });
    const name = "Can you review whether I meet the requirements for community care?";
    fireEvent.click(screen.getByRole("checkbox", { name }));
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
    expect(screen.queryByText(PREP_FACTS[0]?.finding ?? "missing fact")).not.toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name })).not.toBeInTheDocument();
    await act(async () => { finish?.({ checks: checks(new Date().toISOString()) }); });
    expect(screen.getByRole("checkbox", { name })).toBeChecked();
  });
});