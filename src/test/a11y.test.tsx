import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { SafetyBar } from "@/components/SafetyBar";
import { chatTriggerKey, handleDialogKeys } from "@/lib/dialog-keys";

// jsdom has no canvas; axe only uses it for an icon-font heuristic.
HTMLCanvasElement.prototype.getContext = (() => null) as never;

async function axeViolations(node: Element) {
  // color-contrast needs real layout, which jsdom does not have.
  const r = await axe.run(node, { rules: { "color-contrast": { enabled: false }, region: { enabled: false } } });
  return r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.html).join(" | ")}`);
}

function ChatDialog({ onClose }: { onClose: () => void }) {
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="t" onKeyDown={(e) => handleDialogKeys(e, e.currentTarget, onClose)}>
      <label id="t" htmlFor="m">Tell us what's going on</label>
      <textarea id="m" />
      <button type="button">Close</button>
      <button type="submit">Send</button>
    </div>
  );
}

describe("chat dialog keyboard rules", () => {
  it("does not open from focus alone, only from Enter, Space or typing", () => {
    expect(chatTriggerKey({ key: "Tab" })).toEqual({ open: false });
    expect(chatTriggerKey({ key: "Shift" })).toEqual({ open: false });
    expect(chatTriggerKey({ key: "Enter" })).toEqual({ open: true, append: "" });
    expect(chatTriggerKey({ key: " " })).toEqual({ open: true, append: "" });
    expect(chatTriggerKey({ key: "I" })).toEqual({ open: true, append: "I" });
    expect(chatTriggerKey({ key: "c", ctrlKey: true })).toEqual({ open: false });
  });

  it("closes on Escape", async () => {
    const onClose = vi.fn();
    render(<ChatDialog onClose={onClose} />);
    screen.getByRole("textbox").focus();
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("keeps Tab and Shift+Tab inside the dialog", async () => {
    render(<><button>Outside</button><ChatDialog onClose={() => {}} /></>);
    screen.getByRole("button", { name: "Send" }).focus();
    await userEvent.tab();
    expect(screen.getByRole("textbox")).toHaveFocus();
    await userEvent.tab({ shift: true });
    expect(screen.getByRole("button", { name: "Send" })).toHaveFocus();
  });

  it("has a named dialog with no axe violations", async () => {
    const { container } = render(<ChatDialog onClose={() => {}} />);
    expect(screen.getByRole("dialog", { name: "Tell us what's going on" })).toBeInTheDocument();
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("crisis support links", () => {
  it("puts Skip to main content first, then the 988 call link", async () => {
    render(<SafetyBar />);
    await userEvent.tab();
    expect(screen.getByRole("button", { name: "Skip to main content" })).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByRole("link", { name: "Dial 988, press 1" })).toHaveAttribute("href", "tel:988");
    expect(screen.getByRole("link", { name: "Dial 988, press 1" })).toHaveFocus();
  });

  it("skip link moves focus to main content", async () => {
    render(<><SafetyBar /><main><h1>Page</h1></main></>);
    await userEvent.click(screen.getByRole("button", { name: "Skip to main content" }));
    expect(screen.getByRole("main")).toHaveFocus();
  });

  it("help panel lists every crisis option with clear names", async () => {
    render(<SafetyBar />);
    await userEvent.click(screen.getByRole("button", { name: "More ways to get help" }));
    const panel = await screen.findByRole("dialog", { name: "Veterans Crisis Line" });
    const hrefs = within(panel).getAllByRole("link").map((a) => a.getAttribute("href"));
    expect(hrefs).toEqual(expect.arrayContaining(["tel:988", "sms:838255", "tel:711", "tel:911"]));
    expect(within(panel).getByRole("link", { name: /Chat online \(opens in a new tab\)/ })).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("crisis strip has no axe violations", async () => {
    const { container } = render(<SafetyBar />);
    expect(await axeViolations(container)).toEqual([]);
  });
});
