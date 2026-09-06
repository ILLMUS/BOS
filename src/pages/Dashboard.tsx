import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import KpiCards, { type Kpi } from "@/components/dashboard/os/KpiCards";
import PipelineFunnel, { type FunnelRow } from "@/components/dashboard/os/PipelineFunnel";
import JobPipelineBoard, { INITIAL_TINTS, type BoardColumn } from "@/components/dashboard/os/JobPipelineBoard";
import MyAssignments, { type AssignmentRow } from "@/components/dashboard/os/MyAssignments";
import DonutStat from "@/components/dashboard/os/DonutStat";
import RevenueOverview, { type RevenuePoint } from "@/components/dashboard/os/RevenueOverview";
import WorkflowPerformance, { type WorkflowRow } from "@/components/dashboard/os/WorkflowPerformance";
import RecentActivityPanel, { type ActivityRow } from "@/components/dashboard/os/RecentActivityPanel";
import OverdueStagesWidget from "@/components/dashboard/OverdueStagesWidget";
import PendingApprovalsQueue from "@/components/dashboard/PendingApprovalsQueue";
import { STAGE_LABELS } from "@/lib/constants";
import { CURRENCY_SYMBOL } from "@/lib/currency";
import {
  DollarSign,
  Users,
  FolderOpen,
  AlertTriangle,
  BarChart3,
  Plus,
  Loader2,
} from "lucide-react";

