import type { Tables } from "@/integrations/supabase/types";
import { formatCurrency } from "@/lib/currency";
import {
  computeTotals, deriveFinanceDocs, monthlyRevenue, sum,
  type Expense, type FinanceDoc, type FinanceTotals, type Job, type JobStage, type Payment, type Variation,
} from "@/lib/finance";

export type Lead = Tables<"leads">;
export type Opportunity = Tables<"opportunities">;
export type Deal = Tables<"deals">;
export type Profile = Tables<"profiles">;
export type Template = Tables<"sop_templates">;

export interface ReportRange {
  from: Date | null;
  to: Date | null;
}

export const inRange = (iso: string | null | undefined, r: ReportRange) => {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  if (r.from && t < r.from.getTime()) return false;
  if (r.to && t > r.to.getTime()) return false;
  return true;
};

/** Keeps a record when no range is set, otherwise filters on its created date. */
export const withinOrAll = (iso: string | null | undefined, r: ReportRange) =>
  !r.from && !r.to ? true : inRange(iso, r);

/* ── SALES ─────────────────────────────────────────── */

export interface SalesReport {
  leadsTotal: number;
  leadsByStatus: { label: string; key: string; count: number }[];
  qualified: number;
  converted: number;
  disqualified: number;
  leadConversionRate: number;
  opportunitiesTotal: number;
  opportunityValue: number;
  weightedPipeline: number;
  opportunitiesByStage: { label: string; key: string; count: number; value: number }[];
  dealsTotal: number;
  dealsWon: number;
  dealsLost: number;
  dealsOpen: number;
  wonValue: number;
  lostValue: number;
  openValue: number;
  winRate: number;
  avgDealValue: number;
  funnel: { label: string; count: number; value: number }[];
  lostReasons: { reason: string; count: number }[];
  sources: { source: string; count: number }[];
}

const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 1000) / 10 : 0);

export function buildSalesReport(
  leads: Lead[], opportunities: Opportunity[], deals: Deal[],
): SalesReport {
  const statuses = ["new", "working", "qualified", "converted", "disqualified"];
  const stages = ["discovery", "scoping", "proposal", "negotiation", "won", "lost"];

  const qualified = leads.filter((l) => l.status === "qualified" || l.status === "converted").length;
  const converted = leads.filter((l) => l.status === "converted").length;
  const won = deals.filter((d) => d.status === "won");
  const lost = deals.filter((d) => d.status === "lost");
  const open = deals.filter((d) => d.status === "open");
  const openOpps = opportunities.filter((o) => o.stage !== "won" && o.stage !== "lost");

  const wonValue = sum(won.map((d) => d.value));

  const lostMap = new Map<string, number>();
  for (const d of lost) {
    const key = (d.lost_reason || "Unspecified").trim() || "Unspecified";
    lostMap.set(key, (lostMap.get(key) ?? 0) + 1);
  }
  const sourceMap = new Map<string, number>();
  for (const l of leads) {
    const key = (l.source || "Unknown").trim() || "Unknown";
    sourceMap.set(key, (sourceMap.get(key) ?? 0) + 1);
  }

  return {
    leadsTotal: leads.length,
    leadsByStatus: statuses.map((s) => ({
      key: s, label: s.charAt(0).toUpperCase() + s.slice(1),
      count: leads.filter((l) => l.status === s).length,
    })),
    qualified,
    converted,
    disqualified: leads.filter((l) => l.status === "disqualified").length,
    leadConversionRate: pct(converted, leads.length),
    opportunitiesTotal: opportunities.length,
    opportunityValue: sum(opportunities.map((o) => o.value)),
    weightedPipeline: openOpps.reduce(
      (s, o) => s + Number(o.value || 0) * (Number(o.probability || 0) / 100), 0,
    ),
    opportunitiesByStage: stages.map((s) => {
      const rows = opportunities.filter((o) => o.stage === s);
      return {
        key: s, label: s.charAt(0).toUpperCase() + s.slice(1),
        count: rows.length, value: sum(rows.map((o) => o.value)),
      };
    }),
    dealsTotal: deals.length,
    dealsWon: won.length,
    dealsLost: lost.length,
    dealsOpen: open.length,
    wonValue,
    lostValue: sum(lost.map((d) => d.value)),
    openValue: sum(open.map((d) => d.value)),
    winRate: pct(won.length, won.length + lost.length),
    avgDealValue: won.length ? Math.round(wonValue / won.length) : 0,
    funnel: [
      { label: "Leads", count: leads.length, value: sum(leads.map((l) => l.estimated_value)) },
      { label: "Qualified", count: qualified, value: 0 },
      { label: "Opportunities", count: opportunities.length, value: sum(opportunities.map((o) => o.value)) },
      { label: "Deals", count: deals.length, value: sum(deals.map((d) => d.value)) },
      { label: "Won", count: won.length, value: wonValue },
    ],
    lostReasons: [...lostMap.entries()].map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count),
    sources: [...sourceMap.entries()].map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count),
  };
}

