import type { Expense, FinanceDoc, Payment } from "@/lib/finance";

/** Standard 30-day ageing buckets used by both customer and supplier reports. */
export const AGEING_BUCKETS = [
  { key: "current", label: "Current", min: -Infinity, max: 0 },
  { key: "b1", label: "1-30 days", min: 1, max: 30 },
  { key: "b2", label: "31-60 days", min: 31, max: 60 },
  { key: "b3", label: "61-90 days", min: 61, max: 90 },
  { key: "b4", label: "90+ days", min: 91, max: Infinity },
] as const;

export type BucketKey = (typeof AGEING_BUCKETS)[number]["key"];

/** Default credit terms applied when an invoice carries no due date. */
export const DEFAULT_TERMS_DAYS = 30;

/** Payment methods that mean the supplier has not actually been paid yet. */
const UNPAID_METHODS = ["", "credit", "account", "on account", "unpaid", "invoice", "terms", "30 days"];

export interface OpenItem {
  id: string;
  party: string;
  reference: string;
  jobId: string | null;
  jobNumber: string | null;
  issuedAt: string | null;
  dueDate: string | null;
  amount: number;
  paid: number;
  outstanding: number;
  daysOverdue: number;
  bucket: BucketKey;
  documentUrl?: string | null;
}

export interface AgeingRow {
  party: string;
  items: OpenItem[];
  total: number;
  overdue: number;
  oldestDays: number;
  buckets: Record<BucketKey, number>;
}

export interface AgeingReport {
  rows: AgeingRow[];
  total: number;
  overdue: number;
  buckets: Record<BucketKey, number>;
  itemCount: number;
}

const emptyBuckets = (): Record<BucketKey, number> =>
  AGEING_BUCKETS.reduce((acc, b) => ({ ...acc, [b.key]: 0 }), {} as Record<BucketKey, number>);

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

export function daysOverdue(dueDate: string | null | undefined, asOf: Date = new Date()) {
  if (!dueDate) return 0;
  const due = new Date(dueDate);
  if (Number.isNaN(due.getTime())) return 0;
  return Math.floor((startOfDay(asOf) - startOfDay(due)) / 86_400_000);
}

export function bucketFor(days: number): BucketKey {
  for (const b of AGEING_BUCKETS) {
    if (days >= b.min && days <= b.max) return b.key;
  }
  return "current";
}

export function addDays(date: string, days: number) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return date;
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function rollUp(items: OpenItem[]): AgeingReport {
  const byParty = new Map<string, OpenItem[]>();
  for (const it of items) {
    const list = byParty.get(it.party) || [];
    list.push(it);
    byParty.set(it.party, list);
  }

  const rows: AgeingRow[] = [...byParty.entries()]
    .map(([party, list]) => {
      const buckets = emptyBuckets();
      let total = 0;
      let overdue = 0;
      let oldestDays = 0;
      for (const it of list) {
        buckets[it.bucket] += it.outstanding;
        total += it.outstanding;
        if (it.daysOverdue > 0) overdue += it.outstanding;
        oldestDays = Math.max(oldestDays, it.daysOverdue);
      }
      list.sort((a, b) => b.daysOverdue - a.daysOverdue);
      return { party, items: list, total, overdue, oldestDays, buckets };
    })
    .sort((a, b) => b.overdue - a.overdue || b.total - a.total);

  const buckets = emptyBuckets();
  let total = 0;
  let overdue = 0;
  for (const r of rows) {
    total += r.total;
    overdue += r.overdue;
    for (const b of AGEING_BUCKETS) buckets[b.key] += r.buckets[b.key];
  }

  return { rows, total, overdue, buckets, itemCount: items.length };
}

/** Customer ageing: invoices less the payments recorded against the same job. */
export function receivablesAgeing(
  invoices: FinanceDoc[],
  payments: Payment[],
  asOf: Date = new Date(),
): AgeingReport {
  const paidByJob = new Map<string, number>();
  for (const p of payments) {
    if (!p.job_id) continue;
    paidByJob.set(p.job_id, (paidByJob.get(p.job_id) || 0) + Number(p.amount || 0));
  }

  const items: OpenItem[] = [];
  const sorted = [...invoices].sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""));

  for (const inv of sorted) {
    if (inv.isExample) continue;
    const amount = Number(inv.amount || 0);
    if (amount <= 0) continue;

    // Payments settle a job's invoices oldest-first.
    let paid = 0;
    if (inv.jobId) {
      const pool = paidByJob.get(inv.jobId) || 0;
      paid = Math.min(pool, amount);
      paidByJob.set(inv.jobId, pool - paid);
    }
    const outstanding = amount - paid;
    if (outstanding <= 0.005) continue;

    const issuedAt = inv.syncedAt ? inv.syncedAt.slice(0, 10) : null;
    const dueDate = inv.dueDate || (issuedAt ? addDays(issuedAt, DEFAULT_TERMS_DAYS) : null);
    const days = daysOverdue(dueDate, asOf);

    items.push({
      id: `${inv.jobId || "x"}-${inv.reference}`,
      party: inv.clientName || "Unknown client",
      reference: inv.reference,
      jobId: inv.jobId,
      jobNumber: inv.jobNumber,
      issuedAt,
      dueDate,
      amount,
      paid,
      outstanding,
      daysOverdue: days,
      bucket: bucketFor(days),
      documentUrl: inv.documentUrl,
    });
  }

  return rollUp(items);
}

/** Supplier ageing: recorded costs that have not been settled with a payment method. */
export function payablesAgeing(
  expenses: Expense[],
  jobNumber: (jobId: string | null) => string | undefined,
  asOf: Date = new Date(),
): AgeingReport {
  const items: OpenItem[] = [];

  for (const e of expenses) {
    const method = (e.method || "").trim().toLowerCase();
    if (!UNPAID_METHODS.includes(method)) continue;
    const amount = Number(e.amount || 0);
    if (amount <= 0.005) continue;

    const dueDate = e.spent_at ? addDays(e.spent_at, DEFAULT_TERMS_DAYS) : null;
    const days = daysOverdue(dueDate, asOf);

    items.push({
      id: e.id,
      party: e.vendor?.trim() || "Unnamed supplier",
      reference: e.reference || e.description,
      jobId: e.job_id,
      jobNumber: jobNumber(e.job_id) || null,
      issuedAt: e.spent_at,
      dueDate,
      amount,
      paid: 0,
      outstanding: amount,
      daysOverdue: days,
      bucket: bucketFor(days),
      documentUrl: e.receipt_url,
    });
  }

  return rollUp(items);
}
