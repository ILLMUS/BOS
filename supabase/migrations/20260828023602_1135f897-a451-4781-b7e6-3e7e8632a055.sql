CREATE TABLE public.access_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  path text NOT NULL,
  label text NOT NULL,
  required_authority integer NOT NULL DEFAULT 1,
  note text,
  status text NOT NULL DEFAULT 'pending',
  handled_by uuid,
  handled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX access_requests_one_open
  ON public.access_requests (user_id, path)
  WHERE status = 'pending';

GRANT SELECT, INSERT, UPDATE ON public.access_requests TO authenticated;
GRANT ALL ON public.access_requests TO service_role;

ALTER TABLE public.access_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members see their own access requests"
  ON public.access_requests FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR (org_id IS NOT NULL AND public.org_authority(org_id) >= 3));

CREATE POLICY "Members raise their own access requests"
  ON public.access_requests FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins resolve access requests"
  ON public.access_requests FOR UPDATE TO authenticated
  USING (org_id IS NOT NULL AND public.org_authority(org_id) >= 3)
  WITH CHECK (org_id IS NOT NULL AND public.org_authority(org_id) >= 3);

CREATE TRIGGER tg_access_requests_updated
  BEFORE UPDATE ON public.access_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.request_access(_path text, _label text, _required integer, _note text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _org uuid;
  _id uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT org_id INTO _org FROM public.profiles WHERE id = _uid;
  IF _org IS NULL THEN
    SELECT org_id INTO _org FROM public.organization_members
     WHERE user_id = _uid ORDER BY created_at LIMIT 1;
  END IF;

  SELECT id INTO _id FROM public.access_requests
   WHERE user_id = _uid AND path = _path AND status = 'pending';
  IF _id IS NOT NULL THEN
    UPDATE public.access_requests
       SET note = COALESCE(NULLIF(btrim(_note), ''), note), org_id = COALESCE(org_id, _org)
     WHERE id = _id;
    RETURN _id;
  END IF;

  INSERT INTO public.access_requests (org_id, user_id, path, label, required_authority, note)
  VALUES (_org, _uid, _path, _label, GREATEST(COALESCE(_required, 1), 1), NULLIF(btrim(_note), ''))
  RETURNING id INTO _id;

  RETURN _id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.request_access(text, text, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_access(text, text, integer, text) TO authenticated;