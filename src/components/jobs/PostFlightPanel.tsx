import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Plus, Loader2, ClipboardCheck } from "lucide-react";
import { toast } from "sonner";

interface PFL {
  id: string;
  equipment_cleaned: boolean;
  inspection_passed: boolean;
  data_submitted: boolean;
  inspection_notes: string | null;
  created_at: string;
}

export default function PostFlightPanel({ jobId }: { jobId: string }) {
  const { user } = useAuth();
  const [items, setItems] = useState<PFL[]>([]);
  const [loading, setLoading] = useState(true);
  const [show, setShow] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    equipment_cleaned: false, inspection_passed: false, data_submitted: false, inspection_notes: "",
  });

  const fetchItems = useCallback(async () => {
    const { data } = await supabase.from("post_flight_logs")
      .select("*").eq("job_id", jobId).order("created_at", { ascending: false });
    setItems((data || []) as PFL[]);
    setLoading(false);
  }, [jobId]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleAdd = async () => {
    if (!user) return;
    setSubmitting(true);
    const { error } = await supabase.from("post_flight_logs").insert({
      job_id: jobId, completed_by: user.id,
      equipment_cleaned: form.equipment_cleaned,
      inspection_passed: form.inspection_passed,
      data_submitted: form.data_submitted,
      inspection_notes: form.inspection_notes || null,
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Post-flight log saved");
    setForm({ equipment_cleaned: false, inspection_passed: false, data_submitted: false, inspection_notes: "" });
    setShow(false);
    fetchItems();
  };

  const isComplete = (p: PFL) => p.equipment_cleaned && p.inspection_passed && p.data_submitted;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="font-heading text-lg flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4" /> Post-Flight Log
          </CardTitle>
          <Button size="sm" variant="outline" onClick={() => setShow(!show)}>
            <Plus className="mr-1 h-4 w-4" /> Log
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {show && (
          <div className="space-y-2 rounded border border-border p-3">
            {[
              ["equipment_cleaned", "Equipment cleaned & stored"],
              ["inspection_passed", "Inspection passed (no damage)"],
              ["data_submitted", "Flight & spray data submitted"],
            ].map(([k, label]) => (
              <div key={k} className="flex items-center gap-2">
                <Checkbox checked={(form as any)[k]} onCheckedChange={(v) => setForm({ ...form, [k]: !!v })} />
                <Label>{label}</Label>
              </div>
            ))}
            <Label>Inspection notes</Label>
            <Textarea rows={2} value={form.inspection_notes} onChange={(e) => setForm({ ...form, inspection_notes: e.target.value })} />
            <Button size="sm" onClick={handleAdd} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save
            </Button>
          </div>
        )}
        {loading ? <p className="text-sm text-muted-foreground">Loading…</p>
         : items.length === 0 ? <p className="text-sm text-muted-foreground">No post-flight logs.</p>
         : items.map((p) => (
          <div key={p.id} className="rounded border border-border p-3 text-sm">
            <div className="flex items-start justify-between">
              <div>
                <p>Cleaned: {p.equipment_cleaned ? "✓" : "✗"} • Inspected: {p.inspection_passed ? "✓" : "✗"} • Data: {p.data_submitted ? "✓" : "✗"}</p>
                <p className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleString()}</p>
                {p.inspection_notes && <p className="text-xs mt-1">{p.inspection_notes}</p>}
              </div>
              <Badge variant="outline" className={isComplete(p) ? "border-success text-success" : "border-accent text-accent"}>
                {isComplete(p) ? "COMPLETE" : "PARTIAL"}
              </Badge>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}