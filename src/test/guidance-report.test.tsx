import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GuidanceReport } from "@/components/GuidanceReport";
import { PREP_FACTS } from "@/lib/appointment-prep";

const { submit } = vi.hoisted(() => ({ submit: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: () => submit }));
vi.mock("@/lib/guidance-reports.functions", () => ({ submitGuidanceReport: vi.fn() }));

describe("guidance report flow", () => {
  beforeEach(() => submit.mockReset());
  function mount() {
    const fact = PREP_FACTS[0];
    if (!fact) throw new Error("Missing fixture");
    render(<GuidanceReport fact={fact} />);
  }
  it("opens by keyboard, submits the selected fact, and returns focus on close", async () => {
    submit.mockResolvedValue({ saved: true });
    mount();
    const trigger = screen.getByRole("button", { name: /Report an issue with guidance/ });
    trigger.focus(); await userEvent.keyboard("{Enter}");
    const dialog = screen.getByRole("dialog", { name: "Report appointment guidance" });
    await userEvent.selectOptions(within(dialog).getByRole("combobox", { name: "What seems wrong?" }), "inaccurate");
    await userEvent.type(within(dialog).getByRole("textbox", { name: "Details (optional)" }), "Please check the source.");
    await userEvent.click(within(dialog).getByRole("button", { name: "Send report" }));
    expect(submit).toHaveBeenCalledWith({ data: { factId: "elig-basic", reason: "inaccurate", details: "Please check the source." } });
    expect(await screen.findByRole("status")).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
  it("keeps the report available to retry after a failed save", async () => {
    submit.mockRejectedValue(new Error("offline"));
    mount();
    await userEvent.click(screen.getByRole("button", { name: /Report an issue with guidance/ }));
    await userEvent.type(screen.getByRole("textbox", { name: "Details (optional)" }), "Review this.");
    await userEvent.click(screen.getByRole("button", { name: "Send report" }));
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Details (optional)" })).toHaveValue("Review this.");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});