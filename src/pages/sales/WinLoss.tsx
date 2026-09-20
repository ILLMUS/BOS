import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatMoney, formatDate } from "@/lib/crm";
import type { Tables } from "@/integrations/supabase/types";
import { Loader2, BarChart3 } from "lucide-react";
import { motion } from "framer-motion";

type Deal = Tables<"deals">;
type Lead = Tables<"leads">;

const RANGES = [
  { key: "30", label: "Last 30 days" },
  { key: "90", label: "Last 90 days" },
  { key: "365", label: "Last 12 months" },
  { key: "all", label: "All time" },
];

const normaliseReason = (r: string | null | undefined) => (r || "").trim() || "No reason recorded";

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

export default function WinLoss() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [range, setRange] = useState("90");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [d, l] = await Promise.all([
        supabase.from("deals").select("*").order("created_at", { ascending: false }),
        supabase.from("leads").select("*").eq("status", "disqualified"),
      ]);
      setDeals(d.data || []);
      setLeads(l.data || []);
      setLoading(false);
    })();
  }, []);

  const cutoff = useMemo(() => {
    if (range === "all") return null;
    const d = new Date();
    d.setDate(d.getDate() - Number(range));
    return d;
  }, [range]);

  const inRange = (iso: string | null) => {
    if (!cutoff) return true;
    if (!iso) return false;
    return new Date(iso) >= cutoff;
  };

  const closed = deals.filter((d) => d.status !== "open" && inRange(d.closed_at || d.updated_at));
  const won = closed.filter((d) => d.status === "won");
  const lost = closed.filter((d) => d.status === "lost");
  const wonValue = won.reduce((s, d) => s + Number(d.value || 0), 0);
  const lostValue = lost.reduce((s, d) => s + Number(d.value || 0), 0);
  const winRate = closed.length ? Math.round((won.length / closed.length) * 100) : 0;
  const avgWon = won.length ? wonValue / won.length : 0;

  const lossReasons = useMemo(() => {
    const map = new Map<string, { count: number; value: number }>();
    lost.forEach((d) => {
      const key = normaliseReason(d.lost_reason);
      const cur = map.get(key) || { count: 0, value: 0 };
      map.set(key, { count: cur.count + 1, value: cur.value + Number(d.value || 0) });
    });
    return [...map.entries()].sort((a, b) => b[1].count - a[1].count);
  }, [lost]);

  const disqualReasons = useMemo(() => {
    const map = new Map<string, number>();
    leads.filter((l) => inRange(l.updated_at)).forEach((l) => {
      const key = normaliseReason(l.disqualified_reason);
      map.set(key, (map.get(key) || 0) + 1);
    });
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [leads, cutoff]);

  const maxLoss = lossReasons[0]?.[1].count || 1;
  const maxDq = disqualReasons[0]?.[1] || 1;

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-[11px] text-slate-400">
        <Loader2 className="mr-2 h-5 w-5 animate-spin text-cyan-400" />
        Loading analytics...
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
              <BarChart3 className="h-4 w-4" />
            </motion.div>
            <span className="truncate">Win / loss analytics</span>
          </h1>
          <p className="mt-0.5 text-[11px] text-slate-400 break-words">
            Why deals close and why they slip away.
          </p>
        </div>

        <Select value={range} onValueChange={setRange}>
          <SelectTrigger className="h-9 w-[180px] rounded-xl border-white/[0.08] bg-[#0b0e14] text-[11px] text-slate-200">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="border-white/[0.085] bg-[#10151d] text-slate-200">
            {RANGES.map((r) => (
              <SelectItem key={r.key} value={r.key} className="text-[11px]">
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* METRICS CARDS */}
      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4 min-w-0">
        {[
          { label: "Win rate", value: `${winRate}%` },
          { label: "Deals won", value: `${won.length} · ${formatMoney(wonValue)}` },
          { label: "Deals lost", value: `${lost.length} · ${formatMoney(lostValue)}` },
          { label: "Average won deal", value: formatMoney(avgWon) },
        ].map((s) => (
          <GlassCard key={s.label}>
            <div className="p-4 space-y-1 min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 truncate">{s.label}</p>
              <p className="text-xl font-bold tracking-tight text-white truncate">{s.value}</p>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* LOSS REASONS */}
      <GlassCard>
        <div className="border-b border-white/[0.085] bg-white/[0.02] px-6 py-3.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Loss reasons (deals)
          </span>
        </div>
        <div className="p-6 space-y-3.5 min-w-0">
          {lossReasons.length === 0 && (
            <p className="py-6 text-center text-[11px] text-slate-500">No lost deals in this period.</p>
          )}
          {lossReasons.map(([reason, r]) => (
            <div key={reason} className="space-y-1.5 min-w-0">
              <div className="flex items-center justify-between gap-3 text-xs min-w-0">
                <span className="truncate text-slate-200 font-medium">{reason}</span>
                <span className="shrink-0 font-mono text-slate-400 text-[11px]">{r.count} · {formatMoney(r.value)}</span>
              </div>
              <Progress
                value={(r.count / maxLoss) * 100}
                className="h-2 rounded-full bg-white/[0.06] [&>div]:bg-cyan-400"
              />
            </div>
          ))}
        </div>
      </GlassCard>

      {/* LEAD DISQUALIFICATION REASONS */}
      <GlassCard>
        <div className="border-b border-white/[0.085] bg-white/[0.02] px-6 py-3.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Lead disqualification reasons
          </span>
        </div>
        <div className="p-6 space-y-3.5 min-w-0">
          {disqualReasons.length === 0 && (
            <p className="py-6 text-center text-[11px] text-slate-500">No disqualified leads in this period.</p>
          )}
          {disqualReasons.map(([reason, count]) => (
            <div key={reason} className="space-y-1.5 min-w-0">
              <div className="flex items-center justify-between gap-3 text-xs min-w-0">
                <span className="truncate text-slate-200 font-medium">{reason}</span>
                <span className="shrink-0 font-mono text-slate-400 text-[11px]">{count}</span>
              </div>
              <Progress
                value={(count / maxDq) * 100}
                className="h-2 rounded-full bg-white/[0.06] [&>div]:bg-cyan-400"
              />
            </div>
          ))}
        </div>
      </GlassCard>

      {/* RECENTLY CLOSED */}
      <GlassCard>
        <div className="border-b border-white/[0.085] bg-white/[0.02] px-6 py-3.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Recently closed
          </span>
        </div>
        <div className="p-6 space-y-2.5 min-w-0">
          {closed.length === 0 && (
            <p className="py-6 text-center text-[11px] text-slate-500">Nothing closed in this period.</p>
          )}
          {closed.slice(0, 12).map((d) => (
            <div
              key={d.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-[#0b0e14] p-3.5 min-w-0 transition-colors hover:border-white/[0.15]"
            >
              <div className="min-w-0 space-y-0.5">
                <p className="truncate text-xs font-semibold text-slate-100">{d.name}</p>
                <p className="text-[10px] text-slate-400 truncate">
                  {formatDate(d.closed_at || d.updated_at)}
                  {d.status === "lost" && d.lost_reason ? ` · ${d.lost_reason}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                <span className="font-mono text-xs font-medium text-slate-200">{formatMoney(d.value)}</span>
                <Badge
                  variant="outline"
                  className={
                    d.status === "won"
                      ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300 text-[10px] font-semibold"
                      : "border-rose-400/30 bg-rose-400/10 text-rose-300 text-[10px] font-semibold"
                  }
                >
                  {d.status === "won" ? "Won" : "Lost"}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}