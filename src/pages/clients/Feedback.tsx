import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import BackButton from "@/components/layout/BackButton";
import { toast } from "sonner";
import { formatDate } from "@/lib/crm";
import { FEEDBACK_TYPES, label, loadClientAccounts, loadJobsLite, type Feedback } from "@/lib/clientSuccess";
import { Loader2, MessageSquare, Plus, Star } from "lucide-react";

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

export default function ClientFeedback() {
  const { orgId, user } = useAuth();
  const [rows, setRows] = useState<Feedback[]>([]);
  const [accounts, setAccounts] = useState<{ id: string; name: string }[]>([]);
  const [jobs, setJobs] = useState<{ id: string; job_number: string; client_name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ account_id: "", job_id: "", feedback_type: "survey", rating: "5", comment: "" });

  const reload = async () => {
    const { data } = await supabase.from("client_feedback").select("*").order("received_at", { ascending: false });
    setRows(data || []);
  };

  useEffect(() => {
    (async () => {
      const [a, j] = await Promise.all([loadClientAccounts(), loadJobsLite()]);
      setAccounts(a);
      setJobs(j);
      await reload();
      setLoading(false);
    })();
  }, [orgId]);

  const stats = useMemo(() => {
    const rated = rows.filter((r) => r.rating);
    const avg = rated.length ? rated.reduce((s, r) => s + (r.rating || 0), 0) / rated.length : 0;
    const promoters = rated.filter((r) => (r.rating || 0) >= 4).length;
    return {
      avg: avg ? avg.toFixed(1) : "—",
      count: rows.length,
      promoters,
      complaints: rows.filter((r) => r.feedback_type === "complaint").length,
    };
  }, [rows]);

  const create = async () => {
    if (!orgId) return;
    setBusy(true);
    const { error } = await supabase.from("client_feedback").insert({
      org_id: orgId,
      account_id: form.account_id || null,
      job_id: form.job_id || null,
      feedback_type: form.feedback_type,
      rating: Number(form.rating),
      comment: form.comment || null,
      created_by: user?.id ?? null,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Feedback captured");
    setOpen(false);
    setForm({ account_id: "", job_id: "", feedback_type: "survey", rating: "5", comment: "" });
    reload();
  };

  const accountName = (id: string | null) => accounts.find((a) => a.id === id)?.name;

  const getTypeStyle = (type: string) => {
    if (type === "complaint") {
      return "border-rose-400/30 bg-rose-400/10 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.15)]";
    }
    if (type === "compliment") {
      return "border-emerald-400/30 bg-emerald-400/10 text-emerald-300";
    }
    return "border-cyan-400/30 bg-cyan-400/10 text-cyan-300";
  };

  return (
    <div className="space-y-5 text-slate-200">
      <BackButton />

      {/* HEADER BAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.065] pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
            Client Feedback
          </h1>
          <p className="mt-0.5 text-[11px] text-slate-400">
            Survey scores, reviews, complaints and compliments captured across all jobs
          </p>
        </div>

        {/* CAPTURE FEEDBACK DIALOG */}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="h-8 rounded-lg bg-cyan-500 px-3.5 text-[11px] font-bold text-slate-950 shadow-[0_0_20px_rgba(34,211,238,0.2)] transition-all hover:bg-cyan-400 hover:shadow-[0_0_25px_rgba(34,211,238,0.35)] active:scale-[0.98]">
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Capture Feedback
            </Button>
          </DialogTrigger>
          <DialogContent className="border-white/[0.085] bg-[#10151d] text-slate-200 shadow-[0_18px_60px_rgba(0,0,0,0.4)] sm:max-w-lg">
            <DialogHeader className="border-b border-white/[0.065] pb-3">
              <DialogTitle className="text-sm font-bold text-white">
                Capture Client Feedback
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 pt-2">
              <div className="grid gap-3 sm:grid-cols-2">
                <Select value={form.account_id} onValueChange={(v) => setForm({ ...form, account_id: v })}>
                  <SelectTrigger className="h-9 rounded-xl border-white/[0.08] bg-[#0b0e14] text-[11px] text-slate-300">
                    <SelectValue placeholder="Client account" />
                  </SelectTrigger>
                  <SelectContent className="border-white/[0.085] bg-[#10151d] text-slate-200">
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={a.id} className="text-[11px]">
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={form.job_id} onValueChange={(v) => setForm({ ...form, job_id: v })}>
                  <SelectTrigger className="h-9 rounded-xl border-white/[0.08] bg-[#0b0e14] text-[11px] text-slate-300">
                    <SelectValue placeholder="Related job" />
                  </SelectTrigger>
                  <SelectContent className="border-white/[0.085] bg-[#10151d] text-slate-200">
                    {jobs.map((j) => (
                      <SelectItem key={j.id} value={j.id} className="text-[11px]">
                        {j.job_number} · {j.client_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={form.feedback_type} onValueChange={(v) => setForm({ ...form, feedback_type: v })}>
                  <SelectTrigger className="h-9 rounded-xl border-white/[0.08] bg-[#0b0e14] text-[11px] text-slate-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-white/[0.085] bg-[#10151d] text-slate-200">
                    {FEEDBACK_TYPES.map((t) => (
                      <SelectItem key={t} value={t} className="text-[11px]">
                        {label(t)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={form.rating} onValueChange={(v) => setForm({ ...form, rating: v })}>
                  <SelectTrigger className="h-9 rounded-xl border-white/[0.08] bg-[#0b0e14] text-[11px] text-slate-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-white/[0.085] bg-[#10151d] text-slate-200">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <SelectItem key={n} value={String(n)} className="text-[11px]">
                        {n} star{n > 1 ? "s" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Textarea
                placeholder="What did the client say?"
                value={form.comment}
                onChange={(e) => setForm({ ...form, comment: e.target.value })}
                className="min-h-[90px] rounded-xl border-white/[0.08] bg-[#0b0e14] text-[11px] text-slate-200 placeholder:text-slate-500 focus:border-cyan-400/40 focus:ring-1 focus:ring-cyan-400/40"
              />

              <Button
                className="w-full rounded-xl bg-cyan-500 font-bold text-slate-950 shadow-[0_0_20px_rgba(34,211,238,0.2)] hover:bg-cyan-400"
                onClick={create}
                disabled={busy}
              >
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageSquare className="mr-2 h-4 w-4" />}
                Save Feedback
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* METRIC CARDS */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Average Rating", value: stats.avg, valColor: "text-amber-300" },
          { label: "Responses", value: stats.count, valColor: "text-slate-100" },
          { label: "Promoters (4-5★)", value: stats.promoters, valColor: "text-emerald-300" },
          { label: "Complaints", value: stats.complaints, valColor: "text-rose-300" },
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

      {/* MAIN CONTENT GLASS CARD */}
      <GlassCard
        title="Recent Feedback Records"
        subtitle="Historical survey ratings, testimonials, and client notes"
      >
        <div className="p-6 space-y-3">
          {loading ? (
            <div className="flex h-32 items-center justify-center text-[11px] text-slate-400">
              <Loader2 className="mr-2 h-4 w-4 animate-spin text-cyan-400" />
              Fetching feedback records...
            </div>
          ) : rows.length === 0 ? (
            <p className="py-6 text-center text-[11px] text-slate-500">
              No feedback captured yet.
            </p>
          ) : (
            rows.map((r) => (
              <div
                key={r.id}
                className="group space-y-2 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 transition-all duration-200 hover:border-white/[0.15] hover:bg-white/[0.035]"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[12px] font-semibold text-slate-100">
                    {accountName(r.account_id) || "Unlinked client"}
                  </p>
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider ${getTypeStyle(
                        r.feedback_type
                      )}`}
                    >
                      {label(r.feedback_type)}
                    </span>
                    <span className="flex items-center gap-1">
                      {Array.from({ length: r.rating || 0 }).map((_, i) => (
                        <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      ))}
                    </span>
                  </div>
                </div>

                {r.comment && (
                  <p className="rounded-lg border border-white/[0.06] bg-[#0b0e14]/60 p-3 text-[11px] text-slate-300">
                    {r.comment}
                  </p>
                )}

                <p className="font-mono text-[10px] text-slate-400">
                  {formatDate(r.received_at)}
                </p>
              </div>
            ))
          )}
        </div>
      </GlassCard>
    </div>
  );
}