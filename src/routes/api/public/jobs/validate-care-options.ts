import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

export const Route = createFileRoute("/api/public/jobs/validate-care-options")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authFailure = await authenticateCronRequest(request);
        if (authFailure) return authFailure;
        const body = (await request.json().catch(() => ({}))) as { part?: string };
        if (body.part === "community-homepages") {
          const { validateCommunityHomepageBatch } = await import("@/lib/weekly-homepage-checks.server");
          return Response.json({ success: true, ...(await validateCommunityHomepageBatch()) });
        }
        if (body.part === "va-discover") {
          const { discoverVaFacilities } = await import("@/lib/care-options.server");
          return Response.json({ success: true, ...(await discoverVaFacilities()) });
        }
        if (body.part === "va") {
          const { validateVaBatch } = await import("@/lib/care-options.server");
          return Response.json({ success: true, ...(await validateVaBatch()) });
        }
        const { validateAll } = await import("@/lib/care-options.server");
        const { checkHelpfulLinks } = await import("@/lib/link-checks.server");
        const { checkPrepFacts } = await import("@/lib/appointment-prep.server");
        const [result, links, prep] = await Promise.all([validateAll(), checkHelpfulLinks(), checkPrepFacts()]);
        return Response.json({ success: true, ...result, ...links, ...prep });
      },
    },
  },
});
