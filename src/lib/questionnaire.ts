export type Q = { key: string; label: string; options?: [string, string][]; placeholder?: string; vaOnly?: boolean };
export const QUESTIONS: Q[] = [
  { key: "need", label: "What would you like support with?", options: [["ptsd", "PTSD"], ["depression", "Depression"], ["anxiety", "Anxiety"], ["grief", "Grief"], ["trauma", "Trauma"], ["mst", "Military sexual trauma"], ["substance use", "Substance use"]] },
  { key: "location", label: "Where are you? (City, ST or ZIP)", placeholder: "e.g. Atlanta, GA" },
  { key: "va_vs_community", label: "Where would you like care?", options: [["va", "VA care"], ["community", "Community / civilian provider"], ["both", "Show me both"]] },
  { key: "care_type", label: "One-on-one or a group?", options: [["therapy", "One-on-one therapy"], ["group", "Support group"]] },
  { key: "care_format", label: "How would you like to meet?", options: [["in-person", "In person"], ["telehealth", "Video (telehealth)"], ["phone", "Phone"]] },
  { key: "payment", label: "How would you pay?", options: [["va", "VA benefits"], ["tricare", "TRICARE"], ["medicaid", "Medicaid"], ["medicare", "Medicare"], ["private", "Private insurance"], ["self-pay", "Self-pay"]] },
  { key: "va_applied", label: "Have you applied for VA health care?", options: [["yes", "Yes"], ["no", "No"]], vaOnly: true },
  { key: "va_registered", label: "Are you registered as a patient at a VA facility?", options: [["yes", "Yes"], ["no", "No"], ["unsure", "Not sure"]], vaOnly: true },
  { key: "va_facility", label: "Which VA facility are you registered at?", placeholder: "e.g. Atlanta VA Medical Center, or \"unknown\"", vaOnly: true },
];

/** Questions that apply given the current answers (VA follow-ups only when relevant). */
export function visibleQuestions(a: Record<string, unknown>): Q[] {
  const wantsVa = a["va_vs_community"] === "va" || a["va_vs_community"] === "both";
  return QUESTIONS.filter((q) => !q.vaOnly || wantsVa)
    .filter((q) => q.key !== "va_registered" || a["va_applied"] === "yes")
    .filter((q) => q.key !== "va_facility" || a["va_registered"] === "yes");
}
