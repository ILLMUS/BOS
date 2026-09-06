ALTER TABLE public.sop_templates
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS root_template_id uuid,
  ADD COLUMN IF NOT EXISTS parent_template_id uuid,
  ADD COLUMN IF NOT EXISTS is_locked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS version_notes text;

UPDATE public.sop_templates SET root_template_id = id WHERE root_template_id IS NULL;

ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS template_version integer;

UPDATE public.jobs j SET template_version = t.version
FROM public.sop_templates t
WHERE t.id = j.template_id AND j.template_version IS NULL;

CREATE INDEX IF NOT EXISTS idx_sop_templates_root ON public.sop_templates(root_template_id);

CREATE OR REPLACE FUNCTION public.create_template_version(_template_id uuid, _notes text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _src RECORD;
  _new_id uuid;
  _root uuid;
  _next int;
  _stage RECORD;
  _new_stage_id uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO _src FROM public.sop_templates WHERE id = _template_id;
  IF _src IS NULL THEN RAISE EXCEPTION 'Workflow not found'; END IF;
  IF NOT public.is_org_member(_src.org_id) THEN RAISE EXCEPTION 'Not a member of this organization'; END IF;

  _root := COALESCE(_src.root_template_id, _src.id);
  SELECT COALESCE(MAX(version), 0) + 1 INTO _next
  FROM public.sop_templates WHERE COALESCE(root_template_id, id) = _root;

  INSERT INTO public.sop_templates (org_id, name, description, industry, is_active, is_published, created_by, version, root_template_id, parent_template_id, version_notes)
  VALUES (_src.org_id, _src.name, _src.description, _src.industry, _src.is_active, _src.is_published, _uid, _next, _root, _src.id, _notes)
  RETURNING id INTO _new_id;

  FOR _stage IN SELECT * FROM public.sop_stages WHERE template_id = _template_id ORDER BY position, created_at LOOP
    INSERT INTO public.sop_stages (org_id, template_id, position, name, description, primary_role_id, secondary_role_id, sla_hours, requires_approval)
    VALUES (_src.org_id, _new_id, _stage.position, _stage.name, _stage.description, _stage.primary_role_id, _stage.secondary_role_id, _stage.sla_hours, _stage.requires_approval)
    RETURNING id INTO _new_stage_id;

    INSERT INTO public.sop_fields (org_id, stage_id, position, field_key, label, field_type, required, placeholder, help_text, options)
    SELECT _src.org_id, _new_stage_id, position, field_key, label, field_type, required, placeholder, help_text, options
    FROM public.sop_fields WHERE stage_id = _stage.id ORDER BY position;
  END LOOP;

  UPDATE public.sop_templates SET is_locked = true, is_active = false WHERE id = _template_id;

  RETURN _new_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_job_from_template(_template_id uuid, _client_name text, _client_phone text DEFAULT NULL::text, _client_email text DEFAULT NULL::text, _client_location text DEFAULT NULL::text, _service_type text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _org_id uuid;
  _version int;
  _job_id uuid;
  _stage RECORD;
  _first_stage_id uuid;
  _idx int := 0;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT org_id, version INTO _org_id, _version FROM public.sop_templates WHERE id = _template_id;
  IF _org_id IS NULL THEN RAISE EXCEPTION 'Template not found'; END IF;
  IF NOT public.is_org_member(_org_id) THEN RAISE EXCEPTION 'Not a member of this organization'; END IF;

  INSERT INTO public.jobs (client_name, client_phone, client_email, client_location, service_type, created_by, org_id, template_id, template_version, job_number)
  VALUES (_client_name, _client_phone, _client_email, _client_location, _service_type, _uid, _org_id, _template_id, _version, 'PENDING')
  RETURNING id INTO _job_id;

  FOR _stage IN
    SELECT * FROM public.sop_stages WHERE template_id = _template_id ORDER BY position, created_at
  LOOP
    INSERT INTO public.job_stages (job_id, sop_stage_id, stage_name, position, status, sla_deadline_hours)
    VALUES (_job_id, _stage.id, _stage.name, _idx,
      CASE WHEN _idx = 0 THEN 'active'::stage_status ELSE 'locked'::stage_status END,
      _stage.sla_hours);
    IF _idx = 0 THEN _first_stage_id := _stage.id; END IF;
    _idx := _idx + 1;
  END LOOP;

  IF _idx = 0 THEN RAISE EXCEPTION 'This SOP template has no stages yet'; END IF;

  UPDATE public.jobs SET current_sop_stage_id = _first_stage_id WHERE id = _job_id;
  RETURN _job_id;
END;
$function$;