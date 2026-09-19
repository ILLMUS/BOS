import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { canEditStage, canEditQuoteStage } from "@/lib/authority";
import { notifyQuoteEvent } from "@/lib/quoteNotifications";
import { Button } from "@/components/ui/button";
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
  X,
  User,
  Phone,
  Mail,
  MapPin,
  Briefcase,
  ShieldAlert,
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
        backdrop-blur-md
        ${className}
      `}
    >
      <div className="pointer-events-none absolute -right-20 -top-20 h-40 w-40 rounded-full bg-cyan-500/[0.035] blur-3xl" />
      {children}
    </div>
  );
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

  // Steps named quotation / invoice / receipt always open the built-in finance form
  const financeForm = useMemo(
    () => detectFinanceForm(current?.stage_name),
    [current?.stage_name]
  );

  // Client + business details captured earlier in the workflow
  const [party, setParty] = useState<JobPartyDetails | null>(null);
  useEffect(() => {
    if (!job?.id) { setParty(null); return; }
    let alive = true;
    fetchJobPartyDetails(job.id).then((p) => { if (alive) setParty(p); });
    return () => { alive = false; };
  }, [job?.id]);

  // Load stage form state + custom fields
  useEffect(() => {
    if (!current) return;
    const draft = readDraft(current.id);
    if (draft && !draft.synced) {
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

  // Resolve stage owners
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

  const canApprove = canEditStage(authority, current ?? null, user?.id);
  const isQuoteStep = financeForm === "quote";
  const canEdit =
    canApprove || (isQuoteStep && canEditQuoteStage(authority, current ?? null, user?.id));
  const isStepOpen = !!current && current.status !== "locked" && current.status !== "approved";
  const lockedByAuthority = isStepOpen && !canEdit;

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
          `${job.client_name}: "${current.stage_name}" was completed and is waiting for approval.`
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
          `${job.client_name}: "${current.stage_name}" was rejected. Reason: ${rejectionReason.trim()}`
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

  const getStageStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return "border-emerald-400/30 bg-emerald-400/10 text-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.15)]";
      case "rejected":
        return "border-rose-400/30 bg-rose-400/10 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.15)]";
      case "locked":
        return "border-slate-700 bg-slate-800/80 text-slate-400";
      default:
        return "border-cyan-400/30 bg-cyan-400/10 text-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.15)]";
    }
  };

  if (loading) return <JobDetailSkeleton />;
  if (legacy) return <LegacyJobDetail />;
  if (!job) return <div className="py-20 text-center text-slate-500">Job not found.</div>;

  const stageIndex = current ? [...stages].sort((a, b) => a.position - b.position).findIndex((s) => s.id === current.id) : 0;

  return (
    <div className="space-y-5 text-slate-200">
      {/* HEADER BAR */}
      <div className="flex items-center gap-3 border-b border-white/[0.065] pb-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/jobs")}
          className="h-8.5 w-8.5 rounded-lg border border-white/[0.085] bg-[#10151d] text-slate-400 hover:bg-white/[0.05] hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
            <span className="font-mono text-cyan-400">{job.job_number}</span> — {job.client_name}
          </h1>
          <p className="mt-0.5 text-[11px] text-slate-400">
            {job.service_type || "No service type"} <span className="text-slate-600">•</span> {job.client_location || "No location"}
            {job.template_version ? ` • Workflow v${job.template_version}` : ""}
          </p>
        </div>
      </div>

      <EngineChain
        active={["work", "sop", "workflow", "stage", "responsibility", "form", "sla", "approval"]}
      />

      <JobLifecycleTrail jobId={job.id} />

      {/* PIPELINE BAR CARD */}
      <GlassCard className="p-4">
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
      </GlassCard>

      {current && (
        <div className="grid gap-5 lg:grid-cols-3">
          {/* MAIN STAGE DETAILS & FORM */}
          <GlassCard className="p-5 lg:col-span-2 space-y-5">
            {/* STAGE TITLE BAR */}
            <div className="flex items-center justify-between border-b border-white/[0.065] pb-3.5">
              <h2 className="text-sm font-bold text-white tracking-tight">
                Step {stageIndex + 1}: {current.stage_name}
              </h2>
              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${getStageStatusBadge(
                  current.status
                )}`}
              >
                {current.status}
              </span>
            </div>

            {/* STAGE META / ROLES */}
            {(stageMeta?.description ||
              stageMeta?.primaryRole ||
              current.primary_owner_id ||
              stageMeta?.requires_approval) && (
              <div className="space-y-2 rounded-xl border border-white/[0.08] bg-white/[0.02] p-3 text-[11px]">
                {stageMeta?.description && (
                  <p className="text-slate-400">{stageMeta.description}</p>
                )}
                <div className="flex flex-wrap gap-2 text-[10px]">
                  <span className="inline-flex items-center rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 font-medium text-slate-300">
                    Responsible: {stageMeta?.primaryRole || "Unassigned role"}
                    {current.primary_owner_id && ownerNames[current.primary_owner_id]
                      ? ` · ${ownerNames[current.primary_owner_id]}`
                      : ""}
                  </span>
                  {(stageMeta?.secondaryRole || current.secondary_owner_id) && (
                    <span className="inline-flex items-center rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 font-medium text-slate-300">
                      Backup: {stageMeta?.secondaryRole || "Role"}
                      {current.secondary_owner_id && ownerNames[current.secondary_owner_id]
                        ? ` · ${ownerNames[current.secondary_owner_id]}`
                        : ""}
                    </span>
                  )}
                  {stageMeta?.requires_approval && (
                    <span className="inline-flex items-center rounded-md border border-cyan-400/30 bg-cyan-400/10 px-2 py-0.5 font-semibold text-cyan-300">
                      Approval gate
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* SLA SECTION */}
            <div className="space-y-2">
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

            {/* DYNAMIC FORMS */}
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

            {/* NOTES */}
            {canEdit ? (
              <div className="space-y-2 border-t border-white/[0.085] pt-4">
                <Label className="text-[11px] font-semibold text-slate-300">Step Notes</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => {
                    setNotes(e.target.value);
                    setDirty(true);
                  }}
                  placeholder="Add notes, observations or comments..."
                  rows={3}
                  className="rounded-xl border-white/[0.08] bg-[#10151d] text-[11px] text-slate-200 placeholder:text-slate-500 focus:border-cyan-400/30 focus:ring-1 focus:ring-cyan-400/30"
                />
              </div>
            ) : (
              current.notes && (
                <div className="space-y-1 border-t border-white/[0.085] pt-4">
                  <Label className="text-[11px] font-semibold text-slate-400">Notes</Label>
                  <p className="text-[11px] text-slate-300">{current.notes}</p>
                </div>
              )
            )}

            {/* WARNING & OFFLINE NOTICES */}
            {lockedByAuthority && (
              <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-[11px] text-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.1)]">
                <p className="font-semibold">Read-only for you</p>
                <p className="mt-0.5 text-amber-300/80">
                  This step is assigned to someone else. Only its owner, a manager or the administration board can fill it in.
                </p>
              </div>
            )}

            {!online && (
              <div className="flex items-start gap-2.5 rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-[11px] text-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.1)]">
                <CloudOff className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" />
                <div>
                  <p className="font-semibold">You are offline</p>
                  <p className="mt-0.5 text-amber-300/80">
                    Keep filling this step in — everything is stored on this device and syncs automatically once you have signal again.
                  </p>
                </div>
              </div>
            )}

            {restoredDraft && (
              <div className="flex items-start gap-2.5 rounded-xl border border-cyan-400/30 bg-cyan-400/10 p-3 text-[11px] text-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.1)]">
                <RotateCcw className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-300" />
                <div>
                  <p className="font-semibold">Restored offline draft</p>
                  <p className="mt-0.5 text-cyan-300/80">
                    Unsent changes from {formatDraftAge(restoredDraft.savedAt)} were loaded back into this step.{" "}
                    <button
                      type="button"
                      className="underline underline-offset-2 hover:text-cyan-200"
                      onClick={() => {
                        clearDraft(restoredDraft.stageId);
                        setFormData((current.form_data as Record<string, any>) || {});
                        setNotes(current.notes || "");
                        setRestoredDraft(null);
                        setQueuedOffline(false);
                        setDirty(false);
                      }}
                    >
                      Discard draft
                    </button>
                  </p>
                </div>
              </div>
            )}

            {current.rejection_reason && (
              <div className="rounded-xl border border-rose-400/30 bg-rose-400/10 p-3 text-[11px] text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.1)]">
                <p className="font-semibold text-rose-300">Rejection reason:</p>
                <p className="mt-0.5 text-rose-300/80">{current.rejection_reason}</p>
              </div>
            )}

            {/* STAGE CONTROLS */}
            {canEdit && (
              <div className="sticky bottom-2 z-10 mt-3 rounded-xl border border-white/[0.085] bg-[#10151d]/90 p-3.5 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-md">
                <div className="mb-2.5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                  Stage controls
                </div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <Button
                    onClick={handleSave}
                    disabled={saving || !dirty}
                    className="h-8.5 rounded-lg border border-white/[0.1] bg-white/[0.04] px-3.5 text-[11px] font-semibold text-slate-200 hover:bg-white/[0.08] disabled:opacity-50"
                  >
                    {saving ? (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Save className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    {online ? "Save Progress" : "Save on this device"}
                  </Button>

                  {queuedOffline && (
                    <span className="text-[10px] font-semibold text-amber-300">
                      Draft waiting to sync
                    </span>
                  )}

                  {financeForm === "quote" && (
                    <Button
                      onClick={() => setPdfOpen(true)}
                      className="h-8.5 rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-3.5 text-[11px] font-bold text-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.15)] hover:bg-cyan-400/20"
                    >
                      <FileDown className="mr-1.5 h-3.5 w-3.5" />
                      Preview &amp; send PDF
                    </Button>
                  )}

                  {canApprove && (
                    <>
                      <Button
                        onClick={handleApprove}
                        disabled={approving || awaitingClient || (financeForm === "quote" && !quoteConfirmed)}
                        className="h-8.5 rounded-lg border border-emerald-400/30 bg-emerald-400/20 px-3.5 text-[11px] font-bold text-emerald-300 shadow-[0_0_16px_rgba(52,211,153,0.2)] transition-all hover:bg-emerald-400 hover:text-slate-950 disabled:opacity-50"
                      >
                        {approving ? (
                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Check className="mr-1.5 h-3.5 w-3.5" />
                        )}
                        Approve &amp; Advance
                      </Button>

                      <Button
                        onClick={() => setShowReject((v) => !v)}
                        className="h-8.5 rounded-lg border border-rose-400/30 bg-rose-400/10 px-3.5 text-[11px] font-bold text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.15)] hover:bg-rose-400/20"
                      >
                        <X className="mr-1.5 h-3.5 w-3.5" />
                        Reject
                      </Button>
                    </>
                  )}
                </div>

                {isQuoteStep && !canApprove && (
                  <p className="mt-2 text-[10px] text-slate-400">
                    You can prepare and send this quotation. Final approval stays with the assigned owner, a manager or the board.
                  </p>
                )}
                {awaitingClient && canApprove && (
                  <p className="mt-2 text-[10px] font-semibold text-amber-300">
                    This step needs the client's own approval first — send them the tracking link and their client ID from the panel on the right.
                  </p>
                )}
                {financeForm === "quote" && !quoteConfirmed && (
                  <p className="mt-2 text-[10px] text-slate-400">
                    Confirm the quote above before approving this step.
                  </p>
                )}
              </div>
            )}

            {/* REJECTION PANEL */}
            {showReject && canApprove && (
              <div className="space-y-3 rounded-xl border border-rose-400/30 bg-rose-400/5 p-4 text-[11px]">
                <Label className="text-[11px] font-semibold text-rose-300">Reason for rejection *</Label>
                <Textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                  className="rounded-xl border-rose-400/30 bg-[#10151d] text-[11px] text-slate-200 placeholder:text-slate-500 focus:border-rose-400/50 focus:ring-1 focus:ring-rose-400/50"
                />
                <Button
                  onClick={handleReject}
                  disabled={rejecting || !rejectionReason.trim()}
                  className="h-8.5 rounded-lg border border-rose-400/30 bg-rose-500 px-3.5 text-[11px] font-bold text-slate-950 shadow-[0_0_16px_rgba(244,63,94,0.2)] hover:bg-rose-400 disabled:opacity-50"
                >
                  {rejecting && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                  Confirm Rejection
                </Button>
              </div>
            )}
          </GlassCard>

          {/* SIDEBAR PANELS */}
          <div className="space-y-5">
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

            <GlassCard className="p-5 space-y-4">
              <div className="border-b border-white/[0.065] pb-3">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Client Details
                </h3>
              </div>

              <div className="space-y-3 text-[11px]">
                <div className="flex items-start gap-2.5">
                  <User className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider">Name</p>
                    <p className="font-semibold text-slate-100">{job.client_name}</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Phone className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider">Phone</p>
                    <p className="font-semibold text-slate-100">{job.client_phone || "—"}</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider">Email</p>
                    <p className="font-semibold text-slate-100">{job.client_email || "—"}</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider">Location</p>
                    <p className="font-semibold text-slate-100">{job.client_location || "—"}</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Briefcase className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider">Service Type</p>
                    <p className="font-semibold text-slate-100">{job.service_type || "—"}</p>
                  </div>
                </div>

                {job.tracking_token && (
                  <div className="border-t border-white/[0.085] pt-3">
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider">
                      Client Tracking Link
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <Button
                        onClick={() => {
                          navigator.clipboard.writeText(
                            `${window.location.origin}/track?token=${job.tracking_token}`
                          );
                          toast.success("Tracking link copied!");
                        }}
                        className="h-7.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 text-[10px] font-medium text-slate-200 hover:bg-white/[0.06]"
                      >
                        <Copy className="mr-1.5 h-3 w-3 text-cyan-400" /> Copy Link
                      </Button>
                      <Button
                        onClick={() =>
                          window.open(`${window.location.origin}/track?token=${job.tracking_token}`, "_blank")
                        }
                        className="h-7.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 text-[10px] font-medium text-slate-200 hover:bg-white/[0.06]"
                      >
                        <ExternalLink className="mr-1.5 h-3 w-3 text-cyan-400" /> Preview
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </GlassCard>
          </div>
        </div>
      )}
    </div>
  );
}