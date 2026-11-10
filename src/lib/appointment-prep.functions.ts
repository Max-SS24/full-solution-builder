import { createServerFn } from "@tanstack/react-start";

// Public: takes no input and only fetches the fixed, allowlisted VA.gov sources.
export const verifyPrepFacts = createServerFn({ method: "POST" }).handler(async () => {
  const { currentPrepChecks } = await import("./appointment-prep.server");
  return { checks: await currentPrepChecks() };
});
