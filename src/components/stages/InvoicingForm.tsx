import { useEffect, useRef, useState } from "react";
import StageField from "./StageField";
import type { StageFormProps } from "./types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, ExternalLink, FileDown, ReceiptText } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DocumentPreviewDialog from "@/components/documents/DocumentPreviewDialog";
import type { DocumentKind } from "@/lib/documentPdf";
import { fetchJobPartyDetails } from "@/lib/clientDetails";

interface QuoteLine { description?: string; qty?: number; unit_price?: number; markup_pct?: number }

export default function InvoicingForm({ formData, onChange, jobId, readOnly, mode = "invoice" }: StageFormProps & { mode?: "invoice" | "receipt" }) {
  const patch = (updates: Record<string, any>) => onChange?.({ ...formData, ...updates });
  const [pdfKind, setPdfKind] = useState<DocumentKind | null>(null);
  const isReceipt = mode === "receipt";

  // Pull the quote (and any invoice step) produced earlier in this job so the
  // document starts pre-filled with the client's own details and figures.
  const { data: quote } = useQuery({
    queryKey: ["invoice-quote-source", jobId],
    enabled: !!jobId,
    queryFn: async () => {
      const [{ data: job }, { data: stages }, parties] = await Promise.all([
        supabase.from("jobs")
          .select("job_number, client_name, client_phone, client_email, client_location, service_type")
          .eq("id", jobId!).maybeSingle(),
        supabase.from("job_stages").select("stage_name, form_data").eq("job_id", jobId!),
        fetchJobPartyDetails(jobId!),
      ]);
      const qs = (stages || []).find((s: any) => /quot|estimate|proposal/i.test(s.stage_name || ""));
      const inv = (stages || []).find((s: any) => /invoic|billing/i.test(s.stage_name || ""));
      const fd = ((qs?.form_data as Record<string, any>) || {});
      const invFd = ((inv?.form_data as Record<string, any>) || {});
      const amount = (parseFloat(fd.quote_amount || "0") || 0) + (parseFloat(fd.vat_amount || "0") || 0);
      return {
        job: job as any,
        parties,
        jobNumber: job?.job_number as string | undefined,
        quoteRef: fd.quote_ref as string | undefined,
        subtotal: parseFloat(fd.quote_amount || "0") || 0,
        vat: parseFloat(fd.vat_amount || "0") || 0,
        lines: (fd.line_items || []) as QuoteLine[],
        amount,
        invoiceNumber: invFd.invoice_number as string | undefined,
        invoiceAmount: parseFloat(invFd.invoice_amount || "0") || 0,
      };
    },

  });

  const seeded = useRef(false);
  useEffect(() => {
    if (seeded.current || readOnly || !quote) return;
    const updates: Record<string, any> = {};
    const invoiceTotal = quote.invoiceAmount || quote.amount;
    if (!formData.invoice_number) {
      const n = quote.invoiceNumber || (quote.jobNumber ? `INV-${quote.jobNumber}` : "");
      if (n) updates.invoice_number = n;
    }
    if (!formData.invoice_amount && invoiceTotal) updates.invoice_amount = invoiceTotal.toFixed(2);
    if (isReceipt) {
      if (!formData.receipt_number && quote.jobNumber) updates.receipt_number = `REC-${quote.jobNumber}`;
      if (!formData.amount_received && invoiceTotal) updates.amount_received = invoiceTotal.toFixed(2);
      if (!formData.payment_date) updates.payment_date = new Date().toISOString().slice(0, 10);
    }
    if (Object.keys(updates).length) {
      seeded.current = true;
      patch(updates);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quote, readOnly]);


  const invoiceTotal = parseFloat(formData.invoice_amount || "0") || 0;
  const received = parseFloat(formData.amount_received || "0") || 0;
  const job = quote?.job;

  const items = (quote?.lines || []).length
    ? (quote!.lines).map((l) => {
        const rate = (l.unit_price || 0) * (1 + (l.markup_pct || 0) / 100);
        return { description: l.description || "Item", qty: l.qty || 1, rate, amount: (l.qty || 1) * rate };
      })
    : [{ description: job?.service_type || "Work as quoted", qty: 1, rate: invoiceTotal, amount: invoiceTotal }];

  const customer = quote?.parties?.customer;
  const supplier = quote?.parties?.supplier;

  const party = {
    name: customer?.name || job?.client_name || "Client",
    address: customer?.address || job?.client_location,
    phone: customer?.phone || job?.client_phone,
    email: customer?.email || job?.client_email,
  };

  return (
    <div className="space-y-4">
      <Card className="border-primary/30 bg-primary/5 p-3">
        <p className="text-sm flex items-start gap-2">
          <FileText className="h-4 w-4 mt-0.5 text-primary shrink-0" />
          <span>
            {isReceipt ? (
              <>
                <strong>Receipt handled in this app.</strong> The client, invoice number and amount carry over
                automatically — confirm what was actually received and generate the receipt.
              </>
            ) : (
              <>
                <strong>Invoiced in this app.</strong> The invoice number and amount carry over from the approved quote —
                adjust them here, mark the invoice as sent, and record payments in the payments ledger.
              </>
            )}
          </span>
        </p>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded border border-border p-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Billed to (client)</p>
          <p className="text-sm font-semibold mt-0.5">{party.name}</p>
          <p className="text-xs text-muted-foreground">
            {[party.email, party.phone, party.address].filter(Boolean).join(" · ") || "No contact details captured yet"}
          </p>
        </div>
        <div className="rounded border border-border p-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Billed by (us)</p>
          <p className="text-sm font-semibold mt-0.5">{supplier?.name || "Our business"}</p>
          <p className="text-xs text-muted-foreground">{supplier?.address || "Add your address in settings"}</p>
        </div>
      </div>


      {quote?.quoteRef && (
        <div className="rounded border border-border p-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Source quote</p>
          <p className="text-sm font-semibold font-mono mt-0.5">
            {quote.quoteRef} · E {(quote.amount || 0).toFixed(2)}
          </p>
        </div>
      )}

      <StageField type="text" label="Invoice Number" required={!isReceipt} readOnly={!!readOnly}
        value={formData.invoice_number || ""} onChange={(v: string) => patch({ invoice_number: v })}
        placeholder="INV-0001" />
      <StageField type="currency" label="Invoice Amount (incl. VAT)" required={!isReceipt} readOnly={!!readOnly}
        value={formData.invoice_amount || ""} onChange={(v: string) => patch({ invoice_amount: v })}
        placeholder="0.00" />
      {!isReceipt && (
        <>
          <StageField type="date" label="Due Date" readOnly={!!readOnly}
            value={formData.due_date || ""} onChange={(v: string) => patch({ due_date: v })} />
          <StageField type="checkbox" label="Invoice sent to client" readOnly={!!readOnly}
            checked={!!formData.invoice_sent} onChange={(v: boolean) => patch({ invoice_sent: v })} />
        </>
      )}
      <StageField type="text" label={isReceipt ? "Receipt Number" : "Receipt Number (once paid)"} required={isReceipt}
        readOnly={!!readOnly}
        value={formData.receipt_number || ""} onChange={(v: string) => patch({ receipt_number: v })}
        placeholder="REC-0001" />
      <StageField type="currency" label="Amount Received" required={isReceipt} readOnly={!!readOnly}
        value={formData.amount_received || ""} onChange={(v: string) => patch({ amount_received: v })}
        placeholder="0.00" />
      {isReceipt && (
        <>
          <StageField type="date" label="Payment Date" readOnly={!!readOnly}
            value={formData.payment_date || ""} onChange={(v: string) => patch({ payment_date: v })} />
          <StageField type="text" label="Payment Method" readOnly={!!readOnly}
            value={formData.payment_method || ""} onChange={(v: string) => patch({ payment_method: v })}
            placeholder="Bank transfer, cash, card…" />
          <div className="rounded border border-border p-3 text-sm">
            Balance still open: <strong>E {Math.max(invoiceTotal - received, 0).toFixed(2)}</strong>
          </div>
        </>
      )}
      <StageField type="textarea" label="Billing Notes" readOnly={!!readOnly}
        value={formData.billing_notes || ""} onChange={(v: string) => patch({ billing_notes: v })} rows={3} />


      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" className="gap-1.5" onClick={() => setPdfKind("invoice")}>
          <FileDown className="h-4 w-4" /> Invoice PDF
        </Button>
        <Button type="button" variant="outline" className="gap-1.5"
          disabled={!received} onClick={() => setPdfKind("receipt")}>
          <ReceiptText className="h-4 w-4" /> Receipt PDF
        </Button>
      </div>

      {pdfKind && (
        <DocumentPreviewDialog
          open
          onOpenChange={(v) => !v && setPdfKind(null)}
          jobId={jobId}
          clientPhone={party.phone}
          clientEmail={party.email}
          onStored={(url) => patch(pdfKind === "invoice" ? { invoice_document_url: url } : { receipt_document_url: url })}
          payload={pdfKind === "invoice" ? {
            kind: "invoice",
            title: job?.service_type || `Invoice ${formData.invoice_number || ""}`.trim(),
            number: formData.invoice_number || "—",
            date: formData.invoice_date || new Date().toISOString().slice(0, 10),
            dueDate: formData.due_date || null,
            to: party,
            items,
            subtotal: quote?.subtotal || invoiceTotal,
            vat: quote?.vat || 0,
            total: invoiceTotal,
            notes: formData.billing_notes || null,
          } : {
            kind: "receipt",
            title: job?.service_type || `Receipt ${formData.receipt_number || ""}`.trim(),
            number: formData.receipt_number || "—",
            date: formData.payment_date || new Date().toISOString().slice(0, 10),
            to: party,
            items,
            subtotal: quote?.subtotal || invoiceTotal,
            vat: quote?.vat || 0,
            total: received,
            extraTotals: [
              { label: "Invoiced", value: invoiceTotal },
              { label: "Balance", value: Math.max(invoiceTotal - received, 0) },
            ],
            notes: formData.billing_notes || null,
          }}
        />
      )}

      {formData.invoice_document_url && (
        <a href={formData.invoice_document_url} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
          <ExternalLink className="h-3.5 w-3.5" />
          View invoice document
        </a>
      )}
    </div>
  );
}
