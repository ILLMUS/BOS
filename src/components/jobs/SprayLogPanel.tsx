import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Loader2, Droplets } from "lucide-react";
import { toast } from "sonner";

interface Spray {
  id: string;
  chemical_used: string;
  quantity_l: number;
  area_covered_ha: number;
  applied_at: string;
  notes: string | null;
}

export default function SprayLogPanel({ jobId }: { jobId: string }) {
  const { user } = useAuth();
  const [items, setItems] = useState<Spray[]>([]);
  const [loading, setLoading] = useState(true);
  const [show, setShow] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ chemical_used: "", quantity_l: "", area_covered_ha: "", notes: "" });

  const fetchItems = useCallback(async () => {
    const { data } = await supabase.from("spray_logs")
      .select("*").eq("job_id", jobId).order("applied_at", { ascending: false });
    setItems((data || []) as Spray[]);
    setLoading(false);
  }, [jobId]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleAdd = async () => {
    if (!user) return;
    if (!form.chemical_used.trim() || !form.quantity_l || !form.area_covered_ha) {
      toast.error("Chemical, quantity and area are required"); return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("spray_logs").insert({
      job_id: jobId, pilot_id: user.id,
      chemical_used: form.chemical_used.trim(),
      quantity_l: Number(form.quantity_l),
      area_covered_ha: Number(form.area_covered_ha),
      applied_at: new Date().toISOString(),
      notes: form.notes || null,
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Spray entry logged");
    setForm({ chemical_used: "", quantity_l: "", area_covered_ha: "", notes: "" });
    setShow(false);
    fetchItems();
  };

  const totalQty = items.reduce((s, i) => s + Number(i.quantity_l || 0), 0);
  const totalArea = items.reduce((s, i) => s + Number(i.area_covered_ha || 0), 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="font-heading text-lg flex items-center gap-2">
            <Droplets className="h-4 w-4" /> Spray Log
          </CardTitle>
          <Button size="sm" variant="outline" onClick={() => setShow(!show)}>
            <Plus className="mr-1 h-4 w-4" /> Log Spray
          </Button>
        </div>
        {items.length > 0 && (
          <p className="text-xs text-muted-foreground">Total: {totalQty.toFixed(1)} L over {totalArea.toFixed(2)} ha</p>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {show && (
          <div className="space-y-2 rounded border border-border p-3">
            <Label>Chemical used *</Label>
            <Input value={form.chemical_used} onChange={(e) => setForm({ ...form, chemical_used: e.target.value })} maxLength={120} />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Quantity (L) *</Label>
                <Input type="number" step="0.01" value={form.quantity_l} onChange={(e) => setForm({ ...form, quantity_l: e.target.value })} />
              </div>
              <div>
                <Label>Area (ha) *</Label>
                <Input type="number" step="0.01" value={form.area_covered_ha} onChange={(e) => setForm({ ...form, area_covered_ha: e.target.value })} />
              </div>
            </div>
            <Label>Notes</Label>
            <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            <Button size="sm" onClick={handleAdd} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save
            </Button>
          </div>
        )}
        {loading ? <p className="text-sm text-muted-foreground">Loading…</p>
         : items.length === 0 ? <p className="text-sm text-muted-foreground">No spray entries yet.</p>
         : items.map((s) => (
          <div key={s.id} className="rounded border border-border p-3 text-sm">
            <p className="font-medium">{s.chemical_used}</p>
            <p className="text-xs text-muted-foreground">{s.quantity_l} L • {s.area_covered_ha} ha • {new Date(s.applied_at).toLocaleString()}</p>
            {s.notes && <p className="text-xs mt-1">{s.notes}</p>}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}