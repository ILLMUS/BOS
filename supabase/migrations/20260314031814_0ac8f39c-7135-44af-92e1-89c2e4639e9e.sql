INSERT INTO storage.buckets (id, name, public) VALUES ('job-files', 'job-files', true);

CREATE POLICY "Authenticated users can upload job files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'job-files');

CREATE POLICY "Anyone can view job files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'job-files');

CREATE POLICY "Admins can delete job files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'job-files' AND public.is_admin_or_owner(auth.uid()));