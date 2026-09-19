import { supabase } from "@/integrations/supabase/client";

/**
 * A step needs the client's own sign-off when its name talks about approval,
 * sign-off or acceptance — designs, drawings, quotes, invoices, handover, etc.
 * Mirrors public.stage_needs_client_approval in the database.
 */
export function needsClientApproval(stageName?: string | null): boolean {
  return /(approval|approve|sign[-_ ]?off|acceptance|client\s*confirm|customer\s*confirm)/i.test(
    stageName || "",
  );
}

export interface ClientDecision {
  id: string;
  decision: "approved" | "declined";
  client_name: string | null;
  comment: string | null;
  created_at: string;
}

export async function loadStageDecision(stageId: string): Promise<ClientDecision | null> {
  const { data } = await supabase
    .from("client_approvals")
    .select("id, decision, client_name, comment, created_at")
    .eq("stage_id", stageId)
    .order("created_at", { ascending: false })
    .limit(1);
  return ((data || [])[0] as ClientDecision) ?? null;
}

export const trackingUrl = (token: string) => `${window.location.origin}/track?token=${token}`;

/** Any file or link captured on a step, so the client can review it before deciding. */
export function attachmentsFromFormData(formData: Record<string, any> | null | undefined) {
  const out: Array<{ label: string; url: string }> = [];
  const isUrl = (v: unknown) => typeof v === "string" && /^https?:\/\//i.test(v);
  const label = (key: string) => key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  Object.entries(formData || {}).forEach(([key, value]) => {
    if (isUrl(value)) out.push({ label: label(key), url: value as string });
    else if (Array.isArray(value)) {
      value.forEach((v, i) => {
        if (isUrl(v)) out.push({ label: `${label(key)} ${value.length > 1 ? i + 1 : ""}`.trim(), url: v });
        else if (v && typeof v === "object" && isUrl((v as any).url))
          out.push({ label: (v as any).name || label(key), url: (v as any).url });
      });
    }
  });
  return out;
}
