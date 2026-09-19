import StageField from "./StageField";
import type { StageFormProps } from "./types";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { BadgeCheck, FileText } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useMemo, useRef, useState } from "react";
import DocumentPreviewDialog from "@/components/documents/DocumentPreviewDialog";
import { fetchJobPartyDetails } from "@/lib/clientDetails";
import QuoteBuilder from "@/components/quote/QuoteBuilder";
import QuoteExtras, { type QuoteExtrasValue } from "@/components/quote/QuoteExtras";
import {
  DEFAULT_CURRENCY, amountInWords, currencyFor, emptyLine, formatAmount, lineTotals,
  quoteTotals, round, type QuoteDoc, type QuoteLine,
} from "@/lib/quote";

/** Legacy shape kept so older quotes and any existing readers keep working. */
interface LegacyLine {
  id: string;
  type: "material" | "labour" | "other";
  description: string;
  qty: number;
  unit_price: number;
  markup_pct: number;
}

const blankDoc = (): QuoteDoc => ({
  currency: DEFAULT_CURRENCY,
  tax_label: "VAT",
  tax_inclusive: false,
  default_tax_rate: 0,
  lines: [emptyLine(0)],
  discount: { mode: "percent", value: 0 },
  shipping: 0,
  custom_fields: [],
  show_total_in_words: true,
});

/** Rebuilds a rich quote from the old line-item format. */
function docFromLegacy(items: LegacyLine[], vatPct: number): QuoteDoc {
  return {
    ...blankDoc(),
    default_tax_rate: vatPct,
    lines: items.map<QuoteLine>((i) => ({
      id: i.id || crypto.randomUUID(),
      name: i.description || "",
      description: "",
      qty: Number(i.qty) || 0,
      rate: (Number(i.unit_price) || 0) * (1 + (Number(i.markup_pct) || 0) / 100),
      tax_rate: vatPct,
      discount_pct: 0,
    })),
  };
}

const toLegacy = (doc: QuoteDoc): LegacyLine[] =>
  doc.lines.map((l) => ({
    id: l.id,
    type: "other",
    description: [l.name, l.description].filter(Boolean).join(" — "),
    qty: Number(l.qty) || 0,
    unit_price: Number(l.rate) || 0,
    markup_pct: 0,
  }));

