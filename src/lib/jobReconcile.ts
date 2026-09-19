import type { ExternalDoc, Expense, FinanceDoc, Job, Payment, Variation } from "@/lib/finance";
import { externalReceiptsWithoutPayment, sum } from "@/lib/finance";

/** Rounding tolerance — anything under a cent is treated as agreement. */
export const RECONCILE_TOLERANCE = 0.01;

export type FlagSeverity = "error" | "warning" | "info";

export interface ReconcileFlag {
  code: string;
  label: string;
  detail: string;
  severity: FlagSeverity;
}

export interface JobReconciliation {
  jobId: string;
  jobNumber: string;
  clientName: string;
  quoted: number;
  approvedVariations: number;
  agreedValue: number;
  invoiced: number;
  received: number;
  outstanding: number;
  costs: number;
  quoteCount: number;
  invoiceCount: number;
  receiptCount: number;
  flags: ReconcileFlag[];
  /** Worst severity across the flags, or null when everything agrees. */
  status: FlagSeverity | null;
}

const money = (v: number) =>
  new Intl.NumberFormat("en-SZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);

const gap = (a: number, b: number) => a - b > RECONCILE_TOLERANCE;

const worst = (flags: ReconcileFlag[]): FlagSeverity | null =>
  flags.some((f) => f.severity === "error") ? "error"
    : flags.some((f) => f.severity === "warning") ? "warning"
      : flags.length ? "info" : null;

export interface ReconcileInput {
  jobs: Job[];
  quotes: FinanceDoc[];
  invoices: FinanceDoc[];
  payments: Payment[];
  variations: Variation[];
  expenses: Expense[];
  receipts: ExternalDoc[];
}

/** Compares quote, invoice, receipt and payment figures for a single job. */
export function reconcileJob(job: Job, input: ReconcileInput): JobReconciliation {
  const jobQuotes = input.quotes.filter((q) => q.jobId === job.id);
  const jobInvoices = input.invoices.filter((i) => i.jobId === job.id);
  const jobPayments = input.payments.filter((p) => p.job_id === job.id);
  const looseReceipts = externalReceiptsWithoutPayment(input.receipts, input.payments)
    .filter((r) => r.job_id === job.id);
  const jobVariations = input.variations.filter((v) => v.job_id === job.id && v.status === "approved");
  const costs = sum(input.expenses.filter((e) => e.job_id === job.id).map((e) => e.amount));

  const quoted = sum(jobQuotes.map((q) => q.amount));
  const approvedVariations = sum(jobVariations.map((v) => v.amount));
  const invoiced = sum(jobInvoices.map((i) => i.amount));
  const received =
    sum(jobPayments.filter((p) => p.payment_type !== "refund").map((p) => p.amount))
    - sum(jobPayments.filter((p) => p.payment_type === "refund").map((p) => p.amount))
    + sum(looseReceipts.map((r) => r.amount));

  const agreedValue = quoted + approvedVariations;
  const flags: ReconcileFlag[] = [];

  if (invoiced > 0 && quoted === 0) {
    flags.push({
      code: "invoice_without_quote",
      label: "Invoiced with no quote",
      detail: `Invoiced ${money(invoiced)} but no quote figure was captured for this job.`,
      severity: "warning",
    });
  }
  if (quoted > 0 && invoiced === 0) {
    flags.push({
      code: "quote_not_invoiced",
      label: "Quote not invoiced",
      detail: `Quoted ${money(quoted)} with nothing invoiced yet.`,
      severity: "info",
    });
  }
  if (agreedValue > 0 && gap(invoiced, agreedValue)) {
    flags.push({
      code: "invoice_over_quote",
      label: "Invoiced above the agreed value",
      detail: `Invoiced ${money(invoiced)} against an agreed ${money(agreedValue)} (quote plus approved variations) — over by ${money(invoiced - agreedValue)}.`,
      severity: "error",
    });
  }
  if (received > 0 && invoiced === 0) {
    flags.push({
      code: "receipt_without_invoice",
      label: "Money in with no invoice",
      detail: `${money(received)} received but nothing has been invoiced.`,
      severity: "error",
    });
  }
  if (invoiced > 0 && gap(received, invoiced)) {
    flags.push({
      code: "overpaid",
      label: "Received more than invoiced",
      detail: `Received ${money(received)} against ${money(invoiced)} invoiced — over by ${money(received - invoiced)}.`,
      severity: "error",
    });
  }
  if (invoiced > 0 && gap(invoiced, received)) {
    flags.push({
      code: "outstanding",
      label: "Balance outstanding",
      detail: `${money(invoiced - received)} of ${money(invoiced)} invoiced is still unpaid.`,
      severity: "info",
    });
  }
  if (costs > 0 && received > 0 && gap(costs, received)) {
    flags.push({
      code: "costs_over_income",
      label: "Costs above money received",
      detail: `Costs of ${money(costs)} exceed the ${money(received)} received on this job.`,
      severity: "warning",
    });
  }

  return {
    jobId: job.id,
    jobNumber: job.job_number,
    clientName: job.client_name,
    quoted,
    approvedVariations,
    agreedValue,
    invoiced,
    received,
    outstanding: Math.max(invoiced - received, 0),
    costs,
    quoteCount: jobQuotes.length,
    invoiceCount: jobInvoices.length,
    receiptCount: jobPayments.length + looseReceipts.length,
    flags,
    status: worst(flags),
  };
}

export interface ReconcileReport {
  rows: JobReconciliation[];
  flagged: JobReconciliation[];
  clean: number;
  errors: number;
  warnings: number;
  /** Jobs with no money activity at all are skipped. */
  checked: number;
}

/** Runs the reconciliation check across every job in the workspace. */
export function reconcileAllJobs(input: ReconcileInput): ReconcileReport {
  const rows = input.jobs
    .map((j) => reconcileJob(j, input))
    .filter((r) => r.quoted || r.invoiced || r.received || r.costs)
    .sort((a, b) => {
      const rank = (s: FlagSeverity | null) => (s === "error" ? 0 : s === "warning" ? 1 : s === "info" ? 2 : 3);
      return rank(a.status) - rank(b.status) || b.invoiced - a.invoiced;
    });

  const flagged = rows.filter((r) => r.status === "error" || r.status === "warning");
  return {
    rows,
    flagged,
    clean: rows.filter((r) => !r.status || r.status === "info").length,
    errors: rows.filter((r) => r.status === "error").length,
    warnings: rows.filter((r) => r.status === "warning").length,
    checked: rows.length,
  };
}
