import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2, Save, ClipboardList, Info } from "lucide-react";
import { toast } from "sonner";
import {
  EMPTY_STAGE_ROLE_DEFAULTS,
  loadStageRoleDefaults,
  saveStageRoleDefaults,
  type StageRoleDefaults,
} from "@/lib/stageRoleDefaults";

const NONE_VALUE = "__none__";

interface Template {
  id: string;
  name: string;
  is_active: boolean;
  is_locked: boolean;
  version: number;
}

interface Role {
  id: string;
  name: string;
}

interface StageRow {
  id: string;
  name: string;
  position: number;
  primary_role_id: string | null;
  secondary_role_id: string | null;
  sla_hours: number;
  requires_approval: boolean;
}

export default function AdminAssignments() {
  const { isAdmin, orgId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [stages, setStages] = useState<StageRow[]>([]);
  const [defaults, setDefaults] = useState<StageRoleDefaults>(EMPTY_STAGE_ROLE_DEFAULTS);
  const [savingDefaults, setSavingDefaults] = useState(false);

  useEffect(() => {
    if (isAdmin && orgId) loadBase();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, orgId]);

  useEffect(() => {
    if (templateId) loadStages(templateId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId]);

  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const loadBase = async () => {
    const [t, r, d] = await Promise.all([
      supabase.from("sop_templates").select("id, name, is_active, is_locked, version").eq("org_id", orgId!).order("created_at"),
      supabase.from("org_roles").select("id, name").eq("org_id", orgId!).order("name"),
      loadStageRoleDefaults(orgId!).catch(() => EMPTY_STAGE_ROLE_DEFAULTS),
    ]);
    const list = (t.data || []) as Template[];
    setTemplates(list);
    setRoles((r.data || []) as Role[]);
    setDefaults(d);
    setTemplateId((cur) => cur ?? list.find((x) => x.is_active)?.id ?? list[0]?.id ?? null);
    setLoading(false);
  };

  const loadStages = async (id: string) => {
    const { data, error } = await supabase
      .from("sop_stages")
      .select("id, name, position, primary_role_id, secondary_role_id, sla_hours, requires_approval")
      .eq("template_id", id)
      .order("position");
    if (error) return toast.error("Failed to load workflow steps");
    setStages((data || []) as StageRow[]);
  };

  const update = (id: string, patch: Partial<StageRow>) =>
    setStages((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  const handleSaveDefaults = async () => {
    if (!orgId) return;
    setSavingDefaults(true);
    try {
      await saveStageRoleDefaults(orgId, defaults);
      toast.success("Company defaults saved");
    } catch (err: any) {
      toast.error(err.message || "Failed to save defaults");
    } finally {
      setSavingDefaults(false);
    }
  };

  const applyDefaults = (mode: "unassigned" | "all") => {
    if (!defaults.primary_role_id && !defaults.secondary_role_id) {
      return toast.error("Pick a default role first");
    }
    setStages((prev) =>
      prev.map((s) => ({
        ...s,
        primary_role_id:
          mode === "all" || !s.primary_role_id ? defaults.primary_role_id ?? s.primary_role_id : s.primary_role_id,
        secondary_role_id:
          mode === "all" || !s.secondary_role_id
            ? defaults.secondary_role_id ?? s.secondary_role_id
            : s.secondary_role_id,
        sla_hours: mode === "all" ? defaults.sla_hours : s.sla_hours || defaults.sla_hours,
      }))
    );
    toast.success(mode === "all" ? "Defaults applied to every step" : "Defaults applied to unassigned steps");
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const s of stages) {
        const { error } = await supabase
          .from("sop_stages")
          .update({
            primary_role_id: s.primary_role_id,
            secondary_role_id: s.secondary_role_id,
            sla_hours: s.sla_hours,
          })
          .eq("id", s.id);
        if (error) throw error;
      }
      toast.success("Step responsibilities saved");
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  const current = templates.find((t) => t.id === templateId);
  const locked = !!current?.is_locked;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <ClipboardList className="h-6 w-6 text-accent" />
          <h1 className="font-heading text-2xl font-bold">Step Responsibilities</h1>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving || locked || stages.length === 0}
          className="bg-accent text-accent-foreground hover:bg-accent/90"
        >
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save All
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        Assign the primary and secondary roles accountable for every step of your workflow, and set how long each step
        may take before it is flagged overdue. These are your own roles and your own workflow steps — nothing is tied to
        a fixed industry.
      </p>

      {templates.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">No workflow yet</CardTitle>
            <CardDescription>
              Build a workflow in the SOP Builder first. Once it has steps, you can assign responsibilities here.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <>
          <Card>
            <CardContent className="flex flex-wrap items-center gap-3 py-4">
              <span className="text-sm font-medium">Workflow</span>
              <Select value={templateId ?? ""} onValueChange={setTemplateId}>
                <SelectTrigger className="w-72">
                  <SelectValue placeholder="Select workflow..." />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} (v{t.version}){t.is_active ? " · active" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {locked && (
                <Badge variant="outline" className="gap-1">
                  <Info className="h-3 w-3" /> Locked version — create a new version to edit
                </Badge>
              )}
            </CardContent>
          </Card>

          {roles.length === 0 && (
            <Card>
              <CardContent className="py-4 text-sm text-muted-foreground">
                You have no roles defined yet. Add roles in Admin → Roles to assign responsibilities.
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Company defaults</CardTitle>
              <CardDescription>
                Set the roles and time limit your business uses when a step has no owner of its own. Apply them to any
                workflow with one click.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Default primary role</span>
                  <Select
                    value={defaults.primary_role_id ?? NONE_VALUE}
                    onValueChange={(v) =>
                      setDefaults((d) => ({ ...d, primary_role_id: v === NONE_VALUE ? null : v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Unassigned" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE_VALUE}>Unassigned</SelectItem>
                      {roles.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Default secondary role</span>
                  <Select
                    value={defaults.secondary_role_id ?? NONE_VALUE}
                    onValueChange={(v) =>
                      setDefaults((d) => ({ ...d, secondary_role_id: v === NONE_VALUE ? null : v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE_VALUE}>None</SelectItem>
                      {roles.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Default SLA (hrs)</span>
                  <Input
                    type="number"
                    min={1}
                    value={defaults.sla_hours}
                    onChange={(e) => setDefaults((d) => ({ ...d, sla_hours: Number(e.target.value) || 0 }))}
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={handleSaveDefaults} disabled={savingDefaults}>
                  {savingDefaults ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save defaults
                </Button>
                <Button variant="outline" onClick={() => applyDefaults("unassigned")} disabled={locked || !stages.length}>
                  Apply to unassigned steps
                </Button>
                <Button variant="outline" onClick={() => applyDefaults("all")} disabled={locked || !stages.length}>
                  Apply to every step
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Applying updates the table below — press “Save All” to commit the changes to this workflow.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-3 text-left font-medium w-8">#</th>
                      <th className="px-4 py-3 text-left font-medium">Step</th>
                      <th className="px-4 py-3 text-left font-medium">Primary Role</th>
                      <th className="px-4 py-3 text-left font-medium">Secondary Role</th>
                      <th className="px-4 py-3 text-left font-medium">SLA (hrs)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stages.map((s, idx) => (
                      <tr key={s.id} className="border-b last:border-0">
                        <td className="px-4 py-3 text-muted-foreground">{idx + 1}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{s.name}</span>
                            {s.requires_approval && (
                              <Badge variant="outline" className="text-xs">
                                Approval
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Select
                            value={s.primary_role_id ?? NONE_VALUE}
                            disabled={locked}
                            onValueChange={(v) => update(s.id, { primary_role_id: v === NONE_VALUE ? null : v })}
                          >
                            <SelectTrigger className="w-48">
                              <SelectValue placeholder="Unassigned" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={NONE_VALUE}>Unassigned</SelectItem>
                              {roles.map((r) => (
                                <SelectItem key={r.id} value={r.id}>
                                  {r.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-4 py-3">
                          <Select
                            value={s.secondary_role_id ?? NONE_VALUE}
                            disabled={locked}
                            onValueChange={(v) => update(s.id, { secondary_role_id: v === NONE_VALUE ? null : v })}
                          >
                            <SelectTrigger className="w-48">
                              <SelectValue placeholder="None" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={NONE_VALUE}>None</SelectItem>
                              {roles.map((r) => (
                                <SelectItem key={r.id} value={r.id}>
                                  {r.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-4 py-3">
                          <Input
                            type="number"
                            min={1}
                            className="w-24"
                            disabled={locked}
                            value={s.sla_hours ?? 24}
                            onChange={(e) => update(s.id, { sla_hours: Number(e.target.value) || 0 })}
                          />
                        </td>
                      </tr>
                    ))}
                    {stages.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                          This workflow has no steps yet. Add steps in the SOP Builder.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
