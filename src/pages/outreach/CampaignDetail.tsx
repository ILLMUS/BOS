import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { formatDateTime, type Account } from "@/lib/crm";
import { CAMPAIGN_CHANNELS, CAMPAIGN_STATUSES, CHANNEL_LABELS } from "./Campaigns";
import { CheckCircle2, Clock, Loader2, Plus, Trash2 } from "lucide-react";
import WhatsAppStepDialog from "@/components/outreach/WhatsAppStepDialog";
import ScheduleStepDialog from "@/components/outreach/ScheduleStepDialog";
import type { Tables } from "@/integrations/supabase/types";

type Campaign = Tables<"campaigns">;
type Step = Tables<"campaign_steps">;
type Member = Tables<"campaign_members">;
type Activity = Tables<"activities">;
type Profile = Pick<Tables<"profiles">, "id" | "full_name">;

const MEMBER_STATUSES = ["pending", "contacted", "replied", "meeting", "converted", "unsubscribed"];

export default function CampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const { orgId, user } = useAuth();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [stepOpen, setStepOpen] = useState(false);
  const [memberOpen, setMemberOpen] = useState(false);
  const [stepForm, setStepForm] = useState({ subject: "", body: "", channel: "email", day_offset: "0" });
  const [pick, setPick] = useState<string>("");
  const [openTrail, setOpenTrail] = useState<string | null>(null);

  const load = async () => {
    if (!id) return;
    const [c, s, m, a, act, p] = await Promise.all([
      supabase.from("campaigns").select("*").eq("id", id).maybeSingle(),
      supabase.from("campaign_steps").select("*").eq("campaign_id", id).order("position"),
      supabase.from("campaign_members").select("*").eq("campaign_id", id).order("created_at"),
      supabase.from("accounts").select("*").order("name"),
      supabase.from("activities").select("*").order("created_at", { ascending: false }).limit(500),
      supabase.from("profiles").select("id, full_name"),
    ]);
    setCampaign(c.data);
    setSteps(s.data || []);
    setMembers(m.data || []);
    setAccounts(a.data || []);
    setActivities(act.data || []);
    setProfiles((p.data as Profile[]) || []);
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);

  const setStatus = async (status: string) => {
    if (!id) return;
    await supabase.from("campaigns").update({ status }).eq("id", id);
    load();
  };

  const addStep = async () => {
    if (!id || !orgId || !stepForm.subject.trim()) return;
    await supabase.from("campaign_steps").insert({
      org_id: orgId, campaign_id: id, position: steps.length,
      subject: stepForm.subject.trim(), body: stepForm.body || null,
      channel: stepForm.channel, day_offset: Number(stepForm.day_offset) || 0,
    });
    setStepOpen(false);
    setStepForm({ subject: "", body: "", channel: "email", day_offset: "0" });
    load();
  };

  const addMember = async () => {
    if (!id || !orgId || !pick) return;
    await supabase.from("campaign_members").insert({ org_id: orgId, campaign_id: id, account_id: pick });
    setMemberOpen(false);
    setPick("");
    load();
  };

  const logTouch = async (m: Member) => {
    const nextIdx = m.current_step + 1;
    const nextStep = steps[nextIdx];
    const step = steps[m.current_step];
    await supabase.from("campaign_members").update({
      current_step: Math.min(nextIdx, steps.length),
      status: m.status === "pending" ? "contacted" : m.status,
      last_touch_at: new Date().toISOString(),
      next_touch_at: nextStep
        ? new Date(Date.now() + Math.max(nextStep.day_offset - (step?.day_offset ?? 0), 1) * 86400000).toISOString()
        : null,
    }).eq("id", m.id);

    if (orgId && step) {
      await supabase.from("activities").insert({
        org_id: orgId, account_id: m.account_id, contact_id: m.contact_id, lead_id: m.lead_id,
        type: step.channel === "call" ? "call" : step.channel === "in_person" ? "meeting" : "email",
        subject: `${campaign?.name}: ${step.subject}`, body: step.body,
        completed_at: new Date().toISOString(), assigned_to: user?.id ?? null, created_by: user?.id ?? null,
      });
      if (nextStep) {
        await supabase.from("activities").insert({
          org_id: orgId, account_id: m.account_id, contact_id: m.contact_id, lead_id: m.lead_id,
          type: "follow_up", subject: `${campaign?.name}: ${nextStep.subject}`, body: nextStep.body,
          due_at: new Date(Date.now() + Math.max(nextStep.day_offset - (step?.day_offset ?? 0), 1) * 86400000).toISOString(),
          assigned_to: user?.id ?? null, created_by: user?.id ?? null,
        });
      }
    }
    toast({ title: "Touch logged", description: "Activity recorded and the next follow-up scheduled." });
    load();
  };

  const setMemberStatus = async (m: Member, status: string) => {
    await supabase.from("campaign_members").update({ status }).eq("id", m.id);
    load();
  };

  const accountName = (aid: string | null) => accounts.find((a) => a.id === aid)?.name || "Unknown";
  const personName = (uid: string | null) => profiles.find((p) => p.id === uid)?.full_name || "Unassigned";

  /** Activities belonging to this campaign, newest first. */
  const campaignActivities = useMemo(() => {
    if (!campaign) return [] as Activity[];
    const prefix = `${campaign.name}: `;
    return activities.filter((a) => a.subject?.startsWith(prefix));
  }, [activities, campaign]);

  const trailFor = (m: Member) =>
    campaignActivities
      .filter((a) => (m.account_id && a.account_id === m.account_id) || (m.contact_id && a.contact_id === m.contact_id) || (m.lead_id && a.lead_id === m.lead_id))
      .sort((a, b) => (b.created_at > a.created_at ? 1 : -1));

  const stepReport = (index: number, step: Step) => {
    const total = members.length;
    const done = members.filter((m) => m.current_step > index).length;
    const atStep = members.filter((m) => m.current_step === index).length;
    const acts = campaignActivities.filter((a) => a.subject === `${campaign?.name}: ${step.subject}`);
    const completed = acts.filter((a) => a.completed_at);
    const dueNow = acts.filter((a) => !a.completed_at && a.due_at && new Date(a.due_at) <= new Date());
    const scheduled = acts.filter((a) => !a.completed_at && a.due_at && new Date(a.due_at) > new Date());
    const lastAt = completed[0]?.completed_at ?? null;
    const owners = Array.from(new Set(acts.map((a) => a.assigned_to).filter(Boolean) as string[]));
    return { total, done, atStep, completed: completed.length, dueNow: dueNow.length, scheduled: scheduled.length, lastAt, owners, pct: total ? Math.round((done / total) * 100) : 0 };
  };

  if (loading) return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;
  if (!campaign) return <p className="text-sm text-muted-foreground">Campaign not found.</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold">{campaign.name}</h1>
          <p className="text-sm text-muted-foreground">
            {CHANNEL_LABELS[campaign.channel] || campaign.channel}
            {campaign.goal ? ` · Goal: ${campaign.goal}` : ""}
          </p>
        </div>
        <Select value={campaign.status} onValueChange={setStatus}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>{CAMPAIGN_STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list">List ({members.length})</TabsTrigger>
          <TabsTrigger value="sequence">Sequence ({steps.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-4 space-y-3">
          <Dialog open={memberOpen} onOpenChange={setMemberOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="mr-1 h-4 w-4" /> Add to list</Button></DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader><DialogTitle>Add account to campaign</DialogTitle></DialogHeader>
              <Select value={pick} onValueChange={setPick}>
                <SelectTrigger><SelectValue placeholder="Choose an account" /></SelectTrigger>
                <SelectContent>
                  {accounts.filter((a) => !members.some((m) => m.account_id === a.id)).map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <DialogFooter><Button onClick={addMember} disabled={!pick}>Add</Button></DialogFooter>
            </DialogContent>
          </Dialog>

          {!members.length && <p className="text-sm text-muted-foreground">No one in this campaign yet.</p>}
          {members.map((m) => {
            const trail = trailFor(m);
            const expanded = openTrail === m.id;
            const overdue = m.next_touch_at && new Date(m.next_touch_at) < new Date();
            return (
              <Card key={m.id}>
                <CardContent className="space-y-3 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-medium">{accountName(m.account_id)}</p>
                      <p className="text-xs text-muted-foreground">
                        Step {Math.min(m.current_step + 1, steps.length || 1)} of {steps.length || 1}
                        {m.last_touch_at ? ` · Last touch ${formatDateTime(m.last_touch_at)}` : ""}
                        {m.next_touch_at ? ` · Next ${formatDateTime(m.next_touch_at)}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Select value={m.status} onValueChange={(v) => setMemberStatus(m, v)}>
                        <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
                        <SelectContent>{MEMBER_STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
                      </Select>
                      <Button size="sm" variant="outline" disabled={!steps.length || m.current_step >= steps.length} onClick={() => logTouch(m)}>
                        <CheckCircle2 className="mr-1 h-4 w-4" /> Log touch
                      </Button>
                      <Button size="icon" variant="ghost" className="text-destructive"
                        onClick={async () => { await supabase.from("campaign_members").delete().eq("id", m.id); load(); }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-lg border border-border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Accountability</p>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">{trail.length} action{trail.length === 1 ? "" : "s"}</Badge>
                        {overdue && <Badge variant="outline" className="border-destructive text-destructive">Follow-up overdue</Badge>}
                        <Button size="sm" variant="ghost" onClick={() => setOpenTrail(expanded ? null : m.id)}>
                          {expanded ? "Hide trail" : "Show full trail"}
                        </Button>
                      </div>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Last action {trail[0] ? `${personName(trail[0].assigned_to)} · ${formatDateTime(trail[0].completed_at || trail[0].created_at)}` : "— none yet"}
                    </p>
                    {expanded && (
                      <div className="mt-3 space-y-2">
                        {!trail.length && <p className="text-xs text-muted-foreground">No actions recorded for this contact yet.</p>}
                        {trail.map((a) => (
                          <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2 text-xs last:border-0 last:pb-0">
                            <span>
                              <span className="font-medium">{a.subject}</span>
                              <span className="text-muted-foreground"> · {a.type.replace("_", " ")} · {personName(a.assigned_to)}</span>
                            </span>
                            <span className={a.completed_at ? "text-muted-foreground" : "text-accent"}>
                              {a.completed_at ? `Done ${formatDateTime(a.completed_at)}` : a.due_at ? `Due ${formatDateTime(a.due_at)}` : `Created ${formatDateTime(a.created_at)}`}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="sequence" className="mt-4 space-y-3">
          <Dialog open={stepOpen} onOpenChange={setStepOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="mr-1 h-4 w-4" /> Add step</Button></DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader><DialogTitle>New sequence step</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1"><Label>Subject / purpose</Label>
                  <Input value={stepForm.subject} onChange={(e) => setStepForm({ ...stepForm, subject: e.target.value })} placeholder="Intro email" /></div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1"><Label>Channel</Label>
                    <Select value={stepForm.channel} onValueChange={(v) => setStepForm({ ...stepForm, channel: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{CAMPAIGN_CHANNELS.map((c) => <SelectItem key={c} value={c}>{CHANNEL_LABELS[c]}</SelectItem>)}</SelectContent>
                    </Select></div>
                  <div className="space-y-1"><Label>Day offset</Label>
                    <Input type="number" min={0} value={stepForm.day_offset} onChange={(e) => setStepForm({ ...stepForm, day_offset: e.target.value })} /></div>
                </div>
                <div className="space-y-1"><Label>Message template</Label>
                  <Textarea rows={5} value={stepForm.body} onChange={(e) => setStepForm({ ...stepForm, body: e.target.value })} /></div>
              </div>
              <DialogFooter><Button onClick={addStep} disabled={!stepForm.subject.trim()}>Add step</Button></DialogFooter>
            </DialogContent>
          </Dialog>

          {!steps.length && <p className="text-sm text-muted-foreground">No steps yet. Add the touches you want to run in order.</p>}
          {steps.map((s, i) => {
            const r = stepReport(i, s);
            return (
              <Card key={s.id}>
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="font-heading text-base">{i + 1}. {s.subject}</CardTitle>
                    <Badge variant="outline">{CHANNEL_LABELS[s.channel] || s.channel}</Badge>
                    <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" /> Day {s.day_offset}</Badge>
                    <div className="ml-auto flex items-center gap-2">
                      <WhatsAppStepDialog
                        campaignName={campaign.name}
                        step={s}
                        stepIndex={i}
                        members={members}
                        accounts={accounts}
                        onDone={load}
                      />
                      <ScheduleStepDialog
                        campaign={campaign}
                        step={s}
                        stepIndex={i}
                        members={members}
                        accounts={accounts}
                        onDone={load}
                      />

                      <Button size="icon" variant="ghost" className="text-destructive"
                        onClick={async () => { await supabase.from("campaign_steps").delete().eq("id", s.id); load(); }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {s.body && <p className="whitespace-pre-wrap text-sm text-muted-foreground">{s.body}</p>}

                  <div className="rounded-lg border border-border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Follow-up report</p>
                      <span className="text-xs text-muted-foreground">{r.done} of {r.total} past this step · {r.pct}%</span>
                    </div>
                    <Progress value={r.pct} className="mt-2 h-2" />
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                      <div><p className="text-muted-foreground">Completed</p><p className="font-medium">{r.completed}</p></div>
                      <div><p className="text-muted-foreground">Waiting here</p><p className="font-medium">{r.atStep}</p></div>
                      <div><p className="text-muted-foreground">Due now</p><p className={`font-medium ${r.dueNow ? "text-destructive" : ""}`}>{r.dueNow}</p></div>
                      <div><p className="text-muted-foreground">Scheduled</p><p className="font-medium">{r.scheduled}</p></div>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Last sent {r.lastAt ? formatDateTime(r.lastAt) : "—"}
                      {r.owners.length ? ` · Responsible: ${r.owners.map(personName).join(", ")}` : " · Responsible: unassigned"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>
      </Tabs>
    </div>
  );
}
