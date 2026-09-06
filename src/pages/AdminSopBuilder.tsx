import { useEffect, useState } from "react";
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
} from "lucide-react";
import { toast } from "sonner";
import { FIELD_TYPE_OPTIONS, slugifyKey, type SopFieldRow } from "@/lib/sopFields";
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

export default function AdminSopBuilder() {
  const { isAdmin, orgId, user } = useAuth();
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
    const list = (data || []) as unknown as Stage[];
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
    toast.success("Workflow created — now add your steps");
  };

  const makeActive = async (id: string) => {
    if (!orgId) return;
    await supabase.from("sop_templates").update({ is_active: false }).eq("org_id", orgId);
    const { error } = await supabase.from("sop_templates").update({ is_active: true }).eq("id", id);
    if (error) return toast.error(error.message);
    setTemplates((p) => p.map((t) => ({ ...t, is_active: t.id === id })));
    toast.success("This workflow is now used for new jobs");
  };

  const deleteTemplate = async (id: string) => {
    const { error } = await supabase.from("sop_templates").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setTemplates((p) => p.filter((t) => t.id !== id));
    if (activeTemplate === id) setActiveTemplate(null);
    toast.success("Workflow deleted");
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
    toast.success("New version created — jobs already running keep the old version");
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
    setStages((p) => p.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  const saveStage = async (s: Stage) => {
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
    if (error) return toast.error(error.message);
    toast.success("Step saved");
  };

  const moveStage = async (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= stages.length) return;
    const reordered = [...stages];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setStages(reordered.map((s, i) => ({ ...s, position: i })));
    await Promise.all(
      reordered.map((s, i) => supabase.from("sop_stages").update({ position: i }).eq("id", s.id))
    );
  };

  const deleteStage = async (id: string) => {
    const { error } = await supabase.from("sop_stages").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setStages((p) => p.filter((s) => s.id !== id).map((s, i) => ({ ...s, position: i })));
    toast.success("Step removed");
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
    setFields((p) => ({
      ...p,
      [stageId]: (p[stageId] || []).map((f) => (f.id === id ? { ...f, ...patch } : f)),
    }));

  const saveField = async (stageId: string, f: SopFieldRow) => {
    const { error } = await supabase
      .from("sop_fields")
      .update({
        label: f.label,
        field_key: slugifyKey(f.label) + "_" + f.id.slice(0, 4),
        field_type: f.field_type,
        required: f.required,
        placeholder: f.placeholder,
        help_text: f.help_text,
        options: f.options,
      })
      .eq("id", f.id);
    if (error) return toast.error(error.message);
    patchField(stageId, f.id, { field_key: slugifyKey(f.label) + "_" + f.id.slice(0, 4) });
    toast.success("Question saved");
  };

  const deleteField = async (stageId: string, id: string) => {
    const { error } = await supabase.from("sop_fields").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setFields((p) => ({ ...p, [stageId]: (p[stageId] || []).filter((f) => f.id !== id) }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Workflow className="h-6 w-6 text-accent" />
        <h1 className="font-heading text-2xl font-bold">SOP Builder</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        Answer the questions below and the app builds your workflow. Every step, owner, deadline and form
        question is yours — it works for trades, catering, clinics, logistics, retail, anything.
      </p>

      {/* Step 1: workflows */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">1. What process are you running?</CardTitle>
          <CardDescription>Create a workflow, then mark the one new jobs should follow.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Input
              className="max-w-xs"
              value={newTemplateName}
              onChange={(e) => setNewTemplateName(e.target.value)}
              placeholder="e.g. Client Onboarding, Catering Order"
            />
            <Button onClick={createTemplate} disabled={busy || !newTemplateName.trim()}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
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
          <p className="text-xs text-muted-foreground">
            Not sure where to start? Browse the template library for a ready-made workflow for your
            niche, then edit every step, owner and question.
          </p>

          <div className="flex flex-wrap gap-2">
            {visibleTemplates.map((t) => (
              <div
                key={t.id}
                className={`flex items-center gap-2 rounded border px-3 py-2 text-sm ${
                  activeTemplate === t.id ? "border-accent bg-accent/5" : "border-border"
                }`}
              >
                <button className="font-medium" onClick={() => setActiveTemplate(t.id)}>
                  {t.name}
                </button>
                <Badge variant="outline" className="font-mono text-[10px]">v{t.version}</Badge>
                {t.is_locked && (
                  <Badge variant="outline" className="gap-1 text-[10px] text-muted-foreground">
                    <Lock className="h-3 w-3" /> Archived
                  </Badge>
                )}
                {t.is_active ? (
                  <Badge variant="outline" className="border-success text-success">
                    <CheckCircle2 className="mr-1 h-3 w-3" /> Live
                  </Badge>
                ) : !t.is_locked ? (
                  <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => makeActive(t.id)}>
                    Use this
                  </Button>
                ) : null}
                {!t.is_locked && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-destructive"
                    onClick={() => deleteTemplate(t.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
            {templates.length === 0 && (
              <p className="text-sm text-muted-foreground">No workflows yet — create your first one above.</p>
            )}
          </div>

          {templates.some((t) => t.is_locked) && (
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => setShowArchived((v) => !v)}>
              <History className="mr-1 h-3 w-3" />
              {showArchived ? "Hide archived versions" : "Show archived versions"}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Versioning */}
      {current && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Versions of “{current.name}”</CardTitle>
            <CardDescription>
              Jobs stay attached to the exact version they started on. Publish a new version to change the
              workflow for future jobs without touching work already in progress.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" disabled={busy} onClick={() => publishNewVersion(current.id)}>
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GitBranch className="mr-2 h-4 w-4" />}
                Publish v{Math.max(...versionHistory.map((v) => v.version), current.version) + 1} (copy of v{current.version})
              </Button>
              {locked && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Lock className="h-3 w-3" /> This version is archived and read-only.
                </span>
              )}
            </div>

            <div className="divide-y divide-border rounded border border-border text-sm">
              {versionHistory.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setActiveTemplate(v.id)}
                  className={`flex w-full items-center gap-3 p-3 text-left ${
                    v.id === current.id ? "bg-accent/5" : ""
                  }`}
                >
                  <Badge variant="outline" className="font-mono">v{v.version}</Badge>
                  <span className="flex-1 truncate text-muted-foreground">
                    {v.version_notes || (v.is_locked ? "Archived version" : "Editable draft")}
                  </span>
                  {v.is_active && (
                    <Badge variant="outline" className="border-success text-success">Live</Badge>
                  )}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: stages */}
      {activeTemplate && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">2. What are the steps, in order?</CardTitle>
            <CardDescription>
              Each step locks until the one before it is approved, so work can never skip ahead.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <fieldset disabled={locked} className="space-y-3 disabled:opacity-70">
            {stages.map((s, idx) => (
              <div key={s.id} className="rounded border border-border">
                <div className="flex items-center gap-2 p-3">
                  <Badge variant="outline" className="font-mono">{idx + 1}</Badge>
                  <button
                    className="flex-1 text-left font-medium"
                    onClick={() => setOpenStage(openStage === s.id ? null : s.id)}
                  >
                    {s.name}
                    <span className="ml-2 text-xs text-muted-foreground">
                      {(fields[s.id] || []).length} question(s)
                    </span>
                  </button>
                  <Button variant="ghost" size="icon" onClick={() => moveStage(idx, -1)}>
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => moveStage(idx, 1)}>
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    onClick={() => deleteStage(s.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {openStage === s.id && (
                  <div className="space-y-4 border-t border-border p-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label>Step name</Label>
                        <Input value={s.name} onChange={(e) => patchStage(s.id, { name: e.target.value })} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Deadline (hours)</Label>
                        <Input
                          type="number"
                          value={s.sla_hours}
                          onChange={(e) => patchStage(s.id, { sla_hours: Number(e.target.value) })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Who is responsible?</Label>
                        <Select
                          value={s.primary_role_id ?? NONE}
                          onValueChange={(v) => patchStage(s.id, { primary_role_id: v === NONE ? null : v })}
                        >
                          <SelectTrigger><SelectValue placeholder="Pick a role" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value={NONE}>Unassigned</SelectItem>
                            {roles.map((r) => (
                              <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Backup / approver</Label>
                        <Select
                          value={s.secondary_role_id ?? NONE}
                          onValueChange={(v) => patchStage(s.id, { secondary_role_id: v === NONE ? null : v })}
                        >
                          <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value={NONE}>None</SelectItem>
                            {roles.map((r) => (
                              <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label>Instructions for the person doing this step</Label>
                      <Textarea
                        value={s.description || ""}
                        rows={2}
                        onChange={(e) => patchStage(s.id, { description: e.target.value })}
                      />
                    </div>

                    <Button variant="outline" size="sm" onClick={() => saveStage(s)}>
                      Save step
                    </Button>

                    {/* Fields */}
                    <div className="space-y-3 border-t border-border pt-4">
                      <div className="flex items-center justify-between">
                        <Label>3. What must be captured at this step?</Label>
                        <Button variant="outline" size="sm" onClick={() => addField(s.id)}>
                          <Plus className="mr-1 h-3 w-3" /> Add question
                        </Button>
                      </div>

                      {(fields[s.id] || []).map((f) => (
                        <div key={f.id} className="space-y-3 rounded border border-border bg-muted/30 p-3">
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-1.5">
                              <Label>Question / label</Label>
                              <Input
                                value={f.label}
                                onChange={(e) => patchField(s.id, f.id, { label: e.target.value })}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label>Answer type</Label>
                              <Select
                                value={f.field_type}
                                onValueChange={(v) => patchField(s.id, f.id, { field_type: v })}
                              >
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {FIELD_TYPE_OPTIONS.map((o) => (
                                    <SelectItem key={o.value} value={o.value}>
                                      {o.label} — {o.hint}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          {f.field_type === "select" && (
                            <div className="space-y-1.5">
                              <Label>Dropdown options (one per line)</Label>
                              <Textarea
                                rows={3}
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
                            <Label>Helper text (optional)</Label>
                            <Input
                              value={f.help_text || ""}
                              onChange={(e) => patchField(s.id, f.id, { help_text: e.target.value })}
                            />
                          </div>

                          <div className="flex items-center justify-between">
                            <label className="flex items-center gap-2 text-sm">
                              <Checkbox
                                checked={f.required}
                                onCheckedChange={(v) => patchField(s.id, f.id, { required: !!v })}
                              />
                              Required before the step can be approved
                            </label>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm" onClick={() => saveField(s.id, f)}>
                                Save
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive"
                                onClick={() => deleteField(s.id, f.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}

            <Button variant="outline" onClick={addStage}>
              <Plus className="mr-2 h-4 w-4" /> Add step
            </Button>
            </fieldset>
          </CardContent>
        </Card>
      )}
    </div>
  );
}