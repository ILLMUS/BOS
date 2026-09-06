import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { STAGE_LABELS } from "@/lib/constants";
import { AlertTriangle, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { shouldToast } from "@/lib/notificationPrefs";
import type { Database } from "@/integrations/supabase/types";

type JobStageEnum = Database["public"]["Enums"]["job_stage"];

/** Dynamic workflows store a free-text stage name; legacy jobs use the fixed enum. */
const stageLabel = (name: string | null, stage: JobStageEnum | null) =>
  name || (stage ? STAGE_LABELS[stage] : null) || "Stage";

interface OverdueStage {
  id: string;
  job_id: string;
  stage: JobStageEnum | null;
  stage_name: string | null;
  sla_deadline_hours: number;
  sla_started_at: string;
  job_number: string;
  client_name: string;
  hours_overdue: number;
}

export default function OverdueStagesWidget() {
  const navigate = useNavigate();
  const { user, isAdmin, hasRole } = useAuth();
  const canSeeOverdueAlerts = isAdmin || hasRole("super_admin");
  const notifiedRef = useRef<Set<string>>(new Set());
  const [overdueStages, setOverdueStages] = useState<OverdueStage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOverdue = async () => {
      const { data: stages } = await supabase
        .from("job_stages")
        .select("id, job_id, stage, stage_name, sla_deadline_hours, sla_started_at, status, primary_owner_id, secondary_owner_id")
        .eq("status", "active")
        .not("sla_started_at", "is", null)
        .not("sla_deadline_hours", "is", null);

      if (!stages || stages.length === 0) {
        setLoading(false);
        return;
      }

      const now = Date.now();
      const overdue: { stage: typeof stages[0]; hoursOverdue: number }[] = [];

      for (const s of stages) {
        if (!s.sla_started_at || !s.sla_deadline_hours) continue;
        const deadline = new Date(s.sla_started_at).getTime() + s.sla_deadline_hours * 3600_000;
        if (now > deadline) {
          overdue.push({ stage: s, hoursOverdue: Math.round((now - deadline) / 3600_000) });
        }
      }

      if (overdue.length === 0) {
        setLoading(false);
        return;
      }

      // Fetch job details for overdue stages
      const jobIds = [...new Set(overdue.map((o) => o.stage.job_id))];
      const { data: jobs } = await supabase
        .from("jobs")
        .select("id, job_number, client_name")
        .in("id", jobIds);

      const jobMap = new Map(jobs?.map((j) => [j.id, j]) || []);

      const results: OverdueStage[] = overdue
        .map((o) => {
          const job = jobMap.get(o.stage.job_id);
          if (!job) return null;
          return {
            id: o.stage.id,
            job_id: o.stage.job_id,
            stage: o.stage.stage,
            stage_name: o.stage.stage_name,
            sla_deadline_hours: o.stage.sla_deadline_hours!,
            sla_started_at: o.stage.sla_started_at!,
            job_number: job.job_number,
            client_name: job.client_name,
            hours_overdue: o.hoursOverdue,
          };
        })
        .filter(Boolean) as OverdueStage[];

      results.sort((a, b) => b.hours_overdue - a.hours_overdue);
      setOverdueStages(results);

      if (canSeeOverdueAlerts) {
        for (const o of overdue) {
          if (notifiedRef.current.has(o.stage.id)) continue;
          const job = jobMap.get(o.stage.job_id);
          if (!job) continue;
          const assignedToMe =
            !!user &&
            (o.stage.primary_owner_id === user.id || o.stage.secondary_owner_id === user.id);
          if (!shouldToast("overdue", { stage: o.stage.stage, assignedToMe })) continue;
          notifiedRef.current.add(o.stage.id);
          toast.error(`Overdue: ${stageLabel(o.stage.stage_name, o.stage.stage)}`, {
            description: `${job.job_number} · ${job.client_name} — ${o.hoursOverdue}h past SLA`,
            action: {
              label: "Open",
              onClick: () => navigate(`/jobs/${o.stage.job_id}?stage=${o.stage.stage}`),
            },
          });
        }
      }
      setLoading(false);
    };

    fetchOverdue();
    const tick = window.setInterval(fetchOverdue, 5 * 60_000);
    return () => window.clearInterval(tick);
  }, [canSeeOverdueAlerts, user, navigate]);

  if (loading) {
    return (
      <Card className="border-destructive/30">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (overdueStages.length === 0) return null;

  const formatOverdue = (hours: number) => {
    if (hours < 24) return `${hours}h overdue`;
    const days = Math.floor(hours / 24);
    const rem = hours % 24;
    return rem > 0 ? `${days}d ${rem}h overdue` : `${days}d overdue`;
  };

  return (
    <Card className="border-destructive/30 bg-destructive/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 font-heading text-lg text-destructive">
          <AlertTriangle className="h-5 w-5" />
          Overdue Stages ({overdueStages.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {overdueStages.map((item) => (
            <button
              key={item.id}
              onClick={() => navigate(`/jobs/${item.job_id}`)}
              className="flex w-full items-center justify-between rounded border border-destructive/20 bg-background p-3 text-left transition-colors hover:bg-destructive/5"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">
                    {item.job_number}
                  </span>
                  <span className="truncate text-sm font-medium">{item.client_name}</span>
                </div>
                <Badge variant="outline" className="mt-1 text-xs">
                  {stageLabel(item.stage_name, item.stage)}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="destructive" className="text-xs whitespace-nowrap">
                  {formatOverdue(item.hours_overdue)}
                </Badge>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
