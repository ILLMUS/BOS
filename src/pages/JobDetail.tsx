import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { canEditStage } from "@/lib/authority";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Check, CloudOff, Copy, ExternalLink, FileDown, Loader2, RotateCcw, Save, X } from "lucide-react";
import { toast } from "sonner";
import DynamicPipelineBar from "@/components/sop/DynamicPipelineBar";
import DynamicStageForm from "@/components/sop/DynamicStageForm";
import QuotationPrepForm from "@/components/stages/QuotationPrepForm";
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

  // Quotation steps use the built-in in-app quote editor instead of the
  // generic dynamic field form.
  const isQuoteStage = useMemo(() => {
    const n = (current?.stage_name || "").toLowerCase();
    return /quot/.test(n);
  }, [current?.stage_name]);


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

  // Chain of command: only the assignee of this step, a manager or the board may edit it.
  const canEdit = canEditStage(authority, current ?? null, user?.id);
  const isStepOpen = !!current && current.status !== "locked" && current.status !== "approved";
  const lockedByAuthority = isStepOpen && !canEdit;

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

  // Keep a local copy of every keystroke so nothing is lost if signal drops.
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

  // Push anything captured offline as soon as the connection returns.
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
  if (!job) return <div className="py-20 text-center text-muted-foreground">Job not found.</div>;

  const stageIndex = current ? [...stages].sort((a, b) => a.position - b.position).findIndex((s) => s.id === current.id) : 0;

  return (
    <div className="space-y-6">
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
            {job.template_version ? ` • Workflow v${job.template_version}` : ""}
          </p>
        </div>
      </div>

      <EngineChain
        active={["work", "sop", "workflow", "stage", "responsibility", "form", "sla", "approval"]}
      />

      <JobLifecycleTrail jobId={job.id} />

      <Card>
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
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="font-heading text-lg">
                  Step {stageIndex + 1}: {current.stage_name}
                </CardTitle>
                <Badge
                  variant="outline"
                  className={
                    current.status === "approved"
                      ? "border-success text-success"
                      : current.status === "rejected"
                      ? "border-destructive text-destructive"
                      : current.status === "locked"
                      ? "border-locked text-locked-foreground"
                      : "border-accent text-accent"
                  }
                >
                  {current.status.toUpperCase()}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {(stageMeta?.description ||
                stageMeta?.primaryRole ||
                current.primary_owner_id ||
                stageMeta?.requires_approval) && (
                <div className="space-y-2 rounded border border-border bg-muted/40 p-3">
                  {stageMeta?.description && (
                    <p className="text-sm text-muted-foreground">{stageMeta.description}</p>
                  )}
                  <div className="flex flex-wrap gap-2 text-xs">
                    <Badge variant="outline">
                      Responsible: {stageMeta?.primaryRole || "Unassigned role"}
                      {current.primary_owner_id && ownerNames[current.primary_owner_id]
                        ? ` · ${ownerNames[current.primary_owner_id]}`
                        : ""}
                    </Badge>
                    {(stageMeta?.secondaryRole || current.secondary_owner_id) && (
                      <Badge variant="outline">
                        Backup: {stageMeta?.secondaryRole || "Role"}
                        {current.secondary_owner_id && ownerNames[current.secondary_owner_id]
                          ? ` · ${ownerNames[current.secondary_owner_id]}`
                          : ""}
                      </Badge>
                    )}
                    {stageMeta?.requires_approval && (
                      <Badge variant="outline" className="border-accent text-accent">
                        Approval gate
                      </Badge>
                    )}
                  </div>
                </div>
              )}

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

              {isQuoteStage ? (
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

              {canEdit ? (
                <div className="space-y-2 border-t border-border pt-4">
                  <Label>Step Notes</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => {
                      setNotes(e.target.value);
                      setDirty(true);
                    }}
                    placeholder="Add notes, observations or comments..."
                    rows={3}
                  />
                </div>
              ) : (
                current.notes && (
                  <div className="space-y-1 border-t border-border pt-4">
                    <Label className="text-muted-foreground">Notes</Label>
                    <p className="text-sm">{current.notes}</p>
                  </div>
                )
              )}

              {lockedByAuthority && (
                <div className="rounded border border-warning/40 bg-warning/5 p-3">
                  <p className="text-sm font-medium">Read-only for you</p>
                  <p className="text-sm text-muted-foreground">
                    This step is assigned to someone else. Only its owner, a manager or the
                    administration board can fill it in.
                  </p>
                </div>
              )}

              {!online && (
                <div className="flex items-start gap-2 rounded border border-warning/40 bg-warning/5 p-3">
                  <CloudOff className="mt-0.5 h-4 w-4 text-warning" />
                  <div>
                    <p className="text-sm font-medium">You are offline</p>
                    <p className="text-sm text-muted-foreground">
                      Keep filling this step in — everything is stored on this device and syncs
                      automatically once you have signal again.
                    </p>
                  </div>
                </div>
              )}

              {restoredDraft && (
                <div className="flex items-start gap-2 rounded border border-accent/40 bg-accent/5 p-3">
                  <RotateCcw className="mt-0.5 h-4 w-4 text-accent" />
                  <div>
                    <p className="text-sm font-medium">Restored offline draft</p>
                    <p className="text-sm text-muted-foreground">
                      Unsent changes from {formatDraftAge(restoredDraft.savedAt)} were loaded back
                      into this step.{" "}
                      <button
                        type="button"
                        className="underline underline-offset-2"
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
                <div className="rounded border border-destructive/30 bg-destructive/5 p-3">
                  <p className="text-sm font-medium text-destructive">Rejection reason:</p>
                  <p className="text-sm">{current.rejection_reason}</p>
                </div>
              )}

              {canEdit && (
                <div className="sticky bottom-2 z-10 mt-2 rounded-lg border border-border/70 bg-background/80 p-3 shadow-[0_0_0_1px_hsl(var(--accent)/0.12)] backdrop-blur supports-[backdrop-filter]:bg-background/60">
                  <div className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
                    Stage controls
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Button onClick={handleSave} disabled={saving || !dirty} variant="outline">
                      {saving ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="mr-2 h-4 w-4" />
                      )}
                      {online ? "Save Progress" : "Save on this device"}
                    </Button>
                    {queuedOffline && (
                      <span className="self-center text-xs text-warning">
                        Draft waiting to sync
                      </span>
                    )}
                    {isQuoteStage && (
                      <Button variant="outline" onClick={() => setPdfOpen(true)} className="border-accent/60 text-accent hover:bg-accent/10">
                        <FileDown className="mr-2 h-4 w-4" />
                        Preview &amp; send PDF
                      </Button>
                    )}
                    <Button
                      onClick={handleApprove}
                      disabled={approving || (isQuoteStage && !quoteConfirmed)}
                      className="bg-success text-success-foreground hover:bg-success/90"
                    >
                      {approving ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="mr-2 h-4 w-4" />
                      )}
                      Approve &amp; Advance
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowReject((v) => !v)}
                      className="border-destructive text-destructive hover:bg-destructive/10"
                    >
                      <X className="mr-2 h-4 w-4" />
                      Reject
                    </Button>
                  </div>
                  {isQuoteStage && !quoteConfirmed && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Confirm the quote above before approving this step.
                    </p>
                  )}
                </div>
              )}


              {showReject && (
                <div className="space-y-3 rounded border border-destructive/30 p-4">
                  <Label>Reason for rejection *</Label>
                  <Textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
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

          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-lg">Client Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-muted-foreground">Name</p>
                <p className="font-medium">{job.client_name}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Phone</p>
                <p className="font-medium">{job.client_phone || "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Email</p>
                <p className="font-medium">{job.client_email || "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Location</p>
                <p className="font-medium">{job.client_location || "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Service Type</p>
                <p className="font-medium">{job.service_type || "—"}</p>
              </div>

              {job.tracking_token && (
                <div className="border-t border-border pt-3">
                  <p className="text-muted-foreground">Client Tracking Link</p>
                  <div className="mt-1 flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => {
                        navigator.clipboard.writeText(
                          `${window.location.origin}/track?token=${job.tracking_token}`
                        );
                        toast.success("Tracking link copied!");
                      }}
                    >
                      <Copy className="mr-1 h-3 w-3" /> Copy Link
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                      onClick={() =>
                        window.open(`${window.location.origin}/track?token=${job.tracking_token}`, "_blank")
                      }
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
    </div>
  );
}