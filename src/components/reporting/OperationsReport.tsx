import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { MetricCard, EmptyState } from "./MetricCard";
import type { OpsReport as OpsData } from "@/lib/reporting";
import { AlertTriangle, Clock, Layers, Workflow, ChevronRight } from "lucide-react";

export function OperationsReport({ data }: { data: OpsData }) {
  return (
    <div className="space-y-6">
      {/* METRICS ROW */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <MetricCard
          label="Active work"
          value={data.activeJobs}
          hint={`${data.onHoldJobs} on hold`}
        />
        <MetricCard
          label="Completed"
          value={data.completedJobs}
          hint={
            data.avgCompletionDays
              ? `${data.avgCompletionDays}d average`
              : "no completions yet"
          }
          tone="positive"
        />
        <MetricCard
          label="Overdue steps"
          value={data.overdueStages.length}
          tone={data.overdueStages.length ? "danger" : "default"}
          hint="past SLA deadline"
        />
        <MetricCard
          label="Awaiting approval"
          value={data.pendingApprovals}
          tone={data.pendingApprovals ? "warning" : "default"}
        />
        <MetricCard
          label="SLA compliance"
          value={data.slaTracked ? `${data.slaCompliance}%` : "—"}
          hint={`${data.slaMet}/${data.slaTracked} on time`}
          tone={
            data.slaCompliance >= 80
              ? "positive"
              : data.slaTracked
              ? "warning"
              : "default"
          }
        />
      </div>

      {/* PERFORMANCE & STEP LOAD */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* WORKFLOW PERFORMANCE */}
        <Card className="border-white/[0.08] bg-[#0c1017]/80 backdrop-blur-md shadow-xl">
          <CardHeader className="border-b border-white/[0.06] pb-3.5">
            <CardTitle className="flex items-center gap-2 text-base font-bold text-white">
              <Workflow className="h-4 w-4 text-cyan-400" />
              <span>Workflow performance</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-4">
            {data.workflows.length === 0 ? (
              <EmptyState message="No work has run through a workflow yet." />
            ) : (
              data.workflows.map((w) => {
                const completionPct = (w.completed / Math.max(w.total, 1)) * 100;
                return (
                  <div
                    key={w.templateId}
                    className="group relative overflow-hidden rounded-xl border border-white/[0.06] bg-[#121822]/60 p-3.5 transition-all duration-300 hover:border-cyan-500/30 hover:bg-[#121822]"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-slate-100">{w.name}</p>
                      <Badge
                        variant="secondary"
                        className="border border-white/10 bg-white/[0.05] text-[11px] text-slate-300"
                      >
                        {w.total} jobs
                      </Badge>
                    </div>

                    <div className="mt-2.5">
                      <Progress
                        value={completionPct}
                        className="h-1.5 bg-white/[0.08]"
                      />
                    </div>

                    <div className="mt-2.5 flex flex-wrap gap-3 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                        {w.active} active
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        {w.completed} completed
                      </span>
                      {w.overdue > 0 && (
                        <span className="flex items-center gap-1 font-semibold text-red-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse" />
                          {w.overdue} overdue
                        </span>
                      )}
                      {w.avgDays > 0 && (
                        <span className="text-slate-500">{w.avgDays}d avg cycle</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* STEP LOAD */}
        <Card className="border-white/[0.08] bg-[#0c1017]/80 backdrop-blur-md shadow-xl">
          <CardHeader className="border-b border-white/[0.06] pb-3.5">
            <CardTitle className="flex items-center gap-2 text-base font-bold text-white">
              <Layers className="h-4 w-4 text-cyan-400" />
              <span>Step load</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-4">
            {data.stageLoad.length === 0 ? (
              <EmptyState message="No steps in progress." />
            ) : (
              data.stageLoad.slice(0, 12).map((s) => (
                <div
                  key={s.name}
                  className="flex items-center justify-between rounded-lg border border-white/[0.04] bg-white/[0.02] p-2.5 text-sm transition-colors hover:border-white/10 hover:bg-white/[0.04]"
                >
                  <span className="truncate text-slate-300 font-medium">{s.name}</span>
                  <span className="flex shrink-0 items-center gap-1.5 text-xs">
                    <Badge
                      variant="secondary"
                      className="border border-cyan-500/20 bg-cyan-500/10 text-cyan-300 text-[10px]"
                    >
                      {s.active} active
                    </Badge>
                    {s.pending > 0 && (
                      <Badge className="border border-amber-500/30 bg-amber-500/15 text-amber-400 hover:bg-amber-500/15 text-[10px]">
                        {s.pending} approval
                      </Badge>
                    )}
                    {s.overdue > 0 && (
                      <Badge
                        variant="destructive"
                        className="border border-red-500/30 bg-red-500/20 text-red-300 text-[10px]"
                      >
                        {s.overdue} late
                      </Badge>
                    )}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* OVERDUE WORK */}
        <Card className="lg:col-span-2 border-white/[0.08] bg-[#0c1017]/80 backdrop-blur-md shadow-xl">
          <CardHeader className="border-b border-white/[0.06] pb-3.5">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base font-bold text-white">
                <AlertTriangle className="h-4 w-4 text-red-400 animate-pulse" />
                <span>Overdue work</span>
              </CardTitle>
              {data.overdueStages.length > 0 && (
                <Badge
                  variant="destructive"
                  className="border border-red-500/30 bg-red-500/10 text-red-400 text-xs"
                >
                  {data.overdueStages.length} critical items
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-2 pt-4">
            {data.overdueStages.length === 0 ? (
              <EmptyState message="Nothing is past its SLA." />
            ) : (
              data.overdueStages.slice(0, 15).map(({ stage, job, hoursOver }) => (
                <Link
                  key={stage.id}
                  to={`/jobs/${stage.job_id}`}
                  className="group flex items-center justify-between rounded-xl border border-white/[0.06] bg-[#121822]/60 p-3 text-sm transition-all duration-200 hover:border-red-500/40 hover:bg-red-500/[0.04]"
                >
                  <div className="min-w-0 pr-3">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white group-hover:text-red-300 transition-colors">
                        {job?.job_number || "Job"}
                      </span>
                      {job?.client_name && (
                        <span className="truncate text-xs text-slate-400">
                          · {job.client_name}
                        </span>
                      )}
                    </div>
                    <span className="mt-0.5 block text-xs text-slate-400">
                      {stage.stage_name || stage.stage}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Badge
                      variant="destructive"
                      className="border border-red-500/40 bg-red-500/20 text-red-300 font-mono text-xs shadow-[0_0_10px_rgba(239,68,68,0.2)]"
                    >
                      <Clock className="mr-1 h-3 w-3" />
                      {Math.round(hoursOver)}h over
                    </Badge>
                    <ChevronRight className="h-4 w-4 text-slate-600 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-300" />
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}