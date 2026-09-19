import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import type { Account, Activity, Contact, Deal, Lead, Opportunity } from "@/lib/crm";
import { CURRENCY_CODE } from "@/lib/currency";

export type Job = Tables<"jobs">;
export type JobStage = Tables<"job_stages">;
export type Payment = Tables<"job_payments">;
export type Variation = Tables<"job_variations">;
export type Drawing = Tables<"shop_drawings">;
export type AuditEntry = Tables<"audit_log">;
export type Expense = Tables<"expenses">;

/** A quote or invoice derived from synced stage form_data — no duplicated storage. */
export interface FinanceDoc {
  jobId: string;
  jobNumber: string;
  reference: string;
  amount: number | null;
  currency: string;
  documentUrl: string | null;
  syncedAt: string | null;
  dueDate: string | null;
}

export interface Client360Data {
  account: Account | null;
  contacts: Contact[];
  leads: Lead[];
  opportunities: Opportunity[];
  deals: Deal[];
  jobs: Job[];
  stages: JobStage[];
  payments: Payment[];
  variations: Variation[];
  drawings: Drawing[];
  activities: Activity[];
  audit: AuditEntry[];
  templates: Tables<"sop_templates">[];
  quotes: FinanceDoc[];
  invoices: FinanceDoc[];
  expenses: Expense[];
}

const EMPTY: Client360Data = {
  account: null, contacts: [], leads: [], opportunities: [], deals: [], jobs: [], stages: [],
  payments: [], variations: [], drawings: [], activities: [], audit: [], templates: [],
  quotes: [], invoices: [], expenses: [],
};

const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

function deriveFinance(stages: JobStage[], jobs: Job[]) {
  const jobById = new Map(jobs.map((j) => [j.id, j]));
  const quotes: FinanceDoc[] = [];
  const invoices: FinanceDoc[] = [];
  for (const s of stages) {
    const fd = (s.form_data as Record<string, unknown> | null) || {};
    const jobNumber = jobById.get(s.job_id)?.job_number || "—";
    if (fd.quote_ref) {
      quotes.push({
        jobId: s.job_id, jobNumber, reference: String(fd.quote_ref),
        amount: num(fd.total_amount ?? fd.quote_amount),
        currency: String(fd.currency || CURRENCY_CODE),
        documentUrl: (fd.quote_document_url as string) || null,
        syncedAt: (fd.api_synced_at as string) || null,
        dueDate: null,
      });
    }
    if (fd.invoice_number) {
      invoices.push({
        jobId: s.job_id, jobNumber, reference: String(fd.invoice_number),
        amount: num(fd.invoice_amount),
        currency: String(fd.currency || CURRENCY_CODE),
        documentUrl: (fd.invoice_document_url as string) || null,
        syncedAt: (fd.api_synced_at as string) || null,
        dueDate: (fd.due_date as string) || null,
      });
    }
  }
  return { quotes, invoices };
}

/** Loads every record already linked to an account into one relationship view. */
export function useClient360(accountId: string | undefined) {
  const [data, setData] = useState<Client360Data>(EMPTY);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!accountId) return;
    const [a, c, l, o, d, j, act] = await Promise.all([
      supabase.from("accounts").select("*").eq("id", accountId).maybeSingle(),
      supabase.from("contacts").select("*").eq("account_id", accountId).order("created_at"),
      supabase.from("leads").select("*").eq("account_id", accountId).order("created_at", { ascending: false }),
      supabase.from("opportunities").select("*").eq("account_id", accountId).order("created_at", { ascending: false }),
      supabase.from("deals").select("*").eq("account_id", accountId).order("created_at", { ascending: false }),
      supabase.from("jobs").select("*").eq("account_id", accountId).order("created_at", { ascending: false }),
      supabase.from("activities").select("*").eq("account_id", accountId).order("created_at", { ascending: false }),
    ]);

    const jobs = (j.data || []) as Job[];
    const jobIds = jobs.map((x) => x.id);
    const templateIds = [...new Set(jobs.map((x) => x.template_id).filter(Boolean))] as string[];

    // Costs can be booked against the client directly or against any of its work items.
    const expRes = await supabase
      .from("expenses")
      .select("*")
      .or(
        jobIds.length
          ? `account_id.eq.${accountId},job_id.in.(${jobIds.join(",")})`
          : `account_id.eq.${accountId}`,
      )
      .order("spent_at", { ascending: false });

    const [st, pay, vari, dr, au, tpl] = await Promise.all([
      jobIds.length ? supabase.from("job_stages").select("*").in("job_id", jobIds).order("position") : Promise.resolve({ data: [] }),
      jobIds.length ? supabase.from("job_payments").select("*").in("job_id", jobIds).order("paid_at", { ascending: false }) : Promise.resolve({ data: [] }),
      jobIds.length ? supabase.from("job_variations").select("*").in("job_id", jobIds).order("created_at", { ascending: false }) : Promise.resolve({ data: [] }),
      jobIds.length ? supabase.from("shop_drawings").select("*").in("job_id", jobIds).order("created_at", { ascending: false }) : Promise.resolve({ data: [] }),
      jobIds.length ? supabase.from("audit_log").select("*").in("job_id", jobIds).order("created_at", { ascending: false }).limit(100) : Promise.resolve({ data: [] }),
      templateIds.length ? supabase.from("sop_templates").select("*").in("id", templateIds) : Promise.resolve({ data: [] }),
    ]);

    const stages = (st.data || []) as JobStage[];
    const { quotes, invoices } = deriveFinance(stages, jobs);

    setData({
      account: a.data as Account | null,
      contacts: (c.data || []) as Contact[],
      leads: (l.data || []) as Lead[],
      opportunities: (o.data || []) as Opportunity[],
      deals: (d.data || []) as Deal[],
      jobs,
      stages,
      payments: (pay.data || []) as Payment[],
      variations: (vari.data || []) as Variation[],
      drawings: (dr.data || []) as Drawing[],
      activities: (act.data || []) as Activity[],
      audit: (au.data || []) as AuditEntry[],
      templates: (tpl.data || []) as Tables<"sop_templates">[],
      quotes,
      invoices,
      expenses: (expRes.data || []) as Expense[],
    });
    setLoading(false);
  }, [accountId]);

  useEffect(() => { load(); }, [load]);

  return { ...data, loading, reload: load };
}
