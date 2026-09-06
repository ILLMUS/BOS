-- 1) Revoke direct EXECUTE on internal helper functions not used by app RPCs or RLS policies
REVOKE EXECUTE ON FUNCTION public.active_org_id() FROM authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.is_stage_owner(uuid) FROM authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.job_org_id(uuid) FROM authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.create_organization(text, text) FROM authenticated, anon;

-- 2) Remove backend-only email tables from the API surface (GraphQL/REST discovery)
REVOKE ALL ON public.email_send_log FROM authenticated, anon;
REVOKE ALL ON public.email_send_state FROM authenticated, anon;
REVOKE ALL ON public.email_unsubscribe_tokens FROM authenticated, anon;
REVOKE ALL ON public.suppressed_emails FROM authenticated, anon;
GRANT ALL ON public.email_send_log TO service_role;
GRANT ALL ON public.email_send_state TO service_role;
GRANT ALL ON public.email_unsubscribe_tokens TO service_role;
GRANT ALL ON public.suppressed_emails TO service_role;