-- CAPTURE FORMS
CREATE TABLE public.capture_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  default_owner_id uuid,
  default_source text DEFAULT 'web_form',
  auto_create_lead boolean NOT NULL DEFAULT true,
  success_message text NOT NULL DEFAULT 'Thanks! We have received your enquiry and will be in touch shortly.',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.capture_forms TO authenticated;
GRANT ALL ON public.capture_forms TO service_role;
ALTER TABLE public.capture_forms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members manage capture forms" ON public.capture_forms
  FOR ALL TO authenticated USING (public.is_org_member(org_id)) WITH CHECK (public.is_org_member(org_id));
CREATE TRIGGER tg_capture_forms_updated BEFORE UPDATE ON public.capture_forms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- SUBMISSIONS
CREATE TABLE public.form_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  form_id uuid NOT NULL REFERENCES public.capture_forms(id) ON DELETE CASCADE,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  full_name text,
  email text,
  phone text,
  company text,
  message text,
  status text NOT NULL DEFAULT 'new',
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.form_submissions TO authenticated;
GRANT ALL ON public.form_submissions TO service_role;
ALTER TABLE public.form_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members manage submissions" ON public.form_submissions
  FOR ALL TO authenticated USING (public.is_org_member(org_id)) WITH CHECK (public.is_org_member(org_id));
CREATE TRIGGER tg_form_submissions_updated BEFORE UPDATE ON public.form_submissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- CAMPAIGNS
CREATE TABLE public.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  channel text NOT NULL DEFAULT 'email',
  status text NOT NULL DEFAULT 'draft',
  goal text,
  start_date date,
  end_date date,
  owner_id uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaigns TO authenticated;
GRANT ALL ON public.campaigns TO service_role;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members manage campaigns" ON public.campaigns
  FOR ALL TO authenticated USING (public.is_org_member(org_id)) WITH CHECK (public.is_org_member(org_id));
CREATE TRIGGER tg_campaigns_updated BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- CAMPAIGN STEPS (sequence)
CREATE TABLE public.campaign_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  channel text NOT NULL DEFAULT 'email',
  day_offset integer NOT NULL DEFAULT 0,
  subject text NOT NULL,
  body text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_steps TO authenticated;
GRANT ALL ON public.campaign_steps TO service_role;
ALTER TABLE public.campaign_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members manage campaign steps" ON public.campaign_steps
  FOR ALL TO authenticated USING (public.is_org_member(org_id)) WITH CHECK (public.is_org_member(org_id));
CREATE TRIGGER tg_campaign_steps_updated BEFORE UPDATE ON public.campaign_steps
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- CAMPAIGN MEMBERS
CREATE TABLE public.campaign_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  account_id uuid REFERENCES public.accounts(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  current_step integer NOT NULL DEFAULT 0,
  last_touch_at timestamptz,
  next_touch_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_members TO authenticated;
GRANT ALL ON public.campaign_members TO service_role;
ALTER TABLE public.campaign_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members manage campaign members" ON public.campaign_members
  FOR ALL TO authenticated USING (public.is_org_member(org_id)) WITH CHECK (public.is_org_member(org_id));
CREATE TRIGGER tg_campaign_members_updated BEFORE UPDATE ON public.campaign_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_campaign_members_campaign ON public.campaign_members(campaign_id);
CREATE INDEX idx_campaign_steps_campaign ON public.campaign_steps(campaign_id, position);
CREATE INDEX idx_form_submissions_form ON public.form_submissions(form_id, created_at DESC);

-- PUBLIC ACCESS VIA SECURITY DEFINER RPCs
CREATE OR REPLACE FUNCTION public.get_capture_form(_slug text)
RETURNS json LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT json_build_object(
    'id', f.id, 'name', f.name, 'slug', f.slug, 'description', f.description,
    'fields', f.fields, 'success_message', f.success_message,
    'org_name', o.name, 'brand_color', o.brand_color, 'logo_url', o.logo_url)
  FROM public.capture_forms f
  JOIN public.organizations o ON o.id = f.org_id
  WHERE f.slug = _slug AND f.is_active = true
$$;

CREATE OR REPLACE FUNCTION public.submit_capture_form(_slug text, _payload jsonb)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _f RECORD; _sub_id uuid; _account_id uuid; _contact_id uuid; _lead_id uuid;
  _name text; _email text; _phone text; _company text; _message text;
BEGIN
  SELECT * INTO _f FROM public.capture_forms WHERE slug = _slug AND is_active = true;
  IF _f IS NULL THEN RAISE EXCEPTION 'Form not found'; END IF;

  _name := NULLIF(btrim(COALESCE(_payload->>'full_name', _payload->>'name', '')), '');
  _email := NULLIF(btrim(COALESCE(_payload->>'email','')), '');
  _phone := NULLIF(btrim(COALESCE(_payload->>'phone','')), '');
  _company := NULLIF(btrim(COALESCE(_payload->>'company', _payload->>'business','')), '');
  _message := NULLIF(btrim(COALESCE(_payload->>'message', _payload->>'details','')), '');

  IF _name IS NULL AND _email IS NULL AND _phone IS NULL THEN
    RAISE EXCEPTION 'Please provide at least a name, email or phone number';
  END IF;

  IF _f.auto_create_lead THEN
    INSERT INTO public.accounts (org_id, name, email, phone, source, lifecycle_stage, owner_id, notes)
    VALUES (_f.org_id, COALESCE(_company, _name, _email, 'Website enquiry'), _email, _phone,
            _f.default_source, 'lead', _f.default_owner_id, _message)
    RETURNING id INTO _account_id;

    IF _name IS NOT NULL OR _email IS NOT NULL THEN
      INSERT INTO public.contacts (org_id, account_id, full_name, email, phone, is_primary)
      VALUES (_f.org_id, _account_id, COALESCE(_name, _email), _email, _phone, true)
      RETURNING id INTO _contact_id;
    END IF;

    INSERT INTO public.leads (org_id, account_id, contact_id, title, description, source, status, owner_id)
    VALUES (_f.org_id, _account_id, _contact_id,
            COALESCE(_company, _name, 'Website enquiry') || ' - ' || _f.name,
            _message, _f.default_source, 'new', _f.default_owner_id)
    RETURNING id INTO _lead_id;
  END IF;

  INSERT INTO public.form_submissions (org_id, form_id, data, full_name, email, phone, company, message,
                                       status, lead_id, account_id, contact_id)
  VALUES (_f.org_id, _f.id, _payload, _name, _email, _phone, _company, _message,
          CASE WHEN _lead_id IS NULL THEN 'new' ELSE 'routed' END, _lead_id, _account_id, _contact_id)
  RETURNING id INTO _sub_id;

  RETURN json_build_object('id', _sub_id, 'message', _f.success_message);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_capture_form(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_capture_form(text, jsonb) TO anon, authenticated;