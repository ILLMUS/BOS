
-- Function: when a job's stages are created, assign owners based on stage_assignments + user_roles
CREATE OR REPLACE FUNCTION public.assign_stage_owners()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _assignment RECORD;
  _primary_user_id uuid;
  _secondary_user_id uuid;
BEGIN
  SELECT primary_role, secondary_role INTO _assignment
  FROM public.stage_assignments
  WHERE stage = NEW.stage;

  IF FOUND THEN
    SELECT ur.user_id INTO _primary_user_id
    FROM public.user_roles ur
    WHERE ur.role = _assignment.primary_role
    LIMIT 1;

    IF _assignment.secondary_role IS NOT NULL THEN
      SELECT ur.user_id INTO _secondary_user_id
      FROM public.user_roles ur
      WHERE ur.role = _assignment.secondary_role
      LIMIT 1;
    END IF;

    NEW.primary_owner_id := _primary_user_id;
    NEW.secondary_owner_id := _secondary_user_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_assign_stage_owners
BEFORE INSERT ON public.job_stages
FOR EACH ROW
EXECUTE FUNCTION public.assign_stage_owners();

-- Function: notify stage owners when a stage becomes active
CREATE OR REPLACE FUNCTION public.notify_stage_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _job RECORD;
BEGIN
  IF NEW.status = 'active' AND (OLD.status IS DISTINCT FROM 'active') THEN
    SELECT job_number, client_name INTO _job
    FROM public.jobs WHERE id = NEW.job_id;

    IF NEW.primary_owner_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, job_id, title, message, type)
      VALUES (
        NEW.primary_owner_id,
        NEW.job_id,
        'Stage Assigned: ' || replace(initcap(replace(NEW.stage::text, '_', ' ')), ' ', ' '),
        'Job ' || _job.job_number || ' (' || _job.client_name || ') is now ready for your action.',
        'stage_active'
      );
    END IF;

    IF NEW.secondary_owner_id IS NOT NULL AND NEW.secondary_owner_id IS DISTINCT FROM NEW.primary_owner_id THEN
      INSERT INTO public.notifications (user_id, job_id, title, message, type)
      VALUES (
        NEW.secondary_owner_id,
        NEW.job_id,
        'Stage Assigned: ' || replace(initcap(replace(NEW.stage::text, '_', ' ')), ' ', ' '),
        'Job ' || _job.job_number || ' (' || _job.client_name || ') is now ready for your action.',
        'stage_active'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_stage_owner
AFTER UPDATE ON public.job_stages
FOR EACH ROW
EXECUTE FUNCTION public.notify_stage_owner();
