import { supabase } from "@/integrations/supabase/client";

export const ACCOUNTING_URL_KEY = "quote_builder_base_url";

/** The organisation's own accounting / quoting app (HustleOS Quotes by default). */
export const DEFAULT_ACCOUNTING_URL = "https://hustleosquotes.netlify.app/";

export function normalizeAccountingUrl(raw: string) {
  const t = (raw || "").trim();
  if (!t) return "";
  return /^https?:\/\//i.test(t) ? t : `https://${t}`;
}

export function isValidAccountingUrl(raw: string) {
  try {
    const u = new URL(normalizeAccountingUrl(raw));
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

/** Deep link into a section of the accounting app. */
export function accountingSectionUrl(baseUrl: string, section: "quote" | "invoice" | "receipt") {
  const base = normalizeAccountingUrl(baseUrl);
  if (!base) return "";
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}section=${section}`;
}

export async function loadAccountingUrl(): Promise<string> {
  const { data } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", ACCOUNTING_URL_KEY)
    .maybeSingle();
  return data?.value ?? "";
}

export async function saveAccountingUrl(url: string) {
  const trimmed = normalizeAccountingUrl(url);
  if (trimmed) {
    const { error } = await supabase
      .from("app_settings")
      .upsert(
        { key: ACCOUNTING_URL_KEY, value: trimmed, updated_at: new Date().toISOString() },
        { onConflict: "key" },
      );
    if (error) throw error;
  } else {
    const { error } = await supabase.from("app_settings").delete().eq("key", ACCOUNTING_URL_KEY);
    if (error) throw error;
  }
  return trimmed;
}
