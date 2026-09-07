import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { CONFIG_SECTIONS, ConfigItem, ConfigKey, loadOrgConfig, saveOrgConfig } from "@/lib/orgConfig";

/** Loads and mutates the workspace configuration lists. */
export function useOrgConfig() {
  const { orgId } = useAuth();
  const [config, setConfig] = useState<Record<ConfigKey, ConfigItem[]>>(() => {
    const seed = {} as Record<ConfigKey, ConfigItem[]>;
    (Object.keys(CONFIG_SECTIONS) as ConfigKey[]).forEach((k) => (seed[k] = CONFIG_SECTIONS[k].defaults));
    return seed;
  });
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      setConfig(await loadOrgConfig(orgId));
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    if (orgId) reload();
    else setLoading(false);
  }, [orgId, reload]);

  const save = useCallback(
    async (key: ConfigKey, items: ConfigItem[]) => {
      if (!orgId) return;
      await saveOrgConfig(orgId, key, items);
      setConfig((prev) => ({ ...prev, [key]: items }));
    },
    [orgId],
  );

  return { config, loading, save, reload };
}