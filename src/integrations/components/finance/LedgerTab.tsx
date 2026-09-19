import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatDate, formatMoney } from "@/lib/crm";
import { useLedger } from "@/hooks/useLedger";
import {
  ACCOUNT_TYPES, ACCOUNT_TYPE_LABELS, attachLines, buildStatements, trialBalance,
  type AccountBalance, type EntryWithLines, type LedgerAccount,
} from "@/lib/ledger";
import JournalEntryDialog from "./JournalEntryDialog";
import LedgerAccountDialog from "./LedgerAccountDialog";
import AutoPostPanel from "./AutoPostPanel";
import ReconcileTab from "./ReconcileTab";
import AgeingTab from "./AgeingTab";


function StatementList({ rows, empty }: { rows: AccountBalance[]; empty: string }) {
  const visible = rows.filter((r) => Math.abs(r.balance) > 0.005);
  if (!visible.length) return <p className="text-sm text-muted-foreground">{empty}</p>;
  return (
    <div className="space-y-1.5 text-sm">
      {visible.map((r) => (
        <div key={r.account.id} className="flex justify-between gap-3">
          <span className="text-muted-foreground">{r.account.code} · {r.account.name}</span>
          <span className="font-medium">{formatMoney(r.balance)}</span>
        </div>
      ))}
    </div>
  );
}

function Total({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className={`mt-3 flex justify-between border-t border-border pt-2 text-sm ${strong ? "font-semibold" : ""}`}>
      <span>{label}</span><span>{formatMoney(value)}</span>
    </div>
  );
}

