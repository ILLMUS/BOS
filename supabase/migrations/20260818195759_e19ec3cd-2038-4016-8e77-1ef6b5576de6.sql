CREATE TABLE public.job_qc_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  item_key text NOT NULL,
  label text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  is_checked boolean NOT NULL DEFAULT false,
  notes text,
  checked_by uuid,
  checked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (job_id, item_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_qc_items TO authenticated;
GRANT ALL ON public.job_qc_items TO service_role;

ALTER TABLE public.job_qc_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members manage QC items"
ON public.job_qc_items
FOR ALL
TO authenticated
USING (public.is_org_member(org_id))
WITH CHECK (public.is_org_member(org_id));

CREATE TRIGGER update_job_qc_items_updated_at
BEFORE UPDATE ON public.job_qc_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_job_qc_items_job ON public.job_qc_items(job_id);