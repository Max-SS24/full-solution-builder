import { createServerFn } from "@tanstack/react-start";
import { guidanceReportRow, guidanceReportSchema } from "./guidance-reports";

// Public feedback: fixed fact IDs only; no caller-supplied URLs or account data.
export const submitGuidanceReport = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => guidanceReportSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("appointment_guidance_reports").insert(guidanceReportRow(data));
    if (error) throw new Error("Your report couldn't be saved. Please try again.");
    return { saved: true };
  });