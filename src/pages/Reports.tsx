import PageSkeleton from "@/components/ui/page-skeleton";
import { useMemo, useState } from "react";
import { format, subDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import {
  Activity,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Clock3,
  DollarSign,
  Factory,
  Gauge,
  Handshake,
  Loader2,
  Radio,
  RefreshCw,
  Sparkles,
  TrendingUp,
  Users,
  Workflow,
  X,
  Zap,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useReporting } from "@/hooks/useReporting";
import type { ReportRange } from "@/lib/reporting";

import { SalesReport } from "@/components/reporting/SalesReport";
import { OperationsReport } from "@/components/reporting/OperationsReport";
import { FinanceReport } from "@/components/reporting/FinanceReport";
import { PeopleReport } from "@/components/reporting/PeopleReport";

const PRESETS = [7, 30, 90];

export default function Reports() {
  const { isAdmin, user, organization } = useAuth();

  const [from, setFrom] =
    useState<Date | undefined>();

  const [to, setTo] =
    useState<Date | undefined>();

  const [refreshing, setRefreshing] =
    useState(false);

  const range: ReportRange = useMemo(
    () => ({
      from: from ?? null,
      to: to ?? null,
    }),
    [from, to],
  );

  const {
    loading,
    reload,
    sales,
    ops,
    finance,
    people,
    hasData,
  } = useReporting(range);

  const visiblePeople = isAdmin
    ? people
    : people.filter(
        (p) => p.userId === user?.id,
      );

  const activeRangeLabel = useMemo(() => {
    if (from && to) {
      return `${format(from, "MMM d")} — ${format(to, "MMM d, yyyy")}`;
    }

    if (from) {
      return `Since ${format(from, "MMM d, yyyy")}`;
    }

    return "All available data";
  }, [from, to]);

  const handleReload = async () => {
    setRefreshing(true);

    try {
      await reload();
    } finally {
      setTimeout(
        () => setRefreshing(false),
        450,
      );
    }
  };

  if (loading) {
    return <PageSkeleton />;
  }

  return (
    <div className="reports-command-center min-h-full pb-8 text-slate-200">
      <style>{`
        @keyframes reportFadeUp {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes reportPulse {
          0%, 100% {
            opacity: .35;
          }
          50% {
            opacity: .9;
          }
        }

        @keyframes reportScan {
          from {
            transform: translateY(-100%);
          }
          to {
            transform: translateY(400%);
          }
        }

        @keyframes reportBar {
          from {
            transform: scaleX(0);
            transform-origin: left;
          }
          to {
            transform: scaleX(1);
            transform-origin: left;
          }
        }

        .report-animate {
          animation: reportFadeUp .55s cubic-bezier(.16,1,.3,1) both;
        }

        .report-delay-1 {
          animation-delay: .05s;
        }

        .report-delay-2 {
          animation-delay: .1s;
        }

        .report-delay-3 {
          animation-delay: .15s;
        }

        .report-delay-4 {
          animation-delay: .2s;
        }

        /*
          IMPORTANT:
          The reports page itself remains transparent.
          We also neutralize generic Card backgrounds inside
          this page so there is no large "panel behind panels".
        */

        .reports-command-center [data-slot="card"] {
          background: transparent !important;
          box-shadow: none !important;
        }

        .reports-command-center .bg-card {
          background: transparent !important;
        }

        .reports-command-center .shadow-sm,
        .reports-command-center .shadow-md,
        .reports-command-center .shadow-lg {
          box-shadow: none !important;
        }
      `}</style>

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="report-animate mb-5 border-b border-white/[0.055] pb-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          {/* TITLE */}

          <div className="flex items-start gap-3">
            <div className="relative mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/[0.035]">
              <BarChart3 className="h-4 w-4 text-cyan-300" />

              <span className="absolute inset-0 animate-pulse rounded-xl border border-cyan-400/[0.05]" />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-[17px] font-semibold tracking-tight text-white">
                  Reports & Analytics
                </h1>

                <span className="flex items-center gap-1 rounded-full border border-emerald-400/15 bg-emerald-400/[0.035] px-2 py-0.5 text-[7px] font-medium uppercase tracking-[0.14em] text-emerald-400">
                  <span className="h-1 w-1 animate-pulse rounded-full bg-emerald-400" />
                  Live
                </span>
              </div>

              <p className="mt-1 text-[9px] text-slate-600">
                Operational intelligence from{" "}
                <span className="text-slate-400">
                  {organization?.name ||
                    "your workspace"}
                </span>
              </p>

              <div className="mt-2 flex items-center gap-2">
                <Radio className="h-2.5 w-2.5 text-cyan-400" />

                <span className="text-[7px] uppercase tracking-[0.16em] text-slate-600">
                  Nothing simulated · Live business data
                </span>
              </div>
            </div>
          </div>

          {/* CONTROLS */}

          <div className="flex flex-wrap items-center gap-1.5">
            <div className="mr-1 hidden items-center gap-1.5 md:flex">
              <CalendarDays className="h-3 w-3 text-slate-600" />

              <span className="text-[8px] uppercase tracking-[0.12em] text-slate-600">
                Period
              </span>
            </div>

            {PRESETS.map((days) => {
              const active =
                from &&
                !to &&
                format(
                  from,
                  "yyyy-MM-dd",
                ) ===
                  format(
                    subDays(
                      new Date(),
                      days,
                    ),
                    "yyyy-MM-dd",
                  );

              return (
                <Button
                  key={days}
                  size="sm"
                  variant="ghost"
                  className={cn(
                    "h-7 rounded-lg border px-2.5 text-[8px] font-medium transition-all",
                    active
                      ? "border-cyan-400/20 bg-cyan-400/[0.08] text-cyan-300 hover:bg-cyan-400/[0.1] hover:text-cyan-200"
                      : "border-white/[0.06] bg-white/[0.018] text-slate-500 hover:border-white/[0.1] hover:bg-white/[0.035] hover:text-slate-300",
                  )}
                  onClick={() => {
                    setFrom(
                      subDays(
                        new Date(),
                        days,
                      ),
                    );
                    setTo(undefined);
                  }}
                >
                  {days}d
                </Button>
              );
            })}

            <DatePick
              label="From"
              value={from}
              onChange={setFrom}
            />

            <DatePick
              label="To"
              value={to}
              onChange={setTo}
            />

            {(from || to) && (
              <button
                type="button"
                onClick={() => {
                  setFrom(undefined);
                  setTo(undefined);
                }}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.018] text-slate-600 transition hover:border-rose-400/15 hover:text-rose-400"
              >
                <X className="h-3 w-3" />
              </button>
            )}

            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.018] px-2.5 text-[8px] text-slate-500 hover:border-cyan-400/15 hover:bg-white/[0.035] hover:text-cyan-300"
              onClick={handleReload}
            >
              <RefreshCw
                className={cn(
                  "h-3 w-3",
                  refreshing &&
                    "animate-spin",
                )}
              />

              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* =====================================================
          RANGE / SYSTEM STATUS
      ===================================================== */}

      <div className="report-animate report-delay-1 mb-4 grid gap-2 sm:grid-cols-3">
        <StatusStrip
          icon={Clock3}
          label="Reporting period"
          value={activeRangeLabel}
          tone="cyan"
        />

        <StatusStrip
          icon={Activity}
          label="Data source"
          value="Live operational records"
          tone="violet"
        />

        <StatusStrip
          icon={CheckCircle2}
          label="Data integrity"
          value={
            hasData
              ? "Reporting data available"
              : "Awaiting business activity"
          }
          tone={
            hasData
              ? "emerald"
              : "amber"
          }
        />
      </div>

      {/* =====================================================
          EMPTY STATE
      ===================================================== */}

      {!hasData && (
        <div className="report-animate report-delay-2 mb-5 rounded-xl border border-dashed border-white/[0.08] bg-transparent px-5 py-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-cyan-400/10 bg-cyan-400/[0.025]">
            <BarChart3 className="h-5 w-5 text-cyan-400/70" />
          </div>

          <p className="mt-4 text-[11px] font-medium text-slate-300">
            No business data to report on yet
          </p>

          <p className="mx-auto mt-1.5 max-w-md text-[9px] leading-5 text-slate-600">
            Reports populate automatically as leads,
            opportunities, work, payments and team
            activity are captured in RST Business OS.
          </p>

          <div className="mx-auto mt-5 flex max-w-xs items-center gap-1">
            <div className="h-px flex-1 bg-white/[0.05]" />
            <Zap className="h-3 w-3 text-cyan-500/40" />
            <div className="h-px flex-1 bg-white/[0.05]" />
          </div>
        </div>
      )}

      {/* =====================================================
          REPORT NAVIGATION
      ===================================================== */}

      <Tabs
        defaultValue={
          isAdmin
            ? "sales"
            : "operations"
        }
      >
        <div className="report-animate report-delay-2 mb-4 flex flex-col gap-3 border-b border-white/[0.055] pb-3 sm:flex-row sm:items-center sm:justify-between">
          <TabsList className="h-auto gap-1 rounded-xl border border-white/[0.055] bg-transparent p-1">
            {isAdmin && (
              <TabsTrigger
                value="sales"
                className="
                  gap-1.5 rounded-lg px-3 py-2
                  text-[8px] font-medium
                  text-slate-600
                  data-[state=active]:border
                  data-[state=active]:border-cyan-400/15
                  data-[state=active]:bg-cyan-400/[0.055]
                  data-[state=active]:text-cyan-300
                "
              >
                <Handshake className="h-3 w-3" />
                Sales
              </TabsTrigger>
            )}

            <TabsTrigger
              value="operations"
              className="
                gap-1.5 rounded-lg px-3 py-2
                text-[8px] font-medium
                text-slate-600
                data-[state=active]:border
                data-[state=active]:border-blue-400/15
                data-[state=active]:bg-blue-400/[0.055]
                data-[state=active]:text-blue-300
              "
            >
              <Factory className="h-3 w-3" />
              Operations
            </TabsTrigger>

            {isAdmin && (
              <TabsTrigger
                value="finance"
                className="
                  gap-1.5 rounded-lg px-3 py-2
                  text-[8px] font-medium
                  text-slate-600
                  data-[state=active]:border
                  data-[state=active]:border-violet-400/15
                  data-[state=active]:bg-violet-400/[0.055]
                  data-[state=active]:text-violet-300
                "
              >
                <DollarSign className="h-3 w-3" />
                Finance
              </TabsTrigger>
            )}

            <TabsTrigger
              value="people"
              className="
                gap-1.5 rounded-lg px-3 py-2
                text-[8px] font-medium
                text-slate-600
                data-[state=active]:border
                data-[state=active]:border-emerald-400/15
                data-[state=active]:bg-emerald-400/[0.055]
                data-[state=active]:text-emerald-300
              "
            >
              <Users className="h-3 w-3" />

              {isAdmin
                ? "People"
                : "My performance"}
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2 px-1">
            <Gauge className="h-3 w-3 text-slate-700" />

            <span className="text-[7px] uppercase tracking-[0.14em] text-slate-700">
              Analytics engine
            </span>

            <span className="h-1 w-1 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,.6)]" />
          </div>
        </div>

        {/* ===================================================
            SALES
        =================================================== */}

        {isAdmin && (
          <TabsContent
            value="sales"
            className="report-animate mt-0 outline-none"
          >
            <ReportSectionHeader
              icon={Handshake}
              title="Sales Intelligence"
              subtitle="Acquisition, opportunities and commercial performance"
              tone="cyan"
            />

            <div className="mt-3">
              <SalesReport data={sales} />
            </div>
          </TabsContent>
        )}

        {/* ===================================================
            OPERATIONS
        =================================================== */}

        <TabsContent
          value="operations"
          className="report-animate mt-0 outline-none"
        >
          <ReportSectionHeader
            icon={Factory}
            title="Operations Intelligence"
            subtitle="Workflow execution, delivery and operational throughput"
            tone="blue"
          />

          <div className="mt-3">
            <OperationsReport data={ops} />
          </div>
        </TabsContent>

        {/* ===================================================
            FINANCE
        =================================================== */}

        {isAdmin && (
          <TabsContent
            value="finance"
            className="report-animate mt-0 outline-none"
          >
            <ReportSectionHeader
              icon={DollarSign}
              title="Financial Intelligence"
              subtitle="Revenue, collections and financial performance"
              tone="violet"
            />

            <div className="mt-3">
              <FinanceReport data={finance} />
            </div>
          </TabsContent>
        )}

        {/* ===================================================
            PEOPLE
        =================================================== */}

        <TabsContent
          value="people"
          className="report-animate mt-0 outline-none"
        >
          <ReportSectionHeader
            icon={Users}
            title={
              isAdmin
                ? "People Intelligence"
                : "My Performance"
            }
            subtitle={
              isAdmin
                ? "Team workload, productivity and execution"
                : "Your workload, productivity and execution"
            }
            tone="emerald"
          />

          <div className="mt-3">
            <PeopleReport
              people={visiblePeople}
              currentUserId={user?.id}
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* =====================================================
          FOOTER SYSTEM BAR
      ===================================================== */}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.045] pt-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-3 w-3 text-cyan-500/50" />

          <span className="text-[7px] uppercase tracking-[0.16em] text-slate-700">
            RST Business Intelligence Layer
          </span>
        </div>

        <div className="flex items-center gap-3 text-[7px] uppercase tracking-[0.12em] text-slate-700">
          <span>Realtime</span>
          <span className="h-1 w-1 rounded-full bg-slate-700" />
          <span>Supabase</span>
          <span className="h-1 w-1 rounded-full bg-slate-700" />
          <span>Verified Data</span>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   STATUS STRIP
