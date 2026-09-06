import type { Tables, Enums } from "@/integrations/supabase/types";
import { formatCurrency } from "@/lib/currency";

export type Account = Tables<"accounts">;
export type Contact = Tables<"contacts">;
export type Lead = Tables<"leads">;
export type Opportunity = Tables<"opportunities">;
export type Deal = Tables<"deals">;
export type Activity = Tables<"activities">;

export type LifecycleStage = Enums<"lifecycle_stage">;
export type LeadStatus = Enums<"lead_status">;
export type OpportunityStage = Enums<"opportunity_stage">;
export type DealStatus = Enums<"deal_status">;
export type ActivityType = Enums<"activity_type">;

/** PROSPECT -> LEAD -> OPPORTUNITY -> DEAL -> CLIENT -> WORK */
export const LIFECYCLE_ORDER: LifecycleStage[] = ["prospect", "lead", "opportunity", "deal", "client"];

export const LIFECYCLE_LABELS: Record<LifecycleStage, string> = {
  prospect: "Prospect",
  lead: "Lead",
  opportunity: "Opportunity",
  deal: "Deal",
  client: "Client",
  lost: "Lost",
};

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: "New",
  working: "Working",
  qualified: "Qualified",
  disqualified: "Disqualified",
  converted: "Converted",
};

export const OPPORTUNITY_STAGE_LABELS: Record<OpportunityStage, string> = {
  discovery: "Discovery",
  scoping: "Scoping",
  proposal: "Proposal",
  negotiation: "Negotiation",
  won: "Won",
  lost: "Lost",
};

export const DEAL_STATUS_LABELS: Record<DealStatus, string> = {
  open: "Open",
  won: "Won",
  lost: "Lost",
};

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  call: "Call",
  email: "Email",
  meeting: "Meeting",
  note: "Note",
  task: "Task",
  follow_up: "Follow-up",
};

export const LEAD_SOURCES = [
  "Referral",
  "Website",
  "Cold outreach",
  "Social media",
  "Existing client",
  "Walk-in",
  "Other",
];

export function formatMoney(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  return formatCurrency(value);
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}
