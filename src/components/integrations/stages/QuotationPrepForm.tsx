import StageField from "./StageField";
import type { StageFormProps } from "./types";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Plus, Trash2, BadgeCheck, FileText } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useRef, useState } from "react";
import DocumentPreviewDialog from "@/components/documents/DocumentPreviewDialog";


interface LineItem {
  id: string;
  type: "material" | "labour" | "other";
  description: string;
  qty: number;
  unit_price: number;
  markup_pct: number;
}

const TYPES: LineItem["type"][] = ["material", "labour", "other"];

const typeLabel = (t: string) => (t === "material" ? "Material" : t === "labour" ? "Labour" : "Other");

const lineTotal = (i: LineItem) => i.qty * i.unit_price * (1 + (i.markup_pct || 0) / 100);

export default function QuotationPrepForm({ formData, onChange, stageId, jobId, readOnly, onQuoteConfirm, pdfOpen, onPdfOpenChange }: StageFormProps) {
  const lineItems: LineItem[] = formData.line_items || [];
  const [confirmed, setConfirmed] = useState(false);
  const [localPdfOpen, setLocalPdfOpen] = useState(false);


  const subtotal = lineItems.reduce((s, i) => s + lineTotal(i), 0);
  const quoteAmount = formData.quote_amount !== undefined && formData.quote_amount !== ""
    ? parseFloat(formData.quote_amount) || 0
    : subtotal;
  const vatPct = formData.vat_pct !== undefined && formData.vat_pct !== ""
    ? parseFloat(formData.vat_pct) || 0
    : 0;
  const vatAmount = Math.round(quoteAmount * vatPct) / 100;
  const totalAmount = quoteAmount + vatAmount;

  // Re-confirm whenever the quote content changes.
  useEffect(() => {
    setConfirmed(false);
    onQuoteConfirm?.(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.quote_ref, formData.quote_amount, formData.vat_amount, JSON.stringify(lineItems)]);

  const handleConfirm = (checked: boolean) => {
    setConfirmed(checked);
    onQuoteConfirm?.(checked);
  };

  const patch = (updates: Record<string, any>) => onChange?.({ ...formData, ...updates });

  const setItems = (items: LineItem[]) => {
    const sub = items.reduce((s, i) => s + lineTotal(i), 0);
    const pct = parseFloat(formData.vat_pct || "0") || 0;
    patch({ line_items: items, quote_amount: sub.toFixed(2), vat_amount: (sub * pct / 100).toFixed(2) });
  };

  const addItem = () =>
    setItems([
      ...lineItems,
      { id: crypto.randomUUID(), type: "material", description: "", qty: 1, unit_price: 0, markup_pct: 0 },
    ]);

  const updateItem = (id: string, updates: Partial<LineItem>) =>
    setItems(lineItems.map((i) => (i.id === id ? { ...i, ...updates } : i)));

  const removeItem = (id: string) => setItems(lineItems.filter((i) => i.id !== id));

  // Pull job + outreach estimate so the quote starts with the numbers already on record.
  const { data: prefillData } = useQuery({
    queryKey: ["quote-prefill", jobId],
    enabled: !!jobId,
    queryFn: async () => {
      const { data: job } = await supabase
        .from("jobs")
        .select("job_number, client_name, client_phone, client_email, client_location, service_type, deal_id, account_id")
        .eq("id", jobId!)
        .maybeSingle();

      let estimate: { value: number; source: string } | null = null;

      if (job?.deal_id) {
        const { data: deal } = await supabase
          .from("deals").select("value, opportunity_id").eq("id", job.deal_id).maybeSingle();
        if (deal?.value != null) estimate = { value: Number(deal.value), source: "Deal" };
        if (!estimate && deal?.opportunity_id) {
          const { data: opp } = await supabase
            .from("opportunities").select("value, lead_id").eq("id", deal.opportunity_id).maybeSingle();
          if (opp?.value != null) estimate = { value: Number(opp.value), source: "Opportunity" };
          if (!estimate && opp?.lead_id) {
            const { data: lead } = await supabase
              .from("leads").select("estimated_value").eq("id", opp.lead_id).maybeSingle();
            if (lead?.estimated_value != null) estimate = { value: Number(lead.estimated_value), source: "Lead" };
          }
        }
      }

      if (!estimate && job?.account_id) {
        const { data: opp } = await supabase
          .from("opportunities").select("value").eq("account_id", job.account_id)
          .not("value", "is", null).order("created_at", { ascending: false }).limit(1).maybeSingle();
        if (opp?.value != null) estimate = { value: Number(opp.value), source: "Opportunity" };
        if (!estimate) {
          const { data: lead } = await supabase
            .from("leads").select("estimated_value").eq("account_id", job.account_id)
            .not("estimated_value", "is", null).order("created_at", { ascending: false }).limit(1).maybeSingle();
          if (lead?.estimated_value != null) estimate = { value: Number(lead.estimated_value), source: "Lead" };
        }
      }

      return { job, estimate };
    },
  });

  const jobNumber = prefillData?.job?.job_number;
  const quoteRef: string = formData.quote_ref || (jobNumber ? `QT-${jobNumber}` : "");
  const estimatedValue: number | null =
    formData.estimated_value != null && formData.estimated_value !== ""
      ? Number(formData.estimated_value)
      : (prefillData?.estimate?.value ?? null);
  const estimateSource: string | null = formData.estimate_source || prefillData?.estimate?.source || null;

  // Persist the generated quote reference + carried-over estimate once.
  const seededRef = useRef(false);
  useEffect(() => {
    if (seededRef.current || readOnly || !stageId || !quoteRef) return;
    if (formData.quote_ref === quoteRef && formData.estimated_value != null) return;
    seededRef.current = true;
    const next = {
      ...formData,
      quote_ref: quoteRef,
      ...(estimatedValue != null ? { estimated_value: estimatedValue, estimate_source: estimateSource } : {}),
    };
    supabase.from("job_stages").update({ form_data: next }).eq("id", stageId).then(() => onChange?.(next));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quoteRef, estimatedValue, stageId, readOnly]);

  return (
    <div className="space-y-4">
      <Card className="border-primary/40 bg-primary/5 p-4 space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h4 className="text-sm font-semibold text-primary flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Quote built in this app
          </h4>
          <Badge variant="outline" className="text-xs border-primary text-primary">
            {quoteRef || "Reference pending"}
          </Badge>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-primary/20 pt-3">
          <div className="rounded bg-card border border-border p-3">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Quote Reference</p>
            <p className="text-base font-semibold font-mono mt-1">{quoteRef || "—"}</p>
          </div>
          <div className="rounded bg-card border border-border p-3">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Estimated price {estimateSource ? `(from ${estimateSource})` : ""}
            </p>
            <p className="text-base font-semibold mt-1">
              {estimatedValue != null ? `E ${estimatedValue.toFixed(2)}` : "No estimate on record"}
            </p>
          </div>
        </div>
      </Card>

      <StageField
        type="text"
        label="Quote Reference Number"
        required
        readOnly={!!readOnly}
        value={formData.quote_ref || quoteRef}
        onChange={(v: string) => patch({ quote_ref: v })}
        placeholder="QT-0001"
      />

      {/* Line items */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold">Line Items</h4>
          {!readOnly && (
            <Button size="sm" variant="outline" onClick={addItem} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Add item
            </Button>
          )}
        </div>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-[80px] text-right">Qty</TableHead>
                <TableHead className="w-[120px] text-right">Unit Price</TableHead>
                <TableHead className="w-[90px] text-right">Markup %</TableHead>
                <TableHead className="w-[110px] text-right">Total</TableHead>
                {!readOnly && <TableHead className="w-[48px]" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {lineItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={readOnly ? 6 : 7} className="text-sm text-muted-foreground text-center py-6">
                    No line items yet.{!readOnly && " Use “Add item” to build the quote."}
                  </TableCell>
                </TableRow>
              ) : (
                lineItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="p-2 text-sm">
                      {readOnly ? (
                        typeLabel(item.type)
                      ) : (
                        <select
                          className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                          value={item.type}
                          onChange={(e) => updateItem(item.id, { type: e.target.value as LineItem["type"] })}
                        >
                          {TYPES.map((t) => (
                            <option key={t} value={t}>{typeLabel(t)}</option>
                          ))}
                        </select>
                      )}
                    </TableCell>
                    <TableCell className="p-2 text-sm">
                      {readOnly ? item.description : (
                        <Input
                          value={item.description}
                          onChange={(e) => updateItem(item.id, { description: e.target.value })}
                          placeholder="Description"
                        />
                      )}
                    </TableCell>
                    <TableCell className="p-2 text-sm text-right">
                      {readOnly ? item.qty : (
                        <Input
                          type="number" min={0} className="text-right"
                          value={item.qty}
                          onChange={(e) => updateItem(item.id, { qty: parseFloat(e.target.value) || 0 })}
                        />
                      )}
                    </TableCell>
                    <TableCell className="p-2 text-sm text-right">
                      {readOnly ? `E ${item.unit_price.toFixed(2)}` : (
                        <Input
                          type="number" min={0} step="0.01" className="text-right"
                          value={item.unit_price}
                          onChange={(e) => updateItem(item.id, { unit_price: parseFloat(e.target.value) || 0 })}
                        />
                      )}
                    </TableCell>
                    <TableCell className="p-2 text-sm text-right">
                      {readOnly ? `${item.markup_pct || 0}%` : (
                        <Input
                          type="number" min={0} step="0.1" className="text-right"
                          value={item.markup_pct}
                          onChange={(e) => updateItem(item.id, { markup_pct: parseFloat(e.target.value) || 0 })}
                        />
                      )}
                    </TableCell>
                    <TableCell className="p-2 text-right text-sm font-medium">
                      E {lineTotal(item).toFixed(2)}
                    </TableCell>
                    {!readOnly && (
                      <TableCell className="p-2 text-right">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => removeItem(item.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={5} className="text-right font-semibold text-sm">Subtotal</TableCell>
                <TableCell className="text-right font-semibold text-sm">E {subtotal.toFixed(2)}</TableCell>
                {!readOnly && <TableCell />}
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      </div>

      <StageField
        type="currency" label="Quoted Amount (excl. VAT)" required readOnly={!!readOnly}
        value={formData.quote_amount ?? subtotal.toFixed(2)}
        onChange={(v: string) => patch({ quote_amount: v })}
        placeholder="0.00"
      />
      <div className="space-y-1.5">
        <StageField
          type="number" label="VAT %" readOnly={!!readOnly}
          value={formData.vat_pct ?? ""}
          onChange={(v: string) => patch({ vat_pct: v, vat_amount: ((parseFloat(formData.quote_amount ?? subtotal.toFixed(2)) || 0) * (parseFloat(v) || 0) / 100).toFixed(2) })}
          placeholder="e.g. 15"
        />
        <div className="flex items-center justify-between rounded border border-border bg-muted/40 px-3 py-2 text-sm">
          <span className="text-muted-foreground">
            VAT amount{vatPct ? ` (${vatPct}% of E ${quoteAmount.toFixed(2)})` : ""}
          </span>
          <span className="font-medium">E {vatAmount.toFixed(2)}</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {[0, 12, 14, 15, 20].map((p) => (
            !readOnly && (
              <Button
                key={p} type="button" size="sm" variant={vatPct === p ? "default" : "outline"}
                className="h-7 px-2 text-xs"
                onClick={() => patch({ vat_pct: String(p), vat_amount: ((parseFloat(formData.quote_amount ?? subtotal.toFixed(2)) || 0) * p / 100).toFixed(2) })}
              >
                {p}%
              </Button>
            )
          ))}
        </div>
      </div>
      <div className="relative overflow-hidden rounded-lg border border-accent/30 bg-gradient-to-r from-accent/10 via-transparent to-primary/10 p-3">
        <div className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-accent" />
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Total (incl. VAT)</p>
        <p className="font-heading text-2xl font-bold text-accent tabular-nums">E {totalAmount.toFixed(2)}</p>
      </div>

      <DocumentPreviewDialog
        open={pdfOpen ?? localPdfOpen}
        onOpenChange={onPdfOpenChange ?? setLocalPdfOpen}

        jobId={jobId}
        clientPhone={prefillData?.job?.client_phone}
        onStored={(url) => patch({ quote_document_url: url })}
        payload={{
          kind: "quote",
          title: prefillData?.job?.service_type || `Quote ${quoteRef || ""}`.trim(),
          number: quoteRef || "—",
          date: formData.quote_date || new Date().toISOString().slice(0, 10),
          to: {
            name: prefillData?.job?.client_name || "Client",
            address: prefillData?.job?.client_location,
            phone: prefillData?.job?.client_phone,
            email: prefillData?.job?.client_email,
          },
          items: lineItems.map((i) => ({
            description: i.description,
            qty: i.qty,
            rate: i.unit_price * (1 + (i.markup_pct || 0) / 100),
            amount: lineTotal(i),
          })),
          subtotal: quoteAmount,
          vat: vatAmount,
          total: totalAmount,
          notes: [formData.validity ? `Validity: ${formData.validity}` : "", formData.terms || ""]
            .filter(Boolean).join("\n"),
        }}
      />

      <StageField
        type="text" label="Validity Period" readOnly={!!readOnly}
        value={formData.validity || ""}
        onChange={(v: string) => patch({ validity: v })}
        placeholder="e.g. 30 days"
      />
      <StageField
        type="textarea" label="Terms & Conditions" readOnly={!!readOnly}
        value={formData.terms || ""}
        onChange={(v: string) => patch({ terms: v })}
        rows={4}
      />

      <Card className="border-success/40 bg-success/5 p-3">
        <p className="text-sm flex items-start gap-2">
          <BadgeCheck className="h-4 w-4 mt-0.5 text-success shrink-0" />
          <span>Confirm the quote below once the reference, line items and totals are final.</span>
        </p>
      </Card>

      <StageField
        type="checkbox"
        label="I confirm this quote reference, line items and totals are correct."
        checked={confirmed}
        onChange={handleConfirm}
        readOnly={false}
      />
    </div>
  );
}
