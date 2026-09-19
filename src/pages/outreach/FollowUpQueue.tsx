import { useEffect, useMemo, useState } from "react";
import { AUTHORITY } from "@/lib/authority";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { whatsappLink } from "@/lib/whatsapp";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  formatInZone,
  isDue,
  loadScheduledSends,
  SEND_OUTCOMES,
  SEND_STATUS_LABELS,
  browserTimezone,
  loadSendAudit,
  logSendAction,
  AUDIT_ACTION_LABELS,
  TIMEZONES,
  zonedInputToUtcIso,
  utcIsoToZonedInput,
  type ScheduledSend,
  type SendAuditEntry,
} from "@/lib/followups";
import {
  CalendarClock,
  CheckCircle2,
  Download,
  Eye,
  History,
  Loader2,
  Save,
  Send,
  XCircle,
  Megaphone,
  Clock,
  AlertCircle,
  MessageSquare,
  Globe,
  FileSpreadsheet,
} from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Campaign = Pick<Tables<"campaigns">, "id" | "name">;

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

export default function FollowUpQueue() {
  const { orgId, user, authority } = useAuth();
  const canViewAudit = authority >= AUTHORITY.MANAGER;
  const canEditSends = authority >= AUTHORITY.MANAGER;
  const canExportAudit = authority >= AUTHORITY.BOARD;

  const [sends, setSends] = useState<ScheduledSend[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<ScheduledSend | null>(null);
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<Record<string, string>>({});
  const [audit, setAudit] = useState<SendAuditEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [editMessage, setEditMessage] = useState("");
  const [editWhen, setEditWhen] = useState("");
  const [editTz, setEditTz] = useState("UTC");
  const myTz = useMemo(() => browserTimezone(), []);

  const refreshAudit = async (sendId: string) => {
    setAuditLoading(true);
    try {
      setAudit(await loadSendAudit(sendId));
    } catch {
      setAudit([]);
    }
    setAuditLoading(false);
  };

  const openPreview = async (row: ScheduledSend) => {
    setPreview(row);
    setEditMessage(row.message);
    setEditTz(row.timezone);
    setEditWhen(utcIsoToZonedInput(row.scheduled_at, row.timezone));
    setAudit([]);
    if (!canViewAudit) return;
    await logSendAction(row, "reviewed", { opened: "preview" }).catch(() => undefined);
    refreshAudit(row.id);
  };

  const exportAudit = () => {
    if (!preview || !canExportAudit) return;
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = [
      ["When", "Action", "Person", "From", "To", "Details"].join(","),
      ...audit.map((a) =>
        [
          esc(a.created_at),
          esc(AUDIT_ACTION_LABELS[a.action] ?? a.action),
          esc(a.actor_name),
          esc(a.from_status),
          esc(a.to_status),
          esc(JSON.stringify(a.details)),
        ].join(",")
      ),
    ].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `follow-up-audit-${preview.id.slice(0, 8)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    logSendAction(preview, "exported", { rows: audit.length }).catch(() => undefined);
  };

  const load = async () => {
    if (!orgId) return;
    setLoading(true);
    const [rows, cs] = await Promise.all([
      loadScheduledSends(orgId),
      supabase.from("campaigns").select("id,name").eq("org_id", orgId),
    ]);
    setSends(rows);
    setCampaigns(cs.data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [orgId]);

  const campaignName = (id: string) => campaigns.find((c) => c.id === id)?.name ?? "Campaign";

  const update = async (row: ScheduledSend, patch: Partial<ScheduledSend>, note: string) => {
    setBusy(true);
    const { error } = await supabase.from("campaign_scheduled_sends").update(patch).eq("id", row.id);
    setBusy(false);
    if (error) return toast({ title: "Could not update", description: error.message, variant: "destructive" });
    toast({ title: note });
    setPreview(null);
    load();
  };

  const approve = (row: ScheduledSend) =>
    update(
      row,
      { status: "approved", approved_by: user?.id ?? null, approved_at: new Date().toISOString() },
      "Follow-up approved"
    );

  const cancel = (row: ScheduledSend) =>
    update(row, { status: "cancelled", cancelled_reason: "Cancelled by owner" }, "Follow-up cancelled");

  const saveEdit = async () => {
    if (!preview) return;
    const scheduledAt = editWhen ? zonedInputToUtcIso(editWhen, editTz) : preview.scheduled_at;
    setBusy(true);
    const { error } = await supabase
      .from("campaign_scheduled_sends")
      .update({ message: editMessage, scheduled_at: scheduledAt, timezone: editTz })
      .eq("id", preview.id);
    setBusy(false);
    if (error) return toast({ title: "Could not save changes", description: error.message, variant: "destructive" });
    toast({ title: "Changes saved" });
    const updated = { ...preview, message: editMessage, scheduled_at: scheduledAt, timezone: editTz };
    setPreview(updated);
    refreshAudit(preview.id);
    load();
  };

  const markSent = async (row: ScheduledSend) => {
    const chosen = outcome[row.id] || "sent";
    const picked = SEND_OUTCOMES.find((o) => o.value === chosen);
    window.open(whatsappLink(row.phone, row.message), "_blank", "noopener,noreferrer");
    if (orgId) {
      await supabase.from("activities").insert({
        org_id: orgId,
        account_id: row.account_id,
        contact_id: row.contact_id,
        lead_id: row.lead_id,
        type: "note",
        subject: `${campaignName(row.campaign_id)}: ${row.step_subject}`,
        body: `Scheduled WhatsApp to ${row.phone} — outcome: ${picked?.label}\n\n${row.message}`,
        completed_at: new Date().toISOString(),
        assigned_to: user?.id ?? null,
        created_by: user?.id ?? null,
      });
      if (row.member_id) {
        await supabase
          .from("campaign_members")
          .update({ status: picked?.status ?? "contacted", last_touch_at: new Date().toISOString() })
          .eq("id", row.member_id);
      }
    }
    await update(row, { status: "sent", outcome: chosen, sent_at: new Date().toISOString() }, "Marked as sent");
  };

  const byStatus = (s: string) => sends.filter((x) => x.status === s);
  const pending = byStatus("pending_approval");
  const approved = byStatus("approved");
  const done = sends.filter((x) => ["sent", "cancelled", "skipped"].includes(x.status));

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.15)]">
            <CheckCircle2 className="h-3 w-3 text-emerald-400" /> Approved
          </span>
        );
      case "pending_approval":
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-0.5 text-[10px] font-bold text-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.15)]">
            <Clock className="h-3 w-3 text-amber-400" /> Pending Approval
          </span>
        );
      case "sent":
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2.5 py-0.5 text-[10px] font-bold text-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.15)]">
            <Send className="h-3 w-3 text-cyan-400" /> Sent
          </span>
        );
      case "cancelled":
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 py-0.5 text-[10px] font-bold text-rose-300">
            <XCircle className="h-3 w-3 text-rose-400" /> Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 text-[10px] font-medium text-slate-300">
            {SEND_STATUS_LABELS[status] ?? status}
          </span>
        );
    }
  };

  const Row = ({ row }: { row: ScheduledSend }) => (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-white/[0.085] bg-[#161c26]/60 p-3.5 transition-all hover:border-cyan-400/30">
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-xs font-bold text-white tracking-tight">
          {row.client_name || "Client"} · <span className="text-cyan-300">{row.step_subject}</span>
        </p>
        <p className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
          <Megaphone className="h-3 w-3 text-cyan-400 shrink-0" />
          <Link className="text-slate-300 underline hover:text-cyan-300" to={`/outreach/campaigns/${row.campaign_id}`}>
            {campaignName(row.campaign_id)}
          </Link>
          <span className="text-slate-600">·</span>
          <Clock className="h-3 w-3 text-amber-400 shrink-0" />
          <span>{formatInZone(row.scheduled_at, row.timezone)}</span>
          <span className="text-slate-500">({row.timezone})</span>
          {row.timezone !== myTz && (
            <span className="text-slate-500">· your time {formatInZone(row.scheduled_at, myTz)}</span>
          )}
        </p>
      </div>

      <div className="flex items-center gap-2">
        {getStatusBadge(row.status)}

        {row.status === "approved" && isDue(row) && (
          <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/40 bg-rose-500/20 px-2.5 py-0.5 text-[10px] font-bold text-rose-300 animate-pulse shadow-[0_0_12px_rgba(244,63,94,0.3)]">
            <AlertCircle className="h-3 w-3 text-rose-400" /> Due now
          </span>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => openPreview(row)}
          className="h-8 rounded-lg border-white/[0.08] bg-white/[0.03] px-2.5 text-xs font-semibold text-slate-200 hover:bg-white/[0.06] hover:text-white"
        >
          <Eye className="mr-1.5 h-3.5 w-3.5 text-cyan-400" /> Preview
        </Button>

        {canEditSends && row.status === "pending_approval" && (
          <Button
            size="sm"
            onClick={() => approve(row)}
            disabled={busy}
            className="h-8 rounded-lg bg-emerald-500 px-3 text-xs font-bold text-slate-950 shadow-[0_0_16px_rgba(16,185,129,0.2)] hover:bg-emerald-400"
          >
            <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Approve
          </Button>
        )}

        {canEditSends && row.status === "approved" && (
          <>
            <Select
              value={outcome[row.id] ?? "sent"}
              onValueChange={(v) => setOutcome((o) => ({ ...o, [row.id]: v }))}
            >
              <SelectTrigger className="h-8 w-40 rounded-lg border-white/[0.08] bg-[#10151d] text-xs text-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-white/[0.085] bg-[#10151d] text-slate-200">
                {SEND_OUTCOMES.map((o) => (
                  <SelectItem key={o.value} value={o.value} className="text-xs">
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              size="sm"
              onClick={() => markSent(row)}
              disabled={busy}
              className="h-8 rounded-lg bg-cyan-500 px-3 text-xs font-bold text-slate-950 shadow-[0_0_16px_rgba(34,211,238,0.2)] hover:bg-cyan-400"
            >
              <Send className="mr-1.5 h-3.5 w-3.5" /> Open chat & log
            </Button>
          </>
        )}

        {canEditSends && ["pending_approval", "approved"].includes(row.status) && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => cancel(row)}
            disabled={busy}
            className="h-8 rounded-lg text-xs font-semibold text-slate-400 hover:bg-rose-500/10 hover:text-rose-400"
          >
            <XCircle className="mr-1.5 h-3.5 w-3.5 text-rose-400" /> Cancel
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6 text-slate-200">
      {/* HEADER BAR */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-3 border-b border-white/[0.085] pb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.15)]">
            <CalendarClock className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">Scheduled follow-ups</h1>
            <p className="text-xs text-slate-400">
              Manage automated outreach schedules, reviews, approvals and send history.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
          </div>
        ) : (
          <Tabs defaultValue="pending" className="mt-4 space-y-4">
            <TabsList className="h-10 rounded-xl border border-white/[0.085] bg-[#10151d] p-1 text-slate-400">
              <TabsTrigger
                value="pending"
                className="rounded-lg px-3 text-xs font-semibold transition-all data-[state=active]:bg-cyan-500 data-[state=active]:text-slate-950 data-[state=active]:shadow-[0_0_12px_rgba(34,211,238,0.25)]"
              >
                Waiting approval ({pending.length})
              </TabsTrigger>
              <TabsTrigger
                value="approved"
                className="rounded-lg px-3 text-xs font-semibold transition-all data-[state=active]:bg-cyan-500 data-[state=active]:text-slate-950 data-[state=active]:shadow-[0_0_12px_rgba(34,211,238,0.25)]"
              >
                Approved ({approved.length})
              </TabsTrigger>
              <TabsTrigger
                value="done"
                className="rounded-lg px-3 text-xs font-semibold transition-all data-[state=active]:bg-cyan-500 data-[state=active]:text-slate-950 data-[state=active]:shadow-[0_0_12px_rgba(34,211,238,0.25)]"
              >
                History ({done.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="space-y-2.5 pt-2">
              {!pending.length && <p className="text-xs text-slate-400">Nothing waiting for approval.</p>}
              {pending.map((r) => (
                <Row key={r.id} row={r} />
              ))}
            </TabsContent>

            <TabsContent value="approved" className="space-y-2.5 pt-2">
              {!approved.length && <p className="text-xs text-slate-400">No approved follow-ups queued.</p>}
              {approved.map((r) => (
                <Row key={r.id} row={r} />
              ))}
            </TabsContent>

            <TabsContent value="done" className="space-y-2.5 pt-2">
              {!done.length && <p className="text-xs text-slate-400">No history yet.</p>}
              {done.map((r) => (
                <Row key={r.id} row={r} />
              ))}
            </TabsContent>
          </Tabs>
        )}
      </GlassCard>

      {/* PREVIEW & AUDIT DIALOG */}
      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-white/[0.085] bg-[#10151d] text-slate-200 sm:max-w-lg">
          <DialogHeader className="border-b border-white/[0.085] pb-3">
            <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
              <Eye className="h-4 w-4 text-cyan-400" />
              Preview follow-up
            </DialogTitle>
          </DialogHeader>

          {preview && (
            <div className="space-y-4 text-xs">
              {/* TARGET DETAILS */}
              <div className="rounded-xl border border-white/[0.08] bg-[#161c26]/60 p-3 text-slate-300 space-y-1">
                <p className="font-bold text-white text-xs">
                  To {preview.client_name} · <span className="text-cyan-300">{preview.phone}</span>
                </p>
                <p className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  <Clock className="h-3 w-3 text-amber-400 shrink-0" />
                  {formatInZone(preview.scheduled_at, preview.timezone)} ({preview.timezone})
                </p>
              </div>

              {/* MESSAGE & TIME EDITING */}
              {canEditSends && ["pending_approval", "approved"].includes(preview.status) ? (
                <div className="space-y-3.5">
                  <div className="space-y-1">
                    <Label className="text-[11px] uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <MessageSquare className="h-3 w-3 text-cyan-400" />
                      Message
                    </Label>
                    <Textarea
                      rows={5}
                      value={editMessage}
                      onChange={(e) => setEditMessage(e.target.value)}
                      className="rounded-xl border-white/[0.08] bg-[#161c26] text-xs text-slate-200 focus:border-cyan-400/30 focus:ring-1 focus:ring-cyan-400/30"
                    />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-[11px] uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <Clock className="h-3 w-3 text-amber-400" />
                        Send at
                      </Label>
                      <Input
                        type="datetime-local"
                        value={editWhen}
                        onChange={(e) => setEditWhen(e.target.value)}
                        className="h-9 rounded-xl border-white/[0.08] bg-[#161c26] text-xs text-slate-200 focus:border-cyan-400/30"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[11px] uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <Globe className="h-3 w-3 text-emerald-400" />
                        Time zone
                      </Label>
                      <Select value={editTz} onValueChange={setEditTz}>
                        <SelectTrigger className="h-9 rounded-xl border-white/[0.08] bg-[#161c26] text-xs text-slate-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="border-white/[0.085] bg-[#10151d] text-slate-200">
                          {[...new Set([editTz, ...TIMEZONES])].map((tz) => (
                            <SelectItem key={tz} value={tz} className="text-xs">
                              {tz}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={saveEdit}
                    disabled={busy}
                    className="h-8 rounded-lg border-white/[0.08] bg-white/[0.03] text-xs font-semibold text-slate-200 hover:bg-white/[0.06] hover:text-white"
                  >
                    <Save className="mr-1.5 h-3.5 w-3.5 text-cyan-400" /> Save changes
                  </Button>
                </div>
              ) : (
                <div className="whitespace-pre-wrap rounded-xl border border-white/[0.08] bg-[#161c26]/60 p-3 text-xs leading-relaxed text-slate-200">
                  {preview.message}
                </div>
              )}

              {/* AUDIT TRAIL */}
              <div className="space-y-2.5 pt-2 border-t border-white/[0.085]">
                <div className="flex items-center justify-between gap-2">
                  <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <History className="h-3.5 w-3.5 text-amber-400" /> Audit trail
                  </p>
                  {canViewAudit && canExportAudit && !!audit.length && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={exportAudit}
                      className="h-7 rounded-lg text-[11px] text-slate-400 hover:bg-white/[0.05] hover:text-white"
                    >
                      <Download className="mr-1.5 h-3 w-3 text-cyan-400" /> Export CSV
                    </Button>
                  )}
                </div>

                {!canViewAudit && (
                  <p className="text-[11px] text-slate-500">
                    Only managers and above can see who reviewed, approved or changed this follow-up.
                  </p>
                )}

                {canViewAudit && auditLoading && <p className="text-[11px] text-slate-500">Loading history…</p>}
                {canViewAudit && !auditLoading && !audit.length && (
                  <p className="text-[11px] text-slate-500">No history yet.</p>
                )}

                <ol className="space-y-2">
                  {audit.map((a) => (
                    <li key={a.id} className="rounded-xl border border-white/[0.08] bg-[#161c26]/40 p-2.5 space-y-0.5">
                      <p className="text-xs font-bold text-slate-200">
                        {AUDIT_ACTION_LABELS[a.action] ?? a.action} · <span className="text-cyan-300">{a.actor_name}</span>
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {formatInZone(a.created_at, myTz)}
                        {a.from_status && a.to_status && a.from_status !== a.to_status && (
                          <>
                            {" · "}
                            <span className="text-slate-500">{SEND_STATUS_LABELS[a.from_status] ?? a.from_status}</span>
                            {" → "}
                            <span className="text-cyan-400 font-semibold">{SEND_STATUS_LABELS[a.to_status] ?? a.to_status}</span>
                          </>
                        )}
                      </p>
                      {a.action === "edited" && (
                        <p className="mt-1 whitespace-pre-wrap text-[11px] text-slate-400 italic">
                          {Object.keys(a.details as Record<string, unknown>).join(", ").replace(/_/g, " ")}
                        </p>
                      )}
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          )}

          <DialogFooter className="border-t border-white/[0.085] pt-3">
            {canEditSends && preview?.status === "pending_approval" && (
              <Button
                onClick={() => preview && approve(preview)}
                disabled={busy}
                className="h-8.5 rounded-lg bg-emerald-500 px-4 text-xs font-bold text-slate-950 shadow-[0_0_16px_rgba(16,185,129,0.2)] hover:bg-emerald-400"
              >
                <CheckCircle2 className="mr-1.5 h-4 w-4" /> Approve
              </Button>
            )}
            {canEditSends && preview && ["pending_approval", "approved"].includes(preview.status) && (
              <Button
                variant="outline"
                onClick={() => cancel(preview)}
                disabled={busy}
                className="h-8.5 rounded-lg border-white/[0.08] bg-white/[0.03] px-4 text-xs font-semibold text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
              >
                <XCircle className="mr-1.5 h-4 w-4" /> Cancel send
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}