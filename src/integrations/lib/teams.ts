import { supabase } from "@/integrations/supabase/client";

/** A seat inside a business function — the people side of the SOP engine. */
export interface TeamPosition {
  key: string;
  title: string;
  /** What this seat is accountable for, in plain words. */
  duties: string;
  /** Whether the seat is required to run the function at all. */
  essential: boolean;
  /** Suggested authority level wording shown as a hint. */
  authorityHint: string;
}

export interface TeamFunction {
  key: string;
  label: string;
  description: string;
  positions: TeamPosition[];
}

/** The 5–6 seats that run acquisition, sales and finance. */
export const TEAM_FUNCTIONS: TeamFunction[] = [
  {
    key: "client_acquisition",
    label: "Client Acquisition",
    description: "Campaigns, outreach sequences, WhatsApp follow-ups and new enquiries.",
    positions: [
      {
        key: "lead_handler",
        title: "Lead Handler",
        duties: "Owns campaigns and sequences, qualifies enquiries, approves scheduled follow-ups.",
        essential: true,
        authorityHint: "Manager",
      },
      {
        key: "outreach_rep",
        title: "Outreach Rep",
        duties: "Sends the touches, logs WhatsApp and call outcomes, keeps the list clean.",
        essential: false,
        authorityHint: "Field member",
      },
    ],
  },
  {
    key: "sales",
    label: "Sales",
    description: "Opportunities, quotes, proposals and closing deals.",
    positions: [
      {
        key: "sales_lead",
        title: "Sales Manager",
        duties: "Owns the pipeline, approves discounts and quotes, reports on forecast.",
        essential: true,
        authorityHint: "Manager",
      },
      {
        key: "salesperson",
        title: "Salesperson",
        duties: "Works opportunities, meets clients, moves deals to close.",
        essential: true,
        authorityHint: "Field member",
      },
      {
        key: "estimator",
        title: "Estimator / Quotation Officer",
        duties: "Prices the work, prepares quotes and proposal documents.",
        essential: false,
        authorityHint: "Manager",
      },
    ],
  },
  {
    key: "finance",
    label: "Finance",
    description: "Ledger, invoices, receipts, reconciliation and ageing.",
    positions: [
      {
        key: "accountant",
        title: "Accountant / Accounts Admin",
        duties: "Posts the ledger, issues invoices and receipts, reconciles the bank, clears mismatches.",
        essential: true,
        authorityHint: "Manager",
      },
      {
        key: "finance_approver",
        title: "Finance Approver",
        duties: "Signs off payments, credit notes and write-offs. Usually the owner or director.",
        essential: true,
        authorityHint: "Board / Owner",
      },
    ],
  },
];

/** userId per position: { [functionKey]: { [positionKey]: userId } } */
export type TeamAssignments = Record<string, Record<string, string>>;

const CONFIG_KEY = "function_teams";

export async function loadTeamAssignments(orgId: string): Promise<TeamAssignments> {
  const { data, error } = await supabase
    .from("org_config")
    .select("value")
    .eq("org_id", orgId)
    .eq("key", CONFIG_KEY)
    .maybeSingle();
  if (error) throw error;
  const value = (data?.value ?? {}) as unknown;
  return (value && typeof value === "object" ? (value as TeamAssignments) : {});
}

export async function saveTeamAssignments(orgId: string, assignments: TeamAssignments) {
  const { error } = await supabase
    .from("org_config")
    .upsert(
      { org_id: orgId, key: CONFIG_KEY, value: assignments as unknown as never },
      { onConflict: "org_id,key" },
    );
  if (error) throw error;
}

/**
 * Mirrors a seat into the SOP role system so workflow steps can be owned by it:
 * makes sure an org role with the position title exists, then links the member to it.
 */
export async function syncPositionRole(orgId: string, title: string, userId: string | null, previousUserId?: string | null) {
  const existing = await supabase
    .from("org_roles")
    .select("id")
    .eq("org_id", orgId)
    .eq("name", title)
    .maybeSingle();
  let roleId = existing.data?.id ?? null;
  if (!roleId) {
    const created = await supabase
      .from("org_roles")
      .insert({ org_id: orgId, name: title, description: "Business function seat" })
      .select("id")
      .single();
    if (created.error) throw created.error;
    roleId = created.data.id;
  }
  if (previousUserId && previousUserId !== userId) {
    await supabase.from("user_org_roles").delete().eq("org_role_id", roleId).eq("user_id", previousUserId);
  }
  if (userId) {
    const held = await supabase
      .from("user_org_roles")
      .select("id")
      .eq("org_id", orgId)
      .eq("user_id", userId)
      .eq("org_role_id", roleId)
      .maybeSingle();
    if (!held.data) {
      const { error } = await supabase
        .from("user_org_roles")
        .insert({ org_id: orgId, user_id: userId, org_role_id: roleId });
      if (error) throw error;
    }
  }
}