/* ── OPERATIONS ────────────────────────────────────── */

export const HOUR_MS = 3_600_000;

/** Hours a stage is past its SLA deadline. Negative means still in time. */
export function slaOverdueHours(stage: JobStage, now = Date.now()): number | null {
  if (!stage.sla_started_at || !stage.sla_deadline_hours) return null;
  const deadline = new Date(stage.sla_started_at).getTime() + stage.sla_deadline_hours * HOUR_MS;
  const end = stage.approved_at ? new Date(stage.approved_at).getTime() : now;
  return (end - deadline) / HOUR_MS;
}

export interface OpsReport {
  activeJobs: number;
  completedJobs: number;
  onHoldJobs: number;
  cancelledJobs: number;
  pendingApprovals: number;
  overdueStages: { stage: JobStage; job: Job | undefined; hoursOver: number }[];
  slaTracked: number;
  slaMet: number;
  slaCompliance: number;
  avgStageHours: number;
  avgCompletionDays: number;
  workflows: {
    templateId: string; name: string; total: number; active: number; completed: number;
    overdue: number; avgDays: number;
  }[];
  stageLoad: { name: string; active: number; pending: number; overdue: number }[];
}

export function buildOpsReport(
  jobs: Job[], stages: JobStage[], templates: Template[],
): OpsReport {
  const jobById = new Map(jobs.map((j) => [j.id, j]));
  const jobIds = new Set(jobs.map((j) => j.id));
  const scoped = stages.filter((s) => jobIds.has(s.job_id));
  const now = Date.now();

  const overdueStages = scoped
    .filter((s) => s.status === "active" || s.status === "pending_approval")
    .map((s) => ({ stage: s, job: jobById.get(s.job_id), hoursOver: slaOverdueHours(s, now) ?? -1 }))
    .filter((r) => r.hoursOver > 0)
    .sort((a, b) => b.hoursOver - a.hoursOver);

  const finished = scoped.filter((s) => s.approved_at && s.sla_started_at && s.sla_deadline_hours);
  const slaMet = finished.filter((s) => (slaOverdueHours(s) ?? 0) <= 0).length;

  const approved = scoped.filter((s) => s.approved_at);
  const avgStageHours = approved.length
    ? Math.round(
        approved.reduce(
          (t, s) => t + (new Date(s.approved_at!).getTime() - new Date(s.created_at).getTime()) / HOUR_MS, 0,
        ) / approved.length,
      )
    : 0;

  const done = jobs.filter((j) => j.status === "completed");
  const avgCompletionDays = done.length
    ? Math.round(
        (done.reduce((t, j) => t + (new Date(j.updated_at).getTime() - new Date(j.created_at).getTime()), 0) /
          done.length / 86_400_000) * 10,
      ) / 10
    : 0;

  const overdueJobIds = new Set(overdueStages.map((o) => o.stage.job_id));
  const workflows = templates.map((t) => {
    const rows = jobs.filter((j) => j.template_id === t.id);
    const completed = rows.filter((j) => j.status === "completed");
    const avgDays = completed.length
      ? Math.round(
          (completed.reduce(
            (s, j) => s + (new Date(j.updated_at).getTime() - new Date(j.created_at).getTime()), 0,
          ) / completed.length / 86_400_000) * 10,
        ) / 10
      : 0;
    return {
      templateId: t.id, name: t.name, total: rows.length,
      active: rows.filter((j) => j.status === "active").length,
      completed: completed.length,
      overdue: rows.filter((j) => overdueJobIds.has(j.id)).length,
      avgDays,
    };
  }).filter((w) => w.total > 0).sort((a, b) => b.total - a.total);

  const loadMap = new Map<string, { active: number; pending: number; overdue: number }>();
  const overdueStageIds = new Set(overdueStages.map((o) => o.stage.id));
  for (const s of scoped) {
    if (s.status !== "active" && s.status !== "pending_approval") continue;
    const name = s.stage_name || s.stage || "Stage";
    const row = loadMap.get(name) ?? { active: 0, pending: 0, overdue: 0 };
    if (s.status === "active") row.active += 1; else row.pending += 1;
    if (overdueStageIds.has(s.id)) row.overdue += 1;
    loadMap.set(name, row);
  }

  return {
    activeJobs: jobs.filter((j) => j.status === "active").length,
    completedJobs: done.length,
    onHoldJobs: jobs.filter((j) => j.status === "on_hold").length,
    cancelledJobs: jobs.filter((j) => j.status === "cancelled").length,
    pendingApprovals: scoped.filter((s) => s.status === "pending_approval").length,
    overdueStages,
    slaTracked: finished.length,
    slaMet,
    slaCompliance: pct(slaMet, finished.length),
    avgStageHours,
    avgCompletionDays,
    workflows,
    stageLoad: [...loadMap.entries()].map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.active + b.pending - (a.active + a.pending)),
  };
}