========================================================= */

function StatusStrip({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  tone:
    | "cyan"
    | "violet"
    | "emerald"
    | "amber";
}) {
  const tones = {
    cyan: {
      border: "border-cyan-400/10",
      bg: "bg-cyan-400/[0.018]",
      icon: "text-cyan-400",
    },

    violet: {
      border: "border-violet-400/10",
      bg: "bg-violet-400/[0.018]",
      icon: "text-violet-400",
    },

    emerald: {
      border: "border-emerald-400/10",
      bg: "bg-emerald-400/[0.018]",
      icon: "text-emerald-400",
    },

    amber: {
      border: "border-amber-400/10",
      bg: "bg-amber-400/[0.018]",
      icon: "text-amber-400",
    },
  };

  const style = tones[tone];

  return (
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-lg border px-3 py-2",
        style.border,
        style.bg,
      )}
    >
      <Icon
        className={cn(
          "h-3 w-3",
          style.icon,
        )}
      />

      <div className="min-w-0">
        <div className="text-[7px] uppercase tracking-[0.12em] text-slate-700">
          {label}
        </div>

        <div className="mt-0.5 truncate text-[8px] font-medium text-slate-500">
          {value}
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   REPORT SECTION HEADER
========================================================= */

function ReportSectionHeader({
  icon: Icon,
  title,
  subtitle,
  tone,
}: {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  tone:
    | "cyan"
    | "blue"
    | "violet"
    | "emerald";
}) {
  const styles = {
    cyan: {
      border: "border-cyan-400/10",
      bg: "bg-cyan-400/[0.025]",
      icon: "text-cyan-300",
      glow: "bg-cyan-400/[0.025]",
    },

    blue: {
      border: "border-blue-400/10",
      bg: "bg-blue-400/[0.025]",
      icon: "text-blue-300",
      glow: "bg-blue-400/[0.025]",
    },

    violet: {
      border: "border-violet-400/10",
      bg: "bg-violet-400/[0.025]",
      icon: "text-violet-300",
      glow: "bg-violet-400/[0.025]",
    },

    emerald: {
      border: "border-emerald-400/10",
      bg: "bg-emerald-400/[0.025]",
      icon: "text-emerald-300",
      glow: "bg-emerald-400/[0.025]",
    },
  };

  const style = styles[tone];

  return (
    <div
      className={cn(
        "relative flex items-center gap-3 overflow-hidden rounded-xl border px-4 py-3",
        style.border,
        style.bg,
      )}
    >
      <div
        className={cn(
          "absolute -right-10 -top-10 h-24 w-24 rounded-full blur-3xl",
          style.glow,
        )}
      />

      <div
        className={cn(
          "relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border",
          style.border,
        )}
      >
        <Icon
          className={cn(
            "h-3.5 w-3.5",
            style.icon,
          )}
        />
      </div>

      <div className="relative min-w-0">
        <h2 className="text-[10px] font-semibold tracking-wide text-slate-300">
          {title}
        </h2>

        <p className="mt-0.5 text-[8px] text-slate-600">
          {subtitle}
        </p>
      </div>

      <div className="relative ml-auto hidden items-center gap-1.5 sm:flex">
        <span className="h-1 w-1 animate-pulse rounded-full bg-emerald-400" />

        <span className="text-[7px] uppercase tracking-[0.14em] text-slate-700">
          Live
        </span>
      </div>
    </div>
  );
}

/* =========================================================
   DATE PICKER
========================================================= */

function DatePick({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: Date;
  onChange: (d?: Date) => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-7 gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.018] px-2.5 text-[8px] text-slate-500 transition-all hover:border-cyan-400/15 hover:bg-white/[0.035] hover:text-slate-300",
            value &&
              "border-cyan-400/10 text-cyan-300",
          )}
        >
          <CalendarDays className="h-3 w-3" />

          {value
            ? format(
                value,
                "MMM d, yyyy",
              )
            : label}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-auto border-white/[0.08] bg-[#0d1219] p-0 shadow-2xl"
        align="end"
      >
        <Calendar
          mode="single"
          selected={value}
          onSelect={onChange}
          initialFocus
          className="pointer-events-auto p-3"
        />
      </PopoverContent>
    </Popover>
  );
}