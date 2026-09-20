import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save, Clock, Layers } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

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
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-teal-400" />
      </div>
    );
  }

  return (
    <Card className="relative w-full min-w-0 overflow-hidden border-white/[0.08] bg-[#05131a]/80 text-white shadow-xl backdrop-blur-md">
      <CardHeader className="border-b border-white/[0.06] p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 min-w-0">
          <CardTitle className="flex items-center gap-2.5 text-base font-bold tracking-tight text-white sm:text-lg min-w-0">
            <motion.div
              whileHover={{ rotate: 15, scale: 1.1 }}
              transition={{ type: "spring", stiffness: 300, damping: 15 }}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-teal-400/20 bg-teal-500/10 text-teal-400"
            >
              <Clock className="h-4 w-4" />
            </motion.div>
            <span className="truncate">Step deadlines (SLA)</span>
          </CardTitle>

          <div className="flex flex-wrap items-center gap-2 min-w-0">
            {templates.length > 1 && (
              <Select value={templateId ?? undefined} onValueChange={setTemplateId}>
                <SelectTrigger className="h-8 w-[200px] border-white/10 bg-[#02080b]/80 text-xs text-white focus:ring-teal-400/50">
                  <SelectValue placeholder="Select workflow" />
                </SelectTrigger>
                <SelectContent className="border-white/10 bg-[#05131a] text-xs text-white">
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id} className="focus:bg-white/10 focus:text-white">
                      {t.name} (v{t.version}){t.is_active ? " · active" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                onClick={handleSave}
                disabled={saving || !dirty || !stages.length}
                size="sm"
                className="h-8 bg-teal-500 text-xs font-semibold text-slate-950 hover:bg-teal-400 disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="mr-1.5 h-3.5 w-3.5" />
                )}
                Save deadlines
              </Button>
            </motion.div>
          </div>
        </div>

        <p className="break-words text-xs text-slate-400 mt-1">
          Set how long each step of your own workflow may take before it is flagged as overdue. New work picks
          these up automatically.
        </p>
      </CardHeader>

      <CardContent className="p-4 text-xs sm:p-6 sm:text-sm min-w-0">
        {!templates.length ? (
          <div className="rounded-xl border border-white/[0.08] bg-[#02080b]/60 p-6 text-center text-xs text-slate-400">
            <Layers className="mx-auto h-8 w-8 text-slate-600 mb-2" />
            No workflow yet. Build one in the SOP builder and its steps will appear here.
          </div>
        ) : !stages.length ? (
          <div className="rounded-xl border border-white/[0.08] bg-[#02080b]/60 p-6 text-center text-xs text-slate-400">
            This workflow has no steps yet.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 min-w-0">
            {stages.map((s, i) => (
              <div
                key={s.id}
                className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-[#02080b]/60 p-3 min-w-0 transition-colors hover:border-white/20"
              >
                <div className="min-w-0 flex-1">
                  <Label className="block truncate text-xs font-semibold text-slate-200">
                    {i + 1}. {s.name}
                  </Label>
                  <span className="text-[11px] font-mono text-teal-400">{formatHours(s.sla_hours)}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Input
                    type="number"
                    min={1}
                    max={720}
                    value={s.sla_hours}
                    onChange={(e) => handleChange(s.id, Math.max(1, parseInt(e.target.value) || 1))}
                    className="h-8 w-16 border-white/[0.1] bg-[#030d12]/80 font-mono text-xs text-center text-white focus:border-teal-400/50 p-1"
                  />
                  <span className="whitespace-nowrap text-[11px] text-slate-400">hrs</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}