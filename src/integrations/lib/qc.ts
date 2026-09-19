import { supabase } from "@/integrations/supabase/client";

export const QC_TEMPLATE_KEY = "qc_checklist_template";

export interface QcTemplateItem {
  key: string;
  label: string;
}

export const DEFAULT_QC_TEMPLATE: QcTemplateItem[] = [
  { key: "scope_complete", label: "All scoped work completed" },
  { key: "spec_match", label: "Output matches approved specification" },
  { key: "finish_quality", label: "Finish / quality inspected and acceptable" },
  { key: "safety", label: "Site safe, tools and waste cleared" },
  { key: "docs", label: "Documents, drawings and certificates collated" },
  { key: "client_walkthrough", label: "Client walkthrough / demonstration done" },
  { key: "signoff", label: "Client sign-off obtained" },
];

export function slugKey(label: string) {
  return label.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "item";
}

export async function loadQcTemplate(orgId: string): Promise<QcTemplateItem[]> {
  const { data } = await supabase
    .from("org_config")
    .select("value")
    .eq("org_id", orgId)
    .eq("key", QC_TEMPLATE_KEY)
    .maybeSingle();
  const v = data?.value as unknown as QcTemplateItem[] | null;
  return Array.isArray(v) && v.length ? v : DEFAULT_QC_TEMPLATE;
}

export async function saveQcTemplate(orgId: string, items: QcTemplateItem[]) {
  const { error } = await supabase
    .from("org_config")
    .upsert({ org_id: orgId, key: QC_TEMPLATE_KEY, value: items as unknown as never }, { onConflict: "org_id,key" });
  if (error) throw error;
}