const CUR = CURRENCY_SYMBOL;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const money = (n: number) =>
  `${CUR}${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const shortMoney = (n: number) => `${CUR}${Math.round(n).toLocaleString()}`;

interface JobRow {
  id: string;
  job_number: string;
  client_name: string;
  service_type: string | null;
  current_stage: string;
  status: string;
  created_at: string;
  template_id: string | null;
}

interface StageRow {
  id: string;
  job_id: string;
  stage: string | null;
  stage_name: string | null;
  position: number;
  status: string;
  primary_owner_id: string | null;
  secondary_owner_id: string | null;
  sla_started_at: string | null;
  sla_deadline_hours: number | null;
}

export default function Dashboard() {
  const { user, isAdmin, hasRole } = useAuth();
  const navigate = useNavigate();
  const isSuperAdmin = hasRole("super_admin");

  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [stages, setStages] = useState<StageRow[]>([]);
  const [payments, setPayments] = useState<{ amount: number; paid_at: string }[]>([]);
  const [templates, setTemplates] = useState<{ id: string; name: string }[]>([]);
  const [activity, setActivity] = useState<ActivityRow[]>([]);

  const fetchData = useCallback(async () => {
    const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10);

    const [jobsRes, stagesRes, payRes, tplRes, auditRes] = await Promise.all([
      supabase
        .from("jobs")
        .select("id, job_number, client_name, service_type, current_stage, status, created_at, template_id")
        .order("updated_at", { ascending: false }),
      supabase
        .from("job_stages")
        .select(
          "id, job_id, stage, stage_name, position, status, primary_owner_id, secondary_owner_id, sla_started_at, sla_deadline_hours"
        ),
      supabase.from("job_payments").select("amount, paid_at").gte("paid_at", yearStart),
      supabase.from("sop_templates").select("id, name"),
      supabase
        .from("audit_log")
        .select("id, action, created_at, job_id, details")
        .order("created_at", { ascending: false })
        .limit(8),
    ]);

    setJobs((jobsRes.data as JobRow[]) || []);
    setStages((stagesRes.data as StageRow[]) || []);
    setPayments(((payRes.data as any[]) || []).map((p) => ({ amount: Number(p.amount), paid_at: p.paid_at })));
    setTemplates((tplRes.data as any[]) || []);

    const tones = [
      "hsl(var(--chart-1) / 0.18)",
      "hsl(var(--chart-2) / 0.18)",
      "hsl(var(--chart-6) / 0.18)",
      "hsl(var(--chart-3) / 0.2)",
    ];
    setActivity(
      ((auditRes.data as any[]) || []).map((a, i) => ({
        id: a.id,
        text: a.action,
        meta: new Date(a.created_at).toLocaleString(),
        jobId: a.job_id,
        tone: tones[i % tones.length],
      }))
    );

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    let debounce: number | null = null;
    const schedule = () => {
      if (debounce) window.clearTimeout(debounce);
      debounce = window.setTimeout(() => fetchData(), 400);
    };
    const channel = supabase
      .channel("dashboard-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "jobs" }, schedule)
      .on("postgres_changes", { event: "*", schema: "public", table: "job_stages" }, schedule)
      .subscribe();
    const tick = window.setInterval(fetchData, 60_000);
    return () => {
      if (debounce) window.clearTimeout(debounce);
      window.clearInterval(tick);
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  const model = useMemo(() => {
    const now = new Date();
    const activeJobs = jobs.filter((j) => j.status === "active");
    const completedJobs = jobs.filter((j) => j.status === "completed");

    // --- Revenue ---
    const monthly: RevenuePoint[] = MONTHS.map((m) => ({ month: m, value: 0 }));
    payments.forEach((p) => {
      const d = new Date(p.paid_at);
      if (d.getFullYear() === now.getFullYear()) monthly[d.getMonth()].value += p.amount;
    });
    const thisMonth = monthly[now.getMonth()].value;
    const lastMonth = now.getMonth() > 0 ? monthly[now.getMonth() - 1].value : 0;
    const revenueDelta = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : null;
    const pipelineValue = payments.reduce((n, p) => n + p.amount, 0);

    // --- SLA ---
    const liveStages = stages.filter(
      (s) => s.status === "active" && s.sla_started_at && s.sla_deadline_hours
    );
    let onTime = 0;
    let atRisk = 0;
    let overdue = 0;
    liveStages.forEach((s) => {
      const started = new Date(s.sla_started_at!).getTime();
      const deadline = started + s.sla_deadline_hours! * 3600_000;
      const elapsed = now.getTime() - started;
      const frac = elapsed / (deadline - started);
      if (now.getTime() > deadline) overdue += 1;
      else if (frac > 0.8) atRisk += 1;
      else onTime += 1;
    });
    const slaTotal = liveStages.length;
    const compliance = slaTotal > 0 ? Math.round(((onTime + atRisk) / slaTotal) * 100) : 100;

    // --- Funnel ---
    const stageCount = Math.max(...stages.map((s) => s.position + 1), 1);
    const progressOf = (jobId: string) => {
      const js = stages.filter((s) => s.job_id === jobId);
      const done = js.filter((s) => s.status === "approved").length;
      return js.length > 0 ? done / js.length : 0;
    };
    const funnel: FunnelRow[] = [
      { label: "Work Items", value: jobs.length, caption: `${jobs.length} total`, color: "hsl(var(--chart-1))" },
      {
        label: "In Progress",
        value: activeJobs.length,
        caption: `${activeJobs.length} active`,
        color: "hsl(var(--chart-2))",
      },
      {
        label: "Past Halfway",
        value: activeJobs.filter((j) => progressOf(j.id) >= 0.5).length,
        caption: "over 50% of stages approved",
        color: "hsl(var(--chart-3))",
      },
      {
        label: "Near Completion",
        value: activeJobs.filter((j) => progressOf(j.id) >= 0.8).length,
        caption: "over 80% of stages approved",
        color: "hsl(var(--chart-4))",
      },
      {
        label: "Completed",
        value: completedJobs.length,
        caption: `${completedJobs.length} closed out`,
        color: "hsl(var(--chart-2))",
      },
    ];

    // --- Pipeline board grouped by live stage name ---
    const byStage = new Map<string, { position: number; jobs: JobRow[] }>();
    activeJobs.forEach((job) => {
      const live =
        stages.find((s) => s.job_id === job.id && (s.status === "active" || s.status === "pending_approval")) ??
        null;
      const name =
        live?.stage_name ??
        (live?.stage ? STAGE_LABELS[live.stage as keyof typeof STAGE_LABELS] : null) ??
        STAGE_LABELS[job.current_stage as keyof typeof STAGE_LABELS] ??
        "Unassigned";
      const entry = byStage.get(name) ?? { position: live?.position ?? 99, jobs: [] };
      entry.jobs.push(job);
      byStage.set(name, entry);
    });
    const columns: BoardColumn[] = [...byStage.entries()]
      .sort((a, b) => a[1].position - b[1].position)
      .slice(0, 6)
      .map(([name, v], i) => ({
        name,
        tint: INITIAL_TINTS[i % INITIAL_TINTS.length],
        jobs: v.jobs.map((j) => ({
          id: j.id,
          job_number: j.job_number,
          title: j.service_type || j.client_name,
          client: j.client_name,
        })),
      }));

    // --- My assignments ---
    const jobMap = new Map(jobs.map((j) => [j.id, j]));
    const assignments: AssignmentRow[] = stages
      .filter(
        (s) =>
          (s.status === "active" || s.status === "pending_approval") &&
          (s.primary_owner_id === user?.id || s.secondary_owner_id === user?.id)
      )
      .map((s) => {
        const job = jobMap.get(s.job_id);
        const deadline =
          s.sla_started_at && s.sla_deadline_hours
            ? new Date(new Date(s.sla_started_at).getTime() + s.sla_deadline_hours * 3600_000)
            : null;
        const hoursLeft = deadline ? (deadline.getTime() - now.getTime()) / 3600_000 : null;
        return {
          id: s.id,
          jobId: s.job_id,
          stage: s.stage_name ?? (s.stage ? STAGE_LABELS[s.stage as keyof typeof STAGE_LABELS] : "Stage"),
          jobNumber: job?.job_number ?? "—",
          client: job?.client_name ?? "—",
          due: deadline ? deadline.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : null,
          priority: hoursLeft === null ? "Low" : hoursLeft < 24 ? "High" : hoursLeft < 72 ? "Medium" : "Low",
        } as AssignmentRow;
      })
      .sort((a, b) => (a.due ?? "").localeCompare(b.due ?? ""));

    // --- Workflow performance ---
    const workflows: WorkflowRow[] = templates
      .map((t) => {
        const tJobs = jobs.filter((j) => j.template_id === t.id);
        const tJobIds = new Set(tJobs.map((j) => j.id));
        const tStages = liveStages.filter((s) => tJobIds.has(s.job_id));
        const late = tStages.filter(
          (s) => now.getTime() > new Date(s.sla_started_at!).getTime() + s.sla_deadline_hours! * 3600_000
        ).length;
        return {
          name: t.name,
          active: tJobs.filter((j) => j.status === "active").length,
          completed: tJobs.filter((j) => j.status === "completed").length,
          compliance: tStages.length > 0 ? Math.round(((tStages.length - late) / tStages.length) * 100) : 100,
        };
      })
      .filter((w) => w.active + w.completed > 0)
      .sort((a, b) => b.active - a.active);

    // --- Stage workload donut ---
    const workload = [
      { label: "Active", value: stages.filter((s) => s.status === "active").length, color: "hsl(var(--chart-1))" },
      {
        label: "Awaiting approval",
        value: stages.filter((s) => s.status === "pending_approval").length,
        color: "hsl(var(--chart-3))",
      },
      { label: "Approved", value: stages.filter((s) => s.status === "approved").length, color: "hsl(var(--chart-2))" },
      { label: "Locked", value: stages.filter((s) => s.status === "locked").length, color: "hsl(var(--chart-6))" },
    ];

    const kpis: Kpi[] = [
      {
        label: "Total Revenue",
        hint: "This Month",
        value: money(thisMonth),
        delta: revenueDelta,
        icon: DollarSign,
        tone: "violet",
      },
      {
        label: "Open Opportunities",
        value: String(activeJobs.filter((j) => progressOf(j.id) < 0.5).length),
        delta: null,
        icon: Users,
        tone: "green",
      },
      { label: "Active Jobs / Projects", value: String(activeJobs.length), delta: null, icon: FolderOpen, tone: "blue" },
      { label: "Overdue Stages", value: String(overdue), delta: null, icon: AlertTriangle, tone: "amber" },
      { label: "SLA Compliance", value: `${compliance}%`, delta: null, icon: BarChart3, tone: "sky" },
    ];

    return {
      kpis,
      funnel,
      pipelineValue: shortMoney(pipelineValue),
      columns,
      assignments,
      monthly,
      workflows,
      workload,
      sla: { onTime, atRisk, overdue, compliance, total: slaTotal },
      stageCount,
    };
  }, [jobs, stages, payments, templates, user?.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-2">
      {isSuperAdmin && (
        <div className="flex justify-end">
          <Button onClick={() => navigate("/jobs/new")} className="rounded-xl">
            <Plus className="mr-2 h-4 w-4" />
            New Job
          </Button>
        </div>
      )}

      <KpiCards items={model.kpis} />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)_minmax(0,1fr)]">
        <PipelineFunnel rows={model.funnel} pipelineValue={model.pipelineValue} />
        <JobPipelineBoard columns={model.columns} />
        <MyAssignments rows={model.assignments} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <DonutStat
          title="SLA Performance"
          pill="All Workflows"
          centerValue={`${model.sla.compliance}%`}
          centerLabel="On Track"
          slices={[
            { label: "On Time", value: model.sla.onTime, color: "hsl(var(--chart-2))" },
            { label: "At Risk", value: model.sla.atRisk, color: "hsl(var(--chart-3))" },
            { label: "Overdue", value: model.sla.overdue, color: "hsl(var(--chart-5))" },
          ]}
        />
        <DonutStat
          title="Stage Workload"
          pill="All Jobs"
          centerValue={String(model.workload.reduce((n, w) => n + w.value, 0))}
          centerLabel="Total Stages"
          slices={model.workload}
        />
        <RecentActivityPanel rows={activity} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <RevenueOverview data={model.monthly} currency={CUR} />
        <WorkflowPerformance rows={model.workflows} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <PendingApprovalsQueue />
        {isAdmin && <OverdueStagesWidget />}
      </div>
    </div>
  );
}
