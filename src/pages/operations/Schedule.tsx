import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import BackButton from "@/components/layout/BackButton";
import { loadActiveStages, startOfWeek, sameDay, type OpsStage } from "@/lib/operations";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  CalendarDays,
  Clock,
  AlertTriangle,
  Zap,
  Activity,
  CheckCircle2,
  Calendar,
} from "lucide-react";

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
      <div className="flex h-64 items-center justify-center rounded-2xl border border-white/[0.08] bg-[#0c1017]/80 backdrop-blur-md">
        <div className="flex items-center gap-2.5 text-xs font-semibold uppercase tracking-widest text-cyan-400">
          <Loader2 className="h-5 w-5 animate-spin" />
          Synchronizing SLA Calendar...
        </div>
      </div>
    );
  }

  return (
    <div className="relative space-y-6">
      {/* BACKGROUND AMBIENT GLOWS */}
      <div className="pointer-events-none absolute -left-20 -top-10 h-72 w-72 rounded-full bg-cyan-500/10 blur-[120px]" />
      <div className="pointer-events-none absolute right-0 top-1/3 h-80 w-80 rounded-full bg-indigo-500/10 blur-[140px]" />

      <BackButton />

      {/* HEADER SECTION */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-heading text-2xl font-black tracking-tight text-white">
              Capacity & scheduling
            </h1>
            <Badge className="border-cyan-500/30 bg-cyan-500/10 text-cyan-300 text-[10px] uppercase font-mono tracking-widest">
              SLA Calendar
            </Badge>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Every active workflow step plotted across your team's target SLA deadlines.
          </p>
        </div>

        {/* NAVIGATION BUTTONS */}
        <div className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-[#0c1017]/80 p-1.5 shadow-lg backdrop-blur-md">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setAnchor(new Date(anchor.getTime() - 7 * 86400000))}
            className="h-8 w-8 text-slate-300 hover:bg-white/[0.06] hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAnchor(startOfWeek(new Date()))}
            className="border-cyan-500/30 bg-cyan-500/10 text-xs font-semibold text-cyan-300 hover:border-cyan-400 hover:bg-cyan-500/20 hover:text-white transition-all"
          >
            Today / This week
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setAnchor(new Date(anchor.getTime() + 7 * 86400000))}
            className="h-8 w-8 text-slate-300 hover:bg-white/[0.06] hover:text-white"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* TOP METRICS GRID */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "Active steps",
            value: String(stages.length),
            accent: "text-cyan-400",
            icon: Activity,
          },
          {
            label: "Due this week",
            value: String(thisWeek.length),
            accent: "text-indigo-400",
            icon: Calendar,
          },
          {
            label: "Overdue",
            value: String(overdue.length),
            accent: overdue.length > 0 ? "text-red-400" : "text-slate-300",
            icon: AlertTriangle,
          },
          {
            label: "Busiest day",
            value: busiest && busiest.n ? `${DAY_NAMES[(busiest.d.getDay() + 6) % 7]} · ${busiest.n}` : "—",
            accent: "text-amber-400",
            icon: Zap,
          },
        ].map((k) => (
          <Card
            key={k.label}
            className="group relative overflow-hidden border-white/[0.08] bg-[#0c1017]/80 shadow-xl backdrop-blur-md transition-all duration-300 hover:border-white/20"
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold tracking-wider uppercase text-slate-400">
                  {k.label}
                </p>
                <k.icon className={`h-4 w-4 ${k.accent} opacity-70 group-hover:opacity-100 transition-opacity`} />
              </div>
              <p className={`mt-2 font-heading text-3xl font-black tracking-tight ${k.accent}`}>
                {k.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 7-DAY CALENDAR GRID */}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
        {days.map((day) => {
          const items = scheduled.filter((s) => sameDay(s.dueAt!, day));
          const isToday = sameDay(day, now);

          return (
            <Card
              key={day.toISOString()}
              className={`relative flex flex-col overflow-hidden border transition-all duration-300 ${
                isToday
                  ? "border-cyan-400/50 bg-cyan-500/[0.05] shadow-[0_0_25px_rgba(34,211,238,0.12)]"
                  : "border-white/[0.08] bg-[#0c1017]/80 hover:border-white/20"
              }`}
            >
              {isToday && (
                <div className="absolute top-0 inset-x-0 h-1 bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]" />
              )}

              <CardHeader className="p-3 pb-2 border-b border-white/[0.04]">
                <CardTitle className="flex items-center justify-between text-xs font-bold">
                  <span className={isToday ? "text-cyan-300 font-extrabold" : "text-slate-200"}>
                    {DAY_NAMES[(day.getDay() + 6) % 7]} {day.getDate()}/{day.getMonth() + 1}
                  </span>
                  <Badge
                    variant={items.length ? "default" : "outline"}
                    className={
                      items.length
                        ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-300 text-[10px]"
                        : "border-white/10 bg-white/[0.03] text-slate-500 text-[10px]"
                    }
                  >
                    {items.length}
                  </Badge>
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-2 p-3 pt-3 flex-1">
                {items.length === 0 && (
                  <p className="text-[11px] font-medium text-slate-600 text-center py-4">
                    No steps due
                  </p>
                )}
                {items.map((s) => {
                  const isLate = s.dueAt! < now;
                  return (
                    <Link
                      key={s.id}
                      to={`/jobs/${s.job_id}`}
                      className="group block rounded-lg border border-white/[0.06] bg-[#121822]/80 p-2 text-xs transition-all duration-200 hover:border-cyan-500/40 hover:bg-[#121822] hover:shadow-md"
                    >
                      <p className="font-bold text-slate-100 group-hover:text-cyan-300 transition-colors truncate">
                        {s.label}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">
                        {s.job_number} · {s.client_name}
                      </p>
                      {isLate && (
                        <Badge
                          variant="destructive"
                          className="mt-1.5 border border-red-500/40 bg-red-500/20 text-red-300 text-[9px] font-mono shadow-[0_0_8px_rgba(239,68,68,0.2)]"
                        >
                          <Clock className="mr-1 h-2.5 w-2.5" /> Overdue
                        </Badge>
                      )}
                    </Link>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* UNSCHEDULED STEPS SECTION */}
      <Card className="border-white/[0.08] bg-[#0c1017]/80 shadow-xl backdrop-blur-md">
        <CardHeader className="border-b border-white/[0.06] pb-3.5">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 font-heading text-base font-bold text-white">
              <CalendarDays className="h-4 w-4 text-cyan-400" /> Unscheduled steps
            </CardTitle>
            <Badge
              variant="outline"
              className="border-white/10 bg-white/[0.05] text-slate-300 text-xs font-mono"
            >
              {unscheduled.length} items
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-2 pt-4">
          {unscheduled.length === 0 && (
            <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.05] p-4 text-emerald-400">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
              <p className="text-xs font-semibold">
                Every active step has an SLA deadline assigned.
              </p>
            </div>
          )}
          {unscheduled.map((s) => (
            <Link
              key={s.id}
              to={`/jobs/${s.job_id}`}
              className="group flex items-center justify-between rounded-xl border border-white/[0.06] bg-[#121822]/60 p-3 text-sm transition-all duration-200 hover:border-amber-500/40 hover:bg-[#121822]"
            >
              <div className="min-w-0 pr-3">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-100 group-hover:text-amber-300 transition-colors">
                    {s.label}
                  </span>
                  <span className="text-xs text-slate-400 truncate">
                    · {s.job_number} · {s.client_name}
                  </span>
                </div>
              </div>
              <Badge
                variant="outline"
                className="border-amber-500/30 bg-amber-500/10 text-amber-300 text-xs shrink-0"
              >
                No SLA set
              </Badge>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}