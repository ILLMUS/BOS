import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { MetricCard, EmptyState } from "./MetricCard";
import type { OpsReport as OpsData } from "@/lib/reporting";

export function OperationsReport({ data }: { data: OpsData }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <MetricCard label="Active work" value={data.activeJobs} hint={`${data.onHoldJobs} on hold`} />
        <MetricCard label="Completed" value={data.completedJobs} hint={data.avgCompletionDays ? `${data.avgCompletionDays}d average` : "no completions yet"} tone="positive" />
        <MetricCard label="Overdue steps" value={data.overdueStages.length} tone={data.overdueStages.length ? "danger" : "default"} hint="past SLA deadline" />
        <MetricCard label="Awaiting approval" value={data.pendingApprovals} tone={data.pendingApprovals ? "warning" : "default"} />
        <MetricCard label="SLA compliance" value={data.slaTracked ? `${data.slaCompliance}%` : "—"} hint={`${data.slaMet}/${data.slaTracked} on time`} tone={data.slaCompliance >= 80 ? "positive" : data.slaTracked ? "warning" : "default"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Workflow performance</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {data.workflows.length === 0 ? <EmptyState message="No work has run through a workflow yet." /> :
              data.workflows.map((w) => (
                <div key={w.templateId} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{w.name}</p>
                    <Badge variant="secondary">{w.total} jobs</Badge>
                  </div>
                  <Progress value={(w.completed / Math.max(w.total, 1)) * 100} className="mt-2 h-2" />
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span>{w.active} active</span>
                    <span>{w.completed} completed</span>
                    {w.overdue > 0 && <span className="font-medium text-destructive">{w.overdue} overdue</span>}
                    {w.avgDays > 0 && <span>{w.avgDays}d avg cycle</span>}
                  </div>
                </div>
              ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Step load</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {data.stageLoad.length === 0 ? <EmptyState message="No steps in progress." /> :
              data.stageLoad.slice(0, 12).map((s) => (
                <div key={s.name} className="flex items-center justify-between text-sm">
                  <span className="truncate text-muted-foreground">{s.name}</span>
                  <span className="flex shrink-0 items-center gap-2 text-xs">
                    <Badge variant="secondary">{s.active} active</Badge>
                    {s.pending > 0 && <Badge className="bg-amber-500/15 text-amber-600 hover:bg-amber-500/15">{s.pending} approval</Badge>}
                    {s.overdue > 0 && <Badge variant="destructive">{s.overdue} late</Badge>}
                  </span>
                </div>
              ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Overdue work</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {data.overdueStages.length === 0 ? <EmptyState message="Nothing is past its SLA. " /> :
              data.overdueStages.slice(0, 15).map(({ stage, job, hoursOver }) => (
                <Link
                  key={stage.id}
                  to={`/jobs/${stage.job_id}`}
                  className="flex items-center justify-between rounded-lg border p-3 text-sm hover:bg-muted/50"
                >
                  <span className="min-w-0">
                    <span className="font-medium">{job?.job_number || "Job"}</span>
                    <span className="ml-2 truncate text-muted-foreground">{job?.client_name}</span>
                    <span className="block text-xs text-muted-foreground">{stage.stage_name || stage.stage}</span>
                  </span>
                  <Badge variant="destructive">{Math.round(hoursOver)}h over</Badge>
                </Link>
              ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
