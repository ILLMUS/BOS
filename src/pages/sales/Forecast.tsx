import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { OPPORTUNITY_STAGE_LABELS, formatMoney, formatDate } from "@/lib/crm";
import type { Tables, Enums } from "@/integrations/supabase/types";
import { Loader2, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

type Opportunity = Tables<"opportunities">;
type Stage = Enums<"opportunity_stage">;

const OPEN_STAGES: Stage[] = ["discovery", "scoping", "proposal", "negotiation"];

const HORIZONS = [
  { key: "30", label: "Next 30 days" },
  { key: "90", label: "Next 90 days" },
  { key: "all", label: "All open work" },
];

/* -------------------------------------------------------
   BUSINESS OS GLASS CARD CONTAINER
------------------------------------------------------- */
function GlassCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`
        relative overflow-hidden rounded-[14px]
        border border-white/[0.085]
        bg-[#10151d]/95
        shadow-[0_18px_60px_rgba(0,0,0,0.24)]
        ${className}
      `}
    >
      <div className="pointer-events-none absolute -right-20 -top-20 h-40 w-40 rounded-full bg-cyan-500/[0.035] blur-3xl" />
      {children}
    </div>
  );
}

export default function Forecast() {
  const [rows, setRows] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [horizon, setHorizon] = useState("90");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("opportunities").select("*").order("expected_close_date", { ascending: true });
      setRows(data || []);
      setLoading(false);
    })();
  }, []);

  const open = useMemo(() => {
    const cutoff = horizon === "all" ? null : (() => { const d = new Date(); d.setDate(d.getDate() + Number(horizon)); return d; })();
    return rows.filter((o) => {
      if (!OPEN_STAGES.includes(o.stage)) return false;
      if (!cutoff) return true;
      if (!o.expected_close_date) return false;
      return new Date(o.expected_close_date) <= cutoff;
    });
  }, [rows, horizon]);

  const byStage = useMemo(() => OPEN_STAGES.map((stage) => {
    const items = open.filter((o) => o.stage === stage);
    const gross = items.reduce((s, o) => s + Number(o.value || 0), 0);
    const weighted = items.reduce((s, o) => s + (Number(o.value || 0) * (o.probability ?? 0)) / 100, 0);
    return { stage, count: items.length, gross, weighted };
  }), [open]);

  const totalGross = byStage.reduce((s, r) => s + r.gross, 0);
  const totalWeighted = byStage.reduce((s, r) => s + r.weighted, 0);
  const maxGross = Math.max(1, ...byStage.map((r) => r.gross));

  const overdue = open.filter((o) => o.expected_close_date && new Date(o.expected_close_date) < new Date());
  const unscheduled = open.filter((o) => !o.expected_close_date).length;

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-[11px] text-slate-400">
        <Loader2 className="mr-2 h-5 w-5 animate-spin text-cyan-400" />
        Loading forecast...
      </div>
    );
  }

  return (
    <div className="space-y-5 text-slate-200 min-w-0 pb-12">
      {/* HEADER BAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.065] pb-4 min-w-0">
        <div>
          <h1 className="flex items-center gap-2.5 text-xl font-bold tracking-tight text-white sm:text-2xl min-w-0">
            <motion.div
              whileHover={{ rotate: 15, scale: 1.1 }}
              transition={{ type: "spring", stiffness: 300, damping: 15 }}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-cyan-400/20 bg-cyan-500/10 text-cyan-400"
            >
              <TrendingUp className="h-4 w-4" />
            </motion.div>
            <span className="truncate">Value forecast by stage</span>
          </h1>
          <p className="mt-0.5 text-[11px] text-slate-400 break-words">
            Pipeline value weighted by each opportunity's probability.
          </p>
        </div>

        <Select value={horizon} onValueChange={setHorizon}>
          <SelectTrigger className="h-9 w-[180px] rounded-xl border-white/[0.08] bg-[#0b0e14] text-[11px] text-slate-200">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="border-white/[0.085] bg-[#10151d] text-slate-200">
            {HORIZONS.map((h) => (
              <SelectItem key={h.key} value={h.key} className="text-[11px]">
                {h.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* METRICS CARDS */}
      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4 min-w-0">
        {[
          { label: "Open opportunities", value: String(open.length) },
          { label: "Gross pipeline", value: formatMoney(totalGross) },
          { label: "Weighted forecast", value: formatMoney(totalWeighted) },
          { label: "No close date", value: String(unscheduled) },
        ].map((s) => (
          <GlassCard key={s.label}>
            <div className="p-4 space-y-1 min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 truncate">{s.label}</p>
              <p className="text-xl font-bold tracking-tight text-white truncate">{s.value}</p>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* STAGE BREAKDOWN */}
      <GlassCard>
        <div className="border-b border-white/[0.085] bg-white/[0.02] px-6 py-3.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Stage breakdown
          </span>
        </div>
        <div className="p-6 space-y-4 min-w-0">
          {byStage.map((r) => (
            <div key={r.stage} className="space-y-1.5 min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs min-w-0">
                <span className="font-semibold text-slate-200 truncate">
                  {OPPORTUNITY_STAGE_LABELS[r.stage]} <span className="text-slate-400 font-normal">({r.count})</span>
                </span>
                <span className="text-slate-400 font-mono text-[11px] truncate">
                  {formatMoney(r.gross)} gross · <span className="text-cyan-300 font-medium">{formatMoney(r.weighted)} weighted</span>
                </span>
              </div>
              <Progress
                value={(r.gross / maxGross) * 100}
                className="h-2 rounded-full bg-white/[0.06] [&>div]:bg-cyan-400"
              />
            </div>
          ))}
        </div>
      </GlassCard>

      {/* SLIPPING — CLOSE DATE PASSED */}
      <GlassCard>
        <div className="border-b border-white/[0.085] bg-white/[0.02] px-6 py-3.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Slipping — close date passed
          </span>
        </div>
        <div className="p-6 space-y-2.5 min-w-0">
          {overdue.length === 0 && (
            <p className="py-4 text-center text-[11px] text-slate-500">Nothing overdue. Good.</p>
          )}
          {overdue.map((o) => (
            <div
              key={o.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-[#0b0e14] p-3.5 min-w-0 transition-colors hover:border-white/[0.15]"
            >
              <div className="min-w-0 space-y-0.5">
                <p className="truncate text-xs font-semibold text-slate-100">{o.name}</p>
                <p className="text-[10px] text-slate-400 truncate">
                  Expected {formatDate(o.expected_close_date)} · {o.probability}% likely
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                <span className="font-mono text-xs font-medium text-slate-200">{formatMoney(o.value)}</span>
                <Badge variant="outline" className="border-cyan-400/30 bg-cyan-400/10 text-cyan-300 text-[10px] font-semibold">
                  {OPPORTUNITY_STAGE_LABELS[o.stage]}
                </Badge>
              </div>
            </div>
          ))}
          <div className="pt-2">
            <Link to="/crm/opportunities" className="inline-flex items-center text-xs font-medium text-cyan-400 hover:underline">
              Open the opportunity pipeline →
            </Link>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}