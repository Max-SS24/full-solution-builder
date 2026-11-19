import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

export const Route = createFileRoute("/api/public/jobs/a11y-audit")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authFailure = await authenticateCronRequest(request);
        if (authFailure) return authFailure;
        const { runServerA11yAudit } = await import("@/lib/a11y-audit.server");
        return Response.json({ success: true, ...(await runServerA11yAudit(new URL(request.url).origin)) });
      },
    },
  },
});
