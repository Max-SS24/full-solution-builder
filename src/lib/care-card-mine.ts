/** Details a person types into their own Care Card when we can't confirm them. Kept only on this device. */
export type MyCardDetails = { facility: string; address: string; phone: string; appointment: string; notes: string };
export const EMPTY_MINE: MyCardDetails = { facility: "", address: "", phone: "", appointment: "", notes: "" };
export const MINE_KEY = "van_card_mine";
export const MINE_LABEL = "Entered by you — not verified by VA Navigator";

export function cleanMine(v: Partial<Record<keyof MyCardDetails, unknown>> | null | undefined): MyCardDetails {
  const out = { ...EMPTY_MINE };
  for (const k of Object.keys(EMPTY_MINE) as (keyof MyCardDetails)[]) {
    const raw = v?.[k];
    out[k] = typeof raw === "string" ? raw.replace(/[\u0000-\u001f]/g, " ").slice(0, k === "notes" ? 400 : 160) : "";
  }
  return out;
}
export const hasMine = (v: MyCardDetails) => Object.values(v).some((x) => x.trim().length > 0);
export function loadMine(): MyCardDetails {
  try { return cleanMine(JSON.parse(sessionStorage.getItem(MINE_KEY) ?? "null")); } catch { return { ...EMPTY_MINE }; }
}
export function saveMine(v: MyCardDetails) {
  try { if (hasMine(v)) sessionStorage.setItem(MINE_KEY, JSON.stringify(cleanMine(v))); else sessionStorage.removeItem(MINE_KEY); } catch { /* storage off */ }
}
