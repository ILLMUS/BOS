import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { canEditStage, canEditQuoteStage } from "@/lib/authority";
import { notifyQuoteEvent } from "@/lib/quoteNotifications";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  Check,
  CloudOff,
  Copy,
  ExternalLink,
  FileDown,
  Loader2,
  RotateCcw,
  Save,
  Shield,
  Sparkles,
  Terminal,
  Zap,
  X,
} from "lucide-react";
import { toast } from "sonner";
import DynamicPipelineBar from "@/components/sop/DynamicPipelineBar";
import DynamicStageForm from "@/components/sop/DynamicStageForm";
import QuotationPrepForm from "@/components/stages/QuotationPrepForm";
import InvoicingForm from "@/components/stages/InvoicingForm";
import { detectFinanceForm } from "@/lib/stageForms";
import { fetchJobPartyDetails, type JobPartyDetails } from "@/lib/clientDetails";
import ClientApprovalPanel from "@/components/jobs/ClientApprovalPanel";
import { needsClientApproval, type ClientDecision } from "@/lib/clientApproval";

import SlaTimer from "@/components/sla/SlaTimer";
import SlaDeadlineEditor from "@/components/sla/SlaDeadlineEditor";
import LegacyJobDetail from "@/pages/LegacyJobDetail";
import type { SopFieldRow } from "@/lib/sopFields";
import EngineChain from "@/components/sop/EngineChain";
import JobLifecycleTrail from "@/components/crm/JobLifecycleTrail";
import { JobDetailSkeleton } from "@/components/ui/page-skeleton";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import {
  clearDraft,
  formatDraftAge,
  listPendingDrafts,
  readDraft,
  writeDraft,
  type StageDraft,
} from "@/lib/offlineDraft";

interface JobRow {
  id: string;
  job_number: string;
  client_name: string;
  client_phone: string | null;
  client_email: string | null;
  client_location: string | null;
  service_type: string | null;
  status: string;
  template_id: string | null;
  template_version: number | null;
  tracking_token: string | null;
  client_access_code: string | null;
}

interface JobStageRow {
  id: string;
  job_id: string;
  sop_stage_id: string | null;
  stage_name: string | null;
  position: number;
  status: string;
  notes: string | null;
  rejection_reason: string | null;
  form_data: any;
  sla_deadline_hours: number | null;
  sla_started_at: string | null;
  primary_owner_id: string | null;
  secondary_owner_id: string | null;
}

interface StageMeta {
  description: string | null;
  requires_approval: boolean;
  primaryRole: string | null;
  secondaryRole: string | null;
}

