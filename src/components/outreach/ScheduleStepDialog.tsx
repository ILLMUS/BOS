import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { fillTemplate, isValidWhatsAppNumber } from "@/lib/whatsapp";
import { browserTimezone, defaultLocalInput, formatInZone, TIMEZONES, zonedInputToUtcIso } from "@/lib/followups";
import { CalendarClock } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import type { Account } from "@/lib/crm";

type Step = Tables<"campaign_steps">;
type Member = Tables<"campaign_members">;
type Campaign = Tables<"campaigns">;

interface Props {
  campaign: Campaign;
  step: Step;
  stepIndex: number;
  members: Member[];
  accounts: Account[];
  onDone: () => void;
}

export default function ScheduleStepDialog({ campaign, step, stepIndex, members, accounts, onDone }: Props) {
  const { orgId, user } = useAuth();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(step.body || step.subject);
  const [picked, setPicked] = useState<string[]>([]);
  const [phones, setPhones] = useState<Record<string, string>>({});
  const browserTz = useMemo(() => browserTimezone(), []);
  const [timezone, setTimezone] = useState(TIMEZONES.includes(browserTz) ? browserTz : "Africa/Mbabane");
  const [when, setWhen] = useState(defaultLocalInput(24));

  const account = (m: Member) => accounts.find((a) => a.id === m.account_id);
  const rows = useMemo(
    () => members.map((m) => ({ m, a: account(m) })).filter((r) => r.a),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [members, accounts],
  );
  const phoneFor = (m: Member) => phones[m.id] ?? account(m)?.phone ?? "";
  const textFor = (m: Member) =>
    fillTemplate(message, { client: account(m)?.name ?? "", step: step.subject, campaign: campaign.name });

  const toggle = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const scheduledIso = zonedInputToUtcIso(when, timezone);

  const schedule = async () => {
    if (!orgId) return;
    const targets = rows.filter((r) => picked.includes(r.m.id));
    if (!targets.length) return toast({ title: "Choose clients", description: "Pick who should get this follow-up." });
    const missing = targets.filter((r) => !isValidWhatsAppNumber(phoneFor(r.m)));
    if (missing.length) {
      return toast({
        title: "Number needed",
        description: `Add a WhatsApp number for ${missing.map((r) => r.a?.name).join(", ")}.`,
        variant: "destructive",
      });
    }
    setSaving(true);
    const { error } = await supabase.from("campaign_scheduled_sends").insert(
      targets.map(({ m, a }) => ({
        org_id: orgId,
        campaign_id: campaign.id,
        step_id: step.id,
        member_id: m.id,
        account_id: m.account_id,
        contact_id: m.contact_id,
        lead_id: m.lead_id,
        client_name: a?.name ?? "",
        phone: phoneFor(m),
        message: textFor(m),
        step_index: stepIndex,
        step_subject: step.subject,
        scheduled_at: scheduledIso,
        timezone,
        local_time: formatInZone(scheduledIso, timezone),
        status: "pending_approval",
        owner_id: campaign.owner_id ?? campaign.created_by ?? user?.id ?? null,
        requested_by: user?.id ?? null,
      })),
    );
    setSaving(false);
    if (error) return toast({ title: "Could not schedule", description: error.message, variant: "destructive" });
    toast({
      title: "Sent for approval",
      description: `${targets.length} follow-up${targets.length === 1 ? "" : "s"} queued for ${formatInZone(scheduledIso, timezone)}.`,
    });
    setOpen(false);
    setPicked([]);
    onDone();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <CalendarClock className="mr-1 h-4 w-4" /> Schedule
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Schedule “{step.subject}”</DialogTitle>
        </DialogHeader>

        <div className="space-y-1">
          <Label>Message</Label>
          <Textarea rows={4} value={message} onChange={(e) => setMessage(e.target.value)} />
          <p className="text-xs text-muted-foreground">Use {"{client}"} to insert each client’s name.</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>Send date & time</Label>
            <Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Client time zone</Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => <SelectItem key={tz} value={tz}>{tz.replace("_", " ")}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Goes out at {formatInZone(scheduledIso, timezone)} ({timezone}) · your time {formatInZone(scheduledIso, browserTz)}
        </p>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Choose clients ({picked.length})</p>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => setPicked(rows.filter((r) => r.m.current_step === stepIndex).map((r) => r.m.id))}>At this step</Button>
            <Button size="sm" variant="ghost" onClick={() => setPicked(rows.map((r) => r.m.id))}>Select all</Button>
            <Button size="sm" variant="ghost" onClick={() => setPicked([])}>Clear</Button>
          </div>
        </div>

        <div className="space-y-2">
          {!rows.length && <p className="text-sm text-muted-foreground">No clients in this campaign yet.</p>}
          {rows.map(({ m, a }) => (
            <div key={m.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3">
              <Checkbox checked={picked.includes(m.id)} onCheckedChange={() => toggle(m.id)} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{a?.name}</p>
                <p className="text-xs text-muted-foreground">Step {m.current_step + 1} · {m.status}</p>
              </div>
              <Input
                className="h-8 w-40"
                placeholder="268 7612 3456"
                value={phoneFor(m)}
                onChange={(e) => setPhones((p) => ({ ...p, [m.id]: e.target.value }))}
              />
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button onClick={schedule} disabled={saving}>Send for approval</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
