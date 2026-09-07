import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { JournalEntry, JournalLine, LedgerAccount } from "@/lib/ledger";

export interface LedgerData {
  accounts: LedgerAccount[];
  entries: JournalEntry[];
  lines: JournalLine[];
}

const EMPTY: LedgerData = { accounts: [], entries: [], lines: [] };

/** Double-entry ledger for the active workspace. */
export function useLedger() {
  const { orgId } = useAuth();
  const [data, setData] = useState<LedgerData>(EMPTY);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!orgId) { setData(EMPTY); setLoading(false); return; }
    setLoading(true);

    const [accRes, entRes, lineRes] = await Promise.all([
      supabase.from("ledger_accounts").select("*").eq("org_id", orgId).order("code"),
      supabase.from("journal_entries").select("*").eq("org_id", orgId).order("entry_date", { ascending: false }).order("entry_no", { ascending: false }),
      supabase.from("journal_lines").select("*").eq("org_id", orgId),
    ]);

    setData({
      accounts: (accRes.data || []) as LedgerAccount[],
      entries: (entRes.data || []) as JournalEntry[],
      lines: (lineRes.data || []) as JournalLine[],
    });
    setLoading(false);
  }, [orgId]);

  useEffect(() => { load(); }, [load]);

  return { ...data, orgId, loading, reload: load };
}
