import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import BackButton from "@/components/layout/BackButton";
import { toast } from "sonner";
import { loadJobsLite } from "@/lib/clientSuccess";
import {
  Copy,
  ExternalLink,
  KeyRound,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
} from "lucide-react";

type JobLite = Awaited<ReturnType<typeof loadJobsLite>>[number];

const randomToken = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

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

export default function PortalAccess() {
  const { orgId } = useAuth();
  const [jobs, setJobs] = useState<JobLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const reload = async () => setJobs(await loadJobsLite());

  useEffect(() => {
    (async () => {
      await reload();
      setLoading(false);
    })();
  }, [orgId]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return jobs;
    return jobs.filter((j) =>
      `${j.job_number} ${j.client_name}`.toLowerCase().includes(q)
    );
  }, [jobs, query]);

  const linkFor = (token: string | null) =>
    token ? `${window.location.origin}/track?token=${token}` : "";

  const copy = async (token: string | null) => {
    if (!token) return;
    await navigator.clipboard.writeText(linkFor(token));
    toast.success("Portal link copied");
  };

  const rotate = async (job: JobLite) => {
    setBusyId(job.id);
    const { error } = await supabase
      .from("jobs")
      .update({ tracking_token: randomToken() })
      .eq("id", job.id);
    setBusyId(null);
    if (error) return toast.error(error.message);
    toast.success("Access link regenerated — the old link no longer works");
    reload();
  };

  const revoke = async (job: JobLite) => {
    setBusyId(job.id);
    const { error } = await supabase
      .from("jobs")
      .update({ tracking_token: null })
      .eq("id", job.id);
    setBusyId(null);
    if (error) return toast.error(error.message);
    toast.success("Portal access revoked");
    reload();
  };

  const active = jobs.filter((j) => j.tracking_token).length;

  return (
    <div className="space-y-5 text-slate-200">
      <BackButton />

      {/* HEADER BAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.065] pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
            Client Portal Access
          </h1>
          <p className="mt-0.5 text-[11px] text-slate-400">
            Each job has a private tracking link clients can open without an account. Share, regenerate or revoke access links.
          </p>
        </div>
      </div>

      {/* METRIC CARDS */}
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Jobs with access", value: active, valColor: "text-cyan-300" },
          { label: "Access revoked", value: jobs.length - active, valColor: "text-slate-400" },
          { label: "Total jobs", value: jobs.length, valColor: "text-slate-100" },
        ].map((k) => (
          <GlassCard key={k.label} className="p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              {k.label}
            </p>
            <p className={`mt-1 text-2xl font-bold tracking-tight ${k.valColor}`}>
              {k.value}
            </p>
          </GlassCard>
        ))}
      </div>

      {/* MAIN CONTENT CARD */}
      <GlassCard
        title="Job Access Links"
        subtitle="Manage active tokens and security credentials"
        action={
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <Input
              className="h-8 rounded-xl border-white/[0.08] bg-[#0b0e14] pl-8 text-[11px] text-slate-200 placeholder:text-slate-500 focus:border-cyan-400/40 focus:ring-1 focus:ring-cyan-400/40"
              placeholder="Search job or client..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        }
      >
        <div className="p-6 space-y-3">
          {loading ? (
            <div className="flex h-32 items-center justify-center text-[11px] text-slate-400">
              <Loader2 className="mr-2 h-4 w-4 animate-spin text-cyan-400" />
              Fetching portal tokens...
            </div>
          ) : visible.length === 0 ? (
            <p className="py-6 text-center text-[11px] text-slate-500">
              No jobs match that search parameter.
            </p>
          ) : (
            visible.map((j) => (
              <div
                key={j.id}
                className="group flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 transition-all duration-200 hover:border-white/[0.15] hover:bg-white/[0.035]"
              >
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold text-slate-100">
                    <Link
                      to={`/jobs/${j.id}`}
                      className="font-mono text-cyan-400 transition-colors hover:text-cyan-300 hover:underline"
                    >
                      {j.job_number}
                    </Link>
                    <span className="text-slate-400"> · {j.client_name}</span>
                  </p>
                  <p className="mt-0.5 truncate font-mono text-[10px] text-slate-400">
                    {j.tracking_token ? linkFor(j.tracking_token) : "No portal link active"}
                  </p>
                  {j.tracking_token && (
                    <button
                      type="button"
                      className="mt-1.5 flex items-center gap-1 text-[10px] text-slate-400 transition-colors hover:text-cyan-300"
                      onClick={async () => {
                        await navigator.clipboard.writeText(
                          j.client_access_code || ""
                        );
                        toast.success("Client ID copied");
                      }}
                    >
                      <ShieldCheck className="h-3 w-3 text-cyan-400" />
                      Client ID:{" "}
                      <span className="font-mono font-medium tracking-wider text-slate-200">
                        {j.client_access_code || "—"}
                      </span>
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider ${
                      j.tracking_token
                        ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-300"
                        : "border-slate-700 bg-slate-800/50 text-slate-500"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        j.tracking_token ? "bg-cyan-400 animate-pulse" : "bg-slate-500"
                      }`}
                    />
                    {j.tracking_token ? "Active" : "Revoked"}
                  </span>

                  {j.tracking_token && (
                    <>
                      <Button
                        size="sm"
                        className="h-8 rounded-lg border border-white/[0.08] bg-[#0b0e14] px-3 text-[11px] font-semibold text-slate-200 hover:bg-white/[0.06] hover:text-white"
                        onClick={() => copy(j.tracking_token)}
                      >
                        <Copy className="mr-1.5 h-3.5 w-3.5 text-slate-400" /> Copy
                      </Button>
                      <Button
                        size="sm"
                        className="h-8 w-8 rounded-lg border border-white/[0.08] bg-[#0b0e14] p-0 text-slate-200 hover:bg-white/[0.06] hover:text-white"
                        asChild
                      >
                        <a
                          href={linkFor(j.tracking_token)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
                        </a>
                      </Button>
                    </>
                  )}

                  <Button
                    size="sm"
                    disabled={busyId === j.id}
                    onClick={() => rotate(j)}
                    className="h-8 rounded-lg border border-white/[0.08] bg-[#0b0e14] px-3 text-[11px] font-semibold text-slate-200 hover:bg-white/[0.06] hover:text-white"
                  >
                    <RefreshCw
                      className={`mr-1.5 h-3.5 w-3.5 text-slate-400 ${
                        busyId === j.id ? "animate-spin" : ""
                      }`}
                    />
                    {j.tracking_token ? "Regenerate" : "Enable"}
                  </Button>

                  {j.tracking_token && (
                    <Button
                      size="sm"
                      disabled={busyId === j.id}
                      onClick={() => revoke(j)}
                      className="h-8 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 text-[11px] font-semibold text-rose-300 hover:bg-rose-500/20"
                    >
                      Revoke
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </GlassCard>
    </div>
  );
}