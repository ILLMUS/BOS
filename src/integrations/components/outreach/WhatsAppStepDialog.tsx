import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { fillTemplate, isValidWhatsAppNumber, whatsappLink } from "@/lib/whatsapp";
import { MessageCircle, Send } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import type { Account } from "@/lib/crm";

type Step = Tables<"campaign_steps">;
type Member = Tables<"campaign_members">;

export const OUTCOMES = [
  { value: "sent", label: "Message sent", status: "contacted" },
  { value: "replied", label: "Client replied", status: "replied" },
  { value: "no_answer", label: "No answer yet", status: "contacted" },
  { value: "meeting", label: "Meeting agreed", status: "meeting" },
  { value: "not_interested", label: "Not interested", status: "unsubscribed" },
] as const;

interface Props {
  campaignName: string;
  step: Step;
  stepIndex: number;
  members: Member[];
  accounts: Account[];
  onDone: () => void;
}

export default function WhatsAppStepDialog({ campaignName, step, stepIndex, members, accounts, onDone }: Props) {
  const { orgId, user } = useAuth();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState(step.body || step.subject);
  const [picked, setPicked] = useState<string[]>([]);
  const [sent, setSent] = useState<Record<string, boolean>>({});
  const [outcomes, setOutcomes] = useState<Record<string, string>>({});

  const account = (m: Member) => accounts.find((a) => a.id === m.account_id);
  const rows = useMemo(
    () => members.map((m) => ({ m, a: account(m) })).filter((r) => r.a),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [members, accounts],
  );
  const [phones, setPhones] = useState<Record<string, string>>({});
  const phoneFor = (m: Member) => phones[m.id] ?? account(m)?.phone ?? "";

  const toggle = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const atThisStep = () => setPicked(rows.filter((r) => r.m.current_step === stepIndex).map((r) => r.m.id));

  const textFor = (m: Member) =>
    fillTemplate(message, { client: account(m)?.name ?? "", step: step.subject, campaign: campaignName });

  const send = (m: Member) => {
    const phone = phoneFor(m);
    if (!isValidWhatsAppNumber(phone)) {
      toast({ title: "Number needed", description: `Add a WhatsApp number for ${account(m)?.name}.`, variant: "destructive" });
      return;
    }
    window.open(whatsappLink(phone, textFor(m)), "_blank", "noopener,noreferrer");
    setSent((s) => ({ ...s, [m.id]: true }));
    setOutcomes((o) => ({ ...o, [m.id]: o[m.id] || "sent" }));
  };

  const record = async () => {
    if (!orgId) return;
    const targets = rows.filter((r) => picked.includes(r.m.id) && outcomes[r.m.id]);
    if (!targets.length) {
      toast({ title: "Nothing to record", description: "Send a message and choose an outcome first." });
      return;
    }
    for (const { m } of targets) {
      const outcome = OUTCOMES.find((o) => o.value === outcomes[m.id]);
      await supabase.from("activities").insert({
        org_id: orgId,
        account_id: m.account_id,
        contact_id: m.contact_id,
        lead_id: m.lead_id,
        type: "note",
        subject: `${campaignName}: ${step.subject}`,
        body: `WhatsApp to ${phoneFor(m)} — outcome: ${outcome?.label}\n\n${textFor(m)}`,
        completed_at: new Date().toISOString(),
        assigned_to: user?.id ?? null,
        created_by: user?.id ?? null,
      });
      await supabase.from("campaign_members").update({
        status: outcome?.status ?? m.status,
        last_touch_at: new Date().toISOString(),
        current_step: m.current_step === stepIndex ? stepIndex + 1 : m.current_step,
      }).eq("id", m.id);
    }
    toast({ title: "Outcomes recorded", description: `${targets.length} client record${targets.length === 1 ? "" : "s"} updated.` });
    setOpen(false);
    setPicked([]);
    setSent({});
    setOutcomes({});
    onDone();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <MessageCircle className="mr-1 h-4 w-4" /> Send on WhatsApp
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Send “{step.subject}” on WhatsApp</DialogTitle>
        </DialogHeader>

        <div className="space-y-1">
          <Label>Message</Label>
          <Textarea rows={4} value={message} onChange={(e) => setMessage(e.target.value)} />
          <p className="text-xs text-muted-foreground">Use {"{client}"} to insert each client’s name.</p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Choose clients ({picked.length})</p>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={atThisStep}>At this step</Button>
            <Button size="sm" variant="ghost" onClick={() => setPicked(rows.map((r) => r.m.id))}>Select all</Button>
            <Button size="sm" variant="ghost" onClick={() => setPicked([])}>Clear</Button>
          </div>
        </div>

        <div className="space-y-2">
          {!rows.length && <p className="text-sm text-muted-foreground">No clients in this campaign yet.</p>}
          {rows.map(({ m, a }) => {
            const chosen = picked.includes(m.id);
            return (
              <div key={m.id} className="rounded-lg border border-border p-3">
                <div className="flex flex-wrap items-center gap-3">
                  <Checkbox checked={chosen} onCheckedChange={() => toggle(m.id)} />
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
                  <Button size="sm" variant="outline" disabled={!chosen} onClick={() => send(m)}>
                    <Send className="mr-1 h-3 w-3" /> {sent[m.id] ? "Send again" : "Open chat"}
                  </Button>
                </div>
                {chosen && (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {sent[m.id] && <Badge variant="outline" className="border-success text-success">Chat opened</Badge>}
                    <Select value={outcomes[m.id] ?? ""} onValueChange={(v) => setOutcomes((o) => ({ ...o, [m.id]: v }))}>
                      <SelectTrigger className="h-8 w-56"><SelectValue placeholder="Record outcome" /></SelectTrigger>
                      <SelectContent>
                        {OUTCOMES.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex justify-end">
          <Button onClick={record}>Save outcomes to CRM</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
