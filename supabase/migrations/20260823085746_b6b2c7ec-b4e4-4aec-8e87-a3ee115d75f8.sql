REVOKE ALL ON public.email_send_state FROM authenticated, anon;
REVOKE ALL ON public.email_send_log FROM authenticated, anon;
REVOKE ALL ON public.email_unsubscribe_tokens FROM authenticated, anon;
REVOKE ALL ON public.suppressed_emails FROM authenticated, anon;

GRANT ALL ON public.email_send_state TO service_role;
GRANT ALL ON public.email_send_log TO service_role;
GRANT ALL ON public.email_unsubscribe_tokens TO service_role;
GRANT ALL ON public.suppressed_emails TO service_role;