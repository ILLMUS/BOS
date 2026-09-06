import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { STAGE_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/crm";
import type { Client360Data, Job, JobStage } from "@/hooks/useClient360";
import { ArrowRight } from "lucide-react";

const stageLabel = (s: JobStage) =>
  s.stage_name || (s.stage ? STAGE_LABELS[s.stage] ?? s.stage : "Stage");

function jobProgress(stages: JobStage[]) {
  if (!stages.length) return 0;
  const done = stages.filter((s) => s.status === "approved").length;
  return Math.round((done / stages.length) * 100);
}

interface Props extends Pick<Client360Data, "jobs" | "stages" | "templates"> { compact?: boolean }

export default function WorkTab({ jobs, stages, templates, compact = false }: Props) {
  const navigate = useNavigate();
  const byJob = (id: string) => stages.filter((s) => s.job_id === id);
  const templateName = (job: Job) => {
    const t = templates.find((x) => x.id === job.template_id);
    return t ? `${t.name} · v${t.version}` : "No SOP template";
  };

  const active = jobs.filter((j) => j.status === "active");
  const closed = jobs.filter((j) => j.status !== "active");

  const renderJob = (j: Job) => {
    const js = byJob(j.id);
    const current = js.find((s) => s.status === "active" || s.status === "pending_approval");
    return (
      <div key={j.id} className="rounded-lg border border-border p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="font-medium">{j.job_number} — {j.service_type || j.client_name}</p>
            <p className="text-xs text-muted-foreground">{templateName(j)} · started {formatDate(j.created_at)}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{j.status}</Badge>
            <Button size="sm" variant="ghost" onClick={() => navigate(`/jobs/${j.id}`)}>
              Open <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </div>
        </div>
        <div className="mt-2 flex items-center gap-3">
          <Progress value={jobProgress(js)} className="h-2" />
          <span className="shrink-0 text-xs text-muted-foreground">{jobProgress(js)}%</span>
        </div>
        {current && (
          <p className="mt-2 text-xs text-muted-foreground">
            Current stage: <span className="text-foreground">{stageLabel(current)}</span>
            {current.status === "pending_approval" && " · awaiting approval"}
          </p>
        )}
      </div>
    );
  };

  const history = stages
    .filter((s) => s.approved_at)
    .sort((a, b) => (b.approved_at! > a.approved_at! ? 1 : -1))
    .slice(0, 40);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-base">Active workflows</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {active.length ? active.map(renderJob) : <p className="text-sm text-muted-foreground">No active work.</p>}
        </CardContent>
      </Card>

      {!compact && (
      <Card>
        <CardHeader><CardTitle className="text-base">Completed &amp; closed work</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {closed.length ? closed.map(renderJob) : <p className="text-sm text-muted-foreground">Nothing completed yet.</p>}
        </CardContent>
      </Card>

      )}

      {!compact && (
      <Card>
        <CardHeader><CardTitle className="text-base">SOP history</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {history.length ? history.map((s) => {
            const job = jobs.find((j) => j.id === s.job_id);
            return (
              <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2 last:border-0">
                <span>{job?.job_number} · {stageLabel(s)}</span>
                <span className="text-xs text-muted-foreground">Approved {formatDate(s.approved_at)}</span>
              </div>
            );
          }) : <p className="text-muted-foreground">No approved stages yet.</p>}
        </CardContent>
      </Card>
      )}
    </div>
  );
}
