ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS industry text,
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS employee_count text,
  ADD COLUMN IF NOT EXISTS main_services text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.setup_workspace(
  _name text,
  _job_prefix text DEFAULT NULL,
  _industry text DEFAULT NULL,
  _location text DEFAULT NULL,
  _employee_count text DEFAULT NULL,
  _main_services text DEFAULT NULL,
  _description text DEFAULT NULL,
  _roles text[] DEFAULT NULL,
  _workflow_name text DEFAULT NULL,
  _steps text[] DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _org_id uuid;
  _template_id uuid;
  _role text;
  _step text;
  _i int := 0;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  _org_id := public.create_organization(_name, _job_prefix);

  UPDATE public.organizations SET
    industry = _industry,
    location = _location,
    employee_count = _employee_count,
    main_services = _main_services,
    description = _description,
    onboarding_completed = true
  WHERE id = _org_id;

  IF _roles IS NOT NULL THEN
    FOREACH _role IN ARRAY _roles LOOP
      IF btrim(_role) <> '' THEN
        INSERT INTO public.org_roles (org_id, name, is_admin)
        VALUES (_org_id, btrim(_role), false);
      END IF;
    END LOOP;
  END IF;

  IF _steps IS NOT NULL AND array_length(_steps, 1) > 0 THEN
    INSERT INTO public.sop_templates (org_id, name, description, industry, is_active, created_by)
    VALUES (_org_id, COALESCE(NULLIF(btrim(_workflow_name), ''), 'Main Workflow'), _description, _industry, true, _uid)
    RETURNING id INTO _template_id;

    FOREACH _step IN ARRAY _steps LOOP
      IF btrim(_step) <> '' THEN
        INSERT INTO public.sop_stages (org_id, template_id, position, name)
        VALUES (_org_id, _template_id, _i, btrim(_step));
        _i := _i + 1;
      END IF;
    END LOOP;
  END IF;

  RETURN _org_id;
END;
$$;