import { supabase } from "@/integrations/supabase/client";
import { STAGE_LABELS } from "@/lib/constants";

export interface OpsStage {
  id: string;
  job_id: string;
  status: string;
  position: number;
  stage_name: string | null;
  stage: string | null;
  primary_owner_id: string | null;
  secondary_owner_id: string | null;
  sla_started_at: string | null;
  sla_deadline_hours: number | null;
  created_at: string;
  job_number: string;
  client_name: string;
  service_type: string | null;
  job_status: string;
  label: string;
  dueAt: Date | null;
}

export interface TeamMember {
  id: string;
  full_name: string;
  email: string;
}

export const ACTIVE_STAGE_STATUSES = ["active", "pending_approval", "rejected"] as const;

/** Loads every active workflow step across open jobs, with its due date. */
export async function loadActiveStages(): Promise<OpsStage[]> {
  const { data: jobs } = await supabase
    .from("jobs")
    .select("id, job_number, client_name, service_type, status")
    .neq("status", "cancelled");
  const jobList = jobs || [];
  if (!jobList.length) return [];
  const jobMap = new Map(jobList.map((j) => [j.id, j]));

  const { data: stages } = await supabase
    .from("job_stages")
    .select("*")
    .in("job_id", jobList.map((j) => j.id))
    .in("status", ACTIVE_STAGE_STATUSES)
    .order("position");

  return (stages || []).map((s: any) => {
    const job = jobMap.get(s.job_id)!;
    const started = s.sla_started_at ? new Date(s.sla_started_at) : new Date(s.created_at);
    const hours = Number(s.sla_deadline_hours || 0);
    const dueAt = hours > 0 ? new Date(started.getTime() + hours * 3600 * 1000) : null;
    return {
      ...s,
      job_number: job.job_number,
      client_name: job.client_name,
      service_type: job.service_type,
      job_status: job.status,
      label: s.stage_name || (s.stage ? STAGE_LABELS[s.stage as keyof typeof STAGE_LABELS] : "Step"),
      dueAt,
    } as OpsStage;
  });
}

/** Members of the current organisation, used for allocation and sign-off. */
export async function loadTeam(orgId: string): Promise<TeamMember[]> {
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .eq("org_id", orgId)
    .order("full_name");
  return (data || []) as TeamMember[];
}

export function startOfWeek(d: Date) {
  const out = new Date(d);
  const day = (out.getDay() + 6) % 7; // Monday start
  out.setDate(out.getDate() - day);
  out.setHours(0, 0, 0, 0);
  return out;
}

export function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
