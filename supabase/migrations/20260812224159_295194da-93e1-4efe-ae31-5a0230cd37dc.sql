
CREATE TYPE public.lifecycle_stage AS ENUM ('prospect','lead','opportunity','deal','client','lost');
CREATE TYPE public.lead_status AS ENUM ('new','working','qualified','disqualified','converted');
CREATE TYPE public.opportunity_stage AS ENUM ('discovery','scoping','proposal','negotiation','won','lost');
CREATE TYPE public.deal_status AS ENUM ('open','won','lost');
CREATE TYPE public.activity_type AS ENUM ('call','email','meeting','note','task','follow_up');

CREATE TABLE public.accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  lifecycle_stage public.lifecycle_stage NOT NULL DEFAULT 'prospect',
  industry text,
  website text,
  email text,
  phone text,
  location text,
  source text,
  notes text,
  owner_id uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.accounts TO authenticated;
GRANT ALL ON public.accounts TO service_role;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members manage accounts" ON public.accounts FOR ALL TO authenticated
  USING (public.is_org_member(org_id)) WITH CHECK (public.is_org_member(org_id));
CREATE TRIGGER tg_accounts_updated BEFORE UPDATE ON public.accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_accounts_org ON public.accounts(org_id);

CREATE TABLE public.contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  job_title text,
  email text,
  phone text,
  is_primary boolean NOT NULL DEFAULT false,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contacts TO authenticated;
GRANT ALL ON public.contacts TO service_role;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members manage contacts" ON public.contacts FOR ALL TO authenticated
  USING (public.is_org_member(org_id)) WITH CHECK (public.is_org_member(org_id));
CREATE TRIGGER tg_contacts_updated BEFORE UPDATE ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_contacts_org ON public.contacts(org_id);
CREATE INDEX idx_contacts_account ON public.contacts(account_id);

CREATE TABLE public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  source text,
  status public.lead_status NOT NULL DEFAULT 'new',
  estimated_value numeric,
  owner_id uuid,
  disqualified_reason text,
  converted_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO authenticated;
GRANT ALL ON public.leads TO service_role;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members manage leads" ON public.leads FOR ALL TO authenticated
  USING (public.is_org_member(org_id)) WITH CHECK (public.is_org_member(org_id));
CREATE TRIGGER tg_leads_updated BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_leads_org ON public.leads(org_id);

CREATE TABLE public.opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  stage public.opportunity_stage NOT NULL DEFAULT 'discovery',
  value numeric,
  probability integer NOT NULL DEFAULT 50,
  expected_close_date date,
  owner_id uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.opportunities TO authenticated;
GRANT ALL ON public.opportunities TO service_role;
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members manage opportunities" ON public.opportunities FOR ALL TO authenticated
  USING (public.is_org_member(org_id)) WITH CHECK (public.is_org_member(org_id));
CREATE TRIGGER tg_opportunities_updated BEFORE UPDATE ON public.opportunities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_opportunities_org ON public.opportunities(org_id);

CREATE TABLE public.deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  opportunity_id uuid REFERENCES public.opportunities(id) ON DELETE SET NULL,
  account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  job_id uuid REFERENCES public.jobs(id) ON DELETE SET NULL,
  name text NOT NULL,
  value numeric,
  status public.deal_status NOT NULL DEFAULT 'open',
  closed_at timestamptz,
  lost_reason text,
  owner_id uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.deals TO authenticated;
GRANT ALL ON public.deals TO service_role;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members manage deals" ON public.deals FOR ALL TO authenticated
  USING (public.is_org_member(org_id)) WITH CHECK (public.is_org_member(org_id));
CREATE TRIGGER tg_deals_updated BEFORE UPDATE ON public.deals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_deals_org ON public.deals(org_id);

