/** Display preferences (high contrast, text size), kept in this browser only. */
export const A11Y_KEY = "van_a11y";
export const TEXT_SIZES = ["normal", "large", "xlarge"] as const;
export type TextSize = (typeof TEXT_SIZES)[number];
export type A11yPrefs = { contrast: boolean; text: TextSize; motion: boolean };
export const DEFAULT_PREFS: A11yPrefs = { contrast: false, text: "normal", motion: false };

export function readPrefs(raw: string | null): A11yPrefs {
  try {
    const p = JSON.parse(raw ?? "{}") as Partial<A11yPrefs>;
    return {
      contrast: p.contrast === true,
      text: TEXT_SIZES.includes(p.text as TextSize) ? (p.text as TextSize) : "normal",
      motion: p.motion === true,
    };
  } catch { return DEFAULT_PREFS; }
}

export function applyPrefs(p: A11yPrefs, el: HTMLElement = document.documentElement) {
  el.dataset.contrast = p.contrast ? "high" : "normal";
  el.dataset.text = p.text;
  el.dataset.motion = p.motion ? "reduce" : "normal";
}

/** Runs in <head> before paint so the saved look shows without a flash. */
export const PREFS_BOOT_SCRIPT = `try{var p=JSON.parse(localStorage.getItem("${A11Y_KEY}")||"{}"),d=document.documentElement;d.dataset.contrast=p.contrast?"high":"normal";d.dataset.text=["large","xlarge"].indexOf(p.text)>-1?p.text:"normal";d.dataset.motion=p.motion?"reduce":"normal"}catch(e){}`;

/** Official Veterans Crisis Line contacts (veteranscrisisline.net). */
export const CRISIS = {
  call: { label: "Call 988, then press 1", href: "tel:988" },
  text: { label: "Text 838255", href: "sms:838255" },
  chat: { label: "Chat online", href: "https://www.veteranscrisisline.net/get-help-now/chat/" },
  tty: { label: "Deaf or hard of hearing: TTY 711, then 988", href: "tel:711" },
  emergency: { label: "Emergency: call 911", href: "tel:911" },
} as const;