/* ── FINANCE ───────────────────────────────────────── */

export interface FinanceReport extends FinanceTotals {
  quotes: FinanceDoc[];
  invoices: FinanceDoc[];
  trend: { key: string; label: string; received: number; spent: number }[];
  expensesByCategory: { category: string; amount: number }[];
  collectionRate: number;
  quoteToInvoiceRate: number;
}

export function buildFinanceReport(args: {
  jobs: Job[]; stages: JobStage[]; payments: Payment[]; variations: Variation[]; expenses: Expense[];
}): FinanceReport {
  const { quotes, invoices } = deriveFinanceDocs(args.stages, args.jobs);
  const totals = computeTotals({ quotes, invoices, payments: args.payments, variations: args.variations, expenses: args.expenses });
  const catMap = new Map<string, number>();
  for (const e of args.expenses) {
    catMap.set(e.category, (catMap.get(e.category) ?? 0) + Number(e.amount || 0));
  }
  return {
    ...totals,
    quotes, invoices,
    trend: monthlyRevenue(args.payments, args.expenses, 6),
    expensesByCategory: [...catMap.entries()].map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount),
    collectionRate: pct(totals.received, totals.invoiced),
    quoteToInvoiceRate: pct(totals.invoiced, totals.quoted),
  };
}

/* ── PEOPLE ────────────────────────────────────────── */

export interface PersonReport {
  userId: string;
  name: string;
  assigned: number;
  active: number;
  pendingApproval: number;
  overdue: number;
  completed: number;
  avgHours: number;
  onTimeRate: number;
}

export function buildPeopleReport(
  stages: JobStage[], profiles: Profile[], jobs: Job[],
): PersonReport[] {
  const jobIds = new Set(jobs.map((j) => j.id));
  const scoped = stages.filter((s) => jobIds.has(s.job_id));
  const byUser = new Map<string, JobStage[]>();

  for (const s of scoped) {
    for (const id of [s.primary_owner_id, s.secondary_owner_id]) {
      if (!id) continue;
      const arr = byUser.get(id) ?? [];
      if (!arr.includes(s)) arr.push(s);
      byUser.set(id, arr);
    }
  }

  const nameById = new Map(profiles.map((p) => [p.id, p.full_name]));

  return [...byUser.entries()].map(([userId, rows]) => {
    const completed = rows.filter((s) => s.status === "approved" && s.approved_at);
    const avgHours = completed.length
      ? Math.round(
          completed.reduce(
            (t, s) => t + (new Date(s.approved_at!).getTime() - new Date(s.created_at).getTime()) / HOUR_MS, 0,
          ) / completed.length,
        )
      : 0;
    const tracked = completed.filter((s) => s.sla_started_at && s.sla_deadline_hours);
    const onTime = tracked.filter((s) => (slaOverdueHours(s) ?? 0) <= 0).length;
    return {
      userId,
      name: nameById.get(userId) || "Unassigned member",
      assigned: rows.length,
      active: rows.filter((s) => s.status === "active").length,
      pendingApproval: rows.filter((s) => s.status === "pending_approval").length,
      overdue: rows.filter(
        (s) => (s.status === "active" || s.status === "pending_approval") && (slaOverdueHours(s) ?? -1) > 0,
      ).length,
      completed: completed.length,
      avgHours,
      onTimeRate: pct(onTime, tracked.length),
    };
  }).sort((a, b) => b.active + b.pendingApproval - (a.active + a.pendingApproval));
}

export const money = (n: number) => formatCurrency(n);
