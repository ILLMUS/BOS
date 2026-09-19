import { supabase } from "@/integrations/supabase/client";
import { SOP_LIBRARY, type LibraryTemplate } from "@/lib/sopLibrary";
import { installLibraryTemplate, ensureOrgRoles } from "@/lib/sopInstall";
import { saveOrgConfig, type ConfigItem, type ConfigKey, slugifyKey } from "@/lib/orgConfig";
import { copyForNiche, copyToItems } from "@/lib/copyConfig";

/**
 * Phase 9 — a business template is a starting configuration for a whole workspace:
 * roles, departments, services, lifecycle/finance vocabulary and one or more workflows.
 * It installs into the existing universal engine; nothing here is a second engine.
 */
export interface BusinessTemplate {
  key: string;
  name: string;
  industry: string;
  summary: string;
  /** Roles created for the workspace (workflow roles are added automatically too). */
  roles: string[];
  departments: string[];
  services: string[];
  /** Optional relabelling of configuration lists. Keys stay stable. */
  config?: Partial<Record<ConfigKey, ConfigItem[]>>;
  /** Workflow keys taken from the existing SOP library. */
  workflows: string[];
  /** Which workflow becomes the active default (defaults to the first). */
  primaryWorkflow?: string;
  highlights: string[];
  /** Terminology preset applied throughout the workspace. */
  terminology?: string;
}

const items = (...labels: string[]): ConfigItem[] => labels.map((l) => ({ key: slugifyKey(l), label: l }));

