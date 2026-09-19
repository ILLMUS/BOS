import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageSkeleton from "@/components/ui/page-skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useCopy } from "@/contexts/CopyContext";
import { useAuth } from "@/contexts/AuthContext";
import { AUTHORITY } from "@/lib/authority";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { STAGE_LABELS, STAGE_ORDER } from "@/lib/constants";
import { Plus, Search, ChevronRight, Briefcase, Sparkles, Filter } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Job = Tables<"jobs">;

interface JobProgress {
  pct: number;
  done: number;
  total: number;
  currentName: string | null;
}

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
        ${className}
      `}
    >
      <div className="pointer-events-none absolute -right-20 -top-20 h-40 w-40 rounded-full bg-cyan-500/[0.035] blur-3xl" />
      {children}
    </div>
  );
}

export default function Jobs() {
  const navigate = useNavigate();
  const { hasRole, authority, user } = useAuth();
  const { t, phrase } = useCopy();
  const isSuperAdmin = hasRole("super_admin");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [progress, setProgress] = useState<Record<string, JobProgress>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchJobs = async () => {
      const { data } = await supabase
        .from("jobs")
        .select("*")
        .order("created_at", { ascending: false });
      let list = data || [];

      // Field members only see the work they were handed.
      if (authority <= AUTHORITY.FIELD && user) {
        const { data: mine } = await supabase
          .from("job_stages")
          .select("job_id")
          .or(`primary_owner_id.eq.${user.id},secondary_owner_id.eq.${user.id}`);
        const allowed = new Set((mine || []).map((r: any) => r.job_id));
        list = list.filter((j) => allowed.has(j.id));
      }
      setJobs(list);

      if (list.length > 0) {
        // Progress comes from the job's own SOP stages, not the legacy stage enum
        const { data: stageRows } = await supabase
          .from("job_stages")
          .select("job_id, status, position, stage_name, stage")
          .in(
            "job_id",
            list.map((j) => j.id)
          )
          .order("position");

        const map: Record<string, JobProgress> = {};
        (stageRows || []).forEach((row: any) => {
          const entry = (map[row.job_id] ||= {
            pct: 0,
            done: 0,
            total: 0,
            currentName: null,
          });
          entry.total += 1;
          if (row.status === "approved") entry.done += 1;
          if (
            !entry.currentName &&
            row.status !== "approved" &&
            row.status !== "locked"
          ) {
            entry.currentName =
              row.stage_name || (row.stage ? STAGE_LABELS[row.stage] : null);
          }
        });
        Object.values(map).forEach((e) => {
          e.pct = e.total > 0 ? Math.round((e.done / e.total) * 100) : 0;
        });
        setProgress(map);
      }
      setLoading(false);
    };
    fetchJobs();
  }, [authority, user]);

  const filtered = jobs.filter(
    (j) =>
      j.client_name.toLowerCase().includes(search.toLowerCase()) ||
      j.job_number.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return "border-cyan-400/30 bg-cyan-400/10 text-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.15)]";
      case "completed":
        return "border-emerald-400/30 bg-emerald-400/10 text-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.15)]";
      case "on_hold":
        return "border-amber-400/30 bg-amber-400/10 text-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.15)]";
      case "cancelled":
        return "border-rose-400/30 bg-rose-400/10 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.15)]";
      default:
        return "border-slate-700 bg-slate-800 text-slate-300";
    }
  };

  if (loading) {
    return <PageSkeleton />;
  }

  return (
    <div className="space-y-5 text-slate-200">
      {/* HEADER BAR */}
      <div className="flex items-center justify-between border-b border-white/[0.065] pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
            {t("work_items")}
          </h1>
          <p className="mt-0.5 text-[11px] text-slate-400">
            Real-time execution tracking and stage lifecycle management
          </p>
        </div>

        {isSuperAdmin && (
          <Button
            onClick={() => navigate("/jobs/new")}
            className="h-8.5 rounded-lg bg-cyan-500 px-3.5 text-[11px] font-bold text-slate-950 shadow-[0_0_20px_rgba(34,211,238,0.2)] transition-all hover:bg-cyan-400"
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            New {t("work_item")}
          </Button>
        )}
      </div>

      {/* FILTER & SEARCH STRIP */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder={phrase("Search by client or job number...")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 rounded-xl border-white/[0.08] bg-[#10151d] pl-9 text-[11px] text-slate-200 placeholder:text-slate-500 focus:border-cyan-400/30 focus:ring-1 focus:ring-cyan-400/30"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Total: {filtered.length}
          </span>
        </div>
      </div>

      {/* WORK ITEMS TABLE CARD */}
      <GlassCard>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/[0.085] bg-white/[0.02] text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                <th className="px-6 py-4">Job #</th>
                <th className="px-6 py-4">Client</th>
                <th className="px-6 py-4">Service</th>
                <th className="px-6 py-4">Current Stage</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Progress</th>
                <th className="px-4 py-4 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-12 text-center text-[11px] text-slate-500"
                  >
                    No jobs matching your filter parameters.
                  </td>
                </tr>
              ) : (
                filtered.map((job) => {
                  const p = progress[job.id];
                  const legacyIdx = STAGE_ORDER.indexOf(job.current_stage as any);
                  const pct = p
                    ? p.pct
                    : Math.round(((legacyIdx + 1) / STAGE_ORDER.length) * 100);
                  const done = p ? p.done : Math.max(legacyIdx, 0);
                  const total = p ? p.total : STAGE_ORDER.length;
                  const stageLabel =
                    p?.currentName ??
                    STAGE_LABELS[job.current_stage] ??
                    job.current_stage;

                  return (
                    <tr
                      key={job.id}
                      onClick={() => navigate(`/jobs/${job.id}`)}
                      className="group cursor-pointer transition-colors hover:bg-white/[0.025]"
                    >
                      {/* Job # */}
                      <td className="px-6 py-4.5 font-mono text-[11px] font-semibold text-cyan-400">
                        {job.job_number}
                      </td>

                      {/* Client Name */}
                      <td className="px-6 py-4.5 text-[11px] font-semibold text-slate-100">
                        {job.client_name}
                      </td>

                      {/* Service Type */}
                      <td className="px-6 py-4.5 text-[11px] text-slate-400">
                        {job.service_type || "—"}
                      </td>

                      {/* Current Stage */}
                      <td className="px-6 py-4.5">
                        <span className="inline-flex items-center rounded-md border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[10px] font-medium text-slate-300">
                          {stageLabel}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4.5">
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${getStatusBadge(
                            job.status
                          )}`}
                        >
                          {job.status}
                        </span>
                      </td>

                      {/* Progress */}
                      <td className="px-6 py-4.5">
                        <div className="flex items-center gap-3">
                          <div className="h-1.5 w-24 shrink-0 overflow-hidden rounded-full bg-white/[0.06]">
                            <div
                              className={`h-full rounded-full transition-all duration-700 ${
                                pct === 100
                                  ? "bg-gradient-to-r from-emerald-500 to-emerald-300 shadow-[0_0_10px_rgba(52,211,153,0.4)]"
                                  : "bg-gradient-to-r from-blue-600 via-cyan-400 to-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.3)]"
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="whitespace-nowrap text-[10px] font-medium text-slate-400">
                            {pct}% <span className="text-slate-600">·</span> {done}/{total}
                          </span>
                        </div>
                      </td>

                      {/* Action Chevron */}
                      <td className="px-4 py-4.5 text-right">
                        <ChevronRight className="h-4 w-4 text-slate-600 transition-transform group-hover:translate-x-0.5 group-hover:text-cyan-400" />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}