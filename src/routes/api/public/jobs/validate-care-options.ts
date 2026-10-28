import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

export const Route = createFileRoute("/api/public/jobs/validate-care-options")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authFailure = await authenticateCronRequest(request);
        if (authFailure) return authFailure;
        const body = (await request.json().catch(() => ({}))) as { part?: string };
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
        const [result, links] = await Promise.all([validateAll(), checkHelpfulLinks()]);
        return Response.json({ success: true, ...result, ...links });
      },
    },
  },
});
