import { supabase } from "@/integrations/supabase/client";

/** Company-wide fallback ownership for any workflow step. */
export interface StageRoleDefaults {
  primary_role_id: string | null;
  secondary_role_id: string | null;
  sla_hours: number;
}

export const STAGE_ROLE_DEFAULTS_KEY = "stage_role_defaults";

export const EMPTY_STAGE_ROLE_DEFAULTS: StageRoleDefaults = {
  primary_role_id: null,
  secondary_role_id: null,
  sla_hours: 24,
};

/** Reads the org's default step ownership, falling back to empty defaults. */
export async function loadStageRoleDefaults(orgId: string): Promise<StageRoleDefaults> {
  const { data, error } = await supabase
    .from("org_config")
    .select("value")
    .eq("org_id", orgId)
    .eq("key", STAGE_ROLE_DEFAULTS_KEY)
    .maybeSingle();
  if (error) throw error;
  const v = (data?.value ?? null) as Partial<StageRoleDefaults> | null;
  if (!v || typeof v !== "object") return EMPTY_STAGE_ROLE_DEFAULTS;
  return {
    primary_role_id: v.primary_role_id ?? null,
    secondary_role_id: v.secondary_role_id ?? null,
    sla_hours: Number(v.sla_hours) > 0 ? Number(v.sla_hours) : 24,
  };
}

/** Upserts the org's default step ownership. Admin-only at the database level. */
export async function saveStageRoleDefaults(orgId: string, defaults: StageRoleDefaults) {
  const { error } = await supabase
    .from("org_config")
    .upsert(
      { org_id: orgId, key: STAGE_ROLE_DEFAULTS_KEY, value: defaults as unknown as never },
      { onConflict: "org_id,key" }
    );
  if (error) throw error;
}
