import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FlaskConical,
  CheckCircle2,
  XCircle,
  ThumbsUp,
  Ban,
  Undo2,
  Mail,
  Smartphone,
  MonitorSmartphone,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import {
  useNotificationPrefs,
  isQuietNow,
  shouldToast,
  deliveryPlan,
  CHANNEL_LABELS,
  type Channel,
} from "@/lib/notificationPrefs";
import { STAGE_LABELS, STAGE_ORDER } from "@/lib/constants";
import { useAuth } from "@/contexts/AuthContext";
import type { Database } from "@/integrations/supabase/types";

type JobStage = Database["public"]["Enums"]["job_stage"];

const ALL_STAGES = [
  ...STAGE_ORDER,
  ...(Object.keys(STAGE_LABELS) as JobStage[]).filter((s) => !STAGE_ORDER.includes(s)),
];

type Kind = "activity" | "approval" | "overdue";

const KIND_LABELS: Record<Kind, string> = {
  activity: "Activity update",
  approval: "Pending approval",
  overdue: "Overdue step (admin)",
};

type Outcome = "approved" | "rejected" | "returned";

const CHANNEL_ICONS: Record<Channel, typeof Mail> = {
  in_app: MonitorSmartphone,
  email: Mail,
  sms: Smartphone,
};

