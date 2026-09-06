import type { ConfigItem } from "@/lib/orgConfig";

/**
 * Niche-based copy configuration.
 *
 * Every user-facing noun in the product is a *term*. Terms have a neutral default,
 * a per-niche default (chosen during onboarding) and an optional per-organization
 * override stored in `org_config` under the `copy_terms` key. Nothing here is code:
 * an admin can rename any term for their industry from Business Configuration.
 */
export type CopyTerm =
  | "work_item"
  | "work_items"
  | "workflow"
  | "workflows"
  | "stage"
  | "stages"
  | "client"
  | "clients"
  | "team_member"
  | "team_members"
  | "quote"
  | "invoice"
  | "receipt"
  | "site"
  | "service";

export interface CopyTermDef {
  term: CopyTerm;
  label: string;
  description: string;
  default: string;
}

export const COPY_TERMS: CopyTermDef[] = [
  { term: "work_item", label: "Work item (singular)", description: "One piece of work moving through a workflow.", default: "Job" },
  { term: "work_items", label: "Work item (plural)", description: "Plural of the above.", default: "Jobs" },
  { term: "workflow", label: "Workflow (singular)", description: "A sequence of stages work moves through.", default: "Workflow" },
  { term: "workflows", label: "Workflow (plural)", description: "Plural of the above.", default: "Workflows" },
  { term: "stage", label: "Stage (singular)", description: "One step inside a workflow.", default: "Stage" },
  { term: "stages", label: "Stage (plural)", description: "Plural of the above.", default: "Stages" },
  { term: "client", label: "Client (singular)", description: "The person or company you deliver to.", default: "Client" },
  { term: "clients", label: "Client (plural)", description: "Plural of the above.", default: "Clients" },
  { term: "team_member", label: "Team member (singular)", description: "Someone who does the work.", default: "Team member" },
  { term: "team_members", label: "Team member (plural)", description: "Plural of the above.", default: "Team members" },
  { term: "quote", label: "Quote", description: "The priced offer sent before work starts.", default: "Quote" },
  { term: "invoice", label: "Invoice", description: "The request for payment.", default: "Invoice" },
  { term: "receipt", label: "Receipt", description: "Proof of payment received.", default: "Receipt" },
  { term: "site", label: "Site", description: "Where the work happens.", default: "Site" },
  { term: "service", label: "Service", description: "What you sell.", default: "Service" },
];

export type CopyMap = Record<CopyTerm, string>;

/** Per-niche wording. Keys match `NICHE_PRESETS` in `src/lib/businessSetup.ts`. */
export const NICHE_COPY: Record<string, Partial<CopyMap>> = {
  fabrication: {
    work_item: "Job", work_items: "Jobs", workflow: "Production flow", workflows: "Production flows",
    stage: "Production step", stages: "Production steps", site: "Site", service: "Product line",
  },
  construction: {
    work_item: "Project", work_items: "Projects", workflow: "Project flow", workflows: "Project flows",
    stage: "Phase", stages: "Phases", client: "Client", site: "Site", service: "Trade",
  },
  services: {
    work_item: "Engagement", work_items: "Engagements", workflow: "Delivery flow", workflows: "Delivery flows",
    stage: "Milestone", stages: "Milestones", client: "Client", clients: "Clients",
    team_member: "Specialist", team_members: "Specialists", site: "Location", service: "Service",
  },
  health: {
    work_item: "Case", work_items: "Cases", workflow: "Patient flow", workflows: "Patient flows",
    stage: "Step", stages: "Steps", client: "Patient", clients: "Patients",
    team_member: "Practitioner", team_members: "Practitioners", site: "Practice", service: "Treatment",
  },
  hospitality: {
    work_item: "Event", work_items: "Events", workflow: "Event flow", workflows: "Event flows",
    stage: "Step", stages: "Steps", client: "Host", clients: "Hosts",
    team_member: "Crew member", team_members: "Crew", site: "Venue", service: "Package",
  },
  logistics: {
    work_item: "Consignment", work_items: "Consignments", workflow: "Delivery flow", workflows: "Delivery flows",
    stage: "Leg", stages: "Legs", client: "Customer", clients: "Customers",
    team_member: "Driver", team_members: "Drivers", site: "Depot", service: "Route",
  },
  retail: {
    work_item: "Order", work_items: "Orders", workflow: "Order flow", workflows: "Order flows",
    stage: "Step", stages: "Steps", client: "Customer", clients: "Customers",
    team_member: "Staff member", team_members: "Staff", site: "Store", service: "Product",
  },
  other: {},
};

/** Neutral defaults for every term. */
export function defaultCopy(): CopyMap {
  const out = {} as CopyMap;
  COPY_TERMS.forEach((t) => (out[t.term] = t.default));
  return out;
}

/** Neutral defaults merged with a niche's wording. */
export function copyForNiche(niche?: string | null): CopyMap {
  return { ...defaultCopy(), ...(niche ? NICHE_COPY[niche] ?? {} : {}) };
}

/** Turns the stored `copy_terms` list into a full map (missing terms fall back). */
export function copyFromItems(items: ConfigItem[] | undefined, niche?: string | null): CopyMap {
  const base = copyForNiche(niche);
  (items || []).forEach((i) => {
    if (i.key in base && i.label?.trim()) base[i.key as CopyTerm] = i.label.trim();
  });
  return base;
}

/** Serialises a map back into the configuration list shape. */
export function copyToItems(map: CopyMap): ConfigItem[] {
  return COPY_TERMS.map((t) => ({ key: t.term, label: map[t.term] || t.default, description: t.description }));
}

/** Applies simple casing helpers so copy reads naturally in sentences. */
export const lower = (s: string) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : s);
