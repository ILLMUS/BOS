import { supabase } from "@/integrations/supabase/client";
import type { DocumentParty } from "@/lib/documentPdf";

export const DOC_BRANDING_KEY = "document_branding";

export interface DocumentBranding {
  phone: string;
  email: string;
  address: string;
}

export const DEFAULT_DOC_BRANDING: DocumentBranding = { phone: "", email: "", address: "" };

export async function loadDocumentBranding(orgId: string): Promise<DocumentBranding> {
  const { data } = await supabase
    .from("org_config")
    .select("value")
    .eq("org_id", orgId)
    .eq("key", DOC_BRANDING_KEY)
    .maybeSingle();
  const v = data?.value as unknown as Partial<DocumentBranding> | null;
  return { ...DEFAULT_DOC_BRANDING, ...(v ?? {}) };
}

export async function saveDocumentBranding(orgId: string, branding: DocumentBranding) {
  const { error } = await supabase
    .from("org_config")
    .upsert(
      { org_id: orgId, key: DOC_BRANDING_KEY, value: branding as unknown as never },
      { onConflict: "org_id,key" },
    );
  if (error) throw error;
}

/** The "document from" block: business profile + document contact details. */
export async function loadIssuerParty(orgId: string): Promise<DocumentParty> {
  const [{ data: org }, branding] = await Promise.all([
    supabase.from("organizations").select("name, location").eq("id", orgId).maybeSingle(),
    loadDocumentBranding(orgId),
  ]);
  return {
    name: org?.name || "Your business",
    address: branding.address || org?.location || "",
    phone: branding.phone,
    email: branding.email,
  };
}
