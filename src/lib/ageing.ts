import type { Expense, ExternalDoc, FinanceDoc, Payment } from "@/lib/finance";

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

/** A payment or credit note applied against one open item. */
export interface Application {
  kind: "payment" | "credit" | "refund";
  id: string;
  date: string | null;
  reference: string | null;
  method: string | null;
  /** Amount applied to this specific item. */
  amount: number;
  /** Full value of the payment or credit note it came from. */
  sourceAmount: number;
  /** journal_entries.source_ref of the entry this application posts as. */
  sourceRef: string;
  documentUrl?: string | null;
}

export interface OpenItem {
  id: string;
  kind: "invoice" | "credit_note" | "bill" | "supplier_credit";
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
  /** journal_entries.source_ref of the entry that books this document. */
  sourceRef: string;
  applications: Application[];
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

interface Pool {
  remaining: number;
  apply: (need: number) => number;
  source: Application;
}

function makePool(app: Application): Pool {
  const pool = {
    remaining: app.amount,
    source: app,
    apply(need: number) {
      const used = Math.min(pool.remaining, need);
      pool.remaining -= used;
      return used;
    },
  };
  return pool;
}

/**
 * Customer ageing: invoices less the payments and credit notes applied to them.
 * Money is applied to the oldest invoice of the same job (or client) first.
 */
export function receivablesAgeing(
  invoices: FinanceDoc[],
  payments: Payment[],
  creditNotes: ExternalDoc[] = [],
  asOf: Date = new Date(),
): AgeingReport {
  const poolsByJob = new Map<string, Pool[]>();
  const poolsByParty = new Map<string, Pool[]>();

  const push = (map: Map<string, Pool[]>, key: string, pool: Pool) => {
    const list = map.get(key) || [];
    list.push(pool);
    map.set(key, list);
  };

  for (const p of payments) {
    const amount = Number(p.amount || 0);
    if (!p.job_id || amount <= 0) continue;
    const isRefund = p.payment_type === "refund";
    push(poolsByJob, p.job_id, makePool({
      kind: isRefund ? "refund" : "payment",
      id: p.id,
      date: p.paid_at,
      reference: p.reference,
      method: p.method,
      amount: isRefund ? 0 : amount,
      sourceAmount: amount,
      sourceRef: `payment:${p.id}`,
      documentUrl: p.proof_url,
    }));
  }

  for (const c of creditNotes) {
    const amount = Number(c.amount || 0);
    if (amount <= 0 || c.is_example) continue;
    const pool = makePool({
      kind: "credit",
      id: c.id,
      date: c.issued_at,
      reference: c.reference,
      method: null,
      amount,
      sourceAmount: amount,
      sourceRef: `credit_note:${c.id}`,
      documentUrl: c.document_url,
    });
    if (c.job_id) push(poolsByJob, c.job_id, pool);
    else push(poolsByParty, (c.client_name || "Unknown client").toLowerCase(), pool);
  }

  const items: OpenItem[] = [];
  const sorted = [...invoices].sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""));

  for (const inv of sorted) {
    if (inv.isExample) continue;
    const amount = Number(inv.amount || 0);
    if (amount <= 0) continue;

    const party = inv.clientName || "Unknown client";
    const pools = [
      ...(inv.jobId ? poolsByJob.get(inv.jobId) || [] : []),
      ...(poolsByParty.get(party.toLowerCase()) || []),
    ];

    const applications: Application[] = [];
    let paid = 0;
    for (const pool of pools) {
      const need = amount - paid;
      if (need <= 0.005) break;
      const used = pool.apply(need);
      if (used <= 0.005) continue;
      paid += used;
      applications.push({ ...pool.source, amount: used });
    }

    const outstanding = amount - paid;
    const issuedAt = inv.syncedAt ? inv.syncedAt.slice(0, 10) : null;
    const dueDate = inv.dueDate || (issuedAt ? addDays(issuedAt, DEFAULT_TERMS_DAYS) : null);
    const days = daysOverdue(dueDate, asOf);

    if (outstanding <= 0.005) continue;

    items.push({
      id: `${inv.jobId || "x"}-${inv.reference}`,
      kind: "invoice",
      party,
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
      sourceRef: `invoice:${inv.jobId || "x"}:${inv.reference}`,
      applications,
    });
  }

  // Credit notes with value left over sit on the client's account as a negative item.
  for (const [, pools] of [...poolsByJob, ...poolsByParty].map((e) => e)) {
    for (const pool of pools) {
      if (pool.source.kind !== "credit" || pool.remaining <= 0.005) continue;
      const c = pool.source;
      items.push({
        id: `credit-${c.id}`,
        kind: "credit_note",
        party: creditNotes.find((n) => n.id === c.id)?.client_name || "Unknown client",
        reference: c.reference || "Credit note",
        jobId: creditNotes.find((n) => n.id === c.id)?.job_id ?? null,
        jobNumber: null,
        issuedAt: c.date,
        dueDate: null,
        amount: -c.sourceAmount,
        paid: -(c.sourceAmount - pool.remaining),
        outstanding: -pool.remaining,
        daysOverdue: 0,
        bucket: "current",
        documentUrl: c.documentUrl,
        sourceRef: c.sourceRef,
        applications: [],
      });
    }
  }

  return rollUp(items);
}

