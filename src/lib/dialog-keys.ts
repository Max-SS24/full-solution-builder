// Keyboard rules for the chat message dialog (WCAG 2.1.2, 2.4.3, 3.2.1).

const FOCUSABLE = "button:not([disabled]), textarea, a[href], input:not([disabled])";

type KeyLike = { key: string; shiftKey?: boolean; preventDefault: () => void };

/** Escape closes; Tab / Shift+Tab wrap inside the dialog. */
export function handleDialogKeys(e: KeyLike, container: HTMLElement, onClose: () => void) {
  if (e.key === "Escape") { e.preventDefault(); onClose(); return; }
  if (e.key !== "Tab") return;
  const items = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE));
  if (!items.length) return;
  const first = items[0]!, last = items[items.length - 1]!;
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
}

/** What a key press on the closed chat box should do. Focus alone never opens it. */
export function chatTriggerKey(e: { key: string; ctrlKey?: boolean; metaKey?: boolean; altKey?: boolean }):
  | { open: false }
  | { open: true; append: string } {
  if (e.key === "Enter" || e.key === " ") return { open: true, append: "" };
  if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) return { open: true, append: e.key };
  return { open: false };
}
