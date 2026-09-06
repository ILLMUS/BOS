import type { Tables } from "@/integrations/supabase/types";

export type LedgerAccount = Tables<"ledger_accounts">;
export type JournalEntry = Tables<"journal_entries">;
export type JournalLine = Tables<"journal_lines">;

export type AccountType = LedgerAccount["type"];

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  asset: "Assets",
  liability: "Liabilities",
  equity: "Equity",
  income: "Income",
  expense: "Expenses",
};

export const ACCOUNT_TYPES: AccountType[] = ["asset", "liability", "equity", "income", "expense"];

/** Debit-positive types; for the others a credit increases the balance. */
const DEBIT_POSITIVE: AccountType[] = ["asset", "expense"];

export interface AccountBalance {
  account: LedgerAccount;
  debit: number;
  credit: number;
  /** Signed balance in the account's natural direction. */
  balance: number;
}

export interface EntryWithLines extends JournalEntry {
  lines: (JournalLine & { account?: LedgerAccount })[];
  total: number;
  balanced: boolean;
}

export function num(v: unknown) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export function attachLines(entries: JournalEntry[], lines: JournalLine[], accounts: LedgerAccount[]): EntryWithLines[] {
  const byAccount = new Map(accounts.map((a) => [a.id, a]));
  return entries.map((e) => {
    const own = lines
      .filter((l) => l.entry_id === e.id)
      .sort((a, b) => a.position - b.position)
      .map((l) => ({ ...l, account: byAccount.get(l.ledger_account_id) }));
    const debit = own.reduce((s, l) => s + num(l.debit), 0);
    const credit = own.reduce((s, l) => s + num(l.credit), 0);
    return { ...e, lines: own, total: Math.max(debit, credit), balanced: Math.abs(debit - credit) < 0.005 };
  });
}

export function inRange(date: string, from?: string, to?: string) {
  if (from && date < from) return false;
  if (to && date > to) return false;
  return true;
}

/** Trial balance across every account, restricted to entries inside the date window. */
export function trialBalance(
  accounts: LedgerAccount[],
  entries: JournalEntry[],
  lines: JournalLine[],
  from?: string,
  to?: string,
): AccountBalance[] {
  const dates = new Map(entries.map((e) => [e.id, e.entry_date]));
  const totals = new Map<string, { debit: number; credit: number }>();

  for (const l of lines) {
    const d = dates.get(l.entry_id);
    if (!d || !inRange(d, from, to)) continue;
    const cur = totals.get(l.ledger_account_id) || { debit: 0, credit: 0 };
    cur.debit += num(l.debit);
    cur.credit += num(l.credit);
    totals.set(l.ledger_account_id, cur);
  }

  return accounts
    .map((account) => {
      const t = totals.get(account.id) || { debit: 0, credit: 0 };
      const natural = DEBIT_POSITIVE.includes(account.type) ? t.debit - t.credit : t.credit - t.debit;
      return { account, debit: t.debit, credit: t.credit, balance: natural };
    })
    .sort((a, b) => a.account.code.localeCompare(b.account.code));
}

export interface Statements {
  rows: AccountBalance[];
  income: AccountBalance[];
  expenses: AccountBalance[];
  assets: AccountBalance[];
  liabilities: AccountBalance[];
  equity: AccountBalance[];
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  totalDebits: number;
  totalCredits: number;
  balanced: boolean;
}

export function buildStatements(rows: AccountBalance[]): Statements {
  const of = (t: AccountType) => rows.filter((r) => r.account.type === t);
  const sum = (list: AccountBalance[]) => list.reduce((s, r) => s + r.balance, 0);

  const income = of("income");
  const expenses = of("expense");
  const assets = of("asset");
  const liabilities = of("liability");
  const equity = of("equity");

  const totalIncome = sum(income);
  const totalExpenses = sum(expenses);
  const totalDebits = rows.reduce((s, r) => s + r.debit, 0);
  const totalCredits = rows.reduce((s, r) => s + r.credit, 0);

  return {
    rows, income, expenses, assets, liabilities, equity,
    totalIncome, totalExpenses,
    netProfit: totalIncome - totalExpenses,
    totalAssets: sum(assets),
    totalLiabilities: sum(liabilities),
    totalEquity: sum(equity),
    totalDebits, totalCredits,
    balanced: Math.abs(totalDebits - totalCredits) < 0.005,
  };
}

export function nextAccountCode(accounts: LedgerAccount[], type: AccountType) {
  const base = { asset: 1000, liability: 2000, equity: 3000, income: 4000, expense: 5000 }[type];
  const used = accounts
    .filter((a) => a.type === type)
    .map((a) => parseInt(a.code, 10))
    .filter((n) => Number.isFinite(n));
  const max = used.length ? Math.max(...used) : base;
  return String(Math.max(max + 10, base));
}
