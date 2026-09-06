-- 1. Custom per-org roles
CREATE TABLE public.org_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  is_admin boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.org_roles TO authenticated;
GRANT ALL ON public.org_roles TO service_role;
ALTER TABLE public.org_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read org_roles" ON public.org_roles FOR SELECT TO authenticated USING (public.is_org_member(org_id));
CREATE POLICY "admins manage org_roles" ON public.org_roles FOR ALL TO authenticated USING (public.is_org_admin(org_id)) WITH CHECK (public.is_org_admin(org_id));
CREATE TRIGGER tg_org_roles_updated BEFORE UPDATE ON public.org_roles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Assignment of users to custom roles
CREATE TABLE public.user_org_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_role_id uuid NOT NULL REFERENCES public.org_roles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, org_role_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_org_roles TO authenticated;
GRANT ALL ON public.user_org_roles TO service_role;
ALTER TABLE public.user_org_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read user_org_roles" ON public.user_org_roles FOR SELECT TO authenticated USING (public.is_org_member(org_id));
CREATE POLICY "admins manage user_org_roles" ON public.user_org_roles FOR ALL TO authenticated USING (public.is_org_admin(org_id)) WITH CHECK (public.is_org_admin(org_id));

-- 3. SOP templates
CREATE TABLE public.sop_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  industry text,
  is_active boolean NOT NULL DEFAULT false,
  is_published boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sop_templates TO authenticated;
