CREATE TABLE public.finance_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  doc_type text NOT NULL CHECK (doc_type IN ('quote','invoice','receipt')),
  reference text NOT NULL,
  external_id text,
  source text NOT NULL DEFAULT 'manual',
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'SZL',
  status text NOT NULL DEFAULT 'issued',
  issued_at date NOT NULL DEFAULT CURRENT_DATE,
  due_date date,
  document_url text,
  client_name text,
  notes text,
  account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
  deal_id uuid REFERENCES public.deals(id) ON DELETE SET NULL,
  job_id uuid REFERENCES public.jobs(id) ON DELETE SET NULL,
  created_by uuid,
  synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX finance_documents_unique_ref
  ON public.finance_documents (org_id, doc_type, reference);
CREATE INDEX finance_documents_org_idx ON public.finance_documents (org_id, issued_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_documents TO authenticated;
GRANT ALL ON public.finance_documents TO service_role;

ALTER TABLE public.finance_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members manage finance documents"
  ON public.finance_documents FOR ALL TO authenticated
  USING (public.is_org_member(org_id))
  WITH CHECK (public.is_org_member(org_id));

CREATE TRIGGER tg_finance_documents_updated
  BEFORE UPDATE ON public.finance_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();