
-- ============ 1. WIPE EXISTING TENANT DATA ============
TRUNCATE TABLE
  public.audit_log,
  public.notifications,
  public.job_payments,
  public.job_variations,
  public.shop_drawings,
  public.flight_logs,
  public.spray_logs,
  public.pre_flight_checks,
  public.post_flight_logs,
  public.job_stages,
  public.jobs,
  public.user_roles,
  public.api_keys,
  public.sla_defaults,
  public.stage_assignments
CASCADE;

-- ============ 2. ORGANIZATIONS ============
CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  logo_url text,
  brand_color text,
  job_prefix text NOT NULL DEFAULT 'JOB',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizations TO authenticated;
GRANT ALL ON public.organizations TO service_role;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_members TO authenticated;
GRANT ALL ON public.organization_members TO service_role;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ 3. ORG COLUMNS ============
ALTER TABLE public.profiles ADD COLUMN org_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;
ALTER TABLE public.jobs ADD COLUMN org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.user_roles ADD COLUMN org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.api_keys ADD COLUMN org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.sla_defaults ADD COLUMN org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.stage_assignments ADD COLUMN org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.audit_log ADD COLUMN org_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT conname, conrelid::regclass AS tbl
    FROM pg_constraint
    WHERE contype = 'u'
      AND conrelid IN ('public.user_roles'::regclass,'public.sla_defaults'::regclass,'public.stage_assignments'::regclass)
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', r.tbl, r.conname);
  END LOOP;
END $$;

ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_org_user_role_key UNIQUE (org_id, user_id, role);
ALTER TABLE public.sla_defaults ADD CONSTRAINT sla_defaults_org_stage_key UNIQUE (org_id, stage);
ALTER TABLE public.stage_assignments ADD CONSTRAINT stage_assignments_org_stage_key UNIQUE (org_id, stage);