CREATE TABLE public.activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  account_id uuid REFERENCES public.accounts(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  opportunity_id uuid REFERENCES public.opportunities(id) ON DELETE CASCADE,
  deal_id uuid REFERENCES public.deals(id) ON DELETE CASCADE,
  job_id uuid REFERENCES public.jobs(id) ON DELETE CASCADE,
  type public.activity_type NOT NULL DEFAULT 'note',
  subject text NOT NULL,
  body text,
  due_at timestamptz,
  completed_at timestamptz,
  assigned_to uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activities TO authenticated;
GRANT ALL ON public.activities TO service_role;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members manage activities" ON public.activities FOR ALL TO authenticated
  USING (public.is_org_member(org_id)) WITH CHECK (public.is_org_member(org_id));
CREATE TRIGGER tg_activities_updated BEFORE UPDATE ON public.activities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_activities_org ON public.activities(org_id);
CREATE INDEX idx_activities_due ON public.activities(due_at) WHERE completed_at IS NULL;

ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS deal_id uuid REFERENCES public.deals(id) ON DELETE SET NULL;

-- Convert a lead into an opportunity (keeps the originating lead linked).
CREATE OR REPLACE FUNCTION public.convert_lead_to_opportunity(_lead_id uuid, _name text DEFAULT NULL, _value numeric DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _l RECORD; _opp_id uuid;
BEGIN
  SELECT * INTO _l FROM public.leads WHERE id = _lead_id;
  IF _l IS NULL THEN RAISE EXCEPTION 'Lead not found'; END IF;
  IF NOT public.is_org_member(_l.org_id) THEN RAISE EXCEPTION 'Not a member of this organization'; END IF;

  INSERT INTO public.opportunities (org_id, lead_id, account_id, contact_id, name, description, value, owner_id, created_by)
  VALUES (_l.org_id, _l.id, _l.account_id, _l.contact_id, COALESCE(NULLIF(btrim(_name),''), _l.title),
          _l.description, COALESCE(_value, _l.estimated_value), _l.owner_id, auth.uid())
  RETURNING id INTO _opp_id;

  UPDATE public.leads SET status = 'converted', converted_at = now() WHERE id = _l.id;
  IF _l.account_id IS NOT NULL THEN
    UPDATE public.accounts SET lifecycle_stage = 'opportunity'
      WHERE id = _l.account_id AND lifecycle_stage IN ('prospect','lead');
  END IF;
  RETURN _opp_id;
END; $$;

-- Convert an opportunity into a deal.
CREATE OR REPLACE FUNCTION public.convert_opportunity_to_deal(_opportunity_id uuid, _name text DEFAULT NULL, _value numeric DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _o RECORD; _deal_id uuid;
BEGIN
  SELECT * INTO _o FROM public.opportunities WHERE id = _opportunity_id;
  IF _o IS NULL THEN RAISE EXCEPTION 'Opportunity not found'; END IF;
  IF NOT public.is_org_member(_o.org_id) THEN RAISE EXCEPTION 'Not a member of this organization'; END IF;

  INSERT INTO public.deals (org_id, opportunity_id, account_id, contact_id, name, value, owner_id, created_by)
  VALUES (_o.org_id, _o.id, _o.account_id, _o.contact_id, COALESCE(NULLIF(btrim(_name),''), _o.name),
          COALESCE(_value, _o.value), _o.owner_id, auth.uid())
  RETURNING id INTO _deal_id;

  UPDATE public.opportunities SET stage = 'negotiation' WHERE id = _o.id AND stage NOT IN ('won','lost');
  IF _o.account_id IS NOT NULL THEN
    UPDATE public.accounts SET lifecycle_stage = 'deal'
      WHERE id = _o.account_id AND lifecycle_stage IN ('prospect','lead','opportunity');
  END IF;
  RETURN _deal_id;
END; $$;

-- Mark a deal won or lost; a won deal promotes the account to client.
CREATE OR REPLACE FUNCTION public.close_deal(_deal_id uuid, _won boolean, _reason text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _d RECORD;
BEGIN
  SELECT * INTO _d FROM public.deals WHERE id = _deal_id;
  IF _d IS NULL THEN RAISE EXCEPTION 'Deal not found'; END IF;
  IF NOT public.is_org_member(_d.org_id) THEN RAISE EXCEPTION 'Not a member of this organization'; END IF;

  UPDATE public.deals
    SET status = CASE WHEN _won THEN 'won'::deal_status ELSE 'lost'::deal_status END,
        closed_at = now(),
        lost_reason = CASE WHEN _won THEN NULL ELSE _reason END
    WHERE id = _deal_id;

  IF _d.opportunity_id IS NOT NULL THEN
    UPDATE public.opportunities
      SET stage = CASE WHEN _won THEN 'won'::opportunity_stage ELSE 'lost'::opportunity_stage END
      WHERE id = _d.opportunity_id;
  END IF;

  IF _d.account_id IS NOT NULL THEN
    UPDATE public.accounts
      SET lifecycle_stage = CASE WHEN _won THEN 'client'::lifecycle_stage ELSE 'lost'::lifecycle_stage END
      WHERE id = _d.account_id;
  END IF;
END; $$;

-- Create a job from a won deal using an existing SOP template.
CREATE OR REPLACE FUNCTION public.create_job_from_deal(_deal_id uuid, _template_id uuid, _service_type text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _d RECORD; _acc RECORD; _c RECORD; _job_id uuid;
BEGIN
  SELECT * INTO _d FROM public.deals WHERE id = _deal_id;
  IF _d IS NULL THEN RAISE EXCEPTION 'Deal not found'; END IF;
  IF NOT public.is_org_member(_d.org_id) THEN RAISE EXCEPTION 'Not a member of this organization'; END IF;

  SELECT * INTO _acc FROM public.accounts WHERE id = _d.account_id;
  SELECT * INTO _c FROM public.contacts WHERE id = _d.contact_id;

  _job_id := public.create_job_from_template(
    _template_id,
    COALESCE(_acc.name, _d.name),
    COALESCE(_c.phone, _acc.phone),
    COALESCE(_c.email, _acc.email),
    _acc.location,
    COALESCE(_service_type, _d.name)
  );

  UPDATE public.jobs SET account_id = _d.account_id, deal_id = _d.id WHERE id = _job_id;
  UPDATE public.deals SET job_id = _job_id WHERE id = _d.id;
  RETURN _job_id;
END; $$;
