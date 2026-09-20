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
  Radio,
  RefreshCw,
  Sparkles,
  Users,
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

/* -------------------------------------------------------
   BUSINESS OS GLASS CARD CONTAINER
------------------------------------------------------- */
function GlassCard({
  children,
  className = "",
  title,
  subtitle,
  action,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
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

      {(title || subtitle || action) && (
        <div className="relative flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.085] bg-white/[0.02] px-6 py-3.5">
          <div>
            {title && (
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-300 sm:text-xs">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="mt-0.5 text-[10px] text-slate-400">
                {subtitle}
              </p>
            )}
          </div>
          {action}
        </div>
      )}

      {children}
    </div>
  );
}

export default function Reports() {
  const { isAdmin, user, organization } = useAuth();

  const [from, setFrom] = useState<Date | undefined>();
  const [to, setTo] = useState<Date | undefined>();
  const [refreshing, setRefreshing] = useState(false);

  const range: ReportRange = useMemo(
    () => ({
      from: from ?? null,
      to: to ?? null,
    }),
    [from, to]
  );

  const { loading, reload, sales, ops, finance, people, hasData } =
    useReporting(range);

  const visiblePeople = isAdmin
    ? people
    : people.filter((p) => p.userId === user?.id);

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
      setTimeout(() => setRefreshing(false), 450);
    }
  };

  if (loading) {
    return <PageSkeleton />;
  }

  return (
    <div className="reports-command-center min-h-full space-y-5 pb-8 text-slate-200">
      <style>{`
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
          HEADER BAR
      ===================================================== */}
      <div className="flex flex-col gap-4 border-b border-white/[0.065] pb-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
              Reports & Analytics
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-300">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              Live
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-slate-400">
            Operational intelligence for{" "}
            <span className="text-slate-200 font-medium">
              {organization?.name || "your workspace"}
            </span>
          </p>
        </div>

        {/* CONTROLS */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="hidden items-center gap-1.5 text-[10px] text-slate-400 md:flex">
            <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
            <span>Period:</span>
          </div>

          {PRESETS.map((days) => {
            const active =
              from &&
              !to &&
              format(from, "yyyy-MM-dd") ===
                format(subDays(new Date(), days), "yyyy-MM-dd");

            return (
              <Button
                key={days}
                size="sm"
                variant="ghost"
                className={cn(
                  "h-8 rounded-lg border px-3 text-[11px] font-semibold transition-all",
                  active
                    ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-300"
                    : "border-white/[0.08] bg-[#0b0e14] text-slate-300 hover:bg-white/[0.06] hover:text-white"
                )}
                onClick={() => {
                  setFrom(subDays(new Date(), days));
                  setTo(undefined);
                }}
              >
                {days}d
              </Button>
            );
          })}

          <DatePick label="From" value={from} onChange={setFrom} />
          <DatePick label="To" value={to} onChange={setTo} />

          {(from || to) && (
            <button
              type="button"
              onClick={() => {
                setFrom(undefined);
                setTo(undefined);
              }}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] bg-[#0b0e14] text-slate-400 transition hover:border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-300"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}

          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 rounded-lg border border-white/[0.08] bg-[#0b0e14] px-3 text-[11px] font-semibold text-slate-200 hover:bg-white/[0.06] hover:text-white"
            onClick={handleReload}
          >
            <RefreshCw
              className={cn("h-3.5 w-3.5 text-slate-400", refreshing && "animate-spin")}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* =====================================================
          RANGE / SYSTEM STATUS STRIPS
      ===================================================== */}
      <div className="grid gap-3 sm:grid-cols-3">
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
            hasData ? "Reporting data available" : "Awaiting business activity"
          }
          tone={hasData ? "emerald" : "amber"}
        />
      </div>

      {/* =====================================================
          EMPTY STATE
      ===================================================== */}
      {!hasData && (
        <GlassCard className="p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.02]">
            <BarChart3 className="h-6 w-6 text-slate-400" />
          </div>

          <p className="mt-4 text-xs font-semibold text-slate-200">
            No business data to report on yet
          </p>

          <p className="mx-auto mt-1.5 max-w-md text-[11px] leading-relaxed text-slate-400">
            Reports populate automatically as leads, opportunities, work, payments
            and team activity are captured in RST Business OS.
          </p>

          <div className="mx-auto mt-5 flex max-w-xs items-center gap-2">
            <div className="h-px flex-1 bg-white/[0.08]" />
            <Zap className="h-3.5 w-3.5 text-cyan-400" />
            <div className="h-px flex-1 bg-white/[0.08]" />
          </div>
        </GlassCard>
      )}

      {/* =====================================================
          REPORT NAVIGATION & TABS
      ===================================================== */}
      <Tabs defaultValue={isAdmin ? "sales" : "operations"}>
        <div className="flex flex-col gap-3 border-b border-white/[0.065] pb-3 sm:flex-row sm:items-center sm:justify-between">
          <TabsList className="h-auto gap-1.5 rounded-xl border border-white/[0.08] bg-[#0b0e14] p-1 text-slate-400">
            {isAdmin && (
              <TabsTrigger
                value="sales"
                className="gap-2 rounded-lg px-3.5 py-1.5 text-[11px] font-semibold text-slate-400 transition-all data-[state=active]:border data-[state=active]:border-cyan-400/30 data-[state=active]:bg-cyan-400/10 data-[state=active]:text-cyan-300"
              >
                <Handshake className="h-3.5 w-3.5" />
                Sales
              </TabsTrigger>
            )}

            <TabsTrigger
              value="operations"
              className="gap-2 rounded-lg px-3.5 py-1.5 text-[11px] font-semibold text-slate-400 transition-all data-[state=active]:border data-[state=active]:border-blue-400/30 data-[state=active]:bg-blue-400/10 data-[state=active]:text-blue-300"
            >
              <Factory className="h-3.5 w-3.5" />
              Operations
            </TabsTrigger>

            {isAdmin && (
              <TabsTrigger
                value="finance"
                className="gap-2 rounded-lg px-3.5 py-1.5 text-[11px] font-semibold text-slate-400 transition-all data-[state=active]:border data-[state=active]:border-violet-400/30 data-[state=active]:bg-violet-400/10 data-[state=active]:text-violet-300"
              >
                <DollarSign className="h-3.5 w-3.5" />
                Finance
              </TabsTrigger>
            )}

            <TabsTrigger
              value="people"
              className="gap-2 rounded-lg px-3.5 py-1.5 text-[11px] font-semibold text-slate-400 transition-all data-[state=active]:border data-[state=active]:border-emerald-400/30 data-[state=active]:bg-emerald-400/10 data-[state=active]:text-emerald-300"
            >
              <Users className="h-3.5 w-3.5" />
              {isAdmin ? "People" : "My performance"}
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2 px-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            <Gauge className="h-3.5 w-3.5 text-cyan-400" />
            <span>Analytics engine</span>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </div>
        </div>

        {/* ===================================================
            SALES
        =================================================== */}
        {isAdmin && (
          <TabsContent value="sales" className="mt-4 outline-none">
            <ReportSectionHeader
              icon={Handshake}
              title="Sales Intelligence"
              subtitle="Acquisition, opportunities and commercial performance"
              tone="cyan"
            />
            <div className="mt-4">
              <SalesReport data={sales} />
            </div>
          </TabsContent>
        )}

        {/* ===================================================
            OPERATIONS
        =================================================== */}
        <TabsContent value="operations" className="mt-4 outline-none">
          <ReportSectionHeader
            icon={Factory}
            title="Operations Intelligence"
            subtitle="Workflow execution, delivery and operational throughput"
            tone="blue"
          />
          <div className="mt-4">
            <OperationsReport data={ops} />
          </div>
        </TabsContent>

        {/* ===================================================
            FINANCE
        =================================================== */}
        {isAdmin && (
          <TabsContent value="finance" className="mt-4 outline-none">
            <ReportSectionHeader
              icon={DollarSign}
              title="Financial Intelligence"
              subtitle="Revenue, collections and financial performance"
              tone="violet"
            />
            <div className="mt-4">
              <FinanceReport data={finance} />
            </div>
          </TabsContent>
        )}

        {/* ===================================================
            PEOPLE
        =================================================== */}
        <TabsContent value="people" className="mt-4 outline-none">
          <ReportSectionHeader
            icon={Users}
            title={isAdmin ? "People Intelligence" : "My Performance"}
            subtitle={
              isAdmin
                ? "Team workload, productivity and execution"
                : "Your workload, productivity and execution"
            }
            tone="emerald"
          />
          <div className="mt-4">
            <PeopleReport people={visiblePeople} currentUserId={user?.id} />
          </div>
        </TabsContent>
      </Tabs>

      {/* =====================================================
          FOOTER SYSTEM BAR
      ===================================================== */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.065] pt-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
          <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            RST Business Intelligence Layer
          </span>
        </div>

        <div className="flex items-center gap-3 font-mono text-[10px] font-medium text-slate-400">
          <span>Realtime</span>
          <span className="h-1 w-1 rounded-full bg-slate-600" />
          <span>Supabase</span>
          <span className="h-1 w-1 rounded-full bg-slate-600" />
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
  tone: "cyan" | "violet" | "emerald" | "amber";
}) {
  const tones = {
    cyan: { icon: "text-cyan-400" },
    violet: { icon: "text-violet-400" },
    emerald: { icon: "text-emerald-400" },
    amber: { icon: "text-amber-400" },
  };

  return (
    <GlassCard className="p-3.5">
      <div className="flex items-center gap-3">
        <Icon className={cn("h-4 w-4 shrink-0", tones[tone].icon)} />
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            {label}
          </div>
          <div className="mt-0.5 truncate text-[11px] font-medium text-slate-200">
            {value}
          </div>
        </div>
      </div>
    </GlassCard>
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
  tone: "cyan" | "blue" | "violet" | "emerald";
}) {
  const styles = {
    cyan: { icon: "text-cyan-400" },
    blue: { icon: "text-blue-400" },
    violet: { icon: "text-violet-400" },
    emerald: { icon: "text-emerald-400" },
  };

  return (
    <GlassCard className="px-5 py-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.02]">
            <Icon className={cn("h-4 w-4", styles[tone].icon)} />
          </div>

          <div>
            <h2 className="text-sm font-bold text-white tracking-wide">{title}</h2>
            <p className="mt-0.5 text-[11px] text-slate-400">{subtitle}</p>
          </div>
        </div>

        <div className="hidden items-center gap-1.5 sm:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-slate-400">
            Live
          </span>
        </div>
      </div>
    </GlassCard>
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
            "h-8 gap-1.5 rounded-lg border border-white/[0.08] bg-[#0b0e14] px-3 text-[11px] font-semibold text-slate-200 transition-all hover:bg-white/[0.06] hover:text-white",
            value && "border-cyan-400/40 bg-cyan-400/10 text-cyan-300"
          )}
        >
          <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
          {value ? format(value, "MMM d, yyyy") : label}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-auto border-white/[0.085] bg-[#10151d] p-0 text-slate-200 shadow-[0_18px_60px_rgba(0,0,0,0.4)]"
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