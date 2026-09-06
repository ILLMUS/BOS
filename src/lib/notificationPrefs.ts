import { useEffect, useState } from "react";
import type { Database } from "@/integrations/supabase/types";
import { STAGE_LABELS } from "@/lib/constants";

type JobStage = Database["public"]["Enums"]["job_stage"];

export interface NotificationPrefs {
  activityToasts: boolean;
  approvalToasts: boolean;
  overdueToasts: boolean;
  /** Only alert for stages where I (or my role) am the assigned owner. */
  onlyMyAssignments: boolean;
  /** Restrict alerts to the selected SOP steps below. */
  stageFilterEnabled: boolean;
  /** SOP steps that may raise alerts when stageFilterEnabled is on. */
  enabledStages: JobStage[];
  quietHoursEnabled: boolean;
  quietStart: string; // "HH:MM"
  quietEnd: string;   // "HH:MM"
  /** Delivery channels. */
  channelInApp: boolean;
  channelEmail: boolean;
  channelSms: boolean;
  /** Email quiet-hours alerts as a digest instead of dropping them. */
  emailDigestDuringQuiet: boolean;
  /** SMS is reserved for urgent alerts (approvals + overdue). */
  smsUrgentOnly: boolean;
}

export const DEFAULT_PREFS: NotificationPrefs = {
  activityToasts: true,
  approvalToasts: true,
  overdueToasts: true,
  onlyMyAssignments: false,
  stageFilterEnabled: false,
  enabledStages: Object.keys(STAGE_LABELS) as JobStage[],
  quietHoursEnabled: false,
  quietStart: "22:00",
  quietEnd: "07:00",
  channelInApp: true,
  channelEmail: true,
  channelSms: false,
  emailDigestDuringQuiet: true,
  smsUrgentOnly: true,
};

const STORAGE_KEY = "notification-prefs";
const EVENT = "notification-prefs:changed";

export function loadPrefs(): NotificationPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFS;
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function savePrefs(prefs: NotificationPrefs) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  window.dispatchEvent(new CustomEvent(EVENT));
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function isQuietNow(prefs: NotificationPrefs, now: Date = new Date()): boolean {
  if (!prefs.quietHoursEnabled) return false;
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const start = toMinutes(prefs.quietStart);
  const end = toMinutes(prefs.quietEnd);
  if (start === end) return false;
  if (start < end) return nowMin >= start && nowMin < end;
  // wraps midnight
  return nowMin >= start || nowMin < end;
}

export interface ToastContext {
  /** SOP step the alert relates to (if any). */
  stage?: JobStage | null;
  /** True when the current user is the primary/secondary owner of that step. */
  assignedToMe?: boolean;
}

export function shouldToast(
  kind: "activity" | "approval" | "overdue",
  ctx: ToastContext = {},
  prefs?: NotificationPrefs,
): boolean {
  const p = prefs ?? loadPrefs();
  if (isQuietNow(p)) return false;

  const kindOn =
    kind === "activity" ? p.activityToasts : kind === "approval" ? p.approvalToasts : p.overdueToasts;
  if (!kindOn) return false;

  if (p.stageFilterEnabled && ctx.stage && !p.enabledStages.includes(ctx.stage)) return false;
  if (p.onlyMyAssignments && ctx.assignedToMe === false) return false;

  return true;
}

export type Channel = "in_app" | "email" | "sms";

export const CHANNEL_LABELS: Record<Channel, string> = {
  in_app: "In-app",
  email: "Email",
  sms: "SMS",
};

export interface ChannelDelivery {
  channel: Channel;
  willSend: boolean;
  /** Email may be held for a digest instead of sending immediately. */
  deferred: boolean;
  reason: string;
}

/** Which channels an alert of `kind` would be delivered on. */
export function deliveryPlan(
  kind: "activity" | "approval" | "overdue",
  ctx: ToastContext = {},
  prefs?: NotificationPrefs,
): ChannelDelivery[] {
  const p = prefs ?? loadPrefs();
  const quiet = isQuietNow(p);
  const kindOn =
    kind === "activity" ? p.activityToasts : kind === "approval" ? p.approvalToasts : p.overdueToasts;
  const stageBlocked = !!(p.stageFilterEnabled && ctx.stage && !p.enabledStages.includes(ctx.stage));
  const assignmentBlocked = p.onlyMyAssignments && ctx.assignedToMe === false;
  const matchesRules = kindOn && !stageBlocked && !assignmentBlocked;

  const ruleReason = !kindOn
    ? "This alert type is switched off."
    : stageBlocked
      ? "Excluded by your per-step filter."
      : assignmentBlocked
        ? "Blocked by \u201Conly my assigned actions\u201D."
        : "";

  const inApp: ChannelDelivery = {
    channel: "in_app",
    deferred: false,
    willSend: p.channelInApp && matchesRules && !quiet,
    reason: !p.channelInApp
      ? "In-app channel is off."
      : !matchesRules
        ? ruleReason
        : quiet
          ? `Silenced by quiet hours (${p.quietStart}\u2013${p.quietEnd}).`
          : "Toast appears immediately in the app.",
  };

  const emailDeferred = p.channelEmail && matchesRules && quiet && p.emailDigestDuringQuiet;
  const email: ChannelDelivery = {
    channel: "email",
    deferred: emailDeferred,
    willSend: p.channelEmail && matchesRules && (!quiet || p.emailDigestDuringQuiet),
    reason: !p.channelEmail
      ? "Email channel is off."
      : !matchesRules
        ? ruleReason
        : emailDeferred
          ? "Held for the digest sent after quiet hours."
          : "Email sent immediately.",
  };

  const urgent = kind !== "activity";
  const smsUrgentBlocked = p.smsUrgentOnly && !urgent;
  const sms: ChannelDelivery = {
    channel: "sms",
    deferred: false,
    willSend: p.channelSms && matchesRules && !smsUrgentBlocked && !quiet,
    reason: !p.channelSms
      ? "SMS channel is off."
      : !matchesRules
        ? ruleReason
        : smsUrgentBlocked
          ? "SMS is limited to approvals and overdue steps."
          : quiet
            ? `Silenced by quiet hours (${p.quietStart}\u2013${p.quietEnd}).`
            : "Text message sent immediately.",
  };

  return [inApp, email, sms];
}

export function useNotificationPrefs() {
  const [prefs, setPrefs] = useState<NotificationPrefs>(() => loadPrefs());
  useEffect(() => {
    const handler = () => setPrefs(loadPrefs());
    window.addEventListener(EVENT, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(EVENT, handler);
      window.removeEventListener("storage", handler);
    };
  }, []);
  const update = (patch: Partial<NotificationPrefs>) => {
    const next = { ...prefs, ...patch };
    savePrefs(next);
    setPrefs(next);
  };
  return { prefs, update };
}