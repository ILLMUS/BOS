import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import BackButton from "@/components/layout/BackButton";
import { toast } from "sonner";
import { loadActiveStages, loadTeam, type OpsStage, type TeamMember } from "@/lib/operations";
import { Loader2, Users, UserX, Clock, AlertTriangle, Activity, ExternalLink } from "lucide-react";

const UNASSIGNED = "unassigned";

export default function OperationsAllocation() {
  const { orgId } = useAuth();
  const [stages, setStages] = useState<OpsStage[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [s, t] = await Promise.all([
        loadActiveStages(),
        orgId ? loadTeam(orgId) : Promise.resolve([]),
      ]);
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
      name: "Unassigned Queue",
      items: stages.filter((s) => !s.primary_owner_id || !known.has(s.primary_owner_id)),
    });
    return cols;
  }, [stages, team]);

  const reassign = async (stage: OpsStage, ownerId: string) => {
    const next = ownerId === UNASSIGNED ? null : ownerId;
    setSaving(stage.id);
    const { error } = await supabase
      .from("job_stages")
      .update({ primary_owner_id: next })
      .eq("id", stage.id);
    setSaving(null);

    if (error) {
      toast.error("Could not reassign this step");
      return;
    }
    setStages((prev) =>
      prev.map((s) => (s.id === stage.id ? { ...s, primary_owner_id: next } : s))
    );
    toast.success("Step reassigned successfully");
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-white/[0.08] bg-[#0c1017]/80 backdrop-blur-md">
        <div className="flex items-center gap-2.5 text-xs font-semibold uppercase tracking-widest text-cyan-400">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading Resource Allocations...
        </div>
      </div>
    );
  }

  const busiest = Math.max(1, ...columns.filter((c) => c.id !== UNASSIGNED).map((c) => c.items.length));
  const unassignedCount = columns.find((c) => c.id === UNASSIGNED)?.items.length ?? 0;

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
              Resource & team allocation
            </h1>
            <Badge className="border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-[10px] uppercase font-mono tracking-widest">
              Workload Matrix
            </Badge>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Real-time stage assignments per team member. Reassign directly from step cards.
          </p>
        </div>
      </div>

      {/* METRICS CARDS */}
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          {
            label: "Live steps",
            value: stages.length,
            accent: "text-cyan-400",
            icon: Activity,
          },
          {
            label: "Active team members",
            value: team.length,
            accent: "text-indigo-400",
            icon: Users,
          },
          {
            label: "Unassigned steps",
            value: unassignedCount,
            accent: unassignedCount > 0 ? "text-amber-400" : "text-slate-300",
            icon: UserX,
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

      {/* TEAM MEMBER / UNASSIGNED COLUMNS */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {columns.map((col) => {
          const isUnassigned = col.id === UNASSIGNED;
          const isHighLoad = !isUnassigned && col.items.length > busiest * 0.75 && busiest > 2;
          const loadPercentage = isUnassigned ? 0 : Math.min(100, Math.round((col.items.length / busiest) * 100));

          return (
            <Card
              key={col.id}
              className={`flex flex-col border transition-all duration-300 ${
                isUnassigned
                  ? "border-dashed border-amber-500/30 bg-amber-500/[0.02]"
                  : "border-white/[0.08] bg-[#0c1017]/80 hover:border-white/20 shadow-xl backdrop-blur-md"
              }`}
            >
              <CardHeader className="p-4 pb-3 border-b border-white/[0.04]">
                <CardTitle className="flex items-center justify-between text-xs font-bold">
                  <span className="flex items-center gap-2 text-slate-100">
                    {isUnassigned ? (
                      <UserX className="h-4 w-4 text-amber-400" />
                    ) : (
                      <Users className="h-4 w-4 text-cyan-400" />
                    )}
                    <span className="truncate max-w-[160px]">{col.name}</span>
                  </span>

                  <Badge
                    variant={isHighLoad ? "destructive" : "outline"}
                    className={
                      isHighLoad
                        ? "border-red-500/40 bg-red-500/20 text-red-300 text-[10px] shadow-[0_0_8px_rgba(239,68,68,0.2)]"
                        : "border-white/10 bg-white/[0.03] text-slate-300 text-[10px]"
                    }
                  >
                    {col.items.length} {col.items.length === 1 ? "step" : "steps"}
                  </Badge>
                </CardTitle>

                {/* CAPACITY LOAD BAR FOR TEAM MEMBERS */}
                {!isUnassigned && (
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                      <span>Relative Load</span>
                      <span>{loadPercentage}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${
                          isHighLoad ? "bg-red-400" : "bg-gradient-to-r from-cyan-500 to-indigo-500"
                        }`}
                        style={{ width: `${loadPercentage}%` }}
                      />
                    </div>
                  </div>
                )}
              </CardHeader>

              <CardContent className="space-y-3 p-4 pt-3 flex-1">
                {col.items.length === 0 && (
                  <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-white/[0.06] text-xs text-slate-500">
                    No active steps assigned
                  </div>
                )}

                {col.items.map((s) => {
                  const isOverdue = s.dueAt && s.dueAt < new Date();
                  const isSavingThis = saving === s.id;

                  return (
                    <div
                      key={s.id}
                      className="group relative rounded-xl border border-white/[0.06] bg-[#121822]/80 p-3 text-xs transition-all duration-200 hover:border-cyan-500/40 hover:bg-[#121822] hover:shadow-md"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          to={`/jobs/${s.job_id}`}
                          className="font-bold text-slate-100 group-hover:text-cyan-300 transition-colors flex items-center gap-1 hover:underline"
                        >
                          <span>{s.label}</span>
                          <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-cyan-400" />
                        </Link>
                      </div>

                      <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                        {s.job_number} · {s.client_name}
                      </p>

                      <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                        <Badge
                          variant="outline"
                          className="border-white/10 bg-white/[0.04] text-[10px] text-slate-300 capitalize"
                        >
                          {s.status.replace("_", " ")}
                        </Badge>

                        {isOverdue && (
                          <Badge
                            variant="destructive"
                            className="border-red-500/40 bg-red-500/20 text-red-300 text-[10px] font-mono shadow-[0_0_8px_rgba(239,68,68,0.2)]"
                          >
                            <Clock className="mr-1 h-2.5 w-2.5" /> Overdue
                          </Badge>
                        )}
                      </div>

                      {/* REASSIGNMENT DROPDOWN */}
                      <div className="mt-3 pt-2 border-t border-white/[0.04]">
                        <Select
                          value={s.primary_owner_id || UNASSIGNED}
                          onValueChange={(v) => reassign(s, v)}
                          disabled={isSavingThis}
                        >
                          <SelectTrigger className="h-8 text-[11px] bg-[#0c1017] border-white/10 text-slate-300 hover:bg-white/[0.04]">
                            {isSavingThis ? (
                              <div className="flex items-center gap-1.5 text-cyan-400">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                <span>Reassigning...</span>
                              </div>
                            ) : (
                              <SelectValue placeholder="Assign to owner..." />
                            )}
                          </SelectTrigger>
                          <SelectContent className="bg-[#0c1017] border-white/10 text-slate-200">
                            <SelectItem value={UNASSIGNED} className="text-amber-400 font-medium">
                              Unassigned
                            </SelectItem>
                            {team.map((m) => (
                              <SelectItem key={m.id} value={m.id}>
                                {m.full_name || m.email}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}