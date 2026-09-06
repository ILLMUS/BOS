ALTER TABLE public.finance_documents
  ADD COLUMN IF NOT EXISTS is_example boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS finance_documents_is_example_idx
  ON public.finance_documents (org_id, is_example);