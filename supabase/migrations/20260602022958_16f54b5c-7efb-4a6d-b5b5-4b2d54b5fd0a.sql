-- Insert invoicing stage into fabrication pipeline between fabrication_installation and project_closure
-- Backfill existing fabrication jobs with a locked invoicing stage record (if missing)
INSERT INTO public.job_stages (job_id, stage, status)
SELECT j.id, 'invoicing'::job_stage, 'locked'::stage_status
FROM public.jobs j
WHERE j.job_category = 'fabrication'
  AND NOT EXISTS (
    SELECT 1 FROM public.job_stages js
    WHERE js.job_id = j.id AND js.stage = 'invoicing'::job_stage
  );

-- Stage assignment for invoicing -> accounts_admin
INSERT INTO public.stage_assignments (stage, primary_role, secondary_role)
SELECT 'invoicing'::job_stage, 'accounts_admin'::app_role, 'owner_director'::app_role
WHERE NOT EXISTS (
  SELECT 1 FROM public.stage_assignments WHERE stage = 'invoicing'::job_stage
);

-- SLA default for invoicing
INSERT INTO public.sla_defaults (stage, deadline_hours)
SELECT 'invoicing'::job_stage, 48
WHERE NOT EXISTS (
  SELECT 1 FROM public.sla_defaults WHERE stage = 'invoicing'::job_stage
);