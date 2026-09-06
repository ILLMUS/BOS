CREATE TABLE public.org_config (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  key text NOT NULL,
  value jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.org_config TO authenticated;
GRANT ALL ON public.org_config TO service_role;

ALTER TABLE public.org_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view org config"
  ON public.org_config FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));

CREATE POLICY "Admins can insert org config"
  ON public.org_config FOR INSERT TO authenticated
  WITH CHECK (public.is_org_admin(org_id));

CREATE POLICY "Admins can update org config"
  ON public.org_config FOR UPDATE TO authenticated
  USING (public.is_org_admin(org_id)) WITH CHECK (public.is_org_admin(org_id));

CREATE POLICY "Admins can delete org config"
  ON public.org_config FOR DELETE TO authenticated
  USING (public.is_org_admin(org_id));

CREATE TRIGGER tg_org_config_updated
  BEFORE UPDATE ON public.org_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();