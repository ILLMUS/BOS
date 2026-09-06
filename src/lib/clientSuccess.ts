import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Ticket = Tables<"support_tickets">;
export type Feedback = Tables<"client_feedback">;
export type Reminder = Tables<"client_reminders">;

export const TICKET_STATUSES = ["open", "in_progress", "waiting_client", "resolved", "closed"] as const;
export const TICKET_PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export const TICKET_CATEGORIES = ["general", "fault", "warranty", "request", "billing"] as const;
export const FEEDBACK_TYPES = ["survey", "review", "complaint", "compliment"] as const;
export const REMINDER_TYPES = ["maintenance", "renewal", "inspection", "check_in"] as const;
export const REMINDER_STATUSES = ["scheduled", "done", "cancelled"] as const;

export const OPEN_TICKET_STATUSES = ["open", "in_progress", "waiting_client"];

export function label(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function priorityVariant(p: string): "default" | "secondary" | "destructive" | "outline" {
  if (p === "urgent" || p === "high") return "destructive";
  if (p === "medium") return "secondary";
  return "outline";
}

export function addMonths(date: string, months: number) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

export async function loadClientAccounts() {
  const { data } = await supabase.from("accounts").select("id, name, lifecycle_stage").order("name");
  return data || [];
}

export async function loadJobsLite() {
  const { data } = await supabase
    .from("jobs")
    .select("id, job_number, client_name, account_id, tracking_token, status, current_stage, created_at")
    .order("created_at", { ascending: false });
  return data || [];
}
