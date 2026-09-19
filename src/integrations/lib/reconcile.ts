import type { Tables } from "@/integrations/supabase/types";
import type { EntryWithLines, LedgerAccount } from "@/lib/ledger";

export type BankTxn = Tables<"bank_transactions">;

export const MATCH_AMOUNT_TOLERANCE = 0.01;
export const MATCH_DAY_WINDOW = 7;

export function daysApart(a: string, b: string) {
  const ms = Math.abs(new Date(a).getTime() - new Date(b).getTime());
  return Number.isFinite(ms) ? ms / 86_400_000 : Infinity;
}

/** Journal entries that plausibly correspond to a statement line. */
export function suggestMatches(txn: BankTxn, entries: EntryWithLines[]): EntryWithLines[] {
  const amount = Math.abs(Number(txn.amount) || 0);
  const ref = (txn.reference || "").trim().toLowerCase();
  const used = new Set<string>();

  return entries
    .filter((e) => {
      if (used.has(e.id)) return false;
      const amountOk = Math.abs(e.total - amount) <= MATCH_AMOUNT_TOLERANCE;
      const dateOk = daysApart(e.entry_date, txn.txn_date) <= MATCH_DAY_WINDOW;
      const refOk = !!ref && (e.reference || "").toLowerCase().includes(ref);
      return amountOk && (dateOk || refOk);
    })
    .sort((a, b) => daysApart(a.entry_date, txn.txn_date) - daysApart(b.entry_date, txn.txn_date))
    .slice(0, 5);
}

export interface ReconcileSummary {
  moneyIn: number;
  moneyOut: number;
  net: number;
  matched: number;
  unmatched: number;
  unmatchedValue: number;
  /** Ledger balance of the selected bank account over the same window. */
  ledgerBalance: number;
  difference: number;
}

export function summarise(txns: BankTxn[], ledgerBalance: number): ReconcileSummary {
  let moneyIn = 0, moneyOut = 0, matched = 0, unmatched = 0, unmatchedValue = 0;
  for (const t of txns) {
    const a = Number(t.amount) || 0;
    if (a >= 0) moneyIn += a; else moneyOut += Math.abs(a);
    if (t.status === "matched") matched += 1;
    else { unmatched += 1; unmatchedValue += Math.abs(a); }
  }
  const net = moneyIn - moneyOut;
  return { moneyIn, moneyOut, net, matched, unmatched, unmatchedValue, ledgerBalance, difference: net - ledgerBalance };
}

/** Parses a simple CSV bank statement: date, description, [reference], amount. */
export function parseStatementCsv(text: string): Array<Pick<BankTxn, "txn_date" | "description" | "reference" | "amount">> {
  const rows: Array<Pick<BankTxn, "txn_date" | "description" | "reference" | "amount">> = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const cells = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
    if (cells.length < 3) continue;
    const date = normaliseDate(cells[0]);
    if (!date) continue; // skips the header row
    const amount = Number(cells[cells.length - 1].replace(/[^\d.\-]/g, ""));
    if (!Number.isFinite(amount)) continue;
    rows.push({
      txn_date: date,
      description: cells[1] || "Statement line",
      reference: cells.length > 3 ? cells[2] || null : null,
      amount,
    });
  }
  return rows;
}

function normaliseDate(v: string): string | null {
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const m = v.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return null;
}

export function bankAccounts(accounts: LedgerAccount[]) {
  return accounts.filter((a) => a.type === "asset" && /bank|cash|petty/i.test(a.name));
}
