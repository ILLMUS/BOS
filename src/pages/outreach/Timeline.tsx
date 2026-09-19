import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { ACTIVITY_TYPE_LABELS, formatDateTime, type Account, type Activity, type ActivityType, type Contact } from "@/lib/crm";
import {
  BellRing,
  CheckCircle2,
  Loader2,
  Plus,
  History,
  Phone,
  Mail,
  Calendar,
  FileText,
  CheckSquare,
  Clock,
  AlertCircle,
  Building2,
  User,
  Sparkles,
} from "lucide-react";

const TYPES: ActivityType[] = ["call", "email", "meeting", "note", "task", "follow_up"];

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
        backdrop-blur-md
        ${className}
      `}
    >
      <div className="pointer-events-none absolute -right-20 -top-20 h-40 w-40 rounded-full bg-cyan-500/[0.035] blur-3xl" />
      {children}
    </div>
  );
}

export default function OutreachTimeline() {
  const { orgId, user } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    subject: "",
    body: "",
    type: "follow_up" as ActivityType,
    account_id: "none",
    contact_id: "none",
    due_at: "",
  });

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

  useEffect(() => {
    load();
  }, []);

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
    await supabase
      .from("activities")
      .update({ due_at: new Date(Math.max(base, Date.now()) + days * 86400000).toISOString() })
      .eq("id", a.id);
    load();
  };

  const now = Date.now();
  const filtered = useMemo(
    () => (filter === "all" ? activities : activities.filter((a) => a.account_id === filter)),
    [activities, filter]
  );
  const reminders = filtered
    .filter((a) => !a.completed_at && a.due_at)
    .sort((x, y) => new Date(x.due_at!).getTime() - new Date(y.due_at!).getTime());
  const accountName = (id: string | null) => accounts.find((a) => a.id === id)?.name;

  const getActivityTypeBadge = (type: ActivityType) => {
    switch (type) {
      case "call":
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2 py-0.5 text-[10px] font-bold text-cyan-300">
            <Phone className="h-2.5 w-2.5 text-cyan-400" /> {ACTIVITY_TYPE_LABELS[type]}
          </span>
        );
      case "email":
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-purple-400/30 bg-purple-400/10 px-2 py-0.5 text-[10px] font-bold text-purple-300">
            <Mail className="h-2.5 w-2.5 text-purple-400" /> {ACTIVITY_TYPE_LABELS[type]}
          </span>
        );
      case "meeting":
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[10px] font-bold text-amber-300">
            <Calendar className="h-2.5 w-2.5 text-amber-400" /> {ACTIVITY_TYPE_LABELS[type]}
          </span>
        );
      case "note":
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-slate-400/30 bg-slate-400/10 px-2 py-0.5 text-[10px] font-bold text-slate-300">
            <FileText className="h-2.5 w-2.5 text-slate-400" /> {ACTIVITY_TYPE_LABELS[type]}
          </span>
        );
      case "task":
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-blue-400/30 bg-blue-400/10 px-2 py-0.5 text-[10px] font-bold text-blue-300">
            <CheckSquare className="h-2.5 w-2.5 text-blue-400" /> {ACTIVITY_TYPE_LABELS[type]}
          </span>
        );
      case "follow_up":
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
            <Clock className="h-2.5 w-2.5 text-emerald-400" /> {ACTIVITY_TYPE_LABELS[type]}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 text-slate-200">
      {/* HEADER SECTION */}
      <GlassCard className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.085] pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.15)]">
              <History className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">Contact timeline</h1>
              <p className="text-xs text-slate-400">
                Every touch across your contacts, plus the follow-ups you owe.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="h-9 w-52 rounded-xl border-white/[0.08] bg-[#161c26] text-xs text-slate-200 focus:border-cyan-400/30">
                <SelectValue placeholder="All contacts" />
              </SelectTrigger>
              <SelectContent className="border-white/[0.085] bg-[#10151d] text-slate-200">
                <SelectItem value="all" className="text-xs">All accounts</SelectItem>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id} className="text-xs">
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="h-9 rounded-xl bg-cyan-500 px-3.5 text-xs font-bold text-slate-950 shadow-[0_0_16px_rgba(34,211,238,0.2)] hover:bg-cyan-400">
                  <Plus className="mr-1.5 h-4 w-4" /> Log / schedule
                </Button>
              </DialogTrigger>

              <DialogContent className="max-h-[90vh] overflow-y-auto border-white/[0.085] bg-[#10151d] text-slate-200 sm:max-w-lg">
                <DialogHeader className="border-b border-white/[0.085] pb-3">
                  <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-cyan-400" />
                    Log a touch or schedule a reminder
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-3.5 pt-2 text-xs">
                  <div className="space-y-1">
                    <Label className="text-[11px] uppercase tracking-wider text-slate-400">Subject</Label>
                    <Input
                      value={form.subject}
                      onChange={(e) => setForm({ ...form, subject: e.target.value })}
                      placeholder="e.g. Call regarding quote update"
                      className="h-9 rounded-xl border-white/[0.08] bg-[#161c26] text-xs text-slate-200 focus:border-cyan-400/30"
                    />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-[11px] uppercase tracking-wider text-slate-400">Type</Label>
                      <Select
                        value={form.type}
                        onValueChange={(v) => setForm({ ...form, type: v as ActivityType })}
                      >
                        <SelectTrigger className="h-9 rounded-xl border-white/[0.08] bg-[#161c26] text-xs text-slate-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="border-white/[0.085] bg-[#10151d] text-slate-200">
                          {TYPES.map((t) => (
                            <SelectItem key={t} value={t} className="text-xs">
                              {ACTIVITY_TYPE_LABELS[t]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[11px] uppercase tracking-wider text-slate-400">Remind me on</Label>
                      <Input
                        type="datetime-local"
                        value={form.due_at}
                        onChange={(e) => setForm({ ...form, due_at: e.target.value })}
                        className="h-9 rounded-xl border-white/[0.08] bg-[#161c26] text-xs text-slate-200 focus:border-cyan-400/30"
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-[11px] uppercase tracking-wider text-slate-400 flex items-center gap-1">
                        <Building2 className="h-3 w-3 text-cyan-400" /> Account
                      </Label>
                      <Select
                        value={form.account_id}
                        onValueChange={(v) => setForm({ ...form, account_id: v })}
                      >
                        <SelectTrigger className="h-9 rounded-xl border-white/[0.08] bg-[#161c26] text-xs text-slate-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="border-white/[0.085] bg-[#10151d] text-slate-200">
                          <SelectItem value="none" className="text-xs">None</SelectItem>
                          {accounts.map((a) => (
                            <SelectItem key={a.id} value={a.id} className="text-xs">
                              {a.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[11px] uppercase tracking-wider text-slate-400 flex items-center gap-1">
                        <User className="h-3 w-3 text-cyan-400" /> Contact
                      </Label>
                      <Select
                        value={form.contact_id}
                        onValueChange={(v) => setForm({ ...form, contact_id: v })}
                      >
                        <SelectTrigger className="h-9 rounded-xl border-white/[0.08] bg-[#161c26] text-xs text-slate-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="border-white/[0.085] bg-[#10151d] text-slate-200">
                          <SelectItem value="none" className="text-xs">None</SelectItem>
                          {contacts
                            .filter((c) => form.account_id === "none" || c.account_id === form.account_id)
                            .map((c) => (
                              <SelectItem key={c.id} value={c.id} className="text-xs">
                                {c.full_name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] uppercase tracking-wider text-slate-400">Notes</Label>
                    <Textarea
                      rows={4}
                      value={form.body}
                      onChange={(e) => setForm({ ...form, body: e.target.value })}
                      placeholder="Add conversation summary or detailed requirements..."
                      className="rounded-xl border-white/[0.08] bg-[#161c26] text-xs text-slate-200 focus:border-cyan-400/30 focus:ring-1 focus:ring-cyan-400/30"
                    />
                  </div>
                </div>

                <DialogFooter className="border-t border-white/[0.085] pt-3">
                  <Button
                    onClick={save}
                    disabled={saving || !form.subject.trim()}
                    className="h-8.5 rounded-lg bg-cyan-500 px-4 text-xs font-bold text-slate-950 shadow-[0_0_16px_rgba(34,211,238,0.2)] hover:bg-cyan-400"
                  >
                    {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />} Save
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* REMINDERS SECTION */}
        {reminders.length > 0 && (
          <div className="mt-5 space-y-2.5 rounded-xl border border-amber-400/20 bg-amber-400/[0.03] p-4">
            <p className="flex items-center gap-2 text-xs font-bold text-amber-300">
              <BellRing className="h-4 w-4 text-amber-400 animate-bounce" /> Follow-up reminders ({reminders.length})
            </p>

            <div className="space-y-2">
              {reminders.slice(0, 6).map((a) => {
                const overdue = new Date(a.due_at!).getTime() < now;
                return (
                  <div
                    key={a.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/[0.08] bg-[#161c26]/80 p-3 text-xs transition-all hover:border-amber-400/30"
                  >
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <p className="font-bold text-white tracking-tight">{a.subject}</p>
                      <p className="text-[11px] text-slate-400 flex items-center gap-1">
                        {accountName(a.account_id) && (
                          <span className="text-cyan-300 font-semibold">{accountName(a.account_id)} · </span>
                        )}
                        <span>Due {formatDateTime(a.due_at!)}</span>
                        {overdue && (
                          <span className="ml-1.5 inline-flex items-center gap-1 rounded-full border border-rose-500/40 bg-rose-500/20 px-2 py-0.5 text-[9px] font-bold text-rose-300 shadow-[0_0_8px_rgba(244,63,94,0.3)]">
                            <AlertCircle className="h-2.5 w-2.5 text-rose-400" /> Overdue
                          </span>
                        )}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => snooze(a, 1)}
                        className="h-7 rounded-lg border-white/[0.08] bg-white/[0.03] px-2 text-[11px] font-medium text-slate-300 hover:bg-white/[0.06] hover:text-white"
                      >
                        +1d
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => snooze(a, 7)}
                        className="h-7 rounded-lg border-white/[0.08] bg-white/[0.03] px-2 text-[11px] font-medium text-slate-300 hover:bg-white/[0.06] hover:text-white"
                      >
                        +1w
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => complete(a.id)}
                        className="h-7 rounded-lg bg-emerald-500 px-2.5 text-[11px] font-bold text-slate-950 shadow-[0_0_12px_rgba(16,185,129,0.2)] hover:bg-emerald-400"
                      >
                        <CheckCircle2 className="mr-1 h-3 w-3" /> Done
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TIMELINE SECTION */}
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
          </div>
        ) : (
          <div className="relative mt-6 space-y-4 border-l border-white/10 pl-5">
            {!filtered.length && <p className="text-xs text-slate-400">No activity recorded yet.</p>}

            {filtered.map((a) => (
              <div key={a.id} className="relative group">
                {/* TIMELINE NODE */}
                <span className="absolute -left-[25px] top-4 h-2.5 w-2.5 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)] transition-all group-hover:scale-125" />

                <div className="rounded-xl border border-white/[0.085] bg-[#161c26]/60 p-3.5 text-xs transition-all hover:border-cyan-400/30">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {getActivityTypeBadge(a.type)}
                      <span className="font-bold text-white text-xs">{a.subject}</span>
                      {a.completed_at && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                          <CheckCircle2 className="h-2.5 w-2.5 text-emerald-400" /> Done
                        </span>
                      )}
                    </div>

                    {a.account_id && (
                      <Link
                        to={`/crm/accounts/${a.account_id}`}
                        className="text-[11px] font-semibold text-cyan-300 hover:underline flex items-center gap-1"
                      >
                        <Building2 className="h-3 w-3 text-cyan-400" />
                        {accountName(a.account_id)}
                      </Link>
                    )}
                  </div>

                  {a.body && (
                    <p className="mt-2 whitespace-pre-wrap rounded-lg border border-white/[0.04] bg-[#10151d]/50 p-2 text-xs leading-relaxed text-slate-300">
                      {a.body}
                    </p>
                  )}

                  <p className="mt-2 text-[10px] text-slate-400 flex items-center gap-1">
                    <Clock className="h-3 w-3 text-slate-500" />
                    {a.completed_at
                      ? `Completed ${formatDateTime(a.completed_at)}`
                      : a.due_at
                      ? `Due ${formatDateTime(a.due_at)}`
                      : formatDateTime(a.created_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}