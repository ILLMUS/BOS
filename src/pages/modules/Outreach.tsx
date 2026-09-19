import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  BellRing,
  Compass,
  Inbox,
  Megaphone,
  Radio,
  Sparkles,
  Target,
} from "lucide-react";

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

const TILES = [
  {
    to: "/outreach/forms",
    icon: Target,
    label: "Lead capture forms",
    description:
      "Public forms that create accounts, contacts and leads automatically.",
  },
  {
    to: "/outreach/inbox",
    icon: Inbox,
    label: "Inbound inbox",
    description: "Triage submissions and route them into the pipeline.",
  },
  {
    to: "/outreach/campaigns",
    icon: Megaphone,
    label: "Campaigns & sequences",
    description: "Target lists with multi-step outreach cadences.",
  },
  {
    to: "/outreach/timeline",
    icon: BellRing,
    label: "Timeline & reminders",
    description: "Every touch per contact, plus follow-ups you owe.",
  },
];

export default function Outreach() {
  const [stats, setStats] = useState({
    newSubs: 0,
    campaigns: 0,
    dueFollowUps: 0,
  });

  useEffect(() => {
    (async () => {
      const [s, c, a] = await Promise.all([
        supabase
          .from("form_submissions")
          .select("id", { count: "exact", head: true })
          .eq("status", "new"),
        supabase
          .from("campaigns")
          .select("id", { count: "exact", head: true })
          .eq("status", "active"),
        supabase
          .from("activities")
          .select("id", { count: "exact", head: true })
          .is("completed_at", null)
          .lte("due_at", new Date().toISOString()),
      ]);
      setStats({
        newSubs: s.count || 0,
        campaigns: c.count || 0,
        dueFollowUps: a.count || 0,
      });
    })();
  }, []);

  return (
    <div className="space-y-6 text-slate-200">
      {/* HEADER SECTION */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.15)]">
            <Radio className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white">Outreach</h1>
            <p className="mt-1 text-xs text-slate-400">
              Top-of-funnel: lead capture, campaigns and follow-up cadences.
            </p>
          </div>
        </div>
      </GlassCard>

      {/* STATS METRICS GRID */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          {
            label: "New enquiries",
            value: stats.newSubs,
            to: "/outreach/inbox",
            badgeColor: "bg-cyan-400/10 text-cyan-400 border-cyan-400/20",
          },
          {
            label: "Active campaigns",
            value: stats.campaigns,
            to: "/outreach/campaigns",
            badgeColor: "bg-purple-400/10 text-purple-400 border-purple-400/20",
          },
          {
            label: "Follow-ups due",
            value: stats.dueFollowUps,
            to: "/outreach/timeline",
            badgeColor: "bg-amber-400/10 text-amber-400 border-amber-400/20",
          },
        ].map((s) => (
          <GlassCard key={s.label} className="p-5 transition-transform duration-200 hover:-translate-y-0.5">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {s.label}
            </p>
            <div className="mt-2 flex items-baseline justify-between">
              <Link
                to={s.to}
                className="text-3xl font-black text-white hover:text-cyan-400 hover:underline transition-colors"
              >
                {s.value}
              </Link>
              <span
                className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${s.badgeColor}`}
              >
                Live Metric
              </span>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* FEATURE TILES */}
      <div className="grid gap-4 md:grid-cols-2">
        {TILES.map((t) => {
          const Icon = t.icon;
          return (
            <GlassCard
              key={t.to}
              className="flex flex-col justify-between p-5 transition-colors duration-200 hover:border-white/[0.15]"
            >
              <div>
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-cyan-400">
                    <Icon className="h-4 w-4" />
                  </div>
                  <h2 className="text-base font-bold text-white">{t.label}</h2>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-slate-400">
                  {t.description}
                </p>
              </div>

              <div className="mt-5 flex justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  asChild
                  className="border-white/[0.08] bg-[#161c26] text-xs text-slate-200 hover:border-cyan-400/40 hover:bg-cyan-400/10 hover:text-cyan-300"
                >
                  <Link to={t.to} className="inline-flex items-center gap-1.5">
                    Open <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            </GlassCard>
          );
        })}
      </div>

      {/* RELATED NAVIGATION FOOTER */}
      <GlassCard className="p-5">
        <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
          <Compass className="h-4 w-4 text-cyan-400" />
          Related Modules
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { to: "/crm/accounts", label: "Prospects & accounts" },
            { to: "/crm/leads", label: "Leads" },
            { to: "/crm/activities", label: "Tasks & follow-ups" },
          ].map((l) => (
            <Button
              key={l.to}
              variant="outline"
              asChild
              className="justify-start border-white/[0.08] bg-[#161c26] text-xs text-slate-300 hover:border-cyan-400/30 hover:bg-white/[0.05] hover:text-white"
            >
              <Link to={l.to} className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-cyan-400/70" />
                {l.label}
              </Link>
            </Button>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}