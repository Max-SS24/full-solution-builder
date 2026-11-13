import { createServerFn } from "@tanstack/react-start";

// Public: only fetches the fixed, allowlisted VA.gov sources. `force` asks for a fresh
// check now; the server throttles it so visitors can't hammer VA.gov.
export const verifyPrepFacts = createServerFn({ method: "POST" })
  .inputValidator((d: { force?: boolean } | undefined) => ({ force: d?.force === true }))
  .handler(async ({ data }) => {
    const { currentPrepChecks } = await import("./appointment-prep.server");
    return { checks: await currentPrepChecks(data.force) };
  });
