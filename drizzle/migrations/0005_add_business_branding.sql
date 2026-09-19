ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS brand_secondary_color text;

ALTER TABLE public.organizations
ADD CONSTRAINT organizations_brand_color_format
CHECK (brand_color IS NULL OR brand_color ~ '^#[0-9A-Fa-f]{6}$') NOT VALID;

ALTER TABLE public.organizations
ADD CONSTRAINT organizations_brand_secondary_color_format
CHECK (brand_secondary_color IS NULL OR brand_secondary_color ~ '^#[0-9A-Fa-f]{6}$') NOT VALID;

CREATE POLICY "Workspace members view business branding"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'business-branding'
  AND public.is_org_member((storage.foldername(name))[1]::uuid)
);

CREATE POLICY "Workspace admins upload business branding"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'business-branding'
  AND public.is_org_admin((storage.foldername(name))[1]::uuid)
);

CREATE POLICY "Workspace admins update business branding"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'business-branding'
  AND public.is_org_admin((storage.foldername(name))[1]::uuid)
)
WITH CHECK (
  bucket_id = 'business-branding'
  AND public.is_org_admin((storage.foldername(name))[1]::uuid)
);

CREATE POLICY "Workspace admins delete business branding"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'business-branding'
  AND public.is_org_admin((storage.foldername(name))[1]::uuid)
);