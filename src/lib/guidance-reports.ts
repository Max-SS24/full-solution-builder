import { z } from "zod";
import { PREP_FACTS } from "./appointment-prep";

export const REPORT_REASONS = {
  outdated: "Seems outdated",
  inaccurate: "Seems inaccurate",
  source_mismatch: "Doesn't match the VA.gov source",
} as const;

export const guidanceReportSchema = z.object({
  factId: z.string().refine((id) => PREP_FACTS.some((f) => f.id === id), "Choose an appointment guidance item."),
  reason: z.enum(["outdated", "inaccurate", "source_mismatch"]),
  details: z.string().trim().max(1000, "Keep your report under 1,000 characters."),
});

export function guidanceReportRow(input: unknown) {
  const data = guidanceReportSchema.parse(input);
  const fact = PREP_FACTS.find((f) => f.id === data.factId);
  if (!fact) throw new Error("Unknown guidance item.");
  return { fact_id: fact.id, finding: fact.finding, source_url: fact.sourceUrl, reason: data.reason, details: data.details };
}