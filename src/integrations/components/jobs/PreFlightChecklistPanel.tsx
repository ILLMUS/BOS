import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Plus, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

interface PFC {
  id: string;
  drone_ok: boolean;
  battery_pct: number | null;
  spray_system_ok: boolean;
  calibration_ok: boolean;
  weather_ok: boolean;
  weather_notes: string | null;
  manager_approved_by: string | null;
  manager_approved_at: string | null;
  notes: string | null;
  created_at: string;
}

export default function PreFlightChecklistPanel({ jobId }: { jobId: string }) {
  const { user, isAdmin } = useAuth();
  const [items, setItems] = useState<PFC[]>([]);
  const [loading, setLoading] = useState(true);
  const [show, setShow] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    drone_ok: false, battery_pct: "100", spray_system_ok: false,
    calibration_ok: false, weather_ok: false, weather_notes: "", notes: "",
  });

  const fetchItems = useCallback(async () => {
    const { data } = await supabase.from("pre_flight_checks")
      .select("*").eq("job_id", jobId).order("created_at", { ascending: false });
    setItems((data || []) as PFC[]);
    setLoading(false);
  }, [jobId]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleAdd = async () => {
    if (!user) return;
    setSubmitting(true);
    const { error } = await supabase.from("pre_flight_checks").insert({
      job_id: jobId, performed_by: user.id,
      drone_ok: form.drone_ok, spray_system_ok: form.spray_system_ok,
      calibration_ok: form.calibration_ok, weather_ok: form.weather_ok,
      battery_pct: parseInt(form.battery_pct) || null,
      weather_notes: form.weather_notes || null, notes: form.notes || null,
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Pre-flight check logged");
    setShow(false);
    setForm({ drone_ok: false, battery_pct: "100", spray_system_ok: false, calibration_ok: false, weather_ok: false, weather_notes: "", notes: "" });
    fetchItems();
  };

  const approveByManager = async (id: string) => {
    if (!user) return;
    const { error } = await supabase.from("pre_flight_checks")
      .update({ manager_approved_by: user.id, manager_approved_at: new Date().toISOString() })
      .eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Manager approval recorded");
    fetchItems();
  };

  const allOk = (c: PFC) => c.drone_ok && c.calibration_ok && c.weather_ok && c.manager_approved_at;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="font-heading text-lg">Pre-Flight Checks</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setShow(!show)}>
            <Plus className="mr-1 h-4 w-4" /> Log Check
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">⚠ Flight cannot start until a check is fully passed and manager-approved.</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {show && (
          <div className="space-y-3 rounded border border-border p-3">
            {[
              ["drone_ok", "Drone condition OK"],
              ["spray_system_ok", "Spray system OK (spray jobs)"],
              ["calibration_ok", "Calibration complete"],
              ["weather_ok", "Weather acceptable"],
            ].map(([key, label]) => (
              <div key={key} className="flex items-center gap-2">
                <Checkbox checked={(form as any)[key]} onCheckedChange={(v) => setForm({ ...form, [key]: !!v })} />
                <Label>{label}</Label>
              </div>
            ))}
            <div>
              <Label>Battery %</Label>
              <Input type="number" value={form.battery_pct} onChange={(e) => setForm({ ...form, battery_pct: e.target.value })} />
            </div>
            <div>
              <Label>Weather notes</Label>
              <Input value={form.weather_notes} onChange={(e) => setForm({ ...form, weather_notes: e.target.value })} />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
            </div>
            <Button size="sm" onClick={handleAdd} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Check
            </Button>
          </div>
        )}
        {loading ? <p className="text-sm text-muted-foreground">Loading…</p>
         : items.length === 0 ? <p className="text-sm text-muted-foreground">No pre-flight checks logged.</p>
         : items.map((c) => (
          <div key={c.id} className="rounded border border-border p-3 text-sm">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p>Drone: {c.drone_ok ? "✓" : "✗"} • Spray: {c.spray_system_ok ? "✓" : "✗"} • Calibration: {c.calibration_ok ? "✓" : "✗"} • Weather: {c.weather_ok ? "✓" : "✗"}</p>
                <p className="text-xs text-muted-foreground">Battery {c.battery_pct ?? "—"}% • {new Date(c.created_at).toLocaleString()}</p>
                {c.notes && <p className="text-xs">{c.notes}</p>}
              </div>
              <Badge variant="outline" className={allOk(c) ? "border-success text-success" : "border-accent text-accent"}>
                {allOk(c) ? "PASSED" : "PENDING"}
              </Badge>
            </div>
            {!c.manager_approved_at && isAdmin && (
              <Button size="sm" variant="outline" className="mt-2 border-success text-success" onClick={() => approveByManager(c.id)}>
                <ShieldCheck className="mr-1 h-3 w-3" /> Manager Approve
              </Button>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}