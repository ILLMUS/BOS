import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { STAGE_LABELS, STAGE_ORDER, getStageIndex } from "@/lib/constants";
import { Check, Lock, Loader2, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type JobStage = Database["public"]["Enums"]["job_stage"];

interface TrackingJobData {
  id: string;
  job_number: string;
  client_name: string;
  service_type: string | null;
  status: string;
  current_stage: JobStage;
  created_at: string;
  stages: Array<{
    stage: JobStage;
    status: string;
    notes: string | null;
    form_data: Record<string, any> | null;
    sla_deadline_hours: number | null;
    sla_started_at: string | null;
    approved_at: string | null;
    created_at: string;
    updated_at: string;
  }>;
}

export default function TrackJob() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [job, setJob] = useState<TrackingJobData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedStage, setSelectedStage] = useState<JobStage | null>(null);

  useEffect(() => {
    if (!token) {
      setError("No tracking token provided.");
      setLoading(false);
      return;
    }
    const fetchJob = async () => {
      const { data, error: err } = await supabase.rpc("get_job_by_tracking_token", { _token: token });
      if (err || !data) {
        setError("Job not found or invalid tracking link.");
      } else {
        setJob(data as unknown as TrackingJobData);
        setSelectedStage((data as unknown as TrackingJobData).current_stage);
      }
      setLoading(false);
    };
    fetchJob();
  }, [token]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6">
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center">
          <p className="text-lg font-medium text-destructive">{error || "Job not found."}</p>
          <p className="mt-2 text-sm text-muted-foreground">Please check your tracking link and try again.</p>
        </div>
      </div>
    );
  }

  const currentIdx = getStageIndex(job.current_stage);
  const pct = Math.round(((currentIdx + 1) / STAGE_ORDER.length) * 100);
  const selectedStageData = job.stages?.find((s) => s.stage === selectedStage);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card px-6 py-4">
        <div className="mx-auto max-w-5xl">
          <div className="flex items-center gap-3">
            <Eye className="h-5 w-5 text-accent" />
            <h1 className="font-heading text-lg font-bold">RST SPILWORKS — Job Tracker</h1>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl space-y-6 p-6">
        {/* Job summary */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="font-heading text-2xl font-bold">{job.job_number}</h2>
                <p className="text-muted-foreground">{job.client_name}</p>
                {job.service_type && <p className="text-sm text-muted-foreground">{job.service_type}</p>}
              </div>
              <div className="flex items-center gap-3">
                <Badge
                  variant="outline"
                  className={cn(
                    job.status === "active" && "border-accent text-accent",
                    job.status === "completed" && "border-success text-success",
                    job.status === "on_hold" && "border-warning text-warning"
                  )}
                >
                  {job.status.toUpperCase()}
                </Badge>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-sm font-medium">{pct}%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pipeline */}
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-lg">Pipeline Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full overflow-x-auto pb-2">
              <div className="flex min-w-[800px] items-center gap-0.5">
                {STAGE_ORDER.map((stage, idx) => {
                  const stageData = job.stages?.find((s) => s.stage === stage);
                  const status = stageData?.status ?? "locked";
                  const isCurrent = stage === job.current_stage;
                  const isCompleted = status === "approved";
                  const isLocked = status === "locked";
                  const isRejected = status === "rejected";
                  const isSelected = stage === selectedStage;

                  return (
                    <div key={stage} className="flex flex-1 items-center">
                      <button
                        disabled={isLocked}
                        onClick={() => setSelectedStage(stage)}
                        className={cn(
                          "relative flex w-full flex-col items-center gap-1 rounded px-1.5 py-2 text-center transition-all",
                          isSelected && "ring-2 ring-accent",
                          isCurrent && !isSelected && "bg-accent/10",
                          isCompleted && "bg-success/10",
                          isRejected && "bg-destructive/10",
                          isLocked && "cursor-not-allowed opacity-50",
                          !isLocked && !isSelected && "hover:bg-muted cursor-pointer"
                        )}
                      >
                        <div
                          className={cn(
                            "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold",
                            isCompleted && "bg-success text-success-foreground",
                            isCurrent && !isCompleted && "bg-accent text-accent-foreground",
                            isRejected && "bg-destructive text-destructive-foreground",
                            isLocked && "bg-locked text-locked-foreground",
                            !isCompleted && !isCurrent && !isRejected && !isLocked && "bg-muted text-muted-foreground"
                          )}
                        >
                          {isCompleted ? <Check className="h-3.5 w-3.5" /> : isLocked ? <Lock className="h-3 w-3" /> : idx + 1}
                        </div>
                        <span
                          className={cn(
                            "text-[10px] font-medium leading-tight",
                            isCurrent && "text-accent font-bold",
                            isCompleted && "text-success",
                            isLocked && "text-locked-foreground",
                            isRejected && "text-destructive"
                          )}
                        >
                          {STAGE_LABELS[stage]}
                        </span>
                      </button>
                      {idx < STAGE_ORDER.length - 1 && (
                        <div className={cn("h-0.5 w-3 shrink-0", idx < currentIdx ? "bg-success" : "bg-border")} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Selected stage detail */}
        {selectedStage && selectedStageData && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="font-heading text-lg">
                  Step {getStageIndex(selectedStage) + 1}: {STAGE_LABELS[selectedStage]}
                </CardTitle>
                <Badge
                  variant="outline"
                  className={cn(
                    selectedStageData.status === "approved" && "border-success text-success",
                    selectedStageData.status === "active" && "border-accent text-accent",
                    selectedStageData.status === "rejected" && "border-destructive text-destructive",
                    selectedStageData.status === "locked" && "border-locked text-locked-foreground"
                  )}
                >
                  {selectedStageData.status.toUpperCase()}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedStageData.approved_at && (
                <p className="text-sm text-success">
                  ✓ Completed on {new Date(selectedStageData.approved_at).toLocaleDateString()}
                </p>
              )}

              {selectedStageData.notes && (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Notes</p>
                  <p className="text-sm">{selectedStageData.notes}</p>
                </div>
              )}

              {/* Show form data read-only */}
              {selectedStageData.form_data && Object.keys(selectedStageData.form_data).length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Stage Data</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {Object.entries(selectedStageData.form_data).map(([key, value]) => {
                      if (value === null || value === undefined || value === "") return null;
                      const label = key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
                      const displayValue = typeof value === "boolean" ? (value ? "Yes" : "No") : String(value);
                      return (
                        <div key={key} className="rounded border border-border p-2">
                          <p className="text-xs text-muted-foreground">{label}</p>
                          <p className="text-sm font-medium">{displayValue}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {selectedStageData.status === "locked" && (
                <p className="text-sm text-muted-foreground italic">This stage has not been started yet.</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground">
          This is a read-only view of your job progress. For questions, please contact your project manager.
        </p>
      </div>
    </div>
  );
}
