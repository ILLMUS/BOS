import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save, Clock } from "lucide-react";
import { toast } from "sonner";

interface TemplateRow {
  id: string;
  name: string;
  is_active: boolean;
  version: number;
}

interface StageRow {
  id: string;
  name: string;
  position: number;
  sla_hours: number;
}

/** Per-workflow SLA deadlines, driven by whatever steps the org built — no fixed industry stages. */
export default function SlaDefaultsEditor() {
  const { orgId } = useAuth();
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [stages, setStages] = useState<StageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!orgId) return;
    (async () => {
      const { data } = await supabase
        .from("sop_templates")
        .select("id, name, is_active, version")
        .eq("org_id", orgId)
        .order("created_at");
      const list = (data || []) as TemplateRow[];
      setTemplates(list);
      setTemplateId(list.find((t) => t.is_active)?.id ?? list[0]?.id ?? null);
      setLoading(false);
    })();
  }, [orgId]);

  useEffect(() => {
    if (!templateId) return;
    (async () => {
      const { data } = await supabase
        .from("sop_stages")
        .select("id, name, position, sla_hours")
        .eq("template_id", templateId)
        .order("position");
      setStages((data || []) as StageRow[]);
      setDirty(false);
    })();
  }, [templateId]);

  const handleChange = (id: string, hours: number) => {
    setStages((prev) => prev.map((s) => (s.id === id ? { ...s, sla_hours: hours } : s)));
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const s of stages) {
        const { error } = await supabase.from("sop_stages").update({ sla_hours: s.sla_hours }).eq("id", s.id);
        if (error) throw error;
      }
      setDirty(false);
      toast.success("Deadlines updated");
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const formatHours = (h: number) => {
    if (h >= 24) {
      const days = Math.floor(h / 24);
      const rem = h % 24;
      return rem > 0 ? `${days}d ${rem}h` : `${days}d`;
    }
    return `${h}h`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 font-heading text-lg">
            <Clock className="h-5 w-5 text-accent" />
            Step deadlines (SLA)
          </CardTitle>
          <div className="flex items-center gap-2">
            {templates.length > 1 && (
              <Select value={templateId ?? undefined} onValueChange={setTemplateId}>
                <SelectTrigger className="h-9 w-[220px]">
                  <SelectValue placeholder="Select workflow" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} (v{t.version}){t.is_active ? " · active" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button onClick={handleSave} disabled={saving || !dirty || !stages.length} size="sm">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save deadlines
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Set how long each step of your own workflow may take before it is flagged as overdue. New work picks
          these up automatically.
        </p>
      </CardHeader>
      <CardContent>
        {!templates.length ? (
          <p className="text-sm text-muted-foreground">
            No workflow yet. Build one in the SOP builder and its steps will appear here.
          </p>
        ) : !stages.length ? (
          <p className="text-sm text-muted-foreground">This workflow has no steps yet.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {stages.map((s, i) => (
              <div key={s.id} className="flex items-center gap-3 rounded-md border border-border p-3">
                <div className="min-w-0 flex-1">
                  <Label className="block truncate text-xs font-medium">
                    {i + 1}. {s.name}
                  </Label>
                  <span className="text-xs text-muted-foreground">{formatHours(s.sla_hours)}</span>
                </div>
                <Input
                  type="number"
                  min={1}
                  max={720}
                  value={s.sla_hours}
                  onChange={(e) => handleChange(s.id, Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-20 text-right"
                />
                <span className="whitespace-nowrap text-xs text-muted-foreground">hrs</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
