import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import BackButton from "@/components/layout/BackButton";
import { loadActiveStages, type OpsStage } from "@/lib/operations";
import { CalendarDays, ClipboardCheck, Loader2, Users, Workflow } from "lucide-react";

const TOOLS = [
  { to: "/operations/schedule", label: "Capacity & scheduling", description: "Week calendar of every step due", icon: CalendarDays },
  { to: "/operations/allocation", label: "Resource & team allocation", description: "Workload per person, reassign steps", icon: Users },
  { to: "/operations/qc", label: "QC & handover packs", description: "Quality sign-off and printable pack", icon: ClipboardCheck },
  { to: "/jobs", label: "Job pipeline", description: "All active and completed jobs", icon: Workflow },
];

export default function Operations() {
  const [stages, setStages] = useState<OpsStage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setStages(await loadActiveStages());
      setLoading(false);
    })();
  }, []);

  const now = new Date();
  const overdue = stages.filter((s) => s.dueAt && s.dueAt < now).length;
  const approvals = stages.filter((s) => s.status === "pending_approval").length;
  const unassigned = stages.filter((s) => !s.primary_owner_id).length;

  return (
    <div className="space-y-6">
      <BackButton />
      <div>
        <h1 className="font-heading text-2xl font-bold">Operations</h1>
        <p className="text-sm text-muted-foreground">
          Delivery execution — scheduling, allocation, quality and handover.
        </p>
      </div>

      {loading ? (
        <div className="flex h-24 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Live steps", value: stages.length },
            { label: "Awaiting approval", value: approvals },
            { label: "Overdue", value: overdue },
            { label: "Unassigned", value: unassigned },
          ].map((k) => (
            <Card key={k.label}>
              <CardContent className="p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{k.label}</p>
                <p className="mt-1 font-heading text-2xl font-bold">{k.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-lg">Operations tools</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {TOOLS.map((t) => (
            <div key={t.to} className="flex items-center justify-between gap-3 rounded border p-3">
              <div className="flex items-start gap-3">
                <t.icon className="mt-1 h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">{t.label}</p>
                  <p className="text-xs text-muted-foreground">{t.description}</p>
                </div>
              </div>
              <Button asChild size="sm" variant="outline">
                <Link to={t.to}>Open</Link>
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-lg">Attention now</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {stages
            .filter((s) => s.status === "pending_approval" || (s.dueAt && s.dueAt < now))
            .slice(0, 8)
            .map((s) => (
              <Link
                key={s.id}
                to={`/jobs/${s.job_id}`}
                className="flex items-center justify-between rounded border p-3 text-sm hover:bg-muted"
              >
                <span>
                  <span className="font-medium">{s.label}</span>
                  <span className="text-muted-foreground"> · {s.job_number} · {s.client_name}</span>
                </span>
                <Badge variant={s.dueAt && s.dueAt < now ? "destructive" : "outline"}>
                  {s.dueAt && s.dueAt < now ? "Overdue" : "Approval"}
                </Badge>
              </Link>
            ))}
          {!loading && stages.every((s) => s.status !== "pending_approval" && !(s.dueAt && s.dueAt < now)) && (
            <p className="text-sm text-muted-foreground">Nothing overdue or waiting on an approval.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
