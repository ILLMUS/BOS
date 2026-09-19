import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type ScheduledSend = Tables<"campaign_scheduled_sends">;

export const SEND_STATUSES = ["pending_approval", "approved", "sent", "cancelled", "skipped"] as const;
export type SendStatus = (typeof SEND_STATUSES)[number];

export const SEND_STATUS_LABELS: Record<string, string> = {
  pending_approval: "Waiting for approval",
  approved: "Approved",
  sent: "Sent",
  cancelled: "Cancelled",
  skipped: "Skipped",
};

export const SEND_OUTCOMES = [
  { value: "sent", label: "Message sent", status: "contacted" },
  { value: "replied", label: "Client replied", status: "replied" },
  { value: "no_answer", label: "No answer yet", status: "contacted" },
  { value: "meeting", label: "Meeting agreed", status: "meeting" },
  { value: "not_interested", label: "Not interested", status: "unsubscribed" },
] as const;

export const OUTCOME_LABELS: Record<string, string> = Object.fromEntries(
  SEND_OUTCOMES.map((o) => [o.value, o.label]),
);

/** Outcomes that count as a real response from the client. */
export const RESPONSE_OUTCOMES = ["replied", "meeting"];

export const TIMEZONES = [
  "Africa/Mbabane",
  "Africa/Johannesburg",
  "Africa/Maputo",
  "Africa/Nairobi",
  "Africa/Lagos",
  "Europe/London",
  "Europe/Berlin",
  "America/New_York",
  "Asia/Dubai",
  "UTC",
];

export function browserTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

function tzOffsetMs(date: Date, timeZone: string) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = Object.fromEntries(dtf.formatToParts(date).map((p) => [p.type, p.value]));
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour) % 24,
    Number(parts.minute),
    Number(parts.second),
  );
  return asUtc - date.getTime();
}

/** Converts a wall-clock value from a datetime-local input, read in `timeZone`, to a UTC ISO string. */
export function zonedInputToUtcIso(localValue: string, timeZone: string) {
  const [d, t] = localValue.split("T");
  if (!d || !t) return new Date().toISOString();
  const [y, mo, da] = d.split("-").map(Number);
  const [h, mi] = t.split(":").map(Number);
  const guess = Date.UTC(y, mo - 1, da, h, mi);
  let ts = guess - tzOffsetMs(new Date(guess), timeZone);
  ts = guess - tzOffsetMs(new Date(ts), timeZone);
  return new Date(ts).toISOString();
}

/** Human readable wall-clock time in a given timezone. */
export function formatInZone(iso: string | Date, timeZone: string) {
  const date = typeof iso === "string" ? new Date(iso) : iso;
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone,
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  } catch {
    return date.toLocaleString();
  }
}

export function defaultLocalInput(hoursAhead = 24) {
  const d = new Date(Date.now() + hoursAhead * 3600_000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function isDue(send: ScheduledSend) {
  return new Date(send.scheduled_at).getTime() <= Date.now();
}

export async function loadScheduledSends(orgId: string, campaignId?: string) {
  let q = supabase
    .from("campaign_scheduled_sends")
    .select("*")
    .eq("org_id", orgId)
    .order("scheduled_at", { ascending: true });
  if (campaignId) q = q.eq("campaign_id", campaignId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as ScheduledSend[];
}

export interface FollowUpSummary {
  total: number;
  pending: number;
  approved: number;
  sent: number;
  cancelled: number;
  responded: number;
  noAnswer: number;
  notInterested: number;
  responseRate: number;
  unresolved: number;
}

export function summarise(sends: ScheduledSend[]): FollowUpSummary {
  const by = (s: string) => sends.filter((x) => x.status === s).length;
  const sent = sends.filter((x) => x.status === "sent");
  const responded = sent.filter((x) => RESPONSE_OUTCOMES.includes(x.outcome ?? "")).length;
  const noAnswer = sent.filter((x) => x.outcome === "no_answer").length;
  const notInterested = sent.filter((x) => x.outcome === "not_interested").length;
  const unresolved = sent.filter(
    (x) => !x.outcome || ["sent", "no_answer"].includes(x.outcome),
  ).length;
  return {
    total: sends.length,
    pending: by("pending_approval"),
    approved: by("approved"),
    sent: sent.length,
    cancelled: by("cancelled"),
    responded,
    noAnswer,
    notInterested,
    responseRate: sent.length ? Math.round((responded / sent.length) * 100) : 0,
    unresolved,
  };
}

export function groupBy<T>(rows: T[], key: (row: T) => string) {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const k = key(row);
    map.set(k, [...(map.get(k) ?? []), row]);
  }
  return map;
}

/* ---------- Audit trail ---------- */

export type SendAudit = Tables<"campaign_send_audit">;

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  scheduled: "Scheduled",
  reviewed: "Reviewed",
  approved: "Approved",
  cancelled: "Cancelled",
  sent: "Sent",
  skipped: "Skipped",
  edited: "Edited",
  status_changed: "Status changed",
};

/** Full audit trail for one scheduled send, newest first, with actor names resolved. */
export async function loadSendAudit(sendId: string) {
  const { data, error } = await supabase
    .from("campaign_send_audit")
    .select("*")
    .eq("send_id", sendId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const rows = (data ?? []) as SendAudit[];
  const ids = [...new Set(rows.map((r) => r.actor_id).filter(Boolean))] as string[];
  let names: Record<string, string> = {};
  if (ids.length) {
    const { data: profiles } = await supabase.from("profiles").select("id,full_name").in("id", ids);
    names = Object.fromEntries((profiles ?? []).map((p) => [p.id, p.full_name]));
  }
  return rows.map((r) => ({ ...r, actor_name: (r.actor_id && names[r.actor_id]) || "System" }));
}

export type SendAuditEntry = Awaited<ReturnType<typeof loadSendAudit>>[number];

/** Records a non-mutating action (e.g. a reviewer opening the preview). */
export async function logSendAction(
  send: ScheduledSend,
  action: string,
  details: Record<string, unknown> = {},
) {
  const { data: auth } = await supabase.auth.getUser();
  await supabase.from("campaign_send_audit").insert({
    org_id: send.org_id,
    send_id: send.id,
    campaign_id: send.campaign_id,
    actor_id: auth.user?.id ?? null,
    action,
    from_status: send.status,
    to_status: send.status,
    details: details as never,
  });
}

/** Inverse of zonedInputToUtcIso: a datetime-local value for an ISO instant in a timezone. */
export function utcIsoToZonedInput(iso: string, timeZone: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone, hour12: false,
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit",
    }).formatToParts(new Date(iso)).map((p) => [p.type, p.value]),
  );
  const hour = String(Number(parts.hour) % 24).padStart(2, "0");
  return `${parts.year}-${parts.month}-${parts.day}T${hour}:${parts.minute}`;
}
