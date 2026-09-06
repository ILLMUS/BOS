import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  computeTotals, deriveFinanceDocs, mergeDocs, splitExternalDocs,
  type Expense, type ExternalDoc, type FinanceDoc, type FinanceTotals, type Job, type JobStage, type Payment, type Variation,
} from "@/lib/finance";
import type { Tables } from "@/integrations/supabase/types";

export interface FinanceData {
  jobs: Job[];
  accounts: Tables<"accounts">[];
  deals: Tables<"deals">[];
  payments: Payment[];
  variations: Variation[];
  expenses: Expense[];
  quotes: FinanceDoc[];
  invoices: FinanceDoc[];
  receipts: ExternalDoc[];
  externalDocs: ExternalDoc[];
  totals: FinanceTotals;
}

const EMPTY: FinanceData = {
  jobs: [], accounts: [], deals: [], payments: [], variations: [], expenses: [],
  quotes: [], invoices: [], receipts: [], externalDocs: [],
  totals: { quoted: 0, approvedVariations: 0, invoiced: 0, received: 0, outstanding: 0, expenses: 0, netRevenue: 0 },
};

/** Org-wide finance view built entirely from existing job, deal and client records. */
export function useFinance() {
  const { orgId } = useAuth();
  const [data, setData] = useState<FinanceData>(EMPTY);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!orgId) { setData(EMPTY); setLoading(false); return; }
    setLoading(true);

    const [jobsRes, accRes, dealRes, expRes, docRes] = await Promise.all([
      supabase.from("jobs").select("*").eq("org_id", orgId).order("created_at", { ascending: false }),
      supabase.from("accounts").select("*").eq("org_id", orgId).order("name"),
      supabase.from("deals").select("*").eq("org_id", orgId).order("created_at", { ascending: false }),
      supabase.from("expenses").select("*").eq("org_id", orgId).order("spent_at", { ascending: false }),
      supabase.from("finance_documents").select("*").eq("org_id", orgId).order("issued_at", { ascending: false }),
    ]);

    const jobs = (jobsRes.data || []) as Job[];
    const jobIds = jobs.map((j) => j.id);

    const [stageRes, payRes, varRes] = await Promise.all([
      jobIds.length ? supabase.from("job_stages").select("*").in("job_id", jobIds) : Promise.resolve({ data: [] }),
      jobIds.length ? supabase.from("job_payments").select("*").in("job_id", jobIds).order("paid_at", { ascending: false }) : Promise.resolve({ data: [] }),
      jobIds.length ? supabase.from("job_variations").select("*").in("job_id", jobIds).order("created_at", { ascending: false }) : Promise.resolve({ data: [] }),
    ]);

    const stages = (stageRes.data || []) as JobStage[];
    const payments = (payRes.data || []) as Payment[];
    const variations = (varRes.data || []) as Variation[];
    const expenses = (expRes.data || []) as Expense[];
    const derived = deriveFinanceDocs(stages, jobs);
    const externalDocs = (docRes.data || []) as ExternalDoc[];
    const external = splitExternalDocs(externalDocs, jobs);
    const quotes = mergeDocs(external.quotes, derived.quotes);
    const invoices = mergeDocs(external.invoices, derived.invoices);

    setData({
      jobs,
      accounts: (accRes.data || []) as Tables<"accounts">[],
      deals: (dealRes.data || []) as Tables<"deals">[],
      payments, variations, expenses, quotes, invoices,
      receipts: external.receipts,
      externalDocs,
      totals: computeTotals({ quotes, invoices, payments, variations, expenses, receipts: external.receipts }),
    });
    setLoading(false);
  }, [orgId]);

  useEffect(() => { load(); }, [load]);

  return { ...data, loading, reload: load };
}
