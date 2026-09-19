import type { Database } from "@/integrations/supabase/types";

type JobStageEnum = Database["public"]["Enums"]["job_stage"];

interface RequiredField {
  key: string;
  label: string;
  /** "checkbox" requires === true; default checks for non-empty value */
  type?: "checkbox" | "value";
}

/**
 * Required fields per stage. Mirrors the `required` props on each
 * StageField inside the stage form components. Keep in sync if forms change.
 */
export const STAGE_REQUIRED_FIELDS: Record<JobStageEnum, RequiredField[]> = {
  lead_entry: [
    { key: "lead_source", label: "Lead Source" },
    { key: "urgency", label: "Urgency Level" },
  ],
  lead_qualification: [
    { key: "in_scope", label: "Service is within our scope", type: "checkbox" },
    { key: "location_serviceable", label: "Location is serviceable", type: "checkbox" },
    { key: "decision", label: "Qualification Decision" },
  ],
  site_visit_authorization: [
    { key: "authorized", label: "Site visit authorized", type: "checkbox" },
    { key: "visit_date", label: "Scheduled Visit Date" },
  ],
  site_assessment: [
    { key: "dimensions", label: "Site Dimensions (L x W x H)" },
    { key: "ground_condition", label: "Surface / Ground Condition" },
    { key: "assessment_notes", label: "Assessment Notes" },
  ],
  job_scoping: [
    { key: "scope_description", label: "Scope of Work" },
    { key: "materials_list", label: "Materials Required" },
    { key: "estimated_duration", label: "Estimated Duration" },
  ],
  costing: [
    { key: "material_cost", label: "Material Cost" },
    { key: "labour_cost", label: "Labour Cost" },
  ],
  quotation_preparation: [
    { key: "quote_ref", label: "Quote Reference Number" },
    { key: "quote_amount", label: "Quoted Amount (excl. VAT)" },
    { key: "api_synced_at", label: "Quote synced from external Quote Builder" },
  ],
  quote_submission: [
    { key: "submission_method", label: "Submission Method" },
    { key: "submission_date", label: "Date Submitted" },
    { key: "submitted_to", label: "Submitted To (Contact Name)" },
  ],
  client_approval: [
    { key: "client_decision", label: "Client Decision" },
    { key: "deposit_received", label: "Deposit Received", type: "checkbox" },
  ],
  fabrication_order: [
    { key: "order_number", label: "Workshop Order Number" },
    { key: "order_date", label: "Order Date" },
    { key: "required_by", label: "Required Completion Date" },
    { key: "fab_specs", label: "Production Specifications" },
  ],
  fabrication_installation: [
    { key: "fab_status", label: "Production Status" },
    { key: "install_date", label: "Scheduled Installation Date" },
    { key: "install_status", label: "Installation Status" },
  ],
  project_closure: [
    { key: "final_payment_received", label: "Final payment received", type: "checkbox" },
    { key: "client_signoff", label: "Client sign-off obtained", type: "checkbox" },
  ],
  pre_flight_check: [
    { key: "drone_ok", label: "Equipment condition verified", type: "checkbox" },
    { key: "battery_ok", label: "Battery charged", type: "checkbox" },
    { key: "calibration_ok", label: "Calibration complete", type: "checkbox" },
    { key: "weather_ok", label: "Weather acceptable", type: "checkbox" },
    { key: "manager_approved", label: "Operations Manager approval", type: "checkbox" },
  ],
  flight_execution: [
    { key: "flight_date", label: "Execution Date" },
  ],
  post_flight_log: [
    { key: "equipment_cleaned", label: "Equipment cleaned", type: "checkbox" },
    { key: "inspection_passed", label: "Inspection completed", type: "checkbox" },
    { key: "data_submitted", label: "Data submitted", type: "checkbox" },
  ],
  invoicing: [
    { key: "invoice_number", label: "Invoice Number" },
    { key: "invoice_amount", label: "Invoice Amount" },
    { key: "api_synced_at", label: "Invoice synced from external Quote Builder" },
  ],
};

function isEmpty(value: unknown, type: RequiredField["type"]): boolean {
  if (type === "checkbox") return value !== true;
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim() === "";
  if (typeof value === "number") return Number.isNaN(value);
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

/** Returns labels of required fields that are still missing. */
export function getMissingStageFields(
  stage: JobStageEnum,
  formData: Record<string, any>
): string[] {
  const required = STAGE_REQUIRED_FIELDS[stage] || [];
  return required
    .filter((f) => isEmpty(formData?.[f.key], f.type))
    .map((f) => f.label);
}
