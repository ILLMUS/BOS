import { supabase } from "@/integrations/supabase/client";
import { CURRENCY_CODE } from "@/lib/currency";
import type { FinanceFormKind } from "@/lib/stageForms";
import type { JobPartyDetails } from "@/lib/clientDetails";

const DOC_TYPE: Record<FinanceFormKind, string> = {
  quote: "quote",
  invoice: "invoice",
  receipt: "receipt",
};

const PREFIX: Record<FinanceFormKind, string> = {
  quote: "QT",
  invoice: "INV",
  receipt: "REC",
};

/** Deterministic document number so the same step never creates a second document. */
export function defaultReference(kind: FinanceFormKind, jobNumber?: string | null) {
  return `${PREFIX[kind]}-${jobNumber || "DRAFT"}`;
}

/** Reads the document number and amount a finance step holds in its answers. */
export function financeValuesFromForm(kind: FinanceFormKind, formData: Record<string, any>) {
  if (kind === "quote") {
    const subtotal = parseFloat(formData.quote_amount || "0") || 0;
    const vat = parseFloat(formData.vat_amount || "0") || 0;
    return {
      reference: (formData.quote_ref as string) || "",
      amount: subtotal + vat,
      documentUrl: (formData.quote_document_url as string) || null,
      dueDate: null as string | null,
    };
  }
  if (kind === "invoice") {
    return {
      reference: (formData.invoice_number as string) || "",
      amount: parseFloat(formData.invoice_amount || "0") || 0,
      documentUrl: (formData.invoice_document_url as string) || null,
      dueDate: (formData.due_date as string) || null,
    };
  }
  return {
    reference: (formData.receipt_number as string) || "",
    amount: parseFloat(formData.amount_received || "0") || 0,
    documentUrl: (formData.receipt_document_url as string) || null,
    dueDate: null as string | null,
  };
}

/**
 * Creates (or keeps up to date) the finance record behind a quotation, invoice
 * or receipt step. Keyed on the step itself, so activating the step once is
 * enough and re-saving never duplicates the document.
 */
export async function syncStageFinanceDoc(args: {
  kind: FinanceFormKind;
  stageId: string;
  stageStatus: string;
  party: JobPartyDetails;
  formData: Record<string, any>;
}) {
  const { kind, stageId, party, formData } = args;
  if (!party.orgId) return;

  const values = financeValuesFromForm(kind, formData);
  const reference = values.reference || defaultReference(kind, party.jobNumber);
  const externalId = `stage:${stageId}:${kind}`;

  const status =
    kind === "receipt"
      ? values.amount > 0 ? "paid" : "draft"
      : args.stageStatus === "approved"
        ? kind === "quote" ? "accepted" : "issued"
        : values.amount > 0 ? "issued" : "draft";

  const payload = {
    org_id: party.orgId,
    doc_type: DOC_TYPE[kind],
    reference,
    external_id: externalId,
    source: "workflow",
    amount: values.amount,
    currency: CURRENCY_CODE,
    status,
    issued_at: (formData.payment_date as string) || (formData.quote_date as string) || new Date().toISOString().slice(0, 10),
    due_date: values.dueDate,
    document_url: values.documentUrl,
    client_name: party.customer.name,
    notes: [party.customer.email, party.customer.phone, party.customer.address].filter(Boolean).join(" · ") || null,
    account_id: party.accountId,
    deal_id: party.dealId,
    job_id: party.jobId,
    synced_at: new Date().toISOString(),
  };

  const { data: existing } = await supabase
    .from("finance_documents")
    .select("id")
    .eq("org_id", party.orgId)
    .eq("external_id", externalId)
    .maybeSingle();

  if (existing) {
    await supabase.from("finance_documents").update(payload).eq("id", existing.id);
    return;
  }

  const { data: auth } = await supabase.auth.getUser();
  await supabase.from("finance_documents").insert({ ...payload, created_by: auth.user?.id ?? null });
}

/**
 * Money received on a receipt step is also booked as a job payment, so the
 * Finance payment list, ageing and ledger all see the same transaction.
 * Keyed on the receipt reference so re-saving never double-counts.
 */
export async function syncStagePayment(args: {
  party: JobPartyDetails;
  formData: Record<string, any>;
  jobNumber?: string | null;
}) {
  const { party, formData } = args;
  if (!party.orgId || !party.jobId) return;

  const values = financeValuesFromForm("receipt", formData);
  if (!(values.amount > 0)) return;
  const reference = values.reference || defaultReference("receipt", party.jobNumber);

  const { data: existing } = await supabase
    .from("job_payments")
    .select("id")
    .eq("job_id", party.jobId)
    .eq("reference", reference)
    .maybeSingle();

  const payload = {
    job_id: party.jobId,
    payment_type: "payment",
    amount: values.amount,
    method: (formData.payment_method as string) || null,
    reference,
    paid_at: (formData.payment_date as string) || new Date().toISOString().slice(0, 10),
    proof_url: values.documentUrl,
  };

  if (existing) {
    await supabase.from("job_payments").update(payload).eq("id", existing.id);
    return;
  }

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user?.id) return;
  await supabase.from("job_payments").insert({ ...payload, recorded_by: auth.user.id });
}

/**
 * Keeps every money step of a job in sync — not just the one on screen — so
 * quotes, invoices and receipts captured earlier all show up in Finance.
 */
export async function syncJobFinanceDocs(args: {
  party: JobPartyDetails;
  stages: Array<{ id: string; status: string; stage_name?: string | null; form_data?: unknown }>;
  detect: (name?: string | null) => FinanceFormKind | null;
}) {
  const { party, stages, detect } = args;
  if (!party.orgId) return;

  for (const stage of stages) {
    const kind = detect(stage.stage_name);
    if (!kind || stage.status === "locked") continue;
    const formData = (stage.form_data as Record<string, any>) || {};
    await syncStageFinanceDoc({
      kind,
      stageId: stage.id,
      stageStatus: stage.status,
      party,
      formData,
    }).catch(() => {});
    if (kind === "receipt") await syncStagePayment({ party, formData }).catch(() => {});
  }
}
