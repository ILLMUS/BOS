import { supabase } from "@/integrations/supabase/client";

/** The two parties on any money document: who is billing, and who is billed. */
export interface Party {
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
}

export interface JobPartyDetails {
  jobId: string;
  orgId: string | null;
  jobNumber: string | null;
  serviceType: string | null;
  accountId: string | null;
  dealId: string | null;
  /** The client being billed, merged from the job, its client record and the main contact. */
  customer: Party;
  /** The business issuing the document (this workspace). */
  supplier: Party;
}

const pick = (...values: Array<string | null | undefined>) =>
  values.find((v) => v && String(v).trim().length > 0) ?? null;

/**
 * Collects every client detail captured earlier in the workflow (job intake,
 * client record, main contact) plus the issuing business, so quotation,
 * invoice and receipt forms never need re-typing.
 */
export async function fetchJobPartyDetails(jobId: string): Promise<JobPartyDetails | null> {
  const { data: job } = await supabase
    .from("jobs")
    .select("id, org_id, job_number, service_type, account_id, deal_id, client_name, client_email, client_phone, client_location")
    .eq("id", jobId)
    .maybeSingle();
  if (!job) return null;

  const [{ data: account }, { data: contacts }, { data: org }] = await Promise.all([
    job.account_id
      ? supabase.from("accounts").select("name, email, phone, location").eq("id", job.account_id).maybeSingle()
      : Promise.resolve({ data: null as any }),
    job.account_id
      ? supabase.from("contacts").select("full_name, email, phone, is_primary")
          .eq("account_id", job.account_id).order("is_primary", { ascending: false }).limit(1)
      : Promise.resolve({ data: [] as any[] }),
    job.org_id
      ? supabase.from("organizations").select("name, location").eq("id", job.org_id).maybeSingle()
      : Promise.resolve({ data: null as any }),
  ]);

  const contact = (contacts || [])[0];

  return {
    jobId: job.id,
    orgId: job.org_id,
    jobNumber: job.job_number,
    serviceType: job.service_type,
    accountId: job.account_id,
    dealId: job.deal_id,
    customer: {
      name: pick(job.client_name, account?.name, contact?.full_name) || "Client",
      email: pick(job.client_email, account?.email, contact?.email),
      phone: pick(job.client_phone, account?.phone, contact?.phone),
      address: pick(job.client_location, account?.location),
    },
    supplier: {
      name: org?.name || "Our business",
      address: org?.location || null,
    },
  };
}
