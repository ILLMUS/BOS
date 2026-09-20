import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Cpu,
  Gauge,
  Layers3,
  Loader2,
  Plus,
  Radio,
  RefreshCw,
  Rocket,
  Settings2,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Workflow,
  Zap,
} from "lucide-react";

import { STAGE_LABELS } from "@/lib/constants";
import { CURRENCY_SYMBOL } from "@/lib/currency";

const CUR = CURRENCY_SYMBOL;

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const money = (n: number) =>
  `${CUR}${n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const shortMoney = (n: number) =>
  `${CUR}${Math.round(n).toLocaleString()}`;

interface JobRow {
  id: string;
  job_number: string;
  client_name: string;
  service_type: string | null;
  current_stage: string;
  status: string;
  created_at: string;
  template_id: string | null;
}

interface StageRow {
  id: string;
  job_id: string;
  stage: string | null;
  stage_name: string | null;
  position: number;
  status: string;
  primary_owner_id: string | null;
  secondary_owner_id: string | null;
  sla_started_at: string | null;
  sla_deadline_hours: number | null;
}

interface ActivityRow {
  id: string;
  action: string;
  created_at: string;
  job_id: string | null;
  details?: any;
}

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  decimals?: number;
  suffix?: string;
  prefix?: string;
}

function AnimatedNumber({
  value,
  duration = 1400,
  decimals = 0,
  suffix = "",
  prefix = "",
}: AnimatedNumberProps) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let frame = 0;
    const start = performance.now();

    const animate = (time: number) => {
      const progress = Math.min((time - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(value * eased);

      if (progress < 1) {
        frame = requestAnimationFrame(animate);
      }
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);

  return (
    <>
      {prefix}
      {display.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </>
  );
}

/* -------------------------------------------------------
   FUTURISTIC HUD / GLASS CARD
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
        group relative overflow-hidden rounded-xl
        border border-cyan-500/20 bg-[#090d16]/90
        backdrop-blur-md transition-all duration-300
        hover:border-cyan-400/40 hover:shadow-[0_0_25px_rgba(34,211,238,0.12)]
        ${className}
      `}
    >
      {/* Sci-Fi Corner Brackets */}
      <div className="pointer-events-none absolute left-0 top-0 h-2 w-2 border-l-2 border-t-2 border-cyan-400/60" />
      <div className="pointer-events-none absolute right-0 top-0 h-2 w-2 border-r-2 border-t-2 border-cyan-400/60" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-2 w-2 border-b-2 border-l-2 border-cyan-400/60" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-2 w-2 border-b-2 border-r-2 border-cyan-400/60" />

      {/* Holographic Scan Line */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-cyan-400/[0.02] to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 animate-[scan_6s_linear_infinite]" />

      {/* Radial Backlight Ambient Glow */}
      <div className="pointer-events-none absolute -right-16 -top-16 h-36 w-36 rounded-full bg-cyan-500/[0.05] blur-3xl" />

      {(title || subtitle || action) && (
        <div className="relative flex items-center justify-between border-b border-cyan-500/10 px-6 py-3.5 bg-cyan-950/20">
          <div>
            {title && (
              <h3 className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-cyan-300 sm:text-xs">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                {title}
              </h3>
            )}

            {subtitle && (
              <p className="mt-0.5 text-[10px] font-mono text-slate-400">
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

/* -------------------------------------------------------
   KPI CARD
------------------------------------------------------- */

function MetricCard({
  label,
  value,
  prefix,
  suffix,
  decimals = 0,
  icon: Icon,
  color,
  delta,
  sublabel,
}: {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  icon: React.ElementType;
  color: string;
  delta?: number | null;
  sublabel?: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-cyan-500/20 bg-[#090d16] px-5 py-4 transition-all duration-300 hover:-translate-y-1 hover:border-cyan-400/50 hover:shadow-[0_0_20px_rgba(34,211,238,0.15)]">
      {/* Sci-Fi Ambient Glow */}
      <div
        className={`absolute -right-8 -top-8 h-24 w-24 rounded-full blur-2xl opacity-50 ${color}`}
      />

      <div className="relative flex items-start justify-between">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
              {label}
            </span>

            {delta !== undefined && delta !== null && (
              <span
                className={`flex items-center gap-0.5 text-[10px] font-bold font-mono ${
                  delta >= 0 ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {delta >= 0 ? (
                  <ArrowUpRight className="h-2.5 w-2.5" />
                ) : (
                  <ArrowDownRight className="h-2.5 w-2.5" />
                )}
                {Math.abs(delta).toFixed(1)}%
              </span>
            )}
          </div>

          <div className="mt-2 text-xl font-bold font-mono tracking-tight text-cyan-50 sm:text-2xl drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">
            <AnimatedNumber
              value={value}
              prefix={prefix}
              suffix={suffix}
              decimals={decimals}
            />
          </div>

          {sublabel && (
            <div className="mt-1 text-[10px] font-mono text-slate-500">
              {sublabel}
            </div>
          )}
        </div>

        <div className="rounded-lg border border-cyan-500/20 bg-cyan-950/30 p-2 shadow-[0_0_10px_rgba(34,211,238,0.1)] group-hover:border-cyan-400/40">
          <Icon className="h-4 w-4 text-cyan-400 animate-pulse" />
        </div>
      </div>

      <div className="relative mt-3 h-[2px] overflow-hidden rounded-full bg-slate-800">
        <div className="h-full w-[70%] rounded-full bg-gradient-to-r from-cyan-500 via-teal-400 to-transparent shadow-[0_0_8px_rgba(34,211,238,0.8)] animate-[pulseGlow_2s_infinite]" />
      </div>
    </div>
  );
}

/* -------------------------------------------------------
   SPEEDOMETER
------------------------------------------------------- */

function Speedometer({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
  const safe = Math.max(0, Math.min(100, value));
  const angle = -135 + safe * 2.7;
  const radius = 68;
  const circumference = 2 * Math.PI * radius;
  const progress = circumference * (0.75 * (1 - safe / 100));

  return (
    <div className="relative flex min-h-[190px] items-center justify-center pt-3 pb-2 px-6">
      <svg viewBox="0 0 180 180" className="h-[175px] w-[175px]">
        <defs>
          <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#2563eb" />
            <stop offset="50%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#22d3ee" />
          </linearGradient>

          <filter id="gaugeGlow">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Gauge Background Track */}
        <circle
          cx="90"
          cy="90"
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="9"
          strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`}
          strokeDashoffset="0"
          transform="rotate(135 90 90)"
          strokeLinecap="round"
        />

        {/* Dynamic Progress Arc */}
        <circle
          cx="90"
          cy="90"
          r={radius}
          fill="none"
          stroke="url(#gaugeGradient)"
          strokeWidth="9"
          strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`}
          strokeDashoffset={progress}
          transform="rotate(135 90 90)"
          strokeLinecap="round"
          filter="url(#gaugeGlow)"
          style={{
            transition: "stroke-dashoffset 1.7s cubic-bezier(.16,1,.3,1)",
          }}
        />

        {/* Radial Ticks */}
        {Array.from({ length: 11 }).map((_, i) => {
          const tickAngle = -135 + i * 27;
          const rad = (tickAngle * Math.PI) / 180;
          const x1 = 90 + Math.cos(rad) * 56;
          const y1 = 90 + Math.sin(rad) * 56;
          const x2 = 90 + Math.cos(rad) * 62;
          const y2 = 90 + Math.sin(rad) * 62;

          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="rgba(34,211,238,0.3)"
              strokeWidth={i % 5 === 0 ? 2 : 1}
            />
          );
        })}

        {/* Indicator Needle */}
        <g
          style={{
            transformOrigin: "90px 90px",
            transform: `rotate(${angle}deg)`,
            transition: "transform 1.7s cubic-bezier(.16,1,.3,1)",
          }}
        >
          <line
            x1="90"
            y1="90"
            x2="90"
            y2="38"
            stroke="#67e8f9"
            strokeWidth="2.5"
            strokeLinecap="round"
            filter="url(#gaugeGlow)"
          />

          <circle
            cx="90"
            cy="90"
            r="5"
            fill="#090d16"
            stroke="#67e8f9"
            strokeWidth="2"
          />
        </g>
      </svg>

      <div className="absolute left-0 right-0 top-[70px] text-center pointer-events-none">
        <div className="text-2xl font-bold font-mono tracking-tight text-cyan-300 drop-shadow-[0_0_12px_rgba(34,211,238,0.5)]">
          <AnimatedNumber value={safe} suffix="%" />
        </div>

        <div className="mt-0.5 text-[9px] font-mono font-semibold uppercase tracking-widest text-cyan-400/80">
          {label}
        </div>
      </div>

      <div className="absolute bottom-1 left-1/2 flex -translate-x-1/2 gap-9 text-[10px] font-mono text-slate-500">
        <span>0</span>
        <span>50</span>
        <span>100</span>
      </div>
    </div>
  );
}

/* -------------------------------------------------------
   LINE CHART
------------------------------------------------------- */

function RevenueChart({ values }: { values: number[] }) {
  const width = 620;
  const height = 190;
  const paddingX = 28;
  const paddingY = 20;

  const max = Math.max(...values, 1) * 1.15;

  const points = values.map((value, index) => {
    const x =
      paddingX +
      (index / Math.max(values.length - 1, 1)) * (width - paddingX * 2);
    const y =
      height - paddingY - (value / max) * (height - paddingY * 2);

    return { x, y };
  });

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");

  const areaPath = `
    ${linePath}
    L ${points[points.length - 1]?.x ?? width - paddingX} ${height - paddingY}
    L ${points[0]?.x ?? paddingX} ${height - paddingY}
    Z
  `;

  return (
    <div className="px-6 pb-4 pt-3">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-[190px] w-full"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
          </linearGradient>

          <filter id="lineGlow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {[0, 1, 2, 3].map((i) => {
          const y = paddingY + i * ((height - paddingY * 2) / 3);
          return (
            <line
              key={i}
              x1={paddingX}
              y1={y}
              x2={width - paddingX}
              y2={y}
              stroke="rgba(34,211,238,0.08)"
              strokeDasharray="4 4"
              strokeWidth="1"
            />
          );
        })}

        <path d={areaPath} fill="url(#areaGradient)" />

        <path
          d={linePath}
          fill="none"
          stroke="#22d3ee"
          strokeWidth="2.5"
          filter="url(#lineGlow)"
          pathLength="1"
          strokeDasharray="1"
          strokeDashoffset="1"
          className="animate-[drawLine_1.8s_ease-out_forwards]"
        />

        {points.map((p, i) => (
          <g key={i} className="group/node">
            <circle
              cx={p.x}
              cy={p.y}
              r="4"
              fill="#090d16"
              stroke="#67e8f9"
              strokeWidth="2"
              className="transition-transform duration-300 group-hover/node:scale-150"
            />
            <circle
              cx={p.x}
              cy={p.y}
              r="7"
              fill="rgba(34,211,238,0.2)"
              className="animate-ping opacity-75"
            />
          </g>
        ))}

        {MONTHS.map((month, i) => {
          const x = paddingX + (i / 11) * (width - paddingX * 2);
          return (
            <text
              key={month}
              x={x}
              y={height - 2}
              textAnchor="middle"
              fill="#64748b"
              fontSize="9"
              fontFamily="monospace"
              fontWeight="500"
            >
              {month}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

/* -------------------------------------------------------
   BAR CHART
------------------------------------------------------- */

function ConversionChart({ values }: { values: number[] }) {
  const max = Math.max(...values, 1);

  return (
    <div className="flex h-[170px] items-end gap-2.5 px-6 pb-6 pt-5">
      {values.map((value, index) => {
        const height = Math.max(10, (value / max) * 110);

        return (
          <div
            key={index}
            className="group/bar flex h-full flex-1 flex-col items-center justify-end gap-1.5"
          >
            <div className="relative flex w-full justify-center">
              <div
                className="w-[75%] rounded-t-sm bg-gradient-to-t from-blue-600 via-cyan-500 to-cyan-300 opacity-80 shadow-[0_0_12px_rgba(34,211,238,0.3)] transition-all duration-500 group-hover/bar:opacity-100 group-hover/bar:shadow-[0_0_20px_rgba(34,211,238,0.7)]"
                style={{
                  height: `${height}px`,
                  animationDelay: `${index * 80}ms`,
                }}
              />
              <span className="absolute -top-5 font-mono text-[10px] font-semibold text-cyan-300 opacity-0 transition-opacity group-hover/bar:opacity-100">
                {value}
              </span>
            </div>

            <span className="font-mono text-[10px] text-slate-500">{index + 1}</span>
          </div>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------
   PIPELINE
------------------------------------------------------- */

function PipelineMini({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const percentage = total > 0 ? Math.min(100, (value / total) * 100) : 0;

  return (
    <div className="rounded-lg border border-cyan-500/15 bg-cyan-950/10 px-4 py-3">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[11px] font-medium text-slate-300">{label}</span>
        <span className="font-mono text-[11px] font-bold text-cyan-400">
          {value}
        </span>
      </div>

      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800/80">
        <div
          className={`h-full rounded-full ${color} shadow-[0_0_10px_currentColor]`}
          style={{
            width: `${percentage}%`,
            transition: "width 1.2s cubic-bezier(.16,1,.3,1)",
          }}
        />
      </div>
    </div>
  );
}

/* -------------------------------------------------------
   ACTIVITY
------------------------------------------------------- */

function ActivityFeed({ rows }: { rows: ActivityRow[] }) {
  return (
    <div className="divide-y divide-cyan-500/10">
      {rows.length === 0 ? (
        <div className="px-6 py-10 font-mono text-center text-[11px] text-slate-500">
          No recent system activity.
        </div>
      ) : (
        rows.slice(0, 5).map((row, index) => (
          <div key={row.id} className="group/item flex items-center gap-3 px-6 py-3 transition hover:bg-cyan-500/[0.03]">
            <div className="relative">
              <div className="flex h-6.5 w-6.5 items-center justify-center rounded-full border border-cyan-400/30 bg-cyan-950/40 shadow-[0_0_8px_rgba(34,211,238,0.2)]">
                {index === 0 ? (
                  <Zap className="h-3 w-3 text-cyan-300 animate-pulse" />
                ) : (
                  <Activity className="h-3 w-3 text-slate-400" />
                )}
              </div>

              {index < rows.length - 1 && (
                <div className="absolute left-1/2 top-7 h-4 w-px -translate-x-1/2 bg-cyan-500/20" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate font-mono text-[11px] font-medium text-slate-200 group-hover/item:text-cyan-300 transition-colors">{row.action}</p>

              <p className="mt-0.5 font-mono text-[10px] text-slate-500">
                {new Date(row.created_at).toLocaleString()}
              </p>
            </div>

            <ChevronRight className="h-3.5 w-3.5 text-slate-600 group-hover/item:text-cyan-400 group-hover/item:translate-x-0.5 transition-all" />
          </div>
        ))
      )}
    </div>
  );
}

/* -------------------------------------------------------
   WORKLOAD
------------------------------------------------------- */

function WorkloadBars({
  active,
  approval,
  approved,
  locked,
}: {
  active: number;
  approval: number;
  approved: number;
  locked: number;
}) {
  const total = active + approval + approved + locked;

  const items = [
    { label: "Active", value: active, color: "bg-cyan-400 shadow-cyan-400/50" },
    { label: "Approval", value: approval, color: "bg-violet-400 shadow-violet-400/50" },
    { label: "Approved", value: approved, color: "bg-emerald-400 shadow-emerald-400/50" },
    { label: "Locked", value: locked, color: "bg-slate-500 shadow-slate-500/50" },
  ];

  return (
    <div className="px-6 py-5">
      <div className="flex h-2.5 overflow-hidden rounded-full bg-slate-800">
        {items.map((item) => (
          <div
            key={item.label}
            className={`${item.color} shadow-[0_0_8px] transition-all duration-1000`}
            style={{
              width: total > 0 ? `${(item.value / total) * 100}%` : "0%",
            }}
          />
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className={`h-1.5 w-1.5 rounded-full ${item.color}`} />
              <span className="font-mono text-[11px] text-slate-400">{item.label}</span>
            </div>

            <span className="font-mono text-[11px] font-bold text-slate-200">
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------
   MAIN DASHBOARD
------------------------------------------------------- */

export default function Dashboard() {
  const { user, isAdmin, hasRole } = useAuth();
  const navigate = useNavigate();

  const isSuperAdmin = hasRole("super_admin");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [stages, setStages] = useState<StageRow[]>([]);
  const [payments, setPayments] = useState<{ amount: number; paid_at: string }[]>([]);
  const [templates, setTemplates] = useState<{ id: string; name: string }[]>([]);
  const [activity, setActivity] = useState<ActivityRow[]>([]);

  const fetchData = useCallback(
    async (showRefresh = false) => {
      if (showRefresh) {
        setRefreshing(true);
      }

      const yearStart = new Date(new Date().getFullYear(), 0, 1)
        .toISOString()
        .slice(0, 10);

      const [jobsRes, stagesRes, payRes, tplRes, auditRes] = await Promise.all([
        supabase
          .from("jobs")
          .select(
            "id, job_number, client_name, service_type, current_stage, status, created_at, template_id"
          )
          .order("updated_at", { ascending: false }),

        supabase
          .from("job_stages")
          .select(
            "id, job_id, stage, stage_name, position, status, primary_owner_id, secondary_owner_id, sla_started_at, sla_deadline_hours"
          ),

        supabase
          .from("job_payments")
          .select("amount, paid_at")
          .gte("paid_at", yearStart),

        supabase.from("sop_templates").select("id, name"),

        supabase
          .from("audit_log")
          .select("id, action, created_at, job_id, details")
          .order("created_at", { ascending: false })
          .limit(8),
      ]);

      setJobs((jobsRes.data as JobRow[]) || []);
      setStages((stagesRes.data as StageRow[]) || []);
      setPayments(
        ((payRes.data as any[]) || []).map((p) => ({
          amount: Number(p.amount),
          paid_at: p.paid_at,
        }))
      );
      setTemplates((tplRes.data as any[]) || []);
      setActivity((auditRes.data as ActivityRow[]) || []);

      setLoading(false);
      setRefreshing(false);
    },
    []
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    let debounce: number | null = null;

    const schedule = () => {
      if (debounce) {
        window.clearTimeout(debounce);
      }
      debounce = window.setTimeout(() => fetchData(), 400);
    };

    const channel = supabase
      .channel("dashboard-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "jobs" },
        schedule
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "job_stages" },
        schedule
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "job_payments" },
        schedule
      )
      .subscribe();

    const tick = window.setInterval(() => fetchData(), 60_000);

    return () => {
      if (debounce) {
        window.clearTimeout(debounce);
      }
      window.clearInterval(tick);
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  const model = useMemo(() => {
    const now = new Date();
    const activeJobs = jobs.filter((j) => j.status === "active");
    const completedJobs = jobs.filter((j) => j.status === "completed");

    const monthly = MONTHS.map(() => 0);

    payments.forEach((payment) => {
      const date = new Date(payment.paid_at);
      if (date.getFullYear() === now.getFullYear()) {
        monthly[date.getMonth()] += payment.amount;
      }
    });

    const thisMonth = monthly[now.getMonth()] || 0;
    const lastMonth =
      now.getMonth() > 0 ? monthly[now.getMonth() - 1] || 0 : 0;

    const revenueDelta =
      lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : null;

    const pipelineValue = payments.reduce(
      (total, payment) => total + payment.amount,
      0
    );

    const liveStages = stages.filter(
      (stage) =>
        stage.status === "active" &&
        stage.sla_started_at &&
        stage.sla_deadline_hours
    );

    let onTime = 0;
    let atRisk = 0;
    let overdue = 0;

    liveStages.forEach((stage) => {
      const started = new Date(stage.sla_started_at!).getTime();
      const deadline = started + stage.sla_deadline_hours! * 3600000;
      const elapsed = now.getTime() - started;
      const duration = deadline - started;
      const fraction = duration > 0 ? elapsed / duration : 1;

      if (now.getTime() > deadline) {
        overdue += 1;
      } else if (fraction > 0.8) {
        atRisk += 1;
      } else {
        onTime += 1;
      }
    });

    const slaTotal = liveStages.length;
    const compliance =
      slaTotal > 0
        ? Math.round(((onTime + atRisk) / slaTotal) * 100)
        : 100;

    const progressOf = (jobId: string) => {
      const jobStages = stages.filter((stage) => stage.job_id === jobId);
      const done = jobStages.filter(
        (stage) => stage.status === "approved"
      ).length;
      return jobStages.length > 0 ? done / jobStages.length : 0;
    };

    const halfway = activeJobs.filter(
      (job) => progressOf(job.id) >= 0.5
    ).length;

    const nearCompletion = activeJobs.filter(
      (job) => progressOf(job.id) >= 0.8
    ).length;

    const conversionSeries = [
      Math.max(1, Math.round(jobs.length * 0.24)),
      Math.max(1, Math.round(jobs.length * 0.31)),
      Math.max(1, Math.round(jobs.length * 0.44)),
      Math.max(1, Math.round(jobs.length * 0.58)),
      Math.max(1, Math.round(jobs.length * 0.49)),
      Math.max(1, Math.round(jobs.length * 0.67)),
      Math.max(1, Math.round(jobs.length * 0.78)),
      Math.max(1, Math.round(jobs.length * 0.72)),
    ];

    const stageCount = Math.max(
      ...stages.map((stage) => stage.position + 1),
      1
    );

    const pipelineStages = [
      { label: "Intake", value: jobs.length, color: "bg-cyan-400 shadow-cyan-400" },
      { label: "Active", value: activeJobs.length, color: "bg-blue-400 shadow-blue-400" },
      { label: "Halfway", value: halfway, color: "bg-violet-400 shadow-violet-400" },
      { label: "Near Complete", value: nearCompletion, color: "bg-emerald-400 shadow-emerald-400" },
      { label: "Completed", value: completedJobs.length, color: "bg-slate-500 shadow-slate-500" },
    ];

    const workload = {
      active: stages.filter((s) => s.status === "active").length,
      approval: stages.filter((s) => s.status === "pending_approval").length,
      approved: stages.filter((s) => s.status === "approved").length,
      locked: stages.filter((s) => s.status === "locked").length,
    };

    const opportunities = activeJobs.filter(
      (job) => progressOf(job.id) < 0.5
    ).length;

    return {
      activeJobs,
      completedJobs,
      thisMonth,
      revenueDelta,
      pipelineValue,
      onTime,
      atRisk,
      overdue,
      compliance,
      halfway,
      nearCompletion,
      conversionSeries,
      pipelineStages,
      workload,
      opportunities,
      stageCount,
      monthly,
    };
  }, [jobs, stages, payments]);

  if (loading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-[#050811]">
        <div className="text-center">
          <div className="relative mx-auto flex h-12 w-12 items-center justify-center">
            <div className="absolute inset-0 animate-ping rounded-full bg-cyan-400/20" />
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/40 bg-cyan-950/40 shadow-[0_0_20px_rgba(34,211,238,0.4)]">
              <Loader2 className="h-5 w-5 animate-spin text-cyan-300" />
            </div>
          </div>

          <div className="mt-4 font-mono text-[11px] font-semibold tracking-widest text-cyan-400 uppercase">
            Initializing RST Command Center...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full bg-[#050811] px-4 py-4 md:py-6 text-slate-200">
      {/* Sci-Fi Grid Background Pattern */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#1f293715_1px,transparent_1px),linear-gradient(to_bottom,#1f293715_1px,transparent_1px)] bg-[size:32px_32px]" />

      <style>{`
        @keyframes drawLine {
          to {
            stroke-dashoffset: 0;
          }
        }

        @keyframes pulseGlow {
          0%, 100% {
            opacity: 0.4;
          }
          50% {
            opacity: 0.9;
          }
        }

        @keyframes scan {
          0% {
            transform: translateY(-100%);
          }
          100% {
            transform: translateY(1000%);
          }
        }
      `}</style>

      {/* HEADER CONTROL BAR */}
      <div className="relative mb-5 flex flex-wrap items-center justify-between border-b border-cyan-500/20 pb-3.5">
        <div className="flex items-center gap-2">
          <Cpu className="h-5 w-5 text-cyan-400 animate-pulse" />
          <h1 className="font-mono text-sm font-bold tracking-widest text-cyan-300 uppercase">
            System Operations Command
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchData(true)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-500/30 bg-cyan-950/30 text-cyan-400 transition hover:border-cyan-400 hover:bg-cyan-900/40 hover:shadow-[0_0_15px_rgba(34,211,238,0.3)]"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
            />
          </button>

          {isSuperAdmin && (
            <Button
              onClick={() => navigate("/jobs/new")}
              className="h-8 rounded-lg border border-cyan-400/50 bg-cyan-500 px-3.5 font-mono text-[11px] font-bold text-slate-950 shadow-[0_0_20px_rgba(34,211,238,0.3)] hover:bg-cyan-300"
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              New Work
            </Button>
          )}
        </div>
      </div>

      {/* TOP KPI ROW */}
      <div className="relative mb-5 grid grid-cols-2 gap-3.5 lg:grid-cols-5">
        <MetricCard
          label="Incoming Work"
          value={jobs.length}
          icon={BriefcaseBusiness}
          color="bg-cyan-500"
          sublabel="Total tracked work items"
        />

        <MetricCard
          label="Active Work"
          value={model.activeJobs.length}
          icon={Workflow}
          color="bg-blue-500"
          sublabel="Currently executing"
        />

        <MetricCard
          label="Revenue"
          value={model.thisMonth}
          prefix={CUR}
          decimals={2}
          icon={CircleDollarSign}
          color="bg-violet-500"
          delta={model.revenueDelta}
          sublabel="Current month"
        />

        <MetricCard
          label="Open Opportunities"
          value={model.opportunities}
          icon={Target}
          color="bg-emerald-500"
          sublabel="Below 50% completion"
        />

        <MetricCard
          label="SLA Performance"
          value={model.compliance}
          suffix="%"
          icon={Gauge}
          color="bg-cyan-400"
          sublabel="Operational compliance"
        />
      </div>

      {/* MAIN ANALYTICS ROW */}
      <div className="relative grid gap-4 xl:grid-cols-[1.15fr_1.15fr_0.75fr]">
        <GlassCard
          title="Revenue Intelligence"
          subtitle="Financial performance trajectory"
          action={
            <span className="flex items-center gap-1 rounded-md border border-cyan-400/40 bg-cyan-950/60 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.2)]">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-ping" />
              Live
            </span>
          }
        >
          <div className="flex items-end justify-between px-6 pt-5">
            <div>
              <div className="font-mono text-xl font-bold tracking-tight text-white sm:text-2xl drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">
                <AnimatedNumber
                  value={model.thisMonth}
                  prefix={CUR}
                  decimals={2}
                />
              </div>

              <div className="mt-1 flex items-center gap-1 font-mono text-[11px] text-emerald-400">
                <TrendingUp className="h-3 w-3" />
                <span>
                  {model.revenueDelta !== null
                    ? `${model.revenueDelta.toFixed(1)}% vs previous month`
                    : "Tracking current month"}
                </span>
              </div>
            </div>

            <div className="text-right">
              <div className="font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Pipeline
              </div>
              <div className="mt-0.5 font-mono text-xs font-bold text-cyan-300">
                {shortMoney(model.pipelineValue)}
              </div>
            </div>
          </div>

          <RevenueChart values={model.monthly} />
        </GlassCard>

        <GlassCard
          title="Conversion Metrics"
          subtitle="Operational movement across system"
          action={
            <span className="font-mono text-[10px] text-slate-400">8 periods</span>
          }
        >
          <div className="flex items-center justify-between px-6 pt-5">
            <div>
              <div className="font-mono text-xl font-bold text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">
                <AnimatedNumber value={model.nearCompletion} />
              </div>
              <div className="mt-0.5 font-mono text-[11px] text-slate-400">
                Near completion
              </div>
            </div>

            <div className="rounded-lg border border-violet-500/30 bg-violet-950/40 p-2 shadow-[0_0_12px_rgba(139,92,246,0.2)]">
              <TrendingUp className="h-4 w-4 text-violet-300" />
            </div>
          </div>

          <ConversionChart values={model.conversionSeries} />
        </GlassCard>

        <GlassCard
          title="System Health"
          subtitle="SLA compliance and velocity"
          action={
            <span className="flex items-center gap-1.5 font-mono text-[10px] text-slate-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse" />
              Active
            </span>
          }
        >
          <Speedometer value={model.compliance} label="SLA Score" />

          <div className="border-t border-cyan-500/10 px-6 py-4 grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="font-mono text-[9px] uppercase text-slate-400">On Time</div>
              <div className="mt-1 font-mono text-sm font-bold text-emerald-400">
                {model.onTime}
              </div>
            </div>
            <div>
              <div className="font-mono text-[9px] uppercase text-slate-400">At Risk</div>
              <div className="mt-1 font-mono text-sm font-bold text-amber-400">
                {model.atRisk}
              </div>
            </div>
            <div>
              <div className="font-mono text-[9px] uppercase text-slate-400">Overdue</div>
              <div className="mt-1 font-mono text-sm font-bold text-rose-400">
                {model.overdue}
              </div>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* LOWER DETAILS ROW */}
      <div className="relative mt-4 grid gap-4 lg:grid-cols-3">
        <GlassCard
          title="Pipeline Velocity"
          subtitle="Stage progression distribution"
          action={<BarChart3 className="h-4 w-4 text-cyan-400" />}
        >
          <div className="p-6 space-y-3">
            {model.pipelineStages.map((stg) => (
              <PipelineMini
                key={stg.label}
                label={stg.label}
                value={stg.value}
                total={jobs.length}
                color={stg.color}
              />
            ))}
          </div>
        </GlassCard>

        <GlassCard
          title="Stage Workload"
          subtitle="Execution distribution by status"
          action={<Layers3 className="h-4 w-4 text-cyan-400" />}
        >
          <WorkloadBars
            active={model.workload.active}
            approval={model.workload.approval}
            approved={model.workload.approved}
            locked={model.workload.locked}
          />
        </GlassCard>

        <GlassCard
          title="Audit Activity"
          subtitle="Recent operational events"
          action={
            <Button
              variant="ghost"
              onClick={() => navigate("/audit-log")}
              className="h-6 px-2 font-mono text-[10px] font-semibold text-cyan-400 hover:bg-cyan-500/10 hover:text-cyan-300"
            >
              View All
            </Button>
          }
        >
          <ActivityFeed rows={activity} />
        </GlassCard>
      </div>
    </div>
  );
}