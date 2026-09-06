
-- Add SLA columns to job_stages
ALTER TABLE public.job_stages 
  ADD COLUMN sla_deadline_hours integer,
  ADD COLUMN sla_started_at timestamp with time zone;

-- Add tracking token to jobs
ALTER TABLE public.jobs
  ADD COLUMN tracking_token text UNIQUE;

-- Create index on tracking token for fast lookups
CREATE INDEX idx_jobs_tracking_token ON public.jobs (tracking_token) WHERE tracking_token IS NOT NULL;

-- Function to set SLA defaults based on stage
CREATE OR REPLACE FUNCTION public.set_sla_defaults()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.sla_deadline_hours IS NULL THEN
    NEW.sla_deadline_hours := CASE NEW.stage
      WHEN 'lead_entry' THEN 24
      WHEN 'lead_qualification' THEN 24
      WHEN 'site_visit_authorization' THEN 48
      WHEN 'site_assessment' THEN 72
      WHEN 'job_scoping' THEN 48
      WHEN 'costing' THEN 72
      WHEN 'quotation_preparation' THEN 72
      WHEN 'quote_submission' THEN 24
      WHEN 'client_approval' THEN 120
      WHEN 'fabrication_order' THEN 48
      WHEN 'fabrication_installation' THEN 240
      WHEN 'project_closure' THEN 48
      ELSE 48
    END;
  END IF;
  
  -- Set sla_started_at when stage becomes active
  IF NEW.status = 'active' AND (OLD IS NULL OR OLD.status IS DISTINCT FROM 'active') THEN
    NEW.sla_started_at := now();
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_sla_defaults
  BEFORE INSERT OR UPDATE ON public.job_stages
  FOR EACH ROW
  EXECUTE FUNCTION public.set_sla_defaults();

-- Function to generate tracking token
CREATE OR REPLACE FUNCTION public.generate_tracking_token()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.tracking_token IS NULL THEN
    NEW.tracking_token := encode(gen_random_bytes(16), 'hex');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_generate_tracking_token
  BEFORE INSERT ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_tracking_token();

-- Backfill existing jobs with tracking tokens
UPDATE public.jobs SET tracking_token = encode(gen_random_bytes(16), 'hex') WHERE tracking_token IS NULL;

-- Backfill SLA defaults for existing stages
UPDATE public.job_stages SET sla_deadline_hours = CASE stage
  WHEN 'lead_entry' THEN 24
  WHEN 'lead_qualification' THEN 24
  WHEN 'site_visit_authorization' THEN 48
  WHEN 'site_assessment' THEN 72
  WHEN 'job_scoping' THEN 48
  WHEN 'costing' THEN 72
  WHEN 'quotation_preparation' THEN 72
  WHEN 'quote_submission' THEN 24
  WHEN 'client_approval' THEN 120
  WHEN 'fabrication_order' THEN 48
  WHEN 'fabrication_installation' THEN 240
  WHEN 'project_closure' THEN 48
  ELSE 48
END WHERE sla_deadline_hours IS NULL;

-- Set sla_started_at for currently active stages
UPDATE public.job_stages SET sla_started_at = updated_at WHERE status = 'active' AND sla_started_at IS NULL;

-- Public function to get job by tracking token (no auth needed)
CREATE OR REPLACE FUNCTION public.get_job_by_tracking_token(_token text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _job RECORD;
  _stages json;
BEGIN
  SELECT * INTO _job FROM public.jobs WHERE tracking_token = _token AND status != 'cancelled';
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT json_agg(row_to_json(s) ORDER BY s.created_at) INTO _stages
  FROM (
    SELECT stage, status, notes, form_data, sla_deadline_hours, sla_started_at, approved_at, created_at, updated_at
    FROM public.job_stages WHERE job_id = _job.id
  ) s;

  RETURN json_build_object(
    'id', _job.id,
    'job_number', _job.job_number,
    'client_name', _job.client_name,
    'service_type', _job.service_type,
    'status', _job.status,
    'current_stage', _job.current_stage,
    'created_at', _job.created_at,
    'stages', _stages
  );
END;
$$;