export default function LedgerTab() {
  const ledger = useLedger();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [entryOpen, setEntryOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<EntryWithLines | null>(null);
  const [deletingEntry, setDeletingEntry] = useState<EntryWithLines | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<LedgerAccount | null>(null);
  const [seeding, setSeeding] = useState(false);

  const entries = useMemo(
    () => attachLines(ledger.entries, ledger.lines, ledger.accounts),
    [ledger.entries, ledger.lines, ledger.accounts],
  );
  const rows = useMemo(
    () => trialBalance(ledger.accounts, ledger.entries, ledger.lines, from || undefined, to || undefined),
    [ledger.accounts, ledger.entries, ledger.lines, from, to],
  );
  const s = useMemo(() => buildStatements(rows), [rows]);

  const seed = async () => {
    if (!ledger.orgId) return;
    setSeeding(true);
    const { data, error } = await supabase.rpc("seed_chart_of_accounts", { _org_id: ledger.orgId });
    setSeeding(false);
    if (error) return toast.error(error.message);
    toast.success(`${data ?? 0} accounts added`);
    ledger.reload();
  };

  const confirmDeleteEntry = async () => {
    if (!deletingEntry) return;
    const { error } = await supabase.from("journal_entries").delete().eq("id", deletingEntry.id);
    setDeletingEntry(null);
    if (error) return toast.error(error.message);
    toast.success("Entry deleted");
    ledger.reload();
  };

  if (ledger.loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading ledger…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="led-from" className="text-xs">From</Label>
            <Input id="led-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="led-to" className="text-xs">To</Label>
            <Input id="led-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
          </div>
          {(from || to) && <Button variant="ghost" size="sm" onClick={() => { setFrom(""); setTo(""); }}>Clear</Button>}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => { setEditingAccount(null); setAccountOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" />Account
          </Button>
          <Button disabled={!ledger.accounts.length} onClick={() => { setEditingEntry(null); setEntryOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" />Journal entry
          </Button>
        </div>
      </div>

      {!ledger.accounts.length && (
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="font-medium">Start your chart of accounts</p>
              <p className="text-sm text-muted-foreground">Install a standard set of asset, liability, equity, income and expense accounts.</p>
            </div>
            <Button onClick={seed} disabled={seeding}>
              <Sparkles className="mr-2 h-4 w-4" />{seeding ? "Installing…" : "Install standard accounts"}
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { l: "Income", v: s.totalIncome },
          { l: "Expenses", v: s.totalExpenses },
          { l: "Net profit", v: s.netProfit },
          { l: "Assets", v: s.totalAssets },
        ].map((k) => (
          <Card key={k.l}><CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{k.l}</p>
            <p className={`mt-1 text-xl font-semibold ${k.l === "Net profit" && k.v < 0 ? "text-destructive" : ""}`}>{formatMoney(k.v)}</p>
          </CardContent></Card>
        ))}
      </div>

      <Tabs defaultValue="journal">
        <TabsList className="flex w-full flex-wrap justify-start">
          <TabsTrigger value="journal">Journal</TabsTrigger>
          <TabsTrigger value="accounts">Chart of accounts</TabsTrigger>
          <TabsTrigger value="autopost">Post records</TabsTrigger>
          <TabsTrigger value="reconcile">Reconciliation</TabsTrigger>
          <TabsTrigger value="ageing">Ageing</TabsTrigger>
          <TabsTrigger value="trial">Trial balance</TabsTrigger>
          <TabsTrigger value="statements">Statements</TabsTrigger>
        </TabsList>

        <TabsContent value="autopost" className="mt-4">
          <AutoPostPanel orgId={ledger.orgId ?? null} accounts={ledger.accounts} entries={ledger.entries} onPosted={ledger.reload} />
        </TabsContent>

        <TabsContent value="ageing" className="mt-4">
          <AgeingTab />
        </TabsContent>

        <TabsContent value="reconcile" className="mt-4">
          <ReconcileTab orgId={ledger.orgId ?? null} accounts={ledger.accounts} entries={entries} balances={rows} />
        </TabsContent>


        <TabsContent value="journal" className="mt-4 space-y-2">
          {!entries.length && <p className="text-sm text-muted-foreground">No journal entries posted yet.</p>}
          {entries.map((e) => (
            <Card key={e.id}>
              <CardContent className="space-y-2 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium">#{e.entry_no} · {e.memo}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(e.entry_date)}{e.reference ? ` · ${e.reference}` : ""} · {e.source}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {!e.balanced && <Badge variant="destructive">Unbalanced</Badge>}
                    <span className="font-medium">{formatMoney(e.total)}</span>
                    <Button size="icon" variant="ghost" aria-label="Edit entry" onClick={() => { setEditingEntry(e); setEntryOpen(true); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" aria-label="Delete entry" onClick={() => setDeletingEntry(e)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-1 rounded-lg border border-border p-3 text-sm">
                  {e.lines.map((l) => (
                    <div key={l.id} className="grid grid-cols-[1fr_auto_auto] gap-3">
                      <span className="truncate text-muted-foreground">
                        {l.account ? `${l.account.code} · ${l.account.name}` : "Unknown account"}
                        {l.description ? ` — ${l.description}` : ""}
                      </span>
                      <span className="w-24 text-right">{Number(l.debit) ? formatMoney(Number(l.debit)) : ""}</span>
                      <span className="w-24 text-right">{Number(l.credit) ? formatMoney(Number(l.credit)) : ""}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="accounts" className="mt-4 space-y-4">
          {ACCOUNT_TYPES.map((t) => {
            const list = ledger.accounts.filter((a) => a.type === t);
            if (!list.length) return null;
            return (
              <Card key={t}>
                <CardHeader className="pb-2"><CardTitle className="text-base">{ACCOUNT_TYPE_LABELS[t]}</CardTitle></CardHeader>
                <CardContent className="space-y-1.5">
                  {list.map((a) => (
                    <div key={a.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-2.5 text-sm">
                      <span className="truncate">
                        <span className="font-mono text-muted-foreground">{a.code}</span> · {a.name}
                        {!a.is_active && <Badge variant="outline" className="ml-2">Inactive</Badge>}
                      </span>
                      <Button size="icon" variant="ghost" aria-label="Edit account"
                        onClick={() => { setEditingAccount(a); setAccountOpen(true); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="trial" className="mt-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Trial balance</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-[1fr_auto_auto] gap-3 border-b border-border pb-2 text-xs uppercase tracking-wide text-muted-foreground">
                <span>Account</span><span className="w-24 text-right">Debit</span><span className="w-24 text-right">Credit</span>
              </div>
              {rows.filter((r) => r.debit || r.credit).map((r) => (
                <div key={r.account.id} className="grid grid-cols-[1fr_auto_auto] gap-3 py-1.5 text-sm">
                  <span className="truncate text-muted-foreground">{r.account.code} · {r.account.name}</span>
                  <span className="w-24 text-right">{r.debit ? formatMoney(r.debit) : ""}</span>
                  <span className="w-24 text-right">{r.credit ? formatMoney(r.credit) : ""}</span>
                </div>
              ))}
              <div className="mt-2 grid grid-cols-[1fr_auto_auto] gap-3 border-t border-border pt-2 text-sm font-semibold">
                <span>Total {s.balanced ? "" : "(out of balance)"}</span>
                <span className="w-24 text-right">{formatMoney(s.totalDebits)}</span>
                <span className="w-24 text-right">{formatMoney(s.totalCredits)}</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="statements" className="mt-4 grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Profit &amp; loss</CardTitle></CardHeader>
            <CardContent>
              <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">Income</p>
              <StatementList rows={s.income} empty="No income posted." />
              <Total label="Total income" value={s.totalIncome} />
              <p className="mb-1 mt-4 text-xs uppercase tracking-wide text-muted-foreground">Expenses</p>
              <StatementList rows={s.expenses} empty="No expenses posted." />
              <Total label="Total expenses" value={s.totalExpenses} />
              <Total label="Net profit" value={s.netProfit} strong />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Balance sheet</CardTitle></CardHeader>
            <CardContent>
              <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">Assets</p>
              <StatementList rows={s.assets} empty="No assets posted." />
              <Total label="Total assets" value={s.totalAssets} />
              <p className="mb-1 mt-4 text-xs uppercase tracking-wide text-muted-foreground">Liabilities</p>
              <StatementList rows={s.liabilities} empty="No liabilities posted." />
              <Total label="Total liabilities" value={s.totalLiabilities} />
              <p className="mb-1 mt-4 text-xs uppercase tracking-wide text-muted-foreground">Equity</p>
              <StatementList rows={s.equity} empty="No equity posted." />
              <Total label="Equity + retained profit" value={s.totalEquity + s.netProfit} strong />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <JournalEntryDialog
        open={entryOpen} onOpenChange={setEntryOpen} orgId={ledger.orgId ?? null}
        accounts={ledger.accounts} entry={editingEntry} onSaved={ledger.reload}
      />
      <LedgerAccountDialog
        open={accountOpen} onOpenChange={setAccountOpen} orgId={ledger.orgId ?? null}
        accounts={ledger.accounts} account={editingAccount} onSaved={ledger.reload}
      />

      <AlertDialog open={!!deletingEntry} onOpenChange={(o) => !o && setDeletingEntry(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this journal entry?</AlertDialogTitle>
            <AlertDialogDescription>
              Entry #{deletingEntry?.entry_no} and its lines will be removed permanently.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteEntry}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