export const BUSINESS_TEMPLATES: BusinessTemplate[] = [
  {
    key: "fabrication",
    name: "Manufacturing & Production",
    industry: "Manufacturing / Production",
    summary:
      "The original RST Spilworks setup: enquiry to installation with costing, client sign-off, shop-drawing control and staged payments.",
    roles: ["Sales", "Estimator", "Workshop Manager", "Installer", "Accounts"],
    departments: ["Sales", "Estimating", "Workshop", "Installation", "Accounts"],
    services: ["Custom production", "Installation", "Repairs & maintenance", "Site measurement"],
    config: {
      expense_categories: items("Materials", "Labour", "Consumables", "Transport", "Subcontractor", "Other"),
      payment_methods: items("EFT / bank transfer", "Cash", "Card"),
      invoice_states: items("Draft", "Issued", "Deposit paid", "Part paid", "Paid", "Overdue"),
    },
    workflows: ["fabrication", "equipment_repair"],
    primaryWorkflow: "fabrication",
    highlights: [
      "Costing and quotation approval gates",
      "Shop drawing / client sign-off before production",
      "Deposit, progress and final payment tracking",
    ],
    terminology: "fabrication",
  },
  {
    key: "service_business",
    name: "Service Business",
    industry: "Field & professional services",
    summary:
      "For teams who dispatch work to site: booking, scheduled attendance, job completion sign-off and invoicing.",
    roles: ["Client Manager", "Scheduler", "Technician", "Supervisor", "Accounts"],
    departments: ["Client service", "Scheduling", "Field operations", "Accounts"],
    services: ["Callout / repair", "Scheduled maintenance", "Inspection", "Installation"],
    config: {
      expense_categories: items("Parts", "Labour", "Travel", "Tools", "Other"),
      quote_states: items("Draft", "Sent", "Accepted", "Declined", "Expired"),
      payment_states: items("Pending", "Received", "Cleared", "Refunded"),
    },
    workflows: ["services", "property_maintenance"],
    primaryWorkflow: "services",
    highlights: [
      "Booking and dispatch with SLA clocks per visit",
      "On-site completion evidence and supervisor approval",
      "Straight hand-off to invoicing",
    ],
    terminology: "services",
  },
  {
    key: "digital_agency",
    name: "Digital Agency",
    industry: "Digital / Creative agency",
    summary:
      "Client onboarding, project delivery and campaign management with creative approval gates and milestone billing.",
    roles: ["Account Manager", "Project Manager", "Designer", "Developer", "Marketing Lead", "Media Buyer", "Creative"],
    departments: ["Client services", "Strategy", "Design", "Development", "Media"],
    services: ["Website build", "Brand & design", "Campaign management", "Retainer support"],
    config: {
      sales_stages: items("Discovery", "Scoping", "Proposal", "Negotiation", "Won", "Lost"),
      expense_categories: items("Ad spend", "Contractors", "Software & licences", "Stock assets", "Other"),
      invoice_states: items("Draft", "Issued", "Part paid", "Paid", "Overdue"),
    },
    workflows: ["client_onboarding", "website_development", "marketing_campaign"],
    primaryWorkflow: "client_onboarding",
    highlights: [
      "Kick-off and onboarding checklist per client",
      "Creative and launch approval gates",
      "Milestone-based billing against delivery stages",
    ],
    terminology: "services",
  },
  {
    key: "construction",
    name: "Construction & Trades",
    industry: "Construction / Trades",
    summary: "Project delivery from enquiry and site inspection through materials, execution, snagging and handover.",
    roles: ["Estimator", "Site Foreman", "Project Manager", "Accounts"],
    departments: ["Estimating", "Projects", "Site operations", "Finance"],
    services: ["Construction", "Renovation", "Trade services", "Maintenance"],
    config: {
      sales_stages: items("Enquiry", "Site visit", "Estimate", "Contract", "Won", "Lost"),
      expense_categories: items("Materials", "Labour", "Plant hire", "Subcontractors", "Transport", "Other"),
    },
    workflows: ["construction", "property_maintenance"],
    primaryWorkflow: "construction",
    highlights: ["Site inspection and estimate controls", "Materials and execution tracking", "Snag list and formal handover"],
    terminology: "construction",
  },
  {
    key: "health",
    name: "Clinic & Health Practice",
    industry: "Clinic / Health Practice",
    summary: "Patient-centred flow for bookings, consent, consultation, treatment planning, follow-up and billing.",
    roles: ["Receptionist", "Practitioner", "Clinical Reviewer", "Billing"],
    departments: ["Reception", "Clinical", "Patient care", "Billing"],
    services: ["Consultation", "Treatment", "Assessment", "Follow-up"],
    config: {
      client_states: items("Enquiry", "Patient", "Active care", "Follow-up", "Discharged"),
      invoice_states: items("Draft", "Claim submitted", "Patient portion due", "Paid", "Overdue"),
    },
    workflows: ["health", "client_onboarding"],
    primaryWorkflow: "health",
    highlights: ["Patient intake and signed consent", "Treatment-plan approval", "Follow-up and billing workflow"],
    terminology: "health",
  },
  {
    key: "hospitality",
    name: "Hospitality & Events",
    industry: "Catering / Events / Hospitality",
    summary: "Event planning from enquiry through menu, quotation, deposit, preparation, event day and debrief.",
    roles: ["Coordinator", "Chef / Lead", "Logistics", "Accounts"],
    departments: ["Events", "Kitchen", "Logistics", "Finance"],
    services: ["Catering", "Event coordination", "Venue service", "Equipment hire"],
    config: {
      sales_stages: items("Enquiry", "Brief", "Tasting", "Quotation", "Booked", "Lost"),
      payment_states: items("Deposit due", "Deposit paid", "Balance due", "Paid", "Refunded"),
    },
    workflows: ["hospitality", "client_onboarding"],
    primaryWorkflow: "hospitality",
    highlights: ["Menu and event brief", "Deposit gate before preparation", "Event-day checklist and debrief"],
    terminology: "hospitality",
  },
  {
    key: "logistics",
    name: "Logistics & Transport",
    industry: "Logistics / Transport",
    summary: "Dispatch operations from booking and load planning to tracking, proof of delivery and invoicing.",
    roles: ["Dispatcher", "Driver", "Warehouse", "Fleet Manager", "Accounts"],
    departments: ["Dispatch", "Fleet", "Warehouse", "Finance"],
    services: ["Local delivery", "Long-haul transport", "Warehousing", "Dedicated vehicle"],
    config: {
      client_states: items("Prospect", "Shipper", "Active account", "On hold", "Former customer"),
      expense_categories: items("Fuel", "Tolls", "Repairs", "Driver costs", "Warehouse", "Other"),
    },
    workflows: ["logistics", "equipment_repair"],
    primaryWorkflow: "logistics",
    highlights: ["Load and route planning", "Dispatch approval and delay logging", "Proof of delivery before invoicing"],
    terminology: "logistics",
  },
  {
    key: "retail",
    name: "Retail & E-commerce",
    industry: "Retail / E-commerce",
    summary: "Order fulfilment from payment confirmation through picking, packing, shipping and after-sales care.",
    roles: ["Sales", "Picker / Packer", "Dispatch", "Support", "Finance"],
    departments: ["Sales", "Fulfilment", "Dispatch", "Customer care"],
    services: ["Retail orders", "Online orders", "Delivery", "Returns"],
    config: {
      client_states: items("Prospect", "Customer", "Repeat customer", "VIP", "Inactive"),
      payment_methods: items("Card", "EFT / bank transfer", "Cash", "Cash on delivery", "Payment link"),
    },
    workflows: ["retail", "client_onboarding"],
    primaryWorkflow: "retail",
    highlights: ["Payment verification", "Picking and packing checks", "Delivery confirmation and after-sales"],
    terminology: "retail",
  },
  {
    key: "education",
    name: "Education & Training",
    industry: "Education / Training",
    summary: "Student journey from enquiry and application through payment, course delivery and certification.",
    roles: ["Admissions", "Facilitator", "Academic Reviewer", "Finance"],
    departments: ["Admissions", "Academic", "Student support", "Finance"],
    services: ["Courses", "Workshops", "Assessments", "Corporate training"],
    config: {
      sales_stages: items("Enquiry", "Application", "Review", "Accepted", "Enrolled", "Declined"),
      invoice_states: items("Draft", "Issued", "Funding pending", "Part paid", "Paid", "Overdue"),
    },
    workflows: ["education", "client_onboarding"],
    primaryWorkflow: "education",
    highlights: ["Application document collection", "Acceptance and payment gates", "Attendance and certification"],
    terminology: "other",
  },
];

