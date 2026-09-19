import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plane, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Flight {
  id: string;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number | null;
  battery_start: number | null;
  battery_end: number | null;
  notes: string | null;
}

export default function FlightLogPanel({ jobId }: { jobId: string }) {
  const { user } = useAuth();
  const [items, setItems] = useState<Flight[]>([]);
  const [loading, setLoading] = useState(true);
  const [show, setShow] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    started_at: "", ended_at: "", duration_minutes: "",
    battery_start: "", battery_end: "", notes: "",
  });

  const fetchItems = useCallback(async () => {
    const { data } = await supabase.from("flight_logs")
      .select("*").eq("job_id", jobId).order("started_at", { ascending: false });
    setItems((data || []) as Flight[]);
    setLoading(false);
  }, [jobId]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleAdd = async () => {
    if (!user || !form.started_at) { toast.error("Start time required"); return; }
    setSubmitting(true);
    const { error } = await supabase.from("flight_logs").insert({
      job_id: jobId, pilot_id: user.id,
      started_at: new Date(form.started_at).toISOString(),
      ended_at: form.ended_at ? new Date(form.ended_at).toISOString() : null,
      duration_minutes: form.duration_minutes ? parseInt(form.duration_minutes) : null,
      battery_start: form.battery_start ? parseInt(form.battery_start) : null,
      battery_end: form.battery_end ? parseInt(form.battery_end) : null,
      notes: form.notes || null,
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Flight logged");
    setForm({ started_at: "", ended_at: "", duration_minutes: "", battery_start: "", battery_end: "", notes: "" });
    setShow(false);
    fetchItems();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="font-heading text-lg flex items-center gap-2">
            <Plane className="h-4 w-4" /> Flight Log
          </CardTitle>
          <Button size="sm" variant="outline" onClick={() => setShow(!show)}>
            <Plus className="mr-1 h-4 w-4" /> Log Flight
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {show && (
          <div className="space-y-2 rounded border border-border p-3">
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Started *</Label><Input type="datetime-local" value={form.started_at} onChange={(e) => setForm({ ...form, started_at: e.target.value })} /></div>
              <div><Label>Ended</Label><Input type="datetime-local" value={form.ended_at} onChange={(e) => setForm({ ...form, ended_at: e.target.value })} /></div>
              <div><Label>Duration (min)</Label><Input type="number" value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })} /></div>
              <div><Label>Battery start %</Label><Input type="number" value={form.battery_start} onChange={(e) => setForm({ ...form, battery_start: e.target.value })} /></div>
              <div><Label>Battery end %</Label><Input type="number" value={form.battery_end} onChange={(e) => setForm({ ...form, battery_end: e.target.value })} /></div>
            </div>
            <Label>Notes</Label>
            <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            <Button size="sm" onClick={handleAdd} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save
            </Button>
          </div>
        )}
        {loading ? <p className="text-sm text-muted-foreground">Loading…</p>
         : items.length === 0 ? <p className="text-sm text-muted-foreground">No flights logged.</p>
         : items.map((f) => (
          <div key={f.id} className="rounded border border-border p-3 text-sm">
            <p className="font-medium">{new Date(f.started_at).toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">
              {f.duration_minutes ? `${f.duration_minutes} min` : "—"} •
              {f.battery_start ?? "—"}% → {f.battery_end ?? "—"}%
            </p>
            {f.notes && <p className="text-xs mt-1">{f.notes}</p>}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}