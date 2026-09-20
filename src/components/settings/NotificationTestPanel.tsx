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
  PlayCircle,
  Send,
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
import { motion, AnimatePresence } from "framer-motion";

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
    <div className="mt-2.5 space-y-2 border-t border-white/[0.06] pt-2.5">
      {plan.map((c) => {
        const Icon = CHANNEL_ICONS[c.channel];
        return (
          <div key={c.channel} className="flex items-center justify-between gap-2 min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <Icon
                className={`h-3.5 w-3.5 shrink-0 ${
                  c.willSend ? "text-teal-400" : "text-slate-500"
                }`}
              />
              <div className="min-w-0">
                <span className="text-xs font-medium text-slate-300">
                  {CHANNEL_LABELS[c.channel]}
                </span>
                <span className="ml-2 truncate text-[11px] text-slate-400">
                  • {c.reason}
                </span>
              </div>
            </div>
            <Badge
              variant="outline"
              className={`shrink-0 border text-[10px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-full ${
                c.deferred
                  ? "border-amber-400/30 bg-amber-400/10 text-amber-300"
                  : c.willSend
                  ? "border-teal-400/30 bg-teal-500/10 text-teal-300"
                  : "border-white/10 bg-white/5 text-slate-400"
              }`}
            >
              {c.deferred ? (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3 text-amber-400" />
                  Digest
                </span>
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
  nextStage: JobStage | null
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
    [prefs, stage, assignedToMe, canOverdue]
  );

  const sendTest = (kind: Kind) => {
    const title = `${KIND_LABELS[kind]}: ${STAGE_LABELS[stage]}`;
    const description = `Test alert · ${assignedToMe ? "assigned to me" : "assigned to someone else"}`;
    if (kind === "overdue") toast.error(title, { description });
    else toast(title, { description });
  };

  return (
    <Card className="relative w-full min-w-0 overflow-hidden border-white/[0.08] bg-[#05131a]/80 text-white shadow-xl backdrop-blur-md">
      <CardHeader className="border-b border-white/[0.06] p-4 sm:p-6">
        <CardTitle className="flex items-center gap-2.5 text-base font-bold tracking-tight text-white sm:text-lg">
          <motion.div
            whileHover={{ rotate: 15, scale: 1.1 }}
            transition={{ type: "spring", stiffness: 300, damping: 15 }}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-teal-400/20 bg-teal-500/10 text-teal-400"
          >
            <FlaskConical className="h-4 w-4" />
          </motion.div>
          <span className="break-words">Test Notifications</span>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-5 p-4 text-xs sm:p-6 sm:text-sm">
        <p className="break-words text-xs text-slate-400">
          Preview exactly which alerts you would receive for a given SOP step and assignment.
        </p>

        {/* CONTROLS GRID */}
        <div className="grid gap-3 sm:grid-cols-2 min-w-0">
          <div className="space-y-1.5 min-w-0">
            <Label className="text-xs font-semibold text-slate-300">SOP step</Label>
            <Select value={stage} onValueChange={(v) => setStage(v as JobStage)}>
              <SelectTrigger className="w-full border-white/[0.1] bg-[#030d12]/80 text-xs text-white focus:border-teal-400/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-72 border-white/10 bg-[#05131a] text-white">
                {ALL_STAGES.map((s) => (
                  <SelectItem
                    key={s}
                    value={s}
                    className="text-xs focus:bg-teal-500/20 focus:text-teal-200"
                  >
                    {STAGE_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-[#02080b]/60 p-3 min-w-0">
            <div className="min-w-0">
              <p className="font-semibold text-slate-200">Assigned to me</p>
              <p className="break-words text-[11px] text-slate-400">Simulate step ownership.</p>
            </div>
            <Switch
              checked={assignedToMe}
              onCheckedChange={setAssignedToMe}
              className="data-[state=checked]:bg-teal-500 shrink-0"
            />
          </div>
        </div>

        {/* RESULTS PER ALERT KIND */}
        <div className="space-y-3 min-w-0">
          {results.map((r) => (
            <div
              key={r.kind}
              className="flex flex-col gap-3 rounded-xl border border-white/[0.08] bg-[#02080b]/60 p-3.5 sm:flex-row sm:items-start sm:justify-between min-w-0"
            >
              <div className="flex min-w-0 flex-1 items-start gap-2.5">
                {r.willFire ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal-400" />
                ) : (
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-200">{KIND_LABELS[r.kind]}</p>
                  <p className="break-words text-[11px] text-slate-400">{r.reason}</p>
                  <ChannelMatrix plan={r.channels} />
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 shrink-0 sm:flex-col sm:items-end sm:justify-start">
                <Badge
                  variant="outline"
                  className={`border text-[10px] font-bold tracking-wide uppercase px-2 py-0.5 rounded-full ${
                    r.willFire
                      ? "border-teal-400/30 bg-teal-500/10 text-teal-300"
                      : "border-white/10 bg-white/5 text-slate-400"
                  }`}
                >
                  {r.willFire ? "Will alert" : "Silenced"}
                </Badge>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 border-white/10 bg-white/5 text-xs text-slate-300 hover:bg-teal-500/10 hover:text-teal-300 hover:border-teal-400/30"
                    onClick={() => sendTest(r.kind)}
                  >
                    <Send className="mr-1 h-3 w-3" />
                    Send test
                  </Button>
                </motion.div>
              </div>
            </div>
          ))}
        </div>

        {/* APPROVAL SIMULATION SECTION */}
        <div className="space-y-4 rounded-xl border border-white/[0.08] bg-[#02080b]/60 p-3.5 sm:p-4 min-w-0">
          <div className="space-y-1 min-w-0">
            <p className="font-semibold text-slate-200">Approval action simulation</p>
            <p className="break-words text-[11px] text-slate-400">
              Preview the alerts triggered when this step is completed with a given outcome.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 min-w-0">
            {OUTCOMES.map((o) => {
              const Icon = o.icon;
              const isSelected = outcome === o.value;
              return (
                <motion.div
                  key={o.value}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className={`h-8 text-xs font-medium transition-colors ${
                      isSelected
                        ? "border-teal-400/40 bg-teal-500/20 text-teal-200 hover:bg-teal-500/30"
                        : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
                    }`}
                    onClick={() => setOutcome(o.value)}
                  >
                    <Icon className={`mr-1.5 h-3.5 w-3.5 ${isSelected ? "text-teal-400" : "text-slate-400"}`} />
                    {o.label}
                  </Button>
                </motion.div>
              );
            })}
          </div>

          <div className="space-y-2.5 min-w-0">
            {outcomeResults.map((r, i) => (
              <div
                key={`${r.kind}-${i}`}
                className="flex items-start justify-between gap-3 rounded-lg border border-white/[0.06] bg-[#030d12]/50 p-3 min-w-0"
              >
                <div className="flex min-w-0 flex-1 items-start gap-2.5">
                  {r.willFire ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal-400" />
                  ) : (
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-200">{r.title}</p>
                    <p className="break-words text-xs text-slate-400">{r.detail}</p>
                    <p className="break-words text-[11px] text-slate-400 mt-0.5">
                      {KIND_LABELS[r.kind]} • {r.reason}
                    </p>
                    <ChannelMatrix plan={r.channels} />
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={`shrink-0 border text-[10px] font-bold tracking-wide uppercase px-2 py-0.5 rounded-full ${
                    r.willFire
                      ? "border-teal-400/30 bg-teal-500/10 text-teal-300"
                      : "border-white/10 bg-white/5 text-slate-400"
                  }`}
                >
                  {r.willFire ? "Will alert" : "Silenced"}
                </Badge>
              </div>
            ))}
          </div>

          <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
            <Button
              type="button"
              size="sm"
              className="w-full sm:w-auto h-8 bg-teal-500 text-xs font-semibold text-slate-950 hover:bg-teal-400"
              onClick={sendOutcomeTests}
            >
              <PlayCircle className="mr-1.5 h-3.5 w-3.5" />
              Simulate {OUTCOMES.find((o) => o.value === outcome)?.label.toLowerCase()}
            </Button>
          </motion.div>
        </div>
      </CardContent>
    </Card>
  );
}