GRANT ALL ON public.sop_templates TO service_role;
ALTER TABLE public.sop_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read sop_templates" ON public.sop_templates FOR SELECT TO authenticated USING (public.is_org_member(org_id));
CREATE POLICY "admins manage sop_templates" ON public.sop_templates FOR ALL TO authenticated USING (public.is_org_admin(org_id)) WITH CHECK (public.is_org_admin(org_id));
CREATE TRIGGER tg_sop_templates_updated BEFORE UPDATE ON public.sop_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. SOP stages
CREATE TABLE public.sop_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES public.sop_templates(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  name text NOT NULL,
  description text,
  primary_role_id uuid REFERENCES public.org_roles(id) ON DELETE SET NULL,
  secondary_role_id uuid REFERENCES public.org_roles(id) ON DELETE SET NULL,
  sla_hours integer NOT NULL DEFAULT 48,
  requires_approval boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sop_stages TO authenticated;
GRANT ALL ON public.sop_stages TO service_role;
ALTER TABLE public.sop_stages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read sop_stages" ON public.sop_stages FOR SELECT TO authenticated USING (public.is_org_member(org_id));
CREATE POLICY "admins manage sop_stages" ON public.sop_stages FOR ALL TO authenticated USING (public.is_org_admin(org_id)) WITH CHECK (public.is_org_admin(org_id));
CREATE TRIGGER tg_sop_stages_updated BEFORE UPDATE ON public.sop_stages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. SOP custom fields
CREATE TABLE public.sop_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  stage_id uuid NOT NULL REFERENCES public.sop_stages(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  field_key text NOT NULL,
  label text NOT NULL,
  field_type text NOT NULL DEFAULT 'text',
  required boolean NOT NULL DEFAULT false,
  placeholder text,
  help_text text,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (stage_id, field_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sop_fields TO authenticated;
GRANT ALL ON public.sop_fields TO service_role;
ALTER TABLE public.sop_fields ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read sop_fields" ON public.sop_fields FOR SELECT TO authenticated USING (public.is_org_member(org_id));
CREATE POLICY "admins manage sop_fields" ON public.sop_fields FOR ALL TO authenticated USING (public.is_org_admin(org_id)) WITH CHECK (public.is_org_admin(org_id));
CREATE TRIGGER tg_sop_fields_updated BEFORE UPDATE ON public.sop_fields FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Wire jobs / job_stages to custom SOPs
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS template_id uuid REFERENCES public.sop_templates(id) ON DELETE SET NULL;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS current_sop_stage_id uuid REFERENCES public.sop_stages(id) ON DELETE SET NULL;

ALTER TABLE public.job_stages ADD COLUMN IF NOT EXISTS sop_stage_id uuid REFERENCES public.sop_stages(id) ON DELETE SET NULL;
ALTER TABLE public.job_stages ADD COLUMN IF NOT EXISTS stage_name text;
ALTER TABLE public.job_stages ADD COLUMN IF NOT EXISTS position integer NOT NULL DEFAULT 0;
ALTER TABLE public.job_stages ALTER COLUMN stage DROP NOT NULL;

-- 7. Make legacy triggers tolerant of custom (enum-less) stages
CREATE OR REPLACE FUNCTION public.assign_stage_owners()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  _assignment RECORD;
  _primary_user_id uuid;
  _secondary_user_id uuid;
  _org_id uuid;
  _sop RECORD;
BEGIN
  SELECT org_id INTO _org_id FROM public.jobs WHERE id = NEW.job_id;

  IF NEW.sop_stage_id IS NOT NULL THEN
    SELECT primary_role_id, secondary_role_id INTO _sop
    FROM public.sop_stages WHERE id = NEW.sop_stage_id;

    IF _sop.primary_role_id IS NOT NULL THEN
      SELECT user_id INTO _primary_user_id FROM public.user_org_roles
      WHERE org_role_id = _sop.primary_role_id AND org_id = _org_id LIMIT 1;
    END IF;
    IF _sop.secondary_role_id IS NOT NULL THEN
      SELECT user_id INTO _secondary_user_id FROM public.user_org_roles
      WHERE org_role_id = _sop.secondary_role_id AND org_id = _org_id LIMIT 1;
    END IF;

    NEW.primary_owner_id := COALESCE(NEW.primary_owner_id, _primary_user_id);
    NEW.secondary_owner_id := COALESCE(NEW.secondary_owner_id, _secondary_user_id);
    RETURN NEW;
  END IF;

  IF NEW.stage IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT primary_role, secondary_role INTO _assignment
  FROM public.stage_assignments
  WHERE stage = NEW.stage AND org_id = _org_id;

  IF FOUND THEN
    SELECT ur.user_id INTO _primary_user_id
    FROM public.user_roles ur
    WHERE ur.role = _assignment.primary_role AND ur.org_id = _org_id LIMIT 1;

    IF _assignment.secondary_role IS NOT NULL THEN
      SELECT ur.user_id INTO _secondary_user_id
      FROM public.user_roles ur
      WHERE ur.role = _assignment.secondary_role AND ur.org_id = _org_id LIMIT 1;
    END IF;

    NEW.primary_owner_id := _primary_user_id;
    NEW.secondary_owner_id := _secondary_user_id;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_sla_defaults()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
DECLARE _deadline integer; _org_id uuid;
BEGIN
  IF NEW.sla_deadline_hours IS NULL THEN
    IF NEW.sop_stage_id IS NOT NULL THEN
      SELECT sla_hours INTO _deadline FROM public.sop_stages WHERE id = NEW.sop_stage_id;
    ELSIF NEW.stage IS NOT NULL THEN
      SELECT org_id INTO _org_id FROM public.jobs WHERE id = NEW.job_id;
      SELECT deadline_hours INTO _deadline
      FROM public.sla_defaults WHERE stage = NEW.stage AND org_id = _org_id;
    END IF;
    NEW.sla_deadline_hours := COALESCE(_deadline, 48);
  END IF;

  IF NEW.status = 'active' AND (OLD IS NULL OR OLD.status IS DISTINCT FROM 'active') THEN
    NEW.sla_started_at := now();
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_stage_owner()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  _job RECORD;
  _label text;
BEGIN
  IF NEW.status = 'active' AND (OLD.status IS DISTINCT FROM 'active') THEN
    SELECT job_number, client_name INTO _job FROM public.jobs WHERE id = NEW.job_id;
    _label := COALESCE(NEW.stage_name, initcap(replace(NEW.stage::text, '_', ' ')), 'Step');

    IF NEW.primary_owner_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, job_id, title, message, type)
      VALUES (NEW.primary_owner_id, NEW.job_id, 'Stage Assigned: ' || _label,
        'Job ' || _job.job_number || ' (' || _job.client_name || ') is now ready for your action.', 'stage_active');
    END IF;

    IF NEW.secondary_owner_id IS NOT NULL AND NEW.secondary_owner_id IS DISTINCT FROM NEW.primary_owner_id THEN
      INSERT INTO public.notifications (user_id, job_id, title, message, type)
      VALUES (NEW.secondary_owner_id, NEW.job_id, 'Stage Assigned: ' || _label,
        'Job ' || _job.job_number || ' (' || _job.client_name || ') is now ready for your action.', 'stage_active');
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- 8. Create a job from a custom SOP template (atomic)
CREATE OR REPLACE FUNCTION public.create_job_from_template(
  _template_id uuid,
  _client_name text,
  _client_phone text DEFAULT NULL,
  _client_email text DEFAULT NULL,
  _client_location text DEFAULT NULL,
  _service_type text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _org_id uuid;
  _job_id uuid;
  _stage RECORD;
  _first_stage_id uuid;
  _idx int := 0;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT org_id INTO _org_id FROM public.sop_templates WHERE id = _template_id;
  IF _org_id IS NULL THEN RAISE EXCEPTION 'Template not found'; END IF;
  IF NOT public.is_org_member(_org_id) THEN RAISE EXCEPTION 'Not a member of this organization'; END IF;

  INSERT INTO public.jobs (client_name, client_phone, client_email, client_location, service_type, created_by, org_id, template_id, job_number)
  VALUES (_client_name, _client_phone, _client_email, _client_location, _service_type, _uid, _org_id, _template_id, 'PENDING')
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

-- 9. New organizations no longer get the hardcoded fabrication pipeline
CREATE OR REPLACE FUNCTION public.create_organization(_name text, _job_prefix text DEFAULT NULL::text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _org_id uuid;
  _slug text;
  _base_slug text;
  _prefix text;
  _n int := 0;
  _admin_role_id uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _name IS NULL OR btrim(_name) = '' THEN RAISE EXCEPTION 'Company name is required'; END IF;

  _base_slug := btrim(regexp_replace(lower(btrim(_name)), '[^a-z0-9]+', '-', 'g'), '-');
  IF _base_slug = '' THEN _base_slug := 'org'; END IF;
  _slug := _base_slug;
  WHILE EXISTS (SELECT 1 FROM public.organizations WHERE slug = _slug) LOOP
    _n := _n + 1;
    _slug := _base_slug || '-' || _n;
  END LOOP;

  _prefix := upper(regexp_replace(COALESCE(NULLIF(btrim(_job_prefix), ''), left(_base_slug, 4)), '[^A-Za-z0-9]', '', 'g'));
  IF _prefix = '' THEN _prefix := 'JOB'; END IF;

  INSERT INTO public.organizations (name, slug, job_prefix, created_by)
  VALUES (btrim(_name), _slug, _prefix, _uid) RETURNING id INTO _org_id;

  INSERT INTO public.organization_members (org_id, user_id) VALUES (_org_id, _uid);
  UPDATE public.profiles SET org_id = _org_id WHERE id = _uid;
  INSERT INTO public.user_roles (user_id, role, org_id) VALUES (_uid, 'super_admin', _org_id) ON CONFLICT DO NOTHING;

  INSERT INTO public.org_roles (org_id, name, description, is_admin)
  VALUES (_org_id, 'Administrator', 'Full access to the workspace', true)
  RETURNING id INTO _admin_role_id;
  INSERT INTO public.user_org_roles (org_id, user_id, org_role_id)
  VALUES (_org_id, _uid, _admin_role_id) ON CONFLICT DO NOTHING;

  RETURN _org_id;
END;
$function$;