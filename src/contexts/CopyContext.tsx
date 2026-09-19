import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { NICHE_PRESETS } from "@/lib/businessSetup";
import {
  applyCopy,
  copyForNiche,
  copyFromItems,
  defaultCopy,
  nicheKeyFromIndustry,
  type CopyMap,
  type CopyTerm,
} from "@/lib/copyConfig";
import type { ConfigItem } from "@/lib/orgConfig";

interface CopyContextValue {
  /** The wording this workspace chose for every core noun. */
  copy: CopyMap;
  /** One term, e.g. t("work_items") → "Orders". */
  t: (term: CopyTerm) => string;
  /** Rewrites a fixed label so it uses this workspace's wording. */
  phrase: (text: string) => string;
  reload: () => Promise<void>;
}

const CopyContext = createContext<CopyContextValue | undefined>(undefined);

export const COPY_CONFIG_KEY = "copy_terms";

export function CopyProvider({ children }: { children: React.ReactNode }) {
  const { orgId, organization } = useAuth();
  const [stored, setStored] = useState<ConfigItem[] | null>(null);

  const niche = useMemo(
    () => nicheKeyFromIndustry(organization?.industry, NICHE_PRESETS),
    [organization?.industry],
  );

  const reload = useCallback(async () => {
    if (!orgId) {
      setStored(null);
      return;
    }
    const { data } = await supabase
      .from("org_config")
      .select("value")
      .eq("org_id", orgId)
      .eq("key", COPY_CONFIG_KEY)
      .maybeSingle();
    const value = data?.value as unknown as ConfigItem[] | undefined;
    setStored(Array.isArray(value) ? value : null);
  }, [orgId]);

  useEffect(() => { reload(); }, [reload]);

  const copy = useMemo<CopyMap>(() => {
    if (!orgId) return defaultCopy();
    return stored ? copyFromItems(stored, niche) : copyForNiche(niche);
  }, [orgId, stored, niche]);

  const value = useMemo<CopyContextValue>(
    () => ({
      copy,
      t: (term: CopyTerm) => copy[term],
      phrase: (text: string) => applyCopy(text, copy),
      reload,
    }),
    [copy, reload],
  );

  return <CopyContext.Provider value={value}>{children}</CopyContext.Provider>;
}

export function useCopy(): CopyContextValue {
  const ctx = useContext(CopyContext);
  if (ctx) return ctx;
  const fallback = defaultCopy();
  return {
    copy: fallback,
    t: (term) => fallback[term],
    phrase: (text) => text,
    reload: async () => {},
  };
}
