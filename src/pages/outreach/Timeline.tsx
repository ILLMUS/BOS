import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { ACTIVITY_TYPE_LABELS, formatDate, type Account, type Activity, type ActivityType, type Contact } from "@/lib/crm";
import { BellRing, CheckCircle2, Loader2, Plus } from "lucide-react";

const TYPES: ActivityType[] = ["call", "email", "meeting", "note", "task", "follow_up"];

export default function OutreachTimeline() {
  const { orgId, user } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ subject: "", body: "", type: "follow_up" as ActivityType, account_id: "none", contact_id: "none", due_at: "" });

  const load = async () => {
    const [a, ac, c] = await Promise.all([
      supabase.from("activities").select("*").order("created_at", { ascending: false }).limit(300),
      supabase.from("accounts").select("*").order("name"),
      supabase.from("contacts").select("*").order("full_name"),
    ]);
    setActivities(a.data || []);
    setAccounts(ac.data || []);
    setContacts(c.data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!orgId || !form.subject.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("activities").insert({
      org_id: orgId,
      type: form.type,
      subject: form.subject.trim(),
      body: form.body || null,
      account_id: form.account_id === "none" ? null : form.account_id,
      contact_id: form.contact_id === "none" ? null : form.contact_id,
      due_at: form.due_at ? new Date(form.due_at).toISOString() : null,
      assigned_to: user?.id ?? null,
      created_by: user?.id ?? null,
    });
    setSaving(false);
    if (error) return toast({ title: "Could not save", description: error.message, variant: "destructive" });
    setOpen(false);
    setForm({ subject: "", body: "", type: "follow_up", account_id: "none", contact_id: "none", due_at: "" });
    load();
  };

  const complete = async (id: string) => {
    await supabase.from("activities").update({ completed_at: new Date().toISOString() }).eq("id", id);
    load();
  };

  const snooze = async (a: Activity, days: number) => {
    const base = a.due_at ? new Date(a.due_at).getTime() : Date.now();
    await supabase.from("activities").update({ due_at: new Date(Math.max(base, Date.now()) + days * 86400000).toISOString() }).eq("id", a.id);
    load();
  };

  const now = Date.now();
  const filtered = useMemo(
    () => (filter === "all" ? activities : activities.filter((a) => a.account_id === filter)),
    [activities, filter],
  );
  const reminders = filtered.filter((a) => !a.completed_at && a.due_at).sort((x, y) => new Date(x.due_at!).getTime() - new Date(y.due_at!).getTime());
  const accountName = (id: string | null) => accounts.find((a) => a.id === id)?.name;

  if (loading) return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold">Contact timeline</h1>
          <p className="text-sm text-muted-foreground">Every touch across your contacts, plus the follow-ups you owe.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-52"><SelectValue placeholder="All contacts" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All accounts</SelectItem>
              {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-1 h-4 w-4" /> Log / schedule</Button></DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader><DialogTitle>Log a touch or schedule a reminder</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1"><Label>Subject</Label>
                  <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1"><Label>Type</Label>
                    <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as ActivityType })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{TYPES.map((t) => <SelectItem key={t} value={t}>{ACTIVITY_TYPE_LABELS[t]}</SelectItem>)}</SelectContent>
                    </Select></div>
                  <div className="space-y-1"><Label>Remind me on</Label>
                    <Input type="datetime-local" value={form.due_at} onChange={(e) => setForm({ ...form, due_at: e.target.value })} /></div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1"><Label>Account</Label>
                    <Select value={form.account_id} onValueChange={(v) => setForm({ ...form, account_id: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                      </SelectContent>
                    </Select></div>
                  <div className="space-y-1"><Label>Contact</Label>
                    <Select value={form.contact_id} onValueChange={(v) => setForm({ ...form, contact_id: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {contacts
                          .filter((c) => form.account_id === "none" || c.account_id === form.account_id)
                          .map((c) => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}
                      </SelectContent>
                    </Select></div>
                </div>
                <div className="space-y-1"><Label>Notes</Label>
                  <Textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></div>
              </div>
              <DialogFooter>
                <Button onClick={save} disabled={saving || !form.subject.trim()}>
                  {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} Save
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {reminders.length > 0 && (
        <Card>
          <CardContent className="space-y-2 p-4">
            <p className="flex items-center gap-2 text-sm font-medium"><BellRing className="h-4 w-4" /> Follow-up reminders</p>
            {reminders.slice(0, 6).map((a) => {
              const overdue = new Date(a.due_at!).getTime() < now;
              return (
                <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded border p-2 text-sm">
                  <div>
                    <span className="font-medium">{a.subject}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {accountName(a.account_id) ? `${accountName(a.account_id)} · ` : ""}Due {formatDate(a.due_at!)}
                    </span>
                    {overdue && <Badge variant="outline" className="ml-2 border-destructive/20 bg-destructive/10 text-destructive">Overdue</Badge>}
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => snooze(a, 1)}>+1d</Button>
                    <Button size="sm" variant="ghost" onClick={() => snooze(a, 7)}>+1w</Button>
                    <Button size="sm" variant="ghost" onClick={() => complete(a.id)}><CheckCircle2 className="mr-1 h-4 w-4" /> Done</Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <div className="relative space-y-3 border-l border-border pl-4">
        {!filtered.length && <p className="text-sm text-muted-foreground">No activity recorded yet.</p>}
        {filtered.map((a) => (
          <div key={a.id} className="relative">
            <span className="absolute -left-[21px] top-3 h-2 w-2 rounded-full bg-primary" />
            <Card>
              <CardContent className="p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{ACTIVITY_TYPE_LABELS[a.type]}</Badge>
                  <span className="font-medium">{a.subject}</span>
                  {a.completed_at && <Badge variant="outline" className="text-primary">Done</Badge>}
                  {a.account_id && (
                    <Link to={`/crm/accounts/${a.account_id}`} className="text-xs text-muted-foreground underline">
                      {accountName(a.account_id)}
                    </Link>
                  )}
                </div>
                {a.body && <p className="mt-1 text-sm text-muted-foreground">{a.body}</p>}
                <p className="mt-1 text-xs text-muted-foreground">
                  {a.completed_at ? `Completed ${formatDate(a.completed_at)}` : a.due_at ? `Due ${formatDate(a.due_at)}` : formatDate(a.created_at)}
                </p>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
}