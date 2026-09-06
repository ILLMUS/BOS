import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import PipelineBar from "@/components/pipeline/PipelineBar";
import { STAGE_LABELS, STAGE_ORDER, getNextStage, getStageIndex } from "@/lib/constants";
import { ArrowLeft, Check, X, Loader2, Save, Copy, ExternalLink, RefreshCw, AlertCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import { getStageForm } from "@/components/stages";
import { useQuery } from "@tanstack/react-query";
import SlaTimer from "@/components/sla/SlaTimer";
import SlaDeadlineEditor from "@/components/sla/SlaDeadlineEditor";
import type { Tables, Database } from "@/integrations/supabase/types";
import { getMissingStageFields } from "@/lib/stageValidation";
import VariationsPanel from "@/components/jobs/VariationsPanel";
import PaymentsPanel from "@/components/jobs/PaymentsPanel";
import ShopDrawingsPanel from "@/components/jobs/ShopDrawingsPanel";
import PreFlightChecklistPanel from "@/components/jobs/PreFlightChecklistPanel";
import SprayLogPanel from "@/components/jobs/SprayLogPanel";
import FlightLogPanel from "@/components/jobs/FlightLogPanel";
import PostFlightPanel from "@/components/jobs/PostFlightPanel";

type Job = Tables<"jobs">;
type JobStage = Tables<"job_stages">;
type JobStageEnum = Database["public"]["Enums"]["job_stage"];

export default function LegacyJobDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [job, setJob] = useState<Job | null>(null);
  const [stages, setStages] = useState<JobStage[]>([]);
  const [selectedStage, setSelectedStage] = useState<JobStageEnum | null>(null);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [notes, setNotes] = useState("");
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [formDirty, setFormDirty] = useState(false);
  const [quoteConfirmed, setQuoteConfirmed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [lastSyncInfo, setLastSyncInfo] = useState<{
    timestamp: Date | null;
    stagesSynced: string[];
    success: boolean | null;
    message?: string;
  }>({ timestamp: null, stagesSynced: [], success: null });

  // Guaranteed quote-save watcher: polls the DB after launch until the synced
  // timestamp on quotation_preparation advances past the snapshot, then forces
  // the user back to Quotation Prep with fresh data.
  const quoteWatcherRef = useRef<number | null>(null);
  const stopQuoteSaveWatcher = useCallback(() => {
    if (quoteWatcherRef.current) {
      window.clearInterval(quoteWatcherRef.current);
      quoteWatcherRef.current = null;
    }
  }, []);
  const startQuoteSaveWatcher = useCallback(
    (prevSyncedAt: string | null) => {
      if (!id) return;
      stopQuoteSaveWatcher();
      const startedAt = Date.now();
      const MAX_MS = 10 * 60 * 1000; // 10 minutes
      quoteWatcherRef.current = window.setInterval(async () => {
        if (Date.now() - startedAt > MAX_MS) {
          stopQuoteSaveWatcher();
          return;
        }
        const { data } = await supabase
          .from("job_stages")
          .select("id, stage, status, form_data, notes")
          .eq("job_id", id)
          .eq("stage", "quotation_preparation")
          .maybeSingle();
        const fd = (data?.form_data as Record<string, any>) || {};
        if (fd.api_synced_at && fd.api_synced_at !== prevSyncedAt) {
          stopQuoteSaveWatcher();
          setStages((prev) =>
            prev.map((s) => (s.id === data!.id ? (data as JobStage) : s))
          );
          setSelectedStage("quotation_preparation");
          setFormData(fd);
          setFormDirty(false);
          setNotes(data?.notes || "");
          try { window.focus(); } catch {}
          toast.success("Quote saved — synced back to Quotation Prep", { duration: 4000 });
        }
      }, 3000) as unknown as number;
    },
    [id, stopQuoteSaveWatcher],
  );
  useEffect(() => () => stopQuoteSaveWatcher(), [stopQuoteSaveWatcher]);

  const fetchJob = useCallback(async () => {
    if (!id) return;
    const [jobRes, stagesRes] = await Promise.all([
      supabase.from("jobs").select("*").eq("id", id).single(),
      supabase.from("job_stages").select("*").eq("job_id", id).order("created_at"),
    ]);
    if (jobRes.data) {
      setJob(jobRes.data);
      if (!selectedStage) setSelectedStage(jobRes.data.current_stage);
    }
    if (stagesRes.data) setStages(stagesRes.data);
    setLoading(false);
  }, [id, selectedStage]);

  useEffect(() => { fetchJob(); }, [fetchJob]);

  const handleRefreshSync = useCallback(async () => {
    if (!id || !user) return;
    setRefreshing(true);
    setRefreshError(null);
    const prevSyncs: Record<string, any> = {};
    stages.forEach((s) => {
      const fd = (s.form_data as Record<string, any>) || {};
      if (fd.api_synced_at) prevSyncs[s.stage] = fd.api_synced_at;
    });
    const { data, error } = await supabase
      .from("job_stages")
      .select("*")
      .eq("job_id", id)
      .order("created_at");
    setRefreshing(false);
    if (error || !data) {
      const msg = error?.message || "Unable to reach the external Quote Builder.";
      setRefreshError(msg);
      setLastSyncInfo({
        timestamp: new Date(),
        stagesSynced: [],
        success: false,
        message: msg,
      });
      toast.error(msg, { duration: 6000 });
      await supabase.from("audit_log").insert({
        user_id: user.id,
        job_id: id,
        action: "refresh_sync_failed",
        details: { error_message: msg, source: "quote_builder" },
      });
      return;
    }
    setStages(data);
    const updated = data.find((s) => s.stage === selectedStage);
    if (updated && !formDirty) {
      setFormData((updated.form_data as Record<string, any>) || {});
      setNotes(updated.notes || "");
    }
    const changed = data.filter((s) => {
      const fd = (s.form_data as Record<string, any>) || {};
      return fd.api_synced_at && fd.api_synced_at !== prevSyncs[s.stage];
    });
    const stageNames = changed.map((s) => STAGE_LABELS[s.stage as JobStageEnum] || s.stage);
    if (changed.length > 0) {
      toast.success(`Synced ${changed.length} stage(s) from Quote Builder`);
    } else {
      toast.info("No new sync data from Quote Builder");
    }
    setLastSyncInfo({
      timestamp: new Date(),
      stagesSynced: stageNames,
      success: true,
    });
    await supabase.from("audit_log").insert({
      user_id: user.id,
      job_id: id,
      action: "refresh_sync_success",
      details: {
        stages_synced: changed.length,
        stage_names: changed.map((s) => s.stage),
        source: "quote_builder",
      },
    });
  }, [id, stages, selectedStage, formDirty, user]);

  // Real-time subscription for job_stages updates (e.g. quote builder API sync)
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`job-stages-${id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "job_stages",
          filter: `job_id=eq.${id}`,
        },
        (payload) => {
          const updated = payload.new as JobStage;
          setStages((prev) =>
            prev.map((s) => (s.id === updated.id ? updated : s))
          );
          const newFd = (updated.form_data as Record<string, any>) || {};
          const isQuoteSync =
            updated.stage === "quotation_preparation" && newFd.api_synced_by === "quote_builder";

          // When the external Quote Builder syncs back, always jump the user to
          // Quotation Prep and force-refresh the form with the synced data,
          // even if they had unsaved local edits (the Quote Builder is the source of truth).
          if (isQuoteSync) {
            stopQuoteSaveWatcher();
            setSelectedStage("quotation_preparation");
            setFormData(newFd);
            setFormDirty(false);
            setNotes(updated.notes || "");
            try { window.focus(); } catch {}
            toast.success(
              `Quote ${newFd.quote_ref || ""} synced — back to Quotation Prep`.trim(),
              { duration: 4000 },
            );
          } else if (updated.stage === selectedStage && !formDirty) {
            setFormData(newFd);
            setNotes(updated.notes || "");
            toast.info("Stage data synced from external app", { duration: 3000 });
          }
          setLastSyncInfo((prev) => {
            const stageName = STAGE_LABELS[updated.stage as JobStageEnum] || updated.stage;
            const prevStages = prev.stagesSynced || [];
            const stagesSynced = prevStages.includes(stageName) ? prevStages : [...prevStages, stageName];
            return {
              timestamp: new Date(),
              stagesSynced,
              success: true,
            };
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, selectedStage, formDirty, stopQuoteSaveWatcher]);

  // Listen for postMessage from the external Quote Builder popup (alternative to return_url).
  // The external app can postMessage({ type: "quote_builder_saved", job_id }) on save.
  useEffect(() => {
    if (!id) return;
    const handler = (event: MessageEvent) => {
      const data = event.data;
      if (!data || typeof data !== "object") return;
      if (data.type !== "quote_builder_saved") return;
      if (data.job_id && data.job_id !== id) return;
      setSelectedStage("quotation_preparation");
      try { window.focus(); } catch {}
      toast.success("Quote saved — returned to Quotation Prep", { duration: 4000 });
      // Pull the latest data immediately in case realtime hasn't fired yet.
      handleRefreshSync();
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [id, handleRefreshSync]);

  // If the user is redirected back via return_url with ?from=quote_builder, focus the right stage.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("from") === "quote_builder") {
      const stage = (params.get("stage") as JobStageEnum) || "quotation_preparation";
      setSelectedStage(stage);
      toast.success("Back from Quote Builder — refreshing quote data…", { duration: 3000 });
      handleRefreshSync();
      // Clean the URL so a refresh doesn't re-trigger.
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, "", cleanUrl);
      return;
    }
    // Generic deep-link: /jobs/:id?stage=<stage>
    const stageParam = params.get("stage") as JobStageEnum | null;
    if (stageParam && STAGE_ORDER.includes(stageParam)) {
      setSelectedStage(stageParam);
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, "", cleanUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load form data when stage changes
  const currentStageData = stages.find((s) => s.stage === selectedStage);

  useEffect(() => {
    if (currentStageData) {
      const data = (currentStageData.form_data as Record<string, any>) || {};
      setFormData(data);
      setFormDirty(false);
      setNotes(currentStageData.notes || "");
      setQuoteConfirmed(false);
    }
  }, [currentStageData?.id]);


  const isCurrentStageOwner =
    currentStageData && user &&
    (currentStageData.primary_owner_id === user.id ||
      currentStageData.secondary_owner_id === user.id || isAdmin);

  const canEdit =
    isCurrentStageOwner &&
    (currentStageData?.status === "active" || currentStageData?.status === "rejected") &&
    selectedStage === job?.current_stage;

  const canApprove =
    isCurrentStageOwner &&
    currentStageData?.status === "active" &&
    selectedStage === job?.current_stage &&
    (selectedStage !== "quotation_preparation" || quoteConfirmed);


  const handleFormChange = (data: Record<string, any>) => {
    setFormData(data);
    setFormDirty(true);
  };

  const handleSaveForm = async () => {
    if (!currentStageData) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("job_stages")
        .update({ form_data: formData as any, notes })
        .eq("id", currentStageData.id);
      if (error) throw error;
      setFormDirty(false);
      toast.success("Progress saved");
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    if (!job || !currentStageData || !user || !selectedStage) return;
    const missing = getMissingStageFields(selectedStage, formData);
    if (missing.length > 0) {
      toast.error(
        `Cannot approve — please complete: ${missing.join(", ")}`,
        { duration: 6000 }
      );
      return;
    }
    // Shop-drawing approval gate: cannot leave fabrication_order without an approved drawing
    if (selectedStage === "fabrication_order") {
      const { data: drawings } = await supabase
        .from("shop_drawings")
        .select("id")
        .eq("job_id", job.id)
        .eq("status", "approved")
        .limit(1);
      if (!drawings || drawings.length === 0) {
        toast.error("Cannot approve — at least one shop drawing must be client-approved before production starts.", { duration: 6000 });
        return;
      }
    }
    // Pre-flight gate: must have a passed + manager-approved check before leaving pre_flight_check
    if (selectedStage === "pre_flight_check") {
      const { data: checks } = await supabase
        .from("pre_flight_checks")
        .select("drone_ok, calibration_ok, weather_ok, manager_approved_at")
        .eq("job_id", job.id);
      const passed = (checks || []).some(
        (c: any) => c.drone_ok && c.calibration_ok && c.weather_ok && c.manager_approved_at
      );
      if (!passed) {
        toast.error("Cannot approve — a pre-flight check must be fully passed AND manager-approved.", { duration: 6000 });
        return;
      }
    }
    // Flight execution gate (spray jobs): require at least one spray log entry
    if (selectedStage === "flight_execution" && (job as any).job_category === "drone_spray") {
      const { data: sprays } = await supabase
        .from("spray_logs").select("id").eq("job_id", job.id).limit(1);
      if (!sprays || sprays.length === 0) {
        toast.error("Cannot approve — at least one spray log entry is required for spray jobs.", { duration: 6000 });
        return;
      }
    }
    // Post-flight gate: require a complete log entry
    if (selectedStage === "post_flight_log") {
      const { data: logs } = await supabase
        .from("post_flight_logs")
        .select("equipment_cleaned, inspection_passed, data_submitted")
        .eq("job_id", job.id);
      const complete = (logs || []).some(
        (l: any) => l.equipment_cleaned && l.inspection_passed && l.data_submitted
      );
      if (!complete) {
        toast.error("Cannot approve — a complete post-flight log is required (clean + inspect + data submitted).", { duration: 6000 });
        return;
      }
    }
    setApproving(true);
    try {
      await supabase
        .from("job_stages")
        .update({
          status: "approved",
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          notes,
          form_data: formData as any,
        })
        .eq("id", currentStageData.id);

      const nextStage = getNextStage(selectedStage);
      if (nextStage) {
        await supabase.from("job_stages").update({ status: "active" }).eq("job_id", job.id).eq("stage", nextStage);
        await supabase.from("jobs").update({ current_stage: nextStage }).eq("id", job.id);
      } else {
        await supabase.from("jobs").update({ status: "completed" }).eq("id", job.id);
      }

      await supabase.from("audit_log").insert({
        user_id: user.id, job_id: job.id, action: "stage_approved", stage: selectedStage, details: { notes },
      });

      toast.success(`Stage "${STAGE_LABELS[selectedStage]}" approved`);
      await fetchJob();
      if (nextStage) setSelectedStage(nextStage);
    } catch (err: any) {
      toast.error(err.message || "Failed to approve");
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    if (!job || !currentStageData || !user || !selectedStage) return;
    if (!rejectionReason.trim()) { toast.error("Please provide a rejection reason"); return; }
    setRejecting(true);
    try {
      await supabase
        .from("job_stages")
        .update({ status: "rejected", rejection_reason: rejectionReason, notes })
        .eq("id", currentStageData.id);

      await supabase.from("audit_log").insert({
        user_id: user.id, job_id: job.id, action: "stage_rejected", stage: selectedStage,
        details: { rejection_reason: rejectionReason },
      });

      toast.success(`Stage "${STAGE_LABELS[selectedStage]}" rejected`);
      await fetchJob();
    } catch (err: any) {
      toast.error(err.message || "Failed to reject");
    } finally {
      setRejecting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!job) {
    return <div className="py-20 text-center text-muted-foreground">Job not found.</div>;
  }

  const StageFormComponent = selectedStage ? getStageForm(selectedStage) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/jobs")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="font-heading text-2xl font-bold">
            {job.job_number} — {job.client_name}
          </h1>
          <p className="text-sm text-muted-foreground">
            {job.service_type || "No service type"} • {job.client_location || "No location"}
          </p>
        </div>
        <div className="ml-auto flex flex-col items-end gap-1.5">
          <Button
            variant={refreshError ? "destructive" : "outline"}
            size="sm"
            onClick={handleRefreshSync}
            disabled={refreshing}
            className="gap-1.5"
          >
            {refreshError ? (
              <AlertCircle className="h-3.5 w-3.5" />
            ) : (
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            )}
            {refreshing ? "Retrying…" : refreshError ? "Retry Sync" : "Refresh Sync Status"}
          </Button>
          {refreshError && (
            <p className="max-w-xs text-right text-xs text-destructive">
              {refreshError}
            </p>
          )}
        </div>
      </div>

      {/* Last Sync Banner */}
      {lastSyncInfo.timestamp && (
        <div
          className={`flex items-center gap-3 rounded border px-4 py-2.5 text-sm ${
            lastSyncInfo.success
              ? "border-success/30 bg-success/5 text-success"
              : "border-destructive/30 bg-destructive/5 text-destructive"
          }`}
        >
          {lastSyncInfo.success ? (
            <Check className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-semibold">
              {lastSyncInfo.success ? "Sync successful" : "Sync failed"}
            </span>
            <span className="text-muted-foreground">
              <Clock className="inline h-3.5 w-3.5 mr-1 -mt-0.5" />
              {lastSyncInfo.timestamp.toLocaleString()}
            </span>
            {lastSyncInfo.stagesSynced.length > 0 && (
              <span className="text-foreground/80">
                • Stages: {lastSyncInfo.stagesSynced.join(", ")}
              </span>
            )}
            {lastSyncInfo.message && (
              <span className="text-destructive">{lastSyncInfo.message}</span>
            )}
          </div>
        </div>
      )}

      {/* Pipeline */}
      <Card>
        <CardContent className="p-4">
          <PipelineBar
            stages={stages.map((s) => ({ stage: s.stage, status: s.status }))}
            currentStage={job.current_stage}
            onStageClick={(stage) => setSelectedStage(stage)}
          />
        </CardContent>
      </Card>

      {/* Selected Stage Detail */}
      {selectedStage && currentStageData && (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Stage form */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="font-heading text-lg">
                  Step {getStageIndex(selectedStage) + 1}: {STAGE_LABELS[selectedStage]}
                </CardTitle>
                <Badge
                  variant="outline"
                  className={
                    currentStageData.status === "approved"
                      ? "border-success text-success"
                      : currentStageData.status === "active"
                      ? "border-accent text-accent"
                      : currentStageData.status === "rejected"
                      ? "border-destructive text-destructive"
                      : "border-locked text-locked-foreground"
                  }
                >
                  {currentStageData.status.toUpperCase()}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* SLA Timer + Editor */}
              <div className="space-y-2">
                <SlaTimer
                  slaDeadlineHours={currentStageData.sla_deadline_hours}
                  slaStartedAt={currentStageData.sla_started_at}
                  status={currentStageData.status}
                />
                {isAdmin && (
                  <SlaDeadlineEditor
                    stageId={currentStageData.id}
                    currentHours={currentStageData.sla_deadline_hours}
                    onUpdated={(h) => {
                      setStages((prev) =>
                        prev.map((s) =>
                          s.id === currentStageData.id ? { ...s, sla_deadline_hours: h } : s
                        )
                      );
                    }}
                  />
                )}
              </div>

              {/* Stage-specific form */}
              {StageFormComponent && (
                <StageFormComponent
                  formData={formData}
                  onChange={handleFormChange}
                  readOnly={!canEdit}
                  jobId={job.id}
                  stageId={currentStageData.id}
                  onQuoteConfirm={selectedStage === "quotation_preparation" ? setQuoteConfirmed : undefined}
                />
              )}


              {/* Stage notes */}
              {canEdit && (
                <div className="space-y-2 border-t border-border pt-4">
                  <Label>Stage Notes</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => { setNotes(e.target.value); setFormDirty(true); }}
                    placeholder="Add any notes, observations, or comments..."
                    rows={3}
                  />
                </div>
              )}

              {currentStageData.notes && !canEdit && (
                <div className="space-y-1 border-t border-border pt-4">
                  <Label className="text-muted-foreground">Notes</Label>
                  <p className="text-sm">{currentStageData.notes}</p>
                </div>
              )}

              {currentStageData.rejection_reason && (
                <div className="rounded border border-destructive/30 bg-destructive/5 p-3">
                  <p className="text-sm font-medium text-destructive">Rejection Reason:</p>
                  <p className="text-sm">{currentStageData.rejection_reason}</p>
                </div>
              )}

              {/* Action buttons */}
              {canEdit && (
                <div className="flex flex-wrap gap-3 border-t border-border pt-4">
                  <Button
                    onClick={handleSaveForm}
                    disabled={saving || !formDirty}
                    variant="outline"
                  >
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Progress
                  </Button>
                  {canApprove && (
                    <Button
                      onClick={handleApprove}
                      disabled={approving}
                      className="bg-success text-success-foreground hover:bg-success/90"
                    >
                      {approving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                      Approve & Advance
                    </Button>
                  )}
                  {canApprove && (
                    <Button
                      variant="outline"
                      onClick={() => setShowRejectForm(!showRejectForm)}
                      className="border-destructive text-destructive hover:bg-destructive/10"
                    >
                      <X className="mr-2 h-4 w-4" />
                      Reject
                    </Button>
                  )}
                </div>
              )}

              {showRejectForm && (
                <div className="space-y-3 rounded border border-destructive/30 p-4">
                  <Label>Reason for rejection *</Label>
                  <Textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Explain why this stage is being rejected..."
                    rows={3}
                  />
                  <Button
                    onClick={handleReject}
                    disabled={rejecting || !rejectionReason.trim()}
                    variant="destructive"
                  >
                    {rejecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Confirm Rejection
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Client info sidebar */}
          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-lg">Client Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div><p className="text-muted-foreground">Name</p><p className="font-medium">{job.client_name}</p></div>
              <div><p className="text-muted-foreground">Phone</p><p className="font-medium">{job.client_phone || "—"}</p></div>
              <div><p className="text-muted-foreground">Email</p><p className="font-medium">{job.client_email || "—"}</p></div>
              <div><p className="text-muted-foreground">Location</p><p className="font-medium">{job.client_location || "—"}</p></div>
              <div><p className="text-muted-foreground">Service Type</p><p className="font-medium">{job.service_type || "—"}</p></div>

              {/* Client tracking link */}
              {(job as any).tracking_token && (
                <div className="border-t border-border pt-3">
                  <p className="text-muted-foreground">Client Tracking Link</p>
                  <div className="mt-1 flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => {
                        const url = `${window.location.origin}/track?token=${(job as any).tracking_token}`;
                        navigator.clipboard.writeText(url);
                        toast.success("Tracking link copied!");
                      }}
                    >
                      <Copy className="mr-1 h-3 w-3" /> Copy Link
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                      onClick={() => {
                        window.open(`${window.location.origin}/track?token=${(job as any).tracking_token}`, "_blank");
                      }}
                    >
                      <ExternalLink className="mr-1 h-3 w-3" /> Preview
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Revenue protection panels */}
      <div className="grid gap-6 lg:grid-cols-2">
        <VariationsPanel jobId={job.id} />
        <PaymentsPanel
          jobId={job.id}
          quotedAmount={(() => {
            const qp = stages.find((s) => s.stage === "quotation_preparation");
            const amt = (qp?.form_data as any)?.quote_amount;
            const variations = 0; // approved variation totals fetched inside VariationsPanel
            return amt ? Number(amt) + variations : undefined;
          })()}
        />
      </div>
      <ShopDrawingsPanel jobId={job.id} />

      {((job as any).job_category === "drone_flight" || (job as any).job_category === "drone_spray") && (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <PreFlightChecklistPanel jobId={job.id} />
            <FlightLogPanel jobId={job.id} />
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            {(job as any).job_category === "drone_spray" && <SprayLogPanel jobId={job.id} />}
            <PostFlightPanel jobId={job.id} />
          </div>
        </div>
      )}
    </div>
  );
}
