CREATE TABLE public.campaign_send_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id),
  send_id uuid NOT NULL REFERENCES public.campaign_scheduled_sends(id) ON DELETE CASCADE,
  campaign_id uuid,
  actor_id uuid,
  action text NOT NULL,
  from_status text,
  to_status text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_campaign_send_audit_send ON public.campaign_send_audit(send_id, created_at DESC);
CREATE INDEX idx_campaign_send_audit_org ON public.campaign_send_audit(org_id, created_at DESC);

GRANT SELECT, INSERT ON public.campaign_send_audit TO authenticated;
GRANT ALL ON public.campaign_send_audit TO service_role;

ALTER TABLE public.campaign_send_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members read send audit" ON public.campaign_send_audit
  FOR SELECT TO authenticated USING (public.is_org_member(org_id));

CREATE POLICY "Org members write send audit" ON public.campaign_send_audit
  FOR INSERT TO authenticated WITH CHECK (public.is_org_member(org_id));

CREATE OR REPLACE FUNCTION public.log_scheduled_send_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _action text;
  _details jsonb := '{}'::jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.campaign_send_audit (org_id, send_id, campaign_id, actor_id, action, to_status, details)
    VALUES (NEW.org_id, NEW.id, NEW.campaign_id, COALESCE(auth.uid(), NEW.requested_by), 'scheduled', NEW.status,
            jsonb_build_object('client_name', NEW.client_name, 'scheduled_at', NEW.scheduled_at, 'timezone', NEW.timezone));
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    _action := CASE NEW.status
      WHEN 'approved' THEN 'approved'
      WHEN 'cancelled' THEN 'cancelled'
      WHEN 'sent' THEN 'sent'
      WHEN 'skipped' THEN 'skipped'
      ELSE 'status_changed' END;
    IF NEW.cancelled_reason IS DISTINCT FROM OLD.cancelled_reason THEN
      _details := _details || jsonb_build_object('reason', NEW.cancelled_reason);
    END IF;
    IF NEW.outcome IS DISTINCT FROM OLD.outcome THEN
      _details := _details || jsonb_build_object('outcome', NEW.outcome);
    END IF;
    INSERT INTO public.campaign_send_audit (org_id, send_id, campaign_id, actor_id, action, from_status, to_status, details)
    VALUES (NEW.org_id, NEW.id, NEW.campaign_id, auth.uid(), _action, OLD.status, NEW.status, _details);
  END IF;

  IF NEW.message IS DISTINCT FROM OLD.message
     OR NEW.scheduled_at IS DISTINCT FROM OLD.scheduled_at
     OR NEW.timezone IS DISTINCT FROM OLD.timezone
     OR NEW.phone IS DISTINCT FROM OLD.phone THEN
    _details := '{}'::jsonb;
    IF NEW.message IS DISTINCT FROM OLD.message THEN
      _details := _details || jsonb_build_object('message_before', OLD.message, 'message_after', NEW.message);
    END IF;
    IF NEW.scheduled_at IS DISTINCT FROM OLD.scheduled_at THEN
      _details := _details || jsonb_build_object('scheduled_before', OLD.scheduled_at, 'scheduled_after', NEW.scheduled_at);
    END IF;
    IF NEW.timezone IS DISTINCT FROM OLD.timezone THEN
      _details := _details || jsonb_build_object('timezone_before', OLD.timezone, 'timezone_after', NEW.timezone);
    END IF;
    IF NEW.phone IS DISTINCT FROM OLD.phone THEN
      _details := _details || jsonb_build_object('phone_before', OLD.phone, 'phone_after', NEW.phone);
    END IF;
    INSERT INTO public.campaign_send_audit (org_id, send_id, campaign_id, actor_id, action, from_status, to_status, details)
    VALUES (NEW.org_id, NEW.id, NEW.campaign_id, auth.uid(), 'edited', OLD.status, NEW.status, _details);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_scheduled_send_audit
AFTER INSERT OR UPDATE ON public.campaign_scheduled_sends
FOR EACH ROW EXECUTE FUNCTION public.log_scheduled_send_audit();