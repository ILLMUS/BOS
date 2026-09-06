CREATE POLICY "Creators can view own jobs"
ON public.jobs FOR SELECT
TO authenticated
USING (auth.uid() = created_by);