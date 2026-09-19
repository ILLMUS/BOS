import { useEffect, useMemo, useState } from "react";
import { AUTHORITY } from "@/lib/authority";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { whatsappLink } from "@/lib/whatsapp";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  formatInZone, isDue, loadScheduledSends, SEND_OUTCOMES, SEND_STATUS_LABELS,
  browserTimezone, loadSendAudit, logSendAction, AUDIT_ACTION_LABELS, TIMEZONES,
  zonedInputToUtcIso, utcIsoToZonedInput, type ScheduledSend, type SendAuditEntry,
} from "@/lib/followups";
import { CalendarClock, CheckCircle2, Download, Eye, History, Loader2, Save, Send, XCircle } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Campaign = Pick<Tables<"campaigns">, "id" | "name">;

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
    try { setAudit(await loadSendAudit(sendId)); } catch { setAudit([]); }
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
      ...audit.map((a) => [
        esc(a.created_at),
        esc(AUDIT_ACTION_LABELS[a.action] ?? a.action),
        esc(a.actor_name),
        esc(a.from_status),
        esc(a.to_status),
        esc(JSON.stringify(a.details)),
      ].join(",")),
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
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [orgId]);

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
    update(row, { status: "approved", approved_by: user?.id ?? null, approved_at: new Date().toISOString() }, "Follow-up approved");

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
        await supabase.from("campaign_members")
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

  const Row = ({ row }: { row: ScheduledSend }) => (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{row.client_name || "Client"} · {row.step_subject}</p>
        <p className="text-xs text-muted-foreground">
          <Link className="underline" to={`/outreach/campaigns/${row.campaign_id}`}>{campaignName(row.campaign_id)}</Link>
          {" · "}{formatInZone(row.scheduled_at, row.timezone)} ({row.timezone})
          {row.timezone !== myTz && <> · your time {formatInZone(row.scheduled_at, myTz)}</>}
        </p>
      </div>
      <Badge variant="outline">{SEND_STATUS_LABELS[row.status] ?? row.status}</Badge>
      {row.status === "approved" && isDue(row) && <Badge className="bg-warning text-warning-foreground">Due now</Badge>}
      <Button size="sm" variant="outline" onClick={() => openPreview(row)}>
        <Eye className="mr-1 h-3 w-3" /> Preview
      </Button>
      {canEditSends && row.status === "pending_approval" && (
        <Button size="sm" onClick={() => approve(row)} disabled={busy}>
          <CheckCircle2 className="mr-1 h-3 w-3" /> Approve
        </Button>
      )}
      {canEditSends && row.status === "approved" && (
        <>
          <Select value={outcome[row.id] ?? "sent"} onValueChange={(v) => setOutcome((o) => ({ ...o, [row.id]: v }))}>
            <SelectTrigger className="h-8 w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              {SEND_OUTCOMES.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={() => markSent(row)} disabled={busy}>
            <Send className="mr-1 h-3 w-3" /> Open chat & log
          </Button>
        </>
      )}
      {canEditSends && ["pending_approval", "approved"].includes(row.status) && (
        <Button size="sm" variant="ghost" onClick={() => cancel(row)} disabled={busy}>
          <XCircle className="mr-1 h-3 w-3" /> Cancel
        </Button>
      )}
    </div>
  );

  if (loading) {
    return <div className="flex justify-center p-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarClock className="h-4 w-4" /> Scheduled follow-ups
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="pending">
            <TabsList>
              <TabsTrigger value="pending">Waiting approval ({pending.length})</TabsTrigger>
              <TabsTrigger value="approved">Approved ({approved.length})</TabsTrigger>
              <TabsTrigger value="done">History ({done.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="pending" className="space-y-2 pt-3">
              {!pending.length && <p className="text-sm text-muted-foreground">Nothing waiting for approval.</p>}
              {pending.map((r) => <Row key={r.id} row={r} />)}
            </TabsContent>
            <TabsContent value="approved" className="space-y-2 pt-3">
              {!approved.length && <p className="text-sm text-muted-foreground">No approved follow-ups queued.</p>}
              {approved.map((r) => <Row key={r.id} row={r} />)}
            </TabsContent>
            <TabsContent value="done" className="space-y-2 pt-3">
              {!done.length && <p className="text-sm text-muted-foreground">No history yet.</p>}
              {done.map((r) => <Row key={r.id} row={r} />)}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Preview follow-up</DialogTitle>
          </DialogHeader>
          {preview && (
            <div className="space-y-4 text-sm">
              <p className="text-muted-foreground">
                To {preview.client_name} · {preview.phone}<br />
                {formatInZone(preview.scheduled_at, preview.timezone)} ({preview.timezone})
              </p>

              {canEditSends && ["pending_approval", "approved"].includes(preview.status) ? (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs uppercase text-muted-foreground">Message</Label>
                    <Textarea rows={5} value={editMessage} onChange={(e) => setEditMessage(e.target.value)} />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-xs uppercase text-muted-foreground">Send at</Label>
                      <Input type="datetime-local" value={editWhen} onChange={(e) => setEditWhen(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs uppercase text-muted-foreground">Time zone</Label>
                      <Select value={editTz} onValueChange={setEditTz}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {[...new Set([editTz, ...TIMEZONES])].map((tz) => (
                            <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={saveEdit} disabled={busy}>
                    <Save className="mr-1 h-3 w-3" /> Save changes
                  </Button>
                </div>
              ) : (
                <div className="whitespace-pre-wrap rounded-lg border border-border bg-muted/40 p-3">{preview.message}</div>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
                    <History className="h-3 w-3" /> Audit trail
                  </p>
                  {canViewAudit && canExportAudit && !!audit.length && (
                    <Button size="sm" variant="ghost" onClick={exportAudit}>
                      <Download className="mr-1 h-3 w-3" /> Export CSV
                    </Button>
                  )}
                </div>
                {!canViewAudit && (
                  <p className="text-xs text-muted-foreground">
                    Only managers and above can see who reviewed, approved or changed this follow-up.
                  </p>
                )}
                {canViewAudit && auditLoading && <p className="text-xs text-muted-foreground">Loading history…</p>}
                {canViewAudit && !auditLoading && !audit.length && <p className="text-xs text-muted-foreground">No history yet.</p>}
                <ol className="space-y-2">
                  {audit.map((a) => (
                    <li key={a.id} className="rounded-lg border border-border p-2">
                      <p className="text-xs font-medium">
                        {AUDIT_ACTION_LABELS[a.action] ?? a.action} · {a.actor_name}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {formatInZone(a.created_at, myTz)}
                        {a.from_status && a.to_status && a.from_status !== a.to_status && (
                          <> · {SEND_STATUS_LABELS[a.from_status] ?? a.from_status} → {SEND_STATUS_LABELS[a.to_status] ?? a.to_status}</>
                        )}
                      </p>
                      {a.action === "edited" && (
                        <p className="mt-1 whitespace-pre-wrap text-[11px] text-muted-foreground">
                          {Object.keys(a.details as Record<string, unknown>).join(", ").replace(/_/g, " ")}
                        </p>
                      )}
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          )}
          <DialogFooter>
            {canEditSends && preview?.status === "pending_approval" && (
              <Button onClick={() => preview && approve(preview)} disabled={busy}>
                <CheckCircle2 className="mr-1 h-4 w-4" /> Approve
              </Button>
            )}
            {canEditSends && preview && ["pending_approval", "approved"].includes(preview.status) && (
              <Button variant="outline" onClick={() => cancel(preview)} disabled={busy}>Cancel send</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