export function workflowsFor(tpl: BusinessTemplate): LibraryTemplate[] {
  return tpl.workflows
    .map((k) => SOP_LIBRARY.find((w) => w.key === k))
    .filter((w): w is LibraryTemplate => Boolean(w));
}

export interface InstallResult {
  templateIds: string[];
  primaryTemplateId: string | null;
}

/** Installs a business template into an organization. Everything stays editable afterwards. */
export async function installBusinessTemplate(
  orgId: string,
  userId: string | null | undefined,
  tpl: BusinessTemplate,
): Promise<InstallResult> {
  const workflows = workflowsFor(tpl);
  const roleNames = Array.from(
    new Set([
      ...tpl.roles,
      ...workflows.flatMap((w) => [...w.roles, ...w.stages.flatMap((s) => [s.role, s.backupRole ?? ""])]),
    ].filter(Boolean)),
  );
  const roleMap = await ensureOrgRoles(orgId, roleNames);

  // Configuration lists — departments and services first, then any overrides.
  const configEntries: [ConfigKey, ConfigItem[]][] = [
    ["departments", items(...tpl.departments)],
    ["services", items(...tpl.services)],
    ...(Object.entries(tpl.config ?? {}) as [ConfigKey, ConfigItem[]][]),
  ];
  for (const [key, value] of configEntries) {
    if (value.length) await saveOrgConfig(orgId, key, value);
  }

  if (tpl.terminology) {
    const { error } = await supabase.from("org_config").upsert(
      { org_id: orgId, key: "copy_terms", value: copyToItems(copyForNiche(tpl.terminology)) as unknown as never },
      { onConflict: "org_id,key" },
    );
    if (error) throw error;
  }

  // Business profile
  const { error: profileError } = await supabase.from("organizations").update({ industry: tpl.industry }).eq("id", orgId);
  if (profileError) throw profileError;

  const templateIds: string[] = [];
  let primaryTemplateId: string | null = null;
  const primaryKey = tpl.primaryWorkflow ?? tpl.workflows[0];

  for (const wf of workflows) {
    const id = await installLibraryTemplate(orgId, userId, wf, {
      isActive: wf.key === primaryKey,
      roleMap,
    });
    templateIds.push(id);
    if (wf.key === primaryKey) primaryTemplateId = id;
  }

  return { templateIds, primaryTemplateId: primaryTemplateId ?? templateIds[0] ?? null };
}
