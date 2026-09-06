import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ExternalLink, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { formatDate, formatMoney } from "@/lib/crm";
import { useFinance } from "@/hooks/useFinance";
import {
  computeTotals, EXPENSE_CATEGORY_LABELS, externalReceiptsWithoutPayment, monthlyRevenue, sum,
  type Expense, type ExternalDoc, type FinanceDoc,
} from "@/lib/finance";
import ExpenseDialog from "@/components/finance/ExpenseDialog";
import ExternalDocDialog from "@/components/finance/ExternalDocDialog";
import WorkedExamples from "@/components/finance/WorkedExamples";
import LedgerTab from "@/components/finance/LedgerTab";


function Kpi({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: "positive" | "negative" }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className={`mt-1 text-xl font-semibold ${tone === "negative" ? "text-destructive" : ""}`}>{value}</p>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function DocRow({ doc, onEdit, onDelete }: { doc: FinanceDoc; onEdit?: () => void; onDelete?: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm">
      <div className="min-w-0">
        <p className="truncate font-medium">{doc.reference}</p>
        <p className="truncate text-xs text-muted-foreground">
          {doc.jobId
            ? <Link to={`/jobs/${doc.jobId}`} className="hover:underline">{doc.jobNumber}</Link>
            : <span>Unlinked</span>}
          {" · "}{doc.clientName}
          {doc.dueDate ? ` · due ${formatDate(doc.dueDate)}` : doc.syncedAt ? ` · synced ${formatDate(doc.syncedAt)}` : ""}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {doc.isExample && <Badge variant="secondary">Example</Badge>}
        {doc.source && doc.source !== "stage" && <Badge variant="outline" className="capitalize">{doc.source}</Badge>}
        <span className="font-medium">{formatMoney(doc.amount)}</span>
        {doc.documentUrl && (
          <a href={doc.documentUrl} target="_blank" rel="noreferrer" aria-label="Open document" className="text-accent">
            <ExternalLink className="h-4 w-4" />
          </a>
        )}
        {onEdit && <Button size="icon" variant="ghost" aria-label="Edit document" onClick={onEdit}><Pencil className="h-4 w-4" /></Button>}
        {onDelete && <Button size="icon" variant="ghost" aria-label="Delete document" onClick={onDelete}><Trash2 className="h-4 w-4" /></Button>}
      </div>
    </div>
  );
}

export default function Finance() {
  const fin = useFinance();
  const [search, setSearch] = useState("");
  const [showExamples, setShowExamples] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [deleting, setDeleting] = useState<Expense | null>(null);
  const [docDialogOpen, setDocDialogOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<ExternalDoc | null>(null);
  const [presetDoc, setPresetDoc] = useState<Partial<ExternalDoc> | null>(null);
  const [deletingDoc, setDeletingDoc] = useState<ExternalDoc | null>(null);

  const trend = useMemo(() => monthlyRevenue(fin.payments, fin.expenses), [fin.payments, fin.expenses]);
  const peak = Math.max(1, ...trend.map((t) => Math.max(t.received, t.spent)));
  const jobNumber = (id: string | null) => fin.jobs.find((j) => j.id === id)?.job_number;

  const q = search.trim().toLowerCase();
  const match = (...parts: (string | null | undefined)[]) =>
    !q || parts.some((p) => (p || "").toLowerCase().includes(q));

  const visible = (isExample?: boolean | null) => showExamples || !isExample;
  const allQuotes = fin.quotes.filter((d) => visible(d.isExample));
  const allInvoices = fin.invoices.filter((d) => visible(d.isExample));
  const allReceipts = fin.receipts.filter((r) => visible(r.is_example));
  const exampleCount = fin.externalDocs.filter((d) => d.is_example).length;

  const quotes = allQuotes.filter((d) => match(d.reference, d.jobNumber, d.clientName));
  const invoices = allInvoices.filter((d) => match(d.reference, d.jobNumber, d.clientName));
  const payments = fin.payments.filter((p) => match(p.reference, p.payment_type, jobNumber(p.job_id)));
  const expenses = fin.expenses.filter((e) => match(e.description, e.vendor, e.category, jobNumber(e.job_id)));
  const receipts = externalReceiptsWithoutPayment(allReceipts, fin.payments)
    .filter((r) => match(r.reference, r.client_name, jobNumber(r.job_id)));
  const findDoc = (id?: string) => fin.externalDocs.find((d) => d.id === id) || null;
  const openDoc = (d: ExternalDoc | null) => { setEditingDoc(d); setPresetDoc(null); setDocDialogOpen(true); };
  const openPreset = (p: Partial<ExternalDoc>) => { setEditingDoc(null); setPresetDoc(p); setDocDialogOpen(true); };
  const docActions = (doc: FinanceDoc) =>
    doc.externalDocId
      ? {
          onEdit: () => openDoc(findDoc(doc.externalDocId)),
          onDelete: () => setDeletingDoc(findDoc(doc.externalDocId)),
        }
      : {};

  const openNew = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (e: Expense) => { setEditing(e); setDialogOpen(true); };

  const confirmDelete = async () => {
    if (!deleting) return;
    const { error } = await supabase.from("expenses").delete().eq("id", deleting.id);
    setDeleting(null);
    if (error) return toast.error(error.message);
    toast.success("Expense deleted");
    fin.reload();
  };

  const confirmDeleteDoc = async () => {
    if (!deletingDoc) return;
    const { error } = await supabase.from("finance_documents").delete().eq("id", deletingDoc.id);
    setDeletingDoc(null);
    if (error) return toast.error(error.message);
    toast.success("Document deleted");
    fin.reload();
  };

  const t = showExamples
    ? fin.totals
    : computeTotals({
        quotes: allQuotes,
        invoices: allInvoices,
        payments: fin.payments,
        variations: fin.variations,
        expenses: fin.expenses,
        receipts: allReceipts,
      });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold">Finance</h1>
          <p className="text-sm text-muted-foreground">
            Deal → quote → work → invoice → payment, with costs tracked against the same records.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-lg border border-border px-3 py-2">
            <Switch id="show-examples" checked={showExamples} onCheckedChange={setShowExamples} />
            <Label htmlFor="show-examples" className="cursor-pointer whitespace-nowrap text-xs">
              Examples{exampleCount ? ` (${exampleCount})` : ""}
            </Label>
          </div>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search reference, job, client…"
            className="w-48 sm:w-64"
          />
          <Button variant="outline" onClick={() => openDoc(null)}><Plus className="mr-2 h-4 w-4" />Document</Button>
          <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" />Expense</Button>
        </div>
      </div>

      {fin.loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading finance records…
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <Kpi label="Quoted" value={formatMoney(t.quoted)} hint={`${fin.quotes.length} quote${fin.quotes.length === 1 ? "" : "s"} synced`} />
            <Kpi label="Invoiced" value={formatMoney(t.invoiced)} hint={`${fin.invoices.length} invoice${fin.invoices.length === 1 ? "" : "s"}`} />
            <Kpi label="Received" value={formatMoney(t.received)} hint={`${fin.payments.length} payment${fin.payments.length === 1 ? "" : "s"}`} />
            <Kpi label="Outstanding" value={formatMoney(t.outstanding)} tone={t.outstanding > 0 ? "negative" : undefined} hint="Invoiced less received" />
            <Kpi label="Net revenue" value={formatMoney(t.netRevenue)} tone={t.netRevenue < 0 ? "negative" : undefined} hint={`Costs ${formatMoney(t.expenses)}`} />
          </div>

          <Tabs defaultValue="overview">
            <TabsList className="flex w-full flex-wrap justify-start">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="quotes">Quotes</TabsTrigger>
              <TabsTrigger value="invoices">Invoices</TabsTrigger>
              <TabsTrigger value="payments">Payments</TabsTrigger>
              <TabsTrigger value="expenses">Expenses</TabsTrigger>
              <TabsTrigger value="accounting">Accounting</TabsTrigger>
              <TabsTrigger value="examples">Examples</TabsTrigger>

            </TabsList>

            <TabsContent value="overview" className="mt-4 grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader><CardTitle className="text-base">Revenue vs costs (6 months)</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex h-44 items-end gap-3">
                    {trend.map((m) => (
                      <div key={m.key} className="flex flex-1 flex-col items-center gap-1">
                        <div className="flex h-36 w-full items-end justify-center gap-1">
                          <div className="w-1/3 rounded-t bg-primary" style={{ height: `${(m.received / peak) * 100}%` }} title={`Received ${formatMoney(m.received)}`} />
                          <div className="w-1/3 rounded-t bg-muted-foreground/40" style={{ height: `${(m.spent / peak) * 100}%` }} title={`Costs ${formatMoney(m.spent)}`} />
                        </div>
                        <span className="text-xs text-muted-foreground">{m.label}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-primary" /> Received</span>
                    <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-muted-foreground/40" /> Costs</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Value pipeline</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {[
                    { l: "Won deals", v: sum(fin.deals.filter((d) => d.status === "won").map((d) => d.value)) },
                    { l: "Quoted", v: t.quoted },
                    { l: "Approved variations", v: t.approvedVariations },
                    { l: "Invoiced", v: t.invoiced },
                    { l: "Received", v: t.received },
                  ].map((r) => (
                    <div key={r.l} className="flex items-center justify-between rounded-lg border border-border p-3">
                      <span>{r.l}</span>
                      <span className="font-medium">{formatMoney(r.v)}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="quotes" className="mt-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base">Quotes</CardTitle>
                  <Button size="sm" variant="outline" onClick={() => openDoc(null)}><Plus className="mr-2 h-4 w-4" />Record</Button>
                </CardHeader>
                <CardContent className="space-y-2">
                  {quotes.length
                    ? quotes.map((d) => <DocRow key={d.externalDocId || `${d.jobId}-${d.reference}`} doc={d} {...docActions(d)} />)
                    : <p className="text-sm text-muted-foreground">No quotes yet. Record one from your document builder to keep totals accurate.</p>}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="invoices" className="mt-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base">Invoices</CardTitle>
                  <Button size="sm" variant="outline" onClick={() => openDoc(null)}><Plus className="mr-2 h-4 w-4" />Record</Button>
                </CardHeader>
                <CardContent className="space-y-2">
                  {invoices.length
                    ? invoices.map((d) => <DocRow key={d.externalDocId || `${d.jobId}-${d.reference}`} doc={d} {...docActions(d)} />)
                    : <p className="text-sm text-muted-foreground">No invoices yet. Record one from your document builder to keep totals accurate.</p>}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="payments" className="mt-4">
              <Card>
                <CardHeader><CardTitle className="text-base">Payments received</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {payments.length ? payments.map((p) => (
                    <div key={p.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm">
                      <div className="min-w-0">
                        <p className="font-medium capitalize">{p.payment_type}{p.reference ? ` · ${p.reference}` : ""}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          <Link to={`/jobs/${p.job_id}`} className="hover:underline">{jobNumber(p.job_id) || "Job"}</Link>
                          {` · ${formatDate(p.paid_at)}${p.method ? ` · ${p.method}` : ""}`}
                        </p>
                      </div>
                      <span className="shrink-0 font-medium">{formatMoney(Number(p.amount))}</span>
                    </div>
                  )) : null}

                  {receipts.map((r) => (
                    <div key={r.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm">
                      <div className="min-w-0">
                        <p className="truncate font-medium">Receipt · {r.reference}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {r.client_name || "—"} · {formatDate(r.issued_at)}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Badge variant="outline" className="capitalize">{r.source}</Badge>
                        <span className="font-medium">{formatMoney(Number(r.amount))}</span>
                        <Button size="icon" variant="ghost" aria-label="Edit receipt" onClick={() => openDoc(r)}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" aria-label="Delete receipt" onClick={() => setDeletingDoc(r)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  ))}

                  {!payments.length && !receipts.length && (
                    <p className="text-sm text-muted-foreground">No payments recorded. Capture them on a job, or record a receipt from your document builder.</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="expenses" className="mt-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base">Expenses</CardTitle>
                  <Button size="sm" variant="outline" onClick={openNew}><Plus className="mr-2 h-4 w-4" />Add</Button>
                </CardHeader>
                <CardContent className="space-y-2">
                  {expenses.length ? expenses.map((e) => (
                    <div key={e.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{e.description}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {EXPENSE_CATEGORY_LABELS[e.category] || e.category} · {formatDate(e.spent_at)}
                          {e.vendor ? ` · ${e.vendor}` : ""}
                          {e.job_id ? " · " : ""}
                          {e.job_id && <Link to={`/jobs/${e.job_id}`} className="hover:underline">{jobNumber(e.job_id)}</Link>}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {e.billable && <Badge variant="outline">Billable</Badge>}
                        <span className="font-medium">{formatMoney(Number(e.amount))}</span>
                        <Button size="icon" variant="ghost" aria-label="Edit expense" onClick={() => openEdit(e)}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" aria-label="Delete expense" onClick={() => setDeleting(e)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  )) : <p className="text-sm text-muted-foreground">No expenses recorded yet.</p>}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="examples" className="mt-4">
              <WorkedExamples
                accounts={fin.accounts}
                jobs={fin.jobs}
                docs={fin.externalDocs}
                onFill={openPreset}
                onEdit={(d) => openDoc(d)}
              />
            </TabsContent>

            <TabsContent value="accounting" className="mt-4">
              <LedgerTab />
            </TabsContent>
          </Tabs>

        </>
      )}

      <ExpenseDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        expense={editing}
        jobs={fin.jobs}
        accounts={fin.accounts}
        deals={fin.deals}
        onSaved={fin.reload}
      />

      <ExternalDocDialog
        open={docDialogOpen}
        onOpenChange={setDocDialogOpen}
        doc={editingDoc}
        preset={presetDoc}
        jobs={fin.jobs}
        accounts={fin.accounts}
        deals={fin.deals}
        onSaved={fin.reload}
      />

      <AlertDialog open={!!deletingDoc} onOpenChange={(v) => !v && setDeletingDoc(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this document?</AlertDialogTitle>
            <AlertDialogDescription>{deletingDoc?.reference} — this cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteDoc}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleting} onOpenChange={(v) => !v && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this expense?</AlertDialogTitle>
            <AlertDialogDescription>{deleting?.description} — this cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
