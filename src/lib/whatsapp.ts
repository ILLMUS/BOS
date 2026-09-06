import { supabase } from "@/integrations/supabase/client";

export const WHATSAPP_CONFIG_KEY = "whatsapp_click_to_chat";

export interface WhatsAppConfig {
  enabled: boolean;
  /** Business number in international format, digits only (e.g. 26876123456). */
  businessNumber: string;
  /** Default prefilled message. Supports {client} and {job} placeholders. */
  defaultMessage: string;
}

export const DEFAULT_WHATSAPP_CONFIG: WhatsAppConfig = {
  enabled: false,
  businessNumber: "",
  defaultMessage: "Hi {client}, an update on your job {job}:",
};

/** Strips everything but digits and drops a leading 00 / +. */
export function normalizeWhatsAppNumber(raw: string) {
  const digits = (raw || "").replace(/\D/g, "");
  return digits.replace(/^00/, "");
}

export function isValidWhatsAppNumber(raw: string) {
  const n = normalizeWhatsAppNumber(raw);
  return n.length >= 8 && n.length <= 15;
}

/** Builds a wa.me click-to-chat deep link. */
export function whatsappLink(number: string, message?: string) {
  const n = normalizeWhatsAppNumber(number);
  const text = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${n}${text}`;
}

export function fillTemplate(template: string, vars: Record<string, string | undefined>) {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? "");
}

export async function loadWhatsAppConfig(orgId: string): Promise<WhatsAppConfig> {
  const { data } = await supabase
    .from("org_config")
    .select("value")
    .eq("org_id", orgId)
    .eq("key", WHATSAPP_CONFIG_KEY)
    .maybeSingle();
  const v = data?.value as unknown as Partial<WhatsAppConfig> | null;
  return { ...DEFAULT_WHATSAPP_CONFIG, ...(v ?? {}) };
}

export async function saveWhatsAppConfig(orgId: string, config: WhatsAppConfig) {
  const { error } = await supabase
    .from("org_config")
    .upsert({ org_id: orgId, key: WHATSAPP_CONFIG_KEY, value: config as unknown as never }, { onConflict: "org_id,key" });
  if (error) throw error;
}
