import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import BackButton from "@/components/layout/BackButton";
import { loadActiveStages, startOfWeek, sameDay, type OpsStage } from "@/lib/operations";
import { ChevronLeft, ChevronRight, Loader2, CalendarDays } from "lucide-react";

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function OperationsSchedule() {
  const [stages, setStages] = useState<OpsStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [anchor, setAnchor] = useState(() => startOfWeek(new Date()));

  useEffect(() => {
    (async () => {
      setStages(await loadActiveStages());
      setLoading(false);
    })();
  }, []);

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => new Date(anchor.getTime() + i * 86400000)),
    [anchor],
  );

  const scheduled = stages.filter((s) => s.dueAt);
  const unscheduled = stages.filter((s) => !s.dueAt);
  const now = new Date();

  const overdue = scheduled.filter((s) => s.dueAt! < now);
  const weekEnd = new Date(anchor.getTime() + 7 * 86400000);
  const thisWeek = scheduled.filter((s) => s.dueAt! >= anchor && s.dueAt! < weekEnd);
  const busiest = days
    .map((d) => ({ d, n: scheduled.filter((s) => sameDay(s.dueAt!, d)).length }))
    .sort((a, b) => b.n - a.n)[0];

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <BackButton />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold">Capacity & scheduling</h1>
          <p className="text-sm text-muted-foreground">
            Every active workflow step plotted on its SLA due date.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setAnchor(new Date(anchor.getTime() - 7 * 86400000))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setAnchor(startOfWeek(new Date()))}>
            This week
          </Button>
          <Button variant="outline" size="icon" onClick={() => setAnchor(new Date(anchor.getTime() + 7 * 86400000))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Active steps", value: String(stages.length) },
          { label: "Due this week", value: String(thisWeek.length) },
          { label: "Overdue", value: String(overdue.length) },
          { label: "Busiest day", value: busiest && busiest.n ? `${DAY_NAMES[(busiest.d.getDay() + 6) % 7]} · ${busiest.n}` : "—" },
        ].map((k) => (
          <Card key={k.label}>
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{k.label}</p>
              <p className="mt-1 font-heading text-2xl font-bold">{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
        {days.map((day) => {
          const items = scheduled.filter((s) => sameDay(s.dueAt!, day));
          const isToday = sameDay(day, now);
          return (
            <Card key={day.toISOString()} className={isToday ? "border-accent" : undefined}>
              <CardHeader className="p-3 pb-2">
                <CardTitle className="flex items-center justify-between text-sm font-semibold">
                  <span>
                    {DAY_NAMES[(day.getDay() + 6) % 7]} {day.getDate()}/{day.getMonth() + 1}
                  </span>
                  <Badge variant={items.length ? "default" : "outline"}>{items.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 p-3 pt-0">
                {items.length === 0 && <p className="text-xs text-muted-foreground">No steps due</p>}
                {items.map((s) => (
                  <Link
                    key={s.id}
                    to={`/jobs/${s.job_id}`}
                    className="block rounded border p-2 text-xs transition-colors hover:bg-muted"
                  >
                    <p className="font-medium">{s.label}</p>
                    <p className="text-muted-foreground">
                      {s.job_number} · {s.client_name}
                    </p>
                    {s.dueAt! < now && (
                      <Badge variant="destructive" className="mt-1">
                        Overdue
                      </Badge>
                    )}
                  </Link>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-heading text-lg">
            <CalendarDays className="h-4 w-4" /> Unscheduled steps ({unscheduled.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {unscheduled.length === 0 && (
            <p className="text-sm text-muted-foreground">Every active step has an SLA deadline.</p>
          )}
          {unscheduled.map((s) => (
            <Link
              key={s.id}
              to={`/jobs/${s.job_id}`}
              className="flex items-center justify-between rounded border p-3 text-sm hover:bg-muted"
            >
              <span>
                <span className="font-medium">{s.label}</span>
                <span className="text-muted-foreground"> · {s.job_number} · {s.client_name}</span>
              </span>
              <Badge variant="outline">No SLA set</Badge>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
