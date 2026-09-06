import { supabase } from "@/integrations/supabase/client";
import { slugifyKey } from "@/lib/sopFields";
import type { LibraryTemplate } from "@/lib/sopLibrary";

/** Ensures every named role exists for the org and returns a lowercase name -> id map. */
export async function ensureOrgRoles(orgId: string, names: string[]) {
  const { data: existing } = await supabase.from("org_roles").select("id, name").eq("org_id", orgId);
  const map = new Map<string, string>();
  (existing || []).forEach((r) => map.set(r.name.toLowerCase(), r.id));

  const missing = names.filter((n) => n && !map.has(n.toLowerCase()));
  if (missing.length) {
    const { data: created, error } = await supabase
      .from("org_roles")
      .insert(missing.map((name) => ({ org_id: orgId, name, is_admin: false })))
      .select("id, name");
    if (error) throw error;
    (created || []).forEach((r) => map.set(r.name.toLowerCase(), r.id));
  }
  return map;
}

/**
 * Copies one library workflow (stages, responsibilities, SLAs, approvals and forms)
 * into an organization using the existing universal engine tables.
 */
export async function installLibraryTemplate(
  orgId: string,
  userId: string | null | undefined,
  tpl: LibraryTemplate,
  opts: { isActive?: boolean; roleMap?: Map<string, string> } = {},
): Promise<string> {
  const roleMap = opts.roleMap ?? (await ensureOrgRoles(orgId, tpl.roles));

  const { data: template, error: tErr } = await supabase
    .from("sop_templates")
    .insert({
      org_id: orgId,
      name: tpl.name,
      description: tpl.summary,
      industry: tpl.niche,
      created_by: userId ?? null,
      is_active: opts.isActive ?? false,
    })
    .select()
    .single();
  if (tErr) throw tErr;

  const { data: stages, error: sErr } = await supabase
    .from("sop_stages")
    .insert(
      tpl.stages.map((s, i) => ({
        org_id: orgId,
        template_id: template.id,
        position: i,
        name: s.name,
        description: s.description,
        sla_hours: s.slaHours,
        requires_approval: s.requiresApproval ?? false,
        primary_role_id: roleMap.get(s.role.toLowerCase()) ?? null,
        secondary_role_id: s.backupRole ? roleMap.get(s.backupRole.toLowerCase()) ?? null : null,
      })),
    )
    .select("id, position");
  if (sErr) throw sErr;

  const byPosition = new Map<number, string>();
  (stages || []).forEach((s: { id: string; position: number }) => byPosition.set(s.position, s.id));

  const fieldRows = tpl.stages.flatMap((s, i) =>
    s.fields.map((f, j) => ({
      org_id: orgId,
      stage_id: byPosition.get(i)!,
      position: j,
      field_key: `${slugifyKey(f.label)}_${i}${j}`,
      label: f.label,
      field_type: f.type,
      required: f.required ?? false,
      help_text: f.help ?? null,
      options: f.options ?? [],
    })),
  );
  if (fieldRows.length) {
    const { error: fErr } = await supabase.from("sop_fields").insert(fieldRows);
    if (fErr) throw fErr;
  }

  return template.id as string;
}
