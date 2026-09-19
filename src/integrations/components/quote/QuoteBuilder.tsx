import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowDown, ArrowUp, Copy, Percent, Plus, Tag, Trash2, Type, X,
} from "lucide-react";
import {
  CURRENCIES, TAX_LABELS, amountInWords, currencyFor, emptyLine, formatAmount,
  lineTotals, quoteTotals, type QuoteDoc, type QuoteLine,
} from "@/lib/quote";

interface Props {
  doc: QuoteDoc;
  onChange: (doc: QuoteDoc) => void;
  readOnly?: boolean;
}

export default function QuoteBuilder({ doc, onChange, readOnly }: Props) {
  const [openDesc, setOpenDesc] = useState<Record<string, boolean>>({});
  const [showTaxSetup, setShowTaxSetup] = useState(false);
  const cur = currencyFor(doc.currency);
  const totals = useMemo(() => quoteTotals(doc), [doc]);
  const money = (n: number) => formatAmount(n, doc.currency);

  const patch = (u: Partial<QuoteDoc>) => onChange({ ...doc, ...u });
  const setLines = (lines: QuoteLine[]) => patch({ lines });
  const update = (id: string, u: Partial<QuoteLine>) =>
    setLines(doc.lines.map((l) => (l.id === id ? { ...l, ...u } : l)));

  const move = (index: number, dir: -1 | 1) => {
    const next = [...doc.lines];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setLines(next);
  };

  const duplicate = (line: QuoteLine) => {
    const i = doc.lines.findIndex((l) => l.id === line.id);
    const copy = { ...line, id: crypto.randomUUID() };
    const next = [...doc.lines];
    next.splice(i + 1, 0, copy);
    setLines(next);
  };

  return (
    <div className="space-y-4">
      {/* Currency + tax setup ------------------------------------------- */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Currency</Label>
          <Select value={cur.code} disabled={readOnly} onValueChange={(v) => patch({ currency: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent className="max-h-72">
              {CURRENCIES.map((c) => <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Tax name</Label>
          <Select value={doc.tax_label || "VAT"} disabled={readOnly} onValueChange={(v) => patch({ tax_label: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {TAX_LABELS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end">
          <Button type="button" variant="outline" className="w-full gap-2" disabled={readOnly}
            onClick={() => setShowTaxSetup((s) => !s)}>
            <Percent className="h-4 w-4" /> Configure {doc.tax_label || "VAT"}
          </Button>
        </div>
      </div>

      {showTaxSetup && !readOnly && (
        <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Default rate %</Label>
              <Input
                type="number" min={0} step="0.1" className="w-28"
                value={doc.default_tax_rate ?? 0}
                onChange={(e) => patch({ default_tax_rate: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[0, 5, 12, 14, 15, 16, 20].map((p) => (
                <Button key={p} type="button" size="sm"
                  variant={(doc.default_tax_rate ?? 0) === p ? "default" : "outline"}
                  className="h-8 px-2 text-xs"
                  onClick={() => patch({ default_tax_rate: p })}>{p}%</Button>
              ))}
            </div>
            <Button type="button" size="sm" variant="secondary"
              onClick={() => setLines(doc.lines.map((l) => ({ ...l, tax_rate: doc.default_tax_rate ?? 0 })))}>
              Apply to all lines
            </Button>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={!!doc.tax_inclusive} onCheckedChange={(c) => patch({ tax_inclusive: !!c })} />
            Rates already include {doc.tax_label || "VAT"}
          </label>
        </div>
      )}

      {/* Line items ------------------------------------------------------ */}
      <div className="overflow-hidden rounded-lg border border-border">
        <div className="hidden grid-cols-[1fr,90px,110px,110px,110px,110px,40px] gap-2 bg-primary px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-primary-foreground md:grid">
          <span>Item</span>
          <span className="text-right">{doc.tax_label || "VAT"} %</span>
          <span className="text-right">Quantity</span>
          <span className="text-right">Rate</span>
          <span className="text-right">Amount</span>
          <span className="text-right">Total</span>
          <span />
        </div>

        {doc.lines.length === 0 && (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">
            No items yet.{!readOnly && " Add your first line below."}
          </p>
        )}

        {doc.lines.map((line, index) => {
          const t = lineTotals(line, !!doc.tax_inclusive);
          return (
            <div key={line.id} className="border-t border-border first:border-t-0">
              <div className="flex items-center justify-between bg-muted/40 px-3 py-1.5">
                <span className="text-xs font-semibold text-muted-foreground">{index + 1}.</span>
                {!readOnly && (
                  <div className="flex items-center gap-1">
                    <Button type="button" size="icon" variant="ghost" className="h-7 w-7"
                      onClick={() => move(index, -1)} aria-label="Move up"><ArrowUp className="h-3.5 w-3.5" /></Button>
                    <Button type="button" size="icon" variant="ghost" className="h-7 w-7"
                      onClick={() => move(index, 1)} aria-label="Move down"><ArrowDown className="h-3.5 w-3.5" /></Button>
                    <Button type="button" size="icon" variant="ghost" className="h-7 w-7"
                      onClick={() => duplicate(line)} aria-label="Duplicate line"><Copy className="h-3.5 w-3.5" /></Button>
                    <Button type="button" size="icon" variant="ghost" className="h-7 w-7"
                      onClick={() => setLines(doc.lines.filter((l) => l.id !== line.id))} aria-label="Remove line">
                      <X className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                )}
              </div>

              <div className="grid gap-2 px-3 py-2 md:grid-cols-[1fr,90px,110px,110px,110px,110px,40px] md:items-center">
                {readOnly ? (
                  <span className="text-sm font-medium">{line.name || "Item"}</span>
                ) : (
                  <Input value={line.name} placeholder="Item name"
                    onChange={(e) => update(line.id, { name: e.target.value })} />
                )}
                <FieldCell label={`${doc.tax_label || "VAT"} %`} readOnly={readOnly} display={`${line.tax_rate || 0}%`}>
                  <Input type="number" min={0} step="0.1" className="text-right" value={line.tax_rate}
                    onChange={(e) => update(line.id, { tax_rate: parseFloat(e.target.value) || 0 })} />
                </FieldCell>
                <FieldCell label="Quantity" readOnly={readOnly} display={String(line.qty)}>
                  <Input type="number" min={0} step="0.01" className="text-right" value={line.qty}
                    onChange={(e) => update(line.id, { qty: parseFloat(e.target.value) || 0 })} />
                </FieldCell>
                <FieldCell label="Rate" readOnly={readOnly} display={money(line.rate)}>
                  <Input type="number" min={0} step="0.01" className="text-right" value={line.rate}
                    onChange={(e) => update(line.id, { rate: parseFloat(e.target.value) || 0 })} />
                </FieldCell>
                <div className="flex items-center justify-between text-sm md:block md:text-right">
                  <span className="text-xs text-muted-foreground md:hidden">Amount</span>
                  <span className="tabular-nums">{money(t.net)}</span>
                </div>
                <div className="flex items-center justify-between text-sm font-semibold md:block md:text-right">
                  <span className="text-xs font-normal text-muted-foreground md:hidden">Total</span>
                  <span className="tabular-nums">{money(t.gross)}</span>
                </div>
                <span className="hidden md:block" />
              </div>

              {(openDesc[line.id] || line.description) && (
                <div className="px-3 pb-3">
                  {readOnly ? (
                    <p className="whitespace-pre-wrap text-sm text-muted-foreground">{line.description}</p>
                  ) : (
                    <Textarea rows={3} placeholder="Description" value={line.description || ""}
                      onChange={(e) => update(line.id, { description: e.target.value })} />
                  )}
                </div>
              )}

              {!readOnly && (
                <div className="flex flex-wrap gap-3 px-3 pb-3 text-xs">
                  <button type="button" className="inline-flex items-center gap-1 text-primary"
                    onClick={() => setOpenDesc((s) => ({ ...s, [line.id]: !s[line.id] }))}>
                    <Type className="h-3.5 w-3.5" /> {openDesc[line.id] || line.description ? "Hide" : "Add"} description
                  </button>
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <Tag className="h-3.5 w-3.5" /> Line discount
                    <Input type="number" min={0} max={100} step="0.1" className="ml-1 h-7 w-20 text-right"
                      value={line.discount_pct || 0}
                      onChange={(e) => update(line.id, { discount_pct: parseFloat(e.target.value) || 0 })} />
                    %
                  </span>
                </div>
              )}
            </div>
          );
        })}

        {!readOnly && (
          <button type="button"
            className="flex w-full items-center justify-center gap-2 border-t border-dashed border-border py-3 text-sm font-medium text-primary hover:bg-muted/40"
            onClick={() => setLines([...doc.lines, emptyLine(doc.default_tax_rate ?? 0)])}>
            <Plus className="h-4 w-4" /> Add new line
          </button>
        )}
      </div>

      {/* Summary --------------------------------------------------------- */}
      <div className="ml-auto w-full max-w-sm space-y-2 rounded-lg border border-border bg-muted/30 p-4 text-sm">
        <Row label="Amount" value={money(totals.subtotal)} />
        <Row label={`${doc.tax_label || "VAT"}`} value={money(totals.tax)} />
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground">Discount</span>
          {readOnly ? (
            <span className="tabular-nums">- {money(totals.discount)}</span>
          ) : (
            <span className="flex items-center gap-1">
              <Input type="number" min={0} step="0.01" className="h-8 w-24 text-right"
                value={doc.discount?.value ?? 0}
                onChange={(e) => patch({ discount: { mode: doc.discount?.mode || "percent", value: parseFloat(e.target.value) || 0 } })} />
              <Select value={doc.discount?.mode || "percent"}
                onValueChange={(v) => patch({ discount: { mode: v as "percent" | "fixed", value: doc.discount?.value ?? 0 } })}>
                <SelectTrigger className="h-8 w-[88px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="percent">%</SelectItem>
                  <SelectItem value="fixed">{cur.symbol}</SelectItem>
                </SelectContent>
              </Select>
            </span>
          )}
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground">Shipping / delivery</span>
          {readOnly ? <span className="tabular-nums">{money(totals.shipping)}</span> : (
            <Input type="number" min={0} step="0.01" className="h-8 w-28 text-right"
              value={doc.shipping ?? 0}
              onChange={(e) => patch({ shipping: parseFloat(e.target.value) || 0 })} />
          )}
        </div>

        {(doc.custom_fields || []).map((f) => (
          <div key={f.id} className="flex items-center gap-2">
            {readOnly ? (
              <><span className="flex-1 text-muted-foreground">{f.label}</span><span>{f.value}</span></>
            ) : (
              <>
                <Input className="h-8" placeholder="Label" value={f.label}
                  onChange={(e) => patch({ custom_fields: (doc.custom_fields || []).map((x) => x.id === f.id ? { ...x, label: e.target.value } : x) })} />
                <Input className="h-8" placeholder="Value" value={f.value}
                  onChange={(e) => patch({ custom_fields: (doc.custom_fields || []).map((x) => x.id === f.id ? { ...x, value: e.target.value } : x) })} />
                <Button type="button" size="icon" variant="ghost" className="h-8 w-8"
                  onClick={() => patch({ custom_fields: (doc.custom_fields || []).filter((x) => x.id !== f.id) })}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </>
            )}
          </div>
        ))}
        {!readOnly && (
          <Button type="button" variant="ghost" size="sm" className="gap-1 px-0 text-xs"
            onClick={() => patch({ custom_fields: [...(doc.custom_fields || []), { id: crypto.randomUUID(), label: "", value: "" }] })}>
            <Plus className="h-3.5 w-3.5" /> Add custom field
          </Button>
        )}

        <div className="flex items-center justify-between border-t border-border pt-2 text-base font-bold">
          <span>Total ({cur.code})</span>
          <span className="tabular-nums text-accent">{money(totals.total)}</span>
        </div>

        {!readOnly && (
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <Checkbox checked={doc.show_total_in_words !== false}
              onCheckedChange={(c) => patch({ show_total_in_words: !!c })} />
            Show total in words
          </label>
        )}
        {doc.show_total_in_words !== false && (
          <p className="text-xs italic text-muted-foreground">{amountInWords(totals.total, doc.currency)}</p>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

function FieldCell({ label, readOnly, display, children }:
  { label: string; readOnly?: boolean; display: string; children: React.ReactNode }) {
  if (readOnly) {
    return (
      <div className="flex items-center justify-between text-sm md:block md:text-right">
        <span className="text-xs text-muted-foreground md:hidden">{label}</span>
        <span className="tabular-nums">{display}</span>
      </div>
    );
  }
  return (
    <div className="space-y-1">
      <span className="text-xs text-muted-foreground md:hidden">{label}</span>
      {children}
    </div>
  );
}