CREATE INDEX IF NOT EXISTS idx_jobs_org ON public.jobs(org_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_org_user ON public.user_roles(org_id, user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user ON public.organization_members(user_id);

-- ============ 4. TENANCY HELPERS ============
CREATE OR REPLACE FUNCTION public.is_org_member(_org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.organization_members m
                 WHERE m.org_id = _org_id AND m.user_id = auth.uid())
$$;

CREATE OR REPLACE FUNCTION public.active_org_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT org_id FROM public.profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.has_org_role(_user_id uuid, _org_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles
                 WHERE user_id = _user_id AND org_id = _org_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_org_admin(_org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles
                 WHERE user_id = auth.uid() AND org_id = _org_id
                   AND role IN ('super_admin','owner_director'))
$$;

CREATE OR REPLACE FUNCTION public.job_org_id(_job_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT org_id FROM public.jobs WHERE id = _job_id
$$;

CREATE OR REPLACE FUNCTION public.can_access_job(_job_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.jobs j
    JOIN public.organization_members m ON m.org_id = j.org_id
    WHERE j.id = _job_id AND m.user_id = auth.uid()
  )
$$;

-- Backwards-compatible role helpers, now scoped to the caller's active organization
CREATE OR REPLACE FUNCTION public.get_user_roles(_user_id uuid)
RETURNS SETOF app_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT ur.role FROM public.user_roles ur
  JOIN public.profiles p ON p.id = ur.user_id AND p.org_id = ur.org_id
  WHERE ur.user_id = _user_id
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.profiles p ON p.id = ur.user_id AND p.org_id = ur.org_id
    WHERE ur.user_id = _user_id AND ur.role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_owner(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.profiles p ON p.id = ur.user_id AND p.org_id = ur.org_id
    WHERE ur.user_id = _user_id AND ur.role IN ('super_admin','owner_director')
  )
$$;

-- ============ 5. TENANT-AWARE TRIGGERS ============
CREATE OR REPLACE FUNCTION public.generate_job_number()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE next_num INTEGER; _prefix text;
BEGIN
  SELECT COALESCE(job_prefix,'JOB') INTO _prefix FROM public.organizations WHERE id = NEW.org_id;
  _prefix := COALESCE(_prefix,'JOB');
  SELECT COALESCE(MAX(CAST(SUBSTRING(job_number FROM char_length(_prefix) + 2) AS INTEGER)), 0) + 1
    INTO next_num
    FROM public.jobs
    WHERE org_id = NEW.org_id AND job_number ~ ('^' || _prefix || '-[0-9]+$');
  NEW.job_number := _prefix || '-' || LPAD(next_num::TEXT, 5, '0');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.assign_stage_owners()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _assignment RECORD;
  _primary_user_id uuid;
  _secondary_user_id uuid;
  _org_id uuid;
BEGIN
  SELECT org_id INTO _org_id FROM public.jobs WHERE id = NEW.job_id;

  SELECT primary_role, secondary_role INTO _assignment
  FROM public.stage_assignments
  WHERE stage = NEW.stage AND org_id = _org_id;

  IF FOUND THEN
    SELECT ur.user_id INTO _primary_user_id
    FROM public.user_roles ur
    WHERE ur.role = _assignment.primary_role AND ur.org_id = _org_id
    LIMIT 1;

    IF _assignment.secondary_role IS NOT NULL THEN
      SELECT ur.user_id INTO _secondary_user_id
      FROM public.user_roles ur
      WHERE ur.role = _assignment.secondary_role AND ur.org_id = _org_id
      LIMIT 1;
    END IF;

    NEW.primary_owner_id := _primary_user_id;
    NEW.secondary_owner_id := _secondary_user_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_sla_defaults()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE _deadline integer; _org_id uuid;
BEGIN
  IF NEW.sla_deadline_hours IS NULL THEN
    SELECT org_id INTO _org_id FROM public.jobs WHERE id = NEW.job_id;
    SELECT deadline_hours INTO _deadline
    FROM public.sla_defaults WHERE stage = NEW.stage AND org_id = _org_id;
    NEW.sla_deadline_hours := COALESCE(_deadline, 48);
  END IF;

  IF NEW.status = 'active' AND (OLD IS NULL OR OLD.status IS DISTINCT FROM 'active') THEN
    NEW.sla_started_at := now();
  END IF;

  RETURN NEW;
END;
$$;

-- ============ 6. ORG PROVISIONING RPC ============
CREATE OR REPLACE FUNCTION public.create_organization(_name text, _job_prefix text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _org_id uuid;
  _slug text;
  _base_slug text;
  _prefix text;
  _n int := 0;
  _stage job_stage;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF _name IS NULL OR btrim(_name) = '' THEN
    RAISE EXCEPTION 'Company name is required';
  END IF;

  _base_slug := regexp_replace(lower(btrim(_name)), '[^a-z0-9]+', '-', 'g');
  _base_slug := btrim(_base_slug, '-');
  IF _base_slug = '' THEN _base_slug := 'org'; END IF;
  _slug := _base_slug;
  WHILE EXISTS (SELECT 1 FROM public.organizations WHERE slug = _slug) LOOP
    _n := _n + 1;
    _slug := _base_slug || '-' || _n;
  END LOOP;

  _prefix := upper(regexp_replace(COALESCE(NULLIF(btrim(_job_prefix), ''), left(_base_slug, 4)), '[^A-Za-z0-9]', '', 'g'));
  IF _prefix = '' THEN _prefix := 'JOB'; END IF;

  INSERT INTO public.organizations (name, slug, job_prefix, created_by)
  VALUES (btrim(_name), _slug, _prefix, _uid)
  RETURNING id INTO _org_id;

  INSERT INTO public.organization_members (org_id, user_id) VALUES (_org_id, _uid);
  UPDATE public.profiles SET org_id = _org_id WHERE id = _uid;
  INSERT INTO public.user_roles (user_id, role, org_id) VALUES (_uid, 'super_admin', _org_id)
    ON CONFLICT DO NOTHING;

  FOR _stage IN SELECT unnest(enum_range(NULL::job_stage)) LOOP
    INSERT INTO public.sla_defaults (stage, deadline_hours, org_id)
    VALUES (_stage, 48, _org_id) ON CONFLICT DO NOTHING;
  END LOOP;

  INSERT INTO public.stage_assignments (stage, primary_role, secondary_role, org_id) VALUES
    ('lead_entry','lead_handler',NULL,_org_id),
    ('lead_qualification','lead_handler','operations_manager',_org_id),
    ('site_visit_authorization','operations_manager',NULL,_org_id),
    ('site_assessment','site_assessor',NULL,_org_id),
    ('job_scoping','site_assessor','estimator',_org_id),
    ('costing','estimator',NULL,_org_id),
    ('quotation_preparation','quotation_officer',NULL,_org_id),
    ('quote_submission','quotation_officer','client_manager',_org_id),
    ('client_approval','client_manager',NULL,_org_id),
    ('fabrication_order','workshop_manager',NULL,_org_id),
    ('fabrication_installation','fabrication_team','installation_team',_org_id),
    ('invoicing','accounts_admin',NULL,_org_id),
    ('project_closure','operations_manager','owner_director',_org_id),
    ('pre_flight_check','drone_pilot','operations_manager',_org_id),
    ('flight_execution','drone_pilot',NULL,_org_id),
    ('post_flight_log','drone_pilot','operations_manager',_org_id)
  ON CONFLICT DO NOTHING;

  RETURN _org_id;
END;
$$;

-- ============ 7. RLS REBUILD ============
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('jobs','job_stages','audit_log','notifications','api_keys','sla_defaults',
                        'stage_assignments','user_roles','profiles','job_payments','job_variations',
                        'shop_drawings','flight_logs','spray_logs','pre_flight_checks','post_flight_logs')
  LOOP
    EXECUTE format('DROP POLICY %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- organizations
CREATE POLICY "members read org" ON public.organizations FOR SELECT TO authenticated
  USING (public.is_org_member(id));
CREATE POLICY "admins update org" ON public.organizations FOR UPDATE TO authenticated
  USING (public.is_org_admin(id)) WITH CHECK (public.is_org_admin(id));

CREATE POLICY "members read membership" ON public.organization_members FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));
CREATE POLICY "admins manage membership" ON public.organization_members FOR ALL TO authenticated
  USING (public.is_org_admin(org_id)) WITH CHECK (public.is_org_admin(org_id));

-- profiles
CREATE POLICY "read own profile" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR (org_id IS NOT NULL AND public.is_org_member(org_id)));
CREATE POLICY "update own profile" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- user_roles
CREATE POLICY "members read roles" ON public.user_roles FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));
CREATE POLICY "admins manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.is_org_admin(org_id)) WITH CHECK (public.is_org_admin(org_id));

-- jobs
CREATE POLICY "members read jobs" ON public.jobs FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));
CREATE POLICY "admins create jobs" ON public.jobs FOR INSERT TO authenticated
  WITH CHECK (public.has_org_role(auth.uid(), org_id, 'super_admin'));