export default function QuotationPrepForm({ formData, onChange, stageId, jobId, readOnly, onQuoteConfirm, pdfOpen, onPdfOpenChange }: StageFormProps) {
  const [confirmed, setConfirmed] = useState(false);
  const [localPdfOpen, setLocalPdfOpen] = useState(false);

  const doc: QuoteDoc = useMemo(() => {
    if (formData.quote_doc) return { ...blankDoc(), ...(formData.quote_doc as QuoteDoc) };
    const legacy: LegacyLine[] = formData.line_items || [];
    const vatPct = parseFloat(formData.vat_pct || "0") || 0;
    return legacy.length ? docFromLegacy(legacy, vatPct) : blankDoc();
  }, [formData.quote_doc, formData.line_items, formData.vat_pct]);

  const totals = useMemo(() => quoteTotals(doc), [doc]);
  const cur = currencyFor(doc.currency);
  const money = (n: number) => formatAmount(n, doc.currency);

  const patch = (updates: Record<string, any>) => onChange?.({ ...formData, ...updates });

  /** Keeps the finance contract (quote_amount + vat_amount) in step with the builder. */
  const setDoc = (next: QuoteDoc) => {
    const t = quoteTotals(next);
    patch({
      quote_doc: next,
      line_items: toLegacy(next),
      quote_currency: next.currency,
      quote_amount: round(t.total - t.tax).toFixed(2),
      vat_pct: String(next.default_tax_rate ?? 0),
      vat_amount: t.tax.toFixed(2),
    });
  };

  const extras: QuoteExtrasValue = {
    terms: formData.terms || "",
    notes: formData.notes || "",
    additional_info: formData.additional_info || "",
    contact_details: formData.contact_details || "",
    signature_name: formData.signature_name || "",
    attachments: formData.quote_attachments || [],
  };
  const setExtras = (v: QuoteExtrasValue) =>
    patch({
      terms: v.terms,
      notes: v.notes,
      additional_info: v.additional_info,
      contact_details: v.contact_details,
      signature_name: v.signature_name,
      quote_attachments: v.attachments,
    });

  // Re-confirm whenever the quote content changes.
  useEffect(() => {
    setConfirmed(false);
    onQuoteConfirm?.(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.quote_ref, formData.quote_amount, formData.vat_amount, JSON.stringify(doc)]);

  const handleConfirm = (checked: boolean) => {
    setConfirmed(checked);
    onQuoteConfirm?.(checked);
  };

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

      const parties = await fetchJobPartyDetails(jobId!);
      return { job, estimate, parties };
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
              {estimatedValue != null ? money(estimatedValue) : "No estimate on record"}
            </p>
          </div>
        </div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded border border-border p-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Quoted to (client)</p>
          <p className="text-sm font-semibold mt-0.5">{prefillData?.parties?.customer.name || "Client"}</p>
          <p className="text-xs text-muted-foreground">
            {[prefillData?.parties?.customer.email, prefillData?.parties?.customer.phone, prefillData?.parties?.customer.address]
              .filter(Boolean).join(" · ") || "No contact details captured yet"}
          </p>
        </div>
        <div className="rounded border border-border p-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Quoted by (us)</p>
          <p className="text-sm font-semibold mt-0.5">{prefillData?.parties?.supplier.name || "Our business"}</p>
          <p className="text-xs text-muted-foreground">{prefillData?.parties?.supplier.address || "Add your address in settings"}</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <StageField
          type="text"
          label="Quote Reference Number"
          required
          readOnly={!!readOnly}
          value={formData.quote_ref || quoteRef}
          onChange={(v: string) => patch({ quote_ref: v })}
          placeholder="QT-0001"
        />
        <StageField
          type="text" label="Validity Period" readOnly={!!readOnly}
          value={formData.validity || ""}
          onChange={(v: string) => patch({ validity: v })}
          placeholder="e.g. 30 days"
        />
      </div>

      <QuoteBuilder doc={doc} onChange={setDoc} readOnly={!!readOnly} />

      <div className="relative overflow-hidden rounded-lg border border-accent/30 bg-gradient-to-r from-accent/10 via-transparent to-primary/10 p-3">
        <div className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-accent" />
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          Total incl. {doc.tax_label || "VAT"} ({cur.code})
        </p>
        <p className="font-heading text-2xl font-bold text-accent tabular-nums">{money(totals.total)}</p>
      </div>

      <QuoteExtras value={extras} onChange={setExtras} readOnly={!!readOnly} />

      <DocumentPreviewDialog
        open={pdfOpen ?? localPdfOpen}
        onOpenChange={onPdfOpenChange ?? setLocalPdfOpen}
        jobId={jobId}
        clientPhone={prefillData?.parties?.customer.phone || prefillData?.job?.client_phone}
        clientEmail={prefillData?.parties?.customer.email || prefillData?.job?.client_email}
        onStored={(url) => patch({ quote_document_url: url })}
        payload={{
          kind: "quote",
          title: prefillData?.job?.service_type || `Quote ${quoteRef || ""}`.trim(),
          number: quoteRef || "—",
          date: formData.quote_date || new Date().toISOString().slice(0, 10),
          currency: doc.currency,
          taxLabel: doc.tax_label,
          to: {
            name: prefillData?.parties?.customer.name || prefillData?.job?.client_name || "Client",
            address: prefillData?.parties?.customer.address || prefillData?.job?.client_location,
            phone: prefillData?.parties?.customer.phone || prefillData?.job?.client_phone,
            email: prefillData?.parties?.customer.email || prefillData?.job?.client_email,
          },
          items: doc.lines.map((l) => ({
            description: [l.name, l.description].filter(Boolean).join(" — "),
            qty: l.qty,
            rate: l.rate,
            amount: lineTotals(l, !!doc.tax_inclusive).net,
          })),
          subtotal: totals.subtotal,
          vat: totals.tax,
          total: totals.total,
          extraTotals: [
            ...(totals.discount ? [{ label: "Discount", value: -totals.discount }] : []),
            ...(totals.shipping ? [{ label: "Shipping / delivery", value: totals.shipping }] : []),
            ...(doc.custom_fields || [])
              .filter((f) => f.label && !Number.isNaN(parseFloat(f.value)))
              .map((f) => ({ label: f.label, value: parseFloat(f.value) })),
          ],
          totalInWords: doc.show_total_in_words !== false ? amountInWords(totals.total, doc.currency) : null,
          terms: formData.terms || null,
          signature: formData.signature_name || null,
          attachments: (formData.quote_attachments || []).filter((a: any) => a?.url),
          notes: [
            formData.validity ? `Validity: ${formData.validity}` : "",
            formData.notes || "",
            formData.additional_info || "",
            formData.contact_details || "",
          ].filter(Boolean).join("\n"),
        }}
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
