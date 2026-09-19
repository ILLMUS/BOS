import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import PipelineBar from "@/components/pipeline/PipelineBar";
import { STAGE_LABELS, STAGE_ORDER, getNextStage, getStageIndex } from "@/lib/constants";
import {
  ArrowLeft,
  Check,
  X,
  Loader2,
  Save,
  Copy,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  Clock,
  Briefcase,
  UserCheck,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { getStageForm } from "@/components/stages";
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

/* -------------------------------------------------------
   FUTURISTIC GLASS CONTAINER
------------------------------------------------------- */
function GlassCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`
        relative overflow-hidden rounded-[14px]
        border border-white/[0.085]
        bg-[#10151d]/95
        shadow-[0_18px_60px_rgba(0,0,0,0.24)]
        ${className}
      `}
    >
      <div className="pointer-events-none absolute -right-20 -top-20 h-40 w-40 rounded-full bg-cyan-500/[0.035] blur-3xl" />
      {children}
    </div>
  );
}

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

  // Guaranteed quote-save watcher
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

  // Real-time subscription
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

  // Listen for postMessage from external Quote Builder
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
      handleRefreshSync();
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [id, handleRefreshSync]);

  // Redirect handling
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("from") === "quote_builder") {
      const stage = (params.get("stage") as JobStageEnum) || "quotation_preparation";
      setSelectedStage(stage);
      toast.success("Back from Quote Builder — refreshing quote data…", { duration: 3000 });
      handleRefreshSync();
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, "", cleanUrl);
      return;
    }
    const stageParam = params.get("stage") as JobStageEnum | null;
    if (stageParam && STAGE_ORDER.includes(stageParam)) {
      setSelectedStage(stageParam);
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, "", cleanUrl);
    }
  }, []);

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
    if (selectedStage === "flight_execution" && (job as any).job_category === "drone_spray") {
      const { data: sprays } = await supabase
        .from("spray_logs").select("id").eq("job_id", job.id).limit(1);
      if (!sprays || sprays.length === 0) {
        toast.error("Cannot approve — at least one spray log entry is required for spray jobs.", { duration: 6000 });
        return;
      }
    }
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return "border-emerald-400/30 bg-emerald-400/10 text-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.15)]";
      case "active":
        return "border-cyan-400/30 bg-cyan-400/10 text-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.15)]";
      case "rejected":
        return "border-rose-400/30 bg-rose-400/10 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.15)]";
      default:
        return "border-slate-800 bg-slate-900/50 text-slate-500";
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="py-20 text-center text-xs text-slate-500">
        Job specified could not be located in workspace records.
      </div>
    );
  }

  const StageFormComponent = selectedStage ? getStageForm(selectedStage) : null;

  return (
    <div className="space-y-5 text-slate-200">
      {/* HEADER BAR */}
      <div className="flex items-center gap-4 border-b border-white/[0.065] pb-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate("/jobs")}
          className="h-8.5 w-8.5 rounded-lg border-white/[0.08] bg-white/[0.02] text-slate-300 hover:bg-white/[0.06] hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-semibold text-cyan-400">
              {job.job_number}
            </span>
            <span className="text-slate-600">•</span>
            <h1 className="text-lg font-bold text-white sm:text-xl">
              {job.client_name}
            </h1>
          </div>
          <p className="mt-0.5 text-[11px] text-slate-400">
            {job.service_type || "No service type"} • {job.client_location || "No location specified"}
          </p>
        </div>

        <div className="ml-auto flex flex-col items-end gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshSync}
            disabled={refreshing}
            className={`h-8 rounded-lg border px-3 text-[11px] font-medium transition-all ${
              refreshError
                ? "border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20"
                : "border-white/[0.08] bg-white/[0.02] text-slate-300 hover:bg-white/[0.06] hover:text-white"
            }`}
          >
            {refreshError ? (
              <AlertCircle className="mr-1.5 h-3.5 w-3.5 text-rose-400" />
            ) : (
              <RefreshCw
                className={`mr-1.5 h-3.5 w-3.5 ${refreshing ? "animate-spin text-cyan-400" : "text-slate-400"}`}
              />
            )}
            {refreshing ? "Syncing…" : refreshError ? "Retry Sync" : "Refresh Sync Status"}
          </Button>
          {refreshError && (
            <p className="max-w-xs text-right text-[10px] text-rose-400">
              {refreshError}
            </p>
          )}
        </div>
      </div>

      {/* LAST SYNC BANNER */}
      {lastSyncInfo.timestamp && (
        <div
          className={`flex items-center gap-3 rounded-xl border px-4 py-2.5 text-[11px] ${
            lastSyncInfo.success
              ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-300"
              : "border-rose-500/20 bg-rose-500/5 text-rose-300"
          }`}
        >
          {lastSyncInfo.success ? (
            <Check className="h-4 w-4 shrink-0 text-emerald-400" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
          )}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-semibold">
              {lastSyncInfo.success ? "Sync successful" : "Sync failed"}
            </span>
            <span className="text-slate-400">
              <Clock className="inline h-3 w-3 mr-1 -mt-0.5 text-slate-500" />
              {lastSyncInfo.timestamp.toLocaleString()}
            </span>
            {lastSyncInfo.stagesSynced.length > 0 && (
              <span className="text-slate-300">
                • Stages: {lastSyncInfo.stagesSynced.join(", ")}
              </span>
            )}
            {lastSyncInfo.message && (
              <span className="text-rose-400">{lastSyncInfo.message}</span>
            )}
          </div>
        </div>
      )}

      {/* PIPELINE NAVIGATION CARD */}
      <GlassCard className="p-4 sm:p-5">
        <PipelineBar
          stages={stages.map((s) => ({ stage: s.stage, status: s.status }))}
          currentStage={job.current_stage}
          onStageClick={(stage) => setSelectedStage(stage)}
        />
      </GlassCard>

      {/* SELECTED STAGE DETAIL GRID */}
      {selectedStage && currentStageData && (
        <div className="grid gap-5 lg:grid-cols-3">
          {/* MAIN STAGE WORKSPACE FORM */}
          <GlassCard className="lg:col-span-2 p-5 sm:p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-white/[0.085] pb-4">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Step {getStageIndex(selectedStage) + 1}
                </span>
                <h2 className="text-base font-bold text-white">
                  {STAGE_LABELS[selectedStage]}
                </h2>
              </div>
              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${getStatusBadge(
                  currentStageData.status
                )}`}
              >
                {currentStageData.status}
              </span>
            </div>

            {/* SLA TIMER & ADMIN EDITOR */}
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-3.5 space-y-2">
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

            {/* STAGE FORM RENDERER */}
            {StageFormComponent && (
              <div className="pt-1">
                <StageFormComponent
                  formData={formData}
                  onChange={handleFormChange}
                  readOnly={!canEdit}
                  jobId={job.id}
                  stageId={currentStageData.id}
                  onQuoteConfirm={
                    selectedStage === "quotation_preparation" ? setQuoteConfirmed : undefined
                  }
                />
              </div>
            )}

            {/* STAGE NOTES & REJECTION NOTICE */}
            {canEdit && (
              <div className="space-y-2 border-t border-white/[0.085] pt-4">
                <Label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Stage Notes & Observations
                </Label>
                <Textarea
                  value={notes}
                  onChange={(e) => {
                    setNotes(e.target.value);
                    setFormDirty(true);
                  }}
                  placeholder="Record operational notes, client requests, or field observations..."
                  rows={3}
                  className="rounded-xl border-white/[0.08] bg-[#10151d] text-[11px] text-slate-200 placeholder:text-slate-500 focus:border-cyan-400/30 focus:ring-1 focus:ring-cyan-400/30"
                />
              </div>
            )}

            {currentStageData.notes && !canEdit && (
              <div className="space-y-1 border-t border-white/[0.085] pt-4">
                <Label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Notes
                </Label>
                <p className="text-[11px] text-slate-300 bg-white/[0.02] p-3 rounded-lg border border-white/[0.06]">
                  {currentStageData.notes}
                </p>
              </div>
            )}

            {currentStageData.rejection_reason && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-[11px]">
                <p className="font-semibold text-rose-300">Rejection Reason:</p>
                <p className="mt-0.5 text-rose-200/90">
                  {currentStageData.rejection_reason}
                </p>
              </div>
            )}

            {/* ACTION TRIGGER BUTTONS */}
            {canEdit && (
              <div className="flex flex-wrap items-center gap-3 border-t border-white/[0.085] pt-4">
                <Button
                  onClick={handleSaveForm}
                  disabled={saving || !formDirty}
                  variant="outline"
                  className="h-8.5 rounded-lg border-white/[0.08] bg-white/[0.02] text-[11px] font-medium text-slate-300 hover:bg-white/[0.06] hover:text-white"
                >
                  {saving ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="mr-1.5 h-3.5 w-3.5 text-cyan-400" />
                  )}
                  Save Progress
                </Button>

                {canApprove && (
                  <Button
                    onClick={handleApprove}
                    disabled={approving}
                    className="h-8.5 rounded-lg bg-emerald-500 px-3.5 text-[11px] font-bold text-slate-950 shadow-[0_0_20px_rgba(52,211,153,0.2)] transition-all hover:bg-emerald-400"
                  >
                    {approving ? (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Check className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    Approve & Advance
                  </Button>
                )}

                {canApprove && (
                  <Button
                    variant="outline"
                    onClick={() => setShowRejectForm(!showRejectForm)}
                    className="h-8.5 rounded-lg border-rose-500/30 bg-rose-500/10 text-[11px] font-medium text-rose-300 hover:bg-rose-500/20"
                  >
                    <X className="mr-1.5 h-3.5 w-3.5" />
                    Reject
                  </Button>
                )}
              </div>
            )}

            {/* REJECTION REASON FORM */}
            {showRejectForm && (
              <div className="space-y-3 rounded-xl border border-rose-500/30 bg-rose-500/5 p-4">
                <Label className="text-[10px] font-semibold uppercase tracking-wider text-rose-300">
                  Reason for Rejection *
                </Label>
                <Textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Explain why this stage is being rejected..."
                  rows={3}
                  className="rounded-xl border-rose-500/20 bg-[#10151d] text-[11px] text-slate-200 placeholder:text-slate-500 focus:border-rose-400 focus:ring-1 focus:ring-rose-400"
                />
                <Button
                  onClick={handleReject}
                  disabled={rejecting || !rejectionReason.trim()}
                  className="h-8 rounded-lg bg-rose-500 px-3 text-[11px] font-bold text-white shadow-[0_0_15px_rgba(244,63,94,0.25)] hover:bg-rose-600"
                >
                  {rejecting && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                  Confirm Rejection
                </Button>
              </div>
            )}
          </GlassCard>

          {/* CLIENT DETAILS SIDEBAR */}
          <GlassCard className="p-5 sm:p-6 space-y-4 h-fit">
            <div className="border-b border-white/[0.085] pb-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Client Profile
              </h3>
            </div>

            <div className="space-y-3 text-[11px]">
              <div>
                <span className="text-[10px] font-medium text-slate-500">Full Name / Account</span>
                <p className="font-semibold text-slate-100">{job.client_name}</p>
              </div>
              <div>
                <span className="text-[10px] font-medium text-slate-500">Contact Phone</span>
                <p className="font-medium text-slate-300">{job.client_phone || "—"}</p>
              </div>
              <div>
                <span className="text-[10px] font-medium text-slate-500">Email Address</span>
                <p className="font-medium text-slate-300">{job.client_email || "—"}</p>
              </div>
              <div>
                <span className="text-[10px] font-medium text-slate-500">Primary Location</span>
                <p className="font-medium text-slate-300">{job.client_location || "—"}</p>
              </div>
              <div>
                <span className="text-[10px] font-medium text-slate-500">Service Category</span>
                <p className="font-medium text-slate-300">{job.service_type || "—"}</p>
              </div>

              {/* CLIENT TRACKING LINK GENERATOR */}
              {(job as any).tracking_token && (
                <div className="border-t border-white/[0.085] pt-3.5 space-y-2">
                  <span className="text-[10px] font-medium text-slate-500">Client Tracking Access</span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 rounded-md border-white/[0.08] bg-white/[0.03] text-[10px] font-semibold text-slate-300 hover:bg-white/[0.08] hover:text-white"
                      onClick={() => {
                        const url = `${window.location.origin}/track?token=${(job as any).tracking_token}`;
                        navigator.clipboard.writeText(url);
                        toast.success("Tracking link copied to clipboard");
                      }}
                    >
                      <Copy className="mr-1 h-3 w-3 text-cyan-400" /> Copy Link
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-[10px] text-slate-400 hover:text-white"
                      onClick={() => {
                        window.open(
                          `${window.location.origin}/track?token=${(job as any).tracking_token}`,
                          "_blank"
                        );
                      }}
                    >
                      <ExternalLink className="mr-1 h-3 w-3" /> Preview
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </GlassCard>
        </div>
      )}

      {/* REVENUE PROTECTION & OPERATIONAL PANELS */}
      <div className="grid gap-5 lg:grid-cols-2">
        <VariationsPanel jobId={job.id} />
        <PaymentsPanel
          jobId={job.id}
          quotedAmount={(() => {
            const qp = stages.find((s) => s.stage === "quotation_preparation");
            const amt = (qp?.form_data as any)?.quote_amount;
            const variations = 0;
            return amt ? Number(amt) + variations : undefined;
          })()}
        />
      </div>

      <ShopDrawingsPanel jobId={job.id} />

      {((job as any).job_category === "drone_flight" ||
        (job as any).job_category === "drone_spray") && (
        <div className="space-y-5">
          <div className="grid gap-5 lg:grid-cols-2">
            <PreFlightChecklistPanel jobId={job.id} />
            <FlightLogPanel jobId={job.id} />
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            {(job as any).job_category === "drone_spray" && (
              <SprayLogPanel jobId={job.id} />
            )}
            <PostFlightPanel jobId={job.id} />
          </div>
        </div>
      )}
    </div>
  );
}