export default function JobDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAdmin, authority } = useAuth();

  const [loading, setLoading] = useState(true);
  const [job, setJob] = useState<JobRow | null>(null);
  const [legacy, setLegacy] = useState(false);
  const [stages, setStages] = useState<JobStageRow[]>([]);
  const [fields, setFields] = useState<SopFieldRow[]>([]);
  const [stageMeta, setStageMeta] = useState<StageMeta | null>(null);
  const [ownerNames, setOwnerNames] = useState<Record<string, string>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [notes, setNotes] = useState("");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [quoteConfirmed, setQuoteConfirmed] = useState(false);
  const [pdfOpen, setPdfOpen] = useState(false);
  const [restoredDraft, setRestoredDraft] = useState<StageDraft | null>(null);
  const [queuedOffline, setQueuedOffline] = useState(false);
  const online = useOnlineStatus();
  const wasOnline = useRef(online);

  const fetchJob = useCallback(async () => {
    if (!id) return;
    const { data: jobData } = await supabase.from("jobs").select("*").eq("id", id).maybeSingle();
    if (!jobData) {
      setLoading(false);
      return;
    }
    if (!jobData.template_id) {
      setLegacy(true);
      setLoading(false);
      return;
    }
    const { data: stageData } = await supabase
      .from("job_stages")
      .select("*")
      .eq("job_id", id)
      .order("position");
    setJob(jobData as unknown as JobRow);
    setStages((stageData || []) as unknown as JobStageRow[]);
    setLoading(false);
    return (stageData || []) as unknown as JobStageRow[];
  }, [id]);

  useEffect(() => {
    fetchJob();
  }, [fetchJob]);

  // Pick the first non-approved stage by default
  useEffect(() => {
    if (selectedId || stages.length === 0) return;
    const next = stages.find((s) => s.status !== "approved") ?? stages[0];
    setSelectedId(next.id);
  }, [stages, selectedId]);

  const current = useMemo(() => stages.find((s) => s.id === selectedId) ?? null, [stages, selectedId]);

  // Steps named quotation / invoice / receipt always open the built-in finance
  // form instead of the generic dynamic field form.
  const financeForm = useMemo(
    () => detectFinanceForm(current?.stage_name),
    [current?.stage_name],
  );

  // Client + business details captured earlier in the workflow, reused by every money form.
  const [party, setParty] = useState<JobPartyDetails | null>(null);
  useEffect(() => {
    if (!job?.id) { setParty(null); return; }
    let alive = true;
    fetchJobPartyDetails(job.id).then((p) => { if (alive) setParty(p); });
    return () => { alive = false; };
  }, [job?.id]);

  // Load stage form state + its custom fields
  useEffect(() => {
    if (!current) return;
    const draft = readDraft(current.id);
    if (draft && !draft.synced) {
      // Unsent local edits win — the crew filled this in without signal.
      setFormData(draft.formData || {});
      setNotes(draft.notes || "");
      setRestoredDraft(draft);
      setDirty(true);
      setQueuedOffline(true);
    } else {
      setFormData((current.form_data as Record<string, any>) || {});
      setNotes(current.notes || "");
      setRestoredDraft(null);
      setQueuedOffline(false);
      setDirty(false);
    }
    setQuoteConfirmed(false);
    setClientDecision(null);
    setShowReject(false);
    setRejectionReason("");
    if (!current.sop_stage_id) {
      setFields([]);
      setStageMeta(null);
      return;
    }
    supabase
      .from("sop_fields")
      .select("*")
      .eq("stage_id", current.sop_stage_id)
      .order("position")
      .then(({ data }) => setFields((data || []) as unknown as SopFieldRow[]));
    supabase
      .from("sop_stages")
      .select("description, requires_approval, primary_role:org_roles!sop_stages_primary_role_id_fkey(name), secondary_role:org_roles!sop_stages_secondary_role_id_fkey(name)")
      .eq("id", current.sop_stage_id)
      .maybeSingle()
      .then(({ data }: any) =>
        setStageMeta(
          data
            ? {
                description: data.description,
                requires_approval: !!data.requires_approval,
                primaryRole: data.primary_role?.name ?? null,
                secondaryRole: data.secondary_role?.name ?? null,
              }
            : null
        )
      );
  }, [current?.id]);

  // Resolve the people currently responsible for this stage
  useEffect(() => {
    const ids = [current?.primary_owner_id, current?.secondary_owner_id].filter(Boolean) as string[];
    if (ids.length === 0) return;
    supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", ids)
      .then(({ data }) =>
        setOwnerNames((prev) => ({
          ...prev,
          ...Object.fromEntries((data || []).map((p: any) => [p.id, p.full_name])),
        }))
      );
  }, [current?.primary_owner_id, current?.secondary_owner_id]);

  // Chain of command checks
  const canApprove = canEditStage(authority, current ?? null, user?.id);
  const isQuoteStep = financeForm === "quote";
  const canEdit =
    canApprove || (isQuoteStep && canEditQuoteStage(authority, current ?? null, user?.id));
  const isStepOpen = !!current && current.status !== "locked" && current.status !== "approved";
  const lockedByAuthority = isStepOpen && !canEdit;

  // Client sign-off
  const [clientDecision, setClientDecision] = useState<ClientDecision | null>(null);
  const isClientApprovalStep = needsClientApproval(current?.stage_name);
  const awaitingClient = isClientApprovalStep && clientDecision?.decision !== "approved";

  const missingRequired = useMemo(() => {
    return fields
      .filter((f) => f.required)
      .filter((f) => {
        const v = formData[f.field_key];
        if (f.field_type === "checkbox") return !v;
        if (f.field_type === "file") return !Array.isArray(v) || v.length === 0;
        return v === undefined || v === null || String(v).trim() === "";
      })
      .map((f) => f.label);
  }, [fields, formData]);

  const persist = async (extra: Record<string, any> = {}) => {
    if (!current) return;
    const { error } = await supabase
      .from("job_stages")
      .update({ form_data: formData, notes, ...extra })
      .eq("id", current.id);
    if (error) throw error;
    clearDraft(current.id);
    setQueuedOffline(false);
    setRestoredDraft(null);
  };

  // Local draft keystroke sync
  useEffect(() => {
    if (!current || !dirty || !canEdit) return;
    const t = setTimeout(() => {
      writeDraft({
        stageId: current.id,
        jobId: current.job_id,
        formData,
        notes,
        savedAt: Date.now(),
        synced: false,
      });
    }, 600);
    return () => clearTimeout(t);
  }, [current?.id, current?.job_id, formData, notes, dirty, canEdit]);

  // Push offline drafts when reconnected
  useEffect(() => {
    if (!online) {
      wasOnline.current = false;
      return;
    }
    if (wasOnline.current) return;
    wasOnline.current = true;
    const pending = listPendingDrafts();
    if (pending.length === 0) return;
    (async () => {
      let ok = 0;
      for (const d of pending) {
        const { error } = await supabase
          .from("job_stages")
          .update({ form_data: d.formData, notes: d.notes })
          .eq("id", d.stageId);
        if (!error) {
          clearDraft(d.stageId);
          ok++;
        }
      }
      if (ok > 0) {
        toast.success(`Back online — synced ${ok} offline ${ok === 1 ? "draft" : "drafts"}`);
        setQueuedOffline(false);
        setRestoredDraft(null);
        setDirty(false);
        await fetchJob();
      }
    })();
  }, [online, fetchJob]);

  const handleSave = async () => {
    if (!current) return;
    if (!online) {
      writeDraft({
        stageId: current.id,
        jobId: current.job_id,
        formData,
        notes,
        savedAt: Date.now(),
        synced: false,
      });
      setQueuedOffline(true);
      toast.success("No signal — saved on this device. It will sync automatically.");
      return;
    }
    setSaving(true);
    try {
      await persist();
      setDirty(false);
      toast.success("Progress saved");
      if (isQuoteStep && quoteConfirmed && !canApprove && job && current) {
        void notifyQuoteEvent(
          job.id,
          "ready_for_approval",
          `Quotation ready for approval on ${job.job_number}`,
          `${job.client_name}: "${current.stage_name}" was completed and is waiting for approval.`,
        );
      }
      await fetchJob();
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    if (!job || !current || !user) return;
    if (missingRequired.length > 0) {
      toast.error(`Complete required fields: ${missingRequired.join(", ")}`, { duration: 6000 });
      return;
    }
    if (!online) {
      toast.error("You need a connection to approve this step. Your work is saved locally.");
      return;
    }
    setApproving(true);
    try {
      await persist({
        status: "approved",
        approved_by: user.id,
        approved_at: new Date().toISOString(),
      });

      const ordered = [...stages].sort((a, b) => a.position - b.position);
      const idx = ordered.findIndex((s) => s.id === current.id);
      const next = ordered[idx + 1];

      if (next) {
        await supabase.from("job_stages").update({ status: "active" }).eq("id", next.id);
        await supabase
          .from("jobs")
          .update({ current_sop_stage_id: next.sop_stage_id })
          .eq("id", job.id);
      } else {
        await supabase.from("jobs").update({ status: "completed" }).eq("id", job.id);
      }

      await supabase.from("audit_log").insert({
        user_id: user.id,
        job_id: job.id,
        action: "stage_approved",
        details: { stage_name: current.stage_name, notes },
      });

      toast.success(`"${current.stage_name}" approved`);
      const fresh = await fetchJob();
      if (next) setSelectedId(next.id);
      else if (fresh) setSelectedId(current.id);
    } catch (err: any) {
      toast.error(err.message || "Failed to approve");
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    if (!job || !current || !user || !rejectionReason.trim()) return;
    setRejecting(true);
    try {
      await persist({ status: "rejected", rejection_reason: rejectionReason });
      await supabase.from("audit_log").insert({
        user_id: user.id,
        job_id: job.id,
        action: "stage_rejected",
        details: { stage_name: current.stage_name, rejection_reason: rejectionReason },
      });
      if (isQuoteStep) {
        void notifyQuoteEvent(
          job.id,
          "rejected",
          `Quotation rejected on ${job.job_number}`,
          `${job.client_name}: "${current.stage_name}" was rejected. Reason: ${rejectionReason.trim()}`,
        );
      }
      toast.success("Step rejected");
      setShowReject(false);
      await fetchJob();
    } catch (err: any) {
      toast.error(err.message || "Failed to reject");
    } finally {
      setRejecting(false);
    }
  };

  if (loading) return <JobDetailSkeleton />;
  if (legacy) return <LegacyJobDetail />;
  if (!job) return <div className="py-20 text-center text-cyan-400/60 font-mono tracking-widest uppercase">Job record untraceable.</div>;

  const stageIndex = current ? [...stages].sort((a, b) => a.position - b.position).findIndex((s) => s.id === current.id) : 0;

  return (
    <div className="relative space-y-6 overflow-hidden rounded-xl bg-slate-950/90 p-4 sm:p-6 text-slate-100 shadow-[0_0_50px_rgba(6,182,212,0.1)] border border-cyan-500/20 backdrop-blur-xl">
      {/* Dynamic Futuristic Visual FX Elements */}
      <style>{`
        @keyframes scanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(1000%); }
        }
        @keyframes subtle-glow {
          0%, 100% { opacity: 0.4; filter: drop-shadow(0 0 12px rgba(6, 182, 212, 0.4)); }
          50% { opacity: 0.8; filter: drop-shadow(0 0 20px rgba(168, 85, 247, 0.6)); }
        }
        .animate-scan {
          animation: scanline 8s linear infinite;
        }
        .animate-glow {
          animation: subtle-glow 4s ease-in-out infinite;
        }
      `}</style>

      {/* Cyber Grid Overlay Background */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#082f49_1px,transparent_1px),linear-gradient(to_bottom,#082f49_1px,transparent_1px)] bg-[size:2rem_2rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-25" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50 animate-scan" />

      {/* Header Section */}
      <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-cyan-500/20 pb-4">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate("/jobs")}
            className="border-cyan-500/40 bg-slate-900/80 text-cyan-400 hover:border-cyan-400 hover:bg-cyan-500/20 hover:shadow-[0_0_15px_rgba(6,182,212,0.5)] transition-all duration-300"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
              <h1 className="font-mono text-2xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-purple-400">
                {job.job_number}
              </h1>
              <span className="text-cyan-500/40 font-mono">//</span>
              <span className="font-semibold text-slate-200 tracking-wide">{job.client_name}</span>
            </div>
            <p className="mt-1 font-mono text-xs tracking-widest text-cyan-400/70 uppercase flex items-center gap-2">
              <Terminal className="h-3 w-3 text-cyan-400" />
              {job.service_type || "Standard Node"} • {job.client_location || "Global Grid"}
              {job.template_version ? ` • Workflow Core v${job.template_version}` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-cyan-500/40 bg-cyan-950/40 text-cyan-300 font-mono text-xs px-3 py-1 shadow-[0_0_10px_rgba(6,182,212,0.2)]">
            <Sparkles className="mr-1 h-3 w-3 text-cyan-400" />
            CYBER-FLOW ACTIVE
          </Badge>
        </div>
      </div>

      <EngineChain
        active={["work", "sop", "workflow", "stage", "responsibility", "form", "sla", "approval"]}
      />

      <JobLifecycleTrail jobId={job.id} />

      {/* Dynamic Stage Navigation Bar */}
      <Card className="relative overflow-hidden border-cyan-500/30 bg-slate-900/60 backdrop-blur-md shadow-[0_0_20px_rgba(6,182,212,0.1)]">
        <div className="absolute top-0 right-0 h-16 w-16 bg-gradient-to-bl from-cyan-500/20 to-transparent pointer-events-none" />
        <CardContent className="p-4">
          <DynamicPipelineBar
            stages={stages
              .slice()
              .sort((a, b) => a.position - b.position)
              .map((s) => ({
                id: s.id,
                name: s.stage_name || `Step ${s.position + 1}`,
                status: s.status,
                position: s.position,
              }))}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </CardContent>
      </Card>

      {current && (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Stage Execution Panel */}
          <Card className="lg:col-span-2 relative border-cyan-500/30 bg-slate-900/70 backdrop-blur-lg shadow-[0_0_25px_rgba(0,0,0,0.5)]">
            <CardHeader className="border-b border-cyan-500/10 bg-slate-950/40">
              <div className="flex items-center justify-between">
                <CardTitle className="font-mono text-lg font-bold text-cyan-300 flex items-center gap-2">
                  <Zap className="h-5 w-5 text-cyan-400 animate-pulse" />
                  PHASE 0{stageIndex + 1}: <span className="text-slate-100">{current.stage_name}</span>
                </CardTitle>
                <Badge
                  variant="outline"
                  className={
                    current.status === "approved"
                      ? "border-emerald-500 bg-emerald-950/50 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.3)] font-mono"
                      : current.status === "rejected"
                      ? "border-rose-500 bg-rose-950/50 text-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.3)] font-mono"
                      : current.status === "locked"
                      ? "border-slate-600 bg-slate-800/50 text-slate-400 font-mono"
                      : "border-cyan-400 bg-cyan-950/50 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.4)] animate-glow font-mono"
                  }
                >
                  {current.status.toUpperCase()}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-6 pt-6">
              {(stageMeta?.description ||
                stageMeta?.primaryRole ||
                current.primary_owner_id ||
                stageMeta?.requires_approval) && (
                <div className="space-y-2 rounded-lg border border-cyan-500/20 bg-cyan-950/20 p-4 shadow-inner">
                  {stageMeta?.description && (
                    <p className="text-sm font-sans text-cyan-200/80">{stageMeta.description}</p>
                  )}
                  <div className="flex flex-wrap gap-2 text-xs font-mono">
                    <Badge variant="outline" className="border-cyan-500/40 bg-slate-900 text-cyan-300">
                      Primary Operator: {stageMeta?.primaryRole || "Unassigned"}
                      {current.primary_owner_id && ownerNames[current.primary_owner_id]
                        ? ` [${ownerNames[current.primary_owner_id]}]`
                        : ""}
                    </Badge>
                    {(stageMeta?.secondaryRole || current.secondary_owner_id) && (
                      <Badge variant="outline" className="border-cyan-500/30 bg-slate-900 text-cyan-400/80">
                        Auxiliary: {stageMeta?.secondaryRole || "Role"}
                        {current.secondary_owner_id && ownerNames[current.secondary_owner_id]
                          ? ` [${ownerNames[current.secondary_owner_id]}]`
                          : ""}
                      </Badge>
                    )}
                    {stageMeta?.requires_approval && (
                      <Badge variant="outline" className="border-purple-500/50 bg-purple-950/30 text-purple-300 shadow-[0_0_8px_rgba(168,85,247,0.3)]">
                        <Shield className="mr-1 h-3 w-3" /> Authorization Gate
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-2 rounded-lg border border-cyan-500/10 bg-slate-950/40 p-3">
                <SlaTimer
                  slaDeadlineHours={current.sla_deadline_hours}
                  slaStartedAt={current.sla_started_at}
                  status={current.status as any}
                />
                {isAdmin && (
                  <SlaDeadlineEditor
                    stageId={current.id}
                    currentHours={current.sla_deadline_hours}
                    onUpdated={(h) =>
                      setStages((prev) =>
                        prev.map((s) => (s.id === current.id ? { ...s, sla_deadline_hours: h } : s))
                      )
                    }
                  />
                )}
              </div>

              {/* Dynamic / Built-in Forms Wrapper */}
              <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-4 shadow-xl">
                {financeForm === "quote" ? (
                  <QuotationPrepForm
                    formData={formData}
                    onChange={(d) => {
                      setFormData(d);
                      setDirty(true);
                    }}
                    readOnly={!canEdit}
                    jobId={job.id}
                    stageId={current.id}
                    onQuoteConfirm={setQuoteConfirmed}
                    pdfOpen={pdfOpen}
                    onPdfOpenChange={setPdfOpen}
                  />
                ) : financeForm ? (
                  <InvoicingForm
                    mode={financeForm}
                    formData={formData}
                    onChange={(d) => {
                      setFormData(d);
                      setDirty(true);
                    }}
                    readOnly={!canEdit}
                    jobId={job.id}
                    stageId={current.id}
                  />
                ) : (
                  <DynamicStageForm
                    fields={fields}
                    formData={formData}
                    onChange={(d) => {
                      setFormData(d);
                      setDirty(true);
                    }}
                    readOnly={!canEdit}
                    jobId={job.id}
                  />
                )}
              </div>

              {canEdit ? (
                <div className="space-y-2 border-t border-cyan-500/20 pt-4">
                  <Label className="font-mono text-xs text-cyan-400 uppercase tracking-wider">Mission Log / Operator Notes</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => {
                      setNotes(e.target.value);
                      setDirty(true);
                    }}
                    placeholder="Input system observations, operation notes, or diagnostic comments..."
                    rows={3}
                    className="border-cyan-500/30 bg-slate-950/80 font-mono text-xs text-slate-200 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                  />
                </div>
              ) : (
                current.notes && (
                  <div className="space-y-1 border-t border-cyan-500/20 pt-4">
                    <Label className="font-mono text-xs text-cyan-400 uppercase">Operator Notes</Label>
                    <p className="text-sm font-mono text-slate-300 bg-slate-950/60 p-3 rounded border border-slate-800">{current.notes}</p>
                  </div>
                )
              )}

              {lockedByAuthority && (
                <div className="rounded-lg border border-amber-500/40 bg-amber-950/20 p-3 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.1)]">
                  <p className="text-sm font-bold font-mono">ACCESS RESTRICTED: READ-ONLY MODE</p>
                  <p className="text-xs text-amber-200/70">
                    Operation assigned to designated authority. Only assigned node operators or workspace admins hold write credentials.
                  </p>
                </div>
              )}

              {!online && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-950/30 p-3 text-amber-300">
                  <CloudOff className="mt-0.5 h-4 w-4 text-amber-400" />
                  <div>
                    <p className="text-sm font-bold font-mono">NETWORK LINK OFFLINE</p>
                    <p className="text-xs text-amber-200/70">
                      Local telemetry buffer active. Edits will sync automatically upon grid reconnection.
                    </p>
                  </div>
                </div>
              )}

              {restoredDraft && (
                <div className="flex items-start gap-2 rounded-lg border border-cyan-500/40 bg-cyan-950/30 p-3 text-cyan-300">
                  <RotateCcw className="mt-0.5 h-4 w-4 text-cyan-400 animate-spin" />
                  <div>
                    <p className="text-sm font-bold font-mono">OFFLINE DRAFT RECOVERED</p>
                    <p className="text-xs text-cyan-200/70">
                      Restored local edits from {formatDraftAge(restoredDraft.savedAt)}.{" "}
                      <button
                        type="button"
                        className="text-cyan-400 underline underline-offset-2 hover:text-cyan-200"
                        onClick={() => {
                          clearDraft(restoredDraft.stageId);
                          setFormData((current.form_data as Record<string, any>) || {});
                          setNotes(current.notes || "");
                          setRestoredDraft(null);
                          setQueuedOffline(false);
                          setDirty(false);
                        }}
                      >
                        Purge Local Cache
                      </button>
                    </p>
                  </div>
                </div>
              )}

              {current.rejection_reason && (
                <div className="rounded-lg border border-rose-500/40 bg-rose-950/20 p-3 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.1)]">
                  <p className="text-sm font-bold font-mono text-rose-400">REJECTION LOG DETECTED:</p>
                  <p className="text-sm font-mono text-rose-200/90">{current.rejection_reason}</p>
                </div>
              )}

              {/* Cyber Command Control Dock */}
              {canEdit && (
                <div className="sticky bottom-2 z-20 mt-4 rounded-xl border border-cyan-500/40 bg-slate-950/90 p-4 shadow-[0_0_30px_rgba(6,182,212,0.25)] backdrop-blur-xl">
                  <div className="mb-3 flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.2em] text-cyan-400">
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 animate-ping rounded-full bg-cyan-400" />
                      Command Module Active
                    </span>
                    {dirty && <span className="text-amber-400 animate-pulse">[UNSAVED DATA]</span>}
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Button
                      onClick={handleSave}
                      disabled={saving || !dirty}
                      variant="outline"
                      className="border-cyan-500/50 bg-slate-900 text-cyan-300 hover:bg-cyan-500/20 hover:border-cyan-400 hover:shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all font-mono"
                    >
                      {saving ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="mr-2 h-4 w-4" />
                      )}
                      {online ? "Commit Changes" : "Save to Buffer"}
                    </Button>

                    {queuedOffline && (
                      <span className="self-center font-mono text-xs text-amber-400 animate-pulse">
                        Local cache pending sync...
                      </span>
                    )}

                    {financeForm === "quote" && (
                      <Button
                        variant="outline"
                        onClick={() => setPdfOpen(true)}
                        className="border-purple-500/50 bg-slate-900 text-purple-300 hover:bg-purple-500/20 hover:border-purple-400 hover:shadow-[0_0_15px_rgba(168,85,247,0.4)] transition-all font-mono"
                      >
                        <FileDown className="mr-2 h-4 w-4" />
                        Generate &amp; Transmit PDF
                      </Button>
                    )}

                    {canApprove && (
                      <>
                        <Button
                          onClick={handleApprove}
                          disabled={approving || awaitingClient || (financeForm === "quote" && !quoteConfirmed)}
                          className="bg-gradient-to-r from-emerald-600 to-teal-500 text-white hover:from-emerald-500 hover:to-teal-400 shadow-[0_0_20px_rgba(16,185,129,0.4)] font-mono font-bold transition-all"
                        >
                          {approving ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="mr-2 h-4 w-4" />
                          )}
                          Authorize &amp; Advance
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setShowReject((v) => !v)}
                          className="border-rose-500/50 bg-slate-900 text-rose-400 hover:bg-rose-500/20 hover:border-rose-400 hover:shadow-[0_0_15px_rgba(244,63,94,0.4)] transition-all font-mono"
                        >
                          <X className="mr-2 h-4 w-4" />
                          Reject
                        </Button>
                      </>
                    )}
                  </div>

                  {isQuoteStep && !canApprove && (
                    <p className="mt-2 text-xs font-mono text-cyan-400/70">
                      Draft permissions granted. Final authorization required by stage lead.
                    </p>
                  )}
                  {awaitingClient && canApprove && (
                    <p className="mt-2 text-xs font-mono text-amber-400">
                      Awaiting client authorization token before system advance.
                    </p>
                  )}
                  {financeForm === "quote" && !quoteConfirmed && (
                    <p className="mt-2 text-xs font-mono text-amber-400">
                      Quotation confirmation flag required prior to approval.
                    </p>
                  )}
                </div>
              )}

              {showReject && canApprove && (
                <div className="space-y-3 rounded-xl border border-rose-500/40 bg-rose-950/30 p-4 shadow-[0_0_20px_rgba(244,63,94,0.2)]">
                  <Label className="font-mono text-xs text-rose-400 uppercase">Reason for Rejection Protocol *</Label>
                  <Textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={3}
                    className="border-rose-500/30 bg-slate-950 font-mono text-xs text-slate-100 focus:border-rose-400"
                  />
                  <Button
                    onClick={handleReject}
                    disabled={rejecting || !rejectionReason.trim()}
                    variant="destructive"
                    className="bg-rose-600 font-mono shadow-[0_0_15px_rgba(244,63,94,0.4)] hover:bg-rose-500"
                  >
                    {rejecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Confirm Rejection Directive
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Right Column: Client Side Panels */}
          <div className="space-y-6">
            {isClientApprovalStep && current.status !== "locked" && (
              <ClientApprovalPanel
                key={current.id}
                jobNumber={job.job_number}
                clientName={job.client_name}
                clientPhone={job.client_phone}
                stageId={current.id}
                stageName={current.stage_name || `Step ${stageIndex + 1}`}
                trackingToken={job.tracking_token}
                clientCode={job.client_access_code}
                onDecision={setClientDecision}
              />
            )}

            <Card className="relative overflow-hidden border-cyan-500/30 bg-slate-900/70 backdrop-blur-lg shadow-[0_0_20px_rgba(0,0,0,0.5)]">
              <CardHeader className="border-b border-cyan-500/10 bg-slate-950/40">
                <CardTitle className="font-mono text-lg font-bold text-cyan-300 flex items-center gap-2">
                  <Terminal className="h-4 w-4 text-cyan-400" />
                  CLIENT RECORD
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4 text-sm font-mono">
                <div className="rounded border border-slate-800 bg-slate-950/50 p-2">
                  <p className="text-xs text-cyan-500/70 uppercase">Client ID</p>
                  <p className="font-semibold text-slate-200">{job.client_name}</p>
                </div>
                <div className="rounded border border-slate-800 bg-slate-950/50 p-2">
                  <p className="text-xs text-cyan-500/70 uppercase">Comms Line</p>
                  <p className="font-semibold text-slate-200">{job.client_phone || "N/A"}</p>
                </div>
                <div className="rounded border border-slate-800 bg-slate-950/50 p-2">
                  <p className="text-xs text-cyan-500/70 uppercase">Digital Address</p>
                  <p className="font-semibold text-slate-200 truncate">{job.client_email || "N/A"}</p>
                </div>
                <div className="rounded border border-slate-800 bg-slate-950/50 p-2">
                  <p className="text-xs text-cyan-500/70 uppercase">Grid Coordinates</p>
                  <p className="font-semibold text-slate-200">{job.client_location || "N/A"}</p>
                </div>
                <div className="rounded border border-slate-800 bg-slate-950/50 p-2">
                  <p className="text-xs text-cyan-500/70 uppercase">Service Directive</p>
                  <p className="font-semibold text-slate-200">{job.service_type || "N/A"}</p>
                </div>

                {job.tracking_token && (
                  <div className="border-t border-cyan-500/20 pt-3">
                    <p className="text-xs text-cyan-400 uppercase mb-2">Live Tracking Uplink</p>
                    <div className="flex flex-col gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-cyan-500/40 bg-slate-950 text-cyan-300 hover:bg-cyan-500/20 hover:border-cyan-400 transition-all text-xs font-mono"
                        onClick={() => {
                          navigator.clipboard.writeText(
                            `${window.location.origin}/track?token=${job.tracking_token}`
                          );
                          toast.success("Uplink URI copied to clipboard");
                        }}
                      >
                        <Copy className="mr-2 h-3 w-3 text-cyan-400" /> Copy Tracking Link
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-cyan-400/80 hover:text-cyan-200 hover:bg-cyan-950/40 text-xs font-mono"
                        onClick={() =>
                          window.open(`${window.location.origin}/track?token=${job.tracking_token}`, "_blank")
                        }
                      >
                        <ExternalLink className="mr-2 h-3 w-3" /> Preview Uplink
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}