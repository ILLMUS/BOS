
-- Create sla_defaults table
CREATE TABLE public.sla_defaults (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stage public.job_stage NOT NULL UNIQUE,
  deadline_hours integer NOT NULL DEFAULT 48,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.sla_defaults ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view sla defaults"
ON public.sla_defaults FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage sla defaults"
ON public.sla_defaults FOR ALL
USING (is_admin_or_owner(auth.uid()));

-- Seed with current defaults
INSERT INTO public.sla_defaults (stage, deadline_hours) VALUES
  ('lead_entry', 24),
  ('lead_qualification', 24),
  ('site_visit_authorization', 48),
  ('site_assessment', 72),
  ('job_scoping', 48),
  ('costing', 72),
  ('quotation_preparation', 72),
  ('quote_submission', 24),
  ('client_approval', 120),
  ('fabrication_order', 48),
  ('fabrication_installation', 240),
  ('project_closure', 48);

-- Update trigger to read from sla_defaults table
CREATE OR REPLACE FUNCTION public.set_sla_defaults()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  _deadline integer;
BEGIN
  IF NEW.sla_deadline_hours IS NULL THEN
    SELECT deadline_hours INTO _deadline
    FROM public.sla_defaults WHERE stage = NEW.stage;
    
    NEW.sla_deadline_hours := COALESCE(_deadline, 48);
  END IF;
  
  IF NEW.status = 'active' AND (OLD IS NULL OR OLD.status IS DISTINCT FROM 'active') THEN
    NEW.sla_started_at := now();
  END IF;
  
  RETURN NEW;
END;
$function$;