function ChannelMatrix({
  plan,
}: {
  plan: ReturnType<typeof deliveryPlan>;
}) {
  return (
    <div className="mt-2 space-y-1.5">
      {plan.map((c) => {
        const Icon = CHANNEL_ICONS[c.channel];
        return (
          <div key={c.channel} className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-start gap-2">
              <Icon
                className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${c.willSend ? "text-accent" : "text-muted-foreground"}`}
              />
              <div className="min-w-0">
                <p className="text-xs font-medium">{CHANNEL_LABELS[c.channel]}</p>
                <p className="text-[11px] text-muted-foreground">{c.reason}</p>
              </div>
            </div>
            <Badge
              variant={c.willSend ? (c.deferred ? "secondary" : "default") : "outline"}
              className="shrink-0 text-[10px]"
            >
              {c.deferred ? (
                <>
                  <Clock className="mr-1 h-3 w-3" />
                  Digest
                </>
              ) : c.willSend ? (
                "Send"
              ) : (
                "Skip"
              )}
            </Badge>
          </div>
        );
      })}
    </div>
  );
}

const OUTCOMES: { value: Outcome; label: string; icon: typeof ThumbsUp }[] = [
  { value: "approved", label: "Approved", icon: ThumbsUp },
  { value: "rejected", label: "Rejected", icon: Ban },
  { value: "returned", label: "Returned for changes", icon: Undo2 },
];

/** Events an approval action would emit, in order. */
function simulatedEvents(
  outcome: Outcome,
  stage: JobStage,
  nextStage: JobStage | null,
): { kind: Kind; stage: JobStage; title: string; detail: string; assignedShift: boolean }[] {
  const label = STAGE_LABELS[stage];
  if (outcome === "approved") {
    const events = [
      {
        kind: "activity" as Kind,
        stage,
        title: `${label} approved`,
        detail: "Stage marked complete and logged to the activity feed.",
        assignedShift: false,
      },
    ];
    if (nextStage) {
      events.push({
        kind: "approval" as Kind,
        stage: nextStage,
        title: `${STAGE_LABELS[nextStage]} awaiting action`,
        detail: "Next step opens and enters the pending approvals queue.",
        assignedShift: true,
      });
    }
    return events;
  }
  if (outcome === "rejected") {
    return [
      {
        kind: "activity",
        stage,
        title: `${label} rejected`,
        detail: "Rejection reason logged; job halted at this step.",
        assignedShift: false,
      },
      {
        kind: "approval",
        stage,
        title: `${label} needs rework`,
        detail: "Step returns to the pending approvals queue for its owner.",
        assignedShift: false,
      },
    ];
  }
  return [
    {
      kind: "activity",
      stage,
      title: `${label} returned for changes`,
      detail: "Reviewer notes logged; step reopened in place.",
      assignedShift: false,
    },
    {
      kind: "approval",
      stage,
      title: `${label} re-submission required`,
      detail: "Owner is re-notified to update and re-submit.",
      assignedShift: false,
    },
  ];
}

export default function NotificationTestPanel() {
  const { prefs } = useNotificationPrefs();
  const { isAdmin, hasRole } = useAuth();
  const canOverdue = isAdmin || hasRole("super_admin");

  const [stage, setStage] = useState<JobStage>(ALL_STAGES[0]);
  const [assignedToMe, setAssignedToMe] = useState(true);
  const [outcome, setOutcome] = useState<Outcome>("approved");

  const nextStage = useMemo(() => {
    const i = STAGE_ORDER.indexOf(stage);
    return i >= 0 && i < STAGE_ORDER.length - 1 ? STAGE_ORDER[i + 1] : null;
  }, [stage]);

  const silenceReason = (kind: Kind, s: JobStage, assigned: boolean) => {
    if (isQuietNow(prefs)) return `Silenced by quiet hours (${prefs.quietStart}–${prefs.quietEnd}).`;
    if (
      (kind === "activity" && !prefs.activityToasts) ||
      (kind === "approval" && !prefs.approvalToasts) ||
      (kind === "overdue" && !prefs.overdueToasts)
    )
      return "This alert type is switched off.";
    if (prefs.stageFilterEnabled && !prefs.enabledStages.includes(s))
      return `"${STAGE_LABELS[s]}" is excluded by your per-step filter.`;
    if (prefs.onlyMyAssignments && !assigned) return "Blocked by \u201Conly my assigned actions\u201D.";
    return "Silenced by your current preferences.";
  };

  const outcomeResults = useMemo(() => {
    return simulatedEvents(outcome, stage, nextStage).map((e) => {
      const assigned = assignedToMe;
      const willFire = shouldToast(e.kind, { stage: e.stage, assignedToMe: assigned }, prefs);
      return {
        ...e,
        willFire,
        channels: deliveryPlan(e.kind, { stage: e.stage, assignedToMe: assigned }, prefs),
        reason: willFire ? "Matches your current preferences." : silenceReason(e.kind, e.stage, assigned),
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outcome, stage, nextStage, assignedToMe, prefs]);

  const sendOutcomeTests = () => {
    const firing = outcomeResults.filter((r) => r.willFire);
    if (firing.length === 0) {
      toast("No alerts would fire", { description: "All events are silenced by your preferences." });
      return;
    }
    firing.forEach((r, i) => {
      setTimeout(() => {
        if (outcome === "rejected") toast.error(r.title, { description: r.detail });
        else if (outcome === "returned") toast.warning(r.title, { description: r.detail });
        else toast.success(r.title, { description: r.detail });
      }, i * 500);
    });
  };

  const kinds: Kind[] = canOverdue
    ? ["activity", "approval", "overdue"]
    : ["activity", "approval"];

  const results = useMemo(
    () =>
      kinds.map((kind) => {
        const ctx = { stage, assignedToMe };
        const willFire = shouldToast(kind, ctx, prefs);
        let reason = "Matches your current preferences.";
        if (!willFire) {
          if (isQuietNow(prefs)) {
            reason = `Silenced by quiet hours (${prefs.quietStart}–${prefs.quietEnd}).`;
          } else if (
            (kind === "activity" && !prefs.activityToasts) ||
            (kind === "approval" && !prefs.approvalToasts) ||
            (kind === "overdue" && !prefs.overdueToasts)
          ) {
            reason = "This alert type is switched off.";
          } else if (prefs.stageFilterEnabled && !prefs.enabledStages.includes(stage)) {
            reason = `"${STAGE_LABELS[stage]}" is excluded by your per-step filter.`;
          } else if (prefs.onlyMyAssignments && !assignedToMe) {
            reason = "Blocked by \u201Conly my assigned actions\u201D.";
          }
        }
        return { kind, willFire, reason, channels: deliveryPlan(kind, ctx, prefs) };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [prefs, stage, assignedToMe, canOverdue],
  );

  const sendTest = (kind: Kind) => {
    const title = `${KIND_LABELS[kind]}: ${STAGE_LABELS[stage]}`;
    const description = `Test alert · ${assignedToMe ? "assigned to me" : "assigned to someone else"}`;
    if (kind === "overdue") toast.error(title, { description });
    else toast(title, { description });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <FlaskConical className="h-5 w-5 text-accent" />
          Test notifications
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <p className="text-xs text-muted-foreground">
          Preview exactly which alerts you would receive for a given SOP step and assignment.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-xs">SOP step</Label>
            <Select value={stage} onValueChange={(v) => setStage(v as JobStage)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {ALL_STAGES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {STAGE_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end justify-between gap-3 rounded border p-3">
            <div>
              <p className="font-medium">Assigned to me</p>
              <p className="text-xs text-muted-foreground">Simulate step ownership.</p>
            </div>
            <Switch checked={assignedToMe} onCheckedChange={setAssignedToMe} />
          </div>
        </div>

        <div className="space-y-2">
          {results.map((r) => (
            <div
              key={r.kind}
              className="flex items-start justify-between gap-3 rounded border p-3"
            >
              <div className="flex min-w-0 flex-1 items-start gap-2">
                {r.willFire ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                ) : (
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{KIND_LABELS[r.kind]}</p>
                  <p className="text-xs text-muted-foreground">{r.reason}</p>
                  <ChannelMatrix plan={r.channels} />
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <Badge variant={r.willFire ? "default" : "outline"} className="text-[10px]">
                  {r.willFire ? "Will alert" : "Silenced"}
                </Badge>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => sendTest(r.kind)}
                >
                  Send test
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-3 rounded border p-3">
          <div className="space-y-1">
            <p className="font-medium">Approval action simulation</p>
            <p className="text-xs text-muted-foreground">
              Preview the alerts triggered when this step is completed with a given outcome.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {OUTCOMES.map((o) => {
              const Icon = o.icon;
              return (
                <Button
                  key={o.value}
                  type="button"
                  size="sm"
                  variant={outcome === o.value ? "default" : "outline"}
                  className="h-8 text-xs"
                  onClick={() => setOutcome(o.value)}
                >
                  <Icon className="mr-1 h-3.5 w-3.5" />
                  {o.label}
                </Button>
              );
            })}
          </div>

          <div className="space-y-2">
            {outcomeResults.map((r, i) => (
              <div key={`${r.kind}-${i}`} className="flex items-start justify-between gap-3 rounded border p-2.5">
                <div className="flex min-w-0 flex-1 items-start gap-2">
                  {r.willFire ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                  ) : (
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{r.title}</p>
                    <p className="text-xs text-muted-foreground">{r.detail}</p>
                    <p className="text-xs text-muted-foreground">
                      {KIND_LABELS[r.kind]} · {r.reason}
                    </p>
                    <ChannelMatrix plan={r.channels} />
                  </div>
                </div>
                <Badge variant={r.willFire ? "default" : "outline"} className="shrink-0 text-[10px]">
                  {r.willFire ? "Will alert" : "Silenced"}
                </Badge>
              </div>
            ))}
          </div>

          <Button type="button" size="sm" className="h-8 text-xs" onClick={sendOutcomeTests}>
            Simulate {OUTCOMES.find((o) => o.value === outcome)?.label.toLowerCase()}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}