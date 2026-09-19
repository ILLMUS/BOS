ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS campaigns_deleted_at_idx ON public.campaigns (org_id, deleted_at);