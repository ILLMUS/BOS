import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-api-key",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // --- Authentication: x-api-key OR Bearer token ---
  const apiKeyHeader = req.headers.get("x-api-key");
  const authHeader = req.headers.get("authorization");
  let userId: string | null = null;

  if (apiKeyHeader) {
    // Hash the provided key and look it up
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(apiKeyHeader));
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const keyHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

    const { data: keyRow, error: keyErr } = await supabase
      .from("api_keys")
      .select("id, created_by, is_active")
      .eq("key_hash", keyHash)
      .single();

    if (keyErr || !keyRow || !keyRow.is_active) {
      return new Response(JSON.stringify({ error: "Invalid or revoked API key" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    userId = keyRow.created_by;

    // Update last_used_at (fire and forget)
    supabase.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", keyRow.id).then(() => {});
  } else if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return new Response(JSON.stringify({ error: "Invalid auth token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    userId = user.id;
  } else {
    return new Response(JSON.stringify({ error: "Missing authorization. Use x-api-key or Bearer token." }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const url = new URL(req.url);
  const pathParts = url.pathname.split("/").filter(Boolean);
  const jobId = pathParts[1] || url.searchParams.get("job_id");

  if (!jobId) {
    return new Response(JSON.stringify({ error: "job_id is required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    if (req.method === "GET") {
      return await handleGet(supabase, jobId);
    } else if (req.method === "POST") {
      return await handlePost(supabase, jobId, req, userId!);
    } else {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (err) {
    console.error("Quote builder API error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function handleGet(supabase: any, jobId: string) {
  const [jobRes, stagesRes] = await Promise.all([
    supabase.from("jobs").select("*").eq("id", jobId).single(),
    supabase.from("job_stages").select("*").eq("job_id", jobId).order("created_at"),
  ]);

  if (jobRes.error || !jobRes.data) {
    return new Response(JSON.stringify({ error: "Job not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const job = jobRes.data;
  const stages = stagesRes.data || [];
  const getStageData = (stage: string) => {
    const s = stages.find((st: any) => st.stage === stage);
    return s ? { form_data: s.form_data, status: s.status } : null;
  };

  const payload = {
    job: {
      id: job.id, job_number: job.job_number,
      client_name: job.client_name, client_phone: job.client_phone,
      client_email: job.client_email, client_location: job.client_location,
      service_type: job.service_type, status: job.status, current_stage: job.current_stage,
    },
    stages: {
      lead_entry: getStageData("lead_entry"),
      lead_qualification: getStageData("lead_qualification"),
      site_assessment: getStageData("site_assessment"),
      job_scoping: getStageData("job_scoping"),
      costing: getStageData("costing"),
      quotation_preparation: getStageData("quotation_preparation"),
      invoicing: getStageData("invoicing"),
      project_closure: getStageData("project_closure"),
    },
  };

  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function handlePost(supabase: any, jobId: string, req: Request, userId: string) {
  const body = await req.json();
  // type: "quote" | "invoice" | "receipt" — defaults to "quote" for backward compatibility
  const type: "quote" | "invoice" | "receipt" = (body.type || "quote").toLowerCase();

  if (!["quote", "invoice", "receipt"].includes(type)) {
    return new Response(JSON.stringify({ error: "type must be 'quote', 'invoice', or 'receipt'" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (type === "quote") return await syncQuote(supabase, jobId, body, userId);
  if (type === "invoice") return await syncInvoice(supabase, jobId, body, userId);
  return await syncReceipt(supabase, jobId, body, userId);
}

async function notifyStageOwners(supabase: any, stage: any, jobInfo: any, jobId: string, userId: string, title: string, message: string, type: string) {
  const notifyUserIds = new Set<string>();
  if (stage?.primary_owner_id) notifyUserIds.add(stage.primary_owner_id);
  if (stage?.secondary_owner_id) notifyUserIds.add(stage.secondary_owner_id);
  notifyUserIds.delete(userId);
  if (notifyUserIds.size > 0) {
    const notifications = [...notifyUserIds].map((uid) => ({
      user_id: uid, job_id: jobId, title, message, type,
    }));
    await supabase.from("notifications").insert(notifications);
  }
}

/**
 * Mirrors a synced quote/invoice/receipt into the central finance_documents
 * store so Finance and Client 360 stay correct even when a document is not
 * tied to a stage form.
 */
async function recordFinanceDocument(
  supabase: any,
  jobId: string,
  doc: {
    doc_type: "quote" | "invoice" | "receipt";
    reference: string;
    amount: number;
    currency?: string;
    status?: string;
    issued_at?: string;
    due_date?: string | null;
    document_url?: string | null;
    external_id?: string | null;
    notes?: string | null;
  },
  userId: string,
) {
  const { data: job } = await supabase
    .from("jobs")
    .select("org_id, client_name, account_id, deal_id")
    .eq("id", jobId)
    .single();
  if (!job?.org_id) return;

  const payload = {
    org_id: job.org_id,
    doc_type: doc.doc_type,
    reference: doc.reference,
    external_id: doc.external_id ?? null,
    source: "quote_builder",
    amount: Number(doc.amount) || 0,
    currency: doc.currency || "SZL",
    status: doc.status || "issued",
    issued_at: doc.issued_at || new Date().toISOString().slice(0, 10),
    due_date: doc.due_date || null,
    document_url: doc.document_url || null,
    client_name: job.client_name || null,
    notes: doc.notes || null,
    account_id: job.account_id ?? null,
    deal_id: job.deal_id ?? null,
    job_id: jobId,
    created_by: userId,
    synced_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("finance_documents")
    .upsert(payload, { onConflict: "org_id,doc_type,reference" });
  if (error) console.error("finance_documents upsert failed:", error.message);
}

async function syncQuote(supabase: any, jobId: string, body: any, userId: string) {
  const {
    quote_ref,
    quote_amount,
    vat_amount,
    subtotal,
    total_amount,
    currency,
    validity,
    terms,
    line_items,
    quote_document_url,
    ...extra
  } = body;
  if (!quote_ref || !quote_amount) {
    return new Response(JSON.stringify({ error: "quote_ref and quote_amount are required" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const [stageRes, jobRes] = await Promise.all([
    supabase.from("job_stages").select("id, form_data, primary_owner_id, secondary_owner_id")
      .eq("job_id", jobId).eq("stage", "quotation_preparation").single(),
    supabase.from("jobs").select("job_number, client_name").eq("id", jobId).single(),
  ]);

  const stage = stageRes.data;
  const jobInfo = jobRes.data;

  if (stageRes.error || !stage) {
    return new Response(JSON.stringify({ error: "Quotation stage not found for this job" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const existingData = (stage.form_data as Record<string, any>) || {};
  const normalizedLineItems = Array.isArray(line_items)
    ? line_items.map((li: any, idx: number) => ({
        id: String(li.id ?? idx + 1),
        type: li.type ?? "material",
        description: String(li.description ?? ""),
        qty: Number(li.qty ?? 0),
        unit_price: Number(li.unit_price ?? 0),
        markup_pct: Number(li.markup_pct ?? 0),
      }))
    : existingData.line_items;
  const updatedFormData = {
    ...existingData,
    ...extra,
    quote_ref: String(quote_ref),
    quote_amount: String(quote_amount),
    vat_amount: vat_amount != null ? String(vat_amount) : existingData.vat_amount,
    subtotal: subtotal != null ? String(subtotal) : existingData.subtotal,
    total_amount: total_amount != null ? String(total_amount) : existingData.total_amount,
    currency: currency || existingData.currency || "ZAR",
    validity: validity || existingData.validity,
    terms: terms || existingData.terms,
    line_items: normalizedLineItems,
    quote_document_url: quote_document_url || existingData.quote_document_url,
    api_synced_at: new Date().toISOString(),
    api_synced_by: "quote_builder",
    quote_saved: true,
    quote_saved_at: new Date().toISOString(),
  };

  // Bump status to pending_approval so the SOP pipeline visibly advances.
  const { data: currentStage } = await supabase
    .from("job_stages").select("status").eq("id", stage.id).single();
  const nextStatus =
    currentStage?.status === "active" ? "pending_approval" : currentStage?.status;

  const { error: updateErr } = await supabase
    .from("job_stages")
    .update({ form_data: updatedFormData, status: nextStatus })
    .eq("id", stage.id);

  if (updateErr) {
    return new Response(JSON.stringify({ error: "Failed to update quotation stage" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  await supabase.from("audit_log").insert({
    user_id: userId, job_id: jobId, action: "quote_builder_sync",
    stage: "quotation_preparation",
    details: { quote_ref, quote_amount, synced_at: new Date().toISOString() },
  });

  const jobLabel = jobInfo ? `${jobInfo.job_number} (${jobInfo.client_name})` : jobId;
  await notifyStageOwners(supabase, stage, jobInfo, jobId, userId, "Quote Synced",
    `Quote "${quote_ref}" (R ${parseFloat(quote_amount).toFixed(2)}) synced for ${jobLabel}.`, "quote_sync");

  await recordFinanceDocument(supabase, jobId, {
    doc_type: "quote",
    reference: String(quote_ref),
    amount: Number(total_amount ?? quote_amount),
    currency,
    document_url: quote_document_url || null,
  }, userId);

  return new Response(JSON.stringify({ success: true, type: "quote", stage_id: stage.id }), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function syncInvoice(supabase: any, jobId: string, body: any, userId: string) {
  const { invoice_number, invoice_amount, due_date, invoice_document_url, ...extra } = body;
  if (!invoice_number || !invoice_amount) {
    return new Response(JSON.stringify({ error: "invoice_number and invoice_amount are required" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const [stageRes, jobRes] = await Promise.all([
    supabase.from("job_stages").select("id, form_data, primary_owner_id, secondary_owner_id")
      .eq("job_id", jobId).eq("stage", "invoicing").single(),
    supabase.from("jobs").select("job_number, client_name").eq("id", jobId).single(),
  ]);

  const stage = stageRes.data;
  const jobInfo = jobRes.data;
  if (stageRes.error || !stage) {
    return new Response(JSON.stringify({ error: "Invoicing stage not found for this job" }), {
      status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const existingData = (stage.form_data as Record<string, any>) || {};
  const updatedFormData = {
    ...existingData,
    invoice_number,
    invoice_amount: String(invoice_amount),
    due_date: due_date || existingData.due_date,
    invoice_document_url: invoice_document_url || existingData.invoice_document_url,
    invoice_sent: true,
    api_synced_at: new Date().toISOString(),
    api_synced_by: "quote_builder",
    ...extra,
  };

  const { error: updateErr } = await supabase
    .from("job_stages").update({ form_data: updatedFormData }).eq("id", stage.id);
  if (updateErr) {
    return new Response(JSON.stringify({ error: "Failed to update invoicing stage" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  await supabase.from("audit_log").insert({
    user_id: userId, job_id: jobId, action: "invoice_builder_sync",
    stage: "invoicing",
    details: { invoice_number, invoice_amount, synced_at: new Date().toISOString() },
  });

  const jobLabel = jobInfo ? `${jobInfo.job_number} (${jobInfo.client_name})` : jobId;
  await notifyStageOwners(supabase, stage, jobInfo, jobId, userId, "Invoice Synced",
    `Invoice "${invoice_number}" (R ${parseFloat(invoice_amount).toFixed(2)}) synced for ${jobLabel}.`, "invoice_sync");

  await recordFinanceDocument(supabase, jobId, {
    doc_type: "invoice",
    reference: String(invoice_number),
    amount: Number(invoice_amount),
    due_date: due_date || null,
    document_url: invoice_document_url || null,
  }, userId);

  return new Response(JSON.stringify({ success: true, type: "invoice", stage_id: stage.id }), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function syncReceipt(supabase: any, jobId: string, body: any, userId: string) {
  const { receipt_number, amount, paid_at, method, reference, proof_url, payment_type, notes } = body;
  if (!amount || !paid_at) {
    return new Response(JSON.stringify({ error: "amount and paid_at are required" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Idempotency: skip if a payment with this receipt reference already exists for this job
  const refKey = receipt_number || reference;
  if (refKey) {
    const { data: existing } = await supabase
      .from("job_payments").select("id").eq("job_id", jobId).eq("reference", refKey).limit(1);
    if (existing && existing.length > 0) {
      return new Response(JSON.stringify({ success: true, type: "receipt", duplicate: true, payment_id: existing[0].id }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  const { data: paymentRow, error: payErr } = await supabase.from("job_payments").insert({
    job_id: jobId,
    amount: Number(amount),
    paid_at,
    method: method || "external",
    reference: refKey || null,
    proof_url: proof_url || null,
    payment_type: payment_type || "final",
    notes: notes || "Synced from external Quote Builder",
    recorded_by: userId,
  }).select("id").single();

  if (payErr) {
    return new Response(JSON.stringify({ error: "Failed to record receipt", details: payErr.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // If this is a final receipt, mark project_closure final_payment_received
  const [closureRes, jobRes] = await Promise.all([
    supabase.from("job_stages").select("id, form_data, primary_owner_id, secondary_owner_id")
      .eq("job_id", jobId).eq("stage", "project_closure").single(),
    supabase.from("jobs").select("job_number, client_name").eq("id", jobId).single(),
  ]);

  if (closureRes.data && (payment_type || "final") === "final") {
    const existingData = (closureRes.data.form_data as Record<string, any>) || {};
    await supabase.from("job_stages").update({
      form_data: {
        ...existingData,
        final_payment_received: true,
        final_receipt_number: refKey || existingData.final_receipt_number,
        final_receipt_synced_at: new Date().toISOString(),
      },
    }).eq("id", closureRes.data.id);
  }

  await supabase.from("audit_log").insert({
    user_id: userId, job_id: jobId, action: "receipt_builder_sync",
    stage: "project_closure",
    details: { receipt_number: refKey, amount, paid_at },
  });

  const jobInfo = jobRes.data;
  const jobLabel = jobInfo ? `${jobInfo.job_number} (${jobInfo.client_name})` : jobId;
  await notifyStageOwners(supabase, closureRes.data, jobInfo, jobId, userId, "Receipt Synced",
    `Payment of R ${Number(amount).toFixed(2)} recorded for ${jobLabel}.`, "receipt_sync");

  if (refKey) {
    await recordFinanceDocument(supabase, jobId, {
      doc_type: "receipt",
      reference: String(refKey),
      amount: Number(amount),
      status: "paid",
      issued_at: String(paid_at).slice(0, 10),
      document_url: proof_url || null,
    }, userId);
  }

  return new Response(JSON.stringify({ success: true, type: "receipt", payment_id: paymentRow.id }), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
