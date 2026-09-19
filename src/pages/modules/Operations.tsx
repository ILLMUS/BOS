import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import BackButton from "@/components/layout/BackButton";
import { loadActiveStages, type OpsStage } from "@/lib/operations";
import {
  CalendarDays,
  ClipboardCheck,
  Loader2,
  Users,
  Workflow,
  AlertTriangle,
  ArrowRight,
  Zap,
  Activity,
  CheckCircle2,
} from "lucide-react";

const TOOLS = [
  {
    to: "/operations/schedule",
    label: "Capacity & scheduling",
    description: "Week calendar of every step due",
    icon: CalendarDays,
  },
  {
    to: "/operations/allocation",
    label: "Resource & team allocation",
    description: "Workload per person, reassign steps",
    icon: Users,
  },
  {
    to: "/operations/qc",
    label: "QC & handover packs",
    description: "Quality sign-off and printable pack",
    icon: ClipboardCheck,
  },
  {
    to: "/jobs",
    label: "Job pipeline",
    description: "All active and completed jobs",
    icon: Workflow,
  },
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

  const attentionItems = stages.filter(
    (s) => s.status === "pending_approval" || (s.dueAt && s.dueAt < now)
  );

  return (
    <div className="relative space-y-6">
      {/* BACKGROUND AMBIENT GLOWS */}
      <div className="pointer-events-none absolute -left-20 -top-10 h-72 w-72 rounded-full bg-cyan-500/10 blur-[120px]" />
      <div className="pointer-events-none absolute right-0 top-1/3 h-80 w-80 rounded-full bg-indigo-500/10 blur-[140px]" />

      <BackButton />

      {/* HEADER SECTION */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-white/[0.08] pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-heading text-2xl font-black tracking-tight text-white">
              Operations
            </h1>
            <Badge className="border-cyan-500/30 bg-cyan-500/10 text-cyan-300 text-[10px] uppercase font-mono tracking-widest">
              Live Engine
            </Badge>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Delivery execution — scheduling, allocation, quality, and handover protocols.
          </p>
        </div>

        {/* SYSTEM ACTIVITY INDICATOR */}
        <div className="flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400 self-start sm:self-auto">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          ACTIVE PIPELINE
        </div>
      </div>

      {/* TOP METRIC CARDS */}
      {loading ? (
        <div className="flex h-28 items-center justify-center rounded-xl border border-white/[0.08] bg-[#0c1017]/80 backdrop-blur-md">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-cyan-400">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading execution data...
          </div>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              label: "Live steps",
              value: stages.length,
              accent: "text-cyan-400",
              border: "hover:border-cyan-500/30",
              icon: Activity,
            },
            {
              label: "Awaiting approval",
              value: approvals,
              accent: approvals > 0 ? "text-amber-400" : "text-slate-300",
              border: approvals > 0 ? "hover:border-amber-500/30" : "hover:border-white/10",
              icon: Zap,
            },
            {
              label: "Overdue",
              value: overdue,
              accent: overdue > 0 ? "text-red-400" : "text-slate-300",
              border: overdue > 0 ? "hover:border-red-500/30" : "hover:border-white/10",
              icon: AlertTriangle,
            },
            {
              label: "Unassigned",
              value: unassigned,
              accent: unassigned > 0 ? "text-indigo-400" : "text-slate-300",
              border: "hover:border-indigo-500/30",
              icon: Users,
            },
          ].map((k) => (
            <Card
              key={k.label}
              className={`group relative overflow-hidden border-white/[0.08] bg-[#0c1017]/80 shadow-xl backdrop-blur-md transition-all duration-300 ${k.border}`}
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
      )}

      {/* OPERATIONS TOOLS */}
      <Card className="border-white/[0.08] bg-[#0c1017]/80 shadow-xl backdrop-blur-md">
        <CardHeader className="border-b border-white/[0.06] pb-3.5">
          <CardTitle className="font-heading text-base font-bold text-white flex items-center gap-2">
            <Workflow className="h-4 w-4 text-cyan-400" />
            Operations tools
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 pt-4 sm:grid-cols-2">
          {TOOLS.map((t) => (
            <div
              key={t.to}
              className="group relative flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-[#121822]/60 p-3.5 transition-all duration-300 hover:border-cyan-500/40 hover:bg-[#121822] hover:shadow-[0_0_20px_rgba(34,211,238,0.08)]"
            >
              <div className="flex items-start gap-3">
                <div className="rounded-lg border border-cyan-400/20 bg-cyan-400/10 p-2 text-cyan-300 group-hover:border-cyan-400/40 group-hover:bg-cyan-400/20 transition-colors">
                  <t.icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-bold text-sm text-slate-100 group-hover:text-cyan-300 transition-colors">
                    {t.label}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">{t.description}</p>
                </div>
              </div>
              <Button
                asChild
                size="sm"
                className="border-white/10 bg-white/[0.05] text-xs font-semibold text-slate-200 hover:border-cyan-400/40 hover:bg-cyan-500/20 hover:text-white shrink-0 transition-all duration-200"
              >
                <Link to={t.to} className="flex items-center gap-1">
                  <span>Open</span>
                  <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* ATTENTION NOW SECTION */}
      <Card className="border-white/[0.08] bg-[#0c1017]/80 shadow-xl backdrop-blur-md">
        <CardHeader className="border-b border-white/[0.06] pb-3.5">
          <div className="flex items-center justify-between">
            <CardTitle className="font-heading text-base font-bold text-white flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-400 animate-pulse" />
              Attention now
            </CardTitle>
            {attentionItems.length > 0 && (
              <Badge className="border border-amber-500/30 bg-amber-500/10 text-amber-300 text-xs">
                {attentionItems.length} require action
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-2 pt-4">
          {attentionItems.slice(0, 8).map((s) => {
            const isOverdue = s.dueAt && s.dueAt < now;
            return (
              <Link
                key={s.id}
                to={`/jobs/${s.job_id}`}
                className="group flex items-center justify-between rounded-xl border border-white/[0.06] bg-[#121822]/60 p-3 text-sm transition-all duration-200 hover:border-cyan-500/40 hover:bg-[#121822]"
              >
                <div className="min-w-0 pr-3">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white group-hover:text-cyan-300 transition-colors">
                      {s.label}
                    </span>
                    <span className="text-xs text-slate-400 truncate">
                      · {s.job_number} · {s.client_name}
                    </span>
                  </div>
                </div>

                <Badge
                  variant={isOverdue ? "destructive" : "outline"}
                  className={
                    isOverdue
                      ? "border-red-500/40 bg-red-500/20 text-red-300 text-xs shadow-[0_0_10px_rgba(239,68,68,0.2)]"
                      : "border-amber-500/40 bg-amber-500/20 text-amber-300 text-xs shadow-[0_0_10px_rgba(245,158,11,0.2)]"
                  }
                >
                  {isOverdue ? "Overdue" : "Approval Required"}
                </Badge>
              </Link>
            );
          })}

          {!loading && attentionItems.length === 0 && (
            <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.05] p-4 text-emerald-400">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
              <p className="text-xs font-semibold">
                All clear — nothing is overdue or waiting on approvals right now.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}