DROP POLICY IF EXISTS "Authenticated can view settings" ON public.app_settings;

CREATE POLICY "Authenticated can view public settings"
ON public.app_settings FOR SELECT
TO authenticated
USING (
  key IN ('quote_builder_base_url', 'cloud_storage_folder_url')
  OR public.is_admin_or_owner(auth.uid())
);