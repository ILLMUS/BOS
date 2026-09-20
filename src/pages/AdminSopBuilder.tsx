import { useEffect, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  GitBranch,
  History,
  Lock,
  Loader2,
  Plus,
  Trash2,
  Workflow,
  Sparkles,
  HelpCircle,
  Clock,
  UserCheck,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import { FIELD_TYPE_OPTIONS, slugifyKey, type SopFieldRow } from "@/lib/sopFields";
import { detectFinanceForm, FINANCE_FORM_LABELS } from "@/lib/stageForms";
import { useDeferredDelete } from "@/hooks/useDeferredDelete";
import { autosaveLabel, type AutosaveState } from "@/hooks/useAutosave";
import SopTemplateLibrary from "@/components/sop/SopTemplateLibrary";

const NONE = "__none__";

interface Template {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  version: number;
  root_template_id: string | null;
  is_locked: boolean;
  version_notes: string | null;
}

interface Stage {
  id: string;
  template_id: string;
  position: number;
  name: string;
  description: string | null;
  primary_role_id: string | null;
  secondary_role_id: string | null;
  sla_hours: number;
  requires_approval: boolean;
}

interface Role {
  id: string;
  name: string;
}

/* -------------------------------------------------------
   BUSINESS OS GLASS CARD CONTAINER
------------------------------------------------------- */
function GlassCard({
  children,
  className = "",
  title,
  subtitle,
  action,
}: {
  children: React.ReactNode;
  className?: string;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div
      className={`
        relative overflow-hidden rounded-[14px]
        border border-white/[0.085]
        bg-[#10151d]/95
        shadow-[0_18px_60px_rgba(0,0,0,0.24)]
        transition-all duration-200
        ${className}
      `}
    >
      <div className="pointer-events-none absolute -right-20 -top-20 h-40 w-40 rounded-full bg-cyan-500/[0.035] blur-3xl" />

      {(title || subtitle || action) && (
        <div className="relative flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.085] bg-white/[0.02] px-6 py-4">
          <div>
            {title && (
              <div className="text-[13px] font-bold tracking-wide text-white sm:text-sm">
                {title}
              </div>
            )}
            {subtitle && (
              <div className="mt-0.5 text-[11px] text-slate-400">
                {subtitle}
              </div>
            )}
          </div>
          {action}
        </div>
      )}

      {children}
    </div>
  );
}

export default function AdminSopBuilder() {
  const { isAdmin, orgId, user } = useAuth();
  const { remove: deferredDelete } = useDeferredDelete();
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [activeTemplate, setActiveTemplate] = useState<string | null>(null);
  const [stages, setStages] = useState<Stage[]>([]);
  const [fields, setFields] = useState<Record<string, SopFieldRow[]>>({});
  const [openStage, setOpenStage] = useState<string | null>(null);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [busy, setBusy] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [autoState, setAutoState] = useState<AutosaveState>("idle");
  const saveTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    const map = saveTimers.current;
    return () => map.forEach((t) => clearTimeout(t));
  }, []);

  const scheduleSave = (key: string, run: () => Promise<void>) => {
    const existing = saveTimers.current.get(key);
    if (existing) clearTimeout(existing);
    setAutoState("pending");
    saveTimers.current.set(
      key,
      setTimeout(async () => {
        saveTimers.current.delete(key);
        setAutoState("saving");
        try {
          await run();
          setAutoState("saved");
        } catch {
          setAutoState("error");
        }
      }, 1000)
    );
  };

  const loadBase = async () => {
    if (!orgId) return;
    const [t, r] = await Promise.all([
      supabase.from("sop_templates").select("*").eq("org_id", orgId).order("created_at"),
      supabase.from("org_roles").select("id, name").eq("org_id", orgId).order("name"),
    ]);
    const list = (t.data || []) as Template[];
    setTemplates(list);
    setRoles((r.data || []) as Role[]);
    setActiveTemplate(
      (cur) => cur ?? list.find((x) => x.is_active)?.id ?? list.filter((x) => !x.is_locked)[0]?.id ?? list[0]?.id ?? null
    );
    setLoading(false);
  };

  const loadStages = async (templateId: string) => {
    const { data } = await supabase
      .from("sop_stages")
      .select("*")
      .eq("template_id", templateId)
      .order("position");
    
    const list: Stage[] = (data || []).map((s: any) => ({
      id: s.id,
      template_id: s.template_id,
      position: s.position ?? 0,
      name: s.name ?? "",
      description: s.description ?? "",
      primary_role_id: s.primary_role_id ?? null,
      secondary_role_id: s.secondary_role_id ?? null,
      sla_hours: s.sla_hours ?? 0,
      requires_approval: s.requires_approval ?? false,
    }));

    setStages(list);

    if (list.length) {
      const { data: f } = await supabase
        .from("sop_fields")
        .select("*")
        .in("stage_id", list.map((s) => s.id))
        .order("position");
      
      const map: Record<string, SopFieldRow[]> = {};
      ((f || []) as unknown as SopFieldRow[]).forEach((row) => {
        map[row.stage_id] = [...(map[row.stage_id] || []), row];
      });
      setFields(map);
    } else {
      setFields({});
    }
  };

  useEffect(() => {
    if (isAdmin && orgId) loadBase();
  }, [isAdmin, orgId]);

  useEffect(() => {
    if (activeTemplate) loadStages(activeTemplate);
  }, [activeTemplate]);

  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const createTemplate = async () => {
    if (!newTemplateName.trim() || !orgId) return;
    setBusy(true);
    const { data, error } = await supabase
      .from("sop_templates")
      .insert({
        org_id: orgId,
        name: newTemplateName.trim(),
        created_by: user?.id ?? null,
        is_active: templates.length === 0,
      })
      .select()
      .single();
    setBusy(false);
    if (error) return toast.error(error.message);
    setNewTemplateName("");
    setTemplates((p) => [...p, data as Template]);
    setActiveTemplate(data.id);
    toast.success("Workflow created — now add your operational steps");
  };

  const makeActive = async (id: string) => {
    if (!orgId) return;
    await supabase.from("sop_templates").update({ is_active: false }).eq("org_id", orgId);
    const { error } = await supabase.from("sop_templates").update({ is_active: true }).eq("id", id);
    if (error) return toast.error(error.message);
    setTemplates((p) => p.map((t) => ({ ...t, is_active: t.id === id })));
    toast.success("This workflow is now active for all new jobs");
  };

  const deleteTemplate = async (t: Template) => {
    const wasActive = activeTemplate === t.id;
    await deferredDelete({
      id: t.id,
      label: t.name,
      onRemove: () => {
        setTemplates((p) => p.filter((x) => x.id !== t.id));
        if (wasActive) setActiveTemplate(null);
      },
      onRestore: () => {
        setTemplates((p) => [...p, t].sort((a, b) => a.version - b.version));
        if (wasActive) setActiveTemplate(t.id);
      },
      onCommit: async () => {
        const { error } = await supabase.from("sop_templates").delete().eq("id", t.id);
        if (error) {
          toast.error(error.message);
          void loadBase();
        }
      },
    });
  };

  const current = templates.find((t) => t.id === activeTemplate) ?? null;
  const locked = !!current?.is_locked;
  const rootOf = (t: Template) => t.root_template_id ?? t.id;
  const versionHistory = current
    ? templates.filter((t) => rootOf(t) === rootOf(current)).sort((a, b) => b.version - a.version)
    : [];
  const visibleTemplates = templates.filter((t) => showArchived || !t.is_locked);

  const publishNewVersion = async (id: string) => {
    setBusy(true);
    const { data, error } = await supabase.rpc("create_template_version", {
      _template_id: id,
      _notes: null,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    await loadBase();
    setActiveTemplate(data as string);
    toast.success("New version created — existing active jobs will retain the prior version");
  };

  const addStage = async () => {
    if (!activeTemplate || !orgId) return;
    const { data, error } = await supabase
      .from("sop_stages")
      .insert({
        org_id: orgId,
        template_id: activeTemplate,
        position: stages.length,
        name: `Step ${stages.length + 1}`,
      })
      .select()
      .single();
    if (error) return toast.error(error.message);
    setStages((p) => [...p, data as unknown as Stage]);
    setOpenStage(data.id);
  };

  const patchStage = (id: string, patch: Partial<Stage>) =>
    setStages((p) => {
      const next = p.map((s) => (s.id === id ? { ...s, ...patch } : s));
      const target = next.find((s) => s.id === id);
      if (target) scheduleSave(`stage:${id}`, () => saveStage(target, true));
      return next;
    });

  const saveStage = async (s: Stage, silent = false) => {
    const { error } = await supabase
      .from("sop_stages")
      .update({
        name: s.name,
        description: s.description,
        primary_role_id: s.primary_role_id,
        secondary_role_id: s.secondary_role_id,
        sla_hours: s.sla_hours,
        requires_approval: s.requires_approval,
      })
      .eq("id", s.id);
    if (error) {
      toast.error(error.message);
      throw error;
    }
    if (!silent) toast.success("Step saved");
  };

  const moveStage = async (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= stages.length) return;
    const reordered = [...stages];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    const updated = reordered.map((s, i) => ({ ...s, position: i }));
    setStages(updated);

    try {
      await Promise.all(
        updated.map((s) => supabase.from("sop_stages").update({ position: s.position }).eq("id", s.id))
      );
    } catch {
      toast.error("Could not sync step order");
    }
  };

  const deleteStage = async (s: Stage) => {
    const timerKey = `stage:${s.id}`;
    if (saveTimers.current.has(timerKey)) {
      clearTimeout(saveTimers.current.get(timerKey));
      saveTimers.current.delete(timerKey);
    }

    const stageFields = fields[s.id] || [];
    await deferredDelete({
      id: s.id,
      label: s.name,
      message: `Step “${s.name}” removed`,
      onRemove: () => {
        setStages((p) => p.filter((x) => x.id !== s.id).map((x, i) => ({ ...x, position: i })));
        if (openStage === s.id) setOpenStage(null);
      },
      onRestore: () => {
        setStages((p) => [...p, s].sort((a, b) => a.position - b.position).map((x, i) => ({ ...x, position: i })));
        setFields((p) => ({ ...p, [s.id]: stageFields }));
      },
      onCommit: async () => {
        const { error } = await supabase.from("sop_stages").delete().eq("id", s.id);
        if (error) {
          toast.error(error.message);
          if (activeTemplate) void loadStages(activeTemplate);
        }
      },
    });
  };

  const addField = async (stageId: string) => {
    if (!orgId) return;
    const existing = fields[stageId] || [];
    const key = `field_${existing.length + 1}`;
    const { data, error } = await supabase
      .from("sop_fields")
      .insert({
        org_id: orgId,
        stage_id: stageId,
        position: existing.length,
        field_key: key,
        label: "New question",
        field_type: "text",
      })
      .select()
      .single();
    if (error) return toast.error(error.message);
    setFields((p) => ({ ...p, [stageId]: [...existing, data as unknown as SopFieldRow] }));
  };

  const patchField = (stageId: string, id: string, patch: Partial<SopFieldRow>) =>
    setFields((p) => {
      const list = (p[stageId] || []).map((f) => (f.id === id ? { ...f, ...patch } : f));
      const target = list.find((f) => f.id === id);
      if (target) scheduleSave(`field:${id}`, () => saveField(stageId, target, true));
      return { ...p, [stageId]: list };
    });

  const saveField = async (stageId: string, f: SopFieldRow, silent = false) => {
    const baseSlug = slugifyKey(f.label) || "field";
    const nextKey = `${baseSlug}_${f.id.slice(0, 8)}`;

    const { error } = await supabase
      .from("sop_fields")
      .update({
        label: f.label,
        field_key: nextKey,
        field_type: f.field_type,
        required: f.required,
        placeholder: f.placeholder,
        help_text: f.help_text,
        options: f.options,
      })
      .eq("id", f.id);

    if (error) {
      toast.error(error.message);
      throw error;
    }

    if (f.field_key !== nextKey) {
      setFields((p) => ({
        ...p,
        [stageId]: (p[stageId] || []).map((x) => (x.id === f.id ? { ...x, field_key: nextKey } : x)),
      }));
    }

    if (!silent) toast.success("Question saved");
  };

  const deleteField = async (stageId: string, f: SopFieldRow) => {
    const timerKey = `field:${f.id}`;
    if (saveTimers.current.has(timerKey)) {
      clearTimeout(saveTimers.current.get(timerKey));
      saveTimers.current.delete(timerKey);
    }

    await deferredDelete({
      id: f.id,
      label: f.label,
      message: `Question “${f.label}” removed`,
      onRemove: () => setFields((p) => ({ ...p, [stageId]: (p[stageId] || []).filter((x) => x.id !== f.id) })),
      onRestore: () =>
        setFields((p) => ({
          ...p,
          [stageId]: [...(p[stageId] || []), f].sort((a, b) => a.position - b.position),
        })),
      onCommit: async () => {
        const { error } = await supabase.from("sop_fields").delete().eq("id", f.id);
        if (error) {
          toast.error(error.message);
          if (activeTemplate) void loadStages(activeTemplate);
        }
      },
    });
  };

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center text-[11px] text-slate-400">
        <Loader2 className="mr-2 h-4 w-4 animate-spin text-cyan-400" />
        Loading SOP workflows...
      </div>
    );
  }

  return (
    <div className="space-y-5 text-slate-200">
      {/* HEADER BAR */}
      <div className="flex flex-col gap-1 border-b border-white/[0.065] pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-300">
            <Workflow className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
                SOP Builder
              </h1>
              {autoState !== "idle" && (
                <span
                  className={`rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider ${
                    autoState === "error"
                      ? "border-rose-500/30 bg-rose-500/10 text-rose-300"
                      : "border-cyan-400/30 bg-cyan-400/10 text-cyan-300"
                  }`}
                >
                  {autosaveLabel(autoState)}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400">
              Configure standardized operational processes, assign responsibilities, and set stage-by-stage requirements.
            </p>
          </div>
        </div>
      </div>

      {/* STEP 1: WORKFLOW TEMPLATES */}
      <GlassCard
        title="1. Select or Create a Workflow Process"
        subtitle="Specify which process structure active projects should enforce."
      >
        <div className="space-y-4 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              className="h-9 max-w-xs rounded-xl border-white/[0.08] bg-[#0b0e14] text-[11px] text-slate-200 placeholder:text-slate-600 focus:border-cyan-400/40 focus:ring-cyan-400/20"
              value={newTemplateName}
              onChange={(e) => setNewTemplateName(e.target.value)}
              placeholder="e.g. Client Onboarding, Site Inspection"
            />
            <Button
              onClick={createTemplate}
              disabled={busy || !newTemplateName.trim()}
              className="h-9 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-[11px] transition-colors"
            >
              {busy ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Plus className="mr-2 h-3.5 w-3.5" />}
              New Workflow
            </Button>

            <SopTemplateLibrary
              orgId={orgId}
              userId={user?.id}
              onInstalled={async (id) => {
                await loadBase();
                setActiveTemplate(id);
              }}
            />
          </div>

          <p className="text-[11px] text-slate-400">
            Select a template from the library or create a custom process from scratch.
          </p>

          <div className="flex flex-wrap gap-2 pt-1">
            {visibleTemplates.map((t) => (
              <div
                key={t.id}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-[11px] transition-all ${
                  activeTemplate === t.id
                    ? "border-cyan-400/40 bg-cyan-400/10 text-white shadow-[0_0_15px_rgba(34,211,238,0.1)]"
                    : "border-white/[0.08] bg-white/[0.02] text-slate-300 hover:bg-white/[0.04]"
                }`}
              >
                <button className="font-semibold text-slate-100" onClick={() => setActiveTemplate(t.id)}>
                  {t.name}
                </button>
                <span className="rounded-md border border-white/10 bg-white/[0.03] px-1.5 py-0.5 font-mono text-[9px] text-slate-400">
                  v{t.version}
                </span>

                {t.is_locked && (
                  <span className="inline-flex items-center gap-1 rounded-md border border-slate-500/30 bg-slate-500/10 px-1.5 py-0.5 text-[9px] text-slate-400">
                    <Lock className="h-2.5 w-2.5" /> Archived
                  </span>
                )}

                {t.is_active ? (
                  <span className="inline-flex items-center rounded-md border border-emerald-400/30 bg-emerald-400/10 px-1.5 py-0.5 font-mono text-[9px] font-bold text-emerald-300 uppercase">
                    <CheckCircle2 className="mr-1 h-2.5 w-2.5" /> Active
                  </span>
                ) : !t.is_locked ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 rounded-lg px-2 text-[10px] text-cyan-300 hover:bg-cyan-400/10"
                    onClick={() => makeActive(t.id)}
                  >
                    Set Active
                  </Button>
                ) : null}

                {!t.is_locked && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
                    onClick={() => deleteTemplate(t)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}

            {templates.length === 0 && (
              <p className="text-[11px] text-slate-400">No workflows found. Create your first process above.</p>
            )}
          </div>

          {templates.some((t) => t.is_locked) && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-[10px] text-slate-400 hover:text-slate-200"
              onClick={() => setShowArchived((v) => !v)}
            >
              <History className="mr-1.5 h-3 w-3 text-cyan-400" />
              {showArchived ? "Hide archived versions" : "Show archived versions"}
            </Button>
          )}
        </div>
      </GlassCard>

      {/* VERSION MANAGEMENT */}
      {current && (
        <GlassCard
          title={`Versions of "${current.name}"`}
          subtitle="Running jobs retain the version active when initiated. Creating a new version affects future work."
        >
          <div className="space-y-3 p-5">
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() => publishNewVersion(current.id)}
                className="h-8 rounded-xl border-white/[0.08] bg-white/[0.02] text-[11px] text-slate-200 hover:bg-white/[0.06]"
              >
                {busy ? (
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin text-cyan-400" />
                ) : (
                  <GitBranch className="mr-2 h-3.5 w-3.5 text-cyan-400" />
                )}
                Publish v{Math.max(...versionHistory.map((v) => v.version), current.version) + 1} (Copy of v{current.version})
              </Button>

              {locked && (
                <span className="inline-flex items-center gap-1.5 text-[11px] text-amber-400">
                  <Lock className="h-3 w-3" /> Active template version is locked and read-only.
                </span>
              )}
            </div>

            <div className="divide-y divide-white/[0.06] rounded-xl border border-white/[0.08] bg-[#0b0e14]/50">
              {versionHistory.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setActiveTemplate(v.id)}
                  className={`flex w-full items-center gap-3 p-3 text-left transition-colors ${
                    v.id === current.id ? "bg-cyan-400/[0.06]" : "hover:bg-white/[0.02]"
                  }`}
                >
                  <span className="rounded-md border border-white/10 bg-white/[0.03] px-1.5 py-0.5 font-mono text-[9px] text-slate-300">
                    v{v.version}
                  </span>
                  <span className="flex-1 truncate text-[11px] text-slate-400">
                    {v.version_notes || (v.is_locked ? "Archived version" : "Editable draft")}
                  </span>
                  {v.is_active && (
                    <span className="rounded-md border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 font-mono text-[9px] font-bold text-emerald-300 uppercase">
                      Live
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </GlassCard>
      )}

      {/* STEP 2: STAGE CONFIGURATION */}
      {activeTemplate && (
        <GlassCard
          title="2. Sequence Steps & Requirements"
          subtitle="Configure stage sequence, responsible operational roles, SLA timelines, and required fields."
        >
          <div className="p-5">
            <fieldset disabled={locked} className="space-y-3 disabled:opacity-60">
              {stages.map((s, idx) => (
                <div key={s.id} className="rounded-xl border border-white/[0.08] bg-white/[0.015]">
                  <div className="flex items-center gap-3 p-3.5">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg border border-cyan-400/30 bg-cyan-400/10 font-mono text-[10px] font-bold text-cyan-300">
                      {idx + 1}
                    </span>

                    <button
                      className="flex-1 text-left font-semibold text-slate-100 text-[12px]"
                      onClick={() => setOpenStage(openStage === s.id ? null : s.id)}
                    >
                      {s.name}
                      <span className="ml-2 text-[10px] text-slate-400 font-normal">
                        ({(fields[s.id] || []).length} field questions)
                      </span>
                      {detectFinanceForm(s.name) && (
                        <span className="ml-2 rounded-md border border-cyan-400/30 bg-cyan-400/10 px-2 py-0.5 font-mono text-[9px] text-cyan-300 uppercase">
                          {FINANCE_FORM_LABELS[detectFinanceForm(s.name)!]}
                        </span>
                      )}
                    </button>

                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={locked}
                      className="h-7 w-7 text-slate-400 hover:text-white"
                      onClick={() => moveStage(idx, -1)}
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={locked}
                      className="h-7 w-7 text-slate-400 hover:text-white"
                      onClick={() => moveStage(idx, 1)}
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={locked}
                      className="h-7 w-7 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
                      onClick={() => deleteStage(s)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  {openStage === s.id && (
                    <div className="space-y-4 border-t border-white/[0.08] p-4 bg-white/[0.01]">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label className="text-[11px] font-semibold text-slate-300">Step Name</Label>
                          <Input
                            className="h-9 rounded-xl border-white/[0.08] bg-[#0b0e14] text-[11px] text-slate-200 focus:border-cyan-400/40 focus:ring-cyan-400/20"
                            value={s.name}
                            onChange={(e) => patchStage(s.id, { name: e.target.value })}
                          />
                          <p className="text-[10px] text-slate-400">
                            {detectFinanceForm(s.name)
                              ? `Finance module detected: automatically provisions built-in ${FINANCE_FORM_LABELS[detectFinanceForm(s.name)!].toLowerCase()} workspace.`
                              : "Tip: naming a step Quotation, Invoice, or Receipt provisions appropriate financial form modules."}
                          </p>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-[11px] font-semibold text-slate-300">Target SLA (Hours)</Label>
                          <Input
                            type="number"
                            className="h-9 rounded-xl border-white/[0.08] bg-[#0b0e14] text-[11px] text-slate-200 focus:border-cyan-400/40 focus:ring-cyan-400/20"
                            value={s.sla_hours}
                            onChange={(e) => patchStage(s.id, { sla_hours: Number(e.target.value) })}
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-[11px] font-semibold text-slate-300">Primary Role Responsible</Label>
                          <Select
                            value={s.primary_role_id ?? NONE}
                            onValueChange={(v) => patchStage(s.id, { primary_role_id: v === NONE ? null : v })}
                          >
                            <SelectTrigger className="h-9 rounded-xl border-white/[0.08] bg-[#0b0e14] text-[11px] text-slate-200 focus:border-cyan-400/40 focus:ring-cyan-400/20">
                              <SelectValue placeholder="Select primary role" />
                            </SelectTrigger>
                            <SelectContent className="border-white/[0.085] bg-[#10151d] text-slate-200">
                              <SelectItem value={NONE} className="text-[11px] text-slate-400">
                                Unassigned
                              </SelectItem>
                              {roles.map((r) => (
                                <SelectItem key={r.id} value={r.id} className="text-[11px]">
                                  {r.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-[11px] font-semibold text-slate-300">Secondary Role / Approver</Label>
                          <Select
                            value={s.secondary_role_id ?? NONE}
                            onValueChange={(v) => patchStage(s.id, { secondary_role_id: v === NONE ? null : v })}
                          >
                            <SelectTrigger className="h-9 rounded-xl border-white/[0.08] bg-[#0b0e14] text-[11px] text-slate-200 focus:border-cyan-400/40 focus:ring-cyan-400/20">
                              <SelectValue placeholder="None" />
                            </SelectTrigger>
                            <SelectContent className="border-white/[0.085] bg-[#10151d] text-slate-200">
                              <SelectItem value={NONE} className="text-[11px] text-slate-400">
                                None
                              </SelectItem>
                              {roles.map((r) => (
                                <SelectItem key={r.id} value={r.id} className="text-[11px]">
                                  {r.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-[11px] font-semibold text-slate-300">Stage Guidance & Instructions</Label>
                        <Textarea
                          className="rounded-xl border-white/[0.08] bg-[#0b0e14] text-[11px] text-slate-200 placeholder:text-slate-600 focus:border-cyan-400/40 focus:ring-cyan-400/20"
                          value={s.description || ""}
                          rows={2}
                          onChange={(e) => patchStage(s.id, { description: e.target.value })}
                          placeholder="Provide step instructions for team members execution..."
                        />
                      </div>

                      {/* FIELDS SECTION */}
                      <div className="space-y-3 border-t border-white/[0.08] pt-4">
                        <div className="flex items-center justify-between">
                          <Label className="text-[11px] font-bold text-slate-200">
                            Required Input Fields & Questions
                          </Label>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => addField(s.id)}
                            className="h-8 rounded-xl border-white/[0.08] bg-white/[0.02] text-[11px] text-cyan-300 hover:bg-white/[0.06]"
                          >
                            <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Question
                          </Button>
                        </div>

                        {(fields[s.id] || []).map((f) => (
                          <div key={f.id} className="space-y-3 rounded-xl border border-white/[0.06] bg-[#0b0e14]/60 p-3.5">
                            <div className="grid gap-3 sm:grid-cols-2">
                              <div className="space-y-1.5">
                                <Label className="text-[10px] text-slate-400">Question / Field Label</Label>
                                <Input
                                  className="h-8 rounded-lg border-white/[0.08] bg-[#10151d] text-[11px] text-slate-200 focus:border-cyan-400/40"
                                  value={f.label}
                                  onChange={(e) => patchField(s.id, f.id, { label: e.target.value })}
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-[10px] text-slate-400">Data Type</Label>
                                <Select
                                  value={f.field_type}
                                  onValueChange={(v) => patchField(s.id, f.id, { field_type: v })}
                                >
                                  <SelectTrigger className="h-8 rounded-lg border-white/[0.08] bg-[#10151d] text-[11px] text-slate-200 focus:border-cyan-400/40">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="border-white/[0.085] bg-[#10151d] text-slate-200">
                                    {FIELD_TYPE_OPTIONS.map((o) => (
                                      <SelectItem key={o.value} value={o.value} className="text-[11px]">
                                        {o.label} — <span className="text-slate-400">{o.hint}</span>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            {f.field_type === "select" && (
                              <div className="space-y-1.5">
                                <Label className="text-[10px] text-slate-400">Select Options (One option per line)</Label>
                                <Textarea
                                  rows={3}
                                  className="rounded-lg border-white/[0.08] bg-[#10151d] text-[11px] text-slate-200 focus:border-cyan-400/40"
                                  value={(Array.isArray(f.options) ? f.options : []).join("\n")}
                                  onChange={(e) =>
                                    patchField(s.id, f.id, {
                                      options: e.target.value.split("\n").filter((x) => x.trim() !== ""),
                                    })
                                  }
                                />
                              </div>
                            )}

                            <div className="space-y-1.5">
                              <Label className="text-[10px] text-slate-400">Help / Contextual Guidance</Label>
                              <Input
                                className="h-8 rounded-lg border-white/[0.08] bg-[#10151d] text-[11px] text-slate-200 focus:border-cyan-400/40"
                                value={f.help_text || ""}
                                onChange={(e) => patchField(s.id, f.id, { help_text: e.target.value })}
                              />
                            </div>

                            <div className="flex items-center justify-between pt-1">
                              <label className="flex items-center gap-2 text-[11px] text-slate-300">
                                <Checkbox
                                  checked={f.required}
                                  onCheckedChange={(v) => patchField(s.id, f.id, { required: !!v })}
                                  className="border-white/20 data-[state=checked]:bg-cyan-500 data-[state=checked]:border-cyan-500 data-[state=checked]:text-slate-950"
                                />
                                Mandatory field for stage completion
                              </label>

                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
                                onClick={() => deleteField(s.id, f)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              <Button
                variant="outline"
                onClick={addStage}
                className="h-9 w-full rounded-xl border-dashed border-white/20 bg-white/[0.01] text-[11px] text-slate-300 hover:bg-white/[0.04] hover:text-white"
              >
                <Plus className="mr-2 h-3.5 w-3.5 text-cyan-400" /> Add Workflow Step
              </Button>
            </fieldset>
          </div>
        </GlassCard>
      )}

      {/* FOOTER TIP */}
      <div className="flex items-center gap-2 text-[11px] text-slate-400">
        <span className="inline-flex items-center rounded-md border border-cyan-400/30 bg-cyan-400/10 px-2 py-0.5 text-[10px] font-bold text-cyan-300 uppercase tracking-wider">
          Tip
        </span>
        Workflow steps sequentially lock until prior stages receive completion approval.
      </div>
    </div>
  );
}