CREATE POLICY "members update jobs" ON public.jobs FOR UPDATE TO authenticated
  USING (public.is_org_member(org_id)) WITH CHECK (public.is_org_member(org_id));
CREATE POLICY "admins delete jobs" ON public.jobs FOR DELETE TO authenticated
  USING (public.is_org_admin(org_id));

-- job-scoped child tables
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['job_stages','job_payments','job_variations','shop_drawings',
                           'flight_logs','spray_logs','pre_flight_checks','post_flight_logs']
  LOOP
    EXECUTE format(
      'CREATE POLICY "org members manage %1$s" ON public.%1$I FOR ALL TO authenticated
         USING (public.can_access_job(job_id)) WITH CHECK (public.can_access_job(job_id))', t);
  END LOOP;
END $$;

-- audit_log
CREATE POLICY "members read audit" ON public.audit_log FOR SELECT TO authenticated
  USING ((job_id IS NOT NULL AND public.can_access_job(job_id))
         OR (org_id IS NOT NULL AND public.is_org_member(org_id)));
CREATE POLICY "members write audit" ON public.audit_log FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid()
    AND ((job_id IS NOT NULL AND public.can_access_job(job_id))
         OR (org_id IS NOT NULL AND public.is_org_member(org_id))));

-- notifications
CREATE POLICY "own notifications" ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "update own notifications" ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- api_keys / sla_defaults / stage_assignments
CREATE POLICY "admins manage api keys" ON public.api_keys FOR ALL TO authenticated
  USING (public.is_org_admin(org_id)) WITH CHECK (public.is_org_admin(org_id));

CREATE POLICY "members read sla" ON public.sla_defaults FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));
CREATE POLICY "admins manage sla" ON public.sla_defaults FOR ALL TO authenticated
  USING (public.is_org_admin(org_id)) WITH CHECK (public.is_org_admin(org_id));

CREATE POLICY "members read assignments" ON public.stage_assignments FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));
CREATE POLICY "admins manage assignments" ON public.stage_assignments FOR ALL TO authenticated
  USING (public.is_org_admin(org_id)) WITH CHECK (public.is_org_admin(org_id));
