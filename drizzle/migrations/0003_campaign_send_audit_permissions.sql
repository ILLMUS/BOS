DROP POLICY IF EXISTS "Org members read send audit" ON public.campaign_send_audit;
DROP POLICY IF EXISTS "Org members write send audit" ON public.campaign_send_audit;

-- Managers and above may read the audit trail; the send owner / requester may read their own.
CREATE POLICY "Authorized users read send audit" ON public.campaign_send_audit
  FOR SELECT TO authenticated
  USING (
    public.is_org_member(org_id)
    AND (
      public.org_authority(org_id) >= 2
      OR EXISTS (
        SELECT 1 FROM public.campaign_scheduled_sends s
        WHERE s.id = campaign_send_audit.send_id
          AND (s.owner_id = auth.uid() OR s.requested_by = auth.uid())
      )
    )
  );

-- Only managers and above may add audit entries, always under their own identity.
CREATE POLICY "Managers write send audit" ON public.campaign_send_audit
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_org_member(org_id)
    AND public.org_authority(org_id) >= 2
    AND actor_id = auth.uid()
  );

-- Audit records are immutable: no UPDATE or DELETE policy exists, and the
-- table-level privileges are narrowed to match.
REVOKE UPDATE, DELETE, TRUNCATE ON public.campaign_send_audit FROM authenticated;