import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  formatInZone,
  groupBy,
  loadScheduledSends,
  OUTCOME_LABELS,
  summarise,
  type ScheduledSend,
} from "@/lib/followups";
import {
  Loader2,
  MessageCircle,
  TrendingUp,
  Users,
  Send,
  BarChart3,
  HelpCircle,
  Clock,
  Layers,
  Megaphone,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Sparkles,
  Zap,
} from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Campaign = Pick<Tables<"campaigns">, "id" | "name">;

/* -------------------------------------------------------
   FUTURISTIC GLASS CONTAINER
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
        backdrop-blur-md
        ${className}
      `}
    >
      <div className="pointer-events-none absolute -right-20 -top-20 h-40 w-40 rounded-full bg-cyan-500/[0.035] blur-3xl" />
      {children}
    </div>
  );
}

export default function FollowUpResults() {
  const { orgId } = useAuth();
  const [sends, setSends] = useState<ScheduledSend[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [rows, cs] = await Promise.all([
        loadScheduledSends(orgId),
        supabase.from("campaigns").select("id,name").eq("org_id", orgId).order("name"),
      ]);
      if (cancelled) return;
      setSends(rows);
      setCampaigns(cs.data ?? []);
      setLoading(false);
    })().catch(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [orgId]);

  const scoped = useMemo(
    () => (filter === "all" ? sends : sends.filter((s) => s.campaign_id === filter)),
    [sends, filter]
  );
  const totals = useMemo(() => summarise(scoped), [scoped]);
  const name = (id: string) => campaigns.find((c) => c.id === id)?.name ?? "Campaign";

  const perCampaign = useMemo(
    () =>
      [...groupBy(scoped, (s) => s.campaign_id).entries()].map(([id, rows]) => ({
        id,
        rows,
        s: summarise(rows),
      })),
    [scoped]
  );

  const perStage = useMemo(
    () =>
      [...groupBy(scoped, (s) => `${s.step_index}|${s.step_subject}`).entries()]
        .map(([k, rows]) => ({
          k,
          label: k.split("|")[1] || `Step ${Number(k.split("|")[0]) + 1}`,
          index: Number(k.split("|")[0]),
          rows,
          s: summarise(rows),
        }))
        .sort((a, b) => a.index - b.index),
    [scoped]
  );

  const unresolved = useMemo(
    () =>
      scoped
        .filter((s) => s.status === "sent" && (!s.outcome || ["sent", "no_answer"].includes(s.outcome)))
        .sort((a, b) => (a.sent_at ?? "").localeCompare(b.sent_at ?? "")),
    [scoped]
  );

  const outcomeCounts = useMemo(() => {
    const m = new Map<string, number>();
    scoped
      .filter((s) => s.status === "sent")
      .forEach((s) => {
        const k = s.outcome || "sent";
        m.set(k, (m.get(k) ?? 0) + 1);
      });
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [scoped]);

  if (loading) {
    return (
      <div className="flex justify-center p-10">
        <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
      </div>
    );
  }

  const Stat = ({
    label,
    value,
    sub,
    icon: Icon,
    color,
  }: {
    label: string;
    value: string | number;
    sub?: string;
    icon: React.ElementType;
    color: string;
  }) => (
    <GlassCard className="p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${color}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-2 text-2xl font-black text-white tracking-tight">{value}</p>
      {sub && <p className="mt-1 text-[11px] text-slate-400">{sub}</p>}
    </GlassCard>
  );

  return (
    <div className="space-y-6 text-slate-200">
      {/* HEADER & FILTER */}
      <GlassCard className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.085] pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.15)]">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">Follow-up performance</h1>
              <p className="text-xs text-slate-400">
                WhatsApp follow-up outcomes across every campaign and stage.
              </p>
            </div>
          </div>

          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="h-9 w-64 rounded-xl border-white/[0.08] bg-[#161c26] text-xs text-slate-200 focus:border-cyan-400/30">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-white/[0.085] bg-[#10151d] text-slate-200">
              <SelectItem value="all" className="text-xs">
                All campaigns
              </SelectItem>
              {campaigns.map((c) => (
                <SelectItem key={c.id} value={c.id} className="text-xs">
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* TOP STAT CARDS */}
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Stat
            label="Messages sent"
            value={totals.sent}
            sub={`${totals.total} scheduled in total`}
            icon={Send}
            color="border border-cyan-400/30 bg-cyan-400/10 text-cyan-400"
          />
          <Stat
            label="Response rate"
            value={`${totals.responseRate}%`}
            sub={`${totals.responded} replies or meetings`}
            icon={TrendingUp}
            color="border border-emerald-400/30 bg-emerald-400/10 text-emerald-400"
          />
          <Stat
            label="Unresolved"
            value={totals.unresolved}
            sub="Sent with no reply yet"
            icon={HelpCircle}
            color="border border-amber-400/30 bg-amber-400/10 text-amber-400"
          />
          <Stat
            label="Waiting approval"
            value={totals.pending}
            sub={`${totals.approved} approved, ${totals.cancelled} cancelled`}
            icon={Clock}
            color="border border-purple-400/30 bg-purple-400/10 text-purple-400"
          />
        </div>
      </GlassCard>

      {/* OUTCOMES & PER CAMPAIGN ROW */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* OUTCOMES CHART */}
        <GlassCard className="p-5">
          <div className="flex items-center gap-2 border-b border-white/[0.085] pb-3 mb-4">
            <MessageCircle className="h-4 w-4 text-cyan-400" />
            <h2 className="text-sm font-bold text-white tracking-wide">Outcomes</h2>
          </div>

          <div className="space-y-3.5">
            {!outcomeCounts.length && (
              <p className="text-xs text-slate-400">No messages logged yet.</p>
            )}
            {outcomeCounts.map(([k, n]) => {
              const pct = Math.round((n / totals.sent) * 100) || 0;
              return (
                <div key={k} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-200">
                      {OUTCOME_LABELS[k] ?? k}
                    </span>
                    <span className="text-slate-400 font-mono">
                      {n} <span className="text-slate-600">·</span> {pct}%
                    </span>
                  </div>
                  <Progress
                    value={pct}
                    className="h-2 rounded-full bg-[#161c26] [&>div]:bg-gradient-to-r [&>div]:from-cyan-500 [&>div]:to-emerald-400"
                  />
                </div>
              );
            })}
          </div>
        </GlassCard>

        {/* PER CAMPAIGN BREAKDOWN */}
        <GlassCard className="p-5">
          <div className="flex items-center gap-2 border-b border-white/[0.085] pb-3 mb-4">
            <Megaphone className="h-4 w-4 text-emerald-400" />
            <h2 className="text-sm font-bold text-white tracking-wide">By campaign</h2>
          </div>

          <div className="space-y-2.5">
            {!perCampaign.length && (
              <p className="text-xs text-slate-400">Nothing scheduled yet.</p>
            )}
            {perCampaign.map(({ id, s }) => (
              <div
                key={id}
                className="rounded-xl border border-white/[0.085] bg-[#161c26]/60 p-3.5 transition-all hover:border-emerald-400/30"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link
                    className="text-xs font-bold text-white underline hover:text-emerald-300"
                    to={`/outreach/campaigns/${id}`}
                  >
                    {name(id)}
                  </Link>
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300 shadow-[0_0_10px_rgba(52,211,153,0.15)]">
                    <Zap className="h-2.5 w-2.5 text-emerald-400" />
                    {s.responseRate}% response
                  </span>
                </div>
                <p className="mt-2 text-[11px] text-slate-400">
                  <span className="text-slate-200 font-medium">{s.sent}</span> sent ·{" "}
                  <span className="text-emerald-300 font-medium">{s.responded}</span> responded ·{" "}
                  <span className="text-amber-300 font-medium">{s.unresolved}</span> unresolved ·{" "}
                  <span className="text-purple-300 font-medium">{s.pending}</span> awaiting approval
                </p>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* BY SEQUENCE STAGE */}
      <GlassCard className="p-5">
        <div className="flex items-center gap-2 border-b border-white/[0.085] pb-3 mb-4">
          <Layers className="h-4 w-4 text-purple-400" />
          <h2 className="text-sm font-bold text-white tracking-wide">By sequence stage</h2>
        </div>

        <div className="space-y-2.5">
          {!perStage.length && (
            <p className="text-xs text-slate-400">Nothing scheduled yet.</p>
          )}
          {perStage.map((st) => (
            <div
              key={st.k}
              className="rounded-xl border border-white/[0.085] bg-[#161c26]/60 p-3.5 transition-all hover:border-purple-400/30"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-bold text-white">
                  Step {st.index + 1} <span className="text-slate-500">·</span>{" "}
                  <span className="text-cyan-300">{st.label}</span>
                </p>
                <span className="inline-flex items-center gap-1 rounded-full border border-purple-400/30 bg-purple-400/10 px-2 py-0.5 text-[10px] font-bold text-purple-300">
                  <Sparkles className="h-2.5 w-2.5 text-purple-400" />
                  {st.s.responseRate}% response
                </span>
              </div>
              <p className="mt-2 text-[11px] text-slate-400">
                <span className="text-slate-200 font-medium">{st.s.sent}</span> sent ·{" "}
                <span className="text-emerald-300 font-medium">{st.s.responded}</span> responded ·{" "}
                <span className="text-rose-300 font-medium">{st.s.noAnswer}</span> no answer ·{" "}
                <span className="text-slate-400 font-medium">{st.s.notInterested}</span> not interested ·{" "}
                <span className="text-amber-300 font-medium">{st.s.unresolved}</span> unresolved
              </p>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* UNRESOLVED LEADS */}
      <GlassCard className="p-5">
        <div className="flex items-center gap-2 border-b border-white/[0.085] pb-3 mb-4">
          <Users className="h-4 w-4 text-amber-400" />
          <h2 className="text-sm font-bold text-white tracking-wide">
            Unresolved leads ({unresolved.length})
          </h2>
        </div>

        <div className="space-y-2.5">
          {!unresolved.length && (
            <p className="text-xs text-slate-400">Every contacted client has an outcome.</p>
          )}
          {unresolved.map((r) => (
            <div
              key={r.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.085] bg-[#161c26]/60 p-3.5 transition-all hover:border-amber-400/30"
            >
              <div className="min-w-0 space-y-0.5">
                <p className="text-xs font-bold text-white">{r.client_name || "Client"}</p>
                <p className="text-[11px] text-slate-400 flex flex-wrap items-center gap-1.5">
                  <span className="text-cyan-300 font-semibold">{name(r.campaign_id)}</span>
                  <span className="text-slate-600">·</span>
                  <span>Step {r.step_index + 1}</span>
                  <span className="text-slate-600">·</span>
                  <span>{r.step_subject}</span>
                  {r.sent_at && (
                    <>
                      <span className="text-slate-600">·</span>
                      <span className="text-slate-400">
                        sent {formatInZone(r.sent_at, r.timezone)}
                      </span>
                    </>
                  )}
                </p>
              </div>

              <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-0.5 text-[10px] font-bold text-amber-300 shadow-[0_0_10px_rgba(251,191,36,0.15)]">
                <AlertCircle className="h-2.5 w-2.5 text-amber-400" />
                {OUTCOME_LABELS[r.outcome ?? "sent"] ?? "Awaiting reply"}
              </span>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}