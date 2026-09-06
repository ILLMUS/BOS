import type { Tables } from "@/integrations/supabase/types";
import { CURRENCY_CODE } from "@/lib/currency";

export type Job = Tables<"jobs">;
export type JobStage = Tables<"job_stages">;
export type Payment = Tables<"job_payments">;
export type Variation = Tables<"job_variations">;
export type Expense = Tables<"expenses">;
export type ExternalDoc = Tables<"finance_documents">;

/**
 * DEAL -> QUOTE -> WORK -> INVOICE -> PAYMENT
 * Quotes and invoices are not stored twice: they live in the synced
 * `job_stages.form_data` written by the external quote builder.
 */
export interface FinanceDoc {
  kind: "quote" | "invoice";
  jobId: string | null;
  jobNumber: string;
  clientName: string;
  accountId: string | null;
  dealId: string | null;
  reference: string;
  amount: number | null;
  currency: string;
  documentUrl: string | null;
  syncedAt: string | null;
  dueDate: string | null;
  /** Where the record came from: derived from stage data, or a stored external document. */
  source?: string;
  externalDocId?: string;
  /** Sample/reference record, so it can be filtered out of real client data. */
  isExample?: boolean;
}

export const EXPENSE_CATEGORIES = [
  "materials",
  "labour",
  "subcontractor",
  "equipment",
  "transport",
  "software",
  "marketing",
  "admin",
  "general",
] as const;

export const EXPENSE_CATEGORY_LABELS: Record<string, string> = {
  materials: "Materials",
  labour: "Labour",
  subcontractor: "Subcontractor",
  equipment: "Equipment",
  transport: "Transport",
  software: "Software",
  marketing: "Marketing",
  admin: "Admin",
  general: "General",
};

const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/** Derives quote and invoice documents from synced stage data. */
export function deriveFinanceDocs(stages: JobStage[], jobs: Job[]) {
  const jobById = new Map(jobs.map((j) => [j.id, j]));
  const quotes: FinanceDoc[] = [];
  const invoices: FinanceDoc[] = [];

  for (const s of stages) {
    const fd = (s.form_data as Record<string, unknown> | null) || {};
    const job = jobById.get(s.job_id);
    const base = {
      jobId: s.job_id,
      jobNumber: job?.job_number || "—",
      clientName: job?.client_name || "—",
      accountId: job?.account_id ?? null,
      dealId: job?.deal_id ?? null,
      currency: String(fd.currency || CURRENCY_CODE),
      syncedAt: (fd.api_synced_at as string) || null,
    };

    if (fd.quote_ref) {
      quotes.push({
        ...base,
        kind: "quote",
        reference: String(fd.quote_ref),
        amount: num(fd.total_amount ?? fd.quote_amount),
        documentUrl: (fd.quote_document_url as string) || null,
        dueDate: null,
      });
    }
    if (fd.invoice_number) {
      invoices.push({
        ...base,
        kind: "invoice",
        reference: String(fd.invoice_number),
        amount: num(fd.invoice_amount ?? fd.total_amount),
        documentUrl: (fd.invoice_document_url as string) || null,
        dueDate: (fd.due_date as string) || null,
      });
    }
  }
  return { quotes, invoices };
}

export const sum = (values: Array<number | null | undefined>) =>
  values.reduce<number>((s, v) => s + Number(v || 0), 0);

/** Maps a stored external document (quote/invoice) into the shared document shape. */
export function externalToDoc(d: ExternalDoc, jobs: Job[]): FinanceDoc {
  const job = d.job_id ? jobs.find((j) => j.id === d.job_id) : undefined;
  return {
    kind: d.doc_type === "invoice" ? "invoice" : "quote",
    jobId: d.job_id,
    jobNumber: job?.job_number || "—",
    clientName: d.client_name || job?.client_name || "—",
    accountId: d.account_id,
    dealId: d.deal_id,
    reference: d.reference,
    amount: Number(d.amount ?? 0),
    currency: d.currency || CURRENCY_CODE,
    documentUrl: d.document_url,
    syncedAt: d.synced_at || d.created_at,
    dueDate: d.due_date,
    source: d.source,
    externalDocId: d.id,
    isExample: d.is_example,
  };
}

/** Stored external documents win over documents derived from stage data with the same reference. */
export function mergeDocs(stored: FinanceDoc[], derived: FinanceDoc[]): FinanceDoc[] {
  const seen = new Set(stored.map((d) => d.reference.toLowerCase()));
  return [...stored, ...derived.filter((d) => !seen.has(d.reference.toLowerCase()))];
}

/** Splits stored documents into quotes, invoices and receipts. */
export function splitExternalDocs(docs: ExternalDoc[], jobs: Job[]) {
  return {
    quotes: docs.filter((d) => d.doc_type === "quote").map((d) => externalToDoc(d, jobs)),
    invoices: docs.filter((d) => d.doc_type === "invoice").map((d) => externalToDoc(d, jobs)),
    receipts: docs.filter((d) => d.doc_type === "receipt"),
  };
}

export interface FinanceTotals {
  quoted: number;
  approvedVariations: number;
  invoiced: number;
  received: number;
  outstanding: number;
  expenses: number;
  netRevenue: number;
}

export function computeTotals(args: {
  quotes: FinanceDoc[];
  invoices: FinanceDoc[];
  payments: Payment[];
  variations: Variation[];
  expenses: Expense[];
  receipts?: ExternalDoc[];
}): FinanceTotals {
  const quoted = sum(args.quotes.map((q) => q.amount));
  const approvedVariations = sum(
    args.variations.filter((v) => v.status === "approved").map((v) => v.amount),
  );
  const invoiced = sum(args.invoices.map((i) => i.amount));
  const received = sum(args.payments.filter((p) => p.payment_type !== "refund").map((p) => p.amount))
    - sum(args.payments.filter((p) => p.payment_type === "refund").map((p) => p.amount))
    + sum(externalReceiptsWithoutPayment(args.receipts || [], args.payments).map((r) => r.amount));
  const expenses = sum(args.expenses.map((e) => e.amount));
  return {
    quoted,
    approvedVariations,
    invoiced,
    received,
    outstanding: Math.max(invoiced - received, 0),
    expenses,
    netRevenue: received - expenses,
  };
}

/** Receipts synced from the external builder that were not already booked as job payments. */
export function externalReceiptsWithoutPayment(receipts: ExternalDoc[], payments: Payment[]) {
  const refs = new Set(payments.map((p) => (p.reference || "").toLowerCase()).filter(Boolean));
  return receipts.filter((r) => !refs.has(r.reference.toLowerCase()));
}

/** Groups received payments by calendar month for the revenue trend. */
export function monthlyRevenue(payments: Payment[], expenses: Expense[], months = 6) {
  const buckets: { key: string; label: string; received: number; spent: number }[] = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleDateString(undefined, { month: "short" }),
      received: 0,
      spent: 0,
    });
  }
  const index = new Map(buckets.map((b) => [b.key, b]));
  for (const p of payments) {
    const b = index.get((p.paid_at || "").slice(0, 7));
    if (b) b.received += p.payment_type === "refund" ? -Number(p.amount || 0) : Number(p.amount || 0);
  }
  for (const e of expenses) {
    const b = index.get((e.spent_at || "").slice(0, 7));
    if (b) b.spent += Number(e.amount || 0);
  }
  return buckets;
}
