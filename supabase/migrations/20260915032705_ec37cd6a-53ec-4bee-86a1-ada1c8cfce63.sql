
REVOKE ALL ON FUNCTION public.sync_stage_finance() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finance_kind_for_stage(text) FROM PUBLIC, anon, authenticated;
