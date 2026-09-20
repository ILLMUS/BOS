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
import { formatDateTime } from "@/lib/crm";
import {
  label,
  loadClientAccounts,
  loadJobsLite,
  OPEN_TICKET_STATUSES,
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  type Ticket,
} from "@/lib/clientSuccess";
import { Filter, Loader2, Plus, Ticket as TicketIcon } from "lucide-react";

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

export default function SupportTickets() {
  const { orgId, user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [accounts, setAccounts] = useState<{ id: string; name: string }[]>([]);
  const [jobs, setJobs] = useState<{ id: string; job_number: string; client_name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("open");
  const [form, setForm] = useState({
    subject: "",
    description: "",
    account_id: "",
    job_id: "",
    category: "general",
    priority: "medium",
  });

  const reload = async () => {
    const { data } = await supabase.from("support_tickets").select("*").order("created_at", { ascending: false });
    setTickets(data || []);
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

  const visible = useMemo(() => {
    if (filter === "all") return tickets;
    if (filter === "open") return tickets.filter((t) => OPEN_TICKET_STATUSES.includes(t.status));
    return tickets.filter((t) => t.status === filter);
  }, [tickets, filter]);

  const create = async () => {
    if (!orgId || !form.subject.trim()) return;
    setBusy(true);
    const { error } = await supabase.from("support_tickets").insert({
      org_id: orgId,
      subject: form.subject.trim(),
      description: form.description || null,
      account_id: form.account_id || null,
      job_id: form.job_id || null,
      category: form.category,
      priority: form.priority,
      created_by: user?.id ?? null,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Ticket logged");
    setOpen(false);
    setForm({ subject: "", description: "", account_id: "", job_id: "", category: "general", priority: "medium" });
    reload();
  };

  const update = async (id: string, patch: Partial<Ticket>) => {
    const { error } = await supabase.from("support_tickets").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    reload();
  };

  const accountName = (id: string | null) => accounts.find((a) => a.id === id)?.name;

  const counts = {
    open: tickets.filter((t) => OPEN_TICKET_STATUSES.includes(t.status)).length,
    urgent: tickets.filter((t) => t.priority === "urgent" && OPEN_TICKET_STATUSES.includes(t.status)).length,
    resolved: tickets.filter((t) => t.status === "resolved" || t.status === "closed").length,
    total: tickets.length,
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "border-rose-400/30 bg-rose-400/10 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.15)]";
      case "high":
        return "border-amber-400/30 bg-amber-400/10 text-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.15)]";
      default:
        return "border-cyan-400/30 bg-cyan-400/10 text-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.15)]";
    }
  };

  return (
    <div className="space-y-5 text-slate-200">
      <BackButton />

      {/* HEADER BAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.065] pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
            Support Tickets
          </h1>
          <p className="mt-0.5 text-[11px] text-slate-400">
            Client issues, warranty calls, and incoming requests in one queue
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              className="h-8 rounded-lg bg-cyan-500 px-3.5 text-[11px] font-bold text-slate-950 shadow-[0_0_20px_rgba(34,211,238,0.2)] transition-all hover:bg-cyan-400 hover:shadow-[0_0_25px_rgba(34,211,238,0.35)] active:scale-[0.98]"
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              New Ticket
            </Button>
          </DialogTrigger>
          <DialogContent className="border-white/[0.085] bg-[#10151d] text-slate-200 shadow-[0_18px_60px_rgba(0,0,0,0.4)] sm:max-w-lg">
            <DialogHeader className="border-b border-white/[0.065] pb-3">
              <DialogTitle className="text-sm font-bold text-white">
                Log Support Ticket
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 pt-2">
              <Input
                placeholder="Subject"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                className="h-9 rounded-xl border-white/[0.08] bg-[#0b0e14] text-[11px] text-slate-200 placeholder:text-slate-500 focus:border-cyan-400/40 focus:ring-1 focus:ring-cyan-400/40"
              />
              <Textarea
                placeholder="Describe the issue..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="min-h-[90px] rounded-xl border-white/[0.08] bg-[#0b0e14] text-[11px] text-slate-200 placeholder:text-slate-500 focus:border-cyan-400/40 focus:ring-1 focus:ring-cyan-400/40"
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

                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger className="h-9 rounded-xl border-white/[0.08] bg-[#0b0e14] text-[11px] text-slate-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-white/[0.085] bg-[#10151d] text-slate-200">
                    {TICKET_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c} className="text-[11px]">
                        {label(c)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                  <SelectTrigger className="h-9 rounded-xl border-white/[0.08] bg-[#0b0e14] text-[11px] text-slate-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-white/[0.085] bg-[#10151d] text-slate-200">
                    {TICKET_PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p} className="text-[11px]">
                        {label(p)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                className="w-full rounded-xl bg-cyan-500 font-bold text-slate-950 shadow-[0_0_20px_rgba(34,211,238,0.2)] hover:bg-cyan-400"
                onClick={create}
                disabled={busy || !form.subject.trim()}
              >
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <TicketIcon className="mr-2 h-4 w-4" />}
                Log Ticket
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* METRIC CARDS */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Open Queue", value: counts.open, valColor: "text-cyan-300" },
          { label: "Urgent Open", value: counts.urgent, valColor: "text-rose-300" },
          { label: "Resolved / Closed", value: counts.resolved, valColor: "text-emerald-300" },
          { label: "Total Tickets", value: counts.total, valColor: "text-white" },
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

      {/* MAIN QUEUE SECTION */}
      <GlassCard>
        {/* FILTER BAR */}
        <div className="flex items-center justify-between border-b border-white/[0.085] bg-white/[0.02] px-6 py-3.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Support Queue
          </span>

          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="h-8 w-40 rounded-xl border-white/[0.08] bg-[#10151d] text-[11px] text-slate-200 focus:border-cyan-400/40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-white/[0.085] bg-[#10151d] text-slate-200">
                <SelectItem value="open" className="text-[11px]">Open only</SelectItem>
                <SelectItem value="all" className="text-[11px]">All tickets</SelectItem>
                {TICKET_STATUSES.map((s) => (
                  <SelectItem key={s} value={s} className="text-[11px]">
                    {label(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* TICKET LIST */}
        <div className="p-6 space-y-3">
          {loading ? (
            <div className="flex h-32 items-center justify-center text-[11px] text-slate-400">
              <Loader2 className="mr-2 h-4 w-4 animate-spin text-cyan-400" />
              Loading tickets...
            </div>
          ) : visible.length === 0 ? (
            <div className="py-8 text-center text-[11px] text-slate-500">
              No support tickets found for this filter.
            </div>
          ) : (
            visible.map((t) => (
              <div
                key={t.id}
                className="group space-y-3 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 transition-all duration-200 hover:border-white/[0.15] hover:bg-white/[0.035]"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-[12px] font-semibold text-slate-100">
                      <span className="font-mono text-cyan-400">#{t.ticket_number}</span> · {t.subject}
                    </p>
                    <p className="mt-0.5 text-[10px] text-slate-400">
                      {accountName(t.account_id) || "No account"} · {label(t.category)} · {formatDateTime(t.created_at)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider ${getPriorityBadge(
                        t.priority
                      )}`}
                    >
                      {label(t.priority)}
                    </span>

                    <Select
                      value={t.status}
                      onValueChange={(v) =>
                        update(t.id, {
                          status: v,
                          resolved_at: v === "resolved" || v === "closed" ? new Date().toISOString() : null,
                        })
                      }
                    >
                      <SelectTrigger className="h-7 w-36 rounded-lg border-white/[0.08] bg-[#10151d] text-[10px] font-medium text-slate-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="border-white/[0.085] bg-[#10151d] text-slate-200">
                        {TICKET_STATUSES.map((s) => (
                          <SelectItem key={s} value={s} className="text-[11px]">
                            {label(s)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {t.description && (
                  <p className="rounded-lg border border-white/[0.05] bg-[#0b0e14] p-3 text-[11px] text-slate-300">
                    {t.description}
                  </p>
                )}

                <Textarea
                  className="min-h-[60px] rounded-xl border-white/[0.08] bg-[#0b0e14] text-[11px] text-slate-200 placeholder:text-slate-500 focus:border-cyan-400/40"
                  placeholder="Resolution notes"
                  defaultValue={t.resolution ?? ""}
                  onBlur={(e) => e.target.value !== (t.resolution ?? "") && update(t.id, { resolution: e.target.value || null })}
                />
              </div>
            ))
          )}
        </div>
      </GlassCard>
    </div>
  );
}