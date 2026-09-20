import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import BackButton from "@/components/layout/BackButton";
import { toast } from "sonner";
import { formatDate } from "@/lib/crm";
import { addMonths, label, loadClientAccounts, loadJobsLite, REMINDER_TYPES, type Reminder } from "@/lib/clientSuccess";
import { CalendarClock, Check, Loader2, Plus, RotateCw } from "lucide-react";

const today = () => new Date().toISOString().slice(0, 10);

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

export default function ClientReminders() {
  const { orgId, user } = useAuth();
  const [rows, setRows] = useState<Reminder[]>([]);
  const [accounts, setAccounts] = useState<{ id: string; name: string }[]>([]);
  const [jobs, setJobs] = useState<{ id: string; job_number: string; client_name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    account_id: "",
    job_id: "",
    reminder_type: "maintenance",
    due_date: today(),
    recurrence_months: "0",
    notes: "",
  });

  const reload = async () => {
    const { data } = await supabase.from("client_reminders").select("*").order("due_date");
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

  const scheduled = rows.filter((r) => r.status === "scheduled");
  const stats = useMemo(() => {
    const t = today();
    const in30 = addMonths(t, 1);
    return {
      overdue: scheduled.filter((r) => r.due_date < t).length,
      due30: scheduled.filter((r) => r.due_date >= t && r.due_date <= in30).length,
      scheduled: scheduled.length,
      done: rows.filter((r) => r.status === "done").length,
    };
  }, [rows, scheduled]);

  const create = async () => {
    if (!orgId || !form.title.trim()) return;
    setBusy(true);
    const { error } = await supabase.from("client_reminders").insert({
      org_id: orgId,
      title: form.title.trim(),
      account_id: form.account_id || null,
      job_id: form.job_id || null,
      reminder_type: form.reminder_type,
      due_date: form.due_date,
      recurrence_months: Number(form.recurrence_months) || null,
      notes: form.notes || null,
      created_by: user?.id ?? null,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Reminder scheduled");
    setOpen(false);
    setForm({ ...form, title: "", notes: "" });
    reload();
  };

  const complete = async (r: Reminder) => {
    const { error } = await supabase
      .from("client_reminders")
      .update({ status: "done", completed_at: new Date().toISOString() })
      .eq("id", r.id);
    if (error) return toast.error(error.message);
    if (r.recurrence_months && orgId) {
      await supabase.from("client_reminders").insert({
        org_id: orgId,
        account_id: r.account_id,
        job_id: r.job_id,
        title: r.title,
        reminder_type: r.reminder_type,
        due_date: addMonths(r.due_date, r.recurrence_months),
        recurrence_months: r.recurrence_months,
        notes: r.notes,
        created_by: user?.id ?? null,
      });
      toast.success("Completed — next occurrence scheduled");
    } else {
      toast.success("Reminder completed");
    }
    reload();
  };

  const cancel = async (id: string) => {
    await supabase.from("client_reminders").update({ status: "cancelled" }).eq("id", id);
    reload();
  };

  const accountName = (id: string | null) => accounts.find((a) => a.id === id)?.name;

  const getBadgeStyle = (overdue: boolean, status: string) => {
    if (overdue) {
      return "border-rose-400/30 bg-rose-400/10 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.15)]";
    }
    if (status === "scheduled") {
      return "border-cyan-400/30 bg-cyan-400/10 text-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.15)]";
    }
    return "border-emerald-400/30 bg-emerald-400/10 text-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.15)]";
  };

  return (
    <div className="space-y-5 text-slate-200">
      <BackButton />

      {/* HEADER BAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.065] pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
            Renewals & Maintenance
          </h1>
          <p className="mt-0.5 text-[11px] text-slate-400">
            Recurring service visits, inspections, and contract renewals
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="h-8 rounded-lg bg-cyan-500 px-3.5 text-[11px] font-bold text-slate-950 shadow-[0_0_20px_rgba(34,211,238,0.2)] transition-all hover:bg-cyan-400 hover:shadow-[0_0_25px_rgba(34,211,238,0.35)] active:scale-[0.98]">
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              New Reminder
            </Button>
          </DialogTrigger>
          <DialogContent className="border-white/[0.085] bg-[#10151d] text-slate-200 shadow-[0_18px_60px_rgba(0,0,0,0.4)] sm:max-w-lg">
            <DialogHeader className="border-b border-white/[0.065] pb-3">
              <DialogTitle className="text-sm font-bold text-white">
                Schedule a Reminder
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 pt-2">
              <Input
                placeholder="Title, e.g. Annual gate service"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="h-9 rounded-xl border-white/[0.08] bg-[#0b0e14] text-[11px] text-slate-200 placeholder:text-slate-500 focus:border-cyan-400/40 focus:ring-1 focus:ring-cyan-400/40"
              />
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

                <Select value={form.reminder_type} onValueChange={(v) => setForm({ ...form, reminder_type: v })}>
                  <SelectTrigger className="h-9 rounded-xl border-white/[0.08] bg-[#0b0e14] text-[11px] text-slate-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-white/[0.085] bg-[#10151d] text-slate-200">
                    {REMINDER_TYPES.map((t) => (
                      <SelectItem key={t} value={t} className="text-[11px]">
                        {label(t)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input
                  type="date"
                  value={form.due_date}
                  onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                  className="h-9 rounded-xl border-white/[0.08] bg-[#0b0e14] text-[11px] text-slate-200 focus:border-cyan-400/40 focus:ring-1 focus:ring-cyan-400/40"
                />

                <Select value={form.recurrence_months} onValueChange={(v) => setForm({ ...form, recurrence_months: v })}>
                  <SelectTrigger className="h-9 rounded-xl border-white/[0.08] bg-[#0b0e14] text-[11px] text-slate-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-white/[0.085] bg-[#10151d] text-slate-200">
                    <SelectItem value="0" className="text-[11px]">One-off</SelectItem>
                    <SelectItem value="1" className="text-[11px]">Every month</SelectItem>
                    <SelectItem value="3" className="text-[11px]">Every 3 months</SelectItem>
                    <SelectItem value="6" className="text-[11px]">Every 6 months</SelectItem>
                    <SelectItem value="12" className="text-[11px]">Every 12 months</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Textarea
                placeholder="Notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="min-h-[80px] rounded-xl border-white/[0.08] bg-[#0b0e14] text-[11px] text-slate-200 placeholder:text-slate-500 focus:border-cyan-400/40 focus:ring-1 focus:ring-cyan-400/40"
              />

              <Button
                className="w-full rounded-xl bg-cyan-500 font-bold text-slate-950 shadow-[0_0_20px_rgba(34,211,238,0.2)] hover:bg-cyan-400"
                onClick={create}
                disabled={busy || !form.title.trim()}
              >
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Schedule Reminder
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* METRIC CARDS */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Overdue", value: stats.overdue, valColor: "text-rose-300" },
          { label: "Due in 30 days", value: stats.due30, valColor: "text-amber-300" },
          { label: "Scheduled", value: stats.scheduled, valColor: "text-cyan-300" },
          { label: "Completed", value: stats.done, valColor: "text-emerald-300" },
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

      {/* UPCOMING REMINDERS CARD */}
      <GlassCard>
        <div className="border-b border-white/[0.085] bg-white/[0.02] px-6 py-3.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Upcoming Reminders
          </span>
        </div>

        <div className="p-6 space-y-3">
          {loading ? (
            <div className="flex h-32 items-center justify-center text-[11px] text-slate-400">
              <Loader2 className="mr-2 h-4 w-4 animate-spin text-cyan-400" />
              Loading reminders...
            </div>
          ) : rows.length === 0 ? (
            <p className="py-6 text-center text-[11px] text-slate-500">
              No reminders scheduled yet.
            </p>
          ) : (
            rows.map((r) => {
              const overdue = r.status === "scheduled" && r.due_date < today();
              return (
                <div
                  key={r.id}
                  className="group flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 transition-all duration-200 hover:border-white/[0.15] hover:bg-white/[0.035]"
                >
                  <div className="flex items-start gap-3">
                    <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
                    <div>
                      <p className="text-[12px] font-semibold text-slate-100">
                        {r.title}
                      </p>
                      <p className="mt-0.5 text-[10px] text-slate-400">
                        {accountName(r.account_id) || "Unlinked"} · {label(r.reminder_type)} · due{" "}
                        <span className="font-mono text-slate-300">{formatDate(r.due_date)}</span>
                        {r.recurrence_months ? ` · repeats every ${r.recurrence_months} mo` : ""}
                      </p>
                      {r.notes && (
                        <p className="mt-1.5 text-[11px] text-slate-300">
                          {r.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider ${getBadgeStyle(
                        overdue,
                        r.status
                      )}`}
                    >
                      {overdue ? "Overdue" : label(r.status)}
                    </span>

                    {r.status === "scheduled" && (
                      <>
                        <Button
                          size="sm"
                          className="h-7 rounded-lg border border-white/[0.1] bg-white/[0.05] px-2.5 text-[10px] font-semibold text-slate-200 hover:bg-white/[0.1] hover:text-white"
                          onClick={() => complete(r)}
                        >
                          {r.recurrence_months ? (
                            <RotateCw className="mr-1 h-3 w-3 text-cyan-400" />
                          ) : (
                            <Check className="mr-1 h-3 w-3 text-emerald-400" />
                          )}
                          Done
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 rounded-lg px-2 text-[10px] text-slate-400 hover:bg-rose-500/10 hover:text-rose-300"
                          onClick={() => cancel(r.id)}
                        >
                          Cancel
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </GlassCard>
    </div>
  );
}