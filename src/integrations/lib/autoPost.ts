import type { Expense, FinanceDoc, Payment } from "@/lib/finance";
import type { JournalEntry, LedgerAccount } from "@/lib/ledger";

export interface PostingLine {
  code: string;
  debit: number;
  credit: number;
  description: string;
}

export interface PostingDraft {
  sourceRef: string;
  label: string;
  date: string;
  memo: string;
  reference: string | null;
  amount: number;
  jobId: string | null;
  accountId: string | null;
  lines: PostingLine[];
}

const CODE = {
  bank: "1000",
  receivable: "1100",
  sales: "4000",
  otherExpense: "5900",
};

/** Expense category -> standard chart of accounts code. */
const EXPENSE_CODE: Record<string, string> = {
  materials: "5000",
  labour: "5100",
  subcontractor: "5100",
  equipment: "5300",
  transport: "5200",
  software: "5600",
  marketing: "5600",
  admin: "5600",
  general: "5900",
};

function line(code: string, debit: number, credit: number, description: string): PostingLine {
  return { code, debit, credit, description };
}

/**
 * Builds the journal entries that operational records imply, skipping anything
 * already posted (tracked through journal_entries.source_ref).
 */
export function buildPostings(input: {
  invoices: FinanceDoc[];
  payments: Payment[];
  expenses: Expense[];
  entries: JournalEntry[];
  jobNumber: (jobId: string | null) => string;
}): PostingDraft[] {
  const posted = new Set(
    input.entries.map((e) => (e as JournalEntry & { source_ref?: string | null }).source_ref).filter(Boolean) as string[],
  );
  const drafts: PostingDraft[] = [];

  for (const inv of input.invoices) {
    const amount = Number(inv.amount || 0);
    if (!amount || inv.isExample) continue;
    const ref = `invoice:${inv.jobId || "x"}:${inv.reference}`;
    if (posted.has(ref)) continue;
    drafts.push({
      sourceRef: ref,
      label: "Invoice",
      date: (inv.syncedAt || new Date().toISOString()).slice(0, 10),
      memo: `Invoice ${inv.reference} — ${inv.clientName}`,
      reference: inv.reference,
      amount,
      jobId: inv.jobId,
      accountId: inv.accountId,
      lines: [
        line(CODE.receivable, amount, 0, `Owed by ${inv.clientName}`),
        line(CODE.sales, 0, amount, `Invoice ${inv.reference}`),
      ],
    });
  }

  for (const p of input.payments) {
    const amount = Number(p.amount || 0);
    if (!amount) continue;
    const ref = `payment:${p.id}`;
    if (posted.has(ref)) continue;
    drafts.push({
      sourceRef: ref,
      label: "Payment received",
      date: p.paid_at,
      memo: `Payment received — ${input.jobNumber(p.job_id)}`,
      reference: p.reference || null,
      amount,
      jobId: p.job_id,
      accountId: null,
      lines: [
        line(CODE.bank, amount, 0, p.method || "Payment received"),
        line(CODE.receivable, 0, amount, `Settles ${input.jobNumber(p.job_id)}`),
      ],
    });
  }

  for (const e of input.expenses) {
    const amount = Number(e.amount || 0);
    if (!amount) continue;
    const ref = `expense:${e.id}`;
    if (posted.has(ref)) continue;
    drafts.push({
      sourceRef: ref,
      label: "Cost",
      date: e.spent_at,
      memo: e.description,
      reference: e.reference || null,
      amount,
      jobId: e.job_id,
      accountId: e.account_id,
      lines: [
        line(EXPENSE_CODE[e.category] || CODE.otherExpense, amount, 0, e.vendor || e.category),
        line(CODE.bank, 0, amount, e.method || "Paid out"),
      ],
    });
  }

  return drafts.sort((a, b) => (a.date < b.date ? 1 : -1));
}

/** True when every account code the drafts need exists in the chart of accounts. */
export function missingCodes(drafts: PostingDraft[], accounts: LedgerAccount[]) {
  const have = new Set(accounts.map((a) => a.code));
  const missing = new Set<string>();
  for (const d of drafts) for (const l of d.lines) if (!have.has(l.code)) missing.add(l.code);
  return [...missing];
}
