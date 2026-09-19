import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Check, Lock, Loader2, Eye, ExternalLink, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { attachmentsFromFormData } from "@/lib/clientApproval";

interface TrackStage {
  id: string;
  stage_name: string | null;
  position: number;
  status: string;
  notes: string | null;
  form_data: Record<string, any> | null;
  approved_at: string | null;
  needs_client_approval: boolean;
  client_decision: "approved" | "declined" | null;
  client_decided_by: string | null;
  client_comment: string | null;
  client_decided_at: string | null;
}

interface TrackingJobData {
  id: string;
  job_number: string;
  client_name: string;
  service_type: string | null;
  status: string;
  created_at: string;
  stages: TrackStage[] | null;
}

const HIDDEN_KEYS = ["client_decision", "client_decided_by", "client_decided_at"];

export default function TrackJob() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [job, setJob] = useState<TrackingJobData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Approval dialog
  const [approvalStage, setApprovalStage] = useState<TrackStage | null>(null);
  const [reviewed, setReviewed] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchJob = useCallback(async () => {
    if (!token) {
      setError("No tracking link provided.");
      setLoading(false);
      return;
    }
    const { data, error: err } = await supabase.rpc("get_job_by_tracking_token", { _token: token });
    if (err || !data) {
      setError("Job not found or invalid tracking link.");
    } else {
      const j = data as unknown as TrackingJobData;
      setJob(j);
      setSelectedId((prev) => {
        if (prev) return prev;
        const stages = [...(j.stages || [])].sort((a, b) => a.position - b.position);
        return (stages.find((s) => s.status !== "approved" && s.status !== "locked") ?? stages[0])?.id ?? null;
      });
    }
    setLoading(false);
  }, [token]);

  useEffect(() => {
    fetchJob();
  }, [fetchJob]);

  const openApproval = (stage: TrackStage) => {
    setApprovalStage(stage);
    setReviewed(false);
    setCode("");
    setName(job?.client_name || "");
    setComment("");
  };

  const decide = async (decision: "approved" | "declined") => {
    if (!approvalStage || !token) return;
    if (decision === "approved" && !reviewed) {
      toast.error("Please confirm that you reviewed everything first.");
      return;
    }
    if (!code.trim()) {
      toast.error("Enter the client ID that was sent to you.");
      return;
    }
    setSubmitting(true);
    const { error: err } = await supabase.rpc("submit_client_approval", {
      _token: token,
      _code: code.trim(),
      _stage_id: approvalStage.id,
      _decision: decision,
      _client_name: name.trim(),
      _comment: comment.trim(),
    });
    setSubmitting(false);
    if (err) {
      toast.error(err.message.replace(/^.*?:\s*/, ""));
      return;
    }
    toast.success(decision === "approved" ? "Thank you — your approval was recorded." : "Your response was sent to the team.");
    setApprovalStage(null);
    await fetchJob();
  };

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

  const stages = [...(job.stages || [])].sort((a, b) => a.position - b.position);
  const approvedCount = stages.filter((s) => s.status === "approved").length;
  const pct = stages.length ? Math.round((approvedCount / stages.length) * 100) : 0;
  const selected = stages.find((s) => s.id === selectedId) ?? null;
  const currentIdx = stages.findIndex((s) => s.status !== "approved" && s.status !== "locked");
  const awaiting = stages.filter(
    (s) => s.needs_client_approval && s.status !== "locked" && s.client_decision !== "approved",
  );

  const attachments = attachmentsFromFormData(selected?.form_data);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <Eye className="h-5 w-5 text-accent" />
          <h1 className="font-heading text-lg font-bold">Project Tracker</h1>
        </div>
      </header>

      <div className="mx-auto max-w-5xl space-y-6 p-6">
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
                    job.status === "on_hold" && "border-warning text-warning",
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

        {awaiting.length > 0 && (
          <Card className="border-accent">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 font-heading text-lg">
                <ShieldCheck className="h-5 w-5 text-accent" /> Waiting for your approval
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {awaiting.map((s) => (
                <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded border p-3">
                  <div>
                    <p className="text-sm font-medium">{s.stage_name || `Step ${s.position + 1}`}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.client_decision === "declined"
                        ? "You asked for changes — the team is working on it. You can respond again."
                        : "Review the details, then approve so we can move to the next step."}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setSelectedId(s.id)}>
                      Review
                    </Button>
                    <Button size="sm" onClick={() => openApproval(s)}>
                      Approve
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-lg">Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full overflow-x-auto pb-2">
              <div className={cn("flex items-center gap-0.5", stages.length > 5 && "min-w-[800px]")}>
                {stages.map((s, idx) => {
                  const isCompleted = s.status === "approved";
                  const isLocked = s.status === "locked";
                  const isRejected = s.status === "rejected";
                  const isCurrent = idx === currentIdx;
                  const isSelected = s.id === selectedId;
                  return (
                    <div key={s.id} className="flex flex-1 items-center">
                      <button
                        disabled={isLocked}
                        onClick={() => setSelectedId(s.id)}
                        className={cn(
                          "relative flex w-full flex-col items-center gap-1 rounded px-1.5 py-2 text-center transition-all",
                          isSelected && "ring-2 ring-accent",
                          isCurrent && !isSelected && "bg-accent/10",
                          isCompleted && "bg-success/10",
                          isRejected && "bg-destructive/10",
                          isLocked && "cursor-not-allowed opacity-50",
                          !isLocked && !isSelected && "cursor-pointer hover:bg-muted",
                        )}
                      >
                        <div
                          className={cn(
                            "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold",
                            isCompleted && "bg-success text-success-foreground",
                            isCurrent && !isCompleted && "bg-accent text-accent-foreground",
                            isRejected && "bg-destructive text-destructive-foreground",
                            isLocked && "bg-locked text-locked-foreground",
                            !isCompleted && !isCurrent && !isRejected && !isLocked && "bg-muted text-muted-foreground",
                          )}
                        >
                          {isCompleted ? <Check className="h-3.5 w-3.5" /> : isLocked ? <Lock className="h-3 w-3" /> : idx + 1}
                        </div>
                        <span
                          className={cn(
                            "text-[10px] font-medium leading-tight",
                            isCurrent && "font-bold text-accent",
                            isCompleted && "text-success",
                            isLocked && "text-locked-foreground",
                            isRejected && "text-destructive",
                          )}
                        >
                          {s.stage_name || `Step ${s.position + 1}`}
                        </span>
                      </button>
                      {idx < stages.length - 1 && (
                        <div className={cn("h-0.5 w-3 shrink-0", isCompleted ? "bg-success" : "bg-border")} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {selected && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="font-heading text-lg">
                  Step {selected.position + 1}: {selected.stage_name || ""}
                </CardTitle>
                <Badge
                  variant="outline"
                  className={cn(
                    selected.status === "approved" && "border-success text-success",
                    selected.status === "active" && "border-accent text-accent",
                    selected.status === "rejected" && "border-destructive text-destructive",
                    selected.status === "locked" && "border-locked text-locked-foreground",
                  )}
                >
                  {selected.status.toUpperCase()}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {selected.approved_at && (
                <p className="text-sm text-success">
                  ✓ Completed on {new Date(selected.approved_at).toLocaleDateString()}
                </p>
              )}

              {selected.notes && (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Notes</p>
                  <p className="text-sm">{selected.notes}</p>
                </div>
              )}

              {attachments.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Documents & files to review</p>
                  <div className="space-y-1">
                    {attachments.map((a) => (
                      <a
                        key={a.url}
                        href={a.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 rounded border p-2 text-sm text-accent hover:bg-muted"
                      >
                        <ExternalLink className="h-3.5 w-3.5" /> {a.label}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {selected.form_data && Object.keys(selected.form_data).length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Details</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {Object.entries(selected.form_data).map(([key, value]) => {
                      if (HIDDEN_KEYS.includes(key)) return null;
                      if (value === null || value === undefined || value === "" || typeof value === "object") return null;
                      if (typeof value === "string" && /^https?:\/\//i.test(value)) return null;
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

              {selected.client_decision && (
                <div
                  className={cn(
                    "rounded border p-3 text-sm",
                    selected.client_decision === "approved"
                      ? "border-success/40 bg-success/5"
                      : "border-destructive/40 bg-destructive/5",
                  )}
                >
                  <p className="font-medium">
                    You {selected.client_decision === "approved" ? "approved" : "declined"} this step
                    {selected.client_decided_at
                      ? ` on ${new Date(selected.client_decided_at).toLocaleString()}`
                      : ""}
                    .
                  </p>
                  {selected.client_comment && <p className="mt-1">“{selected.client_comment}”</p>}
                </div>
              )}

              {selected.needs_client_approval &&
                selected.status !== "locked" &&
                selected.client_decision !== "approved" && (
                  <Button onClick={() => openApproval(selected)}>
                    <ShieldCheck className="mr-2 h-4 w-4" /> Review & approve this step
                  </Button>
                )}

              {selected.status === "locked" && (
                <p className="text-sm italic text-muted-foreground">This step has not been started yet.</p>
              )}
            </CardContent>
          </Card>
        )}

        <p className="text-center text-xs text-muted-foreground">
          Only you can approve the steps that need your sign-off. For questions, contact your project manager.
        </p>
      </div>

      <Dialog open={!!approvalStage} onOpenChange={(o) => !o && setApprovalStage(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Approve “{approvalStage?.stage_name}”</DialogTitle>
            <DialogDescription>
              Please make sure you have reviewed everything on this step. Approving means we move on
              to the next step of your project, and this cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <label className="flex items-start gap-2 text-sm">
              <Checkbox checked={reviewed} onCheckedChange={(v) => setReviewed(!!v)} className="mt-0.5" />
              <span>I have reviewed everything shown on this step and I am happy to continue.</span>
            </label>

            <div className="space-y-1">
              <Label>Your name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
            </div>

            <div className="space-y-1">
              <Label>Client ID</Label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. 7F2A9C"
                className="tracking-[0.3em] uppercase"
              />
              <p className="text-xs text-muted-foreground">
                Copy the client ID we sent you. It confirms this approval is really from you.
              </p>
            </div>

            <div className="space-y-1">
              <Label>Message (optional)</Label>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                placeholder="Anything you'd like the team to know"
              />
            </div>
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              className="border-destructive text-destructive hover:bg-destructive/10"
              disabled={submitting}
              onClick={() => decide("declined")}
            >
              Request changes
            </Button>
            <Button disabled={submitting} onClick={() => decide("approved")}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Approve & continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
