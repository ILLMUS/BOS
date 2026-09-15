import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const STAGE_LABELS: Record<string, string> = {
  lead_entry: "Lead Entry",
  lead_qualification: "Lead Qualification",
  site_visit_authorization: "Site Visit Auth",
  site_assessment: "Site Assessment",
  job_scoping: "Job Scoping",
  costing: "Costing",
  quotation_preparation: "Quote Prep",
  quote_submission: "Quote Submission",
  client_approval: "Client Approval",
  fabrication_order: "Fab Order",
  fabrication_installation: "Fab & Install",
  project_closure: "Project Closure",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Find active stages that are overdue
    const { data: overdueStages, error: stagesError } = await supabase
      .from("job_stages")
      .select("id, job_id, stage, primary_owner_id, secondary_owner_id, sla_deadline_hours, sla_started_at")
      .eq("status", "active")
      .not("sla_started_at", "is", null)
      .not("sla_deadline_hours", "is", null);

    if (stagesError) throw stagesError;

    const now = Date.now();
    const overdue = (overdueStages || []).filter((s) => {
      const deadline = new Date(s.sla_started_at).getTime() + s.sla_deadline_hours * 60 * 60 * 1000;
      return now > deadline;
    });

    if (overdue.length === 0) {
      return new Response(JSON.stringify({ message: "No overdue stages" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get all admin user IDs
    const { data: adminRoles } = await supabase
      .from("user_roles")
      .select("user_id")
      .in("role", ["super_admin", "owner_director"]);

    const adminUserIds = [...new Set((adminRoles || []).map((r) => r.user_id))];

    // Get job details for overdue stages
    const jobIds = [...new Set(overdue.map((s) => s.job_id))];
    const { data: jobs } = await supabase
      .from("jobs")
      .select("id, job_number, client_name")
      .in("id", jobIds);

    const jobMap = new Map((jobs || []).map((j) => [j.id, j]));

    // Check recent notifications to avoid duplicates (last 6 hours)
    const sixHoursAgo = new Date(now - 6 * 60 * 60 * 1000).toISOString();
    const { data: recentNotifs } = await supabase
      .from("notifications")
      .select("job_id, type")
      .eq("type", "sla_overdue")
      .gte("created_at", sixHoursAgo);

    const recentOverdueJobIds = new Set((recentNotifs || []).map((n) => n.job_id));

    const notifications: Array<{
      user_id: string;
      job_id: string;
      title: string;
      message: string;
      type: string;
    }> = [];

    for (const stage of overdue) {
      if (recentOverdueJobIds.has(stage.job_id)) continue;

      const job = jobMap.get(stage.job_id);
      if (!job) continue;

      const hoursOverdue = Math.round((now - new Date(stage.sla_started_at).getTime() - stage.sla_deadline_hours * 60 * 60 * 1000) / (1000 * 60 * 60));
      const stageLabel = STAGE_LABELS[stage.stage] || stage.stage;

      const title = `⚠️ SLA Overdue: ${stageLabel}`;
      const message = `Job ${job.job_number} (${job.client_name}) — "${stageLabel}" is overdue by ${hoursOverdue}h. Deadline was ${stage.sla_deadline_hours}h.`;

      // Notify stage owners
      const ownerIds = new Set<string>();
      if (stage.primary_owner_id) ownerIds.add(stage.primary_owner_id);
      if (stage.secondary_owner_id) ownerIds.add(stage.secondary_owner_id);

      // Notify all admins
      for (const adminId of adminUserIds) {
        ownerIds.add(adminId);
      }

      for (const userId of ownerIds) {
        notifications.push({
          user_id: userId,
          job_id: stage.job_id,
          title,
          message,
          type: "sla_overdue",
        });
      }
    }

    if (notifications.length > 0) {
      const { error: insertError } = await supabase.from("notifications").insert(notifications);
      if (insertError) throw insertError;
    }

    return new Response(
      JSON.stringify({ overdue_count: overdue.length, notifications_sent: notifications.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
