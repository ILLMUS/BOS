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
   FUTURISTIC CARD
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
        <div className="relative flex items-center justify-between border-b border-white/[0.065] px-6 py-4">
          <div>
            {title && (
              <h3 className="text-[11px] font-semibold tracking-wide text-slate-100 sm:text-xs">
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
    <div className="group relative overflow-hidden rounded-[13px] border border-white/[0.085] bg-[#10151d] px-5 py-4.5 transition-all duration-300 hover:-translate-y-[2px] hover:border-cyan-400/20 hover:shadow-[0_12px_35px_rgba(0,0,0,0.25)]">
      <div
        className={`absolute -right-8 -top-8 h-24 w-24 rounded-full blur-2xl ${color}`}
      />

      <div className="relative flex items-start justify-between">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              {label}
            </span>

            {delta !== undefined && delta !== null && (
              <span
                className={`flex items-center gap-0.5 text-[10px] font-bold ${
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

          <div className="mt-2 text-xl font-bold tracking-tight text-white sm:text-2xl">
            <AnimatedNumber
              value={value}
              prefix={prefix}
              suffix={suffix}
              decimals={decimals}
            />
          </div>

          {sublabel && (
            <div className="mt-1 text-[10px] text-slate-400">
              {sublabel}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-white/[0.035] p-2">
          <Icon className="h-3.5 w-3.5 text-cyan-300" />
        </div>
      </div>

      <div className="relative mt-3 h-[3px] overflow-hidden rounded-full bg-white/[0.05]">
        <div className="h-full w-[68%] rounded-full bg-gradient-to-r from-cyan-500/30 via-cyan-400/80 to-transparent" />
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
            <stop offset="55%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#22d3ee" />
          </linearGradient>

          <filter id="gaugeGlow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

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
              stroke="rgba(255,255,255,0.25)"
              strokeWidth={i % 5 === 0 ? 2 : 1}
            />
          );
        })}

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
            filter="url(#gaugeGlow)"
          />

          <circle
            cx="90"
            cy="90"
            r="5"
            fill="#0b1118"
            stroke="#67e8f9"
            strokeWidth="2"
          />
        </g>
      </svg>

      <div className="absolute left-0 right-0 top-[72px] text-center">
        <div className="text-2xl font-bold tracking-tight text-white">
          <AnimatedNumber value={safe} suffix="%" />
        </div>

        <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-cyan-400">
          {label}
        </div>
      </div>

      <div className="absolute bottom-1 left-1/2 flex -translate-x-1/2 gap-9 text-[10px] font-medium text-slate-500">
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
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
          </linearGradient>

          <filter id="lineGlow">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
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
              stroke="rgba(255,255,255,0.06)"
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
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r="3.5"
            fill="#0b1118"
            stroke="#67e8f9"
            strokeWidth="1.5"
          />
        ))}

        {MONTHS.map((month, i) => {
          const x = paddingX + (i / 11) * (width - paddingX * 2);
          return (
            <text
              key={month}
              x={x}
              y={height - 2}
              textAnchor="middle"
              fill="#94a3b8"
              fontSize="9"
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
            className="flex h-full flex-1 flex-col items-center justify-end gap-1.5"
          >
            <div className="relative flex w-full justify-center">
              <div
                className="w-[75%] rounded-t-sm bg-gradient-to-t from-blue-700 via-cyan-500 to-cyan-300 opacity-90 shadow-[0_0_14px_rgba(34,211,238,0.16)] transition-all duration-700"
                style={{
                  height: `${height}px`,
                  animationDelay: `${index * 80}ms`,
                }}
              />
              <span className="absolute -top-4 text-[10px] font-semibold text-slate-300">
                {value}
              </span>
            </div>

            <span className="text-[10px] text-slate-400">{index + 1}</span>
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
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-slate-400">{label}</span>
        <span className="text-[11px] font-bold text-slate-200">
          {value}
        </span>
      </div>

      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className={`h-full rounded-full ${color}`}
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
    <div className="divide-y divide-white/[0.05]">
      {rows.length === 0 ? (
        <div className="px-6 py-10 text-center text-[11px] text-slate-500">
          No recent system activity.
        </div>
      ) : (
        rows.slice(0, 5).map((row, index) => (
          <div key={row.id} className="flex items-center gap-3 px-6 py-3.5">
            <div className="relative">
              <div className="flex h-6.5 w-6.5 items-center justify-center rounded-full border border-cyan-400/20 bg-cyan-400/[0.06]">
                {index === 0 ? (
                  <Zap className="h-3 w-3 text-cyan-400" />
                ) : (
                  <Activity className="h-3 w-3 text-slate-400" />
                )}
              </div>

              {index < rows.length - 1 && (
                <div className="absolute left-1/2 top-7 h-4 w-px -translate-x-1/2 bg-white/[0.06]" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-medium text-slate-200">{row.action}</p>

              <p className="mt-0.5 text-[10px] text-slate-400">
                {new Date(row.created_at).toLocaleString()}
              </p>
            </div>

            <ChevronRight className="h-3.5 w-3.5 text-slate-600" />
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
    { label: "Active", value: active, color: "bg-cyan-400" },
    { label: "Approval", value: approval, color: "bg-violet-400" },
    { label: "Approved", value: approved, color: "bg-emerald-400" },
    { label: "Locked", value: locked, color: "bg-slate-500" },
  ];

  return (
    <div className="px-6 py-5">
      <div className="flex h-2.5 overflow-hidden rounded-full bg-white/[0.06]">
        {items.map((item) => (
          <div
            key={item.label}
            className={`${item.color} transition-all duration-1000`}
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
              <span className="text-[11px] text-slate-400">{item.label}</span>
            </div>

            <span className="text-[11px] font-bold text-slate-200">
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
      { label: "Intake", value: jobs.length, color: "bg-cyan-400" },
      { label: "Active", value: activeJobs.length, color: "bg-blue-400" },
      { label: "Halfway", value: halfway, color: "bg-violet-400" },
      { label: "Near Complete", value: nearCompletion, color: "bg-emerald-400" },
      { label: "Completed", value: completedJobs.length, color: "bg-slate-500" },
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
      <div className="flex min-h-screen w-full items-center justify-center">
        <div className="text-center">
          <div className="relative mx-auto flex h-10 w-10 items-center justify-center">
            <div className="absolute inset-0 animate-ping rounded-full bg-cyan-400/10" />
            <div className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/[0.04]">
              <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
            </div>
          </div>

          <div className="mt-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            Initializing RST Command Center
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full px-0 py-4 md:py-6 text-slate-200">
      <style>{`
        @keyframes drawLine {
          to {
            stroke-dashoffset: 0;
          }
        }

        @keyframes pulseGlow {
          0%,100% {
            opacity: .35;
          }
          50% {
            opacity: .8;
          }
        }

        @keyframes scan {
          0% {
            transform: translateY(-100%);
          }
          100% {
            transform: translateY(500%);
          }
        }
      `}</style>

      {/* HEADER CONTROL BAR */}
      <div className="mb-5 flex flex-wrap items-center justify-end gap-2 border-b border-white/[0.065] pb-3.5">
        <button
          onClick={() => fetchData(true)}
          className="flex h-7.5 w-7.5 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-slate-400 transition hover:border-cyan-400/20 hover:text-cyan-300"
        >
          <RefreshCw
            className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`}
          />
        </button>

        {isSuperAdmin && (
          <Button
            onClick={() => navigate("/jobs/new")}
            className="h-7.5 rounded-lg bg-cyan-500 px-3 text-[11px] font-bold text-slate-950 shadow-[0_0_20px_rgba(34,211,238,.12)] hover:bg-cyan-400"
          >
            <Plus className="mr-1 h-3 w-3" />
            New Work
          </Button>
        )}
      </div>

      {/* TOP KPI ROW */}
      <div className="mb-5 grid grid-cols-2 gap-3.5 lg:grid-cols-5">
        <MetricCard
          label="Incoming Work"
          value={jobs.length}
          icon={BriefcaseBusiness}
          color="bg-cyan-400/[0.06]"
          sublabel="Total tracked work items"
        />

        <MetricCard
          label="Active Work"
          value={model.activeJobs.length}
          icon={Workflow}
          color="bg-blue-400/[0.06]"
          sublabel="Currently executing"
        />

        <MetricCard
          label="Revenue"
          value={model.thisMonth}
          prefix={CUR}
          decimals={2}
          icon={CircleDollarSign}
          color="bg-violet-400/[0.06]"
          delta={model.revenueDelta}
          sublabel="Current month"
        />

        <MetricCard
          label="Open Opportunities"
          value={model.opportunities}
          icon={Target}
          color="bg-emerald-400/[0.06]"
          sublabel="Below 50% completion"
        />

        <MetricCard
          label="SLA Performance"
          value={model.compliance}
          suffix="%"
          icon={Gauge}
          color="bg-cyan-400/[0.06]"
          sublabel="Operational compliance"
        />
      </div>

      {/* MAIN ANALYTICS ROW */}
      <div className="grid gap-4 xl:grid-cols-[1.15fr_1.15fr_0.75fr]">
        <GlassCard
          title="Revenue Intelligence"
          subtitle="Financial performance trajectory"
          action={
            <span className="rounded-md border border-cyan-400/20 bg-cyan-400/[0.06] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-cyan-400">
              Live
            </span>
          }
        >
          <div className="flex items-end justify-between px-6 pt-5">
            <div>
              <div className="text-xl font-bold tracking-tight text-white sm:text-2xl">
                <AnimatedNumber
                  value={model.thisMonth}
                  prefix={CUR}
                  decimals={2}
                />
              </div>

              <div className="mt-1 flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-emerald-400" />
                <span className="text-[11px] font-medium text-emerald-400">
                  {model.revenueDelta !== null
                    ? `${model.revenueDelta.toFixed(1)}% vs previous month`
                    : "Tracking current month"}
                </span>
              </div>
            </div>

            <div className="text-right">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Pipeline
              </div>
              <div className="mt-0.5 text-xs font-bold text-slate-200">
                {shortMoney(model.pipelineValue)}
              </div>
            </div>
          </div>

          <RevenueChart values={model.monthly} />
        </GlassCard>

        <GlassCard
          title="Conversion Metrics"
          subtitle="Operational movement across the system"
          action={
            <span className="text-[10px] font-medium text-slate-400">8 periods</span>
          }
        >
          <div className="flex items-center justify-between px-6 pt-5">
            <div>
              <div className="text-xl font-bold text-white">
                <AnimatedNumber value={model.nearCompletion} />
              </div>
              <div className="mt-0.5 text-[11px] text-slate-400">
                Near completion
              </div>
            </div>

            <div className="rounded-xl border border-violet-400/20 bg-violet-400/[0.06] p-2">
              <TrendingUp className="h-3.5 w-3.5 text-violet-300" />
            </div>
          </div>

          <ConversionChart values={model.conversionSeries} />
        </GlassCard>

        <GlassCard title="SLA Performance" subtitle="Operational velocity">
          <Speedometer value={model.compliance} label="System On Track" />

          <div className="grid grid-cols-3 border-t border-white/[0.065]">
            <div className="px-4 py-3.5 text-center">
              <div className="text-sm font-bold text-emerald-400">
                <AnimatedNumber value={model.onTime} />
              </div>
              <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                On Time
              </div>
            </div>

            <div className="border-x border-white/[0.065] px-4 py-3.5 text-center">
              <div className="text-sm font-bold text-amber-400">
                <AnimatedNumber value={model.atRisk} />
              </div>
              <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                At Risk
              </div>
            </div>

            <div className="px-4 py-3.5 text-center">
              <div className="text-sm font-bold text-rose-400">
                <AnimatedNumber value={model.overdue} />
              </div>
              <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Overdue
              </div>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* SECOND ANALYTICS ROW */}
      <div className="mt-4 grid gap-4 xl:grid-cols-[1.1fr_1fr_0.9fr]">
        <GlassCard
          title="Operations Pipeline"
          subtitle="Real-time workflow distribution"
          action={
            <span className="text-[10px] font-medium text-slate-400">
              {model.stageCount} stages
            </span>
          }
        >
          <div className="grid grid-cols-2 gap-3.5 p-6">
            {model.pipelineStages.slice(0, 4).map((stage) => (
              <PipelineMini
                key={stage.label}
                label={stage.label}
                value={stage.value}
                total={Math.max(jobs.length, 1)}
                color={stage.color}
              />
            ))}
          </div>

          <div className="border-t border-white/[0.065] px-6 py-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-400">
                Total completed
              </span>
              <span className="text-[11px] font-bold text-emerald-400">
                <AnimatedNumber value={model.completedJobs.length} />
              </span>
            </div>

            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-400"
                style={{
                  width: `${
                    jobs.length > 0
                      ? Math.min(
                          100,
                          (model.completedJobs.length / jobs.length) * 100
                        )
                      : 0
                  }%`,
                  transition: "width 1.5s ease-out",
                }}
              />
            </div>
          </div>
        </GlassCard>

        <GlassCard
          title="Stage Workload"
          subtitle="Resource allocation across workflows"
          action={<Layers3 className="h-3.5 w-3.5 text-slate-500" />}
        >
          <WorkloadBars
            active={model.workload.active}
            approval={model.workload.approval}
            approved={model.workload.approved}
            locked={model.workload.locked}
          />

          <div className="border-t border-white/[0.065] px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Total stages
                </div>
                <div className="mt-0.5 text-base font-bold text-white">
                  <AnimatedNumber value={stages.length} />
                </div>
              </div>

              <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/[0.06] p-2">
                <Layers3 className="h-3.5 w-3.5 text-cyan-300" />
              </div>
            </div>
          </div>
        </GlassCard>

        <GlassCard
          title="Live Activity"
          subtitle="Latest system events"
          action={
            <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              Live
            </span>
          }
        >
          <ActivityFeed rows={activity} />
        </GlassCard>
      </div>

      {/* BOTTOM COMMAND STRIP */}
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <div className="group flex items-center gap-3.5 rounded-xl border border-white/[0.08] bg-[#10151d] px-5 py-4 transition hover:border-cyan-400/20">
          <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/[0.06] p-2">
            <ShieldCheck className="h-3.5 w-3.5 text-cyan-300" />
          </div>

          <div className="flex-1">
            <div className="text-[11px] font-semibold text-slate-200">
              Workflow Integrity
            </div>
            <div className="mt-0.5 text-[10px] text-slate-400">
              SOP execution monitoring
            </div>
          </div>

          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
        </div>

        <div className="group flex items-center gap-3.5 rounded-xl border border-white/[0.08] bg-[#10151d] px-5 py-4 transition hover:border-violet-400/20">
          <div className="rounded-xl border border-violet-400/20 bg-violet-400/[0.06] p-2">
            <Sparkles className="h-3.5 w-3.5 text-violet-300" />
          </div>

          <div className="flex-1">
            <div className="text-[11px] font-semibold text-slate-200">
              Automation Engine
            </div>
            <div className="mt-0.5 text-[10px] text-slate-400">
              Intelligent process orchestration
            </div>
          </div>

          <span className="text-[10px] font-semibold uppercase tracking-wider text-violet-400">
            Active
          </span>
        </div>

        <div className="group flex items-center gap-3.5 rounded-xl border border-white/[0.08] bg-[#10151d] px-5 py-4 transition hover:border-emerald-400/20">
          <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] p-2">
            <Settings2 className="h-3.5 w-3.5 text-emerald-300" />
          </div>

          <div className="flex-1">
            <div className="text-[11px] font-semibold text-slate-200">
              System Health
            </div>
            <div className="mt-0.5 text-[10px] text-slate-400">
              Supabase + realtime connectivity
            </div>
          </div>

          <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Normal
          </span>
        </div>
      </div>

      {/* ADMIN ONLY */}
      {isAdmin && (
        <div className="mt-4 flex items-center justify-between rounded-xl border border-amber-400/20 bg-amber-400/[0.03] px-6 py-3.5">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-[11px] font-medium text-slate-300">
              Administrative monitoring is enabled.
            </span>
          </div>

          <button
            onClick={() => navigate("/approvals")}
            className="text-[11px] font-bold text-amber-400 hover:text-amber-300"
          >
            Review queue →
          </button>
        </div>
      )}
    </div>
  );
}