import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Expense, Job, JobStage, Payment, Variation } from "@/lib/finance";
import {
  buildFinanceReport, buildOpsReport, buildPeopleReport, buildSalesReport,
  withinOrAll,
  type Deal, type Lead, type Opportunity, type Profile, type ReportRange, type Template,
} from "@/lib/reporting";

interface RawData {
  jobs: Job[];
  stages: JobStage[];
  leads: Lead[];
  opportunities: Opportunity[];
  deals: Deal[];
  payments: Payment[];
  variations: Variation[];
  expenses: Expense[];
  profiles: Profile[];
  templates: Template[];
}

const EMPTY: RawData = {
  jobs: [], stages: [], leads: [], opportunities: [], deals: [],
  payments: [], variations: [], expenses: [], profiles: [], templates: [],
};

/**
 * Single org-scoped read of the existing Business OS tables. RLS still applies,
 * so a member only ever sees what their organization permissions allow.
 */
export function useReporting(range: ReportRange) {
  const { orgId } = useAuth();
  const [raw, setRaw] = useState<RawData>(EMPTY);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!orgId) { setRaw(EMPTY); setLoading(false); return; }
    setLoading(true);

    const [jobsRes, leadsRes, oppsRes, dealsRes, expRes, profRes, tmplRes] = await Promise.all([
      supabase.from("jobs").select("*").eq("org_id", orgId),
      supabase.from("leads").select("*").eq("org_id", orgId),
      supabase.from("opportunities").select("*").eq("org_id", orgId),
      supabase.from("deals").select("*").eq("org_id", orgId),
      supabase.from("expenses").select("*").eq("org_id", orgId),
      supabase.from("profiles").select("*").eq("org_id", orgId),
      supabase.from("sop_templates").select("*").eq("org_id", orgId),
    ]);

    const jobs = (jobsRes.data || []) as Job[];
    const jobIds = jobs.map((j) => j.id);
    const none = Promise.resolve({ data: [] as unknown[] });

    const [stageRes, payRes, varRes] = await Promise.all([
      jobIds.length ? supabase.from("job_stages").select("*").in("job_id", jobIds) : none,
      jobIds.length ? supabase.from("job_payments").select("*").in("job_id", jobIds) : none,
      jobIds.length ? supabase.from("job_variations").select("*").in("job_id", jobIds) : none,
    ]);

    setRaw({
      jobs,
      stages: (stageRes.data || []) as JobStage[],
      leads: (leadsRes.data || []) as Lead[],
      opportunities: (oppsRes.data || []) as Opportunity[],
      deals: (dealsRes.data || []) as Deal[],
      payments: (payRes.data || []) as Payment[],
      variations: (varRes.data || []) as Variation[],
      expenses: (expRes.data || []) as Expense[],
      profiles: (profRes.data || []) as Profile[],
      templates: (tmplRes.data || []) as Template[],
    });
    setLoading(false);
  }, [orgId]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const jobs = raw.jobs.filter((j) => withinOrAll(j.created_at, range));
    const jobIds = new Set(jobs.map((j) => j.id));
    return {
      jobs,
      stages: raw.stages.filter((s) => jobIds.has(s.job_id)),
      leads: raw.leads.filter((l) => withinOrAll(l.created_at, range)),
      opportunities: raw.opportunities.filter((o) => withinOrAll(o.created_at, range)),
      deals: raw.deals.filter((d) => withinOrAll(d.created_at, range)),
      payments: raw.payments.filter((p) => withinOrAll(p.paid_at, range)),
      variations: raw.variations.filter((v) => withinOrAll(v.created_at, range)),
      expenses: raw.expenses.filter((e) => withinOrAll(e.spent_at, range)),
      profiles: raw.profiles,
      templates: raw.templates,
    };
  }, [raw, range]);

  const sales = useMemo(
    () => buildSalesReport(filtered.leads, filtered.opportunities, filtered.deals),
    [filtered],
  );
  const ops = useMemo(
    () => buildOpsReport(filtered.jobs, filtered.stages, filtered.templates),
    [filtered],
  );
  const finance = useMemo(
    () => buildFinanceReport({
      jobs: filtered.jobs, stages: filtered.stages, payments: filtered.payments,
      variations: filtered.variations, expenses: filtered.expenses,
    }),
    [filtered],
  );
  const people = useMemo(
    () => buildPeopleReport(filtered.stages, filtered.profiles, filtered.jobs),
    [filtered],
  );

  const hasData = raw.jobs.length + raw.leads.length + raw.deals.length + raw.opportunities.length > 0;

  return { loading, reload: load, data: filtered, sales, ops, finance, people, hasData };
}
