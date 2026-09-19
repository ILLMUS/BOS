import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Pencil, Check, X } from "lucide-react";
import { toast } from "sonner";

interface SlaDeadlineEditorProps {
  stageId: string;
  currentHours: number | null;
  onUpdated: (newHours: number) => void;
}

export default function SlaDeadlineEditor({ stageId, currentHours, onUpdated }: SlaDeadlineEditorProps) {
  const [editing, setEditing] = useState(false);
  const [hours, setHours] = useState(currentHours ?? 48);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("job_stages")
        .update({ sla_deadline_hours: hours })
        .eq("id", stageId);
      if (error) throw error;
      onUpdated(hours);
      setEditing(false);
      toast.success("SLA deadline updated for this stage");
    } catch (err: any) {
      toast.error(err.message || "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="h-6 gap-1 text-xs text-muted-foreground hover:text-foreground"
        onClick={() => { setHours(currentHours ?? 48); setEditing(true); }}
      >
        <Pencil className="h-3 w-3" />
        Edit SLA
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <Input
        type="number"
        min={1}
        max={720}
        value={hours}
        onChange={(e) => setHours(Math.max(1, parseInt(e.target.value) || 1))}
        className="h-7 w-16 text-xs text-right"
        autoFocus
      />
      <span className="text-xs text-muted-foreground">hrs</span>
      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleSave} disabled={saving}>
        <Check className="h-3 w-3 text-success" />
      </Button>
      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditing(false)}>
        <X className="h-3 w-3 text-destructive" />
      </Button>
    </div>
  );
}
