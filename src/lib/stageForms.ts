/**
 * Steps whose name mentions a money document always open the matching built-in
 * finance form instead of a generic question list, so quotes, invoices and
 * receipts stay connected to the client record and the ledger.
 */
export type FinanceFormKind = "quote" | "invoice" | "receipt";

export const FINANCE_FORM_LABELS: Record<FinanceFormKind, string> = {
  quote: "Quotation form",
  invoice: "Invoice form",
  receipt: "Receipt form",
};

/** Detects which finance form a step name should trigger (null = normal step). */
export function detectFinanceForm(stageName?: string | null): FinanceFormKind | null {
  const n = (stageName || "").toLowerCase();
  if (!n) return null;
  if (/receipt|payment received|proof of payment/.test(n)) return "receipt";
  if (/invoice|invoicing|billing/.test(n)) return "invoice";
  if (/quot|estimate|proposal/.test(n)) return "quote";
  return null;
}
