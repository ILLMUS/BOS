import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Timer, DollarSign, Loader2 } from "lucide-react";
import { STAGE_LABELS, STAGE_ORDER } from "@/lib/constants";
import type { Database } from "@/integrations/supabase/types";
import { formatCurrency } from "@/lib/currency";

type JobStage = Database["public"]["Enums"]["job_stage"];

interface Analytics {
  avgStageHours: Record<string, number>;
  conversionRate: number;
  totalJobs: number;
  completedJobs: number;
  revenueForecast: number;
  revenueWon: number;
}

export default function AnalyticsWidgets() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [jobsRes, stagesRes] = await Promise.all([
        supabase.from("jobs").select("id, status, current_stage"),
        supabase
          .from("job_stages")
          .select("stage, sla_started_at, approved_at, form_data, status, job_id")
          .not("approved_at", "is", null)
          .not("sla_started_at", "is", null),
      ]);

      const jobs = jobsRes.data || [];
      const stages = stagesRes.data || [];

      // Avg stage duration (hours) per stage
      const buckets: Record<string, number[]> = {};
      stages.forEach((s) => {
        const start = new Date(s.sla_started_at!).getTime();
        const end = new Date(s.approved_at!).getTime();
        const hrs = (end - start) / 3600_000;
        if (hrs >= 0 && hrs < 24 * 365) {
          (buckets[s.stage] ||= []).push(hrs);
        }
      });
      const avgStageHours: Record<string, number> = {};
      Object.entries(buckets).forEach(([k, arr]) => {
        avgStageHours[k] = arr.reduce((a, b) => a + b, 0) / arr.length;
      });

      // Conversion: completed / total
      const totalJobs = jobs.length;
      const completedJobs = jobs.filter((j) => j.status === "completed").length;
      const conversionRate = totalJobs > 0 ? (completedJobs / totalJobs) * 100 : 0;

      // Revenue: sum quote_amount from approved quotation_preparation stages
      // Forecast = active jobs; Won = completed jobs
      const quoteByJob: Record<string, number> = {};
      const allQuotesRes = await supabase
        .from("job_stages")
        .select("job_id, form_data")
        .eq("stage", "quotation_preparation");
      (allQuotesRes.data || []).forEach((s: any) => {
        const fd = s.form_data || {};
        const amount =
          Number(fd.quote_amount) ||
          Number(fd.total_amount) ||
          (Array.isArray(fd.line_items)
            ? fd.line_items.reduce((sum: number, i: any) => {
                const base = (Number(i.qty) || 0) * (Number(i.unit_price) || 0);
                return sum + base + (base * (Number(i.markup_pct) || 0)) / 100;
              }, 0)
            : 0);
        if (amount > 0) quoteByJob[s.job_id] = amount;
      });

      let revenueForecast = 0;
      let revenueWon = 0;
      jobs.forEach((j) => {
        const amt = quoteByJob[j.id] || 0;
        if (j.status === "completed") revenueWon += amt;
        else if (j.status === "active") revenueForecast += amt;
      });

      setData({
        avgStageHours,
        conversionRate,
        totalJobs,
        completedJobs,
        revenueForecast,
        revenueWon,
      });
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-accent" />
        </CardContent>
      </Card>
    );
  }
  if (!data) return null;

  const slowestStage = Object.entries(data.avgStageHours).sort((a, b) => b[1] - a[1])[0];
  const overallAvg =
    Object.values(data.avgStageHours).reduce((a, b) => a + b, 0) /
    (Object.keys(data.avgStageHours).length || 1);

  const fmtMoney = (n: number) =>
    formatCurrency(n);
  const fmtHrs = (h: number) =>
    h >= 24 ? `${(h / 24).toFixed(1)}d` : `${h.toFixed(1)}h`;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard
          icon={TrendingUp}
          label="Conversion Rate"
          value={`${data.conversionRate.toFixed(1)}%`}
          sub={`${data.completedJobs} of ${data.totalJobs} jobs closed`}
          color="success"
        />
        <MetricCard
          icon={Timer}
          label="Avg Stage Duration"
          value={fmtHrs(overallAvg)}
          sub={
            slowestStage
              ? `Slowest: ${STAGE_LABELS[slowestStage[0] as JobStage] || slowestStage[0]} (${fmtHrs(slowestStage[1])})`
              : "No completed stages yet"
          }
          color="warning"
        />
        <MetricCard
          icon={DollarSign}
          label="Revenue Forecast"
          value={fmtMoney(data.revenueForecast)}
          sub={`Won: ${fmtMoney(data.revenueWon)}`}
          color="accent"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-base">Average Time per Stage</CardTitle>
        </CardHeader>
        <CardContent>
          {Object.keys(data.avgStageHours).length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">
              No completed stages yet — data will appear once stages get approved.
            </p>
          ) : (
            <div className="space-y-2">
              {STAGE_ORDER.filter((s) => data.avgStageHours[s] != null).map((stage) => {
                const hrs = data.avgStageHours[stage];
                const max = Math.max(...Object.values(data.avgStageHours));
                const pct = max > 0 ? (hrs / max) * 100 : 0;
                return (
                  <div key={stage} className="flex items-center gap-3">
                    <div className="w-32 shrink-0 text-xs text-muted-foreground">
                      {STAGE_LABELS[stage]}
                    </div>
                    <div className="h-3 flex-1 overflow-hidden rounded-sm bg-muted">
                      <div
                        className="h-full bg-accent"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="w-16 shrink-0 text-right font-mono text-xs">
                      {fmtHrs(hrs)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
  color = "primary",
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  color?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded bg-${color}/10`}>
            <Icon className={`h-5 w-5 text-${color}`} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="truncate text-xl font-bold">{value}</p>
            {sub && <p className="truncate text-xs text-muted-foreground">{sub}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
