import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronDown, ChevronRight, ExternalLink, Loader2 } from "lucide-react";
import { formatDate, formatMoney } from "@/lib/crm";
import { useFinance } from "@/hooks/useFinance";
import { useLedger } from "@/hooks/useLedger";
import { attachLines, type EntryWithLines } from "@/lib/ledger";
import AgeingItemDialog from "./AgeingItemDialog";
import {
  AGEING_BUCKETS, payablesAgeing, receivablesAgeing,
  type AgeingReport, type AgeingRow, type BucketKey, type OpenItem,
} from "@/lib/ageing";

function BucketCards({ report }: { report: AgeingReport }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {AGEING_BUCKETS.map((b) => {
        const value = report.buckets[b.key];
        const late = b.key !== "current" && value > 0.005;
        return (
          <Card key={b.key}>
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{b.label}</p>
              <p className={`mt-1 text-lg font-semibold ${late ? "text-destructive" : ""}`}>{formatMoney(value)}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function PartyRow({ row, kind, onOpenItem }: { row: AgeingRow; kind: "ar" | "ap"; onOpenItem: (item: OpenItem) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Card>
      <CardContent className="p-0">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-3 p-4 text-left"
          aria-expanded={open}
        >
          <div className="flex min-w-0 items-center gap-2">
            {open ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
            <div className="min-w-0">
              <p className="truncate font-medium">{row.party}</p>
              <p className="text-xs text-muted-foreground">
                {row.items.length} open item{row.items.length === 1 ? "" : "s"}
                {row.oldestDays > 0 ? ` · oldest ${row.oldestDays} days late` : " · nothing overdue"}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {row.overdue > 0.005 && <Badge variant="destructive">{formatMoney(row.overdue)} overdue</Badge>}
            <span className="font-semibold">{formatMoney(row.total)}</span>
          </div>
        </button>

        {open && (
          <div className="space-y-2 border-t border-border p-4">
            <div className="grid gap-2 sm:grid-cols-5">
              {AGEING_BUCKETS.map((b) => (
                <div key={b.key} className="rounded-md border border-border p-2 text-center">
                  <p className="text-[11px] uppercase text-muted-foreground">{b.label}</p>
                  <p className="text-sm font-medium">{formatMoney(row.buckets[b.key as BucketKey])}</p>
                </div>
              ))}
            </div>

            {row.items.map((it) => (
              <div key={it.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm">
                <button type="button" onClick={() => onOpenItem(it)} className="min-w-0 flex-1 text-left hover:underline">
                  <p className="truncate font-medium">{it.reference}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {it.jobId
                      ? <Link to={`/jobs/${it.jobId}`} className="hover:underline">{it.jobNumber || "Job"}</Link>
                      : <span>{kind === "ap" ? "No job" : "Unlinked"}</span>}
                    {it.issuedAt ? ` · dated ${formatDate(it.issuedAt)}` : ""}
                    {it.dueDate ? ` · due ${formatDate(it.dueDate)}` : ""}
                    {it.paid > 0.005 ? ` · ${formatMoney(it.paid)} applied` : ""}
                    {it.applications.length ? ` · ${it.applications.length} application${it.applications.length === 1 ? "" : "s"}` : ""}
                  </p>
                </button>
                <div className="flex shrink-0 items-center gap-3">
                  <Badge variant={it.daysOverdue > 0 ? "destructive" : "secondary"}>
                    {it.daysOverdue > 0 ? `${it.daysOverdue} days late` : "Current"}
                  </Badge>
                  <span className="font-medium">{formatMoney(it.outstanding)}</span>
                  {it.documentUrl && (
                    <a href={it.documentUrl} target="_blank" rel="noreferrer" aria-label="Open document" className="text-accent">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ReportView({ report, kind, empty, onOpenItem }: {
  report: AgeingReport; kind: "ar" | "ap"; empty: string; onOpenItem: (item: OpenItem) => void;
}) {
  const [search, setSearch] = useState("");
  const q = search.trim().toLowerCase();
  const rows = q ? report.rows.filter((r) => r.party.toLowerCase().includes(q)) : report.rows;

  return (
    <div className="space-y-4">
      <BucketCards report={report} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={kind === "ar" ? "Search client" : "Search supplier"}
          className="w-full sm:w-64"
        />
        <div className="text-sm text-muted-foreground">
          Total outstanding <span className="font-semibold text-foreground">{formatMoney(report.total)}</span>
          {report.overdue > 0.005 && <> · overdue <span className="font-semibold text-destructive">{formatMoney(report.overdue)}</span></>}
        </div>
      </div>

      {!rows.length && <p className="text-sm text-muted-foreground">{empty}</p>}
      <div className="space-y-2">
        {rows.map((r) => <PartyRow key={r.party} row={r} kind={kind} onOpenItem={onOpenItem} />)}
      </div>
    </div>
  );
}

export default function AgeingTab() {
  const fin = useFinance();
  const ledger = useLedger();
  const [item, setItem] = useState<OpenItem | null>(null);

  const entries: EntryWithLines[] = useMemo(
    () => attachLines(ledger.entries, ledger.lines, ledger.accounts),
    [ledger.entries, ledger.lines, ledger.accounts],
  );

  const jobNumber = useMemo(
    () => (id: string | null) => fin.jobs.find((j) => j.id === id)?.job_number,
    [fin.jobs],
  );
  const ar = useMemo(
    () => receivablesAgeing(fin.invoices, fin.payments, fin.creditNotes),
    [fin.invoices, fin.payments, fin.creditNotes],
  );
  const ap = useMemo(
    () => payablesAgeing(fin.expenses, jobNumber, fin.supplierCredits),
    [fin.expenses, jobNumber, fin.supplierCredits],
  );

  if (fin.loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading ageing…
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Ageing</CardTitle>
        <p className="text-sm text-muted-foreground">
          Money owed to you and money you owe, grouped into 30-day buckets. Invoices without a due date use 30-day terms;
          costs count as unpaid until a payment method is recorded against them.
        </p>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="ar">
          <TabsList>
            <TabsTrigger value="ar">Customers (owed to you)</TabsTrigger>
            <TabsTrigger value="ap">Suppliers (you owe)</TabsTrigger>
          </TabsList>
          <TabsContent value="ar" className="mt-4">
            <ReportView report={ar} kind="ar" empty="No unpaid client invoices." onOpenItem={setItem} />
          </TabsContent>
          <TabsContent value="ap" className="mt-4">
            <ReportView report={ap} kind="ap" empty="No unpaid supplier costs." onOpenItem={setItem} />
          </TabsContent>
        </Tabs>
        <AgeingItemDialog item={item} entries={entries} onOpenChange={(o) => !o && setItem(null)} />
      </CardContent>
    </Card>
  );
}