/**
 * Supplier ageing: recorded costs that have not been settled, less supplier
 * credits recorded for the same vendor.
 */
export function payablesAgeing(
  expenses: Expense[],
  jobNumber: (jobId: string | null) => string | undefined,
  supplierCredits: ExternalDoc[] = [],
  asOf: Date = new Date(),
): AgeingReport {
  const poolsByVendor = new Map<string, Pool[]>();
  for (const c of supplierCredits) {
    const amount = Number(c.amount || 0);
    if (amount <= 0 || c.is_example) continue;
    const key = (c.client_name || "Unnamed supplier").trim().toLowerCase();
    const list = poolsByVendor.get(key) || [];
    list.push(makePool({
      kind: "credit",
      id: c.id,
      date: c.issued_at,
      reference: c.reference,
      method: null,
      amount,
      sourceAmount: amount,
      sourceRef: `supplier_credit:${c.id}`,
      documentUrl: c.document_url,
    }));
    poolsByVendor.set(key, list);
  }

  const items: OpenItem[] = [];
  const open = expenses
    .filter((e) => UNPAID_METHODS.includes((e.method || "").trim().toLowerCase()))
    .sort((a, b) => (a.spent_at || "").localeCompare(b.spent_at || ""));

  for (const e of open) {
    const amount = Number(e.amount || 0);
    if (amount <= 0.005) continue;
    const party = e.vendor?.trim() || "Unnamed supplier";

    const applications: Application[] = [];
    let paid = 0;
    for (const pool of poolsByVendor.get(party.toLowerCase()) || []) {
      const need = amount - paid;
      if (need <= 0.005) break;
      const used = pool.apply(need);
      if (used <= 0.005) continue;
      paid += used;
      applications.push({ ...pool.source, amount: used });
    }

    const outstanding = amount - paid;
    if (outstanding <= 0.005) continue;

    const dueDate = e.spent_at ? addDays(e.spent_at, DEFAULT_TERMS_DAYS) : null;
    const days = daysOverdue(dueDate, asOf);

    items.push({
      id: e.id,
      kind: "bill",
      party,
      reference: e.reference || e.description,
      jobId: e.job_id,
      jobNumber: jobNumber(e.job_id) || null,
      issuedAt: e.spent_at,
      dueDate,
      amount,
      paid,
      outstanding,
      daysOverdue: days,
      bucket: bucketFor(days),
      documentUrl: e.receipt_url,
      sourceRef: `expense:${e.id}`,
      applications,
    });
  }

  for (const [, pools] of poolsByVendor) {
    for (const pool of pools) {
      if (pool.remaining <= 0.005) continue;
      const c = pool.source;
      const doc = supplierCredits.find((n) => n.id === c.id);
      items.push({
        id: `supplier-credit-${c.id}`,
        kind: "supplier_credit",
        party: doc?.client_name || "Unnamed supplier",
        reference: c.reference || "Supplier credit",
        jobId: doc?.job_id ?? null,
        jobNumber: null,
        issuedAt: c.date,
        dueDate: null,
        amount: -c.sourceAmount,
        paid: -(c.sourceAmount - pool.remaining),
        outstanding: -pool.remaining,
        daysOverdue: 0,
        bucket: "current",
        documentUrl: c.documentUrl,
        sourceRef: c.sourceRef,
        applications: [],
      });
    }
  }

  return rollUp(items);
}

/** Journal entries that book this document or any payment/credit applied to it. */
export function relatedSourceRefs(item: OpenItem) {
  return [item.sourceRef, ...item.applications.map((a) => a.sourceRef)];
}
