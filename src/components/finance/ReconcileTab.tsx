import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, Link2Off, Loader2, Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatDate, formatMoney } from "@/lib/crm";
import type { EntryWithLines, LedgerAccount } from "@/lib/ledger";
import { trialBalance } from "@/lib/ledger";
import {
  bankAccounts, parseStatementCsv, suggestMatches, summarise, type BankTxn,
} from "@/lib/reconcile";
import BankTxnDialog from "./BankTxnDialog";

interface Props {
  orgId: string | null;
  accounts: LedgerAccount[];
  entries: EntryWithLines[];
  /** Trial-balance rows already limited to the active date range. */
  balances: ReturnType<typeof trialBalance>;
}

export default function ReconcileTab({ orgId, accounts, entries, balances }: Props) {
  const [txns, setTxns] = useState<BankTxn[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<BankTxn | null>(null);
  const [bankId, setBankId] = useState<string>("");
  const fileRef = useRef<HTMLInputElement>(null);

  const banks = useMemo(() => bankAccounts(accounts), [accounts]);

  const load = useCallback(async () => {
    if (!orgId) { setTxns([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("bank_transactions").select("*").eq("org_id", orgId).order("txn_date", { ascending: false });
    setTxns((data || []) as BankTxn[]);
    setLoading(false);
  }, [orgId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (!bankId && banks.length) setBankId(banks[0].id); }, [banks, bankId]);

  const visible = bankId ? txns.filter((t) => !t.ledger_account_id || t.ledger_account_id === bankId) : txns;
  const ledgerBalance = balances.find((b) => b.account.id === bankId)?.balance ?? 0;
  const summary = summarise(visible, ledgerBalance);

  const setStatus = async (txn: BankTxn, entryId: string | null) => {
    const { error } = await supabase
      .from("bank_transactions")
      .update({ matched_entry_id: entryId, status: entryId ? "matched" : "unmatched" })
      .eq("id", txn.id);
    if (error) return toast.error(error.message);
    load();
  };

  const remove = async (txn: BankTxn) => {
    const { error } = await supabase.from("bank_transactions").delete().eq("id", txn.id);
    if (error) return toast.error(error.message);
    toast.success("Statement line removed");
    load();
  };

  const importCsv = async (file: File) => {
    if (!orgId) return;
    const rows = parseStatementCsv(await file.text());
    if (!rows.length) return toast.error("No usable rows — expected date, description, reference, amount");
    const { error } = await supabase.from("bank_transactions").insert(
      rows.map((r) => ({ ...r, org_id: orgId, ledger_account_id: bankId || null })),
    );
    if (error) return toast.error(error.message);
    toast.success(`${rows.length} statement lines imported`);
    load();
  };

  if (loading) {
    return <div className="flex items-center gap-2 py-10 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading statement…</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-52 space-y-1.5">
          <span className="text-xs text-muted-foreground">Bank / cash account</span>
          <Select value={bankId} onValueChange={setBankId}>
            <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
            <SelectContent>
              {banks.map((a) => <SelectItem key={a.id} value={a.id}>{a.code} · {a.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-wrap gap-2">
          <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) importCsv(f); e.target.value = ""; }} />
          <Button variant="outline" onClick={() => fileRef.current?.click()}>
            <Upload className="mr-2 h-4 w-4" />Import statement
          </Button>
          <Button onClick={() => { setEditing(null); setDialogOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" />Statement line
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { l: "Money in", v: formatMoney(summary.moneyIn) },
          { l: "Money out", v: formatMoney(summary.moneyOut) },
          { l: "Statement balance", v: formatMoney(summary.net) },
          { l: "Difference vs ledger", v: formatMoney(summary.difference) },
        ].map((k) => (
          <Card key={k.l}><CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{k.l}</p>
            <p className={`mt-1 text-xl font-semibold ${k.l.startsWith("Difference") && Math.abs(summary.difference) > 0.005 ? "text-destructive" : ""}`}>{k.v}</p>
          </CardContent></Card>
        ))}
      </div>

      <p className="text-sm text-muted-foreground">
        {summary.matched} matched · {summary.unmatched} still to match ({formatMoney(summary.unmatchedValue)})
      </p>

      {!visible.length && <p className="text-sm text-muted-foreground">No statement lines yet. Import a CSV or add one by hand.</p>}

      {visible.map((t) => {
        const matched = entries.find((e) => e.id === t.matched_entry_id);
        const options = matched ? [] : suggestMatches(t, entries);
        return (
          <Card key={t.id}>
            <CardContent className="space-y-2 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium">{t.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(t.txn_date)}{t.reference ? ` · ${t.reference}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={t.status === "matched" ? "default" : "outline"}>
                    {t.status === "matched" ? "Matched" : "Unmatched"}
                  </Badge>
                  <span className={`font-medium ${Number(t.amount) < 0 ? "text-destructive" : ""}`}>
                    {formatMoney(Number(t.amount))}
                  </span>
                  <Button size="icon" variant="ghost" aria-label="Remove line" onClick={() => remove(t)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {matched ? (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3 text-sm">
                  <span className="text-muted-foreground">#{matched.entry_no} · {matched.memo}</span>
                  <Button size="sm" variant="ghost" onClick={() => setStatus(t, null)}>
                    <Link2Off className="mr-2 h-4 w-4" />Unmatch
                  </Button>
                </div>
              ) : options.length ? (
                <div className="space-y-1.5">
                  {options.map((e) => (
                    <div key={e.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3 text-sm">
                      <span className="text-muted-foreground">
                        #{e.entry_no} · {e.memo} · {formatDate(e.entry_date)} · {formatMoney(e.total)}
                      </span>
                      <Button size="sm" variant="outline" onClick={() => setStatus(t, e.id)}>
                        <Check className="mr-2 h-4 w-4" />Match
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No matching ledger entry found — post one in the Journal tab.</p>
              )}
            </CardContent>
          </Card>
        );
      })}

      <BankTxnDialog
        open={dialogOpen} onOpenChange={setDialogOpen} orgId={orgId}
        bankOptions={banks} txn={editing} onSaved={load}
      />
    </div>
  );
}
