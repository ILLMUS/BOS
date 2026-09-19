import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { formatDateTime, type Account } from "@/lib/crm";
import { CAMPAIGN_CHANNELS, CAMPAIGN_STATUSES, CHANNEL_LABELS } from "./Campaigns";
import {
  CheckCircle2,
  Clock,
  Loader2,
  Plus,
  Trash2,
  Target,
  Users,
  Layers,
  AlertCircle,
  Calendar,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Activity as ActivityIcon,
  Send,
  UserCheck,
  Zap,
} from "lucide-react";
import WhatsAppStepDialog from "@/components/outreach/WhatsAppStepDialog";
import ScheduleStepDialog from "@/components/outreach/ScheduleStepDialog";
import type { Tables } from "@/integrations/supabase/types";

type Campaign = Tables<"campaigns">;
type Step = Tables<"campaign_steps">;
type Member = Tables<"campaign_members">;
type Activity = Tables<"activities">;
type Profile = Pick<Tables<"profiles">, "id" | "full_name">;

const MEMBER_STATUSES = ["pending", "contacted", "replied", "meeting", "converted", "unsubscribed"];

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

  useEffect(() => {
    load();
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [id]);

  const setStatus = async (status: string) => {
    if (!id) return;
    await supabase.from("campaigns").update({ status }).eq("id", id);
    load();
  };

  const addStep = async () => {
    if (!id || !orgId || !stepForm.subject.trim()) return;
    await supabase.from("campaign_steps").insert({
      org_id: orgId,
      campaign_id: id,
      position: steps.length,
      subject: stepForm.subject.trim(),
      body: stepForm.body || null,
      channel: stepForm.channel,
      day_offset: Number(stepForm.day_offset) || 0,
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
    await supabase
      .from("campaign_members")
      .update({
        current_step: Math.min(nextIdx, steps.length),
        status: m.status === "pending" ? "contacted" : m.status,
        last_touch_at: new Date().toISOString(),
        next_touch_at: nextStep
          ? new Date(Date.now() + Math.max(nextStep.day_offset - (step?.day_offset ?? 0), 1) * 86400000).toISOString()
          : null,
      })
      .eq("id", m.id);

    if (orgId && step) {
      await supabase.from("activities").insert({
        org_id: orgId,
        account_id: m.account_id,
        contact_id: m.contact_id,
        lead_id: m.lead_id,
        type: step.channel === "call" ? "call" : step.channel === "in_person" ? "meeting" : "email",
        subject: `${campaign?.name}: ${step.subject}`,
        body: step.body,
        completed_at: new Date().toISOString(),
        assigned_to: user?.id ?? null,
        created_by: user?.id ?? null,
      });
      if (nextStep) {
        await supabase.from("activities").insert({
          org_id: orgId,
          account_id: m.account_id,
          contact_id: m.contact_id,
          lead_id: m.lead_id,
          type: "follow_up",
          subject: `${campaign?.name}: ${nextStep.subject}`,
          body: nextStep.body,
          due_at: new Date(Date.now() + Math.max(nextStep.day_offset - (step?.day_offset ?? 0), 1) * 86400000).toISOString(),
          assigned_to: user?.id ?? null,
          created_by: user?.id ?? null,
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
      .filter(
        (a) =>
          (m.account_id && a.account_id === m.account_id) ||
          (m.contact_id && a.contact_id === m.contact_id) ||
          (m.lead_id && a.lead_id === m.lead_id)
      )
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
    return {
      total,
      done,
      atStep,
      completed: completed.length,
      dueNow: dueNow.length,
      scheduled: scheduled.length,
      lastAt,
      owners,
      pct: total ? Math.round((done / total) * 100) : 0,
    };
  };

  if (loading) return <Loader2 className="h-5 w-5 animate-spin text-slate-500" />;
  if (!campaign) return <p className="text-sm text-slate-400">Campaign not found.</p>;

  return (
    <div className="space-y-6 text-slate-200">
      {/* CAMPAIGN HEADER */}
      <GlassCard className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.15)]">
              <Target className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white">{campaign.name}</h1>
              <p className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                <span className="inline-flex items-center gap-1 text-cyan-300 font-medium">
                  <Zap className="h-3 w-3 text-cyan-400" />
                  {CHANNEL_LABELS[campaign.channel] || campaign.channel}
                </span>
                {campaign.goal && (
                  <>
                    <span className="text-slate-600">·</span>
                    <span className="text-slate-300">Goal: {campaign.goal}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          <Select value={campaign.status} onValueChange={setStatus}>
            <SelectTrigger className="h-9 w-40 rounded-xl border-white/[0.08] bg-[#161c26] text-xs font-semibold capitalize text-slate-200 focus:border-cyan-400/30">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-white/[0.085] bg-[#10151d] text-slate-200">
              {CAMPAIGN_STATUSES.map((s) => (
                <SelectItem key={s} value={s} className="text-xs capitalize">
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </GlassCard>

      {/* MAIN CONTENT TABS */}
      <Tabs defaultValue="list">
        <TabsList className="border border-white/[0.085] bg-[#10151d] p-1 rounded-xl">
          <TabsTrigger
            value="list"
            className="flex items-center gap-2 rounded-lg text-xs font-semibold text-slate-400 data-[state=active]:bg-cyan-500/10 data-[state=active]:text-cyan-300 data-[state=active]:border data-[state=active]:border-cyan-400/30"
          >
            <Users className="h-3.5 w-3.5 text-cyan-400" />
            List ({members.length})
          </TabsTrigger>
          <TabsTrigger
            value="sequence"
            className="flex items-center gap-2 rounded-lg text-xs font-semibold text-slate-400 data-[state=active]:bg-purple-500/10 data-[state=active]:text-purple-300 data-[state=active]:border data-[state=active]:border-purple-400/30"
          >
            <Layers className="h-3.5 w-3.5 text-purple-400" />
            Sequence ({steps.length})
          </TabsTrigger>
        </TabsList>

        {/* LIST TAB CONTENT */}
        <TabsContent value="list" className="mt-4 space-y-4">
          <Dialog open={memberOpen} onOpenChange={setMemberOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-cyan-500 text-black font-semibold hover:bg-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.2)]">
                <Plus className="mr-1.5 h-4 w-4" /> Add to list
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md border-white/[0.085] bg-[#10151d] text-slate-200">
              <DialogHeader>
                <DialogTitle className="text-white flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-cyan-400" />
                  Add account to campaign
                </DialogTitle>
              </DialogHeader>
              <Select value={pick} onValueChange={setPick}>
                <SelectTrigger className="border-white/[0.08] bg-[#161c26] text-xs text-slate-200">
                  <SelectValue placeholder="Choose an account" />
                </SelectTrigger>
                <SelectContent className="border-white/[0.085] bg-[#10151d] text-slate-200">
                  {accounts
                    .filter((a) => !members.some((m) => m.account_id === a.id))
                    .map((a) => (
                      <SelectItem key={a.id} value={a.id} className="text-xs">
                        {a.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <DialogFooter>
                <Button
                  onClick={addMember}
                  disabled={!pick}
                  className="bg-cyan-500 text-black font-semibold hover:bg-cyan-400"
                >
                  Add
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {!members.length && (
            <p className="text-xs text-slate-400">No one in this campaign yet.</p>
          )}

          {members.map((m) => {
            const trail = trailFor(m);
            const expanded = openTrail === m.id;
            const overdue = m.next_touch_at && new Date(m.next_touch_at) < new Date();

            return (
              <GlassCard key={m.id} className="p-4">
                <div className="space-y-4">
                  {/* MEMBER TOP ROW */}
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white">{accountName(m.account_id)}</p>
                      <p className="mt-1 text-xs text-slate-400 flex flex-wrap items-center gap-1.5">
                        <span className="text-cyan-300 font-semibold">
                          Step {Math.min(m.current_step + 1, steps.length || 1)} of {steps.length || 1}
                        </span>
                        {m.last_touch_at && (
                          <>
                            <span className="text-slate-600">·</span>
                            <span>Last touch {formatDateTime(m.last_touch_at)}</span>
                          </>
                        )}
                        {m.next_touch_at && (
                          <>
                            <span className="text-slate-600">·</span>
                            <span className="text-purple-300">Next {formatDateTime(m.next_touch_at)}</span>
                          </>
                        )}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Select value={m.status} onValueChange={(v) => setMemberStatus(m, v)}>
                        <SelectTrigger className="h-8 w-36 rounded-lg border-white/[0.08] bg-[#161c26] text-xs font-semibold capitalize text-slate-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="border-white/[0.085] bg-[#10151d] text-slate-200">
                          {MEMBER_STATUSES.map((s) => (
                            <SelectItem key={s} value={s} className="text-xs capitalize">
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!steps.length || m.current_step >= steps.length}
                        onClick={() => logTouch(m)}
                        className="h-8 border-cyan-400/30 bg-cyan-400/10 text-xs font-semibold text-cyan-300 hover:bg-cyan-400/20"
                      >
                        <CheckCircle2 className="mr-1.5 h-3.5 w-3.5 text-cyan-400" /> Log touch
                      </Button>

                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
                        onClick={async () => {
                          await supabase.from("campaign_members").delete().eq("id", m.id);
                          load();
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* ACCOUNTABILITY & TRAIL BOX */}
                  <div className="rounded-xl border border-white/[0.085] bg-[#161c26]/60 p-3.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <ActivityIcon className="h-3 w-3 text-cyan-400" /> Accountability
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full border border-purple-400/30 bg-purple-400/10 px-2.5 py-0.5 text-[10px] font-bold text-purple-300">
                          <Sparkles className="h-2.5 w-2.5 text-purple-400" />
                          {trail.length} action{trail.length === 1 ? "" : "s"}
                        </span>
                        {overdue && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-rose-400/30 bg-rose-400/10 px-2.5 py-0.5 text-[10px] font-bold text-rose-300 shadow-[0_0_10px_rgba(244,63,94,0.15)]">
                            <AlertCircle className="h-2.5 w-2.5 text-rose-400" /> Follow-up overdue
                          </span>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-[11px] text-slate-400 hover:text-white"
                          onClick={() => setOpenTrail(expanded ? null : m.id)}
                        >
                          {expanded ? (
                            <>
                              Hide trail <ChevronUp className="ml-1 h-3 w-3" />
                            </>
                          ) : (
                            <>
                              Show full trail <ChevronDown className="ml-1 h-3 w-3" />
                            </>
                          )}
                        </Button>
                      </div>
                    </div>

                    <p className="mt-2 text-xs text-slate-400">
                      Last action:{" "}
                      <span className="text-slate-200">
                        {trail[0]
                          ? `${personName(trail[0].assigned_to)} · ${formatDateTime(
                              trail[0].completed_at || trail[0].created_at
                            )}`
                          : "— none yet"}
                      </span>
                    </p>

                    {expanded && (
                      <div className="mt-3 space-y-2 border-t border-white/[0.085] pt-3">
                        {!trail.length && (
                          <p className="text-xs text-slate-400">
                            No actions recorded for this contact yet.
                          </p>
                        )}
                        {trail.map((a) => (
                          <div
                            key={a.id}
                            className="flex flex-wrap items-center justify-between gap-2 text-xs border-b border-white/[0.05] pb-2 last:border-0 last:pb-0"
                          >
                            <span>
                              <span className="font-semibold text-slate-200">{a.subject}</span>
                              <span className="text-slate-400">
                                {" "}
                                · {a.type.replace("_", " ")} · {personName(a.assigned_to)}
                              </span>
                            </span>
                            <span className={a.completed_at ? "text-emerald-400 font-medium" : "text-amber-300 font-medium"}>
                              {a.completed_at
                                ? `Done ${formatDateTime(a.completed_at)}`
                                : a.due_at
                                ? `Due ${formatDateTime(a.due_at)}`
                                : `Created ${formatDateTime(a.created_at)}`}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </TabsContent>

        {/* SEQUENCE TAB CONTENT */}
        <TabsContent value="sequence" className="mt-4 space-y-4">
          <Dialog open={stepOpen} onOpenChange={setStepOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-purple-500 text-black font-semibold hover:bg-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
                <Plus className="mr-1.5 h-4 w-4" /> Add step
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg border-white/[0.085] bg-[#10151d] text-slate-200">
              <DialogHeader>
                <DialogTitle className="text-white flex items-center gap-2">
                  <Layers className="h-5 w-5 text-purple-400" />
                  New sequence step
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-300">Subject / purpose</Label>
                  <Input
                    value={stepForm.subject}
                    onChange={(e) => setStepForm({ ...stepForm, subject: e.target.value })}
                    placeholder="Intro email"
                    className="border-white/[0.08] bg-[#161c26] text-xs text-slate-200 focus:border-purple-400/30"
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-300">Channel</Label>
                    <Select
                      value={stepForm.channel}
                      onValueChange={(v) => setStepForm({ ...stepForm, channel: v })}
                    >
                      <SelectTrigger className="border-white/[0.08] bg-[#161c26] text-xs text-slate-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="border-white/[0.085] bg-[#10151d] text-slate-200">
                        {CAMPAIGN_CHANNELS.map((c) => (
                          <SelectItem key={c} value={c} className="text-xs">
                            {CHANNEL_LABELS[c]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-300">Day offset</Label>
                    <Input
                      type="number"
                      min={0}
                      value={stepForm.day_offset}
                      onChange={(e) => setStepForm({ ...stepForm, day_offset: e.target.value })}
                      className="border-white/[0.08] bg-[#161c26] text-xs text-slate-200 focus:border-purple-400/30"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-300">Message template</Label>
                  <Textarea
                    rows={5}
                    value={stepForm.body}
                    onChange={(e) => setStepForm({ ...stepForm, body: e.target.value })}
                    className="border-white/[0.08] bg-[#161c26] text-xs text-slate-200 focus:border-purple-400/30"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  onClick={addStep}
                  disabled={!stepForm.subject.trim()}
                  className="bg-purple-500 text-black font-semibold hover:bg-purple-400"
                >
                  Add step
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {!steps.length && (
            <p className="text-xs text-slate-400">
              No steps yet. Add the touches you want to run in order.
            </p>
          )}

          {steps.map((s, i) => {
            const r = stepReport(i, s);

            return (
              <GlassCard key={s.id} className="p-5">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.085] pb-3 mb-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-bold text-white">
                      {i + 1}. {s.subject}
                    </h2>
                    <span className="inline-flex items-center gap-1 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2.5 py-0.5 text-[10px] font-bold text-cyan-300">
                      <Send className="h-2.5 w-2.5 text-cyan-400" />
                      {CHANNEL_LABELS[s.channel] || s.channel}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-purple-400/30 bg-purple-400/10 px-2.5 py-0.5 text-[10px] font-bold text-purple-300">
                      <Clock className="h-2.5 w-2.5 text-purple-400" />
                      Day {s.day_offset}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
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

                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
                      onClick={async () => {
                        await supabase.from("campaign_steps").delete().eq("id", s.id);
                        load();
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-4">
                  {s.body && (
                    <p className="whitespace-pre-wrap text-xs text-slate-300 bg-[#161c26]/60 p-3 rounded-xl border border-white/[0.05]">
                      {s.body}
                    </p>
                  )}

                  {/* FOLLOW-UP REPORT */}
                  <div className="rounded-xl border border-white/[0.085] bg-[#161c26]/60 p-3.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <ActivityIcon className="h-3 w-3 text-purple-400" /> Follow-up report
                      </p>
                      <span className="text-xs text-slate-400 font-mono">
                        {r.done} of {r.total} past this step <span className="text-slate-600">·</span> {r.pct}%
                      </span>
                    </div>

                    <Progress
                      value={r.pct}
                      className="mt-2.5 h-2 rounded-full bg-[#10151d] [&>div]:bg-gradient-to-r [&>div]:from-purple-500 [&>div]:to-cyan-400"
                    />

                    <div className="mt-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                      <div className="rounded-lg bg-[#10151d]/60 p-2 border border-white/[0.05]">
                        <p className="text-[11px] text-slate-400">Completed</p>
                        <p className="mt-0.5 text-sm font-bold text-emerald-400">{r.completed}</p>
                      </div>
                      <div className="rounded-lg bg-[#10151d]/60 p-2 border border-white/[0.05]">
                        <p className="text-[11px] text-slate-400">Waiting here</p>
                        <p className="mt-0.5 text-sm font-bold text-cyan-300">{r.atStep}</p>
                      </div>
                      <div className="rounded-lg bg-[#10151d]/60 p-2 border border-white/[0.05]">
                        <p className="text-[11px] text-slate-400">Due now</p>
                        <p className={`mt-0.5 text-sm font-bold ${r.dueNow ? "text-rose-400" : "text-slate-200"}`}>
                          {r.dueNow}
                        </p>
                      </div>
                      <div className="rounded-lg bg-[#10151d]/60 p-2 border border-white/[0.05]">
                        <p className="text-[11px] text-slate-400">Scheduled</p>
                        <p className="mt-0.5 text-sm font-bold text-purple-300">{r.scheduled}</p>
                      </div>
                    </div>

                    <p className="mt-3 text-[11px] text-slate-400 flex flex-wrap items-center gap-1.5">
                      <Calendar className="h-3 w-3 text-slate-500" />
                      <span>Last sent {r.lastAt ? formatDateTime(r.lastAt) : "—"}</span>
                      <span className="text-slate-600">·</span>
                      <span>
                        Responsible:{" "}
                        {r.owners.length
                          ? r.owners.map(personName).join(", ")
                          : "unassigned"}
                      </span>
                    </p>
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </TabsContent>
      </Tabs>
    </div>
  );
}