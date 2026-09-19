import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ExternalLink } from "lucide-react";
import { formatDate, formatMoney } from "@/lib/crm";
import { relatedSourceRefs, type OpenItem } from "@/lib/ageing";
import type { EntryWithLines } from "@/lib/ledger";

const KIND_LABEL: Record<OpenItem["kind"], string> = {
  invoice: "Invoice",
  credit_note: "Credit note",
  bill: "Supplier cost",
  supplier_credit: "Supplier credit",
};

const APP_LABEL = { payment: "Payment", credit: "Credit note", refund: "Refund" } as const;

interface Props {
  item: OpenItem | null;
  entries: EntryWithLines[];
  onOpenChange: (open: boolean) => void;
}

export default function AgeingItemDialog({ item, entries, onOpenChange }: Props) {
  const related = useMemo(() => {
    if (!item) return [];
    const refs = new Set(relatedSourceRefs(item));
    const ref = item.reference.trim().toLowerCase();
    return entries.filter((e) => {
      const sourceRef = (e as EntryWithLines & { source_ref?: string | null }).source_ref;
      if (sourceRef && refs.has(sourceRef)) return true;
      if (!ref) return false;
      return (e.reference || "").trim().toLowerCase() === ref || (e.memo || "").toLowerCase().includes(ref);
    });
  }, [item, entries]);

  if (!item) return null;

  const unposted = !related.some((e) => {
    const sourceRef = (e as EntryWithLines & { source_ref?: string | null }).source_ref;
    return sourceRef === item.sourceRef;
  });

  return (
    <Dialog open={!!item} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            {KIND_LABEL[item.kind]} {item.reference}
            <Badge variant={item.daysOverdue > 0 ? "destructive" : "secondary"}>
              {item.daysOverdue > 0 ? `${item.daysOverdue} days late` : "Current"}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            {item.party}
            {item.jobId && <> · <Link to={`/jobs/${item.jobId}`} className="underline">{item.jobNumber || "Open job"}</Link></>}
            {item.issuedAt ? ` · dated ${formatDate(item.issuedAt)}` : ""}
            {item.dueDate ? ` · due ${formatDate(item.dueDate)}` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { l: "Document total", v: item.amount },
            { l: item.kind === "credit_note" || item.kind === "supplier_credit" ? "Applied" : "Settled", v: item.paid },
            { l: "Still open", v: item.outstanding },
          ].map((k) => (
            <div key={k.l} className="rounded-lg border border-border p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{k.l}</p>
              <p className="mt-1 text-lg font-semibold">{formatMoney(k.v)}</p>
            </div>
          ))}
        </div>

        {item.documentUrl && (
          <a
            href={item.documentUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-sm text-accent hover:underline"
          >
            <ExternalLink className="h-4 w-4" /> Open the document
          </a>
        )}

        <Separator />

        <section className="space-y-2">
          <h3 className="text-sm font-semibold">Applied against this item</h3>
          {!item.applications.length && (
            <p className="text-sm text-muted-foreground">Nothing applied yet — the full amount is still open.</p>
          )}
          {item.applications.map((a) => (
            <div key={`${a.sourceRef}-${a.amount}`} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm">
              <div className="min-w-0">
                <p className="truncate font-medium">
                  {APP_LABEL[a.kind]}{a.reference ? ` · ${a.reference}` : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  {a.date ? formatDate(a.date) : "No date"}
                  {a.method ? ` · ${a.method}` : ""}
                  {Math.abs(a.sourceAmount - a.amount) > 0.005
                    ? ` · part of ${formatMoney(a.sourceAmount)}`
                    : ""}
                </p>
              </div>
              <span className="font-medium">{formatMoney(a.amount)}</span>
            </div>
          ))}
        </section>

        <Separator />

        <section className="space-y-2">
          <h3 className="text-sm font-semibold">Journal entries</h3>
          {unposted && (
            <p className="text-sm text-muted-foreground">
              This document has not been posted to the ledger yet — use “Post records” in Accounting.
            </p>
          )}
          {!related.length && <p className="text-sm text-muted-foreground">No ledger entries reference this item.</p>}
          {related.map((e) => (
            <div key={e.id} className="rounded-lg border border-border p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-medium">#{e.entry_no} · {e.memo}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(e.entry_date)}
                    {e.reference ? ` · ${e.reference}` : ""} · {e.source}
                  </p>
                </div>
                <span className="font-medium">{formatMoney(e.total)}</span>
              </div>
              <div className="mt-2 space-y-1">
                {e.lines.map((l) => (
                  <div key={l.id} className="flex justify-between gap-3 text-xs text-muted-foreground">
                    <span className="truncate">
                      {l.account ? `${l.account.code} · ${l.account.name}` : "Unknown account"}
                      {l.description ? ` — ${l.description}` : ""}
                    </span>
                    <span className="shrink-0 font-medium text-foreground">
                      {Number(l.debit) > 0 ? `Dr ${formatMoney(Number(l.debit))}` : `Cr ${formatMoney(Number(l.credit))}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      </DialogContent>
    </Dialog>
  );
}
