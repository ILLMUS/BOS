import { supabase } from "@/integrations/supabase/client";

/**
 * Translates raw job-creation database errors into user-friendly messages,
 * and records the failure in the audit log so admins can trace it.
 */
export function friendlyJobCreateError(err: unknown): string {
  const msg = (err as { message?: string })?.message || "";
  const code = (err as { code?: string })?.code || "";

  if (code === "23505" || msg.includes("jobs_job_number_key") || msg.toLowerCase().includes("duplicate key")) {
    return "The system could not assign a job number. This is usually temporary — please try again. If it keeps happening, contact an admin.";
  }
  if (msg.includes("template") && msg.toLowerCase().includes("no stages")) {
    return "The selected workflow has no steps yet. Add steps in the SOP Builder first.";
  }
  if (code === "42501" || msg.toLowerCase().includes("permission denied") || msg.toLowerCase().includes("row-level security")) {
    return "You don't have permission to create jobs in this workspace.";
  }
  return msg || "Something went wrong while creating the job. Please try again.";
}

interface LogContext {
  userId?: string | null;
  orgId?: string | null;
  clientName?: string;
  templateId?: string | null;
  dealId?: string | null;
  source: "new_job_page" | "start_work_dialog";
}

/** Fire-and-forget audit log entry for a failed job creation. */
export async function logJobCreateFailure(err: unknown, ctx: LogContext) {
  try {
    await supabase.from("audit_log").insert({
      user_id: ctx.userId || null,
      org_id: ctx.orgId || null,
      job_id: null,
      action: "job_create_failed",
      details: {
        error_code: (err as { code?: string })?.code || null,
        error_message: (err as { message?: string })?.message || String(err),
        client_name: ctx.clientName || null,
        template_id: ctx.templateId || null,
        deal_id: ctx.dealId || null,
        source: ctx.source,
        occurred_at: new Date().toISOString(),
      },
    } as any);
  } catch {
    // Logging must never break the user flow
  }
}
