import { supabase } from "@/integrations/supabase/client";

/** A single configurable item in a workspace list (stage, state, department...). */
export interface ConfigItem {
  key: string;
  label: string;
  description?: string;
  /** Optional flags used by lifecycle/finance lists. */
  terminal?: boolean;
}

export type ConfigKey =
  | "departments"
  | "services"
  | "lead_stages"
  | "sales_stages"
  | "client_states"
  | "quote_states"
  | "invoice_states"
  | "payment_states"
  | "payment_methods"
  | "expense_categories";

export interface ConfigSectionDef {
  key: ConfigKey;
  label: string;
  description: string;
  defaults: ConfigItem[];
  /** Items backed by a database enum cannot be removed, only relabelled. */
  lockedKeys?: string[];
}

const item = (key: string, label: string, description?: string): ConfigItem => ({ key, label, description });

/**
 * Defaults are generic starting points, but every workspace
 * can rename, extend or trim them. Keys that map to database enums stay locked so
 * existing records keep resolving.
 */
export const CONFIG_SECTIONS: Record<ConfigKey, ConfigSectionDef> = {
  departments: {
    key: "departments",
    label: "Departments",
    description: "Teams inside your business. Used to group roles and responsibilities.",
    defaults: [item("operations", "Operations"), item("sales", "Sales"), item("finance", "Finance")],
  },
  services: {
    key: "services",
    label: "Services",
    description: "What you sell. Offered when creating work and quoting.",
    defaults: [],
  },
  lead_stages: {
    key: "lead_stages",
    label: "Lead stages",
    description: "How an enquiry progresses before it becomes an opportunity.",
    defaults: [
      item("new", "New"),
      item("working", "Working"),
      item("qualified", "Qualified"),
      item("disqualified", "Disqualified"),
      item("converted", "Converted"),
    ],
    lockedKeys: ["new", "working", "qualified", "disqualified", "converted"],
  },
  sales_stages: {
    key: "sales_stages",
    label: "Sales stages",
    description: "Your opportunity pipeline from discovery to close.",
    defaults: [
      item("discovery", "Discovery"),
      item("scoping", "Scoping"),
      item("proposal", "Proposal"),
      item("negotiation", "Negotiation"),
      item("won", "Won"),
      item("lost", "Lost"),
    ],
    lockedKeys: ["discovery", "scoping", "proposal", "negotiation", "won", "lost"],
  },
  client_states: {
    key: "client_states",
    label: "Client states",
    description: "The lifecycle an account moves through with you.",
    defaults: [
      item("prospect", "Prospect"),
      item("lead", "Lead"),
      item("opportunity", "Opportunity"),
      item("deal", "Deal"),
      item("client", "Client"),
      item("lost", "Lost"),
    ],
    lockedKeys: ["prospect", "lead", "opportunity", "deal", "client", "lost"],
  },
  quote_states: {
    key: "quote_states",
    label: "Quote states",
    description: "How a quote moves from draft to accepted.",
    defaults: [item("draft", "Draft"), item("sent", "Sent"), item("accepted", "Accepted"), item("declined", "Declined")],
  },
  invoice_states: {
    key: "invoice_states",
    label: "Invoice states",
    description: "How an invoice is tracked once work is delivered.",
    defaults: [item("draft", "Draft"), item("issued", "Issued"), item("part_paid", "Part paid"), item("paid", "Paid"), item("overdue", "Overdue")],
  },
  payment_states: {
    key: "payment_states",
    label: "Payment states",
    description: "Stages a payment passes through in your ledger.",
    defaults: [item("pending", "Pending"), item("received", "Received"), item("cleared", "Cleared"), item("refunded", "Refunded")],
  },
  payment_methods: {
    key: "payment_methods",
    label: "Payment methods",
    description: "Accepted ways your clients pay.",
    defaults: [item("eft", "EFT / bank transfer"), item("cash", "Cash"), item("card", "Card")],
  },
  expense_categories: {
    key: "expense_categories",
    label: "Expense categories",
    description: "Cost buckets used when recording expenses.",
    defaults: [item("materials", "Materials"), item("labour", "Labour"), item("transport", "Transport"), item("other", "Other")],
  },
};

export type OrgConfig = Partial<Record<ConfigKey, ConfigItem[]>>;

/** Reads every configuration list for an org, falling back to defaults. */
export async function loadOrgConfig(orgId: string): Promise<Record<ConfigKey, ConfigItem[]>> {
  const { data, error } = await supabase.from("org_config").select("key, value").eq("org_id", orgId);
  if (error) throw error;
  const stored = new Map((data || []).map((r) => [r.key, r.value as unknown as ConfigItem[]]));
  const out = {} as Record<ConfigKey, ConfigItem[]>;
  (Object.keys(CONFIG_SECTIONS) as ConfigKey[]).forEach((k) => {
    const v = stored.get(k);
    out[k] = Array.isArray(v) && v.length ? v : CONFIG_SECTIONS[k].defaults;
  });
  return out;
}

/** Upserts one configuration list. Admin-only at the database level. */
export async function saveOrgConfig(orgId: string, key: ConfigKey, items: ConfigItem[]) {
  const { error } = await supabase
    .from("org_config")
    .upsert({ org_id: orgId, key, value: items as unknown as never }, { onConflict: "org_id,key" });
  if (error) throw error;
}

/** Turns a label into a stable machine key. */
export function slugifyKey(label: string) {
  return label.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "item";
}