import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import BackButton from "@/components/layout/BackButton";
import { toast } from "sonner";
import { formatDate } from "@/lib/crm";
import {
  label,
  loadClientAccounts,
  loadJobsLite,
  OPEN_TICKET_STATUSES,
  priorityVariant,
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  type Ticket,
} from "@/lib/clientSuccess";
import { Loader2, Plus } from "lucide-react";

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

  return (
    <div className="space-y-6">
      <BackButton />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold">Support Tickets</h1>
          <p className="text-sm text-muted-foreground">Client issues, warranty calls and requests in one queue.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="mr-2 h-4 w-4" />New ticket</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Log a ticket</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
              <Textarea placeholder="What is the issue?" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              <div className="grid gap-3 sm:grid-cols-2">
                <Select value={form.account_id} onValueChange={(v) => setForm({ ...form, account_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Client account" /></SelectTrigger>
                  <SelectContent>{accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={form.job_id} onValueChange={(v) => setForm({ ...form, job_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Related job" /></SelectTrigger>
                  <SelectContent>{jobs.map((j) => <SelectItem key={j.id} value={j.id}>{j.job_number} · {j.client_name}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TICKET_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{label(c)}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TICKET_PRIORITIES.map((p) => <SelectItem key={p} value={p}>{label(p)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Button className="w-full" onClick={create} disabled={busy || !form.subject.trim()}>
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Log ticket
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Open", value: counts.open },
          { label: "Urgent open", value: counts.urgent },
          { label: "Resolved / closed", value: counts.resolved },
          { label: "All tickets", value: counts.total },
        ].map((k) => (
          <Card key={k.label}>
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{k.label}</p>
              <p className="mt-1 font-heading text-2xl font-bold">{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle className="font-heading text-lg">Queue</CardTitle>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="open">Open only</SelectItem>
              <SelectItem value="all">All</SelectItem>
              {TICKET_STATUSES.map((s) => <SelectItem key={s} value={s}>{label(s)}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="flex h-24 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : visible.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tickets here yet.</p>
          ) : (
            visible.map((t) => (
              <div key={t.id} className="space-y-2 rounded border p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">#{t.ticket_number} · {t.subject}</p>
                    <p className="text-xs text-muted-foreground">
                      {accountName(t.account_id) || "No account"} · {label(t.category)} · {formatDate(t.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={priorityVariant(t.priority)}>{label(t.priority)}</Badge>
                    <Select value={t.status} onValueChange={(v) => update(t.id, { status: v, resolved_at: v === "resolved" || v === "closed" ? new Date().toISOString() : null })}>
                      <SelectTrigger className="h-8 w-40"><SelectValue /></SelectTrigger>
                      <SelectContent>{TICKET_STATUSES.map((s) => <SelectItem key={s} value={s}>{label(s)}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                {t.description && <p className="text-sm text-muted-foreground">{t.description}</p>}
                <Textarea
                  className="min-h-[60px]"
                  placeholder="Resolution notes"
                  defaultValue={t.resolution ?? ""}
                  onBlur={(e) => e.target.value !== (t.resolution ?? "") && update(t.id, { resolution: e.target.value || null })}
                />
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
