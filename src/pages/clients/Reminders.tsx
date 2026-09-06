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
import { addMonths, label, loadClientAccounts, loadJobsLite, REMINDER_TYPES, type Reminder } from "@/lib/clientSuccess";
import { CalendarClock, Check, Loader2, Plus, RotateCw } from "lucide-react";

const today = () => new Date().toISOString().slice(0, 10);

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

  return (
    <div className="space-y-6">
      <BackButton />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold">Renewals & Maintenance</h1>
          <p className="text-sm text-muted-foreground">Recurring service visits, inspections and contract renewals.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="mr-2 h-4 w-4" />New reminder</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Schedule a reminder</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Title, e.g. Annual gate service" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              <div className="grid gap-3 sm:grid-cols-2">
                <Select value={form.account_id} onValueChange={(v) => setForm({ ...form, account_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Client account" /></SelectTrigger>
                  <SelectContent>{accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={form.job_id} onValueChange={(v) => setForm({ ...form, job_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Related job" /></SelectTrigger>
                  <SelectContent>{jobs.map((j) => <SelectItem key={j.id} value={j.id}>{j.job_number} · {j.client_name}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={form.reminder_type} onValueChange={(v) => setForm({ ...form, reminder_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{REMINDER_TYPES.map((t) => <SelectItem key={t} value={t}>{label(t)}</SelectItem>)}</SelectContent>
                </Select>
                <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
                <Select value={form.recurrence_months} onValueChange={(v) => setForm({ ...form, recurrence_months: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">One-off</SelectItem>
                    <SelectItem value="1">Every month</SelectItem>
                    <SelectItem value="3">Every 3 months</SelectItem>
                    <SelectItem value="6">Every 6 months</SelectItem>
                    <SelectItem value="12">Every 12 months</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Textarea placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              <Button className="w-full" onClick={create} disabled={busy || !form.title.trim()}>
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Schedule
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Overdue", value: stats.overdue },
          { label: "Due in 30 days", value: stats.due30 },
          { label: "Scheduled", value: stats.scheduled },
          { label: "Completed", value: stats.done },
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
        <CardHeader><CardTitle className="font-heading text-lg">Upcoming</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {loading ? (
            <div className="flex h-24 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No reminders scheduled yet.</p>
          ) : (
            rows.map((r) => {
              const overdue = r.status === "scheduled" && r.due_date < today();
              return (
                <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded border p-3">
                  <div className="flex items-start gap-3">
                    <CalendarClock className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{r.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {accountName(r.account_id) || "Unlinked"} · {label(r.reminder_type)} · due {formatDate(r.due_date)}
                        {r.recurrence_months ? ` · repeats every ${r.recurrence_months} mo` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={overdue ? "destructive" : r.status === "scheduled" ? "outline" : "secondary"}>
                      {overdue ? "Overdue" : label(r.status)}
                    </Badge>
                    {r.status === "scheduled" && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => complete(r)}>
                          {r.recurrence_months ? <RotateCw className="mr-1 h-3.5 w-3.5" /> : <Check className="mr-1 h-3.5 w-3.5" />}Done
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => cancel(r.id)}>Cancel</Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
