CREATE TABLE public.campaign_scheduled_sends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  step_id uuid REFERENCES public.campaign_steps(id) ON DELETE SET NULL,
  member_id uuid REFERENCES public.campaign_members(id) ON DELETE CASCADE,
  account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  client_name text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  channel text NOT NULL DEFAULT 'whatsapp',
  message text NOT NULL,
  step_index integer NOT NULL DEFAULT 0,
  step_subject text NOT NULL DEFAULT '',
  scheduled_at timestamptz NOT NULL,
  timezone text NOT NULL DEFAULT 'Africa/Mbabane',
  local_time text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending_approval',
  outcome text,
  sent_at timestamptz,
  cancelled_reason text,
  approved_by uuid,
  approved_at timestamptz,
  owner_id uuid,
  requested_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT campaign_scheduled_sends_status_check
    CHECK (status IN ('pending_approval','approved','sent','cancelled','skipped'))
);

CREATE INDEX idx_css_org_status ON public.campaign_scheduled_sends (org_id, status, scheduled_at);
CREATE INDEX idx_css_campaign ON public.campaign_scheduled_sends (campaign_id, step_index);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_scheduled_sends TO authenticated;
GRANT ALL ON public.campaign_scheduled_sends TO service_role;

ALTER TABLE public.campaign_scheduled_sends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members manage scheduled sends"
ON public.campaign_scheduled_sends
FOR ALL
TO authenticated
USING (public.is_org_member(org_id))
WITH CHECK (public.is_org_member(org_id));

CREATE TRIGGER trg_css_updated_at
BEFORE UPDATE ON public.campaign_scheduled_sends
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.notify_scheduled_send()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _owner uuid;
  _campaign text;
BEGIN
  SELECT c.name, COALESCE(NEW.owner_id, c.owner_id, c.created_by)
    INTO _campaign, _owner
  FROM public.campaigns c WHERE c.id = NEW.campaign_id;

  IF TG_OP = 'INSERT' AND NEW.status = 'pending_approval' AND _owner IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (_owner,
      'Follow-up waiting for approval',
      format('%s — %s to %s is scheduled for %s. Preview and approve it.',
             COALESCE(_campaign,'Campaign'), COALESCE(NULLIF(NEW.step_subject,''),'Follow-up'),
             COALESCE(NULLIF(NEW.client_name,''),'a client'),
             COALESCE(NULLIF(NEW.local_time,''), to_char(NEW.scheduled_at, 'YYYY-MM-DD HH24:MI'))),
      'approval');
  ELSIF TG_OP = 'UPDATE' AND NEW.status <> OLD.status
        AND NEW.status IN ('approved','cancelled')
        AND NEW.requested_by IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (NEW.requested_by,
      CASE WHEN NEW.status = 'approved' THEN 'Follow-up approved' ELSE 'Follow-up cancelled' END,
      format('%s — %s to %s was %s.', COALESCE(_campaign,'Campaign'),
             COALESCE(NULLIF(NEW.step_subject,''),'Follow-up'),
             COALESCE(NULLIF(NEW.client_name,''),'a client'), NEW.status),
      CASE WHEN NEW.status = 'approved' THEN 'success' ELSE 'warning' END);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_scheduled_send
AFTER INSERT OR UPDATE ON public.campaign_scheduled_sends
FOR EACH ROW EXECUTE FUNCTION public.notify_scheduled_send();