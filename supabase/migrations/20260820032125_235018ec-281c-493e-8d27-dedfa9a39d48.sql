CREATE TABLE public.document_sync_status (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL DEFAULT 0,
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  destination_url TEXT,
  error_message TEXT,
  queued_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_attempt_at TIMESTAMP WITH TIME ZONE,
  synced_at TIMESTAMP WITH TIME ZONE,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT document_sync_status_status_check CHECK (status IN ('queued','syncing','synced','failed')),
  CONSTRAINT document_sync_status_unique_path UNIQUE (org_id, file_path)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_sync_status TO authenticated;
GRANT ALL ON public.document_sync_status TO service_role;

ALTER TABLE public.document_sync_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members manage document sync status"
ON public.document_sync_status
FOR ALL
TO authenticated
USING (public.is_org_member(org_id))
WITH CHECK (public.is_org_member(org_id));

CREATE TRIGGER update_document_sync_status_updated_at
BEFORE UPDATE ON public.document_sync_status
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();