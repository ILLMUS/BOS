import type { Database } from "@/integrations/supabase/types";

type JobStage = Database["public"]["Enums"]["job_stage"];

export const STAGE_LABELS: Record<JobStage, string> = {
  lead_entry: "Lead Entry",
  lead_qualification: "Lead Qualification",
  site_visit_authorization: "Site Visit Auth",
  site_assessment: "Site Assessment",
  job_scoping: "Job Scoping",
  costing: "Costing",
  quotation_preparation: "Quote Prep",
  quote_submission: "Quote Submission",
  client_approval: "Client Approval",
  fabrication_order: "Production Order",
  fabrication_installation: "Production & Delivery",
  project_closure: "Project Closure",
  pre_flight_check: "Pre-Job Check",
  flight_execution: "Job Execution",
  post_flight_log: "Post-Job Log",
  invoicing: "Invoicing",
};

export const STAGE_ORDER: JobStage[] = [
  "lead_entry",
  "lead_qualification",
  "site_visit_authorization",
  "site_assessment",
  "job_scoping",
  "costing",
  "quotation_preparation",
  "quote_submission",
  "client_approval",
  "fabrication_order",
  "fabrication_installation",
  "invoicing",
  "project_closure",
];

export const ROLE_LABELS: Record<Database["public"]["Enums"]["app_role"], string> = {
  super_admin: "Super Admin",
  lead_handler: "Lead Handler",
  site_assessor: "Site Assessor",
  estimator: "Estimator",
  quotation_officer: "Quotation Officer",
  workshop_manager: "Workshop Manager",
  fabrication_team: "Production Team",
  installation_team: "Installation Team",
  accounts_admin: "Accounts / Admin",
  owner_director: "Owner / Director",
  drone_pilot: "Field Operator",
  operations_manager: "Operations Manager",
  client_manager: "Client Manager",
};

export function getStageIndex(stage: JobStage): number {
  return STAGE_ORDER.indexOf(stage);
}

export function getNextStage(stage: JobStage): JobStage | null {
  const idx = getStageIndex(stage);
  return idx < STAGE_ORDER.length - 1 ? STAGE_ORDER[idx + 1] : null;
}
