CREATE OR REPLACE FUNCTION public.convert_lead_to_opportunity(_lead_id uuid, _name text DEFAULT NULL::text, _value numeric DEFAULT NULL::numeric)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _l RECORD; _opp_id uuid; _opp_name text;
BEGIN
  SELECT * INTO _l FROM public.leads WHERE id = _lead_id;
  IF _l IS NULL THEN RAISE EXCEPTION 'Lead not found'; END IF;
  IF NOT public.is_org_member(_l.org_id) THEN RAISE EXCEPTION 'Not a member of this organization'; END IF;

  _opp_name := COALESCE(NULLIF(btrim(_name),''), _l.title);

  INSERT INTO public.opportunities (org_id, lead_id, account_id, contact_id, name, description, value, owner_id, created_by)
  VALUES (_l.org_id, _l.id, _l.account_id, _l.contact_id, _opp_name,
          _l.description, COALESCE(_value, _l.estimated_value), _l.owner_id, auth.uid())
  RETURNING id INTO _opp_id;

  UPDATE public.leads SET status = 'converted', converted_at = now() WHERE id = _l.id;
  IF _l.account_id IS NOT NULL THEN
    UPDATE public.accounts SET lifecycle_stage = 'opportunity'
      WHERE id = _l.account_id AND lifecycle_stage IN ('prospect','lead');
  END IF;

  IF auth.uid() IS NOT NULL THEN
    INSERT INTO public.audit_log (user_id, org_id, action, details)
    VALUES (auth.uid(), _l.org_id, 'lead_converted',
            jsonb_build_object('lead_id', _l.id, 'lead_title', _l.title, 'opportunity_id', _opp_id,
                               'opportunity_name', _opp_name, 'account_id', _l.account_id,
                               'value', COALESCE(_value, _l.estimated_value)));
  END IF;

  RETURN _opp_id;
END; $function$;

CREATE OR REPLACE FUNCTION public.convert_opportunity_to_deal(_opportunity_id uuid, _name text DEFAULT NULL::text, _value numeric DEFAULT NULL::numeric)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _o RECORD; _deal_id uuid; _deal_name text;
BEGIN
  SELECT * INTO _o FROM public.opportunities WHERE id = _opportunity_id;
  IF _o IS NULL THEN RAISE EXCEPTION 'Opportunity not found'; END IF;
  IF NOT public.is_org_member(_o.org_id) THEN RAISE EXCEPTION 'Not a member of this organization'; END IF;

  _deal_name := COALESCE(NULLIF(btrim(_name),''), _o.name);

  INSERT INTO public.deals (org_id, opportunity_id, account_id, contact_id, name, value, owner_id, created_by)
  VALUES (_o.org_id, _o.id, _o.account_id, _o.contact_id, _deal_name,
          COALESCE(_value, _o.value), _o.owner_id, auth.uid())
  RETURNING id INTO _deal_id;

  UPDATE public.opportunities SET stage = 'negotiation' WHERE id = _o.id AND stage NOT IN ('won','lost');
  IF _o.account_id IS NOT NULL THEN
    UPDATE public.accounts SET lifecycle_stage = 'deal'
      WHERE id = _o.account_id AND lifecycle_stage IN ('prospect','lead','opportunity');
  END IF;

  IF auth.uid() IS NOT NULL THEN
    INSERT INTO public.audit_log (user_id, org_id, action, details)
    VALUES (auth.uid(), _o.org_id, 'opportunity_converted',
            jsonb_build_object('opportunity_id', _o.id, 'opportunity_name', _o.name, 'lead_id', _o.lead_id,
                               'deal_id', _deal_id, 'deal_name', _deal_name, 'account_id', _o.account_id,
                               'value', COALESCE(_value, _o.value)));
  END IF;

  RETURN _deal_id;
END; $function$;