import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import BackButton from "@/components/layout/BackButton";
import { toast } from "sonner";
import { loadActiveStages, loadTeam, type OpsStage, type TeamMember } from "@/lib/operations";
import { Loader2, Users } from "lucide-react";

const UNASSIGNED = "unassigned";

export default function OperationsAllocation() {
  const { orgId } = useAuth();
  const [stages, setStages] = useState<OpsStage[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [s, t] = await Promise.all([loadActiveStages(), orgId ? loadTeam(orgId) : Promise.resolve([])]);
      setStages(s);
      setTeam(t);
      setLoading(false);
    })();
  }, [orgId]);

  const columns = useMemo(() => {
    const cols: { id: string; name: string; items: OpsStage[] }[] = team.map((m) => ({
      id: m.id,
      name: m.full_name || m.email,
      items: stages.filter((s) => s.primary_owner_id === m.id),
    }));
    const known = new Set(team.map((m) => m.id));
    cols.unshift({
      id: UNASSIGNED,
      name: "Unassigned",
      items: stages.filter((s) => !s.primary_owner_id || !known.has(s.primary_owner_id)),
    });
    return cols;
  }, [stages, team]);

  const reassign = async (stage: OpsStage, ownerId: string) => {
    const next = ownerId === UNASSIGNED ? null : ownerId;
    setSaving(stage.id);
    const { error } = await supabase.from("job_stages").update({ primary_owner_id: next }).eq("id", stage.id);
    setSaving(null);
    if (error) {
      toast.error("Could not reassign this step");
      return;
    }
    setStages((prev) => prev.map((s) => (s.id === stage.id ? { ...s, primary_owner_id: next } : s)));
    toast.success("Step reassigned");
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const busiest = Math.max(1, ...columns.filter((c) => c.id !== UNASSIGNED).map((c) => c.items.length));

  return (
    <div className="space-y-6">
      <BackButton />
      <div>
        <h1 className="font-heading text-2xl font-bold">Resource & team allocation</h1>
        <p className="text-sm text-muted-foreground">
          Who currently owns each live workflow step. Reassign from the card.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Live steps</p>
            <p className="mt-1 font-heading text-2xl font-bold">{stages.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Team members</p>
            <p className="mt-1 font-heading text-2xl font-bold">{team.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Unassigned</p>
            <p className="mt-1 font-heading text-2xl font-bold">
              {columns.find((c) => c.id === UNASSIGNED)?.items.length ?? 0}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {columns.map((col) => (
          <Card key={col.id} className={col.id === UNASSIGNED ? "border-dashed" : undefined}>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="flex items-center justify-between text-sm font-semibold">
                <span className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  {col.name}
                </span>
                <Badge variant={col.items.length > busiest * 0.75 && col.id !== UNASSIGNED ? "destructive" : "outline"}>
                  {col.items.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 p-4 pt-0">
              {col.items.length === 0 && <p className="text-xs text-muted-foreground">No live steps</p>}
              {col.items.map((s) => (
                <div key={s.id} className="rounded border p-3 text-xs">
                  <Link to={`/jobs/${s.job_id}`} className="font-medium hover:underline">
                    {s.label}
                  </Link>
                  <p className="text-muted-foreground">
                    {s.job_number} · {s.client_name}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge variant="outline" className="capitalize">
                      {s.status.replace("_", " ")}
                    </Badge>
                    {s.dueAt && s.dueAt < new Date() && <Badge variant="destructive">Overdue</Badge>}
                  </div>
                  <Select
                    value={s.primary_owner_id || UNASSIGNED}
                    onValueChange={(v) => reassign(s, v)}
                    disabled={saving === s.id}
                  >
                    <SelectTrigger className="mt-2 h-8 text-xs">
                      <SelectValue placeholder="Assign to" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                      {team.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.full_name || m.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
